import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FixedSizeList as List } from 'react-window';
import type { IntentKeywords } from './types';

interface KeywordsTabProps {
  keywords: IntentKeywords[];
  selectedIntent: string | null;
  setSelectedIntent: (intent: string) => void;
  intentSearch: string;
  setIntentSearch: (search: string) => void;
  filterKeywords: (data: IntentKeywords[], search: string) => IntentKeywords[];
  onSaveKeywords: (intent: string, keywords: Record<string, string[]>) => void;
}

// --- KeywordRow (virtualized) ---

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

// --- KeywordEditor ---

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
          placeholder="Filter keywords..."
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

// --- KeywordsTab ---

export default function KeywordsTab({
  keywords,
  selectedIntent,
  setSelectedIntent,
  intentSearch,
  setIntentSearch,
  filterKeywords,
  onSaveKeywords,
}: KeywordsTabProps) {
  const filtered = filterKeywords(keywords, intentSearch);

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search intents or keywords..."
          value={intentSearch}
          onChange={(e) => setIntentSearch(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Intent List */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">
            Select Intent ({filtered.length})
          </h3>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2 pr-2">
              {filtered.map((intent) => (
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
              onSave={(updated) => onSaveKeywords(selectedIntent, updated)}
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
    </>
  );
}
