import type Anthropic from '@anthropic-ai/sdk';

import type { AnalysisContext, CallAnalysis } from '@fg/types';

import { NotImplementedError } from '../errors';
import type { AnalysisProvider } from '../provider';

export interface ClaudeAnalysisProviderOptions {
  client: Anthropic;
  modelId?: string;
}

// Default model id chosen per plan D13. Update when newer Sonnet/Opus rev ships.
const DEFAULT_MODEL_ID = 'claude-sonnet-4-6';

export class ClaudeAnalysisProvider implements AnalysisProvider {
  readonly name = 'claude';
  readonly modelId: string;
  private readonly client: Anthropic;

  constructor({ client, modelId }: ClaudeAnalysisProviderOptions) {
    this.client = client;
    this.modelId = modelId ?? DEFAULT_MODEL_ID;
  }

  async analyzeTranscript(_transcript: string, _context: AnalysisContext): Promise<CallAnalysis> {
    // Wired in Session 3+ once we have real transcripts to analyze.
    void this.client;
    throw new NotImplementedError(this.name, 'analyzeTranscript');
  }
}
