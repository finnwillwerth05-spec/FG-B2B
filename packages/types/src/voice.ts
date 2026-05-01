export type VoiceProviderName = 'retell' | 'vapi' | 'elevenlabs_twilio' | 'livekit';

export type VoiceCallStatus =
  | 'queued'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'no_answer'
  | 'voicemail';

export interface OutboundCallRequest {
  toNumber: string;
  tenantId: string;
  patientId: string;
  agentId: string;
  metadata: Record<string, unknown>;
}

export interface OutboundCallResponse {
  providerCallId: string;
  status: VoiceCallStatus;
}

export interface InboundWebhookEvent {
  providerCallId: string;
  status: VoiceCallStatus;
  transcript: string | null;
  recordingUrl: string | null;
  durationSeconds: number | null;
  metadata: Record<string, unknown>;
  raw: unknown;
}
