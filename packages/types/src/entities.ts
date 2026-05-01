import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CallCadence,
  CallStatus,
  CareActionType,
  EngagementLevel,
  MembershipRole,
  OutcomeReportType,
  PatientStatus,
  RiskTier,
  TenantType,
} from './enums';

export interface AuditColumns {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface Tenant extends AuditColumns {
  name: string;
  type: TenantType;
  cohortDefinition: Record<string, unknown>;
  outcomeMetrics: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface UserProfile extends AuditColumns {
  displayName: string;
  phone: string | null;
  isSuperAdmin: boolean;
  defaultLocale: string;
}

export interface UserTenantMembership extends AuditColumns {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  status: 'active' | 'invited' | 'suspended';
}

export interface PatientAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Patient extends AuditColumns {
  tenantId: string;
  externalMrn: string | null;
  firstName: string;
  lastName: string;
  dob: string;
  sex: 'male' | 'female' | 'other' | 'unknown';
  phone: string;
  address: PatientAddress | null;
  conditions: string[];
  primaryDx: string | null;
  riskTier: RiskTier;
  status: PatientStatus;
  enrolledAt: string;
}

export interface CallSchedule extends AuditColumns {
  tenantId: string;
  patientId: string;
  cadence: CallCadence;
  daysOfWeek: number[];
  timeOfDay: string;
  timezone: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
}

export interface CallLog extends AuditColumns {
  tenantId: string;
  patientId: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  status: CallStatus;
  transcript: string | null;
  recordingUrl: string | null;
  voiceProvider: string;
  providerCallId: string | null;
  agentId: string | null;
  metadata: Record<string, unknown>;
}

export interface Alert extends AuditColumns {
  tenantId: string;
  patientId: string;
  callLogId: string | null;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  escalatedTo: string[];
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

export interface CareTeamAction extends AuditColumns {
  tenantId: string;
  alertId: string;
  userId: string;
  action: CareActionType;
  notes: string | null;
}

export interface OutcomeReport extends AuditColumns {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  reportType: OutcomeReportType;
  metrics: Record<string, unknown>;
  generatedAt: string;
  generatedBy: string;
}

export type EngagementLevelValue = EngagementLevel;
