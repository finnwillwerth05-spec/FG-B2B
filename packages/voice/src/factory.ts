import type { VoiceProviderName } from '@fg/types';

import type { VoiceProvider } from './provider';
import { ElevenLabsTwilioProvider } from './providers/elevenlabs-twilio';
import { LiveKitProvider } from './providers/livekit';
import { RetellProvider } from './providers/retell';
import { VapiProvider } from './providers/vapi';

const VALID_NAMES: readonly VoiceProviderName[] = [
  'retell',
  'vapi',
  'elevenlabs_twilio',
  'livekit',
];

function isVoiceProviderName(value: string): value is VoiceProviderName {
  return (VALID_NAMES as readonly string[]).includes(value);
}

export function getVoiceProvider(name?: string): VoiceProvider {
  const requested = name ?? process.env.VOICE_PROVIDER ?? 'retell';
  if (!isVoiceProviderName(requested)) {
    throw new Error(
      `Unknown voice provider '${requested}'. Expected one of: ${VALID_NAMES.join(', ')}`,
    );
  }
  switch (requested) {
    case 'retell':
      return new RetellProvider();
    case 'vapi':
      return new VapiProvider();
    case 'elevenlabs_twilio':
      return new ElevenLabsTwilioProvider();
    case 'livekit':
      return new LiveKitProvider();
  }
}
