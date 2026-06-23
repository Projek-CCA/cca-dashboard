'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { MetricCard } from '@/components/MetricCard';
import { StatusPill } from '@/components/StatusPill';
import type { CalendarDay, ContentItem } from '@/lib/types';
import { recentActivity } from '@/lib/mock-data';

const navItems = [
  { href: '/calendar', label: 'Content Calendar', active: true },
  { href: '/review/content-scaling-mistakes', label: 'Review Videos' },
  { href: '/calendar', label: 'Approved Outputs' },
  { href: '/calendar', label: 'Notifications' },
  { href: '/internal/review-queue', label: 'Internal Queue' },
  { href: '/editor/tasks', label: 'Editor Tasks' },
];

type Filter = 'All' | 'Pending your approval' | 'Ready to post' | 'Posted' | 'Needs amendment';

const filters: Filter[] = ['All', 'Pending your approval', 'Ready to post', 'Posted', 'Needs amendment'];

function matchesFilter(item: ContentItem, filter: Filter) {
  if (filter === 'All') return true;
  if (filter === 'Pending your approval') return item.status === 'Pending Client Approval';
  if (filter === 'Ready to post') return item.status === 'Ready to Post';
  if (filter === 'Posted') return item.status === 'Posted';
  if (filter === 'Needs amendment') return item.status === 'Amendments Requested';
  return true;
}

interface CalendarClientProps {
  days: CalendarDay[];
  items: ContentItem[];
}

export function CalendarClient({ days, items }: CalendarClientProps) {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const visibleDays = useMemo(() => days.map((day) => ({
    ...day,
    items: day.items.filter((item) => matchesFilter(item, filter) && item.title.toLowerCase().includes(query.toLowerCase())),
  })), [days, filter, query]);

  const pending = useMemo(() => items.filter((item) => item.status === 'Pending Client Approval').slice(0, 3), [items]);
  const metrics = useMemo(() => [
    { label: 'Total content', value: String(items.length) },
    { label: 'Need approval', value: String(items.filter((item) => item.status === 'Pending Client Approval').length) },
    { label: 'Ready to post', value: String(items.filter((item) => item.status === 'Ready to Post').length) },
    { label: 'Posted', value: String(items.filter((item) => item.status === 'Posted').length) },
  ], [items]);

  return (
    <AppShell sectionLabel="Client Portal" navItems={navItems} sideTitle="Client view" sideCopy="Client sees only their own content calendar, review actions, final links, and comments.">
      <div className="calendar-page-container">
      <div className="topbar">
        <div className="crumb">Client Portal / <b>Munif Isa Hub</b> / Content Calendar</div>
        <div className="top-actions"><Button>Export month</Button><Button variant="primary">{pending.length} pending approvals</Button></div>
      </div>
      {isMobile && (
          <div className="mobile-note">
            <strong>📅 Agenda view</strong> — days with no content are hidden.
          </div>
        )}
      <section className="hero">
        <div><h1>January 2026 Content Calendar</h1><p>Review upcoming posts, open videos that need approval, and keep all comments inside the system.</p></div>
        <div className="summary">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
      </section>
      <div className="toolbar">
        <div className="month-nav"><Button variant="ghost" aria-label="Previous month">←</Button><strong>January 2026</strong><Button variant="ghost" aria-label="Next month">→</Button></div>
        <div className="filters">{filters.map((name) => <button className={`chip ${filter === name ? 'active' : ''}`} key={name} onClick={() => setFilter(name)}>{name}</button>)}</div>
        <input className="search" placeholder="Search calendar…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <section className={`calendar ${isMobile ? 'agenda' : ''}`} aria-label="January 2026 calendar">
        {isMobile ? (
          <div className="agenda-list">
            {visibleDays
              .filter((day) => !day.muted && day.items.length > 0)
              .map((day, index) => {
                const dayDate = new Date(2026, 0, day.date);
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
                const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div className="agenda-day" key={`agenda-${day.date}-${index}`}>
                    <div className="agenda-date">{dayName}, {monthDay}</div>
                    {day.items.map((item) => {
                      const card = <><h3>{item.title}</h3><div className="pills">{item.tags.map((tag) => <StatusPill key={tag} label={tag} />)}</div></>;
                      return item.status === 'Pending Client Approval' || item.slug === 'content-scaling-mistakes'
                        ? <Link className="content-card" href={`/review/${item.slug}`} key={item.id}>{card}</Link>
                        : <div className="content-card" key={item.id}>{card}</div>;
                    })}
                    {day.note ? <div className="more">{day.note}</div> : null}
                  </div>
                );
              })}
            {visibleDays.filter((d) => !d.muted && d.items.length > 0).length === 0 && (
              <div className="agenda-empty">No content matches the current filter.</div>
            )}
          </div>
        ) : (
          <>
            <div className="weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div className="weekday" key={day}>{day}</div>)}</div>
            <div className="calendar-grid">
              {visibleDays.map((day, index) => (
                <div className={`day ${day.muted ? 'muted' : ''}`} key={`${day.date}-${index}`}>
                  <div className="date">{day.date}</div>
                  {day.items.map((item) => {
                    const card = <><h3>{item.title}</h3><div className="pills">{item.tags.map((tag) => <StatusPill key={tag} label={tag} />)}</div></>;
                    return item.status === 'Pending Client Approval' || item.slug === 'content-scaling-mistakes'
                      ? <Link className="content-card" href={`/review/${item.slug}`} key={item.id}>{card}</Link>
                      : <div className="content-card" key={item.id}>{card}</div>;
                  })}
                  {day.note ? <div className="more">{day.note}</div> : null}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="drawer">
        <div className="panel">
          <div className="panel-head"><h2>Needs your approval</h2><Button>View all</Button></div>
          <div className="queue">
            {pending.map((item) => (
              <div className="queue-row" key={item.id}>
                <div className="thumb" />
                <div><strong>{item.title}</strong><small>Posting {new Date(item.postDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {item.comments.length || 'waiting for decision'} timestamp comments</small></div>
                <Link className="approval-btn" href={`/review/${item.slug}`}>Review</Link>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Recent activity</h2><Button>Notifications</Button></div>
          <div className="activity">{recentActivity.map((event) => <div className="event" key={event.id}><div className="icon">{event.icon}</div><div><p>{event.text}</p><small>{event.time}</small></div></div>)}</div>
        </div>
      </section>
      </div>
    </AppShell>
  );
}
