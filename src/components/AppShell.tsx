'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, type UserRole } from '@/lib/auth-context';
import type { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  active?: boolean;
}

interface AppShellProps {
  children: ReactNode;
  sectionLabel: string;
  navItems: NavItem[];
  sideTitle: string;
  sideCopy: string;
  /** If provided, overrides navItems with role-based navigation */
  role?: UserRole;
}

function getNavItemsForRole(role: UserRole): { items: NavItem[]; label: string } {
  switch (role) {
    case 'admin':
      return {
        label: 'Admin Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/editor/tasks', label: 'Editor Tasks' },
          { href: '/dashboard', label: 'Users' },
        ],
      };
    case 'project_manager':
      return {
        label: 'PM Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/editor/tasks', label: 'Editor Tasks' },
        ],
      };
    case 'qc':
      return {
        label: 'QC Workspace',
        items: [
          { href: '/qc', label: 'QC Review' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/review/content-scaling-mistakes', label: 'Video Review' },
        ],
      };
    case 'editor':
      return {
        label: 'Editor Portal',
        items: [
          { href: '/editor/tasks', label: 'My Tasks' },
        ],
      };
    default:
      return {
        label: 'Workspace',
        items: [],
      };
  }
}

export function AppShell({ children, sectionLabel, navItems, sideTitle, sideCopy, role }: AppShellProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // If role is provided, derive nav items from role + mark active
  const effectiveRole = role || user?.role || null;
  const roleNav = effectiveRole ? getNavItemsForRole(effectiveRole as UserRole) : null;

  const effectiveNavItems = roleNav
    ? roleNav.items.map((item) => ({
        ...item,
        active: pathname === item.href || pathname.startsWith(item.href + '/'),
      }))
    : navItems;

  const effectiveSectionLabel = roleNav ? roleNav.label : sectionLabel;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="mark">CCA</span>
          <span>Content Coach Academy</span>
        </Link>
        <nav className="nav" aria-label={effectiveSectionLabel}>
          <div className="nav-label">{effectiveSectionLabel}</div>
          {effectiveNavItems.map((item) => (
            <Link key={item.href + item.label} href={item.href} className={item.active ? 'active' : undefined}>
              <span className="dot" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="side-card">
          <strong>{sideTitle}</strong>
          <p>{sideCopy}</p>
        </div>
        {user && (
          <div className="side-card user-card">
            <strong>{user.name || user.email}</strong>
            <p style={{ textTransform: 'capitalize', fontSize: '11px' }}>{user.role}</p>
            <button className="btn" onClick={signOut} style={{ marginTop: 8, fontSize: 12, width: '100%', padding: '6px 10px' }}>
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
