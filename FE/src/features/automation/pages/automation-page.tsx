// File: src/features/automation/pages/automation-page.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAutomationRules,
  createAutomationRule,
} from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, Plus } from "lucide-react";

export function AutomationPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: getAutomationRules,
  });

  const createMutation = useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      setOpen(false);
      setName("");
      setDescription("");
      setTrigger("");
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !trigger.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      trigger: trigger.trim(),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage reminder and automation rules"
              : "View reminder rules (read-only)"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New rule
          </Button>
        )}
      </div>

      {open && isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Create rule</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="rule-name">Name</Label>
                <Input
                  id="rule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Deadline 1 day before"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-desc">Description</Label>
                <Input
                  id="rule-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-trigger">Trigger</Label>
                <Input
                  id="rule-trigger"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="e.g. 1 day before deadline"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                Create rule
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Zap className="size-12 mb-4 opacity-50" />
            <p className="font-medium">No automation rules</p>
            <p className="text-sm">
              {isAdmin ? "Create a rule to get started." : "No rules configured yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Trigger: {rule.trigger} ·{" "}
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
