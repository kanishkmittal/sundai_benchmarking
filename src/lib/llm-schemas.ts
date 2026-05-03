import type {
  ConfirmDocumentResponse,
  OutlineResponse,
  ResearchResponse,
  TrendingPromptResponse,
  TrendingResearchResponse,
  WriteResponse
} from "./types";

export interface SchemaDefinition<T> {
  name: string;
  description: string;
  validate: (value: unknown) => value is T;
  explain: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export const confirmDocumentSchema: SchemaDefinition<ConfirmDocumentResponse> = {
  name: "confirmDocument",
  description: "A short summary confirming the document intent and quality.",
  explain: '{ "summary": "string" }',
  validate(value): value is ConfirmDocumentResponse {
    return isRecord(value) && isString(value.summary);
  }
};

export const trendingResearchSchema: SchemaDefinition<TrendingResearchResponse> = {
  name: "trendingResearch",
  description: "Parallel trend research results with sources.",
  explain:
    '{ "trends": [{ "id": "string", "label": "string", "momentum": 1, "summary": "string", "sources": [{ "id": "string", "url": "string", "title": "string", "author": "string", "publicationDate": "string", "snippet": "string", "highlight": true }] }] }',
  validate(value): value is TrendingResearchResponse {
    return (
      isRecord(value) &&
      Array.isArray(value.trends) &&
      value.trends.every((trend) => {
        return (
          isRecord(trend) &&
          isString(trend.id) &&
          isString(trend.label) &&
          typeof trend.momentum === "number" &&
          isString(trend.summary) &&
          Array.isArray(trend.sources) &&
          trend.sources.every((source) => {
            return (
              isRecord(source) &&
              isString(source.id) &&
              isString(source.url) &&
              isString(source.title) &&
              isString(source.author) &&
              isString(source.publicationDate) &&
              isString(source.snippet) &&
              typeof source.highlight === "boolean"
            );
          })
        );
      })
    );
  }
};

export const trendingPromptSchema: SchemaDefinition<TrendingPromptResponse> = {
  name: "trendingPrompts",
  description: "Exactly three writing prompts based on trend research.",
  explain:
    '{ "prompts": [{ "id": "string", "title": "string", "prompt": "string", "rationale": "string" }] }',
  validate(value): value is TrendingPromptResponse {
    return (
      isRecord(value) &&
      Array.isArray(value.prompts) &&
      value.prompts.length === 3 &&
      value.prompts.every((prompt) => {
        return (
          isRecord(prompt) &&
          isString(prompt.id) &&
          isString(prompt.title) &&
          isString(prompt.prompt) &&
          isString(prompt.rationale)
        );
      })
    );
  }
};

export const researchSchema: SchemaDefinition<ResearchResponse> = {
  name: "research",
  description: "Grounded research sources for a draft topic.",
  explain:
    '{ "sources": [{ "id": "string", "url": "string", "title": "string", "author": "string", "publicationDate": "string", "snippet": "string", "highlight": true }] }',
  validate(value): value is ResearchResponse {
    return (
      isRecord(value) &&
      Array.isArray(value.sources) &&
      value.sources.every((source) => {
        return (
          isRecord(source) &&
          isString(source.id) &&
          isString(source.url) &&
          isString(source.title) &&
          isString(source.author) &&
          isString(source.publicationDate) &&
          isString(source.snippet) &&
          typeof source.highlight === "boolean"
        );
      })
    );
  }
};

export const outlineSchema: SchemaDefinition<OutlineResponse> = {
  name: "outline",
  description: "A one-shot article outline.",
  explain:
    '{ "outline": { "title": "string", "dek": "string", "sections": [{ "heading": "string", "bullets": ["string"] }] } }',
  validate(value): value is OutlineResponse {
    return (
      isRecord(value) &&
      isRecord(value.outline) &&
      isString(value.outline.title) &&
      isString(value.outline.dek) &&
      Array.isArray(value.outline.sections) &&
      value.outline.sections.every((section) => {
        return (
          isRecord(section) &&
          isString(section.heading) &&
          isStringArray(section.bullets)
        );
      })
    );
  }
};

export const writeSchema: SchemaDefinition<WriteResponse> = {
  name: "write",
  description: "A complete newsletter draft with citations and attribution.",
  explain:
    '{ "title": "string", "subtitle": "string", "markdown": "string", "footnotes": [{ "number": 1, "sourceId": "string", "label": "string", "url": "string" }], "attributions": [{ "citation": 1, "sourceId": "string", "title": "string", "url": "string", "author": "string", "publicationDate": "string" }], "notes": "string" }',
  validate(value): value is WriteResponse {
    return (
      isRecord(value) &&
      isString(value.title) &&
      isString(value.subtitle) &&
      isString(value.markdown) &&
      Array.isArray(value.footnotes) &&
      value.footnotes.every((footnote) => {
        return (
          isRecord(footnote) &&
          typeof footnote.number === "number" &&
          isString(footnote.sourceId) &&
          isString(footnote.label) &&
          isString(footnote.url)
        );
      }) &&
      Array.isArray(value.attributions) &&
      value.attributions.every((attribution) => {
        return (
          isRecord(attribution) &&
          typeof attribution.citation === "number" &&
          isString(attribution.sourceId) &&
          isString(attribution.title) &&
          isString(attribution.url) &&
          isString(attribution.author) &&
          isString(attribution.publicationDate)
        );
      }) &&
      isString(value.notes)
    );
  }
};

export function parseStructuredJson<T>(
  schema: SchemaDefinition<T>,
  rawText: string
): T {
  const parsed = JSON.parse(rawText) as unknown;
  if (!schema.validate(parsed)) {
    throw new Error(
      `Response failed schema ${schema.name}. Expected shape: ${schema.explain}`
    );
  }
  return parsed;
}
