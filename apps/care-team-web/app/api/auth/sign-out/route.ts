import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import { getServerSupabase } from '@fg/auth/server';

import { TENANT_COOKIE } from '@/lib/constants';

async function signOut(request: NextRequest) {
  const supabase = getServerSupabase();
  await supabase.auth.signOut();
  cookies().delete(TENANT_COOKIE);
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: NextRequest) {
  return signOut(request);
}

export async function GET(request: NextRequest) {
  return signOut(request);
}
