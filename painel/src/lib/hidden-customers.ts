// Entries use companyId/customerId. Keep the original single-entry configuration valid.
export function hiddenCustomerIds(companyId: string): string[] {
  const prefix = `${companyId}/`;
  return (process.env.M1M_CONTACTS_HIDDEN_CUSTOMER || "")
    .split(/[,\r\n]+/)
    .map(entry => entry.trim())
    .filter(entry => entry.startsWith(prefix))
    .map(entry => entry.slice(prefix.length))
    .filter(id => id.length > 0 && !id.includes("/"));
}
