import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Card } from "../components/Card";
import { PostViewer } from "../components/PostViewer";
import { ProgressBar } from "../components/ProgressBar";
import { RichInput } from "../components/RichInput";
import { StepIndicator } from "../components/StepIndicator";
import { useAppState } from "../lib/app-state";
import type { DraftRecord, WriteStage } from "../lib/types";
import { createEmptyRichInput } from "../lib/types";
import { testIds } from "../tests/browser/testIds";

const stepLabels = ["Topic", "Research", "Outline", "Write", "Complete"];

function currentStepIndex(draft: DraftRecord): number {
  switch (draft.status) {
    case "topic":
      return 0;
    case "research":
      return 1;
    case "outline":
      return 2;
    case "write":
      return 3;
    case "complete":
      return 4;
    default:
      return 0;
  }
}

export function NewPostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    createOrLoadDraft,
    saveDraftRecord,
    runResearch,
    runOutline,
    runWritePipeline
  } = useAppState();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const draftId = params.get("draft");
  const prefill = params.get("prefill") ?? "";
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [writing, setWriting] = useState(false);
  const [writeStage, setWriteStage] = useState<WriteStage>("write");
  const [writePercent, setWritePercent] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextDraft = await createOrLoadDraft(draftId, prefill);
      if (!cancelled) {
        setDraft(nextDraft);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [draftId, prefill]);

  useEffect(() => {
    let cancelled = false;

    async function runPipeline() {
      if (!draft || draft.status !== "write" || draft.finalPost || writing) {
        return;
      }
      try {
        setWriting(true);
        const result = await runWritePipeline(draft, (stage, percent) => {
          if (!cancelled) {
            setWriteStage(stage);
            setWritePercent(percent);
          }
        });
        if (!cancelled) {
          setDraft(result.draft);
        }
      } catch (pipelineError) {
        if (!cancelled) {
          setError(
            pipelineError instanceof Error
              ? pipelineError.message
              : "Unable to finish the write pipeline."
          );
        }
      } finally {
        if (!cancelled) {
          setWriting(false);
        }
      }
    }

    void runPipeline();

    return () => {
      cancelled = true;
    };
  }, [draft, writing]);

  if (loading || !draft) {
    return (
      <main className="page" data-testid={testIds.newPostPage}>
        <ProgressBar label="Loading draft" value={48} />
      </main>
    );
  }

  async function handleResearch() {
    try {
      setError("");
      const saved = await saveDraftRecord({
        ...draft,
        status: "topic",
        promptSeed: draft.topic.text.trim()
      });
      const researched = await runResearch(saved);
      setDraft(researched);
    } catch (researchError) {
      setError(
        researchError instanceof Error ? researchError.message : "Unable to research the topic."
      );
    }
  }

  async function handleContinueToOutline() {
    try {
      setError("");
      const outlined = await runOutline({
        ...draft,
        status: "outline"
      });
      setDraft(outlined);
    } catch (outlineError) {
      setError(
        outlineError instanceof Error ? outlineError.message : "Unable to build the outline."
      );
    }
  }

  async function toggleHighlight(sourceId: string) {
    const next = await saveDraftRecord({
      ...draft,
      researchSources: draft.researchSources.map((source) =>
        source.id === sourceId ? { ...source, highlight: !source.highlight } : source
      )
    });
    setDraft(next);
  }

  async function removeSource(sourceId: string) {
    const next = await saveDraftRecord({
      ...draft,
      researchSources: draft.researchSources.filter((source) => source.id !== sourceId)
    });
    setDraft(next);
  }

  return (
    <main className="page" data-testid={testIds.newPostPage}>
      <div className="page__header">
        <div>
          <p className="eyebrow">New post</p>
          <h1>Build a newsletter draft</h1>
          <p className="lede">
            Research, outline, write, edit, and guardrail checks run in sequence.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
      </div>

      <StepIndicator
        currentStep={currentStepIndex(draft)}
        labels={stepLabels}
      />

      {error ? <p className="error-banner">{error}</p> : null}

      {draft.status === "topic" ? (
        <Card title="Topic" eyebrow="Step 1">
          <RichInput
            label="Topic"
            testId={testIds.topicTextarea}
            value={draft.topic || createEmptyRichInput()}
            onChange={(value) => setDraft({ ...draft, topic: value })}
            placeholder="Describe the topic, angle, or prompt."
          />
          <button
            className="button"
            data-testid={testIds.topicResearch}
            type="button"
            onClick={() => void handleResearch()}
          >
            Research
          </button>
        </Card>
      ) : null}

      {draft.status === "research" ? (
        <Card title="Research" eyebrow="Step 2">
          <div className="stack">
            {draft.researchSources.map((source) => (
              <div className="source-card" key={source.id}>
                <div className="button-row button-row--spread">
                  <a href={source.url} rel="noreferrer" target="_blank">
                    {source.title}
                  </a>
                  <div className="button-row">
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => void toggleHighlight(source.id)}
                    >
                      {source.highlight ? "Unhighlight" : "Highlight"}
                    </button>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => void removeSource(source.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p>{source.snippet}</p>
                <small>
                  {source.author} · {source.publicationDate}
                </small>
              </div>
            ))}
          </div>
          <div className="button-row">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setDraft({ ...draft, status: "topic" })}
            >
              Back
            </button>
            <button
              className="button"
              data-testid={testIds.researchContinue}
              type="button"
              onClick={() => void handleContinueToOutline()}
            >
              Build outline
            </button>
          </div>
        </Card>
      ) : null}

      {draft.status === "outline" ? (
        <Card title={draft.outline?.title ?? "Outline"} eyebrow="Step 3">
          <p className="muted">{draft.outline?.dek}</p>
          <div className="stack">
            {draft.outline?.sections.map((section) => (
              <div key={section.heading}>
                <h3>{section.heading}</h3>
                <ul className="plain-list">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="button-row">
            <button
              className="button button--secondary"
              data-testid={testIds.outlineBack}
              type="button"
              onClick={() => setDraft({ ...draft, status: "research" })}
            >
              Back
            </button>
            <button
              className="button"
              data-testid={testIds.outlineAccept}
              type="button"
              onClick={() => setDraft({ ...draft, status: "write" })}
            >
              Accept outline
            </button>
          </div>
        </Card>
      ) : null}

      {draft.status === "write" ? (
        <Card title="Write pipeline" eyebrow="Step 4">
          <ProgressBar
            label={`Running ${writeStage} cycle`}
            value={writePercent}
          />
          <div className="stack">
            {draft.writeCycles.map((cycle) => (
              <div key={cycle.stage}>
                <h3>{cycle.stage}</h3>
                <p className="muted">{cycle.notes}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {draft.status === "complete" && draft.finalPost ? (
        <div className="stack">
          <Card title="Complete" eyebrow="Step 5">
            <p className="muted">
              Markdown saved with attribution lineage intact.
            </p>
          </Card>
          <PostViewer post={draft.finalPost} sources={draft.researchSources} />
          <button
            className="button"
            data-testid={testIds.completeReturn}
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Return to dashboard
          </button>
        </div>
      ) : null}
    </main>
  );
}
