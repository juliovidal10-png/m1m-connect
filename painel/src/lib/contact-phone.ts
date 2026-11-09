export class InvalidContactPhone extends Error {
  constructor() {
    super('Informe um telefone com DDD ou um número internacional com + e DDI.');
  }
}

export function normalizeContactPhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > 40) throw new InvalidContactPhone();
  const input = value.trim();
  if (!input) return null;
  if (!/^\+?[0-9().\s-]+$/.test(input)) throw new InvalidContactPhone();

  let digits = input.replace(/\D/g, '');
  if (!input.startsWith('+') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits) || (!input.startsWith('+') && digits.length < 12)) {
    throw new InvalidContactPhone();
  }
  return '+' + digits;
}

// The manual field takes a national number with DDD, or an explicit international number.
export function normalizeCustomerContactPhone(value: unknown): string | null {
  const normalized = normalizeContactPhone(value);
  if (!normalized || typeof value !== 'string') return normalized;

  const length = value.replace(/\D/g, '').length;
  if (!value.trim().startsWith('+') && length !== 10 && length !== 11) {
    throw new InvalidContactPhone();
  }
  if (normalized.startsWith('+55') && !/^\+55[1-9]\d{9,10}$/.test(normalized)) {
    throw new InvalidContactPhone();
  }
  return normalized;
}

function formatNationalPhone(digits: string) {
  if (!digits) return '';
  if (digits.length <= 2) return '(' + digits;
  const subscriber = digits.slice(2);
  const prefixLength = digits.length === 11 ? 5 : 4;
  const suffix = subscriber.slice(prefixLength);
  return '(' + digits.slice(0, 2) + ') ' + subscriber.slice(0, prefixLength) + (suffix ? '-' + suffix : '');
}

export function maskContactPhoneInput(value: string): string | null {
  const input = value.trimStart();
  if (!/^\+?[0-9().\s-]*$/.test(input)) return null;
  const digits = input.replace(/\D/g, '');
  if (input.startsWith('+')) {
    if (digits.startsWith('55')) {
      if (digits.length > 13) return null;
      return digits.length > 2 ? '+55 ' + formatNationalPhone(digits.slice(2)) : '+55';
    }
    return digits.length <= 15 ? '+' + digits : null;
  }
  return digits.length <= 11 ? formatNationalPhone(digits) : null;
}

export function formatSavedContactPhone(phone: string | null | undefined) {
  if (!phone) return '';
  const national = /^\+55([1-9]\d{9,10})$/.exec(phone);
  return national ? formatNationalPhone(national[1]) : phone;
}
