import { textNormalizer } from "./text-normalizer";

export type KeywordCandidate = {
  sectorId: string;
  keyword: string;
};

export type KeywordMatch = {
  matched: boolean;
  sectorId: string | null;
  keyword: string | null;
};

export class KeywordMatcher {
  match(
    message: string,
    candidates: KeywordCandidate[],
  ): KeywordMatch {

    const normalizedMessage =
      textNormalizer.normalize(message);

    for (const candidate of candidates) {

      const keyword =
        textNormalizer.normalize(
          candidate.keyword,
        );

      if (
        normalizedMessage.includes(keyword)
      ) {
        return {
          matched: true,
          sectorId: candidate.sectorId,
          keyword: candidate.keyword,
        };
      }
    }

    return {
      matched: false,
      sectorId: null,
      keyword: null,
    };
  }
}

export const keywordMatcher =
  new KeywordMatcher();