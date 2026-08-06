export type RouterIntent = {
  matched: boolean;
  confidence: number;
  sectorId: string | null;
  sectorName: string | null;
  keyword: string | null;
};

export type RouterIntentCandidate = {
  sectorId: string;
  sectorName: string;
  keyword: string;
};

export type RouterIntentRequest = {
  message: string;
  candidates: RouterIntentCandidate[];
};