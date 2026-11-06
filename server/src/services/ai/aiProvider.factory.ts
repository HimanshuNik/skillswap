import type { IAIProvider } from './aiProvider.interface.js';
import { LocalDeterministicAIProvider } from './localDeterministicAIProvider.js';
import { GeminiAIProvider } from './geminiAIProvider.js';

let cachedProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (cachedProvider) return cachedProvider;

  const providerType = (process.env['AI_PROVIDER'] || 'deterministic').toLowerCase();
  if (providerType === 'gemini') {
    cachedProvider = new GeminiAIProvider();
  } else {
    cachedProvider = new LocalDeterministicAIProvider();
  }

  return cachedProvider;
}

export function resetAIProvider(): void {
  cachedProvider = null;
}

