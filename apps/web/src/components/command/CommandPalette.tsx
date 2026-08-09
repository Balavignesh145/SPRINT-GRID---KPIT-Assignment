import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Search, Folder, Layers, CheckSquare, User, CornerDownLeft, Loader2 } from 'lucide-react';
import { search as searchApi } from '../../api/client';

interface SearchResults {
  projects: import('../../types').Project[];
  stories: import('../../types').UserStory[];
  tasks: import('../../types').Task[];
  users: import('../../types').User[];
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    projects: [],
    stories: [],
    tasks: [],
    users: []
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ projects: [], stories: [], tasks: [], users: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle API search query
  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], stories: [], tasks: [], users: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.find(query);
        if (res.data) {
          setResults(res.data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Flatten items to navigate using arrow keys
  const getFlatItems = () => {
    const items: { type: 'project' | 'story' | 'task' | 'user' | 'action'; id: string; title: string; subtitle?: string; action: () => void }[] = [];

    // Global navigation shortcuts
    if (!query) {
      items.push({
        type: 'action',
        id: 'nav-dashboard',
        title: 'Go to Dashboard',
        subtitle: 'Navigation',
        action: () => { navigate('/dashboard'); onClose(); }
      });

      if (projectId || location.pathname.includes('/projects/')) {
        const currentId = projectId || location.pathname.split('/projects/')[1]?.split('/')[0];
        if (currentId) {
          items.push({
            type: 'action',
            id: 'nav-kanban',
            title: 'Go to Kanban Board',
            subtitle: 'Navigation',
            action: () => { navigate(`/projects/${currentId}/kanban`); onClose(); }
          });
        }
      }
    }

    results.projects.forEach(p => {
      items.push({
        type: 'project',
        id: `p-${p.id}`,
        title: p.name,
        subtitle: `Project • ${p.key}`,
        action: () => { navigate(`/projects/${p.id}`); onClose(); }
      });
    });

    results.stories.forEach(s => {
      items.push({
        type: 'story',
        id: `s-${s.id}`,
        title: s.title,
        subtitle: `User Story • ${s.project?.name || 'Story'}`,
        action: () => { navigate(`/projects/${s.projectId}`); onClose(); }
      });
    });

    results.tasks.forEach(t => {
      items.push({
        type: 'task',
        id: `t-${t.id}`,
        title: t.title,
        subtitle: `Task • ${t.story?.project?.name || 'Task'}`,
        action: () => { if (t.story) navigate(`/projects/${t.story.projectId}`); onClose(); }
      });
    });

    results.users.forEach(u => {
      items.push({
        type: 'user',
        id: `u-${u.id}`,
        title: u.name,
        subtitle: u.email,
        action: () => { /* No action for user details */ }
      });
    });

    return items;
  };

  const flatItems = getFlatItems();

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (flatItems.length === 0 ? 0 : (prev + 1) % flatItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (flatItems.length === 0 ? 0 : (prev - 1 + flatItems.length) % flatItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatItems[selectedIndex];
        if (selected) {
          selected.action();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Main Panel */}
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col z-10"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Search size={16} style={{ color: 'var(--color-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, user stories, tasks, members..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text)' }}
          />
          {loading ? (
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono"
              style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {flatItems.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
              {query ? 'No results found.' : 'Type to search or select a shortcut...'}
            </div>
          ) : (
            flatItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = {
                project: Folder,
                story: Layers,
                task: CheckSquare,
                user: User,
                action: CornerDownLeft
              }[item.type];

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors group"
                  style={{
                    background: isSelected ? 'var(--color-surface-strong)' : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={14} style={{ color: isSelected ? 'var(--color-brand)' : 'var(--color-muted)' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && item.type !== 'user' && (
                    <span className="text-[10px] flex items-center gap-1 opacity-70" style={{ color: 'var(--color-brand)' }}>
                      Navigate <CornerDownLeft size={10} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard shortcut footer */}
        <div className="flex items-center justify-between px-4 py-2.5 text-[10px]"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-subtle)', color: 'var(--color-muted)' }}>
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>Enter to select</span>
          </div>
          <span>Ctrl + K to toggle</span>
        </div>
      </div>
    </div>
  );
}
