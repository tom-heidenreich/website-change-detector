import browser, { type Runtime } from "webextension-polyfill";
import { sha256 } from "@/lib/hash";
import type { Message } from "@/lib/messages";

export type PageSnapshot = {
  url: string;
  /** Combined hash of the HTML and all resource hashes. */
  hash: string;
  htmlHash: string;
  /** Resource URL -> hash, or "error:<reason>" if it could not be fetched. */
  resources: Record<string, string>;
  checkedAt: number;
};

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

async function snapshot(url: string, resourceUrls: string[]) {
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

/** Storage key for a page: the URL without its #fragment. */
function pageKey(url: string) {
  const u = new URL(url);
  u.hash = "";
  return `page:${u.href}`;
}

async function handlePageLoaded(
  url: string,
  resources: string[],
  tabId?: number,
) {
  const key = pageKey(url);
  const current = await snapshot(url, resources);
  const previous = (await browser.storage.local.get(key))[key] as
    | PageSnapshot
    | undefined;

  if (previous && previous.hash !== current.hash) {
    const changed = [
      ...(previous.htmlHash !== current.htmlHash ? ["(html)"] : []),
      ...Object.keys({ ...previous.resources, ...current.resources }).filter(
        (r) => previous.resources[r] !== current.resources[r],
      ),
    ];
    console.log(`Changed: ${url} (tab ${tabId})`, changed);
  }

  await browser.storage.local.set({ [key]: current });
}

browser.runtime.onMessage.addListener(
  (raw: unknown, sender: Runtime.MessageSender) => {
    const message = raw as Message;
    if (message.type === "page-loaded") {
      // sender.tab is the tab the content script runs in.
      void handlePageLoaded(message.url, message.resources, sender.tab?.id);
    }
  },
);
