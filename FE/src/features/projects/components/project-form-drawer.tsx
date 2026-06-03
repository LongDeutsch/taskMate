import type { FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskDetailDrawer } from "@/features/tasks/components/task-detail-overlay";
import { pj } from "./projects-ui";

type ProjectFormDrawerProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
};

export function ProjectFormDrawer({
  open,
  onClose,
  mode,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  isPending,
}: ProjectFormDrawerProps) {
  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" disabled={isPending} onClick={onClose}>
        Huỷ
      </Button>
      <Button
        type="submit"
        form="project-form"
        className={pj.primaryBtn}
        disabled={isPending || !name.trim()}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="size-4 mr-2" />
            {mode === "create" ? "Tạo project" : "Lưu thay đổi"}
          </>
        )}
      </Button>
    </div>
  );

  return (
    <TaskDetailDrawer
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Project mới" : "Chỉnh sửa project"}
      subtitle="Tên và mô tả ngắn để nhóm task theo dự án"
      footer={footer}
      panelClassName="w-full max-w-[min(100vw,520px)]"
    >
      <form id="project-form" onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="project-name" className="text-sm font-medium text-gray-700">
            Tên project
          </Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="VD: TaskMate App"
            className="h-10 rounded-lg border-[#E5E7EB] shadow-sm"
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-desc" className="text-sm font-medium text-gray-700">
            Mô tả
          </Label>
          <textarea
            id="project-desc"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Mô tả ngắn về dự án..."
            rows={4}
            className="min-h-[88px] max-h-[160px] w-full resize-y overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </form>
    </TaskDetailDrawer>
  );
}
