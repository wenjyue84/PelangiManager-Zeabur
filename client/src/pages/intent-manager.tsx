import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, TestTube, TrendingUp, Zap, Brain, Globe, Settings, Star, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FixedSizeList as List } from 'react-window';

interface IntentKeywords {
  intent: string;
  keywords: Record<'en' | 'ms' | 'zh', string[]>;
}

interface IntentExamples {
  intent: string;
  examples: string[];
}

interface TestResult {
  intent: string;
  confidence: number;
  source: 'fuzzy' | 'semantic' | 'llm' | 'regex';
  detectedLanguage?: string;
  matchedKeyword?: string;
  matchedExample?: string;
}

interface Stats {
  totalIntents: number;
  totalKeywords: number;
  totalExamples: number;
  byIntent: Array<{
    intent: string;
    keywordCount: number;
    exampleCount: number;
  }>;
}

interface AIProvider {
  id: string;
  name: string;
  type: string;
  model: string;
  base_url: string;
  enabled: boolean;
  description?: string;
}

interface SelectedProvider {
  id: string;
  priority: number;
}

interface LLMSettings {
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

export default function IntentManager() {
  const [keywords, setKeywords] = useState<IntentKeywords[]>([]);
  const [examples, setExamples] = useState<IntentExamples[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [intentSearch, setIntentSearch] = useState('');

  // LLM Settings state
  const [allProviders, setAllProviders] = useState<AIProvider[]>([]);
  const [llmSettings, setLlmSettings] = useState<LLMSettings | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, { status: 'success' | 'error', time?: number, error?: string }>>({});

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    statsOverview: false,
    testConsole: true,
    providerSelection: true,
    llmParameters: false,
    systemPrompt: false,
    thresholds: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { toast } = useToast();

  // Load data on mount
  useEffect(() => {
    loadData();
    loadLLMSettings();
  }, []);

  const loadData = async () => {
    try {
      const [keywordsRes, examplesRes, statsRes] = await Promise.all([
        fetch('/api/intent-manager/keywords'),
        fetch('/api/intent-manager/examples'),
        fetch('/api/intent-manager/stats')
      ]);

      if (keywordsRes.ok) {
        const data = await keywordsRes.json();
        setKeywords(data.intents || []);
      }

      if (examplesRes.ok) {
        const data = await examplesRes.json();
        setExamples(data.intents || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load intent data',
        variant: 'destructive'
      });
    }
  };

  const loadLLMSettings = async () => {
    try {
      const [settingsRes, providersRes] = await Promise.all([
        fetch('/api/intent-manager/llm-settings'),
        fetch('/api/intent-manager/llm-settings/available-providers')
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setLlmSettings(data);
      }

      if (providersRes.ok) {
        const data = await providersRes.json();
        setAllProviders(data);
      }
    } catch (error) {
      console.error('Error loading LLM settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load LLM settings',
        variant: 'destructive'
      });
    }
  };

  const saveKeywords = async (intent: string, updatedKeywords: Record<string, string[]>) => {
    try {
      const res = await fetch(`/api/intent-manager/keywords/${intent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: updatedKeywords })
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Keywords updated for ${intent}`
        });
        loadData(); // Reload stats
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save keywords',
        variant: 'destructive'
      });
    }
  };

  const saveExamples = async (intent: string, updatedExamples: string[]) => {
    try {
      const res = await fetch(`/api/intent-manager/examples/${intent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examples: updatedExamples })
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Training examples updated for ${intent}`
        });
        loadData(); // Reload stats
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save examples',
        variant: 'destructive'
      });
    }
  };

  const testIntent = async () => {
    if (!testText.trim()) return;

    setTesting(true);
    try {
      const res = await fetch('/api/intent-manager/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      });

      if (res.ok) {
        const result = await res.json();
        setTestResult(result);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test intent',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/intent-manager/export?format=${format}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intents-export.${format}`;
      a.click();

      toast({
        title: 'Success',
        description: `Exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export',
        variant: 'destructive'
      });
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'fuzzy':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'semantic':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'llm':
        return <Globe className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const filterKeywords = (intentData: IntentKeywords[], searchTerm: string) => {
    if (!searchTerm.trim()) return intentData;

    return intentData.filter(intent => {
      const nameMatch = intent.intent.toLowerCase().includes(searchTerm.toLowerCase());
      const keywordMatch = Object.values(intent.keywords).some(langKeywords =>
        langKeywords.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      return nameMatch || keywordMatch;
    });
  };

  const filterExamples = (intentData: IntentExamples[], searchTerm: string) => {
    if (!searchTerm.trim()) return intentData;

    return intentData.filter(intent => {
      const nameMatch = intent.intent.toLowerCase().includes(searchTerm.toLowerCase());
      const exampleMatch = intent.examples.some(ex =>
        ex.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return nameMatch || exampleMatch;
    });
  };

  // LLM Provider Management Functions
  const toggleProvider = (providerId: string) => {
    if (!llmSettings) return;

    const isSelected = llmSettings.selectedProviders.some(p => p.id === providerId);

    if (isSelected) {
      // Remove provider
      const newSelected = llmSettings.selectedProviders.filter(p => p.id !== providerId);
      // Re-normalize priorities
      newSelected.forEach((p, i) => { p.priority = i; });
      setLlmSettings({ ...llmSettings, selectedProviders: newSelected });
    } else {
      // Add provider
      const newProvider = { id: providerId, priority: llmSettings.selectedProviders.length };
      setLlmSettings({ ...llmSettings, selectedProviders: [...llmSettings.selectedProviders, newProvider] });
    }
  };

  const moveProvider = (providerId: string, direction: 'up' | 'down') => {
    if (!llmSettings) return;

    const sorted = [...llmSettings.selectedProviders].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(p => p.id === providerId);

    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (newIdx < 0 || newIdx >= sorted.length) return;

    // Swap priorities
    const temp = sorted[idx].priority;
    sorted[idx].priority = sorted[newIdx].priority;
    sorted[newIdx].priority = temp;

    setLlmSettings({ ...llmSettings, selectedProviders: sorted });
  };

  const testProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const res = await fetch('/api/intent-manager/llm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId })
      });

      const data = await res.json();

      if (res.ok) {
        setProviderTestResults(prev => ({
          ...prev,
          [providerId]: { status: 'success', time: data.responseTime || 0 }
        }));
        toast({
          title: 'Success',
          description: `${providerId}: OK (${data.responseTime || '?'}ms)`
        });
      } else {
        setProviderTestResults(prev => ({
          ...prev,
          [providerId]: { status: 'error', error: data.error }
        }));
        toast({
          title: 'Error',
          description: `${providerId}: ${data.error}`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      setProviderTestResults(prev => ({
        ...prev,
        [providerId]: { status: 'error', error: error.message }
      }));
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const saveLLMSettings = async () => {
    if (!llmSettings) return;

    try {
      const res = await fetch('/api/intent-manager/llm-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmSettings)
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'LLM settings saved successfully'
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to save LLM settings',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Intent Manager</h1>
          <p className="text-muted-foreground">
            Manage keywords, training examples, and test intent classification
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <Card className="overflow-hidden">
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('statsOverview')}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Quick Stats</h3>
              <Badge variant="secondary" className="ml-2">
                {stats.totalIntents} intents
              </Badge>
            </div>
            {expandedSections.statsOverview ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>

          {expandedSections.statsOverview && (
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Intents</p>
                      <p className="text-2xl font-bold">{stats.totalIntents}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Keywords</p>
                      <p className="text-2xl font-bold">{stats.totalKeywords}</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Training Examples</p>
                      <p className="text-2xl font-bold">{stats.totalExamples}</p>
                    </div>
                    <Brain className="h-8 w-8 text-purple-500" />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test">
            <TestTube className="mr-2 h-4 w-4" />
            Test Console
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <Zap className="mr-2 h-4 w-4" />
            Keywords (Fuzzy)
          </TabsTrigger>
          <TabsTrigger value="examples">
            <Brain className="mr-2 h-4 w-4" />
            Training Examples (Semantic)
          </TabsTrigger>
          <TabsTrigger value="llm">
            <Globe className="mr-2 h-4 w-4" />
            LLM Models
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Test Console Tab */}
        <TabsContent value="test">
          <Card className="overflow-hidden">
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
              onClick={() => toggleSection('testConsole')}
            >
              <h3 className="text-lg font-semibold">Test Intent Classification</h3>
              {expandedSections.testConsole ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>

            {expandedSections.testConsole && (
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <Label>Test Message</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter a message to test..."
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && testIntent()}
                      />
                      <Button onClick={testIntent} disabled={testing || !testText.trim()}>
                        {testing ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                  </div>

              {testResult && (
                <Card className="p-4 bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Intent</p>
                        <p className="text-xl font-bold">{testResult.intent}</p>
                      </div>
                      <Badge variant={testResult.confidence > 0.8 ? 'default' : 'secondary'}>
                        {(testResult.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Source</p>
                        <div className="flex items-center gap-2">
                          {getSourceIcon(testResult.source)}
                          <span className="font-medium capitalize">{testResult.source}</span>
                        </div>
                      </div>

                      {testResult.detectedLanguage && (
                        <div>
                          <p className="text-muted-foreground">Language</p>
                          <p className="font-medium uppercase">{testResult.detectedLanguage}</p>
                        </div>
                      )}
                    </div>

                    {testResult.matchedKeyword && (
                      <div>
                        <p className="text-sm text-muted-foreground">Matched Keyword</p>
                        <code className="text-sm bg-white px-2 py-1 rounded">
                          {testResult.matchedKeyword}
                        </code>
                      </div>
                    )}

                    {testResult.matchedExample && (
                      <div>
                        <p className="text-sm text-muted-foreground">Similar To</p>
                        <code className="text-sm bg-white px-2 py-1 rounded">
                          {testResult.matchedExample}
                        </code>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Quick Tests:</strong></p>
                <div className="flex flex-wrap gap-2">
                  {['tq', 'wifi password', 'what\'s the cost', 'check in time', 'terima kasih', '你好'].map(text => (
                    <Button
                      key={text}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestText(text);
                        setTimeout(() => testIntent(), 100);
                      }}
                    >
                      {text}
                    </Button>
                  ))}
                </div>
              </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          <div className="mb-4">
            <Input
              placeholder="🔍 Search intents or keywords..."
              value={intentSearch}
              onChange={(e) => setIntentSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Intent List */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                Select Intent ({filterKeywords(keywords, intentSearch).length})
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 pr-2">
                  {filterKeywords(keywords, intentSearch).map((intent) => (
                    <Button
                      key={intent.intent}
                      variant={selectedIntent === intent.intent ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedIntent(intent.intent)}
                    >
                      <span className="capitalize">{intent.intent.replace(/_/g, ' ')}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Keyword Editor */}
            <div className="lg:col-span-2">
              {selectedIntent ? (
                <KeywordEditor
                  intent={selectedIntent}
                  keywords={keywords.find(k => k.intent === selectedIntent)?.keywords || { en: [], ms: [], zh: [] }}
                  onSave={(updated) => saveKeywords(selectedIntent, updated)}
                />
              ) : (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground">
                    Select an intent from the list to edit keywords
                  </p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Training Examples Tab */}
        <TabsContent value="examples">
          <div className="mb-4">
            <Input
              placeholder="🔍 Search intents or examples..."
              value={intentSearch}
              onChange={(e) => setIntentSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Intent List */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                Select Intent ({filterExamples(examples, intentSearch).length})
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 pr-2">
                  {filterExamples(examples, intentSearch).map((intent) => (
                    <Button
                      key={intent.intent}
                      variant={selectedIntent === intent.intent ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedIntent(intent.intent)}
                    >
                      <span className="capitalize">{intent.intent.replace(/_/g, ' ')}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {intent.examples.length}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Examples Editor */}
            <div className="lg:col-span-2">
              {selectedIntent ? (
                <ExamplesEditor
                  intent={selectedIntent}
                  examples={examples.find(e => e.intent === selectedIntent)?.examples || []}
                  onSave={(updated) => saveExamples(selectedIntent, updated)}
                />
              ) : (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground">
                    Select an intent from the list to edit training examples
                  </p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* LLM Configuration Tab */}
        <TabsContent value="llm">
          <div className="space-y-4">
            {/* LLM Provider Selection */}
            <Card className="overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                onClick={() => toggleSection('providerSelection')}
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
                  onClick={() => toggleSection('llmParameters')}
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
                  onClick={() => toggleSection('systemPrompt')}
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
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          {stats && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Intent Statistics</h3>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {stats.byIntent.map((item) => (
                    <div key={item.intent} className="flex items-center justify-between border-b pb-2">
                      <span className="capitalize font-medium">
                        {item.intent.replace(/_/g, ' ')}
                      </span>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{item.keywordCount} keywords</span>
                        <span>{item.exampleCount} examples</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// KeywordRow Component for Virtual Scrolling
interface KeywordRowProps {
  keyword: string;
  index: number;
  onRemove: (index: number) => void;
  style: React.CSSProperties;
}

function KeywordRow({ keyword, index, onRemove, style }: KeywordRowProps) {
  return (
    <div style={style} className="px-2 py-1">
      <div className="flex gap-2">
        <Input value={keyword} readOnly className="flex-1" />
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(index)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

// Keyword Editor Component
function KeywordEditor({
  intent,
  keywords,
  onSave
}: {
  intent: string;
  keywords: Record<'en' | 'ms' | 'zh', string[]>;
  onSave: (keywords: Record<string, string[]>) => void;
}) {
  const [editedKeywords, setEditedKeywords] = useState(keywords);
  const [activeTab, setActiveTab] = useState<'en' | 'ms' | 'zh'>('en');
  const [keywordSearch, setKeywordSearch] = useState('');

  useEffect(() => {
    setEditedKeywords(keywords);
  }, [keywords, intent]);

  const addKeyword = (lang: 'en' | 'ms' | 'zh', keyword: string) => {
    if (!keyword.trim()) return;
    setEditedKeywords(prev => ({
      ...prev,
      [lang]: [...prev[lang], keyword.trim()]
    }));
  };

  const removeKeyword = (lang: 'en' | 'ms' | 'zh', index: number) => {
    setEditedKeywords(prev => ({
      ...prev,
      [lang]: prev[lang].filter((_, i) => i !== index)
    }));
  };

  const filteredKeywords = (lang: 'en' | 'ms' | 'zh') => {
    return editedKeywords[lang].filter(kw =>
      kw.toLowerCase().includes(keywordSearch.toLowerCase())
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 capitalize">
        {intent.replace(/_/g, ' ')} - Keywords
      </h3>

      <div className="mb-3">
        <Input
          placeholder="🔍 Filter keywords..."
          value={keywordSearch}
          onChange={(e) => setKeywordSearch(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="en">English ({editedKeywords.en.length})</TabsTrigger>
          <TabsTrigger value="ms">Malay ({editedKeywords.ms.length})</TabsTrigger>
          <TabsTrigger value="zh">Chinese ({editedKeywords.zh.length})</TabsTrigger>
        </TabsList>

        {(['en', 'ms', 'zh'] as const).map(lang => (
          <TabsContent key={lang} value={lang} className="space-y-3">
            {filteredKeywords(lang).length > 20 ? (
              <List
                height={500}
                itemCount={filteredKeywords(lang).length}
                itemSize={56}
                width="100%"
                className="border rounded-md"
              >
                {({ index, style }) => (
                  <KeywordRow
                    keyword={filteredKeywords(lang)[index]}
                    index={index}
                    onRemove={(idx) => {
                      const actualIdx = editedKeywords[lang].indexOf(filteredKeywords(lang)[idx]);
                      removeKeyword(lang, actualIdx);
                    }}
                    style={style}
                  />
                )}
              </List>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  {filteredKeywords(lang).map((keyword, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input value={keyword} readOnly className="flex-1" />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const actualIdx = editedKeywords[lang].indexOf(keyword);
                          removeKeyword(lang, actualIdx);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add new keyword..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addKeyword(lang, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.querySelector(`input[placeholder="Add new keyword..."]`) as HTMLInputElement;
                  if (input?.value) {
                    addKeyword(lang, input.value);
                    input.value = '';
                  }
                }}
              >
                Add
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-4">
        <Button onClick={() => onSave(editedKeywords)} className="w-full">
          Save Keywords
        </Button>
      </div>
    </Card>
  );
}

// ExampleRow Component for Virtual Scrolling
interface ExampleRowProps {
  example: string;
  index: number;
  onRemove: (index: number) => void;
  style: React.CSSProperties;
}

function ExampleRow({ example, index, onRemove, style }: ExampleRowProps) {
  return (
    <div style={style} className="px-2 py-1">
      <div className="flex gap-2">
        <Input value={example} readOnly className="flex-1" />
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(index)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

// Examples Editor Component
function ExamplesEditor({
  intent,
  examples,
  onSave
}: {
  intent: string;
  examples: string[];
  onSave: (examples: string[]) => void;
}) {
  const [editedExamples, setEditedExamples] = useState(examples);
  const [exampleSearch, setExampleSearch] = useState('');

  useEffect(() => {
    setEditedExamples(examples);
  }, [examples, intent]);

  const addExample = (example: string) => {
    if (!example.trim()) return;
    setEditedExamples(prev => [...prev, example.trim()]);
  };

  const removeExample = (index: number) => {
    setEditedExamples(prev => prev.filter((_, i) => i !== index));
  };

  const filteredExamples = editedExamples.filter(ex =>
    ex.toLowerCase().includes(exampleSearch.toLowerCase())
  );

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 capitalize">
        {intent.replace(/_/g, ' ')} - Training Examples
      </h3>

      <div className="space-y-3">
        <div className="mb-3">
          <Input
            placeholder="🔍 Filter examples..."
            value={exampleSearch}
            onChange={(e) => setExampleSearch(e.target.value)}
          />
        </div>

        {filteredExamples.length > 20 ? (
          <List
            height={500}
            itemCount={filteredExamples.length}
            itemSize={56}
            width="100%"
            className="border rounded-md"
          >
            {({ index, style }) => (
              <ExampleRow
                example={filteredExamples[index]}
                index={index}
                onRemove={(idx) => {
                  const actualIdx = editedExamples.indexOf(filteredExamples[idx]);
                  removeExample(actualIdx);
                }}
                style={style}
              />
            )}
          </List>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {filteredExamples.map((example, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={example} readOnly className="flex-1" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const actualIdx = editedExamples.indexOf(example);
                      removeExample(actualIdx);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Add training example..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addExample(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <Button
            onClick={() => {
              const input = document.querySelector(`input[placeholder="Add training example..."]`) as HTMLInputElement;
              if (input?.value) {
                addExample(input.value);
                input.value = '';
              }
            }}
          >
            Add
          </Button>
        </div>

        <div className="mt-4">
          <Button onClick={() => onSave(editedExamples)} className="w-full">
            Save Examples
          </Button>
        </div>
      </div>
    </Card>
  );
}

// LLM Provider Selector Component
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
