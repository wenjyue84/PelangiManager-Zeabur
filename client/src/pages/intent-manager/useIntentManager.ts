import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { IntentKeywords, IntentExamples, Stats } from './types';

export function useIntentManager() {
  const [keywords, setKeywords] = useState<IntentKeywords[]>([]);
  const [examples, setExamples] = useState<IntentExamples[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [intentSearch, setIntentSearch] = useState('');

  const { toast } = useToast();

  const loadData = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveKeywords = useCallback(async (intent: string, updatedKeywords: Record<string, string[]>) => {
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
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save keywords',
        variant: 'destructive'
      });
    }
  }, [toast, loadData]);

  const saveExamples = useCallback(async (intent: string, updatedExamples: string[]) => {
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
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save examples',
        variant: 'destructive'
      });
    }
  }, [toast, loadData]);

  const exportData = useCallback(async (format: 'json' | 'csv') => {
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
  }, [toast]);

  const filterKeywords = useCallback((intentData: IntentKeywords[], searchTerm: string) => {
    if (!searchTerm.trim()) return intentData;

    return intentData.filter(intent => {
      const nameMatch = intent.intent.toLowerCase().includes(searchTerm.toLowerCase());
      const keywordMatch = Object.values(intent.keywords).some(langKeywords =>
        langKeywords.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      return nameMatch || keywordMatch;
    });
  }, []);

  const filterExamples = useCallback((intentData: IntentExamples[], searchTerm: string) => {
    if (!searchTerm.trim()) return intentData;

    return intentData.filter(intent => {
      const nameMatch = intent.intent.toLowerCase().includes(searchTerm.toLowerCase());
      const exampleMatch = intent.examples.some(ex =>
        ex.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return nameMatch || exampleMatch;
    });
  }, []);

  return {
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
  };
}
