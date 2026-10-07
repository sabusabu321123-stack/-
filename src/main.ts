import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import { join } from "node:path";
import { TaskStore } from "./store";

if (!app.requestSingleInstanceLock()) app.quit();
else {
  let window: BrowserWindow | null = null;
  let allowClose = false;
  app.on("second-instance", () => {
    window?.restore();
    window?.focus();
  });
  app.whenReady().then(() => {
    const file = join(app.getPath("userData"), "data", "tasks.json");
    const store = new TaskStore(file);
    ipcMain.handle("load", async () => ({ tasks: await store.load(), file }));
    ipcMain.handle("save", (_, tasks: unknown) => store.save(tasks));
    ipcMain.handle("confirm-delete", async (_, title: string) => {
      const result = await dialog.showMessageBox(window!, {
        type: "question",
        buttons: ["キャンセル", "削除"],
        defaultId: 0,
        cancelId: 0,
        message: "このタスクを削除しますか？",
        detail: String(title),
      });
      return result.response === 1;
    });
    ipcMain.on("close-ready", () => {
      allowClose = true;
      window?.close();
    });
    window = new BrowserWindow({
      width: 1100,
      height: 750,
      minWidth: 760,
      minHeight: 500,
      title: "タスク＋テキスト",
      webPreferences: {
        preload: join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "編集",
          submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" },
          ],
        },
      ]),
    );
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.on("close", (event) => {
      if (!allowClose) {
        event.preventDefault();
        window?.webContents.send("prepare-close");
      }
    });
    window.loadFile(join(__dirname, "index.html"));
  });
  app.on("window-all-closed", () => app.quit());
}
