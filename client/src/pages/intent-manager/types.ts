export interface IntentKeywords {
  intent: string;
  keywords: Record<'en' | 'ms' | 'zh', string[]>;
}

export interface IntentExamples {
  intent: string;
  examples: string[];
}

export interface TestResult {
  intent: string;
  confidence: number;
  source: 'fuzzy' | 'semantic' | 'llm' | 'regex';
  detectedLanguage?: string;
  matchedKeyword?: string;
  matchedExample?: string;
}

export interface Stats {
  totalIntents: number;
  totalKeywords: number;
  totalExamples: number;
  byIntent: Array<{
    intent: string;
    keywordCount: number;
    exampleCount: number;
  }>;
}

export interface AIProvider {
  id: string;
  name: string;
  type: string;
  model: string;
  base_url: string;
  enabled: boolean;
  description?: string;
}

export interface SelectedProvider {
  id: string;
  priority: number;
}

export interface LLMSettings {
  thresholds: {
    fuzzy: number;
    semantic: number;
    llm: number;
  };
  selectedProviders: SelectedProvider[];
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  fallbackUnknown: boolean;
  logFailures: boolean;
  enableContext: boolean;
}

export interface ExpandedSections {
  statsOverview: boolean;
  testConsole: boolean;
  providerSelection: boolean;
  llmParameters: boolean;
  systemPrompt: boolean;
  thresholds: boolean;
}
