import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@fg-dev.local';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'fg-dev-superadmin-1234';

  if (!url || !key) {
    console.error(
      '[seed-super-admin] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.',
    );
    console.error(
      '                  Run `pnpm db:start` and copy the printed values into .env.local.',
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotency: if a user with this email already exists, just ensure the
  // is_super_admin flag is set and exit.
  const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('[seed-super-admin] list users failed:', listErr.message);
    process.exit(1);
  }
  let userId: string;
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    userId = found.id;
    console.log(`[seed-super-admin] ${email} already exists (id=${userId})`);
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Super Admin' },
    });
    if (createErr) {
      console.error('[seed-super-admin] create user failed:', createErr.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`[seed-super-admin] created ${email} (id=${userId})`);
  }

  const { error: updateErr } = await supabase
    .from('user_profiles')
    .update({ is_super_admin: true })
    .eq('id', userId);
  if (updateErr) {
    console.error('[seed-super-admin] update profile failed:', updateErr.message);
    process.exit(1);
  }

  console.log(`[seed-super-admin] ${email} is now a super admin`);
}

void main();
