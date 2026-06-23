import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="not-found">
      <section className="panel">
        <h1>CCA Dashboard MVP</h1>
        <p>Choose a prototype screen to preview.</p>
        <div className="top-actions">
          <Link className="btn primary" href="/calendar">Client Calendar</Link>
          <Link className="btn" href="/review/content-scaling-mistakes">Video Review</Link>
          <Link className="btn" href="/internal/review-queue">Internal Queue</Link>
          <Link className="btn" href="/editor/tasks">Editor Tasks</Link>
        </div>
      </section>
    </main>
  );
}
