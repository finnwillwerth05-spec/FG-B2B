export type TenantType = 'aco' | 'ma_plan' | 'physician_group' | 'home_health' | 'snf';

export type MembershipRole = 'tenant_admin' | 'care_team_lead' | 'care_team_member';

export type PatientStatus = 'active' | 'paused' | 'discharged' | 'deceased';

export type RiskTier = 'low' | 'medium' | 'high' | 'very_high';

export type CallStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'no_answer'
  | 'failed'
  | 'voicemail';

export type CallCadence = 'daily' | 'weekdays' | 'custom';

export type EngagementLevel = 'high' | 'moderate' | 'low' | 'refused';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertType = 'clinical' | 'behavioral' | 'safety' | 'operational';

export type AlertStatus = 'open' | 'acknowledged' | 'escalated' | 'resolved' | 'dismissed';

export type CareActionType =
  | 'acknowledge'
  | 'comment'
  | 'escalate'
  | 'resolve'
  | 'dismiss'
  | 'schedule_visit'
  | 'contact_patient';

export type OutcomeReportType = 'monthly' | 'quarterly' | 'annual' | 'adhoc';
