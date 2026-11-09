import { InvalidContactPhone, normalizeContactPhone } from './contact-phone';

export const MAX_CONTACT_CSV_BYTES = 1_000_000;
export const MAX_CONTACT_CSV_ROWS = 5000;

export class InvalidContactCsv extends Error {}

export type CsvContact = { name: string; phone: string };

export function contactsToCsv(contacts: CsvContact[]) {
  const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
  const rows = contacts.map(({ name, phone }) => {
    const safeName = /^\s*[=+\-@\t\r\n]/.test(name) ? "'" + name : name;
    return quote(safeName) + ';' + quote(phone ? "'" + phone : '');
  });
  return '\uFEFF' + ['Nome;Telefone', ...rows].join('\r\n') + '\r\n';
}

export function parseContactCsv(input: string) {
  const text = input.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;

  function pushField() {
    row.push(field.trim());
    field = '';
    closedQuote = false;
    if (row.length > 20) throw new InvalidContactCsv('A planilha contém colunas demais.');
  }

  function pushRow() {
    pushField();
    if (row.some(Boolean)) rows.push(row);
    row = [];
    if (rows.length > MAX_CONTACT_CSV_ROWS + 1) {
      throw new InvalidContactCsv('Use até 5.000 contatos por arquivo.');
    }
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = false;
        closedQuote = true;
      }
    } else if (char === delimiter) {
      pushField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      pushRow();
    } else if (char === '"' && !field && !closedQuote) {
      quoted = true;
    } else if (char === '"' || closedQuote) {
      throw new InvalidContactCsv('Há aspas inválidas no CSV. Salve a planilha novamente como CSV UTF-8.');
    } else {
      field += char;
    }
  }
  if (quoted) throw new InvalidContactCsv('O CSV termina com uma coluna entre aspas incompleta.');
  if (row.length || field || closedQuote) pushRow();

  const header = rows.shift()?.map(value => value.toLowerCase()) || [];
  const phoneIndex = header.findIndex(value => value === 'telefone' || value === 'phone');
  const nameIndex = header.findIndex(value => value === 'nome' || value === 'name');
  if (phoneIndex < 0 || nameIndex < 0) {
    throw new InvalidContactCsv('O CSV precisa ter as colunas Nome e Telefone.');
  }

  const contacts = new Map<string, CsvContact>();
  let invalid = 0;
  let duplicates = 0;
  for (const values of rows) {
    let phone: string | null;
    try {
      phone = normalizeContactPhone(values[phoneIndex]?.replace(/^'(?=\+\d)/, ''));
    } catch (error) {
      if (!(error instanceof InvalidContactPhone)) throw error;
      phone = null;
    }
    if (!phone) {
      invalid++;
    } else if (contacts.has(phone)) {
      duplicates++;
    } else {
      const name = (values[nameIndex] || '').replace(/^'(?=\s*[=+\-@\t\r\n])/, '');
      contacts.set(phone, { name: name.slice(0, 160), phone });
    }
  }
  return { contacts: [...contacts.values()], invalid, duplicates };
}
