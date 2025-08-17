export interface AnalyzeRequest {
  content: string;
  type: "email";
}

export interface Indicator {
  kind: string;
  detail: string;
  score?: number | null;
}

export interface AnalyzeResponse {
  risk_score: number;
  classification: "phishing" | "safe" | "suspicious";
  indicators: Indicator[];
}

export interface ApiError {
  detail: string;
}
