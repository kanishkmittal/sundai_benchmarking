import { describe, expect, it } from "vitest";

import { confirmDocumentSchema } from "../../lib/llm-schemas";
import { StructuredLlmClient } from "../../lib/llm";

const apiKey = process.env.GEMINI_API_KEY;

describe("smoke scenarios", () => {
  it.skipIf(!apiKey)("uses Flash Lite for smoke mode", async () => {
    const client = new StructuredLlmClient({
      apiKey,
      mode: "smoke",
    });

    const result = await client.generate({
      model: "pro",
      schema: confirmDocumentSchema,
      prompt:
        'Return JSON with one short summary about how smoke mode works: {"summary":"..."}',
    });

    expect(result.model).toBe("gemini-3.1-flash-lite-preview");
    expect(result.data.summary.length).toBeGreaterThan(0);
  });
});
