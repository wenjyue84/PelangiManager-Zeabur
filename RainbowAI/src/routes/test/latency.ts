import { Router } from 'express';
import type { Request, Response } from 'express';
import { testProvider } from '../../assistant/ai-client.js';
import { configStore } from '../../assistant/config-store.js';

const router = Router();

router.post('/llm-latency', async (req: Request, res: Response) => {
    const { providerId } = req.body;

    if (!providerId) {
        res.status(400).json({ error: 'providerId is required' });
        return;
    }

    try {
        const settings = configStore.getSettings();
        const providers = settings.ai.providers || [];
        const provider = providers.find(p => p.id === providerId);

        if (!provider) {
            res.status(404).json({ error: 'Provider not found' });
            return;
        }

        const hasKey = provider.type === 'ollama' ||
            !!provider.api_key ||
            !!(provider.api_key_env && process.env[provider.api_key_env]);
        if (!hasKey) {
            res.status(400).json({
                error: 'API key not set',
                hint: provider.api_key_env
                    ? `Set ${provider.api_key_env} in .env and restart the server.`
                    : 'Add an API key in Settings or set the provider\'s api_key_env.'
            });
            return;
        }

        // Simple ping via testProvider (works for all types: Groq, Ollama, OpenRouter, Moonshot)
        // and does not require provider to be enabled or to return classification JSON
        const result = await testProvider(providerId);

        if (!result.ok) {
            throw new Error(result.error || 'Model failed to respond');
        }

        res.json({
            ok: true,
            duration: result.responseTime ?? 0,
            provider: provider.name
        });

    } catch (error: any) {
        console.error(`[LatencyTest] Failed for ${providerId}:`, error);
        res.status(500).json({
            error: error.message || 'Latency test failed',
            details: error.toString()
        });
    }
});

export default router;
