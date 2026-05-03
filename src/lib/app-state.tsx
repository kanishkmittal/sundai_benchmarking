import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import {
  clearAllData,
  deleteDraft,
  ensureBundledSession,
  getDraft,
  saveDraft,
  savePost,
  saveSession,
  saveSettings,
  snapshotDatabase
} from "./db";
import {
  buildFixtureMap,
  createCacheMissSession,
  getBundledSession,
  listReplaySessions
} from "./demo";
import {
  confirmDocumentSchema,
  outlineSchema,
  researchSchema,
  trendingPromptSchema,
  trendingResearchSchema,
  writeSchema
} from "./llm-schemas";
import { createFixtureTransport, StructuredLlmClient } from "./llm";
import { resolveRuntimeMode } from "./runtime";
import type {
  ConfirmationRecord,
  DraftRecord,
  FinalPost,
  OutlineRecord,
  PostRecord,
  ResearchSource,
  RichInputValue,
  SessionCacheEntry,
  SessionRecord,
  SettingsRecord,
  SetupDocumentKind,
  TrendTopic,
  TrendingPromptResponse,
  WritingPrompt,
  WriteCycleResult,
  WriteStage
} from "./types";
import {
  createDraft,
  createEmptySettings,
  isSettingsComplete,
  toPlainText
} from "./types";

interface AppStateValue {
  ready: boolean;
  mode: ReturnType<typeof resolveRuntimeMode>;
  settings: SettingsRecord;
  drafts: DraftRecord[];
  posts: PostRecord[];
  sessions: SessionRecord[];
  replaySessions: SessionRecord[];
  createOrLoadDraft: (id?: string | null, seed?: string) => Promise<DraftRecord>;
  saveApiKey: (apiKey: string) => Promise<void>;
  generateConfirmation: (
    kind: SetupDocumentKind,
    input: RichInputValue
  ) => Promise<string>;
  saveConfirmedDocument: (
    kind: SetupDocumentKind,
    input: RichInputValue,
    summary: string
  ) => Promise<void>;
  saveDraftRecord: (draft: DraftRecord) => Promise<DraftRecord>;
  runTrendingResearch: () => Promise<{
    trends: TrendTopic[];
    prompts: WritingPrompt[];
  }>;
  runResearch: (draft: DraftRecord) => Promise<DraftRecord>;
  runOutline: (draft: DraftRecord) => Promise<DraftRecord>;
  runWritePipeline: (
    draft: DraftRecord,
    onStage: (stage: WriteStage, percent: number) => void
  ) => Promise<{ draft: DraftRecord; post: PostRecord }>;
  getSessionById: (id: string) => SessionRecord | null;
  resetAll: () => Promise<void>;
  seedCompletedSetup: () => Promise<void>;
  seedDraft: () => Promise<void>;
  seedLibrary: () => Promise<void>;
  seedCacheMissSession: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function updateSettingsRecord(
  settings: SettingsRecord,
  kind: SetupDocumentKind,
  record: ConfirmationRecord
): SettingsRecord {
  return {
    ...settings,
    [kind]: record,
    updatedAt: new Date().toISOString()
  };
}

function buildClient(mode: ReturnType<typeof resolveRuntimeMode>, apiKey: string) {
  if (mode === "integration" || mode === "demo") {
    return new StructuredLlmClient({
      apiKey,
      mode,
      transport: createFixtureTransport(buildFixtureMap(getBundledSession()))
    });
  }

  return new StructuredLlmClient({
    apiKey,
    mode
  });
}

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const filtered = items.filter((item) => item.id !== next.id);
  return [next, ...filtered];
}

