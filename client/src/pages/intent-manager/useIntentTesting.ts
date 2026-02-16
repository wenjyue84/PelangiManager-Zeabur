import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { TestResult } from './types';

export function useIntentTesting() {
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const { toast } = useToast();

  const testIntent = useCallback(async () => {
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
  }, [testText, toast]);

  return {
    testText,
    setTestText,
    testResult,
    testing,
    testIntent,
  };
}
