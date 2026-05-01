// Top-level exports: error classes only. Next 14 wrappers live behind
// subpath exports so server-only code (cookies, redirect) stays out of
// client bundles.
//
//   @fg/auth/server      — Server Components, Route Handlers, Server Actions
//   @fg/auth/browser     — Client Components
//   @fg/auth/middleware  — middleware.ts only

export * from './errors';
