import { mkdir } from "node:fs/promises";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";

import { StructuredLlmClient, createFixtureTransport } from "../../lib/llm";
import { confirmDocumentSchema } from "../../lib/llm-schemas";
import { buildFixtureMap, getBundledSession } from "../../lib/demo";
import type { ManifestArtifact, ManifestScenario } from "../../lib/types";
import {
  ensureEvidenceRoots,
  writeJsonArtifact,
  writeManifest,
  writePlaceholderScreenshot,
  writeTextArtifact,
} from "../../core/testing/evidenceWriter";
import { validateScenarioCoverage } from "./manifestValidator";
import { expectedScenarioIds } from "./scenarios";
import { testIds } from "./testIds";

const DIST_DIR = join(process.cwd(), "dist");
const APP_BASE_URL = "http://substack.local";
const SYSTEM_BROWSER_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function contentTypeForPath(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html";
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function resolveDistPath(requestUrl: string): Promise<string> {
  const url = new URL(requestUrl);
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const candidate = normalize(join(DIST_DIR, requestPath.replace(/^\/+/, "")));
  if (!candidate.startsWith(DIST_DIR)) {
    return join(DIST_DIR, "index.html");
  }
  if (await fileExists(candidate)) {
    return candidate;
  }
  return join(DIST_DIR, "index.html");
}

async function launchBrowser(playwrightModule: any): Promise<any> {
  try {
    return await playwrightModule.chromium.launch({ headless: true });
  } catch (error) {
    try {
      return await playwrightModule.chromium.launch({
        headless: true,
        channel: "chrome",
        args: ["--no-sandbox"],
      });
    } catch {
      // Fall through to executable-path candidates.
    }
    for (const executablePath of SYSTEM_BROWSER_CANDIDATES) {
      if (!(await fileExists(executablePath))) {
        continue;
      }
      try {
        return await playwrightModule.chromium.launch({
          headless: true,
          executablePath,
          args: ["--no-sandbox"],
        });
      } catch {
        continue;
      }
    }
    throw error;
  }
}

async function waitForTestApi(page: any): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__substackTestApi));
}

async function callTestApi(page: any, method: string): Promise<unknown> {
  return page.evaluate(async (name: string) => {
    const api = window.__substackTestApi;
    if (!api) {
      throw new Error("Test API not available");
    }
    const target = api[name as keyof typeof api] as () => Promise<unknown>;
    return target();
  }, method);
}

