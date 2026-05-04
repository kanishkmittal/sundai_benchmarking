import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProgressBar } from "./components/ProgressBar";
import { AppStateProvider, useAppState } from "./lib/app-state";
import { isSettingsComplete } from "./lib/types";
import { DashboardPage } from "./pages/Dashboard";
import { DemoModePage } from "./pages/DemoMode";
import { NewPostPage } from "./pages/NewPost";
import { PostViewPage } from "./pages/PostView";
import { SettingsPage } from "./pages/Settings";
import { TrendingTopicsPage } from "./pages/TrendingTopics";
import { testIds } from "./tests/browser/testIds";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { settings, mode } = useAppState();
  if (mode === "demo") {
    return children;
  }
  if (!isSettingsComplete(settings)) {
    return <Navigate replace to="/settings" />;
  }
  return children;
}

function AppRoutes() {
  const { ready, settings } = useAppState();

  if (!ready) {
    return (
      <main className="page" data-testid={testIds.appReady}>
        <ProgressBar label="Loading workspace" value={42} />
      </main>
    );
  }

  const defaultRoute = isSettingsComplete(settings)
    ? "/dashboard"
    : "/settings";

  return (
    <Routes>
      <Route path="/" element={<Navigate replace to={defaultRoute} />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trending"
        element={
          <ProtectedRoute>
            <TrendingTopicsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-post"
        element={
          <ProtectedRoute>
            <NewPostPage />
          </ProtectedRoute>
        }
      />
      <Route path="/demo" element={<DemoModePage />} />
      <Route
        path="/posts/:postId"
        element={
          <ProtectedRoute>
            <PostViewPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate replace to={defaultRoute} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppStateProvider>
  );
}
