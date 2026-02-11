import { accessSync } from 'fs';
import path from 'path';
import axios from 'axios';

export function resolveKBDir(): string {
  const fromCwd = path.resolve(process.cwd(), '.rainbow-kb');
  try { accessSync(fromCwd); return fromCwd; } catch {}
  return path.resolve(process.cwd(), '..', '.rainbow-kb');
}

export const KB_FILES_DIR = resolveKBDir();

export function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const tVal = (result as any)[key];
    const sVal = source[key];
    if (
      sVal !== null &&
      typeof sVal === 'object' &&
      !Array.isArray(sVal) &&
      tVal !== null &&
      typeof tVal === 'object' &&
      !Array.isArray(tVal)
    ) {
      (result as any)[key] = deepMerge(tVal, sVal);
    } else {
      (result as any)[key] = sVal;
    }
  }
  return result;
}

export async function checkServerHealth(url: string, timeout: number = 2000): Promise<{ online: boolean; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    await axios.get(url, { timeout, validateStatus: () => true });
    return { online: true, responseTime: Date.now() - startTime };
  } catch (error: any) {
    return { online: false, error: error.code || error.message };
  }
}
