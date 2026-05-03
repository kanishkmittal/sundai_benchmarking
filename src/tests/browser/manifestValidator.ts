import type { ManifestScenario } from "../../lib/types";
import { expectedScenarioIds } from "./scenarios";

export function validateScenarioCoverage(scenarios: ManifestScenario[]): void {
  const seen = new Set(scenarios.map((scenario) => scenario.id));
  for (const id of expectedScenarioIds) {
    if (!seen.has(id)) {
      throw new Error(`Manifest is missing ${id}`);
    }
  }
}
