import browser, { type Runtime } from "webextension-polyfill";
import { sha256 } from "@/lib/hash";
import type { Message } from "@/lib/messages";
import { isActiveFor, loadSettings } from "@/lib/settings";
import {
  HTML_TARGET,
  pageKey,
  type Change,
  type PageSnapshot,
} from "@/lib/storage";

/** Fetch a URL and hash its raw response body. */
async function hashUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return `error:${res.status}`;
    return await sha256(await res.arrayBuffer());
  } catch (err) {
    return `error:${err instanceof Error ? err.message : String(err)}`;
  }
}

async function snapshot(
  url: string,
  resourceUrls: string[],
): Promise<PageSnapshot> {
  const [htmlHash, ...resourceHashes] = await Promise.all([
    hashUrl(url),
    ...resourceUrls.map(hashUrl),
  ]);

  const resources = Object.fromEntries(
    resourceUrls.map((u, i) => [u, resourceHashes[i]]),
  );
  // Sort so the combined hash doesn't depend on the order tags appear in.
  const hash = await sha256(
    JSON.stringify([htmlHash, Object.entries(resources).sort()]),
  );

  return { url, hash, htmlHash, resources, checkedAt: Date.now() };
}

function compare(previous: PageSnapshot, current: PageSnapshot): Change[] {
  const changes: Change[] = [];
  const kindOf = (before?: string, after?: string): Change["kind"] | null => {
    if (before === after) return null;
    if (before === undefined) return "added";
    if (after === undefined) return "removed";
    if (after.startsWith("error:")) return "failed";
    return "modified";
  };

  const htmlKind = kindOf(previous.htmlHash, current.htmlHash);
  if (htmlKind) changes.push({ target: HTML_TARGET, kind: htmlKind });

  const urls = new Set([
    ...Object.keys(previous.resources),
    ...Object.keys(current.resources),
  ]);
  for (const url of urls) {
    const kind = kindOf(previous.resources[url], current.resources[url]);
    if (kind) changes.push({ target: url, kind });
  }
  return changes;
}

function showChangeBadge(tabId: number) {
  const action = browser.action ?? browser.browserAction;
  void action.setBadgeText({ text: "!", tabId });
}

async function handlePageLoaded(
  url: string,
  resources: string[],
  tabId?: number,
) {
  if (!isActiveFor(url, await loadSettings())) return;

  const key = pageKey(url);
  const current = await snapshot(url, resources);
  const previous = (await browser.storage.local.get(key))[key] as
    PageSnapshot | undefined;

  if (previous && previous.hash !== current.hash) {
    current.lastChange = {
      detectedAt: current.checkedAt,
      comparedTo: previous.checkedAt,
      changes: compare(previous, current),
    };
    if (tabId) showChangeBadge(tabId);
  } else {
    current.lastChange = previous?.lastChange;
  }

  await browser.storage.local.set({ [key]: current });
}

browser.runtime.onMessage.addListener(
  (raw: unknown, sender: Runtime.MessageSender) => {
    const message = raw as Message;
    if (message.type === "page-loaded") {
      void handlePageLoaded(message.url, message.resources, sender.tab?.id);
    }
  },
);
