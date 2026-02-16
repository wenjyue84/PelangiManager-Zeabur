import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import type { AIProvider, SelectedProvider, LLMSettings, ExpandedSections } from './types';

interface LLMModelsTabProps {
  allProviders: AIProvider[];
  llmSettings: LLMSettings | null;
  setLlmSettings: (settings: LLMSettings) => void;
  testingProvider: string | null;
  providerTestResults: Record<string, { status: 'success' | 'error'; time?: number; error?: string }>;
  toggleProvider: (id: string) => void;
  moveProvider: (id: string, direction: 'up' | 'down') => void;
  testProvider: (id: string) => void;
  saveLLMSettings: () => void;
  expandedSections: Pick<ExpandedSections, 'providerSelection' | 'llmParameters' | 'systemPrompt'>;
  onToggleSection: (section: 'providerSelection' | 'llmParameters' | 'systemPrompt') => void;
}

// --- LLMProviderSelector ---

function LLMProviderSelector({
  allProviders,
  selectedProviders,
  onToggle,
  onMove,
  onTest,
  testingProvider,
  testResults
}: {
  allProviders: AIProvider[];
  selectedProviders: SelectedProvider[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onTest: (id: string) => void;
  testingProvider: string | null;
  testResults: Record<string, { status: 'success' | 'error', time?: number, error?: string }>;
}) {
  if (allProviders.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No providers configured. Please add providers in Settings first.
      </div>
    );
  }

  const selectedIds = new Set(selectedProviders.map(p => p.id));
  const selected = selectedProviders
    .sort((a, b) => a.priority - b.priority)
    .map(s => allProviders.find(p => p.id === s.id))
    .filter(Boolean) as AIProvider[];
  const available = allProviders.filter(p => !selectedIds.has(p.id));

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      'openai-compatible': 'bg-blue-100 text-blue-700',
      'groq': 'bg-purple-100 text-purple-700',
      'ollama': 'bg-green-100 text-green-700'
    };
    return badges[type] || 'bg-neutral-100 text-neutral-600';
  };

  return (
    <div className="space-y-4">
      {/* Selected Providers */}
      {selected.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Selected (fallback order)
          </h4>
          <div className="space-y-2">
            {selected.map((provider, idx) => {
              const testResult = testResults[provider.id];
              return (
                <div key={provider.id} className="flex items-center gap-2 p-3 border rounded-xl bg-primary-50 border-primary-200">
                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => onMove(provider.id, 'up')}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => onMove(provider.id, 'down')}
                      disabled={idx === selected.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Priority badge */}
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold shrink-0">
                    #{idx + 1}
                  </div>

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{provider.name}</span>
                      <Badge className={`text-xs ${getTypeBadge(provider.type)}`}>
                        {provider.type}
                      </Badge>
                      {!provider.enabled && (
                        <Badge variant="destructive" className="text-xs">disabled</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{provider.model}</div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTest(provider.id)}
                      disabled={testingProvider === provider.id}
                      className={testResult?.status === 'success' ? 'border-green-500 text-green-600' : testResult?.status === 'error' ? 'border-red-500 text-red-600' : ''}
                    >
                      {testingProvider === provider.id ? '...' : testResult?.time ? `${testResult.time}ms` : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggle(provider.id)}
                      className="border-red-200 text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Providers */}
      {available.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Available
          </h4>
          <div className="space-y-2">
            {available.map(provider => {
              const testResult = testResults[provider.id];
              return (
                <div key={provider.id} className="flex items-center gap-2 p-3 border rounded-xl bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{provider.name}</span>
                      <Badge className={`text-xs ${getTypeBadge(provider.type)}`}>
                        {provider.type}
                      </Badge>
                      {!provider.enabled && (
                        <Badge variant="destructive" className="text-xs">disabled</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{provider.model}</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTest(provider.id)}
                      disabled={testingProvider === provider.id}
                      className={testResult?.status === 'success' ? 'border-green-500 text-green-600' : testResult?.status === 'error' ? 'border-red-500 text-red-600' : ''}
                    >
                      {testingProvider === provider.id ? '...' : testResult?.time ? `${testResult.time}ms` : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggle(provider.id)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- LLMModelsTab ---

export default function LLMModelsTab({
  allProviders,
  llmSettings,
  setLlmSettings,
  testingProvider,
  providerTestResults,
  toggleProvider,
  moveProvider,
  testProvider,
  saveLLMSettings,
  expandedSections,
  onToggleSection,
}: LLMModelsTabProps) {
  return (
    <div className="space-y-4">
      {/* LLM Provider Selection */}
      <Card className="overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
          onClick={() => onToggleSection('providerSelection')}
        >
          <div>
            <h3 className="text-lg font-semibold">Intent Classification Models</h3>
            <p className="text-sm text-muted-foreground">
              Select which LLM models to use for intent classification. Usually simpler/faster models work well for this task.
            </p>
          </div>
          {expandedSections.providerSelection ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </div>

        {expandedSections.providerSelection && (
          <div className="px-6 pb-6">
            {!llmSettings ? (
              <p className="text-sm text-muted-foreground italic">Loading...</p>
            ) : (
              <LLMProviderSelector
                allProviders={allProviders}
                selectedProviders={llmSettings.selectedProviders}
                onToggle={toggleProvider}
                onMove={moveProvider}
                onTest={testProvider}
                testingProvider={testingProvider}
                testResults={providerTestResults}
              />
            )}
          </div>
        )}
      </Card>

      {/* LLM Parameters */}
      {llmSettings && (
        <Card className="overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
            onClick={() => onToggleSection('llmParameters')}
          >
            <h3 className="text-lg font-semibold">LLM Parameters</h3>
            {expandedSections.llmParameters ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>

          {expandedSections.llmParameters && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={llmSettings.maxTokens}
                    onChange={(e) => setLlmSettings({ ...llmSettings, maxTokens: parseInt(e.target.value) || 500 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum tokens for classification response</p>
                </div>
                <div>
                  <Label>Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={llmSettings.temperature}
                    onChange={(e) => setLlmSettings({ ...llmSettings, temperature: parseFloat(e.target.value) || 0.3 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Lower = more focused (recommended: 0.3)</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* System Prompt */}
      {llmSettings && (
        <Card className="overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
            onClick={() => onToggleSection('systemPrompt')}
          >
            <h3 className="text-lg font-semibold">Intent Classification Prompt</h3>
            {expandedSections.systemPrompt ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>

          {expandedSections.systemPrompt && (
            <div className="px-6 pb-6">
              <Textarea
                rows={6}
                value={llmSettings.systemPrompt}
                onChange={(e) => setLlmSettings({ ...llmSettings, systemPrompt: e.target.value })}
                placeholder="Enter system prompt to guide the LLM on how to classify intents..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                This prompt tells the LLM how to classify messages into intents.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Save Button */}
      {llmSettings && (
        <div className="flex justify-end">
          <Button onClick={saveLLMSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Save LLM Settings
          </Button>
        </div>
      )}
    </div>
  );
}
