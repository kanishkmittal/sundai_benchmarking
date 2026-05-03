import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import bundledSession from "../demo/bundled-session.json";
import type {
  DraftRecord,
  PostRecord,
  SessionRecord,
  SettingsRecord
} from "./types";
import { createEmptySettings } from "./types";

interface NewsletterDb extends DBSchema {
  configuration: {
    key: string;
    value: SettingsRecord;
  };
  drafts: {
    key: string;
    value: DraftRecord;
  };
  posts: {
    key: string;
    value: PostRecord;
  };
  sessions: {
    key: string;
    value: SessionRecord;
  };
}

interface MemoryStore {
  configuration: Map<string, SettingsRecord>;
  drafts: Map<string, DraftRecord>;
  posts: Map<string, PostRecord>;
  sessions: Map<string, SessionRecord>;
}

const DB_NAME = "substack-creator-newsletter-engine";
const CONFIG_KEY = "workspace";
const memoryStore: MemoryStore = {
  configuration: new Map<string, SettingsRecord>(),
  drafts: new Map<string, DraftRecord>(),
  posts: new Map<string, PostRecord>(),
  sessions: new Map<string, SessionRecord>()
};

let dbPromise: Promise<IDBPDatabase<NewsletterDb>> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function getDb(): Promise<IDBPDatabase<NewsletterDb>> {
  if (!dbPromise) {
    dbPromise = openDB<NewsletterDb>(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("configuration")) {
          database.createObjectStore("configuration");
        }
        if (!database.objectStoreNames.contains("drafts")) {
          database.createObjectStore("drafts", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("posts")) {
          database.createObjectStore("posts", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("sessions")) {
          database.createObjectStore("sessions", { keyPath: "id" });
        }
      }
    });
  }
  return dbPromise;
}

export async function loadSettings(): Promise<SettingsRecord> {
  if (!hasIndexedDb()) {
    return memoryStore.configuration.get(CONFIG_KEY) ?? createEmptySettings();
  }

  const db = await getDb();
  return (await db.get("configuration", CONFIG_KEY)) ?? createEmptySettings();
}

export async function saveSettings(settings: SettingsRecord): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.configuration.set(CONFIG_KEY, settings);
    return;
  }
  const db = await getDb();
  await db.put("configuration", settings, CONFIG_KEY);
}

export async function saveDraft(draft: DraftRecord): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.drafts.set(draft.id, draft);
    return;
  }
  const db = await getDb();
  await db.put("drafts", draft);
}

export async function getDraft(id: string): Promise<DraftRecord | null> {
  if (!hasIndexedDb()) {
    return memoryStore.drafts.get(id) ?? null;
  }
  const db = await getDb();
  return (await db.get("drafts", id)) ?? null;
}

export async function listDrafts(): Promise<DraftRecord[]> {
  if (!hasIndexedDb()) {
    return [...memoryStore.drafts.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }
  const db = await getDb();
  return (await db.getAll("drafts")).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

export async function deleteDraft(id: string): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.drafts.delete(id);
    return;
  }
  const db = await getDb();
  await db.delete("drafts", id);
}

export async function savePost(post: PostRecord): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.posts.set(post.id, post);
    return;
  }
  const db = await getDb();
  await db.put("posts", post);
}

export async function getPost(id: string): Promise<PostRecord | null> {
  if (!hasIndexedDb()) {
    return memoryStore.posts.get(id) ?? null;
  }
  const db = await getDb();
  return (await db.get("posts", id)) ?? null;
}

export async function listPosts(): Promise<PostRecord[]> {
  if (!hasIndexedDb()) {
    return [...memoryStore.posts.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }
  const db = await getDb();
  return (await db.getAll("posts")).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export async function saveSession(session: SessionRecord): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.sessions.set(session.id, session);
    return;
  }
  const db = await getDb();
  await db.put("sessions", session);
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  if (!hasIndexedDb()) {
    return memoryStore.sessions.get(id) ?? null;
  }
  const db = await getDb();
  return (await db.get("sessions", id)) ?? null;
}

export async function listSessions(): Promise<SessionRecord[]> {
  if (!hasIndexedDb()) {
    return [...memoryStore.sessions.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }
  const db = await getDb();
  return (await db.getAll("sessions")).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export async function clearAllData(): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.configuration.clear();
    memoryStore.drafts.clear();
    memoryStore.posts.clear();
    memoryStore.sessions.clear();
    return;
  }
  const db = await getDb();
  await Promise.all([
    db.clear("configuration"),
    db.clear("drafts"),
    db.clear("posts"),
    db.clear("sessions")
  ]);
}

export async function ensureBundledSession(): Promise<void> {
  const bundled = bundledSession as SessionRecord;
  const existing = await getSession(bundled.id);
  if (!existing) {
    await saveSession(bundled);
  }
}

export async function snapshotDatabase(): Promise<{
  settings: SettingsRecord;
  drafts: DraftRecord[];
  posts: PostRecord[];
  sessions: SessionRecord[];
}> {
  const [settings, drafts, posts, sessions] = await Promise.all([
    loadSettings(),
    listDrafts(),
    listPosts(),
    listSessions()
  ]);

  return {
    settings,
    drafts,
    posts,
    sessions
  };
}
