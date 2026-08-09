import { Link } from 'react-router-dom';
import { ArrowRight, Zap, GitBranch, Users, BarChart3, CheckSquare, Layers, Clock } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 sticky top-0 z-30"
        style={{ background: 'rgb(7 17 13 / 0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/brand/sprintgrid-logo.png" alt="SprintGrid Logo" className="object-contain" style={{ width: 28, height: 28, mixBlendMode: 'screen', filter: 'brightness(1.1)' }} />
          <span className="font-bold tracking-tight">SprintGrid</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-soft)', border: '1px solid var(--color-border)' }}>
            Sign in
          </Link>
          <Link to="/register"
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105"
            style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-24 pb-20 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-8"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-brand)' }}>
          <Zap size={10} />
          Built for teams of 3–10
        </div>

        <h1 className="font-bold mb-6 leading-tight"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.03em' }}>
          Plan clearly.{' '}
          <span style={{ color: 'var(--color-brand)' }}>Execute confidently.</span>
          <br />Ship together.
        </h1>

        <p className="text-lg mb-10 mx-auto max-w-xl leading-relaxed"
          style={{ color: 'var(--color-muted)' }}>
          SprintGrid connects projects, user stories and tasks into one agile workspace — without the enterprise complexity.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
            Create workspace <ArrowRight size={16} />
          </Link>
          <Link to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm transition-colors"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-soft)' }}>
            Sign in to existing account
          </Link>
        </div>
      </section>

      {/* Hierarchy diagram */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Layers size={20} />, title: 'Project', desc: 'Organise your team\'s work into focused workspaces. Set goals, add members, track overall progress.' },
            { icon: <GitBranch size={20} />, title: 'User Story', desc: 'Break each project into user-facing requirements. Assign story points, status and acceptance criteria.' },
            { icon: <CheckSquare size={20} />, title: 'Task', desc: 'Implement stories through concrete tasks. Set due dates, assign to teammates, move across Kanban columns.' }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl relative"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)' }}>
                {item.icon}
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{item.desc}</p>
              {i < 2 && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 items-center justify-center">
                  <ArrowRight size={14} style={{ color: 'var(--color-brand)' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-10 text-center"
          style={{ letterSpacing: '-0.02em' }}>
          Everything your team needs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <BarChart3 size={18} />, title: 'Kanban board', desc: 'Drag tasks across columns — Backlog, Todo, In Progress, Blocked, In Review, Done.' },
            { icon: <Users size={18} />, title: 'Team roles', desc: 'Owner, Admin, Member, Viewer roles. Invite teammates by email. Full RBAC.' },
            { icon: <Clock size={18} />, title: 'Background jobs', desc: 'Persistent job queue with retry logic. Overdue task detection, daily digest, reminders.' },
            { icon: <CheckSquare size={18} />, title: 'Activity log', desc: 'Full audit trail for every change — who did what and when.' },
            { icon: <Zap size={18} />, title: 'Fast by design', desc: 'Optimistic updates, TanStack Query caching, minimal network requests.' },
            { icon: <GitBranch size={18} />, title: 'Secure sessions', desc: 'Argon2id hashing, HttpOnly cookies, session revocation, rate limiting.' },
          ].map((f, i) => (
            <div key={i} className="p-5 rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'rgb(158 228 123 / 0.12)', color: 'var(--color-brand)' }}>
                {f.icon}
              </div>
              <h4 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--color-text)' }}>{f.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
          Ready to ship?
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
          Try the demo account — email: <code className="text-[var(--color-brand)]">demo@sprintgrid.local</code>, password: <code className="text-[var(--color-brand)]">Demo1234!</code>
        </p>
        <Link to="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all hover:scale-105"
          style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
          Create your workspace <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8"
        style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>SprintGrid — Agile Project Workspace</span>
          <span>Plan clearly. Execute confidently. Ship together.</span>
        </div>
      </footer>
    </div>
  );
}
