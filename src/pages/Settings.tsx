import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { RichInput } from "../components/RichInput";
import { testIds } from "../tests/browser/testIds";
import { useAppState, useSetupStatus } from "../lib/app-state";
import type { RichInputValue, SetupDocumentKind } from "../lib/types";
import { cloneRichInput, createEmptyRichInput } from "../lib/types";

type ConfirmationState = Record<
  SetupDocumentKind,
  { input: RichInputValue; summary: string } | null
>;

interface SetupDocCardProps {
  kind: SetupDocumentKind;
  title: string;
  description: string;
  value: RichInputValue;
  onChange: (value: RichInputValue) => void;
  testId: string;
  complete: boolean;
  savedSummary?: string;
  pending: boolean;
  confirmation: { input: RichInputValue; summary: string } | null;
  onSubmit: () => Promise<void>;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}

function SetupDocCard({
  kind,
  title,
  description,
  value,
  onChange,
  testId,
  complete,
  savedSummary,
  pending,
  confirmation,
  onSubmit,
  onConfirm,
  onBack,
}: SetupDocCardProps) {
  const submitId =
    kind === "company"
      ? testIds.companySubmit
      : kind === "voice"
        ? testIds.voiceSubmit
        : testIds.guardrailsSubmit;
  const confirmId =
    kind === "company"
      ? testIds.companyConfirm
      : kind === "voice"
        ? testIds.voiceConfirm
        : testIds.guardrailsConfirm;
  const backId =
    kind === "company"
      ? testIds.companyBack
      : kind === "voice"
        ? testIds.voiceBack
        : testIds.guardrailsBack;

  return (
    <Card
      title={title}
      eyebrow={kind}
      actions={
        <span className={`status-pill ${complete ? "is-done" : "is-empty"}`} />
      }
    >
      {!confirmation ? (
        <>
          <p className="muted">{description}</p>
          {complete && savedSummary ? (
            <p className="success-banner">{savedSummary}</p>
          ) : null}
          <RichInput
            label={`${title} input`}
            testId={testId}
            value={value}
            onChange={onChange}
            placeholder={`Write the ${kind} guidance here.`}
          />
          {pending ? (
            <ProgressBar label={`Confirming ${kind}`} value={72} />
          ) : null}
          <button
            className="button"
            data-testid={submitId}
            type="button"
            onClick={() => void onSubmit()}
          >
            Confirm with Gemini Pro
          </button>
        </>
      ) : (
        <div className="stack">
          <p className="muted">{confirmation.summary}</p>
          <div className="button-row">
            <button
              className="button button--secondary"
              data-testid={backId}
              type="button"
              onClick={onBack}
            >
              Back
            </button>
            <button
              className="button"
              data-testid={confirmId}
              type="button"
              onClick={() => void onConfirm()}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const {
    settings,
    mode,
    saveApiKey,
    generateConfirmation,
    saveConfirmedDocument,
    resetAll,
  } = useAppState();
  const setupStatus = useSetupStatus();
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.apiKey);
  const [companyDraft, setCompanyDraft] = useState(
    settings.company
      ? cloneRichInput(settings.company.input)
      : createEmptyRichInput(),
  );
  const [voiceDraft, setVoiceDraft] = useState(
    settings.voice
      ? cloneRichInput(settings.voice.input)
      : createEmptyRichInput(),
  );
  const [guardrailsDraft, setGuardrailsDraft] = useState(
    settings.guardrails
      ? cloneRichInput(settings.guardrails.input)
      : createEmptyRichInput(),
  );
  const [pendingKind, setPendingKind] = useState<SetupDocumentKind | null>(
    null,
  );
  const [confirmations, setConfirmations] = useState<ConfirmationState>({
    company: null,
    voice: null,
    guardrails: null,
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setApiKeyDraft(settings.apiKey);
  }, [settings.apiKey]);

  useEffect(() => {
    setCompanyDraft(
      settings.company
        ? cloneRichInput(settings.company.input)
        : createEmptyRichInput(),
    );
  }, [settings.company]);

  useEffect(() => {
    setVoiceDraft(
      settings.voice
        ? cloneRichInput(settings.voice.input)
        : createEmptyRichInput(),
    );
  }, [settings.voice]);

  useEffect(() => {
    setGuardrailsDraft(
      settings.guardrails
        ? cloneRichInput(settings.guardrails.input)
        : createEmptyRichInput(),
    );
  }, [settings.guardrails]);

  async function handleSubmit(kind: SetupDocumentKind) {
    try {
      setError("");
      setPendingKind(kind);
      const input =
        kind === "company"
          ? companyDraft
          : kind === "voice"
            ? voiceDraft
            : guardrailsDraft;
      const summary = await generateConfirmation(kind, input);
      setConfirmations((current) => ({
        ...current,
        [kind]: {
          input,
          summary,
        },
      }));
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to confirm the setup document.",
      );
    } finally {
      setPendingKind(null);
    }
  }

  async function handleConfirm(kind: SetupDocumentKind) {
    const confirmation = confirmations[kind];
    if (!confirmation) {
      return;
    }
    await saveConfirmedDocument(kind, confirmation.input, confirmation.summary);
    setConfirmations((current) => ({
      ...current,
      [kind]: null,
    }));
  }

  return (
    <main className="page" data-testid={testIds.settingsPage}>
      <div className="page__header">
        <div>
          <p className="eyebrow">Substack Creator</p>
          <h1>Settings</h1>
          <p className="lede">
            Complete API key, company, voice, and guardrails in any order. Mode:{" "}
            <strong>{mode}</strong>
          </p>
        </div>
        <div className="button-row">
          <button
            className="button"
            disabled={!setupStatus.complete}
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Open dashboard
          </button>
        </div>
      </div>

      <section className="settings-grid">
        <Card
          title="API key"
          eyebrow="Required"
          actions={
            <span
              className={`status-pill ${setupStatus.apiKey ? "is-done" : "is-empty"}`}
            />
          }
        >
          <label className="rich-input__label" htmlFor="api-key">
            Gemini API key
          </label>
          <input
            id="api-key"
            className="text-input"
            data-testid={testIds.apiKeyInput}
            type="password"
            value={apiKeyDraft}
            onChange={(event) => setApiKeyDraft(event.target.value)}
            placeholder="Paste your Gemini API key"
          />
          <button
            className="button"
            data-testid={testIds.apiKeySave}
            type="button"
            onClick={() => void saveApiKey(apiKeyDraft)}
          >
            Save API key
          </button>
        </Card>

        <SetupDocCard
          kind="company"
          title="Company"
          description="Add rich background on the company, category context, and what matters."
          value={companyDraft}
          onChange={setCompanyDraft}
          testId={testIds.companyTextarea}
          complete={setupStatus.company}
          savedSummary={settings.company?.summary}
          pending={pendingKind === "company"}
          confirmation={confirmations.company}
          onSubmit={() => handleSubmit("company")}
          onConfirm={() => handleConfirm("company")}
          onBack={() =>
            setConfirmations((current) => ({
              ...current,
              company: null,
            }))
          }
        />

        <SetupDocCard
          kind="voice"
          title="Voice"
          description="Describe the tone, pacing, and what a finished article should sound like."
          value={voiceDraft}
          onChange={setVoiceDraft}
          testId={testIds.voiceTextarea}
          complete={setupStatus.voice}
          savedSummary={settings.voice?.summary}
          pending={pendingKind === "voice"}
          confirmation={confirmations.voice}
          onSubmit={() => handleSubmit("voice")}
          onConfirm={() => handleConfirm("voice")}
          onBack={() =>
            setConfirmations((current) => ({
              ...current,
              voice: null,
            }))
          }
        />

        <SetupDocCard
          kind="guardrails"
          title="Guardrails"
          description="Specify compliance, sourcing, and claim boundaries the final draft must respect."
          value={guardrailsDraft}
          onChange={setGuardrailsDraft}
          testId={testIds.guardrailsTextarea}
          complete={setupStatus.guardrails}
          savedSummary={settings.guardrails?.summary}
          pending={pendingKind === "guardrails"}
          confirmation={confirmations.guardrails}
          onSubmit={() => handleSubmit("guardrails")}
          onConfirm={() => handleConfirm("guardrails")}
          onBack={() =>
            setConfirmations((current) => ({
              ...current,
              guardrails: null,
            }))
          }
        />
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="settings-footer">
        <button
          className="button button--ghost"
          data-testid={testIds.resetEverything}
          type="button"
          onClick={() => setShowResetConfirm(true)}
        >
          Reset everything
        </button>
      </div>

      {showResetConfirm ? (
        <div className="modal">
          <Card title="Reset everything">
            <p className="muted">
              This clears configuration, drafts, posts, and recorded sessions.
            </p>
            <div className="button-row">
              <button
                className="button button--secondary"
                data-testid={testIds.resetCancel}
                type="button"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="button"
                data-testid={testIds.resetConfirm}
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  void resetAll();
                }}
              >
                Confirm reset
              </button>
            </div>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
