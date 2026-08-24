'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { Logomark } from '@/components/Logomark';
import { useState, useCallback, useEffect, type ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  active?: boolean;
  icon?: string;
}

interface AppShellProps {
  children: ReactNode;
  sectionLabel: string;
  navItems?: NavItem[];
  sideTitle: string;
  sideCopy: string;
  role?: UserRole;
}

export const BASELINE_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/internal/review-queue', label: 'Review Queue' },
  { href: '/internal/workflow/board', label: 'Workflow Board' },
  { href: '/internal/workflow', label: 'Process Guide' },
  { href: '/editor/tasks', label: 'Editor Tasks' },
];

function getNavItemsForRole(role: UserRole): { items: NavItem[]; label: string } {
  // Normalize so a role value that differs only in casing/whitespace
  // (easy to introduce editing profiles.role by hand in Supabase) still
  // matches a case below instead of silently falling through to an
  // empty nav — leaving the mobile hamburger menu with no way out.
  const normalized = (role || '').trim().toLowerCase();
  switch (normalized) {
    case 'admin':
      return {
        label: 'Admin Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/internal/project-tracking', label: 'Project Tracking' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/editor/tasks', label: 'Editor Tasks' },
        ],
      };
    case 'project_manager':
      return {
        label: 'PM Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/internal/project-tracking', label: 'Project Tracking' },
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
          { href: '/internal/project-tracking', label: 'Project Tracking' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/review/content-scaling-mistakes', label: 'Video Review' },
        ],
      };
    case 'super_admin':
      return {
        label: 'Admin Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/internal/project-tracking', label: 'Project Tracking' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/editor/tasks', label: 'Editor Tasks' },
        ],
      };
    case 'general_manager':
      return {
        label: 'General Manager',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/internal/project-tracking', label: 'Project Tracking' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/editor/tasks', label: 'Editor Tasks' },
        ],
      };
    case 'manager':
      return {
        label: 'Manager Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/internal/project-tracking', label: 'Project Tracking' },
          { href: '/calendar', label: 'Calendar' },
          { href: '/internal/review-queue', label: 'Review Queue' },
          { href: '/editor/tasks', label: 'Editor Tasks' },
        ],
      };
    case 'social_media_admin':
      return {
        label: 'Social Media Admin',
        items: [
          { href: '/calendar', label: 'Client Calendars' },
        ],
      };
    case 'client':
      return {
        label: 'Client Portal',
        items: [
          { href: '/calendar', label: 'My Calendar' },
          { href: '/client/reviews', label: 'Review & Approve' },
        ],
      };
    case 'editor':
      return {
        label: 'Editor Portal',
        items: [
          { href: '/editor/tasks', label: 'My Tasks' },
          { href: '/editor/workflow', label: 'Submit & Amend' }
        ],
      };
    default:
      // Unrecognized or not-yet-loaded role — never leave the nav fully
      // empty (that's a dead end on mobile, where the sidebar is the
      // only way to move between pages).
      return { label: 'Workspace', items: BASELINE_NAV_ITEMS };
  }
}

const ICON_MAP: Record<string, string> = {
  'Dashboard': '📊',
  'Project Tracking': '📋',
  'Calendar': '📅',
  'Notion Content Hub': '📋',
  'Review Queue': '🔍',
  'Editor Tasks': '✏️',
  'Users': '👥',
  'Settings': '⚙️',
  'QC Review': '✅',
  'Video Review': '🎬',
  'Client Calendars': '📆',
  'My Calendar': '📅',
  'My Reviews': '📝',
  'My Tasks': '✏️',
  'Workflow Board': '🔁',
  'Process Guide': '🧭',
  'Review & Approve': '✅',
  'Submit & Amend': '🎬',
};

export function AppShell({ children, sectionLabel, navItems, sideTitle, sideCopy, role }: AppShellProps) {
  const pathname = usePathname();
  const { user, role: authRole, signOut, idleWarning, resetIdle, remainingSeconds } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, closeMobile]);

  const [idleDismissed, setIdleDismissed] = useState(false);

  const effectiveRole = role || user?.role || null;
  const roleNav = effectiveRole ? getNavItemsForRole(effectiveRole as UserRole) : null;

  const effectiveNavItems = roleNav
    ? roleNav.items.map((item) => ({
        ...item,
        active: pathname === item.href || pathname.startsWith(item.href + '/'),
      }))
    : (navItems || []).map((item) => ({
        ...item,
        active: pathname === item.href || pathname.startsWith(item.href + '/'),
      }));

  const effectiveSectionLabel = roleNav ? roleNav.label : sectionLabel;

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      {/* Mobile hamburger toggle — hidden on desktop, shown on mobile via CSS */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <button
          onClick={toggle}
          className="sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute',
            top: 12,
            right: collapsed ? 6 : 10,
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: 'var(--muted)',
            zIndex: 1,
          }}
        >
          {collapsed ? '☰' : '◀'}
        </button>

        <Link className="brand" href="/dashboard">
          <span className="mark"><Logomark variant="onDark" size={20} /></span>
          {!collapsed && <span>Content Coach Academy</span>}
        </Link>
        <nav className="nav" aria-label={effectiveSectionLabel}>
          {!collapsed && <div className="nav-label">{effectiveSectionLabel}</div>}
          {effectiveNavItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={closeMobile}
              className={item.active ? 'active' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <span className="dot" />
              {collapsed ? (
                <span style={{ fontSize: 14 }}>{ICON_MAP[item.label] || '•'}</span>
              ) : (
                item.label
              )}
            </Link>
          ))}
        </nav>
        {!collapsed && (
          <>
            <div className="side-card">
              <strong>{sideTitle}</strong>
              <p>{sideCopy}</p>
            </div>
            {!collapsed && user && (
              <div className="side-card user-card">
                <strong>{user.name || user.email}</strong>
                <p style={{ textTransform: 'capitalize', fontSize: '11px' }}>{user.role}</p>
                <button className="btn" onClick={signOut} style={{ marginTop: 8, fontSize: 12, width: '100%', padding: '6px 10px' }}>
                  Sign out
                </button>
              </div>
            )}
            {/* Always-visible logout — bottom of sidebar */}
            {user && (
              <button
                onClick={signOut}
                title="Sign out"
                style={{
                  position: 'absolute',
                  bottom: 16,
                  [collapsed ? 'left' : 'right']: collapsed ? 8 : 16,
                  width: collapsed ? 40 : 'auto',
                  height: 36,
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>🚪</span>
                {!collapsed && <span style={{ fontSize: 12, fontWeight: 600 }}>Sign out</span>}
              </button>
            )}
          </>
        )}
      </aside>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}
      <main className="main">
        {/* Idle timeout warning */}
        {idleWarning && !idleDismissed && user && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 13,
            color: '#856404',
          }}>
            <span>⏰ You've been idle. Auto-logout in <strong>{remainingSeconds}s</strong>.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { resetIdle(); setIdleDismissed(false); }}
                className="btn small"
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                I'm here
              </button>
              <button
                onClick={() => setIdleDismissed(true)}
                className="btn small outline"
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {children}</main>
    </div>
  );
}
