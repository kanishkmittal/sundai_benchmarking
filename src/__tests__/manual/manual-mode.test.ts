import { describe, expect, it } from "vitest";

import { confirmDocumentSchema } from "../../lib/llm-schemas";
import { StructuredLlmClient } from "../../lib/llm";

const manualEnabled = process.env.MANUAL_TESTS === "true";
const apiKey = process.env.GEMINI_API_KEY;

describe("manual mode", () => {
  it.skipIf(!manualEnabled || !apiKey)(
    "uses the production model mix when manual tests are enabled",
    async () => {
      const client = new StructuredLlmClient({
        apiKey,
        mode: "manual"
      });

      const result = await client.generate({
        model: "pro",
        schema: confirmDocumentSchema,
        prompt:
          'Return JSON with one short summary proving manual mode is working: {"summary":"..."}'
      });

      expect(result.model).toBe("gemini-3.1-pro-preview");
      expect(result.data.summary.length).toBeGreaterThan(0);
    }
  );
});
