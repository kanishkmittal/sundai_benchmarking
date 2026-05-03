import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card } from "../components/Card";
import { useAppState } from "../lib/app-state";
import type { SessionRecord } from "../lib/types";
import { testIds } from "../tests/browser/testIds";

export function DemoModePage() {
  const navigate = useNavigate();
  const { replaySessions } = useAppState();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showAttachments, setShowAttachments] = useState(false);
  const [cacheMiss, setCacheMiss] = useState("");

  const session = useMemo<SessionRecord | null>(
    () => replaySessions.find((entry) => entry.id === activeSessionId) ?? null,
    [replaySessions, activeSessionId]
  );
  const step = session?.replaySteps[stepIndex] ?? null;

  useEffect(() => {
    if (!step) {
      return;
    }
    setShowAttachments(false);
    const timer = window.setTimeout(() => {
      setShowAttachments(true);
    }, step.attachmentDelayMs ?? 300);
    return () => window.clearTimeout(timer);
  }, [step?.id]);

  function resetReplay() {
    setActiveSessionId(null);
    setStepIndex(0);
    setCacheMiss("");
  }

  function advanceReplay() {
    if (!session || !step) {
      return;
    }
    if (step.id === "new-post-write") {
      const hasWriteEntry = session.cacheEntries.some((entry) => entry.key === "write");
      if (!hasWriteEntry) {
        setCacheMiss("This replay is missing cached output for the write step.");
        return;
      }
    }
    if (stepIndex >= session.replaySteps.length - 1) {
      resetReplay();
      navigate("/dashboard?mode=demo");
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <main className="page" data-testid={testIds.demoPage}>
      <div className="page__header">
        <div>
          <p className="eyebrow">Demo mode</p>
          <h1>Replay recorded sessions</h1>
          <p className="lede">
            Bundled demo sessions replay without live API calls and never fall back
            on cache misses.
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

      {!session ? (
        <Card title="Session picker" eyebrow="Recorded sessions">
          <div className="stack" data-testid={testIds.demoPicker}>
            {replaySessions.map((entry) => (
              <button
                className="list-row"
                key={entry.id}
                type="button"
                onClick={() => {
                  setActiveSessionId(entry.id);
                  setStepIndex(0);
                }}
              >
                <span>
                  <strong>{entry.name}</strong>
                  <small>{entry.bundled ? "Bundled" : "Saved locally"}</small>
                </span>
                <span>Replay</span>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="stack">
          <Card title={step?.title} eyebrow={session.name}>
            <p className="muted">{step?.description}</p>
            {step?.prefill?.topicText ? (
              <div className="demo-field">
                <span>Topic</span>
                <p className="demo-fade">{step.prefill.topicText}</p>
              </div>
            ) : null}
            {step?.prefill?.companyText ? (
              <div className="demo-field">
                <span>Company</span>
                <p className="demo-fade">{step.prefill.companyText}</p>
              </div>
            ) : null}
            {step?.prefill?.voiceText ? (
              <div className="demo-field">
                <span>Voice</span>
                <p className="demo-fade">{step.prefill.voiceText}</p>
              </div>
            ) : null}
            {step?.prefill?.guardrailsText ? (
              <div className="demo-field">
                <span>Guardrails</span>
                <p className="demo-fade">{step.prefill.guardrailsText}</p>
              </div>
            ) : null}
            {showAttachments && (step?.prefill?.attachments?.length ?? 0) > 0 ? (
              <div className="rich-input__chips">
                {step?.prefill?.attachments?.map((attachment) => (
                  <span className="chip" key={attachment.id}>
                    {attachment.name}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              className="button button--highlight"
              data-testid={testIds.demoNext}
              type="button"
              onClick={advanceReplay}
            >
              {step?.buttonLabel ?? "Next"}
            </button>
          </Card>
        </div>
      )}

      {cacheMiss ? (
        <div className="modal">
          <Card title="Replay cache miss">
            <p className="muted">{cacheMiss}</p>
            <button
              className="button"
              data-testid={testIds.demoDismissError}
              type="button"
              onClick={resetReplay}
            >
              Back to session picker
            </button>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
