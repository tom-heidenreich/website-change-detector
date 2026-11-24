export type Change = {
  /** "(html)" for the page itself, otherwise the resource URL. */
  target: string;
  kind: "modified" | "added" | "removed" | "failed";
};

export type ChangeSet = {
  detectedAt: number;
  /** When the snapshot we compared against was taken. */
  comparedTo: number;
  changes: Change[];
};

export type PageSnapshot = {
  url: string;
  /** Combined hash of the HTML and all resource hashes. */
  hash: string;
  htmlHash: string;
  /** Resource URL -> hash, or "error:<reason>" if it could not be fetched. */
  resources: Record<string, string>;
  checkedAt: number;
  /** The most recent change detected for this page, kept until the next one. */
  lastChange?: ChangeSet;
};

export const HTML_TARGET = "(html)";

/** Storage key for a page: the URL without its #fragment. */
export function pageKey(url: string) {
  const u = new URL(url);
  u.hash = "";
  return `page:${u.href}`;
}
