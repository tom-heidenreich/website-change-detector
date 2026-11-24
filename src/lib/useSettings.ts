import { useCallback, useEffect, useState } from "react";
import browser, { type Storage } from "webextension-polyfill";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";

/** The extension settings, kept in sync with storage. `null` while loading. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);

    const onChanged = (
      changes: Record<string, Storage.StorageChange>,
      area: string,
    ) => {
      if (area === "local" && SETTINGS_KEY in changes) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(changes[SETTINGS_KEY].newValue as Partial<Settings>),
        });
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const update = useCallback(
    (change: (current: Settings) => Settings) => {
      if (!settings) return;
      const next = change(settings);
      setSettings(next);
      void saveSettings(next);
    },
    [settings],
  );

  return [settings, update] as const;
}
