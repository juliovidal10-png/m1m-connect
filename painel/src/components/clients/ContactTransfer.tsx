"use client";

import { useEffect, useState } from 'react';
import { contactsToCsv, MAX_CONTACT_CSV_BYTES, type CsvContact } from '@/lib/contact-csv';

export default function ContactTransfer({ onImported }: { onImported: () => void }) {
  const [canImport, setCanImport] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => setCanImport(data?.user?.effectivePermissions?.includes('EDIT_CRM') === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function exportWhatsAppContacts() {
    setBusy('export');
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/chat/contacts', { cache: 'no-store' });
      const rows = await response.json();
      if (!response.ok || !Array.isArray(rows)) throw new Error('Não foi possível consultar a conexão do WhatsApp.');
      const contacts = new Map<string, CsvContact>();
      for (const row of rows) {
        const match = typeof row?.remoteJid === 'string'
          ? /^([1-9]\d{7,14})@s\.whatsapp\.net$/i.exec(row.remoteJid)
          : null;
        if (!match || row.isGroup) continue;
        const phone = '+' + match[1];
        const name = typeof row.pushName === 'string' ? row.pushName.trim().slice(0, 160) : '';
        if (!contacts.has(phone) || (!contacts.get(phone)?.name && name)) contacts.set(phone, { name, phone });
      }
      if (!contacts.size) throw new Error('A conexão do WhatsApp não retornou contatos com telefone.');
      const url = URL.createObjectURL(new Blob([contactsToCsv([...contacts.values()])], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'contatos-whatsapp.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`${contacts.size} contatos exportados. Abra o CSV no Excel ou selecione o arquivo abaixo para importar.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao exportar contatos.');
    } finally {
      setBusy(null);
    }
  }

  async function importContacts() {
    if (!file || !canImport || busy) return;
    setError('');
    setMessage('');
    if (file.size > MAX_CONTACT_CSV_BYTES) {
      setError('Use um arquivo CSV de até 1 MB.');
      return;
    }
    setBusy('import');
    try {
      const response = await fetch('/api/customers/import', {
        method: 'POST', headers: { 'Content-Type': 'text/csv;charset=utf-8' }, body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível importar o CSV.');
      setMessage(`${data.imported} adicionados · ${data.existing} já cadastrados · ${data.duplicates} repetidos no CSV · ${data.invalid} sem telefone válido.`);
      if (data.imported > 0) onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao importar contatos.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-black/10 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy !== null} onClick={() => void exportWhatsAppContacts()}
          className="rounded-lg border border-[#0A9090]/30 px-3 py-2 font-semibold text-[#087B7B] disabled:opacity-50">
          {busy === 'export' ? 'Exportando…' : 'Exportar contatos do WhatsApp'}
        </button>
        {canImport && (
          <>
            <label className="text-xs font-semibold">
              Arquivo CSV
              <input type="file" accept=".csv,text/csv" disabled={busy !== null}
                onChange={event => { setFile(event.target.files?.[0] || null); setMessage(''); setError(''); }}
                className="ml-2 max-w-full text-xs" />
            </label>
            <button type="button" disabled={!file || busy !== null} onClick={() => void importContacts()}
              className="rounded-lg bg-[#087B7B] px-3 py-2 font-semibold text-white disabled:opacity-50">
              {busy === 'import' ? 'Importando…' : 'Importar CSV'}
            </button>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-black/60">
        CSV UTF-8 para Excel com as colunas Nome e Telefone. A importação acrescenta contatos à empresa atual e preserva os cadastros existentes.
      </p>
      {message && <p className="mt-2 text-xs text-[#087B7B]" role="status">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
