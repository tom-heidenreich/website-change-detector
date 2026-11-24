import { useSettings } from "@/lib/useSettings";
import { UrlRuleOptions } from "@/options/UrlRuleOptions";
export function Options() {
  const { settings } = useSettings();

  if (!settings) return null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">
          Website Change Detector
        </h1>
        <p className="text-muted-foreground">
          Configure the change detection rules.
        </p>
      </header>
      <UrlRuleOptions settings={settings} />
    </main>
  );
}
