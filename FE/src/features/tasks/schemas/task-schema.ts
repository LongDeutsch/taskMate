// File: src/features/tasks/schemas/task-schema.ts
import { z } from "zod";

export const taskFormSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  status: z.enum(["Todo", "InProgress", "Done"]),
  priority: z.enum(["Low", "Medium", "High"]),
  deadline: z.string().min(1, "Deadline is required"),
  assigneeId: z.string().nullable(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
