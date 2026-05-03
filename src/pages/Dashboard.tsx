import { useNavigate } from "react-router-dom";

import { Card } from "../components/Card";
import { testIds } from "../tests/browser/testIds";
import { useAppState } from "../lib/app-state";

export function DashboardPage() {
  const navigate = useNavigate();
  const { drafts, posts, sessions } = useAppState();

  return (
    <main className="page" data-testid={testIds.dashboardPage}>
      <div className="page__header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Dashboard</h1>
          <p className="lede">
            Start a new post, explore trends, resume drafts, or inspect saved work.
          </p>
        </div>
        <div className="button-row">
          <button
            className="button"
            data-testid={testIds.dashboardNewPost}
            type="button"
            onClick={() => navigate("/new-post")}
          >
            New post
          </button>
          <button
            className="button button--secondary"
            data-testid={testIds.dashboardTrending}
            type="button"
            onClick={() => navigate("/trending")}
          >
            Trending topics
          </button>
          <button
            className="button button--secondary"
            data-testid={testIds.dashboardDemo}
            type="button"
            onClick={() => navigate("/demo")}
          >
            Demo mode
          </button>
          <button
            className="button button--ghost"
            data-testid={testIds.dashboardSettings}
            type="button"
            onClick={() => navigate("/settings")}
          >
            Settings
          </button>
        </div>
      </div>

      <section className="dashboard-grid">
        <Card title="Drafts" eyebrow="Resume">
          {drafts.length === 0 ? <p className="muted">No drafts yet.</p> : null}
          <div className="stack">
            {drafts.map((draft) => (
              <button
                className="list-row"
                key={draft.id}
                type="button"
                onClick={() => navigate(`/new-post?draft=${encodeURIComponent(draft.id)}`)}
              >
                <span>
                  <strong>{draft.promptSeed || "Untitled draft"}</strong>
                  <small>{draft.status}</small>
                </span>
                <span>Resume</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Post history" eyebrow="Library">
          {posts.length === 0 ? <p className="muted">No saved posts yet.</p> : null}
          <div className="stack">
            {posts.map((post) => (
              <button
                className="list-row"
                key={post.id}
                type="button"
                onClick={() => navigate(`/posts/${encodeURIComponent(post.id)}`)}
              >
                <span>
                  <strong>{post.title}</strong>
                  <small>{new Date(post.createdAt).toLocaleDateString()}</small>
                </span>
                <span>View</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Recorded sessions" eyebrow="Replay">
          <p className="muted">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} stored locally.
          </p>
        </Card>
      </section>
    </main>
  );
}
