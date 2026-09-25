export type DashboardAiEntity = "product" | "category" | "brand";

export type DashboardAiAction = "research_fill" | "seo" | "validate";

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
};

export type DashboardAiSource = {
  title: string;
  url: string;
};

export type DashboardAiResponse = {
  entity: DashboardAiEntity;
  action: DashboardAiAction;
  model: string;
  grounded: boolean;
  summary: string;
  suggestions: DashboardAiSuggestion[];
  warnings: string[];
  sources: DashboardAiSource[];
};
