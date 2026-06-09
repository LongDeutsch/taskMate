const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taskmateDesktop", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (cfg) => ipcRenderer.invoke("config:set", cfg),
  sendMail: (payload) => ipcRenderer.invoke("mail:send", payload),
});
