'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

/* ── Types ──────────────────────────────────── */

interface DashboardData {
  ok: boolean;
  kpis: {
    total: number; done: number; inProgress: number; pending: number;
    notStarted: number; late: number; early: number; onTime: number;
  };
  amendmentsPerEditor: [string, number][];
  editorThroughput: {
    editor: string; total: number;
    breakdown: { status: string; count: number; pct: number }[];
  }[];
  deliveryPerEditor: {
    editor: string; total: number;
    early: number; earlyPct: number;
    onTime: number; onTimePct: number;
    late: number; latePct: number;
  }[];
  clientRevisionHeatmap: {
    client: string; amendmentCount: number; exceedsThreshold: boolean;
  }[];
  overdueTasks: {
    count: number;
    top5: {
      id: string; client_name: string; content_title: string;
      video_editor: string; status: string; deadline: string; sheet_tab: string;
    }[];
  };
  editorNames: string[];
  amendmentSummary: { totalAmendments: number; clientsWithAmendments: number };
}

/* ── Helpers ────────────────────────────────── */

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function daysOverdue(deadline: string) {
  const d = new Date(deadline);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function statusColor(s: string) {
  const lower = (s || '').toLowerCase();
  if (lower === 'done' || lower === 'completed') return { bg: '#ecfdf3', fg: '#15803d' };
  if (lower === 'amendment') return { bg: '#fff1f0', fg: '#dc2626' };
  if (lower === 'editing' || lower === 'in progress') return { bg: '#fff5e6', fg: '#c2410c' };
  if (lower === 'cancelled') return { bg: '#f3f4f6', fg: '#6b7280' };
  if (lower === 'pending') return { bg: '#e0e7ff', fg: '#4338ca' };
  if (lower === 'not started') return { bg: '#f6f5f4', fg: '#9ca3af' };
  return { bg: '#e0e7ff', fg: '#4338ca' };
}

function deliveryColor(s: string) {
  if (s === 'EARLY!') return { bg: '#ecfdf3', fg: '#15803d' };
  if (s === 'LATE DELIVERY') return { bg: '#fff1f0', fg: '#dc2626' };
  if (s === 'DEADLINE DAY') return { bg: '#fff5e6', fg: '#c2410c' };
  return { bg: '#f6f5f4', fg: '#9ca3af' };
}

/* ── useIsMobile ────────────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/* ── Bar Chart Component ────────────────────── */

function BarChart({
  data, maxVal, color, labelFn,
}: {
  data: { label: string; value: number; pct?: number; sub?: string }[];
  maxVal: number;
  color: { bg: string; fg: string };
  labelFn?: (d: { label: string; value: number; pct?: number; sub?: string }) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ width: 120, flexShrink: 0, textAlign: 'right', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {labelFn ? labelFn(d) : d.label}
          </span>
          <div style={{ flex: 1, height: 18, background: '#f3f4f6', borderRadius: 9, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${maxVal > 0 ? Math.round((d.value / maxVal) * 100) : 0}%`,
              background: color.bg, borderRadius: 9, minWidth: d.value > 0 ? 4 : 0,
              transition: 'width .3s ease',
            }} />
          </div>
          <span style={{ width: 60, flexShrink: 0, textAlign: 'right', fontWeight: 600, color: color.fg }}>
            {d.value}{d.pct !== undefined ? ` (${d.pct}%)` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat Card ───────────────────────────────── */

function StatCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ ...cardTitleStyle, ...(accent ? { borderBottom: `2px solid ${accent}` } : {}) }}>
        {title}
      </div>
      <div style={{ padding: 14 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────── */

export default function InternalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  /* Auth check */
  useEffect(() => {
    fetch('/api/project-tracking/dashboard').then((r) => {
      if (r.status === 403) window.location.href = '/login';
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/project-tracking/dashboard');
      if (res.status === 403) { window.location.href = '/login'; return; }
      const json = await res.json();
      if (json.ok) setData(json);
      else setError(json.error || 'Failed to load data');
    } catch {
      setError('Network error — check connection');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell sectionLabel="Internal" sideTitle="Dashboard" sideCopy="Operations dashboard for CCA internal team.">
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>Loading dashboard…</div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell sectionLabel="Internal" sideTitle="Dashboard" sideCopy="Operations dashboard for CCA internal team.">
        <div style={{ textAlign: 'center', padding: 64 }}>
          <p style={{ color: 'var(--red)', marginBottom: 12 }}>{error || 'No data available'}</p>
          <button onClick={load} className="btn small">Retry</button>
        </div>
      </AppShell>
    );
  }

  const { kpis, amendmentsPerEditor, editorThroughput, deliveryPerEditor, clientRevisionHeatmap, overdueTasks } = data;

  /* Section 1: Amendments per Editor */
  const amendmentMax = amendmentsPerEditor.length > 0 ? amendmentsPerEditor[0][1] : 1;
  const amendmentChartData = amendmentsPerEditor.map(([editor, count]) => ({
    label: editor, value: count,
  }));

  /* Section 2: Editor Throughput — build per-editor cards */
  const topEditors = editorThroughput.slice(0, 8);

  /* Section 3: Delivery performance — top by late count */
  const deliveryChartData = deliveryPerEditor.map((d) => ({
    label: d.editor, value: d.late, pct: d.latePct,
    sub: `${d.early} early / ${d.onTime} on-time / ${d.late} late`,
  }));

  /* Section 5: Overdue tasks */
  const overdueTop5 = overdueTasks?.top5 || [];
  const overdueCount = overdueTasks?.count || 0;

  return (
    <AppShell sectionLabel="Internal" sideTitle="Internal Dashboard" sideCopy={`${kpis.total} tasks tracked. Operations overview for CCA internal team.`}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="crumb">
          <Link href="/internal" style={{ textDecoration: 'none', color: 'inherit' }}>Internal</Link>
          {' / '}<b>Dashboard</b>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn small outline" style={{ fontSize: 12 }}>🔄 Refresh</button>
          <Link href="/internal/project-tracking" className="btn small" style={{ fontSize: 13, textDecoration: 'none' }}>
            📋 Tasks
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ ...kpiRowStyle, ...(isMobile ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>
        <KpiBox label="Total Tasks" value={kpis.total} color="var(--blue)" />
        <KpiBox label="Done" value={kpis.done} color="var(--green)" sub={`${kpis.total > 0 ? Math.round((kpis.done / kpis.total) * 100) : 0}%`} />
        <KpiBox label="In Progress" value={kpis.inProgress} color="var(--orange)" />
        <KpiBox label="Pending" value={kpis.pending} color="var(--muted)" />
        <KpiBox label="Not Started" value={kpis.notStarted} color="var(--soft)" />
        <KpiBox label="Late Delivery" value={kpis.late} color="var(--red)" alert={kpis.late > 0} />
        <KpiBox label="Early" value={kpis.early} color="var(--green)" />
        <KpiBox label="Deadline Day" value={kpis.onTime} color="var(--orange)" />
      </div>

      {/* Row 1: Amendments per Editor + Delivery Performance — both per-editor bar summaries */}
      <div className="dash-grid">
        <Section title="🔧 Amendments per Editor" accent="var(--red)">
          {amendmentsPerEditor.length === 0 ? (
            <EmptyState>No amendments found.</EmptyState>
          ) : (
            <BarChart
              data={amendmentChartData}
              maxVal={amendmentMax}
              color={{ bg: 'var(--red)', fg: '#dc2626' }}
            />
          )}
        </Section>

        <Section title="🚚 Delivery Performance" accent="var(--orange)">
          {deliveryPerEditor.length === 0 ? (
            <EmptyState>No delivery data yet.</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deliveryPerEditor.map((d) => (
                <div key={d.editor} style={editorCardStyle}>
                  <div style={{ fontWeight: 600, fontSize: 13, minWidth: 130 }}>{d.editor}<span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>({d.total})</span></div>
                  <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    {d.earlyPct > 0 && <div title={`Early: ${d.early} (${d.earlyPct}%)`} style={{ width: `${d.earlyPct}%`, height: '100%', background: '#15803d' }} />}
                    {d.onTimePct > 0 && <div title={`On-time: ${d.onTime} (${d.onTimePct}%)`} style={{ width: `${d.onTimePct}%`, height: '100%', background: '#c2410c' }} />}
                    {d.latePct > 0 && <div title={`Late: ${d.late} (${d.latePct}%)`} style={{ width: `${d.latePct}%`, height: '100%', background: '#dc2626' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 10, fontWeight: 600 }}>
                    <span style={{ color: '#15803d' }}>🟢 {d.early} ({d.earlyPct}%)</span>
                    <span style={{ color: '#c2410c' }}>🟠 {d.onTime} ({d.onTimePct}%)</span>
                    <span style={{ color: '#dc2626' }}>🔴 {d.late} ({d.latePct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Row 2: Editor Throughput + Client Revision Heatmap */}
      <div className="dash-grid">
        <Section title="📊 Editor Throughput" accent="var(--blue)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topEditors.length === 0 ? <EmptyState>No editor data yet.</EmptyState> : (
              topEditors.map((e) => (
                <div key={e.editor} style={{ ...editorCardStyle, ...(isMobile ? { flexDirection: 'column', alignItems: 'flex-start' } : {}) }}>
                  <div style={{ fontWeight: 600, fontSize: 13, minWidth: isMobile ? undefined : 130 }}>
                    {e.editor}
                    <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>({e.total})</span>
                  </div>
                  <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', display: 'flex', minWidth: isMobile ? '100%' : undefined }}>
                    {e.breakdown.map((b, i) => {
                      const c = statusColor(b.status);
                      return (
                        <div
                          key={i}
                          title={`${b.status}: ${b.count} (${b.pct}%)`}
                          style={{
                            width: `${b.pct}%`, height: '100%', background: c.bg, minWidth: b.pct > 0 ? 3 : 0,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10 }}>
                    {e.breakdown.slice(0, 5).map((b) => {
                      const c = statusColor(b.status);
                      return (
                        <span key={b.status} style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: '1px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {b.status} {b.count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="🔥 Client Revision Heatmap" accent="#dc2626">
          {clientRevisionHeatmap.length === 0 ? (
            <EmptyState>No revision data.</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clientRevisionHeatmap.map((c) => (
                <div key={c.client} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.client}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Heat bar */}
                    <div style={{ width: Math.min(c.amendmentCount * 30, 200), height: 20, background: c.exceedsThreshold ? '#dc2626' : '#fca5a5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{c.amendmentCount}</span>
                    </div>
                    {c.exceedsThreshold && (
                      <span style={{ background: '#fff1f0', color: '#dc2626', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>⚠ &gt;3</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Section 5: Overdue Tasks — full width, most action-critical section */}
      <Section title="⏰ Overdue Tasks" accent="#dc2626">
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: overdueCount > 0 ? 'var(--red)' : 'var(--green)' }}>
            {overdueCount}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>
            task{overdueCount !== 1 ? 's' : ''} past deadline (not Done)
          </span>
        </div>
        {overdueTop5.length === 0 ? (
          <EmptyState>No overdue tasks — everything is on track! 🎉</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {overdueTop5.map((t, i) => {
              const d = daysOverdue(t.deadline);
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '8px 10px', background: '#fff5f5', borderRadius: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--red)', minWidth: 20 }}>#{i + 1}</span>
                  <span style={{ fontWeight: 600, flex: 1, minWidth: 120 }}>{t.content_title}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{t.client_name}</span>
                  <span style={statusPillStyle(t.status)}>{t.status}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{t.video_editor || 'Unassigned'}</span>
                  <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 11 }}>{fmtDate(t.deadline)} — {d}d overdue</span>
                </div>
              );
            })}
            {overdueCount > 5 && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', padding: 8 }}>
                + {overdueCount - 5} more overdue tasks. View all in{' '}
                <Link href="/internal/project-tracking" style={{ color: 'var(--blue)' }}>Project Tracking</Link>.
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: 'var(--soft)' }}>
        Data from project_tasks (Synced from Google Sheets). Refresh to re-fetch.
      </div>
    </AppShell>
  );
}

/* ── Sub-components ────────────────────────── */

function KpiBox({ label, value, color, sub, alert }: { label: string; value: number; color: string; sub?: string; alert?: boolean }) {
  return (
    <div style={{
      textAlign: 'center', padding: '12px 8px', borderRadius: 10,
      background: '#fff', border: alert ? '2px solid var(--red)' : '1px solid var(--line)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ ...cardTitleStyle, ...(accent ? { borderBottom: `2px solid ${accent}` } : {}) }}>
        {title}
      </div>
      <div style={{ padding: '14px' }}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>
      {children}
    </div>
  );
}

function statusPillStyle(status: string): React.CSSProperties {
  const c = statusColor(status);
  return { background: c.bg, color: c.fg, borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' };
}

/* ── Styles ─────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, padding: '10px 14px',
  background: '#fafbfc', borderBottom: '1px solid var(--line)',
};

const kpiRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
  gap: 8, marginBottom: 14,
};

const editorCardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
  background: '#fafbfc', borderRadius: 8, border: '1px solid var(--line)',
  flexWrap: 'wrap',
};
