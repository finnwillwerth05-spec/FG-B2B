import type {
  InboundWebhookEvent,
  OutboundCallRequest,
  OutboundCallResponse,
  VoiceCallStatus,
  VoiceProviderName,
} from '@fg/types';

import { NotImplementedError } from '../errors';
import type { VoiceProvider } from '../provider';

// Retell is the planned first concrete implementation (see plan D12).
// HIPAA-compliant, verified caller ID, ~600ms latency.
export class RetellProvider implements VoiceProvider {
  readonly name: VoiceProviderName = 'retell';

  async placeOutboundCall(_req: OutboundCallRequest): Promise<OutboundCallResponse> {
    throw new NotImplementedError(this.name, 'placeOutboundCall');
  }

  async endCall(_providerCallId: string): Promise<void> {
    throw new NotImplementedError(this.name, 'endCall');
  }

  async getCallStatus(_providerCallId: string): Promise<VoiceCallStatus> {
    throw new NotImplementedError(this.name, 'getCallStatus');
  }

  async parseInboundWebhook(
    _headers: Record<string, string>,
    _body: unknown,
  ): Promise<InboundWebhookEvent> {
    throw new NotImplementedError(this.name, 'parseInboundWebhook');
  }
}
