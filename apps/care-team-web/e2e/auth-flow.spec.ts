import { expect, test } from '@playwright/test';

import { readMostRecentInviteToken } from './helpers/db';

const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@fg-dev.local';
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'fg-dev-superadmin-1234';

const TEST_TENANT_NAME = `E2E Test ACO ${Date.now()}`;
const TEST_TENANT_SLUG = TEST_TENANT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const INVITED_ADMIN_EMAIL = `e2e-admin-${Date.now()}@fg-dev.local`;

test('super admin onboards first tenant_admin end-to-end', async ({ page }) => {
  test.setTimeout(120_000); // first server-action compilation takes ~10s

  // 1. Sign in as super admin.
  await page.goto('/login');
  await page.getByLabel('Email').fill(SUPER_ADMIN_EMAIL);
  await page.getByLabel('Password').fill(SUPER_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Tenants', exact: true })).toBeVisible();

  // 2. Create a tenant + send first-admin invite.
  await page.getByRole('link', { name: /create tenant/i }).click();
  await expect(page).toHaveURL(/\/admin\/tenants\/new$/);
  await page.getByLabel(/^Tenant name$/i).fill(TEST_TENANT_NAME);
  await page.getByLabel(/^Type$/i).selectOption('aco');
  await page.getByLabel(/first tenant admin email/i).fill(INVITED_ADMIN_EMAIL);
  await page
    .getByRole('button', { name: /create tenant/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\?created=/, { timeout: 30_000 });

  // 3. Read the invite token from the dev outbox.
  const token = await readMostRecentInviteToken(INVITED_ADMIN_EMAIL);
  expect(token.length).toBeGreaterThan(20);

  // 4. Sign out, then accept the invite.
  await page.goto('/api/auth/sign-out');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto(`/accept-invite/${token}`);
  await expect(
    page.getByRole('heading', { name: new RegExp(`welcome to ${TEST_TENANT_NAME}`, 'i') }),
  ).toBeVisible();
  await page.getByLabel(/your name/i).fill('E2E Admin');
  await page.getByLabel(/choose a password/i).fill('e2e-admin-password-xyz');
  await page.getByRole('button', { name: /accept invite/i }).click();

  // 5. Should land on the new tenant's dashboard.
  await expect(page).toHaveURL(new RegExp(`/${TEST_TENANT_SLUG}/dashboard$`), {
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: /Welcome, E2E Admin/i })).toBeVisible();
  await expect(
    page.getByText(new RegExp(`tenant admin of ${TEST_TENANT_NAME}`, 'i')),
  ).toBeVisible();
});
