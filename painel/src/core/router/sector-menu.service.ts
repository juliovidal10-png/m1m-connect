export type SectorMenuItem = {
  id: string;
  name: string;
};

function normalizeCompanyName(
  companyName?: string | null,
) {
  return companyName?.trim() || null;
}

export const sectorMenuService = {
  buildMessage(
    sectors: SectorMenuItem[],
    companyName?: string | null,
  ) {
    if (sectors.length === 0) {
      return [
        "Olá! Sua mensagem foi recebida.",
        "",
        "No momento, não há setores disponíveis para encaminhamento.",
        "Nossa equipe dará continuidade ao atendimento assim que possível.",
      ].join("\n");
    }

    const normalizedCompanyName =
      normalizeCompanyName(
        companyName,
      );

    const greeting =
      normalizedCompanyName
        ? `Olá! Você está falando com a ${normalizedCompanyName}.`
        : "Olá! Seja bem-vindo(a).";

    const options =
      sectors.map(
        (sector, index) =>
          `${index + 1} - ${sector.name}`,
      );

    return [
      greeting,
      "",
      "Para direcionar seu atendimento, escolha uma opção:",
      "",
      ...options,
      "",
      "Responda com o número ou com o nome do setor desejado.",
    ].join("\n");
  },
};
