import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Kanban, List, X, AlertCircle,
  ChevronDown, Users, Clock, CheckCircle2, Circle, Loader2, Trash2,
  UserPlus, Mail, Shield, BarChart3, Target, Bell, UserMinus
} from 'lucide-react';
import { projects as projectsApi, stories as storiesApi, activity as activityApi, members as membersApi, ApiRequestError } from '../api/client';
import type { UserStory, Priority, StoryStatus, TaskStatus } from '../types';

const STATUS_LABELS: Record<StoryStatus, string> = {
  BACKLOG: 'Backlog', TODO: 'Todo', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done'
};
const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'var(--color-muted)', MEDIUM: 'var(--color-warning)', HIGH: 'var(--color-danger)'
};

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const qc = useQueryClient();
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: '', description: '', priority: 'MEDIUM' as Priority });
  const [formError, setFormError] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId)
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['stories', projectId],
    queryFn: () => storiesApi.list(projectId)
  });

  const { data: activityData } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => activityApi.list(projectId, { limit: 20 })
  });

  const { data: membersData } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => membersApi.list(projectId)
  });

  const createStory = useMutation({
    mutationFn: () => {
      const payload: Partial<UserStory> & { title: string } = {
        title: storyForm.title,
        priority: storyForm.priority as Priority
      };
      if (storyForm.description) {
        payload.description = storyForm.description;
      }
      return storiesApi.create(projectId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories', projectId] });
      setShowCreateStory(false);
      setStoryForm({ title: '', description: '', priority: 'MEDIUM' });
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) setFormError(err.message);
      else setFormError('Failed to create story.');
    }
  });

  const updateStoryStatus = useMutation({
    mutationFn: ({ storyId, status }: { storyId: string; status: StoryStatus }) =>
      storiesApi.update(projectId, storyId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories', projectId] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['activity', projectId] });
    }
  });

  const archiveStory = useMutation({
    mutationFn: (storyId: string) => storiesApi.delete(projectId, storyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories', projectId] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['activity', projectId] });
    }
  });

  const inviteMember = useMutation({
    mutationFn: () => membersApi.invite(projectId, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      qc.invalidateQueries({ queryKey: ['activity', projectId] });
      setInviteEmail('');
      setInviteRole('MEMBER');
      setInviteError('');
      setInviteSuccess(`Invitation sent! They now have ${inviteRole} access.`);
      setTimeout(() => { setInviteSuccess(''); setShowAddMember(false); }, 2500);
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) setInviteError(err.message);
      else setInviteError('Failed to invite member.');
    }
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => membersApi.remove(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      qc.invalidateQueries({ queryKey: ['activity', projectId] });
    }
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  const project = projectData?.data;
  if (!project) return null;

  const storyList = storiesData?.data ?? [];
  const activityList = activityData?.data ?? [];
  const memberList = membersData?.data ?? [];

  // Project progress computation
  const totalStories = storyList.length;
  const doneStories = storyList.filter(s => s.status === 'DONE').length;
  const inProgressStories = storyList.filter(s => s.status === 'IN_PROGRESS').length;
  const blockedStories = storyList.filter(s => s.status === 'BACKLOG' || s.status === 'TODO').length;
  const progressPct = totalStories === 0 ? 0 : Math.round((doneStories / totalStories) * 100);

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: 'var(--color-surface)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}>
              {project.key}
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/projects/${projectId}/kanban`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-soft)' }}>
            <Kanban size={15} /> Kanban
          </Link>
          <button
            onClick={() => setShowCreateStory(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
            <Plus size={15} /> Add story
          </button>
        </div>
      </div>

      {/* Project Progress Bar */}
      {totalStories > 0 && (
        <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} style={{ color: 'var(--color-brand)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-soft)' }}>Project Progress</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--color-brand)' }}>{progressPct}% complete</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-strong)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: progressPct === 100 ? 'var(--color-success)' : 'var(--color-brand)' }}
            />
          </div>
          <div className="flex gap-4 mt-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{doneStories} Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-brand)' }} />
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{inProgressStories} In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-border)' }} />
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{blockedStories} Pending</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Target size={11} style={{ color: 'var(--color-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{totalStories} total stories</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stories */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-soft)' }}>
              User Stories ({storyList.length})
            </h2>
          </div>

          {storiesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-surface)' }} />)}
            </div>
          ) : storyList.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ border: '1px dashed var(--color-border)' }}>
              <List size={28} style={{ color: 'var(--color-muted)', opacity: 0.4, margin: '0 auto 10px' }} />
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No stories yet. Create the first user story.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {storyList.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  projectId={projectId}
                  onStatusChange={(status) => updateStoryStatus.mutate({ storyId: story.id, status })}
                  onArchive={() => archiveStory.mutate(story.id)}
                  members={memberList}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Members + Activity */}
        <div className="space-y-6">
          {/* Members */}
          <div className="p-4 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: 'var(--color-muted)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Team</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}>{memberList.length}</span>
              </div>
              <button
                onClick={() => { setShowAddMember(true); setInviteError(''); setInviteSuccess(''); }}
                title="Add team member"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'rgb(158 228 123 / 0.12)', color: 'var(--color-brand)', border: '1px solid rgb(158 228 123 / 0.25)' }}
              >
                <UserPlus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2.5">
              {memberList.map((m) => (
                <div key={m.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}>
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{m.user.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                          style={{
                            background: m.role === 'OWNER' ? 'rgb(158 228 123 / 0.15)' : m.role === 'ADMIN' ? 'rgb(251 191 36 / 0.12)' : 'rgb(148 163 184 / 0.1)',
                            color: m.role === 'OWNER' ? 'var(--color-brand)' : m.role === 'ADMIN' ? 'var(--color-warning)' : 'var(--color-muted)'
                          }}>
                          {m.role}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{m.user.email}</span>
                      </div>
                    </div>
                  </div>
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => removeMember.mutate(m.user.id)}
                      title="Remove member"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <UserMinus size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="p-4 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: 'var(--color-muted)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Activity</h3>
            </div>
            {activityList.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>No activity yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activityList.map((a) => (
                  <div key={a.id} className="flex gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)' }}>
                      {a.actor?.name.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-soft)' }}>{a.summary}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Story Modal */}
      {showCreateStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgb(0 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>New user story</h2>
              <button onClick={() => { setShowCreateStory(false); setFormError(''); }}
                style={{ color: 'var(--color-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setFormError(''); createStory.mutate(); }} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>Title</label>
                <input type="text" value={storyForm.title} onChange={(e) => setStoryForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="As a user, I want to…"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>Description</label>
                <textarea value={storyForm.description} onChange={(e) => setStoryForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Context and acceptance criteria…"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>Priority</label>
                <select value={storyForm.priority} onChange={(e) => setStoryForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <option value="LOW" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>Low</option>
                  <option value="MEDIUM" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>Medium</option>
                  <option value="HIGH" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>High</option>
                </select>
              </div>
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'rgb(248 113 113 / 0.08)', color: 'var(--color-danger)' }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowCreateStory(false); setFormError(''); }}
                  className="flex-1 py-2.5 rounded-lg text-sm"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
                <button type="submit" disabled={createStory.isPending}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
                  {createStory.isPending ? 'Creating…' : 'Create story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgb(0 0 0 / 0.65)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserPlus size={16} style={{ color: 'var(--color-brand)' }} />
                <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Add Team Member</h2>
              </div>
              <button onClick={() => setShowAddMember(false)} style={{ color: 'var(--color-muted)' }}><X size={18} /></button>
            </div>
            <div className="mb-5 p-3 rounded-lg flex items-start gap-2"
              style={{ background: 'rgb(158 228 123 / 0.07)', border: '1px solid rgb(158 228 123 / 0.2)' }}>
              <Bell size={13} style={{ color: 'var(--color-brand)', marginTop: '2px', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                The member will receive a notification upon being added. They must already have a SprintGrid account.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm mb-1.5 font-medium" style={{ color: 'var(--color-soft)' }}>
                  <Mail size={12} /> Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && inviteEmail) inviteMember.mutate(); }}
                  autoFocus
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm mb-1.5 font-medium" style={{ color: 'var(--color-soft)' }}>
                  <Shield size={12} /> Access level
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <option value="VIEWER" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>Viewer — Read-only access</option>
                  <option value="MEMBER" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>Member — Can create & update work</option>
                  <option value="ADMIN" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>Admin — Can manage members & settings</option>
                </select>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-muted)' }}>
                  {inviteRole === 'ADMIN' ? '⚡ Admin can invite/remove members and update project settings.' :
                   inviteRole === 'MEMBER' ? '✏️ Member can create stories, tasks, update statuses and assign work.' :
                   '👁️ Viewer has read-only access — they cannot modify anything.'}
                </p>
              </div>
              {inviteError && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'rgb(248 113 113 / 0.08)', color: 'var(--color-danger)' }}>
                  <AlertCircle size={14} /> {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'rgb(74 222 128 / 0.08)', color: 'var(--color-success)', border: '1px solid rgb(74 222 128 / 0.2)' }}>
                  <CheckCircle2 size={14} /> {inviteSuccess}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddMember(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
                <button
                  onClick={() => inviteEmail && inviteMember.mutate()}
                  disabled={!inviteEmail || inviteMember.isPending}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
                  <UserPlus size={14} />
                  {inviteMember.isPending ? 'Adding…' : 'Add to project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryCard({ story, projectId, onStatusChange, onArchive, members }: {
  story: UserStory;
  projectId: string;
  onStatusChange: (s: StoryStatus) => void;
  onArchive: () => void;
  members: import('../types').Membership[];
}) {
  const [showTasks, setShowTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const qc = useQueryClient();

  const { data: storyDetail } = useQuery({
    queryKey: ['story', projectId, story.id],
    queryFn: () => import('../api/client').then(m => m.stories.get(projectId, story.id)),
    enabled: showTasks
  });

  const defaultTaskStatus: TaskStatus = (
    story.status === 'BACKLOG' || story.status === 'TODO' || story.status === 'IN_PROGRESS' || story.status === 'IN_REVIEW' || story.status === 'DONE'
  ) ? (story.status as TaskStatus) : 'TODO';

  const createTask = useMutation({
    mutationFn: () => import('../api/client').then(m => m.tasks.create(projectId, story.id, { title: taskTitle, status: defaultTaskStatus })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['story', projectId, story.id] });
      qc.invalidateQueries({ queryKey: ['stories', projectId] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['activity', projectId] });
      setTaskTitle('');
      setShowCreateTask(false);
    }
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<import('../types').Task> }) => {
      const payload: Partial<import('../types').Task> = {};
      if (data.status !== undefined) payload.status = data.status;
      if (data.assigneeId !== undefined) payload.assigneeId = data.assigneeId;
      return import('../api/client').then(m => m.tasks.update(projectId, story.id, taskId, payload));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['story', projectId, story.id] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['activity', projectId] });
    }
  });

  const statusClass = {
    BACKLOG: 'status-backlog', TODO: 'status-todo', IN_PROGRESS: 'status-in-progress',
    IN_REVIEW: 'status-in-review', DONE: 'status-done'
  }[story.status] ?? 'status-backlog';

  const tasks = storyDetail?.data?.tasks ?? [];

  return (
    <div className="rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <select
                value={story.status}
                onChange={(e) => onStatusChange(e.target.value as StoryStatus)}
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold outline-none ${statusClass}`}
                style={{ border: 'none', cursor: 'pointer' }}>
                {(Object.keys(STATUS_LABELS) as StoryStatus[]).map(s => (
                  <option key={s} value={s} style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <span className="text-[10px] font-semibold" style={{ color: PRIORITY_COLORS[story.priority] }}>
                ● {story.priority}
              </span>
              {story.storyPoints && (
                <span className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}>
                  {story.storyPoints}pt
                </span>
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{story.title}</p>
            {story.description && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-muted)' }}>{story.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setShowTasks((v) => !v)}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-surface-strong"
              style={{ color: 'var(--color-muted)' }}>
              {story._count?.tasks ?? 0} tasks <ChevronDown size={12} />
            </button>
            <button onClick={onArchive}
              className="p-1 rounded transition-colors hover:bg-surface-strong"
              style={{ color: 'var(--color-muted)' }} title="Archive">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks list */}
      {showTasks && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="px-4 py-3 space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-1">
                <button
                  onClick={() => {
                    updateTask.mutate({
                      taskId: task.id,
                      data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' }
                    });
                  }}
                  className="focus:outline-none transition-transform active:scale-95 shrink-0"
                >
                  {task.status === 'DONE' ? (
                    <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  ) : (
                    <Circle size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  )}
                </button>
                <span className="text-xs flex-1 truncate" style={{ color: task.status === 'DONE' ? 'var(--color-muted)' : 'var(--color-soft)', textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>
                  {task.title}
                </span>

                {/* Assignee select box */}
                <select
                  value={task.assigneeId || ''}
                  onChange={(e) => {
                    updateTask.mutate({
                      taskId: task.id,
                      data: { assigneeId: e.target.value || null }
                    });
                  }}
                  className="bg-surface-strong border border-border text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer"
                  style={{ color: 'var(--color-muted)' }}
                >
                  <option value="" style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id} style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>
                      {m.user.name}
                    </option>
                  ))}
                </select>

                {task.assignee && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}
                    title={task.assignee.name}>
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {showCreateTask ? (
              <div className="flex gap-2 mt-2">
                <input
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && taskTitle) createTask.mutate(); if (e.key === 'Escape') setShowCreateTask(false); }}
                  placeholder="Task title…"
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
                <button onClick={() => taskTitle && createTask.mutate()}
                  disabled={!taskTitle || createTask.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
                  Add
                </button>
                <button onClick={() => { setShowCreateTask(false); setTaskTitle(''); }}
                  className="px-2 py-1.5 rounded-lg text-xs"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-1.5 text-xs mt-1 transition-colors text-brand hover:opacity-85"
              >
                <Plus size={12} /> Add task
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
