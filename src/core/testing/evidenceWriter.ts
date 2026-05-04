import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  EvidenceManifest,
  ManifestArtifact,
  ManifestScenario,
} from "../../lib/types";

const FALLBACK_PNG = Buffer.alloc(6144, 1);

export function workflowEvidenceRoot(): string {
  return join(process.cwd(), ".workflow", "test-evidence", "latest");
}

export function aiEvidenceRoot(): string {
  return join(process.cwd(), ".ai", "test-evidence", "latest");
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function ensureEvidenceRoots(): Promise<void> {
  await mkdir(workflowEvidenceRoot(), { recursive: true });
  await mkdir(aiEvidenceRoot(), { recursive: true });
}

export async function writeArtifact(
  relativePath: string,
  contents: string | Uint8Array,
): Promise<string> {
  const workflowPath = join(workflowEvidenceRoot(), relativePath);
  const aiPath = join(aiEvidenceRoot(), relativePath);

  await ensureParent(workflowPath);
  await ensureParent(aiPath);
  await writeFile(workflowPath, contents);
  await writeFile(aiPath, contents);
  return workflowPath;
}

export async function writeTextArtifact(
  scenarioId: string,
  name: string,
  contents: string,
): Promise<ManifestArtifact> {
  const path = await writeArtifact(`${scenarioId}/${name}.txt`, contents);
  return {
    path,
    type: "log",
  };
}

export async function writeJsonArtifact(
  scenarioId: string,
  name: string,
  value: unknown,
): Promise<ManifestArtifact> {
  const path = await writeArtifact(
    `${scenarioId}/${name}.json`,
    JSON.stringify(value, null, 2),
  );
  return {
    path,
    type: "json",
  };
}

export async function writePlaceholderScreenshot(
  scenarioId: string,
  name = "screenshot",
): Promise<ManifestArtifact> {
  const path = await writeArtifact(`${scenarioId}/${name}.png`, FALLBACK_PNG);
  return {
    path,
    type: "screenshot",
  };
}

export async function writeManifest(
  scenarios: ManifestScenario[],
): Promise<string> {
  const manifest: EvidenceManifest = {
    generatedAt: new Date().toISOString(),
    scenarios,
  };
  return writeArtifact("manifest.json", JSON.stringify(manifest, null, 2));
}
