import type { RuntimeMode } from "./types";

const ALLOWED_MODES: RuntimeMode[] = [
  "production",
  "integration",
  "smoke",
  "manual",
  "demo"
];

declare global {
  interface Window {
    __SUBSTACK_TEST_MODE__?: RuntimeMode;
    __substackTestApi?: {
      reset: () => Promise<void>;
      seedCompletedSetup: () => Promise<void>;
      seedDraft: () => Promise<void>;
      seedLibrary: () => Promise<void>;
      seedCacheMissSession: () => Promise<void>;
      getSnapshot: () => Promise<unknown>;
    };
  }
}

export function normalizeMode(value: string | null | undefined): RuntimeMode | null {
  if (!value) {
    return null;
  }
  return ALLOWED_MODES.includes(value as RuntimeMode) ? (value as RuntimeMode) : null;
}

export function resolveRuntimeMode(search?: string): RuntimeMode {
  if (typeof window !== "undefined" && window.__SUBSTACK_TEST_MODE__) {
    return window.__SUBSTACK_TEST_MODE__;
  }

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(search ?? window.location.search)
      : new URLSearchParams(search ?? "");
  const queryMode = normalizeMode(params.get("mode"));
  if (queryMode) {
    return queryMode;
  }

  const envMode =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env !== "undefined" &&
    typeof import.meta.env.VITE_APP_MODE === "string"
      ? normalizeMode(import.meta.env.VITE_APP_MODE)
      : null;

  return envMode ?? "production";
}

export function usesLiteModels(mode: RuntimeMode): boolean {
  return mode === "smoke" || mode === "integration";
}

export function usesFixtures(mode: RuntimeMode): boolean {
  return mode === "integration" || mode === "demo";
}

export function modeLabel(mode: RuntimeMode): string {
  switch (mode) {
    case "integration":
      return "Integration";
    case "smoke":
      return "Smoke";
    case "manual":
      return "Manual";
    case "demo":
      return "Demo";
    default:
      return "Production";
  }
}
