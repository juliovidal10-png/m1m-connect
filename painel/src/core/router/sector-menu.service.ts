export type SectorMenuItem = {
  id: string;
  name: string;
};

function normalizeCompanyName(
  companyName?: string | null,
) {
  return companyName?.trim() || null;
}

function formatNumberedSectors(
  sectors: SectorMenuItem[],
) {
  return sectors
    .map(
      (sector, index) => {
        const name =
          sector.name.trim();

        return name
          ? `${index + 1} - ${name}`
          : null;
      },
    )
    .filter(
      (item): item is string =>
        Boolean(item),
    );
}
export const sectorMenuService = {
  buildMessage(
    sectors: SectorMenuItem[],
    companyName?: string | null,
  ) {
    const numberedSectors =
      formatNumberedSectors(
        sectors,
      );

    if (
      numberedSectors.length === 0
    ) {
      return "Oi! Recebemos sua mensagem. Nossa equipe vai dar continuidade ao atendimento assim que poss\u00edvel.";
    }

    const normalizedCompanyName =
      normalizeCompanyName(
        companyName,
      );

    const greeting =
      normalizedCompanyName
        ? `Oi! Voc\u00ea est\u00e1 falando com a ${normalizedCompanyName}.`
        : "Oi!";

    return [
      greeting,
      "Como podemos ajudar? Voc\u00ea pode escolher uma op\u00e7\u00e3o ou simplesmente me dizer com suas palavras o que precisa:",
      ...numberedSectors,
    ].join("\n");
  },
};