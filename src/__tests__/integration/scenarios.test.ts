import { describe, expect, it } from "vitest";

import { getBundledSession, buildFixtureMap } from "../../lib/demo";
import {
  confirmDocumentSchema,
  outlineSchema,
  researchSchema,
  writeSchema
} from "../../lib/llm-schemas";
import { createFixtureTransport, StructuredLlmClient } from "../../lib/llm";
import {
  loadSettings,
  saveDraft,
  savePost,
  saveSession,
  saveSettings,
  snapshotDatabase
} from "../../lib/db";
import { createDraft, createEmptySettings } from "../../lib/types";

describe("integration scenarios", () => {
  it("persists settings, drafts, posts, and sessions without network", async () => {
    const settings = {
      ...createEmptySettings(),
      apiKey: "test-key",
      updatedAt: new Date().toISOString()
    };
    await saveSettings(settings);

    const draft = createDraft("A durable topic");
    await saveDraft(draft);

    const bundled = getBundledSession();
    await savePost(bundled.postSnapshot!);
    await saveSession(bundled);

    const snapshot = await snapshotDatabase();
    expect(snapshot.settings.apiKey).toBe("test-key");
    expect(snapshot.drafts).toHaveLength(1);
    expect(snapshot.posts).toHaveLength(1);
    expect(snapshot.sessions).toHaveLength(1);
  });

  it("runs the canned outline and write pipeline with structured output", async () => {
    const fixtures = buildFixtureMap(getBundledSession());
    const client = new StructuredLlmClient({
      apiKey: "integration-key",
      mode: "integration",
      transport: createFixtureTransport(fixtures)
    });

    const company = await client.generate({
      cacheKey: "confirm-company",
      model: "pro",
      schema: confirmDocumentSchema,
      prompt: "Confirm the company brief."
    });
    expect(company.data.summary).toContain("company brief");

    const research = await client.generate({
      cacheKey: "research",
      model: "fast",
      schema: researchSchema,
      prompt: "Research this draft."
    });
    expect(research.data.sources[0].title).toContain("rituals");

    const outline = await client.generate({
      cacheKey: "outline",
      model: "pro",
      schema: outlineSchema,
      prompt: "Build an outline."
    });
    expect(outline.data.outline.sections).toHaveLength(3);

    const finalPass = await client.generate({
      cacheKey: "guardrails",
      model: "pro",
      schema: writeSchema,
      prompt: "Produce the final post."
    });
    expect(finalPass.data.footnotes).toHaveLength(3);
    expect(finalPass.data.attributions[0].sourceId).toBe("src-rituals");
  });

  it("retries malformed JSON with backoff and fails cleanly after max retries", async () => {
    const attempts: string[] = [];
    const client = new StructuredLlmClient({
      apiKey: "integration-key",
      mode: "integration",
      baseDelayMs: 1,
      random: () => 0,
      transport: createFixtureTransport({
        "confirm-company": ['{"summary": 9}', { summary: "Recovered summary" }]
      })
    });

    const recovered = await client.generate({
      cacheKey: "confirm-company",
      model: "pro",
      schema: confirmDocumentSchema,
      prompt: "Confirm the company brief."
    });
    expect(recovered.data.summary).toBe("Recovered summary");
    expect(recovered.attempts).toHaveLength(2);
    attempts.push(...recovered.attempts.map((attempt) => attempt.error ?? "ok"));

    const brokenClient = new StructuredLlmClient({
      apiKey: "integration-key",
      mode: "integration",
      baseDelayMs: 1,
      random: () => 0,
      maxRetries: 2,
      transport: createFixtureTransport({
        bad: ['{"summary": 2}', '{"summary": 3}']
      })
    });

    await expect(
      brokenClient.generate({
        cacheKey: "bad",
        model: "pro",
        schema: confirmDocumentSchema,
        prompt: "Fail on purpose."
      })
    ).rejects.toThrow(/Structured generation failed/);

    expect(attempts[0]).toMatch(/failed schema/);
  });

  it("starts from empty settings by default", async () => {
    const settings = await loadSettings();
    expect(settings.apiKey).toBe("");
  });
});
