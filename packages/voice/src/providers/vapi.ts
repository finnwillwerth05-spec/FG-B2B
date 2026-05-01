import type {
  InboundWebhookEvent,
  OutboundCallRequest,
  OutboundCallResponse,
  VoiceCallStatus,
  VoiceProviderName,
} from '@fg/types';

import { NotImplementedError } from '../errors';
import type { VoiceProvider } from '../provider';

export class VapiProvider implements VoiceProvider {
  readonly name: VoiceProviderName = 'vapi';

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
