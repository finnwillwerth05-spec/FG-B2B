import { type NextRequest, NextResponse } from 'next/server';

import { refreshSession } from '@fg/auth/middleware';

import { PUBLIC_ROUTE_PATTERNS, TENANT_COOKIE } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await refreshSession(request);
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTE_PATTERNS.some((re) => re.test(pathname))) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const tenantId = request.cookies.get(TENANT_COOKIE)?.value;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  // tenant routes look like /pbaco/dashboard, /pbaco/settings/...
  const isTenantRoute = !isAdminRoute && /^\/[a-z0-9][a-z0-9-]*\/[^/]/.test(pathname);

  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();
    const isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;
    if (!isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/select-tenant';
      return NextResponse.redirect(url);
    }
    response.headers.set('x-fg-user-id', user.id);
    response.headers.set('x-fg-role', 'super_admin');
    return response;
  }

  if (isTenantRoute) {
    if (!tenantId) {
      const url = request.nextUrl.clone();
      url.pathname = '/select-tenant';
      return NextResponse.redirect(url);
    }
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('role, tenants!inner(slug)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();
    const row = membership as { role: string; tenants: { slug: string } } | null;
    if (!row) {
      const url = request.nextUrl.clone();
      url.pathname = '/select-tenant';
      return NextResponse.redirect(url);
    }
    response.headers.set('x-fg-user-id', user.id);
    response.headers.set('x-fg-tenant-id', tenantId);
    response.headers.set('x-fg-role', row.role);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
