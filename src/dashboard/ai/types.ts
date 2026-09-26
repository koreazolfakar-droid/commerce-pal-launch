export type DashboardAiEntity = "product" | "category" | "brand";

export type DashboardAiAction = "research_fill" | "seo" | "validate";

export type DashboardAiRisk = "low" | "medium" | "high";
export type DashboardAiDecision = "allow" | "review" | "block";
export type DashboardAiEntityMatchStatus = "exact" | "partial" | "uncertain";

export type DashboardAiFieldDefinition = {
  key: string;
  label: string;
  description?: string;
  review?: boolean;
  maxLength?: number;
};

export type DashboardAiRequest = {
  entity: DashboardAiEntity;
  action: DashboardAiAction;
  query: string;
  currentData: Record<string, string>;
  fields: DashboardAiFieldDefinition[];
  context?: Record<string, unknown>;
};

export type DashboardAiSuggestion = {
  field: string;
  value: string;
  confidence: number;
  verified: boolean;
  reason: string;
  risk: DashboardAiRisk;
  decision: DashboardAiDecision;
  checks: string[];
  sourceUrls: string[];
};

export type DashboardAiSource = {
  title: string;
  url: string;
  quality: number;
  official: boolean;
};

export type DashboardAiEntityMatch = {
  status: DashboardAiEntityMatchStatus;
  canonicalName: string;
  reason: string;
};

export type DashboardAiResponse = {
  entity: DashboardAiEntity;
  action: DashboardAiAction;
  model: string;
  grounded: boolean;
  entityMatch: DashboardAiEntityMatch;
  summary: string;
  suggestions: DashboardAiSuggestion[];
  warnings: string[];
  sources: DashboardAiSource[];
};
