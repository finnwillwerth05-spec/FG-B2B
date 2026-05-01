import {
  createBrowserClient as _createBrowserClient,
  createServerClient as _createServerClient,
} from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import type { Database } from './generated.js';

export function createBrowserClient(supabaseUrl: string, supabaseAnonKey: string) {
  return _createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createServerClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options: Parameters<typeof _createServerClient>[2],
) {
  return _createServerClient<Database>(supabaseUrl, supabaseAnonKey, options);
}

export function createServiceRoleClient(supabaseUrl: string, supabaseServiceRoleKey: string) {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
