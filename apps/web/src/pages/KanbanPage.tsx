import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Loader2, Plus, X, Clock, AlertCircle, GripVertical } from 'lucide-react';
import { kanban as kanbanApi, tasks as tasksApi, stories as storiesApi, ApiRequestError } from '../api/client';
import type { Task, TaskStatus, KanbanColumns } from '../types';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'BACKLOG', label: 'Backlog', color: '#94a3b8' },
  { status: 'TODO', label: 'Todo', color: '#93c5fd' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: '#9ee47b' },
  { status: 'BLOCKED', label: 'Blocked', color: '#f87171' },
  { status: 'IN_REVIEW', label: 'In Review', color: '#75c3a0' },
  { status: 'DONE', label: 'Done', color: '#4ade80' }
];

export function KanbanPage() {
  const { projectId = '' } = useParams();
  const qc = useQueryClient();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localColumns, setLocalColumns] = useState<KanbanColumns | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<TaskStatus | null>(null);
  // createError state removed to fix unused warning

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: ['kanban', projectId],
    queryFn: () => kanbanApi.board(projectId)
  });

  useEffect(() => {
    if (kanbanData?.data) {
      setLocalColumns(kanbanData.data);
    }
  }, [kanbanData]);

  const { data: storiesData } = useQuery({
    queryKey: ['stories', projectId],
    queryFn: () => storiesApi.list(projectId)
  });

  const columns: KanbanColumns = localColumns ?? kanbanData?.data ?? {
    BACKLOG: [], TODO: [], IN_PROGRESS: [], BLOCKED: [], IN_REVIEW: [], DONE: []
  };

  const moveTask = useMutation({
    mutationFn: ({ taskId, storyId, status }: { taskId: string; storyId: string; status: TaskStatus }) =>
      tasksApi.update(projectId, storyId, taskId, { status }),
    onError: () => {
      // Rollback to server state
      if (kanbanData) setLocalColumns(kanbanData.data);
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
    }
  });

  function handleDragStart(event: DragStartEvent) {
    const task = findTask(event.active.id as string);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !localColumns) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeStatus = findTaskStatus(activeId);
    const overStatus = (COLUMNS.find(c => c.status === overId)?.status ?? findTaskStatus(overId)) as TaskStatus | undefined;

    if (!activeStatus || !overStatus || activeStatus === overStatus) return;

    // Optimistic update
    setLocalColumns(prev => {
      if (!prev) return prev;
      const task = prev[activeStatus].find(t => t.id === activeId);
      if (!task) return prev;
      return {
        ...prev,
        [activeStatus]: prev[activeStatus].filter(t => t.id !== activeId),
        [overStatus]: [...prev[overStatus], { ...task, status: overStatus }]
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const task = findTaskInColumns(taskId);
    if (!task) return;

    const targetStatus = COLUMNS.find(c => c.status === over.id)?.status
      ?? findTaskStatus(over.id as string) as TaskStatus | undefined;

    if (!targetStatus) return;

    if (task.status !== targetStatus) {
      moveTask.mutate({ taskId, storyId: task.storyId, status: targetStatus });
    }
  }

  function findTask(id: string): Task | undefined {
    return Object.values(columns).flat().find(t => t.id === id);
  }

  function findTaskInColumns(id: string): Task | undefined {
    return Object.values(localColumns ?? columns).flat().find(t => t.id === id);
  }

  function findTaskStatus(id: string): TaskStatus | undefined {
    for (const [status, tasks] of Object.entries(localColumns ?? columns)) {
      if (tasks.find((t: Task) => t.id === id)) return status as TaskStatus;
    }
    return undefined;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Link to={`/projects/${projectId}`}
            className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--color-muted)' }}>
            <ArrowLeft size={15} /> Back to project
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Kanban Board</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Drag tasks between columns
        </p>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="kanban-board flex-1">
          {COLUMNS.map(({ status, label, color }) => (
            <KanbanColumn
              key={status}
              status={status}
              label={label}
              color={color}
              tasks={columns[status]}
              onAddTask={() => setShowCreateTask(status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          status={showCreateTask}
          projectId={projectId}
          stories={storiesData?.data ?? []}
          onClose={() => setShowCreateTask(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['kanban', projectId] });
            setShowCreateTask(null);
          }}
        />
      )}
    </div>
  );
}

function KanbanColumn({ status, label, color, tasks, onAddTask }: {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: status, disabled: true } as Parameters<typeof useSortable>[0]);

  return (
    <div
      ref={setNodeRef}
      id={status}
      className="kanban-column"
      style={{
        outline: isOver ? `1px solid ${color}` : undefined,
        background: isOver ? `rgb(${color} / 0.06)` : undefined
      }}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-soft)' }}>{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}>
            {tasks.length}
          </span>
        </div>
        <button onClick={onAddTask}
          className="p-1 rounded transition-colors hover:bg-[var(--color-surface-strong)]"
          style={{ color: 'var(--color-muted)' }}>
          <Plus size={14} />
        </button>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[2rem]" id={status}>
          {tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <TaskCard task={task} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TaskCard({ task, isDragging, dragHandleProps }: {
  task: Task;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div className={`kanban-card ${isDragging ? 'dragging' : ''}`}>
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button className="mt-0.5 cursor-grab opacity-40 hover:opacity-100 transition-opacity shrink-0"
            style={{ color: 'var(--color-muted)' }} {...dragHandleProps}>
            <GripVertical size={12} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug" style={{ color: 'var(--color-text)' }}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] font-semibold"
              style={{ color: { LOW: 'var(--color-muted)', MEDIUM: 'var(--color-warning)', HIGH: 'var(--color-danger)' }[task.priority] }}>
              ● {task.priority}
            </span>
            {task.dueDate && (
              <span className="flex items-center gap-0.5 text-[10px]"
                style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-muted)' }}>
                <Clock size={9} />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {task.story && (
            <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
              {task.story.title}
            </p>
          )}
        </div>
        {task.assignee && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}
            title={task.assignee.name}>
            {task.assignee.name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTaskModal({ status, projectId, stories, onClose, onSuccess }: {
  status: TaskStatus;
  projectId: string;
  stories: import('../types').UserStory[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [storyId, setStoryId] = useState(stories[0]?.id ?? '');
  const [error, setError] = useState('');

  const createTask = useMutation({
    mutationFn: () => tasksApi.create(projectId, storyId, { title, status }),
    onSuccess,
    onError: (err) => {
      if (err instanceof ApiRequestError) setError(err.message);
      else setError('Failed to create task.');
    }
  });

  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgb(0 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="p-6 rounded-2xl max-w-sm w-full"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text)' }}>
            You need at least one user story before creating tasks.
          </p>
          <button onClick={onClose} className="w-full py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgb(0 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>
            New task → <span style={{ color: 'var(--color-brand)' }}>{status.replace('_', ' ')}</span>
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>Task title</label>
            <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Implement the feature…"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>User story</label>
            <select value={storyId} onChange={(e) => setStoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              {stories.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: '#07110d', color: '#eaf4ec' }}>{s.title}</option>)}
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgb(248 113 113 / 0.08)', color: 'var(--color-danger)' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
            <button onClick={() => title && createTask.mutate()}
              disabled={!title || createTask.isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
              {createTask.isPending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
