import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, TestTube, Zap, Brain, Globe, TrendingUp } from 'lucide-react';

import { useIntentManager } from './useIntentManager';
import { useIntentTesting } from './useIntentTesting';
import { useLLMSettings } from './useLLMSettings';

import StatsOverview from './StatsOverview';
import TestConsoleTab from './TestConsoleTab';
import KeywordsTab from './KeywordsTab';
import ExamplesTab from './ExamplesTab';
import LLMModelsTab from './LLMModelsTab';
import StatisticsTab from './StatisticsTab';

import type { ExpandedSections } from './types';

export default function IntentManager() {
  const {
    keywords,
    examples,
    stats,
    selectedIntent,
    setSelectedIntent,
    intentSearch,
    setIntentSearch,
    saveKeywords,
    saveExamples,
    exportData,
    filterKeywords,
    filterExamples,
  } = useIntentManager();

  const {
    testText,
    setTestText,
    testResult,
    testing,
    testIntent,
  } = useIntentTesting();

  const {
    allProviders,
    llmSettings,
    setLlmSettings,
    testingProvider,
    providerTestResults,
    toggleProvider,
    moveProvider,
    testProvider,
    saveLLMSettings,
  } = useLLMSettings();

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    statsOverview: false,
    testConsole: true,
    providerSelection: true,
    llmParameters: false,
    systemPrompt: false,
    thresholds: false,
  });

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
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
        <StatsOverview
          stats={stats}
          expanded={expandedSections.statsOverview}
          onToggleExpand={() => toggleSection('statsOverview')}
        />
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

        <TabsContent value="test">
          <TestConsoleTab
            testText={testText}
            setTestText={setTestText}
            testResult={testResult}
            testing={testing}
            testIntent={testIntent}
            expanded={expandedSections.testConsole}
            onToggleExpand={() => toggleSection('testConsole')}
          />
        </TabsContent>

        <TabsContent value="keywords">
          <KeywordsTab
            keywords={keywords}
            selectedIntent={selectedIntent}
            setSelectedIntent={setSelectedIntent}
            intentSearch={intentSearch}
            setIntentSearch={setIntentSearch}
            filterKeywords={filterKeywords}
            onSaveKeywords={saveKeywords}
          />
        </TabsContent>

        <TabsContent value="examples">
          <ExamplesTab
            examples={examples}
            selectedIntent={selectedIntent}
            setSelectedIntent={setSelectedIntent}
            intentSearch={intentSearch}
            setIntentSearch={setIntentSearch}
            filterExamples={filterExamples}
            onSaveExamples={saveExamples}
          />
        </TabsContent>

        <TabsContent value="llm">
          <LLMModelsTab
            allProviders={allProviders}
            llmSettings={llmSettings}
            setLlmSettings={setLlmSettings}
            testingProvider={testingProvider}
            providerTestResults={providerTestResults}
            toggleProvider={toggleProvider}
            moveProvider={moveProvider}
            testProvider={testProvider}
            saveLLMSettings={saveLLMSettings}
            expandedSections={{
              providerSelection: expandedSections.providerSelection,
              llmParameters: expandedSections.llmParameters,
              systemPrompt: expandedSections.systemPrompt,
            }}
            onToggleSection={toggleSection}
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatisticsTab stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
