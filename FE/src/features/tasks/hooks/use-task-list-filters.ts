import { useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { TaskPriority, TaskStatus } from "@/shared/types";

export type TaskSortBy = "deadline" | "createdAt" | "priority";

export interface TaskListFilterValues {
  project: string;
  assignee: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  sort: TaskSortBy;
  search: string;
  noteOnly: boolean;
}

const STATUS_VALUES: TaskStatus[] = ["Todo", "InProgress", "Done"];
const PRIORITY_VALUES: TaskPriority[] = ["Low", "Medium", "High"];
const SORT_VALUES: TaskSortBy[] = ["deadline", "createdAt", "priority"];

function parseStatus(raw: string | null, fallback: TaskStatus | ""): TaskStatus | "" {
  if (raw === null) return fallback;
  if (raw === "") return "";
  return STATUS_VALUES.includes(raw as TaskStatus) ? (raw as TaskStatus) : fallback;
}

function parsePriority(raw: string | null, fallback: TaskPriority | ""): TaskPriority | "" {
  if (raw === null) return fallback;
  if (raw === "") return "";
  return PRIORITY_VALUES.includes(raw as TaskPriority) ? (raw as TaskPriority) : fallback;
}

function parseSort(raw: string | null, fallback: TaskSortBy): TaskSortBy {
  if (raw === null) return fallback;
  return SORT_VALUES.includes(raw as TaskSortBy) ? (raw as TaskSortBy) : fallback;
}

function parseNoteOnly(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback;
  return raw === "1" || raw === "true";
}

function parseFromUrl(
  params: URLSearchParams,
  defaults: TaskListFilterValues,
  options: { includeAssignee: boolean; includeNoteOnly: boolean }
): TaskListFilterValues {
  const hasAny = params.toString().length > 0;
  return {
    project: params.get("project") ?? defaults.project,
    assignee: options.includeAssignee ? params.get("assignee") ?? defaults.assignee : defaults.assignee,
    status: parseStatus(params.get("status"), hasAny ? "" : defaults.status),
    priority: parsePriority(params.get("priority"), defaults.priority),
    sort: parseSort(params.get("sort"), defaults.sort),
    search: params.get("search") ?? defaults.search,
    noteOnly: options.includeNoteOnly
      ? parseNoteOnly(params.get("noteOnly"), defaults.noteOnly)
      : defaults.noteOnly,
  };
}

function toSearchParams(
  filters: TaskListFilterValues,
  options: { includeAssignee: boolean; includeNoteOnly: boolean }
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.project) params.set("project", filters.project);
  if (options.includeAssignee && filters.assignee) params.set("assignee", filters.assignee);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  params.set("sort", filters.sort);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (options.includeNoteOnly && filters.noteOnly) params.set("noteOnly", "1");
  return params;
}

export interface UseTaskListFiltersOptions {
  defaults: TaskListFilterValues;
  includeAssignee?: boolean;
  includeNoteOnly?: boolean;
}

export function useTaskListFilters({
  defaults,
  includeAssignee = false,
  includeNoteOnly = false,
}: UseTaskListFiltersOptions) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const parseOptions = useMemo(
    () => ({ includeAssignee, includeNoteOnly }),
    [includeAssignee, includeNoteOnly]
  );

  const filters = useMemo(
    () => parseFromUrl(searchParams, defaults, parseOptions),
    [searchParams, defaults, parseOptions]
  );

  const replaceFilters = useCallback(
    (patch: Partial<TaskListFilterValues>) => {
      setSearchParams(
        (prev) => {
          const current = parseFromUrl(prev, defaults, parseOptions);
          return toSearchParams({ ...current, ...patch }, parseOptions);
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults, parseOptions]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      toSearchParams(
        { ...defaults, project: "", assignee: "", status: "", priority: "", search: "", noteOnly: false },
        parseOptions
      ),
      { replace: true }
    );
  }, [setSearchParams, defaults, parseOptions]);

  const listPathWithFilters = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  }, [location.pathname, searchParams]);

  const taskDetailPath = useCallback(
    (taskId: string) => {
      const params = new URLSearchParams();
      params.set("returnTo", listPathWithFilters);
      return `/tasks/${taskId}?${params.toString()}`;
    },
    [listPathWithFilters]
  );

  return {
    filters,
    setProject: (project: string) => replaceFilters({ project }),
    setAssignee: (assignee: string) => replaceFilters({ assignee }),
    setStatus: (status: TaskStatus | "") => replaceFilters({ status }),
    setPriority: (priority: TaskPriority | "") => replaceFilters({ priority }),
    setSort: (sort: TaskSortBy) => replaceFilters({ sort }),
    setSearch: (search: string) => replaceFilters({ search }),
    setNoteOnly: (noteOnly: boolean) => replaceFilters({ noteOnly }),
    resetFilters,
    taskDetailPath,
  };
}

/** Đường dẫn nội bộ an toàn từ query `returnTo`. */
export function parseTaskReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}
