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
    customerName?: string | null,
  ) {
    const company =
      companyName?.trim() || "nossa equipe";
    const name =
      customerName?.trim() || null;

    const greeting = name
      ? `Olá, ${name}! Tudo bem?`
      : "Olá! Tudo bem?";

    const sectorLines = sectors.map(
      (sector, index) =>
        `${index + 1} • ${sector.name}`,
    );

    return [
      greeting,
      "",
      "Me avisa por aqui com qual setor você precisa falar hoje para eu te passar pro pessoal:",
      "",
      ...sectorLines,
    ].join("\n");
  },
};
