export interface Decision {
  id?: string;
  question: string;
  balanceScore: number; // 0 = fully emotional, 100 = fully logical
  options?: string[];
  stakes?: string;
  values?: string[];
  createdAt?: Date;
  initialIntuition?: string;
  confidenceScore?: number; // 0-100%
  timeHorizon?: number; // 0 = short-term, 100 = long-term
}

export interface Value {
  id: string;
  name: string;
  priority: number;
}
