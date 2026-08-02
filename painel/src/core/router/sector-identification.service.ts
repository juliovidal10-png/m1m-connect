type SectorCandidate = {
  id: string;
  name: string;
  description: string | null;
};

export type SectorIdentificationResult =
  | {
      status: "IDENTIFIED";
      sector: SectorCandidate;
    }
  | {
      status: "AMBIGUOUS";
      sectors: SectorCandidate[];
    }
  | {
      status: "NOT_IDENTIFIED";
      sectors: SectorCandidate[];
    };

function normalizeText(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase("pt-BR")
    .replace(
      /[^a-z0-9\s]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function containsExpression(
  text: string,
  expression: string,
) {
  if (!expression) {
    return false;
  }

  return (
    ` ${text} `
  ).includes(
    ` ${expression} `,
  );
}

export const sectorIdentificationService = {
  identify(
    message: string | null,
    sectors: SectorCandidate[],
  ): SectorIdentificationResult {
    const normalizedMessage =
      normalizeText(
        message ?? "",
      );

    if (!normalizedMessage) {
      return {
        status:
          "NOT_IDENTIFIED",
        sectors,
      };
    }

    const exactMatches =
      sectors.filter(
        (sector) =>
          containsExpression(
            normalizedMessage,
            normalizeText(
              sector.name,
            ),
          ),
      );

    if (
      exactMatches.length === 1
    ) {
      return {
        status: "IDENTIFIED",
        sector:
          exactMatches[0],
      };
    }

    if (
      exactMatches.length > 1
    ) {
      return {
        status: "AMBIGUOUS",
        sectors:
          exactMatches,
      };
    }

    return {
      status:
        "NOT_IDENTIFIED",
      sectors,
    };
  },
};
