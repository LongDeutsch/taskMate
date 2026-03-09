// File: src/features/tasks/hooks/use-task.ts
import { useQuery } from "@tanstack/react-query";
import { getTaskById } from "@/shared/api";

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => (id ? getTaskById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}
