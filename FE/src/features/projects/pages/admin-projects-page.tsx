// File: src/features/projects/pages/admin-projects-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/shared/types";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Pencil, Trash2, FolderKanban, Users } from "lucide-react";

export function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setCreateOpen(false);
      setName("");
      setDescription("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string } }) =>
      updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditing(null);
      setName("");
      setDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

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
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { name: name.trim(), description: description.trim() } });
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim() });
    }
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Quản lý dự án – Admin là người quản lý dự án</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New project
        </Button>
      </div>

      {(createOpen || editing) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? "Edit project" : "New project"}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreateOpen(false);
                setEditing(null);
                setName("");
                setDescription("");
              }}
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TaskMate App"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-desc">Description</Label>
                <Input
                  id="project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                />
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || !name.trim()}
              >
                {editing ? "Update" : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 && !createOpen && !editing ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FolderKanban className="size-12 mb-4 opacity-50" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm">Create a project to organize tasks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{project.description || "—"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/projects/${project.id}`}>
                      <Users className="size-4" />
                      Thành viên
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(project)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this project? All its tasks will be removed."))
                        deleteMutation.mutate(project.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
