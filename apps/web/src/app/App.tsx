import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth } from '../api/client';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectPage } from '../pages/ProjectPage';
import { KanbanPage } from '../pages/KanbanPage';
import { AppShell } from '../components/layout/AppShell';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => auth.me(),
    retry: false
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--color-muted)] text-sm">Loading SprintGrid…</span>
        </div>
      </div>
    );
  }

  if (!data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => auth.me(),
    retry: false
  });
  if (isLoading) return null;
  if (data) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <RegisterPage />
            </RequireGuest>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <RequireAuth>
              <AppShell>
                <ProjectPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId/kanban"
          element={
            <RequireAuth>
              <AppShell>
                <KanbanPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
