import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readMostRecentInviteToken(emailContains: string): Promise<string> {
  // sendEmail writes to `process.cwd()/.email-outbox`. The Next dev server's
  // cwd is the app dir, so the outbox lives at apps/care-team-web/.email-outbox
  // when the e2e suite runs from the same dir.
  const outbox = join(process.cwd(), '.email-outbox');
  const safe = emailContains.replace(/[@.]/g, '_');
  const files = (await readdir(outbox))
    .filter((f) => f.includes(safe))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error(`No invite email found in .email-outbox/ for ${emailContains}`);
  }
  const html = await readFile(join(outbox, files[0]!), 'utf8');
  const match = html.match(/accept-invite\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('No accept-invite token in latest email');
  return match[1]!;
}
