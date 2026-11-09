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
