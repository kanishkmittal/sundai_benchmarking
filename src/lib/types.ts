export type RuntimeMode =
  | "production"
  | "integration"
  | "smoke"
  | "manual"
  | "demo";

export type ModelAlias = "fast" | "pro" | "lite";

export type SetupDocumentKind = "company" | "voice" | "guardrails";

export type DraftStage =
  | "topic"
  | "research"
  | "outline"
  | "write"
  | "complete";

export type WriteStage = "write" | "edit" | "guardrails";

export interface AttachmentRecord {
  id: string;
  name: string;
  mimeType: string;
  content: string;
}

export interface RichInputValue {
  text: string;
  links: string[];
  attachments: AttachmentRecord[];
}

export interface ConfirmationRecord {
  input: RichInputValue;
  summary: string;
  confirmedAt: string;
}

export interface SettingsRecord {
  apiKey: string;
  company: ConfirmationRecord | null;
  voice: ConfirmationRecord | null;
  guardrails: ConfirmationRecord | null;
  updatedAt: string;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  author: string;
  publicationDate: string;
  snippet: string;
  highlight: boolean;
}

export interface TrendTopic {
  id: string;
  label: string;
  momentum: number;
  summary: string;
  sources: ResearchSource[];
}

export interface WritingPrompt {
  id: string;
  title: string;
  prompt: string;
  rationale: string;
}

export interface OutlineSection {
  heading: string;
  bullets: string[];
}

export interface OutlineRecord {
  title: string;
  dek: string;
  sections: OutlineSection[];
}

export interface CitationFootnote {
  number: number;
  sourceId: string;
  label: string;
  url: string;
}

export interface CitationAttribution {
  citation: number;
  sourceId: string;
  title: string;
  url: string;
  author: string;
  publicationDate: string;
}

export interface FinalPost {
  title: string;
  subtitle: string;
  markdown: string;
  footnotes: CitationFootnote[];
  attributions: CitationAttribution[];
  createdAt: string;
}

export interface WriteCycleResult {
  stage: WriteStage;
  content: string;
  notes: string;
  completedAt: string;
}

export interface DraftRecord {
  id: string;
  status: DraftStage;
  topic: RichInputValue;
  promptSeed: string;
  researchSources: ResearchSource[];
  outline: OutlineRecord | null;
  writeCycles: WriteCycleResult[];
  finalPost: FinalPost | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostRecord {
  id: string;
  title: string;
  markdown: string;
  subtitle: string;
  sources: ResearchSource[];
  footnotes: CitationFootnote[];
  attributions: CitationAttribution[];
  createdAt: string;
}

export interface SessionCacheEntry {
  key: string;
  schema: string;
  model: string;
  promptSummary: string;
  response: unknown;
  createdAt: string;
}

export interface ReplayPrefill {
  apiKey?: string;
  companyText?: string;
  voiceText?: string;
  guardrailsText?: string;
  topicText?: string;
  attachments?: AttachmentRecord[];
  outlineTitle?: string;
  previewMarkdown?: string;
}

export interface SessionReplayStep {
  id: string;
  route: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonTestId: string;
  prefill?: ReplayPrefill;
  attachmentDelayMs?: number;
}

export interface SessionRecord {
  id: string;
  name: string;
  mode: "production" | "demo";
  bundled: boolean;
  createdAt: string;
  settingsSnapshot: SettingsRecord | null;
  draftSnapshot: DraftRecord | null;
  postSnapshot: PostRecord | null;
  replaySteps: SessionReplayStep[];
  cacheEntries: SessionCacheEntry[];
}

export interface ConfirmDocumentResponse {
  summary: string;
}

export interface TrendingResearchResponse {
  trends: TrendTopic[];
}

export interface TrendingPromptResponse {
  prompts: WritingPrompt[];
}

export interface ResearchResponse {
  sources: ResearchSource[];
}

export interface OutlineResponse {
  outline: OutlineRecord;
}

export interface WriteResponse {
  title: string;
  subtitle: string;
  markdown: string;
  footnotes: CitationFootnote[];
  attributions: CitationAttribution[];
  notes: string;
}

export interface ManifestArtifact {
  path: string;
  type: string;
}

export interface ManifestScenario {
  id: string;
  status: "pass" | "fail" | "skip";
  summary: string;
  artifacts: ManifestArtifact[];
}

export interface EvidenceManifest {
  generatedAt: string;
  scenarios: ManifestScenario[];
}

export interface LlmAttempt {
  attempt: number;
  model: string;
  prompt: string;
  error?: string;
  rawText?: string;
  delayMs?: number;
}

export interface StructuredResult<T> {
  data: T;
  rawText: string;
  model: string;
  attempts: LlmAttempt[];
}

export function createEmptyRichInput(text = ""): RichInputValue {
  return {
    text,
    links: [],
    attachments: [],
  };
}

export function createEmptySettings(): SettingsRecord {
  return {
    apiKey: "",
    company: null,
    voice: null,
    guardrails: null,
    updatedAt: new Date(0).toISOString(),
  };
}

export function isSettingsComplete(settings: SettingsRecord): boolean {
  return Boolean(
    settings.apiKey.trim() &&
    settings.company &&
    settings.voice &&
    settings.guardrails,
  );
}

export function createDraft(seed = ""): DraftRecord {
  const timestamp = new Date().toISOString();
  return {
    id: `draft-${timestamp}`,
    status: "topic",
    topic: createEmptyRichInput(seed),
    promptSeed: seed,
    researchSources: [],
    outline: null,
    writeCycles: [],
    finalPost: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function toPlainText(value: RichInputValue): string {
  const parts = [value.text.trim()];
  if (value.links.length > 0) {
    parts.push(`Links:\n${value.links.join("\n")}`);
  }
  if (value.attachments.length > 0) {
    parts.push(
      `Attachments:\n${value.attachments
        .map((attachment) => `${attachment.name}: ${attachment.content}`)
        .join("\n\n")}`,
    );
  }
  return parts.filter(Boolean).join("\n\n");
}

export function cloneRichInput(value: RichInputValue): RichInputValue {
  return {
    text: value.text,
    links: [...value.links],
    attachments: value.attachments.map((attachment) => ({ ...attachment })),
  };
}
