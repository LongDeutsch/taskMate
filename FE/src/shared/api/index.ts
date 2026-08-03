import * as client from "./client";
import * as mock from "./mock-client";

const useRealApi = !!import.meta.env.VITE_API_URL;
/** URL BE khi dùng API thật; rỗng khi dùng mock. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL as string) || "";
export const isUsingRealApi = useRealApi;
export const wakeApi = useRealApi ? client.wakeApi : async () => true;

export const login = useRealApi ? client.login : mock.mockLogin;
export const getProfile = useRealApi ? client.getProfile : mock.mockGetProfile;
export const getTodayBirthdays = useRealApi ? client.getTodayBirthdays : mock.mockGetTodayBirthdays;
export const updateProfile = useRealApi ? client.updateProfile : mock.mockUpdateProfile;
export type { ProfileUpdate, CreateTimeOffResult } from "./client";
export const getTasks = useRealApi ? client.getTasks : mock.mockGetTasks;
export const getTaskById = useRealApi ? client.getTaskById : mock.mockGetTaskById;
export const createTask = useRealApi ? client.createTask : mock.mockCreateTask;
export const updateTask = useRealApi ? client.updateTask : mock.mockUpdateTask;
export const deleteTask = useRealApi ? client.deleteTask : mock.mockDeleteTask;
export const deleteAllTasks = useRealApi ? client.deleteAllTasks : async () => 0;
export const getUsers = useRealApi ? client.getUsers : mock.mockGetUsers;
export const getUserById = useRealApi ? client.getUserById : mock.mockGetUserById;
export const createUser = useRealApi ? client.createUser : mock.mockCreateUser;
export const toggleUserDisabled = useRealApi
  ? client.toggleUserDisabled
  : mock.mockToggleUserDisabled;
export const getDeletedUsers = useRealApi ? client.getDeletedUsers : async () => [];
export const deleteUser = useRealApi ? client.deleteUser : async () => null;
export const deleteAllUsers = useRealApi ? client.deleteAllUsers : async () => 0;
export const restoreUser = useRealApi ? client.restoreUser : async () => null;
export const getProjects = useRealApi ? client.getProjects : mock.mockGetProjects;
export const createProject = useRealApi ? client.createProject : mock.mockCreateProject;
export const updateProject = useRealApi ? client.updateProject : mock.mockUpdateProject;
export const deleteProject = useRealApi ? client.deleteProject : mock.mockDeleteProject;
export const deleteAllProjects = useRealApi ? client.deleteAllProjects : async () => 0;
export const getDeletedProjects = useRealApi ? client.getDeletedProjects : async () => [];
export const restoreProject = useRealApi ? client.restoreProject : async () => null;
export const getDeletedTasks = useRealApi ? client.getDeletedTasks : async () => [];
export const restoreTask = useRealApi ? client.restoreTask : async () => null;
export const userUpdateTask = useRealApi
  ? client.userUpdateTask
  : (async (id: string, data: { status: import("@/shared/types").TaskStatus }) => {
      void id;
      void data;
      throw new Error("userUpdateTask không khả dụng ở chế độ mock");
    });
export const saveResponseDraft = useRealApi
  ? client.saveResponseDraft
  : (async (id: string, draft: string) => {
      void id;
      void draft;
      throw new Error("saveResponseDraft không khả dụng ở chế độ mock");
    });
export const sendResponse = useRealApi
  ? client.sendResponse
  : (async (id: string, content: string) => {
      void id;
      void content;
      throw new Error("sendResponse không khả dụng ở chế độ mock");
    });
export const undoResponse = useRealApi
  ? client.undoResponse
  : (async (id: string, undoToken: string) => {
      void id;
      void undoToken;
      throw new Error("undoResponse không khả dụng ở chế độ mock");
    });
export const getAutomationRules = useRealApi
  ? client.getAutomationRules
  : mock.mockGetAutomationRules;
export const createAutomationRule = useRealApi
  ? client.createAutomationRule
  : mock.mockCreateAutomationRule;
export const getNotifications = useRealApi
  ? client.getNotifications
  : async () => ({ items: [], unreadCount: 0 });
export const markNotificationRead = useRealApi
  ? client.markNotificationRead
  : async () => false;
export const markAllNotificationsRead = useRealApi
  ? client.markAllNotificationsRead
  : async () => 0;
export const getHookEvents = useRealApi ? client.getHookEvents : async () => [];
export type { HookEventItem } from "./client";
export const clearToken = useRealApi ? client.clearToken : () => {};

export const createTimeOff = useRealApi
  ? client.createTimeOff
  : async () => {
      throw new Error("Time-off không khả dụng ở chế độ mock");
    };
export const getTimeOffRecipients = useRealApi ? client.getTimeOffRecipients : async () => [];
export const getMyTimeOffs = useRealApi ? client.getMyTimeOffs : async () => [];
export const getAllTimeOffs = useRealApi ? client.getAllTimeOffs : async () => [];
export const cancelTimeOff = useRealApi
  ? client.cancelTimeOff
  : async () => false;
export const setTimeOffStatus = useRealApi
  ? client.setTimeOffStatus
  : async () => {
      throw new Error("Time-off không khả dụng ở chế độ mock");
    };

export const getBugReports = useRealApi ? client.getBugReports : async () => [];
export const getBugReportById = useRealApi ? client.getBugReportById : async () => null;
export const getOpenBugReports = useRealApi ? client.getOpenBugReports : async () => [];
export const updateBugReport = useRealApi
  ? client.updateBugReport
  : async () => {
      throw new Error("Báo bug không khả dụng ở chế độ mock");
    };
export const createBugReport = useRealApi
  ? client.createBugReport
  : async () => {
      throw new Error("Báo bug không khả dụng ở chế độ mock");
    };
export const updateBugReportStatus = useRealApi
  ? client.updateBugReportStatus
  : async () => {
      throw new Error("Báo bug không khả dụng ở chế độ mock");
    };
export const deleteBugReport = useRealApi
  ? client.deleteBugReport
  : async () => false;
