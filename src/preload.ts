import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("taskApi", {
  load: () => ipcRenderer.invoke("load"),
  save: (tasks: unknown) => ipcRenderer.invoke("save", tasks),
  confirmDelete: (title: string) => ipcRenderer.invoke("confirm-delete", title),
  onClose: (callback: () => void) => ipcRenderer.on("prepare-close", callback),
  closeReady: () => ipcRenderer.send("close-ready"),
});
