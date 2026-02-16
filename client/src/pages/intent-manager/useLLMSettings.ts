import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AIProvider, LLMSettings } from './types';

export function useLLMSettings() {
  const [allProviders, setAllProviders] = useState<AIProvider[]>([]);
  const [llmSettings, setLlmSettings] = useState<LLMSettings | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, { status: 'success' | 'error', time?: number, error?: string }>>({});

  const { toast } = useToast();

  const loadLLMSettings = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    loadLLMSettings();
  }, [loadLLMSettings]);

  const toggleProvider = useCallback((providerId: string) => {
    if (!llmSettings) return;

    const isSelected = llmSettings.selectedProviders.some(p => p.id === providerId);

    if (isSelected) {
      const newSelected = llmSettings.selectedProviders.filter(p => p.id !== providerId);
      newSelected.forEach((p, i) => { p.priority = i; });
      setLlmSettings({ ...llmSettings, selectedProviders: newSelected });
    } else {
      const newProvider = { id: providerId, priority: llmSettings.selectedProviders.length };
      setLlmSettings({ ...llmSettings, selectedProviders: [...llmSettings.selectedProviders, newProvider] });
    }
  }, [llmSettings]);

  const moveProvider = useCallback((providerId: string, direction: 'up' | 'down') => {
    if (!llmSettings) return;

    const sorted = [...llmSettings.selectedProviders].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(p => p.id === providerId);

    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (newIdx < 0 || newIdx >= sorted.length) return;

    const temp = sorted[idx].priority;
    sorted[idx].priority = sorted[newIdx].priority;
    sorted[newIdx].priority = temp;

    setLlmSettings({ ...llmSettings, selectedProviders: sorted });
  }, [llmSettings]);

  const testProvider = useCallback(async (providerId: string) => {
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
  }, [toast]);

  const saveLLMSettings = useCallback(async () => {
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
  }, [llmSettings, toast]);

  return {
    allProviders,
    llmSettings,
    setLlmSettings,
    testingProvider,
    providerTestResults,
    toggleProvider,
    moveProvider,
    testProvider,
    saveLLMSettings,
  };
}
