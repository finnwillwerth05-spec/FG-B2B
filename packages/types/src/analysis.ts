import type { AlertSeverity, EngagementLevel, TenantType } from './enums';

export interface CallAnalysis {
  overallMood: 'positive' | 'neutral' | 'negative' | 'concerning';
  moodScore: number;
  emotionalFlags: string[];
  cognitiveScore: number;
  cognitiveFlags: string[];
  physicalFlags: string[];
  safetyAlerts: string[];
  engagementLevel: EngagementLevel;
  callDurationSeconds: number;
  conversationQuality: string;
  summary: string;
  keyTopics: string[];
  followUpItems: string[];
  comparedToPrevious: 'better' | 'similar' | 'worse' | 'first_call';
  alertRequired: boolean;
  alertSeverity: AlertSeverity | 'none';
  alertReason: string;
}

export interface AnalysisContext {
  patientFirstName: string;
  conditions: string[];
  primaryDx: string | null;
  recentSummaries: string[];
  moodTrend: 'improving' | 'stable' | 'declining' | 'unknown';
  tenantType: TenantType;
}
