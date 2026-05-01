import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import type { Database } from '@fg/database';

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export async function refreshSession(request: NextRequest): Promise<{
  response: NextResponse;
  supabase: ReturnType<typeof createServerClient<Database>>;
  user: User | null;
}> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, supabase, user };
}
