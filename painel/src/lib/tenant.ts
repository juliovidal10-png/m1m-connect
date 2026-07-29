const DEFAULT_COMPANY_ID =
  process.env.M1M_DEFAULT_COMPANY_ID?.trim();

export function getCurrentCompanyId() {
  if (!DEFAULT_COMPANY_ID) {
    throw new Error(
      "A variável M1M_DEFAULT_COMPANY_ID não está configurada.",
    );
  }

  return DEFAULT_COMPANY_ID;
}