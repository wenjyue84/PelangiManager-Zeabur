import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FixedSizeList as List } from 'react-window';
import type { IntentExamples } from './types';

interface ExamplesTabProps {
  examples: IntentExamples[];
  selectedIntent: string | null;
  setSelectedIntent: (intent: string) => void;
  intentSearch: string;
  setIntentSearch: (search: string) => void;
  filterExamples: (data: IntentExamples[], search: string) => IntentExamples[];
  onSaveExamples: (intent: string, examples: string[]) => void;
}

// --- ExampleRow (virtualized) ---

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

// --- ExamplesEditor ---

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
            placeholder="Filter examples..."
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

// --- ExamplesTab ---

export default function ExamplesTab({
  examples,
  selectedIntent,
  setSelectedIntent,
  intentSearch,
  setIntentSearch,
  filterExamples,
  onSaveExamples,
}: ExamplesTabProps) {
  const filtered = filterExamples(examples, intentSearch);

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search intents or examples..."
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
              onSave={(updated) => onSaveExamples(selectedIntent, updated)}
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
    </>
  );
}
