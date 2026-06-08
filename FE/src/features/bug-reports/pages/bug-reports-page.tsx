import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  createBugReport,
  deleteBugReport,
  getBugReports,
  updateBugReportStatus,
} from "@/shared/api";
import type { BugReport, BugReportStatus } from "@/shared/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { PageHeader } from "@/app/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BugStatusBadge, bugPage } from "../components/bug-report-ui";

const bugFormSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề là bắt buộc").max(200, "Tối đa 200 ký tự"),
  content: z.string().trim().min(1, "Nội dung là bắt buộc").max(5000, "Tối đa 5000 ký tự"),
});

const STATUS_OPTIONS: { value: BugReportStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

export function BugReportsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string }>({});

  const { data: bugs = [], isLoading } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: getBugReports,
  });

  const createMutation = useMutation({
    mutationFn: createBugReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
      setTitle("");
      setContent("");
      setFormError(null);
      setFieldErrors({});
      setFormOpen(false);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : "Không tạo được bug");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BugReportStatus }) =>
      updateBugReportStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBugReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = bugFormSchema.safeParse({ title, content });
    if (!result.success) {
      const errs: { title?: string; content?: string } = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as "title" | "content";
        if (key) errs[key] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    createMutation.mutate(result.data);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={bugPage.page}>
      <PageHeader
        title="Báo bug"
        subtitle={
          isAdmin
            ? `Quản lý ${bugs.length} báo cáo từ mọi user`
            : `Danh sách ${bugs.length} bug bạn đã gửi`
        }
        actions={
          <Button className="h-11 bg-blue-600 text-white hover:bg-blue-700" onClick={() => setFormOpen((v) => !v)}>
            <Plus className="size-4 mr-2" />
            Báo bug mới
          </Button>
        }
        mobileActions={
          <Button
            className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setFormOpen((v) => !v)}
          >
            <Plus className="size-4 mr-2" />
            Báo bug mới
          </Button>
        }
      />

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Báo bug mới</CardTitle>
            <CardDescription>Mô tả lỗi càng chi tiết càng tốt. Trạng thái mặc định: To do.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {formError}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="bug-title">Tiêu đề</Label>
                <Input
                  id="bug-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Không lưu được task"
                  disabled={createMutation.isPending}
                  className="h-11"
                />
                {fieldErrors.title && (
                  <p className="text-sm text-red-600">{fieldErrors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-content">Nội dung</Label>
                <Textarea
                  id="bug-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Các bước tái hiện, ảnh chụp màn hình, lỗi console..."
                  rows={5}
                  disabled={createMutation.isPending}
                />
                {fieldErrors.content && (
                  <p className="text-sm text-red-600">{fieldErrors.content}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  className="h-11 bg-blue-600 text-white hover:bg-blue-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    "Gửi báo cáo"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setFormOpen(false);
                    setFormError(null);
                    setFieldErrors({});
                  }}
                >
                  Huỷ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {bugs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bug className="mb-4 size-12 text-gray-300" />
            <p className="font-medium text-gray-900">Chưa có bug nào</p>
            <p className="mt-1 text-sm text-gray-500">
              Bấm &quot;Báo bug mới&quot; để gửi báo cáo lỗi cho PM xử lý.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {bugs.map((bug) => (
            <BugReportCard
              key={bug.id}
              bug={bug}
              isAdmin={isAdmin}
              onStatusChange={(status) => statusMutation.mutate({ id: bug.id, status })}
              onDelete={() => {
                if (confirm("Xóa bug report này?")) deleteMutation.mutate(bug.id);
              }}
              statusPending={statusMutation.isPending}
              deletePending={deleteMutation.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BugReportCard({
  bug,
  isAdmin,
  onStatusChange,
  onDelete,
  statusPending,
  deletePending,
}: {
  bug: BugReport;
  isAdmin: boolean;
  onStatusChange: (status: BugReportStatus) => void;
  onDelete: () => void;
  statusPending: boolean;
  deletePending: boolean;
}) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{bug.title}</h3>
            <BugStatusBadge status={bug.status} />
          </div>
          {isAdmin && (
            <p className="text-xs text-gray-500">
              Người gửi: <span className="font-medium text-gray-700">{bug.userName}</span>
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm text-gray-600 [overflow-wrap:anywhere]">
            {bug.content}
          </p>
          <p className="text-xs text-gray-400">Tạo lúc {formatDate(bug.createdAt)}</p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <select
              className="h-11 min-w-[140px] rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={bug.status}
              disabled={statusPending}
              onChange={(e) => onStatusChange(e.target.value as BugReportStatus)}
              aria-label="Cập nhật trạng thái bug"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-11 border-red-200 text-red-700 hover:bg-red-50"
              disabled={deletePending}
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-1" />
              Xóa
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