function buildConfirmationPrompt(
  kind: SetupDocumentKind,
  input: RichInputValue,
  settings: SettingsRecord
): string {
  return [
    `You are validating the ${kind} document for a Substack writing assistant.`,
    "Be crisp and practical.",
    settings.company ? `Company context:\n${toPlainText(settings.company.input)}` : "",
    settings.voice ? `Voice context:\n${toPlainText(settings.voice.input)}` : "",
    `Candidate ${kind} document:\n${toPlainText(input)}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildSessionRecord(
  name: string,
  cacheEntry: SessionCacheEntry,
  settings: SettingsRecord,
  draft: DraftRecord | null,
  post: PostRecord | null
): SessionRecord {
  return {
    id: `session-${cacheEntry.key}-${Date.now()}`,
    name,
    mode: "production",
    bundled: false,
    createdAt: new Date().toISOString(),
    settingsSnapshot: settings,
    draftSnapshot: draft,
    postSnapshot: post,
    replaySteps: [],
    cacheEntries: [cacheEntry]
  };
}

function mapFinalPostToPostRecord(
  draft: DraftRecord,
  finalPost: FinalPost
): PostRecord {
  return {
    id: `post-${draft.id}`,
    title: finalPost.title,
    subtitle: finalPost.subtitle,
    markdown: finalPost.markdown,
    sources: draft.researchSources,
    footnotes: finalPost.footnotes,
    attributions: finalPost.attributions,
    createdAt: finalPost.createdAt
  };
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<SettingsRecord>(createEmptySettings());
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const mode = resolveRuntimeMode();

  async function refresh() {
    await ensureBundledSession();
    const snapshot = await snapshotDatabase();
    setSettings(snapshot.settings);
    setDrafts(snapshot.drafts);
    setPosts(snapshot.posts);
    setSessions(snapshot.sessions);
    setReady(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") {
      return;
    }

    window.__substackTestApi = {
      reset: async () => {
        await clearAllData();
        await ensureBundledSession();
        await refresh();
      },
      seedCompletedSetup: async () => {
        const bundled = getBundledSession();
        if (bundled.settingsSnapshot) {
          await saveSettings(bundled.settingsSnapshot);
        }
        await refresh();
      },
      seedDraft: async () => {
        const bundled = getBundledSession();
        if (bundled.settingsSnapshot) {
          await saveSettings(bundled.settingsSnapshot);
        }
        if (bundled.draftSnapshot) {
          await saveDraft({
            ...bundled.draftSnapshot,
            finalPost: null,
            writeCycles: [],
            status: "research",
            updatedAt: new Date().toISOString()
          });
        }
        await refresh();
      },
      seedLibrary: async () => {
        const bundled = getBundledSession();
        if (bundled.settingsSnapshot) {
          await saveSettings(bundled.settingsSnapshot);
        }
        if (bundled.draftSnapshot) {
          await saveDraft({
            ...bundled.draftSnapshot,
            id: "draft-library-seed",
            finalPost: null,
            writeCycles: [],
            status: "research",
            updatedAt: new Date().toISOString()
          });
        }
        if (bundled.postSnapshot) {
          await savePost(bundled.postSnapshot);
        }
        await refresh();
      },
      seedCacheMissSession: async () => {
        await saveSession(createCacheMissSession());
        await refresh();
      },
      getSnapshot: async () => snapshotDatabase()
    };

    return () => {
      delete window.__substackTestApi;
    };
  }, [ready, settings, drafts, posts, sessions]);

  async function persistSession(
    name: string,
    cacheEntry: SessionCacheEntry,
    draft: DraftRecord | null,
    post: PostRecord | null
  ) {
    const session = buildSessionRecord(name, cacheEntry, settings, draft, post);
    await saveSession(session);
    setSessions((current) => upsertById(current, session));
  }

  async function saveApiKey(apiKey: string) {
    const next = {
      ...settings,
      apiKey,
      updatedAt: new Date().toISOString()
    };
    await saveSettings(next);
    setSettings(next);
  }

  async function generateConfirmation(
    kind: SetupDocumentKind,
    input: RichInputValue
  ): Promise<string> {
    const client = buildClient(mode, settings.apiKey);
    const result = await client.generate({
      cacheKey: `confirm-${kind}`,
      model: "pro",
      schema: confirmDocumentSchema,
      prompt: buildConfirmationPrompt(kind, input, settings)
    });
    await persistSession(
      `Confirm ${kind}`,
      {
        key: `confirm-${kind}`,
        schema: confirmDocumentSchema.name,
        model: result.model,
        promptSummary: `${kind} confirmation`,
        response: result.data,
        createdAt: new Date().toISOString()
      },
      null,
      null
    );
    return result.data.summary;
  }

  async function saveConfirmedDocument(
    kind: SetupDocumentKind,
    input: RichInputValue,
    summary: string
  ) {
    const record: ConfirmationRecord = {
      input,
      summary,
      confirmedAt: new Date().toISOString()
    };
    const next = updateSettingsRecord(settings, kind, record);
    await saveSettings(next);
    setSettings(next);
  }

  async function createOrLoadDraft(
    id?: string | null,
    seed = ""
  ): Promise<DraftRecord> {
    if (id) {
      const existing = drafts.find((entry) => entry.id === id) ?? (await getDraft(id));
      if (existing) {
        return existing;
      }
    }
    const freshDraft = createDraft(seed);
    await saveDraft(freshDraft);
    setDrafts((current) => upsertById(current, freshDraft));
    return freshDraft;
  }

  async function saveDraftRecord(draft: DraftRecord): Promise<DraftRecord> {
    const next = {
      ...draft,
      updatedAt: new Date().toISOString()
    };
    await saveDraft(next);
    setDrafts((current) => upsertById(current, next));
    return next;
  }

  async function runTrendingResearch() {
    const client = buildClient(mode, settings.apiKey);
    const topics = [
      { id: "trending-routines", title: "Rituals and routines" },
      { id: "trending-value", title: "Value without downgrade" },
      { id: "trending-care", title: "Care systems" }
    ];

    const results = await Promise.all(
      topics.map((topic) =>
        client.generate({
          cacheKey: topic.id,
          model: "fast",
          schema: trendingResearchSchema,
          prompt: [
            `Research the theme "${topic.title}" for a company newsletter.`,
            "Return one trend cluster with grounded source-style metadata."
          ].join("\n")
        })
      )
    );

    const trends = results.flatMap((result) => result.data.trends);
    const prompts = await client.generate({
      cacheKey: "trending-synthesis",
      model: "pro",
      schema: trendingPromptSchema,
      prompt: [
        "Synthesize these trends into exactly three writing prompts.",
        JSON.stringify(trends, null, 2)
      ].join("\n\n")
    });

    await persistSession(
      "Trending topics",
      {
        key: "trending-synthesis",
        schema: trendingPromptSchema.name,
        model: prompts.model,
        promptSummary: "Trending prompt synthesis",
        response: {
          trends,
          prompts: (prompts.data as TrendingPromptResponse).prompts
        },
        createdAt: new Date().toISOString()
      },
      null,
      null
    );

    return {
      trends,
      prompts: prompts.data.prompts
    };
  }

  async function runResearch(draft: DraftRecord): Promise<DraftRecord> {
    const client = buildClient(mode, settings.apiKey);
    const result = await client.generate({
      cacheKey: "research",
      model: "fast",
      schema: researchSchema,
      prompt: [
        "Use fast grounded research for this newsletter topic.",
        `Topic:\n${toPlainText(draft.topic)}`,
        settings.company ? `Company:\n${toPlainText(settings.company.input)}` : ""
      ]
        .filter(Boolean)
        .join("\n\n")
    });

    const next = await saveDraftRecord({
      ...draft,
      status: "research",
      researchSources: result.data.sources
    });

    await persistSession(
      "Research draft",
      {
        key: "research",
        schema: researchSchema.name,
        model: result.model,
        promptSummary: "Draft research",
        response: result.data,
        createdAt: new Date().toISOString()
      },
      next,
      null
    );

    return next;
  }

  async function runOutline(draft: DraftRecord): Promise<DraftRecord> {
    const client = buildClient(mode, settings.apiKey);
    const result = await client.generate({
      cacheKey: "outline",
      model: "pro",
      schema: outlineSchema,
      prompt: [
        "Create a one-shot outline for the newsletter.",
        `Topic:\n${toPlainText(draft.topic)}`,
        `Sources:\n${JSON.stringify(draft.researchSources, null, 2)}`
      ].join("\n\n")
    });

    const next = await saveDraftRecord({
      ...draft,
      status: "outline",
      outline: result.data.outline
    });

    await persistSession(
      "Outline draft",
      {
        key: "outline",
        schema: outlineSchema.name,
        model: result.model,
        promptSummary: "Draft outline",
        response: result.data,
        createdAt: new Date().toISOString()
      },
      next,
      null
    );

    return next;
  }

  async function runWriteStage(
    draft: DraftRecord,
    stage: WriteStage,
    content: string
  ) {
    const client = buildClient(mode, settings.apiKey);
    const promptParts = [
      `Run the ${stage} stage for the newsletter.`,
      `Topic:\n${toPlainText(draft.topic)}`,
      draft.outline ? `Outline:\n${JSON.stringify(draft.outline, null, 2)}` : "",
      `Sources:\n${JSON.stringify(draft.researchSources, null, 2)}`,
      settings.voice ? `Voice:\n${toPlainText(settings.voice.input)}` : "",
      settings.guardrails ? `Guardrails:\n${toPlainText(settings.guardrails.input)}` : "",
      content ? `Current draft:\n${content}` : ""
    ].filter(Boolean);

    return client.generate({
      cacheKey: stage,
      model: "pro",
      schema: writeSchema,
      prompt: promptParts.join("\n\n")
    });
  }

  async function runWritePipeline(
    draft: DraftRecord,
    onStage: (stage: WriteStage, percent: number) => void
  ): Promise<{ draft: DraftRecord; post: PostRecord }> {
    const cycles: WriteCycleResult[] = [];
    let currentContent = "";
    const stages: WriteStage[] = ["write", "edit", "guardrails"];
    let finalPost: FinalPost | null = null;

    for (const [index, stage] of stages.entries()) {
      onStage(stage, (index / stages.length) * 100);
      const result = await runWriteStage(draft, stage, currentContent);
      currentContent = result.data.markdown;
      finalPost = {
        title: result.data.title,
        subtitle: result.data.subtitle,
        markdown: result.data.markdown,
        footnotes: result.data.footnotes,
        attributions: result.data.attributions,
        createdAt: new Date().toISOString()
      };
      cycles.push({
        stage,
        content: result.data.markdown,
        notes: result.data.notes,
        completedAt: new Date().toISOString()
      });
    }

    if (!finalPost) {
      throw new Error("Write pipeline completed without a final post.");
    }

    onStage("guardrails", 100);
    const completedDraft = await saveDraftRecord({
      ...draft,
      status: "complete",
      writeCycles: cycles,
      finalPost
    });
    const post = mapFinalPostToPostRecord(completedDraft, finalPost);
    await savePost(post);
    await deleteDraft(completedDraft.id);
    setDrafts((current) => current.filter((entry) => entry.id !== completedDraft.id));
    setPosts((current) => upsertById(current, post));
    await persistSession(
      "Write pipeline",
      {
        key: "guardrails",
        schema: writeSchema.name,
        model: "gemini-3.1-pro-preview",
        promptSummary: "Final write pipeline",
        response: finalPost,
        createdAt: new Date().toISOString()
      },
      completedDraft,
      post
    );

    return {
      draft: completedDraft,
      post
    };
  }

  async function resetAll() {
    await clearAllData();
    await ensureBundledSession();
    await refresh();
  }

  async function seedCompletedSetup() {
    const bundled = getBundledSession();
    if (bundled.settingsSnapshot) {
      await saveSettings(bundled.settingsSnapshot);
    }
    await refresh();
  }

  async function seedDraft() {
    const bundled = getBundledSession();
    if (bundled.settingsSnapshot) {
      await saveSettings(bundled.settingsSnapshot);
    }
    if (bundled.draftSnapshot) {
      await saveDraft({
        ...bundled.draftSnapshot,
        finalPost: null,
        writeCycles: [],
        status: "research",
        updatedAt: new Date().toISOString()
      });
    }
    await refresh();
  }

  async function seedCacheMissSession() {
    await saveSession(createCacheMissSession());
    await refresh();
  }

  async function seedLibrary() {
    const bundled = getBundledSession();
    if (bundled.settingsSnapshot) {
      await saveSettings(bundled.settingsSnapshot);
    }
    if (bundled.draftSnapshot) {
      await saveDraft({
        ...bundled.draftSnapshot,
        id: "draft-library-seed",
        finalPost: null,
        writeCycles: [],
        status: "research",
        updatedAt: new Date().toISOString()
      });
    }
    if (bundled.postSnapshot) {
      await savePost(bundled.postSnapshot);
    }
    await refresh();
  }

  function getSessionById(id: string): SessionRecord | null {
    return sessions.find((entry) => entry.id === id) ?? null;
  }

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      mode,
      settings,
      drafts,
      posts,
      sessions,
      replaySessions: listReplaySessions(sessions),
      createOrLoadDraft,
      saveApiKey,
      generateConfirmation,
      saveConfirmedDocument,
      saveDraftRecord,
      runTrendingResearch,
      runResearch,
      runOutline,
      runWritePipeline,
      getSessionById,
      resetAll,
      seedCompletedSetup,
      seedDraft,
      seedLibrary,
      seedCacheMissSession,
      refresh
    }),
    [ready, mode, settings, drafts, posts, sessions]
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}

export function useSetupStatus() {
  const { settings } = useAppState();

  return {
    apiKey: Boolean(settings.apiKey.trim()),
    company: Boolean(settings.company),
    voice: Boolean(settings.voice),
    guardrails: Boolean(settings.guardrails),
    complete: isSettingsComplete(settings)
  };
}
