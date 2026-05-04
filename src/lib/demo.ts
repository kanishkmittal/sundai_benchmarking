import bundledSession from "../demo/bundled-session.json";
import type { SessionRecord } from "./types";

export const BUNDLED_SESSION_ID = "session-pg-rituals";

export function getBundledSession(): SessionRecord {
  return bundledSession as SessionRecord;
}

export function buildFixtureMap(
  session: SessionRecord,
): Record<string, unknown> {
  return Object.fromEntries(
    session.cacheEntries.map((entry) => [entry.key, entry.response]),
  );
}

export function createCacheMissSession(): SessionRecord {
  const base = getBundledSession();
  return {
    ...base,
    id: "session-cache-miss",
    name: "Intentional cache gap",
    bundled: false,
    cacheEntries: base.cacheEntries.filter((entry) => entry.key !== "write"),
  };
}

export function listReplaySessions(sessions: SessionRecord[]): SessionRecord[] {
  return sessions.filter(
    (session) => session.mode === "demo" || session.bundled,
  );
}
