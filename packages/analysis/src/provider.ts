import type { AnalysisContext, CallAnalysis } from '@fg/types';

export interface AnalysisProvider {
  readonly name: string;
  readonly modelId: string;
  analyzeTranscript(transcript: string, context: AnalysisContext): Promise<CallAnalysis>;
}
