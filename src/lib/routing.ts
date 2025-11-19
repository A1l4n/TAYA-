// Routing utilities for role-based navigation

import type { UserRole } from '@/types';

export const ROLE_ROUTES: Record<UserRole, string[]> = {
  super_admin: [
    '/dashboard',
    '/dashboard/admin',
    '/dashboard/teams',
    '/dashboard/hierarchy',
    '/dashboard/resources',
    '/dashboard/settings',
  ],
  org_admin: [
    '/dashboard',
    '/dashboard/admin',
    '/dashboard/teams',
    '/dashboard/hierarchy',
    '/dashboard/resources',
    '/dashboard/settings',
  ],
  senior_manager: [
    '/dashboard',
    '/dashboard/teams',
    '/dashboard/hierarchy',
    '/dashboard/resources',
    '/dashboard/settings',
  ],
  manager: [
    '/dashboard',
    '/dashboard/teams',
    '/dashboard/resources',
  ],
  lead: [
    '/dashboard',
    '/dashboard/resources',
  ],
  member: [
    '/dashboard',
  ],
};

/**
 * Get the default route for a user role
 */
export function getDefaultRoute(role: UserRole): string {
  const routes = ROLE_ROUTES[role];
  return routes?.[0] || '/dashboard';
}

/**
 * Check if a user role has access to a route
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const routes = ROLE_ROUTES[role];
  if (!routes) return false;

  // Exact match
  if (routes.includes(route)) return true;

  // Check if route starts with any allowed route
  return routes.some((allowedRoute) => route.startsWith(allowedRoute));
}

/**
 * Redirect user to appropriate dashboard based on role
 */
export function redirectByRole(role: UserRole): string {
  if (role === 'super_admin' || role === 'org_admin') {
    return '/dashboard/admin';
  }
  if (role === 'senior_manager' || role === 'manager') {
    return '/dashboard';
  }
  return '/dashboard';
}

