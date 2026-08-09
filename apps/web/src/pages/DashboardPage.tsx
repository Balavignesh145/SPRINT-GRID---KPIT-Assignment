import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, ArrowRight, X, AlertCircle, Layers, Clock } from 'lucide-react';
import { projects as projectsApi, ApiRequestError } from '../api/client';

export function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '' });
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
  });

  const createProject = useMutation({
    mutationFn: (d: typeof form) =>
      projectsApi.create({
        name: d.name,
        key: d.key.toUpperCase(),
        ...(d.description ? { description: d.description } : {})
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', key: '', description: '' });
      navigate(`/projects/${res.data.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) setFormError(err.message);
      else setFormError('Failed to create project.');
    }
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    createProject.mutate(form);
  }

  // Auto-generate key from name
  function handleNameChange(name: string) {
    const key = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setForm((f) => ({ ...f, name, key }));
  }

  const projectList = data?.data ?? [];

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Your projects and workspaces
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
          style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}
        >
          <Plus size={15} /> New project
        </button>
      </div>

      {/* Project list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-36 rounded-xl animate-pulse"
              style={{ background: 'var(--color-surface)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl text-sm"
          style={{ background: 'rgb(248 113 113 / 0.08)', border: '1px solid rgb(248 113 113 / 0.2)', color: 'var(--color-danger)' }}>
          <AlertCircle size={16} /> Failed to load projects.
        </div>
      ) : projectList.length === 0 ? (
        <div className="text-center py-20 rounded-2xl"
          style={{ border: '1px dashed var(--color-border)' }}>
          <Folder size={36} style={{ color: 'var(--color-muted)', opacity: 0.4, margin: '0 auto 12px' }} />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No projects yet</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Create your first project to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}
          >
            + New project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group p-5 rounded-2xl flex flex-col gap-3 transition-all hover:scale-[1.02]"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}>
                  {p.key.slice(0, 2)}
                </div>
                <ArrowRight size={14} style={{ color: 'var(--color-muted)', opacity: 0 }}
                  className="group-hover:opacity-100 transition-opacity mt-1" />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {p.name}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {p.key}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-auto">
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <Layers size={11} /> {p._count?.stories ?? 0} stories
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <Clock size={11} />
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex -space-x-2">
                {p.memberships.slice(0, 4).map((m) => (
                  <div key={m.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}
                    title={m.user.name}>
                    {m.user.name.charAt(0)}
                  </div>
                ))}
                {p.memberships.length > 4 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                    +{p.memberships.length - 4}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgb(0 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>New project</h2>
              <button onClick={() => { setShowCreate(false); setFormError(''); }}
                style={{ color: 'var(--color-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>
                  Project name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="Northstar launch"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>
                  Project key <span className="text-xs" style={{ color: 'var(--color-muted)' }}>(2–8 uppercase letters)</span>
                </label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }))}
                  required
                  minLength={2}
                  maxLength={8}
                  pattern="[A-Z0-9]{2,8}"
                  placeholder="NSTAR"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none font-mono"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-brand)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>
                  Description <span className="text-xs" style={{ color: 'var(--color-muted)' }}>(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="What is this project about?"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'rgb(248 113 113 / 0.08)', color: 'var(--color-danger)' }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setFormError(''); }}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={createProject.isPending}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
                  {createProject.isPending ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
