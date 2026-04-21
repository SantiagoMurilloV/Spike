import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { JudgeLayout } from './components/JudgeLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Keep Home eager: it's the landing page and already critical-path.
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

// Lazy-load everything else so the initial bundle stays lean.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const MatchDetail = lazy(() =>
  import('./pages/MatchDetail').then((m) => ({ default: m.MatchDetail })),
);
const TournamentDetail = lazy(() =>
  import('./pages/TournamentDetail').then((m) => ({ default: m.TournamentDetail })),
);
const TeamDetail = lazy(() =>
  import('./pages/TeamDetail').then((m) => ({ default: m.TeamDetail })),
);

const AdminDashboard = lazy(() =>
  import('./pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminTournaments = lazy(() =>
  import('./pages/admin/AdminTournaments').then((m) => ({ default: m.AdminTournaments })),
);
const AdminMatches = lazy(() =>
  import('./pages/admin/AdminMatches').then((m) => ({ default: m.AdminMatches })),
);
const AdminTeams = lazy(() =>
  import('./pages/admin/AdminTeams').then((m) => ({ default: m.AdminTeams })),
);
const AdminJudges = lazy(() =>
  import('./pages/admin/AdminJudges').then((m) => ({ default: m.AdminJudges })),
);
const AdminSettings = lazy(() =>
  import('./pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })),
);
const AdminTournamentDetail = lazy(() =>
  import('./pages/admin/AdminTournamentDetail').then((m) => ({
    default: m.AdminTournamentDetail,
  })),
);

const JudgeDashboard = lazy(() =>
  import('./pages/judge/JudgeDashboard').then((m) => ({ default: m.JudgeDashboard })),
);

// RefereeScore is the live-scoring console. ONLY judges can open it — admins
// use the match-edit form for corrections. Keeping the /admin/referee path
// as a no-op redirect for any legacy bookmark so a stale link doesn't 404.
const RefereeScore = lazy(() =>
  import('./pages/admin/RefereeScore').then((m) => ({ default: m.RefereeScore })),
);

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className="min-h-[50vh] flex items-center justify-center"
    >
      <Loader2 className="w-8 h-8 animate-spin text-spk-red" aria-hidden="true" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'login', element: withSuspense(<Login />) },
      { path: 'match/:id', element: withSuspense(<MatchDetail />) },
      { path: 'tournament/:id', element: withSuspense(<TournamentDetail />) },
      { path: 'team/:id', element: withSuspense(<TeamDetail />) },
      { path: '*', Component: NotFound },
    ],
  },
  {
    // Judge-only live scoring console. Admins lost access entirely; the old
    // /admin/referee path is kept as a route so bookmarks don't 404, but
    // ProtectedRoute will bounce admin users back to /admin.
    path: '/admin/referee/:matchId',
    element: (
      <ProtectedRoute allowedRoles={['judge']}>
        {withSuspense(<RefereeScore />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/judge/match/:matchId',
    element: (
      <ProtectedRoute allowedRoles={['judge']}>
        {withSuspense(<RefereeScore />)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withSuspense(<AdminDashboard />) },
      { path: 'tournaments', element: withSuspense(<AdminTournaments />) },
      { path: 'tournaments/:id', element: withSuspense(<AdminTournamentDetail />) },
      { path: 'matches', element: withSuspense(<AdminMatches />) },
      { path: 'teams', element: withSuspense(<AdminTeams />) },
      { path: 'judges', element: withSuspense(<AdminJudges />) },
      { path: 'settings', element: withSuspense(<AdminSettings />) },
    ],
  },
  {
    path: '/judge',
    element: (
      <ProtectedRoute allowedRoles={['judge']}>
        <JudgeLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: withSuspense(<JudgeDashboard />) }],
  },
]);
