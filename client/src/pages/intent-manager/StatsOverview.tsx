import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Zap, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import type { Stats } from './types';

interface StatsOverviewProps {
  stats: Stats;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function StatsOverview({ stats, expanded, onToggleExpand }: StatsOverviewProps) {
  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Quick Stats</h3>
          <Badge variant="secondary" className="ml-2">
            {stats.totalIntents} intents
          </Badge>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
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
  );
}