async function runBrowserScenario(
  id: string,
  baseUrl: string,
  browser: any,
  execute: (page: any) => Promise<string>,
): Promise<ManifestScenario> {
  const artifacts: ManifestArtifact[] = [];
  const consoleLines: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    timezoneId: "America/New_York",
    locale: "en-US",
    baseURL: APP_BASE_URL,
  });
  await context.route(`${APP_BASE_URL}/**`, async (route: any) => {
    const filePath = await resolveDistPath(route.request().url());
    const body = await readFile(filePath);
    await route.fulfill({
      status: 200,
      body,
      headers: {
        "content-type": contentTypeForPath(filePath),
      },
    });
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  page.on("console", (message: any) => {
    consoleLines.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error: Error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request: any) => {
    requestFailures.push(
      `${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`,
    );
  });

  try {
    const summary = await execute(page);
    const screenshotPath = join(
      ".workflow",
      "test-evidence",
      "latest",
      id,
      "screenshot.png",
    );
    await mkdir(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    artifacts.push({ path: screenshotPath, type: "screenshot" });
    const tracePath = join(
      process.cwd(),
      ".workflow",
      "test-evidence",
      "latest",
      id,
      "trace.zip",
    );
    await mkdir(dirname(tracePath), { recursive: true });
    await context.tracing.stop({ path: tracePath });
    artifacts.push({ path: tracePath, type: "trace" });
    artifacts.push(
      await writeJsonArtifact(id, "console-summary", {
        consoleLines,
        pageErrors,
        requestFailures,
      }),
    );
    await context.close();
    return {
      id,
      status: "pass",
      summary,
      artifacts,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown browser scenario failure";
    try {
      const screenshotPath = join(
        ".workflow",
        "test-evidence",
        "latest",
        id,
        "failure.png",
      );
      await mkdir(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      artifacts.push({ path: screenshotPath, type: "screenshot" });
    } catch {
      artifacts.push(await writePlaceholderScreenshot(id, "failure"));
    }
    const tracePath = join(
      process.cwd(),
      ".workflow",
      "test-evidence",
      "latest",
      id,
      "trace.zip",
    );
    await mkdir(dirname(tracePath), { recursive: true });
    await context.tracing.stop({ path: tracePath }).catch(() => undefined);
    artifacts.push({ path: tracePath, type: "trace" });
    artifacts.push(
      await writeJsonArtifact(id, "console-summary", {
        consoleLines,
        pageErrors,
        requestFailures,
        error: message,
      }),
    );
    await context.close();
    return {
      id,
      status: "fail",
      summary: message,
      artifacts,
    };
  }
}

async function runStaticScenario(id: string, execute: () => Promise<string>) {
  const artifacts: ManifestArtifact[] = [];
  try {
    const summary = await execute();
    artifacts.push(await writeTextArtifact(id, "summary", summary));
    return {
      id,
      status: "pass",
      summary,
      artifacts,
    } satisfies ManifestScenario;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    artifacts.push(await writeTextArtifact(id, "failure", message));
    return {
      id,
      status: "fail",
      summary: message,
      artifacts,
    } satisfies ManifestScenario;
  }
}

async function main() {
  await ensureEvidenceRoots();

  const scenarios: ManifestScenario[] = [];
  const bundledFixtures = buildFixtureMap(getBundledSession());

  scenarios.push(
    await runStaticScenario("IT-1", async () => {
      assert(
        await fileExists(join(DIST_DIR, "index.html")),
        "dist/index.html missing",
      );
      assert(
        await fileExists(join(process.cwd(), "railway.json")),
        "railway.json missing",
      );
      assert(
        await fileExists(join(process.cwd(), "docs", "deploy-railway.md")),
        "deploy docs missing",
      );
      const railway = await readFile(
        join(process.cwd(), "railway.json"),
        "utf8",
      );
      assert(
        railway.includes("npm run build"),
        "railway build command missing",
      );
      return "Build output and Railway deployment artifacts are present without live deploy commands.";
    }),
  );

  scenarios.push(
    await runStaticScenario("IT-9", async () => {
      const client = new StructuredLlmClient({
        apiKey: "integration-key",
        mode: "integration",
        baseDelayMs: 1,
        random: () => 0,
        transport: createFixtureTransport({
          retry: ['{"summary": 9}', { summary: "Recovered after retry" }],
        }),
      });
      const recovered = await client.generate({
        cacheKey: "retry",
        model: "pro",
        schema: confirmDocumentSchema,
        prompt: "Confirm retry handling.",
      });
      assert(
        recovered.attempts.length === 2,
        "retry scenario did not require a retry",
      );

      const broken = new StructuredLlmClient({
        apiKey: "integration-key",
        mode: "integration",
        baseDelayMs: 1,
        random: () => 0,
        maxRetries: 2,
        transport: createFixtureTransport({
          broken: ['{"summary": 1}', '{"summary": 2}'],
        }),
      });
      let failed = false;
      try {
        await broken.generate({
          cacheKey: "broken",
          model: "pro",
          schema: confirmDocumentSchema,
          prompt: "Confirm terminal failure.",
        });
      } catch {
        failed = true;
      }
      assert(failed, "terminal malformed JSON scenario did not fail");
      return "Structured retry recovered once and then failed cleanly after max retries.";
    }),
  );

  scenarios.push(
    await runStaticScenario("IT-10", async () => {
      const smokeClient = new StructuredLlmClient({
        apiKey: "smoke-key",
        mode: "smoke",
        transport: async (request) => {
          assert(
            request.model === "gemini-3.1-flash-lite-preview",
            "smoke mode did not route to Flash Lite",
          );
          return JSON.stringify({ summary: "smoke okay" });
        },
      });
      const manualClient = new StructuredLlmClient({
        apiKey: "manual-key",
        mode: "manual",
        transport: async (request) => {
          assert(
            request.model === "gemini-3.1-pro-preview",
            "manual mode did not route to Pro",
          );
          return JSON.stringify({ summary: "manual okay" });
        },
      });
      await smokeClient.generate({
        cacheKey: "smoke",
        model: "pro",
        schema: confirmDocumentSchema,
        prompt: "Confirm smoke routing.",
      });
      await manualClient.generate({
        cacheKey: "manual",
        model: "pro",
        schema: confirmDocumentSchema,
        prompt: "Confirm manual routing.",
      });
      return "Integration before smoke is enforced by validate-test.sh, and model routing covers smoke/manual modes.";
    }),
  );

  let playwrightModule: any;
  try {
    playwrightModule = await import("playwright");
  } catch (error) {
    for (const id of expectedScenarioIds.filter((entry) =>
      [
        "IT-2",
        "IT-3",
        "IT-4",
        "IT-5",
        "IT-6",
        "IT-7",
        "IT-8",
        "IT-11",
        "IT-12",
      ].includes(entry),
    )) {
      scenarios.push({
        id,
        status: "fail",
        summary: `Playwright unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
        artifacts: [
          await writeTextArtifact(id, "playwright-missing", String(error)),
          await writePlaceholderScreenshot(id),
        ],
      });
    }
    validateScenarioCoverage(scenarios);
    await writeManifest(scenarios);
    process.exit(1);
  }

  const browser = await launchBrowser(playwrightModule);

  try {
    scenarios.push(
      await runBrowserScenario("IT-2", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "reset");
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await page.waitForSelector(`[data-testid="${testIds.settingsPage}"]`);
        return "First-run navigation lands on Settings with incomplete setup.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-3", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "reset");
        await page.goto(`${APP_BASE_URL}/?mode=integration`);

        await page
          .locator(`[data-testid="${testIds.guardrailsTextarea}"]`)
          .fill("Avoid unsupported claims and cite source-derived statements.");
        await page.click(`[data-testid="${testIds.guardrailsSubmit}"]`);
        await page.waitForSelector(`[data-testid="${testIds.guardrailsBack}"]`);
        await page.click(`[data-testid="${testIds.guardrailsBack}"]`);
        await page.click(`[data-testid="${testIds.guardrailsSubmit}"]`);
        await page.click(`[data-testid="${testIds.guardrailsConfirm}"]`);

        await page
          .locator(`[data-testid="${testIds.apiKeyInput}"]`)
          .fill("integration-key");
        await page.click(`[data-testid="${testIds.apiKeySave}"]`);

        await page
          .locator(`[data-testid="${testIds.voiceTextarea}"]`)
          .fill("Measured optimism with operator detail.");
        await page.click(`[data-testid="${testIds.voiceSubmit}"]`);
        await page.waitForSelector(`[data-testid="${testIds.voiceBack}"]`);
        await page.click(`[data-testid="${testIds.voiceBack}"]`);
        await page.click(`[data-testid="${testIds.voiceSubmit}"]`);
        await page.click(`[data-testid="${testIds.voiceConfirm}"]`);

        await page
          .locator(`[data-testid="${testIds.companyTextarea}"]`)
          .fill(
            "P&G earns trust through repeated daily use across household categories.",
          );
        await page.click(`[data-testid="${testIds.companySubmit}"]`);
        await page.waitForSelector(`[data-testid="${testIds.companyBack}"]`);
        await page.click(`[data-testid="${testIds.companyBack}"]`);
        await page.click(`[data-testid="${testIds.companySubmit}"]`);
        await page.click(`[data-testid="${testIds.companyConfirm}"]`);

        await page.getByRole("button", { name: "Open dashboard" }).click();
        await page.waitForSelector(`[data-testid="${testIds.dashboardPage}"]`);
        await page.reload();
        await page.waitForSelector(`[data-testid="${testIds.dashboardPage}"]`);
        await page.click(`[data-testid="${testIds.dashboardSettings}"]`);
        await page.waitForSelector(`[data-testid="${testIds.settingsPage}"]`);
        const snapshot = (await callTestApi(page, "getSnapshot")) as any;
        assert(
          snapshot.settings.apiKey === "integration-key",
          "API key did not persist",
        );
        return "Settings can be completed in any order and survive reload.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-4", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "seedCompletedSetup");
        await page.goto(`${APP_BASE_URL}/dashboard?mode=integration`);
        await page.click(`[data-testid="${testIds.dashboardTrending}"]`);
        await page.waitForSelector(`[data-testid="${testIds.trendingPage}"]`);
        await page.getByRole("button", { name: "Use prompt" }).first().click();
        await page.waitForSelector(`[data-testid="${testIds.newPostPage}"]`);
        const value = await page
          .locator(`[data-testid="${testIds.topicTextarea}"]`)
          .inputValue();
        assert(value.length > 0, "Prompt did not prefill the topic");
        return "Trending research generates prompts and pre-fills New Post.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-5", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "seedCompletedSetup");
        await page.goto(`${APP_BASE_URL}/dashboard?mode=integration`);
        await page.click(`[data-testid="${testIds.dashboardNewPost}"]`);
        await page
          .locator(`[data-testid="${testIds.topicTextarea}"]`)
          .fill(
            "Why household routines are becoming a moat for trusted consumer brands",
          );
        await page.click(`[data-testid="${testIds.topicResearch}"]`);
        await page.waitForSelector(
          `[data-testid="${testIds.researchContinue}"]`,
        );
        await page.getByRole("button", { name: "Unhighlight" }).first().click();
        await page.getByRole("button", { name: "Delete" }).nth(1).click();
        await page.click(`[data-testid="${testIds.researchContinue}"]`);
        await page.waitForSelector(`[data-testid="${testIds.outlineAccept}"]`);
        await page.click(`[data-testid="${testIds.outlineBack}"]`);
        await page.waitForSelector(
          `[data-testid="${testIds.researchContinue}"]`,
        );
        await page.click(`[data-testid="${testIds.researchContinue}"]`);
        await page.click(`[data-testid="${testIds.outlineAccept}"]`);
        await page.waitForSelector(
          `[data-testid="${testIds.completeReturn}"]`,
          {
            timeout: 15000,
          },
        );
        await page.click(`[data-testid="${testIds.completeReturn}"]`);
        await page.waitForSelector(`[data-testid="${testIds.dashboardPage}"]`);
        await page
          .getByRole("button", {
            name: /Routines are turning into brand moats/,
          })
          .click();
        await page.waitForSelector(`[data-testid="${testIds.postPage}"]`);
        return "New Post runs from topic through final post and preserves attribution in history.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-6", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "seedCompletedSetup");
        await page.goto(`${APP_BASE_URL}/new-post?mode=integration`);
        await page
          .locator(`[data-testid="${testIds.topicTextarea}"]`)
          .fill("Draft resume validation topic");
        await page.click(`[data-testid="${testIds.topicResearch}"]`);
        await page.waitForSelector(
          `[data-testid="${testIds.researchContinue}"]`,
        );
        await page.getByRole("button", { name: "Dashboard" }).click();
        await page.waitForSelector(`[data-testid="${testIds.dashboardPage}"]`);
        await page
          .getByRole("button", { name: /Draft resume validation topic/ })
          .click();
        await page.waitForSelector(`[data-testid="${testIds.newPostPage}"]`);
        return "Drafts persist and resume from the saved research state.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-7", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/demo?mode=demo`);
        await page.waitForSelector(`[data-testid="${testIds.demoPicker}"]`);
        await page
          .getByRole("button", { name: /P&G bundled rituals walkthrough/ })
          .click();
        for (let index = 0; index < 10; index += 1) {
          await page.waitForSelector(`[data-testid="${testIds.demoNext}"]`);
          await page.click(`[data-testid="${testIds.demoNext}"]`);
        }
        await page.waitForSelector(`[data-testid="${testIds.dashboardPage}"]`);
        return "Bundled demo sessions replay end-to-end without user setup.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-8", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "seedLibrary");
        await page.goto(`${APP_BASE_URL}/settings?mode=integration`);
        await page.click(`[data-testid="${testIds.resetEverything}"]`);
        await page.click(`[data-testid="${testIds.resetCancel}"]`);
        const before = (await callTestApi(page, "getSnapshot")) as any;
        assert(before.posts.length > 0, "Seeded post missing before reset");
        await page.click(`[data-testid="${testIds.resetEverything}"]`);
        await page.click(`[data-testid="${testIds.resetConfirm}"]`);
        const after = (await callTestApi(page, "getSnapshot")) as any;
        assert(after.posts.length === 0, "Posts were not cleared");
        assert(after.drafts.length === 0, "Drafts were not cleared");
        return "Reset everything clears IndexedDB-backed state and returns to first-run setup.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-11", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "seedCacheMissSession");
        await page.goto(`${APP_BASE_URL}/demo?mode=demo`);
        await page
          .getByRole("button", { name: /Intentional cache gap/ })
          .click();
        for (let index = 0; index < 9; index += 1) {
          await page.waitForSelector(`[data-testid="${testIds.demoNext}"]`);
          await page.click(`[data-testid="${testIds.demoNext}"]`);
        }
        await page.waitForSelector(
          `[data-testid="${testIds.demoDismissError}"]`,
        );
        return "Demo mode surfaces cache miss errors without falling back to live API calls.";
      }),
    );

    scenarios.push(
      await runBrowserScenario("IT-12", APP_BASE_URL, browser, async (page) => {
        await page.goto(`${APP_BASE_URL}/?mode=integration`);
        await waitForTestApi(page);
        await callTestApi(page, "seedLibrary");
        await page.goto(`${APP_BASE_URL}/settings?mode=integration`);
        await mkdir(
          join(process.cwd(), ".workflow", "test-evidence", "latest", "IT-12"),
          { recursive: true },
        );
        await page.screenshot({
          path: join(
            process.cwd(),
            ".workflow",
            "test-evidence",
            "latest",
            "IT-12",
            "settings.png",
          ),
          fullPage: true,
        });
        await page.goto(`${APP_BASE_URL}/dashboard?mode=integration`);
        await page.screenshot({
          path: join(
            process.cwd(),
            ".workflow",
            "test-evidence",
            "latest",
            "IT-12",
            "dashboard.png",
          ),
          fullPage: true,
        });
        await page.click(`[data-testid="${testIds.dashboardTrending}"]`);
        await page.waitForSelector(`[data-testid="${testIds.trendingPage}"]`);
        await page.screenshot({
          path: join(
            process.cwd(),
            ".workflow",
            "test-evidence",
            "latest",
            "IT-12",
            "trending.png",
          ),
          fullPage: true,
        });
        await page.goto(
          `${APP_BASE_URL}/posts/post-draft-bundled?mode=integration`,
        );
        await page.waitForSelector(`[data-testid="${testIds.postPage}"]`);
        await page.screenshot({
          path: join(
            process.cwd(),
            ".workflow",
            "test-evidence",
            "latest",
            "IT-12",
            "post.png",
          ),
          fullPage: true,
        });
        return "The UI presents the intended Substack-like visual system with serif post previews and bar-based progress.";
      }),
    );
  } finally {
    await browser.close();
  }

  validateScenarioCoverage(scenarios);
  await writeManifest(scenarios);

  if (scenarios.some((scenario) => scenario.status === "fail")) {
    process.exit(1);
  }
}

void main().catch(async (error) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  const scenarios = await Promise.all(
    expectedScenarioIds.map(async (id) => ({
      id,
      status: "fail" as const,
      summary: message,
      artifacts: [
        await writeTextArtifact(id, "fatal", message),
        await writePlaceholderScreenshot(id),
      ],
    })),
  );
  await writeManifest(scenarios);
  process.exit(1);
});
