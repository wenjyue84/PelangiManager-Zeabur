import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Stats } from './types';

interface StatisticsTabProps {
  stats: Stats | null;
}

export default function StatisticsTab({ stats }: StatisticsTabProps) {
  if (!stats) return null;

  return (
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
  );
}
