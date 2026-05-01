import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactElement } from 'react';

import { render } from '@react-email/render';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<void> {
  const html = await render(react);
  const text = await render(react, { plainText: true });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'invites@fg-dev.local';

  if (!apiKey) {
    const outbox = join(process.cwd(), '.email-outbox');
    if (!existsSync(outbox)) mkdirSync(outbox, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeRecipient = to.replace(/[@.]/g, '_');
    const file = join(outbox, `${stamp}-${safeRecipient}.html`);
    writeFileSync(file, html);
    console.log(`[email] (dev) to=${to} subject="${subject}" -> ${file}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
