export class TextNormalizer {
  normalize(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  tokenize(text: string): string[] {
    const normalized =
      this.normalize(text);

    if (!normalized) {
      return [];
    }

    return normalized.split(" ");
  }

  contains(
    text: string,
    keyword: string,
  ): boolean {
    const normalizedText =
      this.normalize(text);

    const normalizedKeyword =
      this.normalize(keyword);

    return normalizedText.includes(
      normalizedKeyword,
    );
  }
}

export const textNormalizer =
  new TextNormalizer();