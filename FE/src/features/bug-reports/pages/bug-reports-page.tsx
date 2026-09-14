import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Loader2, Plus, Search, SearchX, Trash2, X } from "lucide-react";
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
import { toast } from "@/shared/lib/toast";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/utils";

const bugFormSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề là bắt buộc").max(200, "Tối đa 200 ký tự"),
  content: z.string().trim().min(1, "Nội dung là bắt buộc").max(5000, "Tối đa 5000 ký tự"),
});

const STATUS_OPTIONS: { value: BugReportStatus; label: string }[] = [
  { value: "todo", label: "Cần làm (To do)" },
  { value: "in_progress", label: "Đang xử lý (In progress)" },
  { value: "done", label: "Hoàn thành (Done)" },
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BugReportStatus>("all");

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
      toast.success("Báo cáo lỗi đã được gửi thành công!");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không tạo được bug";
      setFormError(msg);
      toast.error("Lỗi gửi báo cáo", msg);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BugReportStatus }) =>
      updateBugReportStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
      toast.success("Đã cập nhật trạng thái bug!");
    },
    onError: (err) => {
      toast.error("Lỗi cập nhật trạng thái", err instanceof Error ? err.message : undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBugReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
      toast.success("Đã xóa báo cáo bug!");
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      toast.error("Lỗi xóa báo cáo", err instanceof Error ? err.message : undefined);
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

  const counts = {
    all: bugs.length,
    todo: bugs.filter((b) => b.status === "todo").length,
    in_progress: bugs.filter((b) => b.status === "in_progress").length,
    done: bugs.filter((b) => b.status === "done").length,
  };

  const filteredBugs = bugs.filter((bug) => {
    if (statusFilter !== "all" && bug.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      bug.title.toLowerCase().includes(q) ||
      bug.content.toLowerCase().includes(q) ||
      (bug.userName && bug.userName.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={bugPage.page}>
      <PageHeader
        title="Báo bug"
        subtitle={
          isAdmin
            ? `Quản lý ${bugs.length} báo cáo lỗi từ các thành viên`
            : `Danh sách ${bugs.length} báo cáo lỗi bạn đã gửi`
        }
        actions={
          <Button className="h-10 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setFormOpen((v) => !v)}>
            <Plus className="size-4 mr-2" />
            Báo bug mới
          </Button>
        }
        mobileActions={
          <Button
            className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
            <CardDescription>Mô tả lỗi càng chi tiết càng tốt. Trạng thái mặc định: Cần làm.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="bug-title">Tiêu đề</Label>
                <Input
                  id="bug-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Không lưu được task khi deadline rỗng"
                  disabled={createMutation.isPending}
                  className="h-10"
                />
                {fieldErrors.title && (
                  <p className="text-sm text-destructive">{fieldErrors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-content">Nội dung</Label>
                <Textarea
                  id="bug-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Các bước tái hiện, ảnh chụp màn hình, log lỗi..."
                  rows={5}
                  disabled={createMutation.isPending}
                />
                {fieldErrors.content && (
                  <p className="text-sm text-destructive">{fieldErrors.content}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
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

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bug theo tiêu đề, nội dung, người gửi..."
                className="h-10 pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {searchQuery.trim() || statusFilter !== "all"
                ? `Hiển thị ${filteredBugs.length} / ${bugs.length} báo cáo`
                : `Tổng cộng ${bugs.length} báo cáo`}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { key: "all", label: "Tất cả", count: counts.all },
              { key: "todo", label: "Cần làm", count: counts.todo },
              { key: "in_progress", label: "Đang xử lý", count: counts.in_progress },
              { key: "done", label: "Hoàn thành", count: counts.done },
            ].map(({ key, label, count }) => {
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key as "all" | BugReportStatus)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px]",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bugs list */}
      {bugs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bug className="mb-4 size-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">Chưa có bug nào</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bấm &quot;Báo bug mới&quot; để gửi báo cáo lỗi cho PM xử lý.
            </p>
          </CardContent>
        </Card>
      ) : filteredBugs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <SearchX className="mb-3 size-10 text-muted-foreground/60" />
            <p className="font-medium text-foreground">Không tìm thấy báo cáo lỗi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Không có bug nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Đặt lại bộ lọc
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filteredBugs.map((bug) => (
            <BugReportCard
              key={bug.id}
              bug={bug}
              isAdmin={isAdmin}
              onStatusChange={(status) => statusMutation.mutate({ id: bug.id, status })}
              onDelete={() => setDeleteConfirmId(bug.id)}
              statusPending={statusMutation.isPending}
              deletePending={deleteMutation.isPending}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Xóa báo cáo bug?"
        message="Bạn có chắc chắn muốn xóa báo cáo lỗi này? Thao tác này không thể hoàn tác."
        variant="danger"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
        }}
      />
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
    <li className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:bg-accent/20 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{bug.title}</h3>
            <BugStatusBadge status={bug.status} />
          </div>
          {isAdmin && (
            <p className="text-xs text-muted-foreground">
              Người gửi: <span className="font-medium text-foreground">{bug.userName}</span>
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {bug.content}
          </p>
          <p className="text-xs text-muted-foreground/70">Tạo lúc {formatDate(bug.createdAt)}</p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <select
              className="h-10 min-w-[160px] rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors"
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
              className="h-10 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              disabled={deletePending}
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-1.5" />
              Xóa
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
