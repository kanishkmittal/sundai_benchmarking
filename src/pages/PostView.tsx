import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card } from "../components/Card";
import { PostViewer } from "../components/PostViewer";
import { useAppState } from "../lib/app-state";
import { testIds } from "../tests/browser/testIds";

export function PostViewPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts } = useAppState();

  const post = useMemo(
    () => posts.find((entry) => entry.id === postId) ?? null,
    [posts, postId],
  );

  return (
    <main className="page" data-testid={testIds.postPage}>
      <div className="page__header">
        <div>
          <p className="eyebrow">Post history</p>
          <h1>Saved post</h1>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Back
        </button>
      </div>

      {post ? (
        <PostViewer post={post} sources={post.sources} />
      ) : (
        <Card title="Post not found">
          <p className="muted">The requested post could not be located.</p>
        </Card>
      )}
    </main>
  );
}
