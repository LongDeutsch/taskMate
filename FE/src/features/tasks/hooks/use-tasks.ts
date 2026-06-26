// File: src/features/tasks/hooks/use-tasks.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TaskPriority, TaskStatus } from "@/shared/types";
import { getTasks } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";

/**
 * "My Tasks" view: luôn lọc theo `assigneeId === user.id`, kể cả admin —
 * để admin chỉ thấy task tự note cho chính mình tại trang My Tasks.
 * Admin muốn xem toàn bộ tasks dùng /admin/tasks.
 */
export function useTasks(filters: {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  sortBy?: "deadline" | "createdAt" | "priority";
}) {
  const { user } = useAuth();
  const assigneeId = user?.id;

  return useQuery({
    queryKey: ["tasks", { ...filters, assigneeId }],
    queryFn: () => getTasks({ ...filters, assigneeId }),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}
