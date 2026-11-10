"use client";

import { useEffect, useRef, useState } from 'react';
import { contactsToCsv, MAX_CONTACT_CSV_BYTES, type CsvContact } from '@/lib/contact-csv';
import { InvalidContactPhone, maskContactPhoneInput, normalizeContactPhone, normalizeCustomerContactPhone } from '@/lib/contact-phone';

type ExportSource = 'platform' | 'whatsapp';
type Mode = 'import' | 'export' | 'create';

type PlatformContact = {
  displayName: string;
  displayPhone: string | null;
  contactPhone?: string | null;
  remoteJid: string;
};

function downloadCsv(contacts: CsvContact[], filename: string) {
  const blob = new Blob([contactsToCsv(contacts)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadWhatsAppContacts(): Promise<CsvContact[]> {
  const response = await fetch('/api/chat/contacts?fresh=1', { cache: 'no-store' });
  const rows = await response.json();
  if (!response.ok || !Array.isArray(rows)) {
    throw new Error('Não foi possível consultar a conexão do WhatsApp.');
  }

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
  return [...contacts.values()];
}

function platformContactsToRows(customers: PlatformContact[]): CsvContact[] {
  return customers
    .filter(customer => /@(lid|s\.whatsapp\.net)$/i.test(customer.remoteJid))
    .map(customer => {
      let phone = '';
      try {
        phone = normalizeContactPhone(customer.contactPhone || customer.displayPhone) || '';
      } catch (error) {
        if (!(error instanceof InvalidContactPhone)) throw error;
      }
      return { name: customer.displayName, phone };
    });
}

const outlineButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#171717] hover:bg-black/5 disabled:opacity-50';
const primaryButton = 'inline-flex min-h-10 items-center justify-center rounded-xl bg-[#087B7B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#066969] disabled:opacity-50';

function TransferIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      <path d={direction === 'up' ? 'M12 16V4m-4 4 4-4 4 4' : 'M12 4v12m-4-4 4 4 4-4'} />
    </svg>
  );
}

export default function ContactTransfer({
  customers,
  customersAvailable,
  onContactsChanged,
}: {
  customers: PlatformContact[];
  customersAvailable: boolean;
  onContactsChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [source, setSource] = useState<ExportSource>('platform');
  const [canEditCrm, setCanEditCrm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => setCanEditCrm(data?.user?.effectivePermissions?.includes('EDIT_CRM') === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (mode && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [mode]);

  function open(nextMode: Mode) {
    setName('');
    setPhone('');
    setFile(null);
    setError('');
    setMessage('');
    setSource(customersAvailable ? 'platform' : 'whatsapp');
    setMode(nextMode);
  }

  async function exportContacts() {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const contacts = source === 'whatsapp'
        ? await loadWhatsAppContacts()
        : platformContactsToRows(customers);
      if (!contacts.length) throw new Error('Nenhum contato cadastrado para exportar.');
      downloadCsv(contacts, source === 'whatsapp' ? 'contatos-whatsapp.csv' : 'contatos-m1m.csv');
      setMessage(`${contacts.length} contatos exportados.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao exportar contatos.');
    } finally {
      setBusy(false);
    }
  }

  async function importContacts() {
    if (!file || !canEditCrm || busy) return;
    setError('');
    setMessage('');
    if (file.size > MAX_CONTACT_CSV_BYTES) {
      setError('Use um arquivo CSV de até 1 MB.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/customers/import', {
        method: 'POST', headers: { 'Content-Type': 'text/csv;charset=utf-8' }, body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível importar o CSV.');
      setMessage(`${data.imported} adicionados · ${data.existing} já cadastrados · ${data.duplicates} repetidos no CSV · ${data.invalid} sem telefone válido.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      if (data.imported > 0) onContactsChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao importar contatos.');
    } finally {
      setBusy(false);
    }
  }

  async function saveNewCustomer() {
    if (!name.trim() || !phone || !canEditCrm || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const normalizedPhone = normalizeCustomerContactPhone(phone);
      const response = await fetch('/api/customers/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: normalizedPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível cadastrar o cliente.');
      setName('');
      setPhone('');
      setMessage('Cliente cadastrado em Contatos e no CRM.');
      onContactsChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao cadastrar cliente.');
    } finally {
      setBusy(false);
    }
  }

  const importing = mode === 'import';
  const creating = mode === 'create';
  const title = creating ? 'Novo cliente' : importing ? 'Importar contatos' : 'Exportar contatos';

  return (
    <div className="flex flex-wrap gap-2">
      {canEditCrm && (
        <button type="button" onClick={() => open('import')} className={outlineButton}>
          <TransferIcon direction="up" /> Importar
        </button>
      )}
      <button type="button" onClick={() => open('export')} className={outlineButton}>
        <TransferIcon direction="down" /> Exportar
      </button>

      {canEditCrm && (
        <button type="button" onClick={() => open('create')} className={primaryButton + ' gap-2'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
            <circle cx="9" cy="7" r="4" />
            <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2m3-13v6m-3-3h6" />
          </svg>
          Novo cliente
        </button>
      )}

      {mode && (
        <dialog
          ref={dialog}
          aria-labelledby="contact-transfer-title"
          onClose={() => setMode(null)}
          onCancel={event => { if (busy) event.preventDefault(); }}
          className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-2xl border border-black/10 bg-white p-0 text-[#171717] shadow-2xl backdrop:bg-black/45"
        >
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#087B7B]">Contatos</p>
              <h2 id="contact-transfer-title" className="mt-1 text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-black/55">
                {creating ? 'Cadastre um cliente na empresa atual.' : importing ? 'Adicione contatos à empresa atual a partir de um arquivo CSV.' : 'Escolha a origem dos contatos que deseja baixar.'}
              </p>
            </div>
            <button type="button" aria-label="Fechar" disabled={busy} onClick={() => dialog.current?.close()}
              className="rounded-lg px-2 py-1 text-lg leading-none text-black/50 hover:bg-black/5 disabled:opacity-50">×</button>
          </div>

          <div className="space-y-4 px-6 py-5">
            {creating ? (
              <form id="new-customer-form" className="space-y-4" onSubmit={event => {
                event.preventDefault();
                void saveNewCustomer();
              }}>
                <label className="block text-sm font-semibold">
                  Nome do cliente
                  <input autoComplete="name" required maxLength={160} disabled={busy}
                    value={name} onChange={event => setName(event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-normal focus:border-[#0A9090]" />
                </label>
                <label className="block text-sm font-semibold">
                  Telefone
                  <input type="tel" autoComplete="tel" required disabled={busy} placeholder="(65) 99999-0000"
                    value={phone} onChange={event => {
                      const masked = maskContactPhoneInput(event.target.value);
                      if (masked !== null) setPhone(masked);
                    }}
                    className="mt-2 block w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-normal focus:border-[#0A9090]" />
                  <span className="mt-1 block text-xs font-normal text-black/55">Informe o DDD. Para telefone internacional, use + e DDI.</span>
                </label>
              </form>
            ) : importing ? (
              <>
                <div className="rounded-xl bg-[#0A9090]/10 px-4 py-3 text-sm">
                  <p className="font-semibold">CSV para Excel</p>
                  <p className="mt-1 text-black/60">Use as colunas Nome e Telefone. Informe o DDD e use + e DDI para números internacionais.</p>
                </div>
                <label className="block text-sm font-semibold">
                  Escolher arquivo
                  <input ref={fileInput} type="file" accept=".csv,text/csv" disabled={busy}
                    onChange={event => { setFile(event.target.files?.[0] || null); setMessage(''); setError(''); }}
                    className="mt-2 block w-full rounded-xl border border-black/10 p-2 text-sm font-normal file:mr-2 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-2 file:font-semibold" />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/[0.03] px-4 py-3">
                  <p className="text-xs text-black/60">Os números já cadastrados são preservados.</p>
                  <button type="button" disabled={busy} className="text-sm font-semibold text-[#087B7B] hover:underline"
                    onClick={() => downloadCsv([], 'modelo-contatos.csv')}>Baixar modelo CSV</button>
                </div>
              </>
            ) : (
              <fieldset className="space-y-2" disabled={busy}>
                <legend className="sr-only">Origem dos contatos</legend>
                {([
                  ['platform', 'Contatos do M1M', 'Baixe os nomes e telefones cadastrados na empresa atual.'],
                  ['whatsapp', 'Contatos do WhatsApp', 'Baixe os contatos com telefone disponíveis na conexão.'],
                ] as const).map(([value, label, description]) => (
                  <label key={value} className={`flex items-start gap-3 rounded-xl border p-3 ${source === value ? 'border-[#0A9090] bg-[#0A9090]/10' : 'border-black/10'}`}>
                    <input type="radio" name="contact-export-source" value={value} checked={source === value}
                      disabled={value === 'platform' && !customersAvailable} onChange={() => setSource(value)}
                      className="mt-1 accent-[#087B7B]" />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="mt-1 block text-xs text-black/55">{description}</span>
                    </span>
                  </label>
                ))}
                <p className="pt-2 text-xs text-black/55">Formato CSV compatível com Excel.</p>
              </fieldset>
            )}

            {message && <p className="rounded-xl bg-[#0A9090]/10 px-3 py-2 text-sm text-[#066969]" role="status">{message}</p>}
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-6 py-4">
            <button type="button" disabled={busy} onClick={() => dialog.current?.close()} className={outlineButton}>
              {message ? 'Fechar' : 'Cancelar'}
            </button>
            {creating ? (
              <button type="submit" form="new-customer-form" disabled={busy || !name.trim() || !phone} className={primaryButton}>
                {busy ? 'Salvando…' : 'Salvar cliente'}
              </button>
            ) : (
              <button type="button" disabled={busy || (importing ? !file : source === 'platform' && !customersAvailable)}
                onClick={() => void (importing ? importContacts() : exportContacts())} className={primaryButton}>
                {busy ? (importing ? 'Importando…' : 'Exportando…') : (importing ? 'Importar arquivo' : 'Baixar CSV')}
              </button>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
