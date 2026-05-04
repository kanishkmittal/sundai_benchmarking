import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { useAppState } from "../lib/app-state";
import type { TrendTopic, WritingPrompt } from "../lib/types";
import { testIds } from "../tests/browser/testIds";

export function TrendingTopicsPage() {
  const navigate = useNavigate();
  const { runTrendingResearch } = useAppState();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await runTrendingResearch();
        if (!cancelled) {
          setTrends(result.trends);
          setPrompts(result.prompts);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load trending topics.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page" data-testid={testIds.trendingPage}>
      <div className="page__header">
        <div>
          <p className="eyebrow">Trending Topics</p>
          <h1>What the market is signaling</h1>
          <p className="lede">
            Parallel fast-model research streams feed a single set of three
            writing prompts.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Back
        </button>
      </div>

      {loading ? <ProgressBar label="Researching trends" value={66} /> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="dashboard-grid">
        <Card title="Trend visualization" eyebrow="Deterministic">
          <div className="trend-chart">
            {trends.map((trend) => (
              <div className="trend-chart__row" key={trend.id}>
                <span>{trend.label}</span>
                <div className="trend-chart__bar">
                  <div
                    className="trend-chart__fill"
                    style={{ width: `${Math.max(18, trend.momentum)}%` }}
                  />
                </div>
                <strong>{trend.momentum}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Research sources" eyebrow="Grounded">
          <div className="stack">
            {trends.flatMap((trend) =>
              trend.sources.map((source) => (
                <div className="source-card" key={source.id}>
                  <a href={source.url} rel="noreferrer" target="_blank">
                    {source.title}
                  </a>
                  <p>{source.snippet}</p>
                  <small>
                    {source.author} · {source.publicationDate}
                  </small>
                </div>
              )),
            )}
          </div>
        </Card>
      </section>

      <Card title="Three writing prompts" eyebrow="Gemini Pro synthesis">
        <div className="prompt-grid">
          {prompts.map((prompt) => (
            <article className="prompt-card" key={prompt.id}>
              <h3>{prompt.title}</h3>
              <p>{prompt.prompt}</p>
              <small>{prompt.rationale}</small>
              <button
                className="button"
                type="button"
                onClick={() =>
                  navigate(
                    `/new-post?prefill=${encodeURIComponent(prompt.prompt)}`,
                  )
                }
              >
                Use prompt
              </button>
            </article>
          ))}
        </div>
      </Card>
    </main>
  );
}
