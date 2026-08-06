import {
  textNormalizer,
} from "./interpreter/text-normalizer";
import type {
  RouterIntent,
  RouterIntentCandidate,
} from "./interpreter/router-intent.types";
import {
  sectorKeywordService,
} from "@/services/sector-keyword.service";

type MatchedCandidate = {
  candidate: RouterIntentCandidate;
  normalizedKeyword: string;
};

function containsExpression(
  normalizedMessage: string,
  normalizedKeyword: string,
) {
  if (
    !normalizedMessage ||
    !normalizedKeyword
  ) {
    return false;
  }

  return (
    ` ${normalizedMessage} `
  ).includes(
    ` ${normalizedKeyword} `,
  );
}

function createEmptyIntent(
  confidence = 0,
): RouterIntent {
  return {
    matched: false,
    confidence,
    sectorId: null,
    sectorName: null,
    keyword: null,
  };
}

export const intentInterpreterService = {
  async interpret(
    companyId: string,
    message: string | null,
  ): Promise<RouterIntent> {
    const normalizedMessage =
      textNormalizer.normalize(
        message ?? "",
      );

    if (!normalizedMessage) {
      return createEmptyIntent();
    }

    const storedKeywords =
      await sectorKeywordService.listByCompany(
        companyId,
      );

    const candidates:
      RouterIntentCandidate[] =
      storedKeywords.map(
        (item) => ({
          sectorId:
            item.sectorId,
          sectorName:
            item.sector.name,
          keyword:
            item.keyword,
        }),
      );

    const matches:
      MatchedCandidate[] =
      candidates
        .map(
          (candidate) => ({
            candidate,
            normalizedKeyword:
              textNormalizer.normalize(
                candidate.keyword,
              ),
          }),
        )
        .filter(
          ({
            normalizedKeyword,
          }) =>
            containsExpression(
              normalizedMessage,
              normalizedKeyword,
            ),
        )
        .sort(
          (first, second) =>
            second.normalizedKeyword.length -
            first.normalizedKeyword.length,
        );

    if (matches.length === 0) {
      return createEmptyIntent();
    }

    const bestMatch =
      matches[0];

    const bestLength =
      bestMatch.normalizedKeyword.length;

    const strongestMatches =
      matches.filter(
        (match) =>
          match.normalizedKeyword.length ===
          bestLength,
      );

    const strongestSectorIds =
      new Set(
        strongestMatches.map(
          (match) =>
            match.candidate.sectorId,
        ),
      );

    if (
      strongestSectorIds.size > 1
    ) {
      return createEmptyIntent(0.5);
    }

    return {
      matched: true,
      confidence: 1,
      sectorId:
        bestMatch.candidate.sectorId,
      sectorName:
        bestMatch.candidate.sectorName,
      keyword:
        bestMatch.candidate.keyword,
    };
  },
};
