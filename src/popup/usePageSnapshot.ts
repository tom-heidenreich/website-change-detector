import { useEffect, useState } from "react";
import browser, { type Storage } from "webextension-polyfill";
import { pageKey, type PageSnapshot } from "@/lib/storage";

export type PageState =
  | { status: "loading" }
  | { status: "unsupported" }
  | { status: "ready"; url: string; snapshot?: PageSnapshot };

/** The stored snapshot for the page in the active tab, kept up to date. */
export function usePageSnapshot(): PageState {
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let key: string | undefined;

    const onChanged = (
      changes: Record<string, Storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !key || !(key in changes)) return;
      setState((s) =>
        s.status === "ready"
          ? { ...s, snapshot: changes[key!].newValue as PageSnapshot }
          : s,
      );
    };

    void (async () => {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url || !/^https?:/.test(tab.url)) {
        setState({ status: "unsupported" });
        return;
      }
      key = pageKey(tab.url);
      const stored = await browser.storage.local.get(key);
      setState({
        status: "ready",
        url: tab.url,
        snapshot: stored[key] as PageSnapshot | undefined,
      });
    })();

    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  return state;
}
