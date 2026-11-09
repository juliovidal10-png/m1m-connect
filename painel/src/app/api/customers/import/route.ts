import { NextRequest, NextResponse } from 'next/server';
import { M1MUserPermission } from '@/generated/prisma/enums';
import { InvalidContactCsv, MAX_CONTACT_CSV_BYTES, parseContactCsv } from '@/lib/contact-csv';
import { AuthorizationError, authorizationService } from '@/services/auth/authorization.service';
import { importCustomerContacts } from '@/services/contact-import.service';

async function readCsv(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidContactCsv('Selecione um arquivo CSV.');
  const decoder = new TextDecoder();
  let size = 0;
  let csv = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return csv + decoder.decode();
      size += value.byteLength;
      if (size > MAX_CONTACT_CSV_BYTES) throw new InvalidContactCsv('Use um arquivo CSV de até 1 MB.');
      csv += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authorizationService.requirePermission(M1MUserPermission.EDIT_CRM);
    const { contacts, invalid, duplicates } = parseContactCsv(await readCsv(request));
    if (!contacts.length) throw new InvalidContactCsv('O arquivo não contém telefones válidos.');
    const result = await importCustomerContacts(user.companyId, contacts);
    return NextResponse.json({ ...result, invalid, duplicates });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof InvalidContactCsv) {
      return NextResponse.json({ error: error.message }, {
        status: error instanceof AuthorizationError ? error.statusCode : 400,
      });
    }
    return NextResponse.json({ error: 'Não foi possível importar o arquivo.' }, { status: 500 });
  }
}
