import browser from "webextension-polyfill";
import type { PageLoadedMessage } from "@/lib/messages";

const isHttp = (url: string) => /^https?:/.test(url);

const stylesheets = Array.from(
  document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"][href]'),
  (link) => link.href,
);
const scripts = Array.from(
  document.querySelectorAll<HTMLScriptElement>("script[src]"),
  (script) => script.src,
);

const message: PageLoadedMessage = {
  type: "page-loaded",
  url: location.href,
  resources: [...new Set([...stylesheets, ...scripts])].filter(isHttp),
};

if (isHttp(location.href)) {
  // The background gets the tab from `sender.tab`; content scripts can't use browser.tabs.
  browser.runtime.sendMessage(message).catch((err) => {
    console.error("Request failed:", err);
  });
}
