import { GoogleGenerativeAI } from "@google/generative-ai";

import type {
  LlmAttempt,
  ModelAlias,
  RuntimeMode,
  StructuredResult
} from "./types";
import { parseStructuredJson, type SchemaDefinition } from "./llm-schemas";
import { usesFixtures, usesLiteModels } from "./runtime";

const MODEL_NAMES: Record<Exclude<RuntimeMode, "demo">, Record<ModelAlias, string>> = {
  production: {
    fast: "gemini-3-flash-preview",
    pro: "gemini-3.1-pro-preview",
    lite: "gemini-3.1-flash-lite-preview"
  },
  integration: {
    fast: "gemini-3.1-flash-lite-preview",
    pro: "gemini-3.1-flash-lite-preview",
    lite: "gemini-3.1-flash-lite-preview"
  },
  smoke: {
    fast: "gemini-3.1-flash-lite-preview",
    pro: "gemini-3.1-flash-lite-preview",
    lite: "gemini-3.1-flash-lite-preview"
  },
  manual: {
    fast: "gemini-3-flash-preview",
    pro: "gemini-3.1-pro-preview",
    lite: "gemini-3.1-flash-lite-preview"
  }
};

export interface StructuredTransportRequest {
  cacheKey?: string;
  model: string;
  prompt: string;
  schemaName: string;
}

export type StructuredTransport = (
  request: StructuredTransportRequest
) => Promise<string>;

export interface StructuredClientOptions {
  apiKey?: string;
  mode: RuntimeMode;
  transport?: StructuredTransport;
  baseDelayMs?: number;
  maxRetries?: number;
  random?: () => number;
}

export interface GenerateRequest<T> {
  cacheKey?: string;
  model: ModelAlias;
  prompt: string;
  schema: SchemaDefinition<T>;
}

export class DemoCacheMissError extends Error {
  constructor(cacheKey: string) {
    super(`Demo cache miss for key "${cacheKey}"`);
    this.name = "DemoCacheMissError";
  }
}

function resolveModelName(mode: RuntimeMode, alias: ModelAlias): string {
  if (mode === "demo") {
    return MODEL_NAMES.production[alias];
  }
  return MODEL_NAMES[mode][usesLiteModels(mode) ? "lite" : alias];
}

function buildPrompt<T>(prompt: string, schema: SchemaDefinition<T>): string {
  return [
    "Return valid JSON only.",
    `Schema name: ${schema.name}.`,
    `Expected shape: ${schema.explain}`,
    "",
    prompt
  ].join("\n");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export class StructuredLlmClient {
  private readonly apiKey?: string;
  private readonly mode: RuntimeMode;
  private readonly transport?: StructuredTransport;
  private readonly baseDelayMs: number;
  private readonly maxRetries: number;
  private readonly random: () => number;

  constructor(options: StructuredClientOptions) {
    this.apiKey = options.apiKey;
    this.mode = options.mode;
    this.transport = options.transport;
    this.baseDelayMs = options.baseDelayMs ?? 250;
    this.maxRetries = options.maxRetries ?? 3;
    this.random = options.random ?? Math.random;
  }

  async generate<T>(request: GenerateRequest<T>): Promise<StructuredResult<T>> {
    const model = resolveModelName(this.mode, request.model);
    let prompt = buildPrompt(request.prompt, request.schema);
    const attempts: LlmAttempt[] = [];

    for (let index = 0; index < this.maxRetries; index += 1) {
      const attempt = index + 1;
      let rawText = "";

      try {
        rawText = await this.runTransport({
          cacheKey: request.cacheKey,
          model,
          prompt,
          schemaName: request.schema.name
        });
        const data = parseStructuredJson(request.schema, rawText);
        attempts.push({
          attempt,
          model,
          prompt,
          rawText
        });
        return {
          data,
          rawText,
          model,
          attempts
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown LLM error";
        const delayMs =
          index < this.maxRetries - 1
            ? this.baseDelayMs * 2 ** index + Math.round(this.random() * 120)
            : 0;

        attempts.push({
          attempt,
          model,
          prompt,
          rawText,
          error: message,
          delayMs
        });

        if (index >= this.maxRetries - 1) {
          throw new Error(
            `Structured generation failed after ${attempt} attempts: ${message}`
          );
        }

        prompt = [
          buildPrompt(request.prompt, request.schema),
          "",
          "The previous response was invalid.",
          `Validation error: ${message}`,
          rawText ? `Invalid response:\n${rawText}` : "No response body was returned.",
          "",
          "Try again. Return JSON only."
        ].join("\n");

        await sleep(delayMs);
      }
    }

    throw new Error("Unreachable structured generation failure.");
  }

  private async runTransport(
    request: StructuredTransportRequest
  ): Promise<string> {
    if (this.transport) {
      return this.transport(request);
    }

    if (usesFixtures(this.mode)) {
      throw new Error("Fixture mode requires a transport.");
    }

    if (!this.apiKey) {
      throw new Error("A Gemini API key is required for live requests.");
    }

    const client = new GoogleGenerativeAI(this.apiKey);
    const model = client.getGenerativeModel({
      model: request.model,
      generationConfig: {
        temperature: 0.3
      },
      tools: [{ googleSearch: {} } as never]
    });
    const response = await model.generateContent(request.prompt);
    return response.response.text();
  }
}

export function createFixtureTransport(
  fixtures: Record<string, unknown | unknown[]>
): StructuredTransport {
  const counters = new Map<string, number>();

  return async (request) => {
    const key = request.cacheKey ?? request.schemaName;
    if (!(key in fixtures)) {
      throw new DemoCacheMissError(key);
    }

    const value = fixtures[key];
    if (Array.isArray(value)) {
      const currentIndex = counters.get(key) ?? 0;
      const selected = value[Math.min(currentIndex, value.length - 1)];
      counters.set(key, currentIndex + 1);
      return typeof selected === "string"
        ? selected
        : JSON.stringify(selected, null, 2);
    }

    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  };
}
