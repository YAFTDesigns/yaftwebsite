import { describe, it, expect } from 'vitest';
import { decideProxyAction, decideProxyActionNoAuthAvailable } from './proxyDecision';

// These tests exist because of a security gap introduced and caught
// within the same session: when /api/admin/community and
// /api/admin/emails were first added, the proxy's matcher only
// covered /admin/:path*, meaning the new service-role-backed API
// routes were reachable by anyone on the internet with zero
// authentication. decideProxyAction() is now the single source of
// truth proxy.ts actually calls — these tests make sure that gap, or
// anything like it, can never silently come back.

describe('decideProxyAction', () => {
  describe('API routes (/api/admin/*)', () => {
    it('blocks unauthenticated requests with a 401 JSON response, NOT a redirect', () => {
      const result = decideProxyAction('/api/admin/community', false);
      expect(result).toEqual({ type: 'json-401' });
    });

    it('blocks unauthenticated requests to any /api/admin/* path', () => {
      expect(decideProxyAction('/api/admin/emails', false)).toEqual({ type: 'json-401' });
      expect(decideProxyAction('/api/admin/testimonials', false)).toEqual({ type: 'json-401' });
    });

    it('allows authenticated admin requests through', () => {
      const result = decideProxyAction('/api/admin/community', true);
      expect(result).toEqual({ type: 'pass-through' });
    });
  });

  describe('page routes (/admin/*)', () => {
    it('redirects unauthenticated requests to the login page', () => {
      const result = decideProxyAction('/admin', false);
      expect(result).toEqual({ type: 'redirect', to: '/admin/login' });
    });

    it('redirects unauthenticated requests on any /admin/* sub-page', () => {
      expect(decideProxyAction('/admin/invoices', false)).toEqual({
        type: 'redirect',
        to: '/admin/login',
      });
    });

    it('allows authenticated requests through', () => {
      const result = decideProxyAction('/admin', true);
      expect(result).toEqual({ type: 'pass-through' });
    });
  });

  describe('login page (/admin/login)', () => {
    it('allows unauthenticated users to reach it — otherwise nobody could ever log in', () => {
      const result = decideProxyAction('/admin/login', false);
      expect(result).toEqual({ type: 'pass-through' });
    });

    it('redirects an already-authenticated user away to /admin', () => {
      const result = decideProxyAction('/admin/login', true);
      expect(result).toEqual({ type: 'redirect', to: '/admin' });
    });
  });
});

describe('decideProxyActionNoAuthAvailable', () => {
  it('fails CLOSED (503) for API routes when Supabase env vars are missing', () => {
    const result = decideProxyActionNoAuthAvailable('/api/admin/community');
    expect(result).toEqual({ type: 'json-503' });
  });

  it('fails OPEN (pass-through) for page routes when Supabase env vars are missing', () => {
    const result = decideProxyActionNoAuthAvailable('/admin');
    expect(result).toEqual({ type: 'pass-through' });
  });
});
