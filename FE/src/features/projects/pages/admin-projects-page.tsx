// File: src/features/projects/pages/admin-projects-page.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/shared/types";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  deleteAllProjects,
} from "@/shared/api";
import { Button } from "@/components/ui/button";
import { ProjectFormDrawer } from "../components/project-form-drawer";
import {
  MembersLink,
  ProjectDescription,
  pj,
} from "../components/projects-ui";
import {
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/app/components/page-header";
import { FloatingActionButton } from "@/app/components/floating-action-button";
import { OverflowActionsMenu } from "@/app/components/overflow-actions-menu";

export function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string } }) =>
      updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllProjects,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "trash"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "trash"] });
    },
  });

  const drawerOpen = createOpen || !!editing;
  const formPending = createMutation.isPending || updateMutation.isPending;

  function closeDrawer() {
    setCreateOpen(false);
    setEditing(null);
    setName("");
    setDescription("");
  }

  function openCreate() {
    setEditing(null);
    setCreateOpen(true);
    setName("");
    setDescription("");
  }

  function openEdit(project: Project) {
    setCreateOpen(false);
    setEditing(project);
    setName(project.name);
    setDescription(project.description);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), description: description.trim() };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const showList = projects.length > 0;
  const showEmpty = projects.length === 0;
  const showNoResults = showList && filteredProjects.length === 0;

  return (
    <div className={pj.page}>
      <PageHeader
        title="Projects"
        subtitle={`Quản lý dự án${
          showList
            ? ` · ${filteredProjects.length}${search.trim() ? ` / ${projects.length}` : ""} hiển thị`
            : ""
        }`}
        actions={
          <>
            <Button
              variant="outline"
              className="h-11 border-red-200 text-red-700 hover:bg-red-50"
              disabled={projects.length === 0 || deleteAllMutation.isPending}
              onClick={() => {
                if (
                  !confirm(
                    `Xóa tất cả ${projects.length} project? Mọi task đang active cũng vào thùng rác 5 ngày.`
                  )
                ) {
                  return;
                }
                deleteAllMutation.mutate();
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Xóa tất cả
            </Button>
            <Button className={cn(pj.primaryBtn, "h-11")} onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              New project
            </Button>
          </>
        }
        mobileActions={
          <OverflowActionsMenu
            actions={[
              {
                label: "Xóa tất cả",
                destructive: true,
                disabled: projects.length === 0 || deleteAllMutation.isPending,
                onClick: () => {
                  if (
                    !confirm(
                      `Xóa tất cả ${projects.length} project? Mọi task đang active cũng vào thùng rác 5 ngày.`
                    )
                  ) {
                    return;
                  }
                  deleteAllMutation.mutate();
                },
              },
            ]}
          />
        }
      />

      <FloatingActionButton
        label="New project"
        icon={<Plus className="size-6" />}
        onClick={openCreate}
      />

      {showList && (
        <div className={pj.surface}>
          <div className={pj.toolbar}>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                className={pj.search}
                placeholder="Tìm theo tên hoặc mô tả..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm project"
              />
            </div>
          </div>
        </div>
      )}

      {showEmpty && (
        <div
          className={`${pj.surface} flex flex-col items-center justify-center px-6 py-16 text-center`}
        >
          <FolderKanban className="mb-4 size-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-900">Chưa có project</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Tạo project đầu tiên để nhóm task theo dự án và quản lý thành viên.
          </p>
          <Button className={cn(pj.primaryBtn, "mt-6")} onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            New project
          </Button>
        </div>
      )}

      {showNoResults && (
        <div className={`${pj.surface} px-6 py-12 text-center`}>
          <p className="text-sm text-gray-500">
            Không tìm thấy project cho &quot;{search.trim()}&quot;.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-blue-600"
            onClick={() => setSearch("")}
          >
            Xóa bộ lọc
          </Button>
        </div>
      )}

      {!showEmpty && !showNoResults && (
        <ul className="space-y-3">
          {filteredProjects.map((project) => (
            <li
              key={project.id}
              className={cn(
                pj.projectCard,
                editing?.id === project.id && pj.projectCardActive
              )}
            >
              <div className="flex flex-col gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="text-base font-semibold text-gray-900 hover:text-[#2563EB] sm:text-lg"
                  >
                    {project.name}
                  </Link>
                  <ProjectDescription description={project.description} />
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 sm:border-0 sm:pt-0 sm:justify-end">
                  <MembersLink projectId={project.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={pj.iconBtnPrimary}
                    onClick={() => openEdit(project)}
                    title="Chỉnh sửa"
                    aria-label="Chỉnh sửa"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={pj.iconBtnDanger}
                    title="Xóa project"
                    aria-label="Xóa project"
                    onClick={() => {
                      if (
                        confirm(
                          "Xóa project này? Tất cả task thuộc project sẽ bị xóa."
                        )
                      ) {
                        deleteMutation.mutate(project.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProjectFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        mode={createOpen ? "create" : "edit"}
        name={name}
        description={description}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onSubmit={handleSubmit}
        isPending={formPending}
      />
    </div>
  );
}
