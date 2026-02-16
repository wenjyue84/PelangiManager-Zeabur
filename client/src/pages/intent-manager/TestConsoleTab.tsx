import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import type { TestResult } from './types';

interface TestConsoleTabProps {
  testText: string;
  setTestText: (text: string) => void;
  testResult: TestResult | null;
  testing: boolean;
  testIntent: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function getSourceIcon(source: string) {
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
}

export default function TestConsoleTab({
  testText,
  setTestText,
  testResult,
  testing,
  testIntent,
  expanded,
  onToggleExpand,
}: TestConsoleTabProps) {
  return (
    <Card className="overflow-hidden">
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
        onClick={onToggleExpand}
      >
        <h3 className="text-lg font-semibold">Test Intent Classification</h3>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
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
                {['tq', 'wifi password', 'what\'s the cost', 'check in time', 'terima kasih', '\u4f60\u597d'].map(text => (
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
  );
}
