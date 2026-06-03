// File: src/features/tasks/schemas/task-schema.ts
import { z } from "zod";

/**
 * `projectId` để rỗng được — khi đó form xử lý sẽ tự gửi null cho self-note,
 * còn task thường vẫn được validate "bắt buộc" trong code (vì zod không biết
 * đang là self-note hay không).
 */
export const taskFormSchema = z.object({
  projectId: z.string().default(""),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  feedback: z.string().max(5000, "Feedback is too long").default(""),
  status: z.enum(["Todo", "InProgress", "Done"]),
  priority: z.enum(["Low", "Medium", "High"]),
  deadline: z.string().min(1, "Deadline is required"),
  assigneeId: z.string().nullable(),
  collaboratorIds: z.array(z.string()).default([]),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
