import browser from "webextension-polyfill";

export type UrlRule = {
  id: string;
  pattern: string;
};

export type Settings = {
  rules: UrlRule[];
};

export const SETTINGS_KEY = "settings";

export const DEFAULT_SETTINGS: Settings = { rules: [] };

export async function loadSettings(): Promise<Settings> {
  const stored = (await browser.storage.local.get(SETTINGS_KEY))[
    SETTINGS_KEY
  ] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings) {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

/**
 * Turn a rule pattern into a RegExp matched against the full URL.
 *
 * - `*` matches any characters.
 * - Without a scheme, any scheme matches: `example.com` → `*://example.com`.
 * - Without a path, any path matches: `example.com` → `example.com/*`.
 */
export function patternToRegExp(pattern: string): RegExp {
  let p = pattern.trim();
  if (!p.includes("://")) p = `*://${p}`;
  const afterScheme = p.slice(p.indexOf("://") + 3);
  if (!afterScheme.includes("/")) p = `${p}/*`;

  const source = p
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`, "i");
}

/** Returns an error message, or null if the pattern is valid. */
export function validatePattern(
  pattern: string,
  existing: UrlRule[],
  ignoreId?: string,
): string | null {
  const p = pattern.trim();
  if (!p) return "Enter a URL pattern.";
  if (/\s/.test(p)) return "The pattern can't contain spaces.";
  if (
    existing.some(
      (r) => r.id !== ignoreId && r.pattern.toLowerCase() === p.toLowerCase(),
    )
  ) {
    return "A rule with this pattern already exists.";
  }
  return null;
}

export function matchesAnyRule(url: string, rules: UrlRule[]) {
  return rules.some((rule) => patternToRegExp(rule.pattern).test(url));
}

/**
 * Whether the extension should check the given URL.
 * If at least one rule matches, the URL is active.
 */
export function isActiveFor(url: string, settings: Settings) {
  return matchesAnyRule(url, settings.rules);
}
