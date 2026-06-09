/// <reference types="vite/client" />

interface TaskmateDesktopConfig {
  apiUrl: string;
  webmailEmail: string;
  hasWebmailPassword: boolean;
}

interface TaskmateDesktop {
  getConfig: () => Promise<TaskmateDesktopConfig>;
  setConfig: (cfg: {
    apiUrl?: string;
    webmailEmail?: string;
    webmailPassword?: string;
  }) => Promise<{ ok: boolean }>;
  sendMail: (payload: {
    to: string[];
    subject: string;
    text: string;
    html: string;
  }) => Promise<{ sent: string[]; failed: string[] }>;
}

interface Window {
  taskmateDesktop: TaskmateDesktop;
}
