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
      ? `Opa, ${name}! Que bom receber o seu contato aqui na ${company}! 🚀`
      : `Opa, tudo bem? Que bom receber o seu contato aqui na ${company}! 🚀`;

    const sectorLines = sectors.map(
      (sector, index) =>
        `${index + 1} • ${sector.name}`,
    );

    return [
      greeting,
      "",
      "Para eu te direcionar pro pessoal certo agora mesmo, me conta: seu assunto de hoje é sobre:",
      "",
      ...sectorLines,
      "",
      "Se preferir, pode só digitar o número ou me explicar com suas palavras o que precisa!",
    ].join("\n");
  },
};