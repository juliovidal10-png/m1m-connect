export type SectorMenuItem = {
  id: string;
  name: string;
};

function normalizeCompanyName(
  companyName?: string | null,
) {
  return companyName?.trim() || null;
}

function formatSectorNames(
  sectors: SectorMenuItem[],
) {
  const names =
    sectors
      .map((sector) =>
        sector.name.trim(),
      )
      .filter(Boolean);

  if (names.length === 0) {
    return null;
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} ou ${names[1]}`;
  }

  return `${names
    .slice(0, -1)
    .join(", ")} ou ${names[names.length - 1]}`;
}

export const sectorMenuService = {
  buildMessage(
    sectors: SectorMenuItem[],
    companyName?: string | null,
  ) {
    if (sectors.length === 0) {
      return "Oi! Recebemos sua mensagem. Nossa equipe vai dar continuidade ao atendimento assim que possível.";
    }

    const normalizedCompanyName =
      normalizeCompanyName(
        companyName,
      );

    const sectorNames =
      formatSectorNames(
        sectors,
      );

    const greeting =
      normalizedCompanyName
        ? `Oi! Você está falando com a ${normalizedCompanyName}.`
        : "Oi!";

    return [
      greeting,
      `Como podemos ajudar? Você precisa falar sobre ${sectorNames}?`,
    ].join(" ");
  },
};