import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateTask } from "@/shared/api";
import type { Task } from "@/shared/types";
import { AutoResizeTextarea } from "./auto-resize-textarea";
import { TaskDetailDrawer } from "./task-detail-overlay";
import { td } from "./task-detail-ui";

type FeedbackEditDrawerProps = {
  open: boolean;
  onClose: () => void;
  task: Task;
  onSaved?: () => void;
};

export function FeedbackEditDrawer({
  open,
  onClose,
  task,
  onSaved,
}: FeedbackEditDrawerProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(task.feedback ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(task.feedback ?? "");
      setError(null);
    }
  }, [open, task.feedback]);

  const mut = useMutation({
    mutationFn: (value: string) => updateTask(task.id, { feedback: value }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      onSaved?.();
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Lưu thất bại"),
  });

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-[#6B7280]">{draft.length}/5000 ký tự</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" disabled={mut.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button
          className={td.primaryBtn}
          disabled={mut.isPending || draft === (task.feedback ?? "")}
          onClick={() => mut.mutate(draft)}
        >
          {mut.isPending ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="size-4 mr-1" />
              Lưu feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <TaskDetailDrawer
      open={open}
      onClose={onClose}
      title="Chỉnh sửa feedback"
      subtitle="Gửi hoặc cập nhật feedback cho thành viên thực hiện"
      footer={footer}
      panelClassName="w-full max-w-[min(100vw,640px)]"
    >
      <AutoResizeTextarea
        className="bg-white focus:ring-2 focus:ring-violet-400/40"
        minRows={8}
        maxLength={5000}
        placeholder="Viết feedback cho thành viên thực hiện..."
        value={draft}
        disabled={mut.isPending}
        onChange={(e) => setDraft(e.target.value)}
      />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </TaskDetailDrawer>
  );
}
