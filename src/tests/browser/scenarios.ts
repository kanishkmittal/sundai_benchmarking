export const expectedScenarioIds = [
  "IT-1",
  "IT-2",
  "IT-3",
  "IT-4",
  "IT-5",
  "IT-6",
  "IT-7",
  "IT-8",
  "IT-9",
  "IT-10",
  "IT-11",
  "IT-12",
] as const;

export type ScenarioId = (typeof expectedScenarioIds)[number];

export const browserScenarioIds: ScenarioId[] = [
  "IT-2",
  "IT-3",
  "IT-4",
  "IT-5",
  "IT-6",
  "IT-7",
  "IT-8",
  "IT-11",
  "IT-12",
];
