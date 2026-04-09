import * as client from "./client";
import * as mock from "./mock-client";

const useRealApi = !!import.meta.env.VITE_API_URL;
/** URL BE khi dùng API thật; rỗng khi dùng mock. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL as string) || "";
export const isUsingRealApi = useRealApi;

export const login = useRealApi ? client.login : mock.mockLogin;
export const getProfile = useRealApi ? client.getProfile : mock.mockGetProfile;
export const updateProfile = useRealApi ? client.updateProfile : mock.mockUpdateProfile;
export type { ProfileUpdate } from "./client";
export const getTasks = useRealApi ? client.getTasks : mock.mockGetTasks;
export const getTaskById = useRealApi ? client.getTaskById : mock.mockGetTaskById;
export const createTask = useRealApi ? client.createTask : mock.mockCreateTask;
export const updateTask = useRealApi ? client.updateTask : mock.mockUpdateTask;
export const deleteTask = useRealApi ? client.deleteTask : mock.mockDeleteTask;
export const getUsers = useRealApi ? client.getUsers : mock.mockGetUsers;
export const createUser = useRealApi ? client.createUser : mock.mockCreateUser;
export const toggleUserDisabled = useRealApi
  ? client.toggleUserDisabled
  : mock.mockToggleUserDisabled;
export const getDeletedUsers = useRealApi ? client.getDeletedUsers : async () => [];
export const deleteUser = useRealApi ? client.deleteUser : async () => null;
export const restoreUser = useRealApi ? client.restoreUser : async () => null;
export const getProjects = useRealApi ? client.getProjects : mock.mockGetProjects;
export const createProject = useRealApi ? client.createProject : mock.mockCreateProject;
export const updateProject = useRealApi ? client.updateProject : mock.mockUpdateProject;
export const deleteProject = useRealApi ? client.deleteProject : mock.mockDeleteProject;
export const getDeletedProjects = useRealApi ? client.getDeletedProjects : async () => [];
export const restoreProject = useRealApi ? client.restoreProject : async () => null;
export const getDeletedTasks = useRealApi ? client.getDeletedTasks : async () => [];
export const restoreTask = useRealApi ? client.restoreTask : async () => null;
export const syncTasksToSheets = useRealApi
  ? client.syncTasksToSheets
  : async () => ({ total: 0, synced: 0, skipped: 0, failed: 0, errors: [] });
export const getAutomationRules = useRealApi
  ? client.getAutomationRules
  : mock.mockGetAutomationRules;
export const createAutomationRule = useRealApi
  ? client.createAutomationRule
  : mock.mockCreateAutomationRule;
export const aiChat = useRealApi ? client.aiChat : async (message: string) => {
  // Khi dùng mock (không có BE), trả lời đơn giản.
  return `Hiện đang chạy ở chế độ mock. Bạn đã hỏi: \"${message}\".`;
};
export const clearToken = useRealApi ? client.clearToken : () => {};
