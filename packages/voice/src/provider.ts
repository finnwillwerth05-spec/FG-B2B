import type {
  InboundWebhookEvent,
  OutboundCallRequest,
  OutboundCallResponse,
  VoiceCallStatus,
  VoiceProviderName,
} from '@fg/types';

export interface VoiceProvider {
  readonly name: VoiceProviderName;
  placeOutboundCall(req: OutboundCallRequest): Promise<OutboundCallResponse>;
  endCall(providerCallId: string): Promise<void>;
  getCallStatus(providerCallId: string): Promise<VoiceCallStatus>;
  parseInboundWebhook(headers: Record<string, string>, body: unknown): Promise<InboundWebhookEvent>;
}
