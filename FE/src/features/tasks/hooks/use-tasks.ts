// File: src/features/tasks/hooks/use-tasks.ts
import { useQuery } from "@tanstack/react-query";
import type { TaskStatus } from "@/shared/types";
import { getTasks } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function useTasks(filters: {
  status?: TaskStatus;
  search?: string;
  projectId?: string;
  sortBy?: "deadline" | "createdAt";
}) {
  const { user, isAdmin } = useAuth();
  const assigneeId = isAdmin ? undefined : user?.id;

  return useQuery({
    queryKey: ["tasks", { ...filters, assigneeId }],
    queryFn: () => getTasks({ ...filters, assigneeId }),
  });
}
