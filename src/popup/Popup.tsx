import browser from "webextension-polyfill";
import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isActiveFor, type Settings } from "@/lib/settings";
import { HTML_TARGET, type Change } from "@/lib/storage";
import { useSettings } from "@/lib/useSettings";
import { usePageSnapshot } from "@/popup/usePageSnapshot";

const formatTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const kindLabel: Record<Change["kind"], string> = {
  modified: "Modified",
  added: "Added",
  removed: "Removed",
  failed: "Failed to load",
};

/** Show a resource URL compactly: host + path, without query string. */
function shortUrl(target: string) {
  if (target === HTML_TARGET) return "Page HTML";
  try {
    const u = new URL(target);
    return u.host + u.pathname;
  } catch {
    return target;
  }
}

export function Popup() {
  const state = usePageSnapshot();
  const [settings] = useSettings();

  return (
    <main className="w-96 space-y-3 p-4 text-sm">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-base font-semibold">
          Website Change Detector
        </h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Settings"
          title="Settings"
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          <SettingsIcon />
        </Button>
      </header>
      <PopupBody state={state} settings={settings} />
    </main>
  );
}

function PopupBody({
  state,
  settings,
}: {
  state: ReturnType<typeof usePageSnapshot>;
  settings: Settings | null;
}) {
  if (state.status === "loading" || !settings) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (state.status === "unsupported") {
    return (
      <p className="text-muted-foreground">
        This page can't be tracked. Only http and https pages are supported.
      </p>
    );
  }

  if (!isActiveFor(state.url, settings)) {
    return (
      <p className="text-muted-foreground">
        Change detection is turned off for this website by your URL rules.
      </p>
    );
  }

  const { snapshot } = state;
  if (!snapshot) {
    return (
      <p className="text-muted-foreground">
        No snapshot yet. Reload the page to take one.
      </p>
    );
  }

  const { lastChange } = snapshot;
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Last checked {formatTime(snapshot.checkedAt)}
      </p>

      {!lastChange ? (
        <p>No changes detected since the first snapshot.</p>
      ) : (
        <section className="space-y-2">
          <p>
            <span className="font-medium">
              {lastChange.changes.length} change
              {lastChange.changes.length === 1 ? "" : "s"}
            </span>{" "}
            detected {formatTime(lastChange.detectedAt)}
            <span className="text-muted-foreground">
              {" "}
              (compared to {formatTime(lastChange.comparedTo)})
            </span>
          </p>
          <ul className="divide-y rounded-lg border">
            {lastChange.changes.map((change) => (
              <li
                key={change.target}
                className="flex items-baseline gap-2 px-3 py-2"
              >
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {kindLabel[change.kind]}
                </span>
                <span className="truncate" title={change.target}>
                  {shortUrl(change.target)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
