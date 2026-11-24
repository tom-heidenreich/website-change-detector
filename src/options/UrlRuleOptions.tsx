import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { validatePattern, type Settings, type UrlRule } from "@/lib/settings";
import { useSettings } from "@/lib/useSettings";
import { Plus, X } from "lucide-react";
import { useState, type SubmitEvent } from "react";

export function UrlRuleOptions({ settings }: { settings: Settings }) {
  const { update } = useSettings();
  const { rules } = settings;

  const saveRule = (pattern: string) => {
    update((s) => ({
      ...s,
      rules: [...s.rules, { id: crypto.randomUUID(), pattern }],
    }));
  };

  const deleteRule = (id: string) =>
    update((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>URL rules</CardTitle>
        <CardDescription>
          Changes are only detected on websites matching one of these rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col w-full gap-2">
          {rules.map((rule) => (
            <RuleEntry rule={rule} deleteRule={() => deleteRule(rule.id)} />
          ))}
        </div>
        <Separator className="my-4" />
        <NewRuleForm rules={rules} onSave={saveRule} />
      </CardContent>
    </Card>
  );
}

function RuleEntry({
  rule,
  deleteRule,
}: {
  rule: UrlRule;
  deleteRule: () => void;
}) {
  const [hoveringDelete, setHoveringDelete] = useState(false);

  return (
    <span className="bg-muted p-2 rounded-lg flex flex-row justify-between items-center text-gray-300">
      <span className="flex flex-row gap-3 items-center font-mono overflow-hidden pr-4">
        <Plus size={16} />
        <p className="overflow-hidden">{rule.pattern}</p>
      </span>
      <span className="flex flex-row self-end gap-2">
        <Button
          onMouseEnter={() => setHoveringDelete(true)}
          onMouseLeave={() => setHoveringDelete(false)}
          variant={hoveringDelete ? "destructive" : "outline"}
          onClick={() => deleteRule()}
        >
          <X size={20} />
        </Button>
      </span>
    </span>
  );
}

function NewRuleForm({
  rules,
  onSave,
}: {
  rules: UrlRule[];
  onSave: (pattern: string) => void;
}) {
  const [pattern, setPattern] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const problem = validatePattern(pattern, rules);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(pattern.trim());
    setPattern("");
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="input-pattern">URL pattern</FieldLabel>
        <div className="flex gap-2 items-end">
          <Input
            id="input-pattern"
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value);
              setError(null);
            }}
            placeholder="*.example.com"
            aria-invalid={!!error}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <Button type="submit" className="py-2 px-3">
            <Plus />
          </Button>
        </div>
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>
            Use <code>*</code> as a wildcard. Without a scheme or path, all are
            matched: <code>example.com</code> matches every page on example.com
            and www.example.com, <code>*.example.com</code> all subdomains.
          </FieldDescription>
        )}
      </Field>
    </form>
  );
}
