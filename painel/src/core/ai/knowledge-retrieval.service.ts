const GENERIC_TERMS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "em",
  "entre", "essa", "esse", "esta", "este", "eu", "me", "meu", "minha", "na", "nas",
  "no", "nos", "o", "os", "ou", "para", "por", "qual", "quais", "que", "se", "sem",
  "sobre", "tem", "uma", "um", "voce", "voces",
]);

type KnowledgeUnit = {
  heading: string | null;
  text: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function terms(value: string) {
  return Array.from(
    new Set(
      normalize(value)
        .split(/\s+/)
        .filter(
          (term) =>
            term.length >= 3 &&
            !GENERIC_TERMS.has(term),
        ),
    ),
  );
}

function isHeading(line: string) {
  if (/^#{1,6}\s+/.test(line)) return true;

  const normalizedLine = normalize(line);
  if (!normalizedLine) return false;

  const words = normalizedLine.split(/\s+/);

  return (
    line.length <= 80 &&
    words.length <= 8 &&
    line === line.toUpperCase() &&
    /[A-ZÀ-Ü]/.test(line)
  );
}

function splitKnowledge(value: string): KnowledgeUnit[] {
  const lines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const units: KnowledgeUnit[] = [];
  let heading: string | null = null;

  for (const line of lines) {
    if (isHeading(line)) {
      heading = line.replace(/^#{1,6}\s+/, "").trim();
      continue;
    }

    units.push({
      heading,
      text: line,
    });
  }

  return units;
}

function scoreUnit(
  unit: KnowledgeUnit,
  queryTerms: string[],
) {
  const textTerms = new Set(terms(unit.text));
  const headingTerms = new Set(terms(unit.heading || ""));

  let textMatches = 0;
  let headingMatches = 0;

  for (const term of queryTerms) {
    if (textTerms.has(term)) textMatches += 1;
    if (headingTerms.has(term)) headingMatches += 1;
  }

  const matchedTerms = new Set(
    queryTerms.filter(
      (term) =>
        textTerms.has(term) ||
        headingTerms.has(term),
    ),
  );

  if (matchedTerms.size === 0) return 0;

  const coverage = matchedTerms.size / queryTerms.length;

  let score =
    textMatches * 6 +
    headingMatches * 3 +
    coverage * 10;

  if (matchedTerms.size >= 2) score += 8;
  if (coverage === 1) score += 12;

  return score;
}

function renderUnit(unit: KnowledgeUnit) {
  return unit.heading
    ? `${unit.heading}\n${unit.text}`
    : unit.text;
}

export function retrieveKnowledgeEvidence(input: {
  query: string;
  companyKnowledge?: string | null;
  sectorKnowledge?: string | null;
  maxUnits?: number;
}) {
  const queryTerms = terms(input.query);
  const maxUnits = Math.max(1, input.maxUnits ?? 12);

  const sources = [
    {
      label: "BASE DA EMPRESA - EVIDENCIAS RECUPERADAS",
      value: input.companyKnowledge || "",
    },
    {
      label: "BASE DO SETOR - EVIDENCIAS RECUPERADAS",
      value: input.sectorKnowledge || "",
    },
  ];

  if (queryTerms.length === 0) {
    return [
      "EVIDENCIAS DE CONHECIMENTO RECUPERADAS",
      "Nenhum termo factual suficiente foi identificado na pergunta atual.",
      "Ausencia de evidencia nao autoriza concluir que a empresa nao oferece, nao possui ou nao realiza algo.",
    ].join("\n");
  }

  const ranked = sources
    .flatMap((source) =>
      splitKnowledge(source.value).map((unit, index) => ({
        label: source.label,
        unit,
        index,
        score: scoreUnit(unit, queryTerms),
      })),
    )
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.index - b.index,
    );

  const strongestScore = ranked[0]?.score ?? 0;

  const selected = ranked
    .filter((item) => {
      if (item.score >= 18) return true;

      if (
        strongestScore > 0 &&
        item.score >= strongestScore * 0.65
      ) {
        return true;
      }

      return false;
    })
    .slice(0, maxUnits);

  if (selected.length === 0) {
    return [
      "EVIDENCIAS DE CONHECIMENTO RECUPERADAS",
      "Nenhum trecho diretamente relacionado a pergunta atual foi localizado nas bases cadastradas.",
      "Ausencia de evidencia nao autoriza concluir que a empresa nao oferece, nao possui ou nao realiza algo.",
    ].join("\n");
  }

  const grouped = new Map<string, string[]>();

  for (const item of selected) {
    const rendered = renderUnit(item.unit);
    const list = grouped.get(item.label) || [];

    if (!list.includes(rendered)) {
      list.push(rendered);
    }

    grouped.set(item.label, list);
  }

  return Array.from(grouped.entries())
    .map(
      ([label, units]) =>
        `${label}\n${units.join("\n")}`,
    )
    .join("\n\n");
}