type Task = import("./store").Task;
interface Window {
  taskApi: {
    load(): Promise<{ tasks: Task[]; file: string }>;
    save(tasks: Task[]): Promise<void>;
    confirmDelete(title: string): Promise<boolean>;
    onClose(callback: () => void): void;
    closeReady(): void;
  };
}
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const list = element("list"),
  title = element<HTMLInputElement>("title"),
  body = element<HTMLTextAreaElement>("body"),
  search = element<HTMLInputElement>("search"),
  filter = element<HTMLSelectElement>("filter"),
  saveStatus = element("status");
let tasks: Task[] = [],
  selected: string | null = null,
  loaded = false,
  revision = 0,
  saved = 0;
let pending: Promise<boolean> = Promise.resolve(true);
const date = (value: string) => new Date(value).toLocaleString("ja-JP");
const current = () => tasks.find((t) => t.id === selected);
function renderList() {
  list.replaceChildren();
  const query = search.value.toLocaleLowerCase();
  const visible = tasks
    .filter(
      (t) =>
        (filter.value === "all" || t.completed === (filter.value === "done")) &&
        (t.title + "\n" + t.body).toLocaleLowerCase().includes(query),
    )
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  for (const task of visible) {
    const row = document.createElement("div");
    row.className =
      "row" +
      (task.completed ? " done" : "") +
      (task.id === selected ? " active" : "");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.completed;
    check.setAttribute("aria-label", task.title + "の完了");
    check.addEventListener("change", () => {
      task.completed = check.checked;
      changed(task);
      renderList();
    });
    const button = document.createElement("button");
    button.className = "task-select";
    button.dataset.id = task.id;
    button.setAttribute("aria-pressed", String(task.id === selected));
    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.title;
    const timestamp = document.createElement("span");
    timestamp.className = "task-date";
    timestamp.textContent =
      "作成 " + date(task.createdAt) + " / 更新 " + date(task.updatedAt);
    button.append(name, timestamp);
    button.addEventListener("click", () => select(task.id));
    row.append(check, button);
    list.append(row);
  }
  if (!visible.length) {
    const p = document.createElement("p");
    p.textContent = "該当するタスクはありません。";
    list.append(p);
  }
}
function select(id: string | null) {
  selected = id;
  const task = current();
  element("editor").hidden = !task;
  element("empty").hidden = !!task;
  if (task) {
    title.value = task.title;
    body.value = task.body;
    updateDates(task);
  }
  renderList();
}
function updateDates(task: Task) {
  element("dates").textContent =
    `作成: ${date(task.createdAt)}　更新: ${date(task.updatedAt)}`;
}
function save(): Promise<boolean> {
  if (!loaded) return Promise.resolve(false);
  const snapshot = tasks.map((t) => ({ ...t })),
    version = revision;
  pending = pending.then(async () => {
    try {
      await window.taskApi.save(snapshot);
      saved = version;
      if (saved === revision) {
        saveStatus.textContent = "保存済み";
        element("retry").hidden = true;
      }
      return true;
    } catch {
      saveStatus.textContent =
        "保存に失敗しました。アプリを閉じずに再試行してください。";
      element("retry").hidden = false;
      return false;
    }
  });
  return pending;
}
function changed(task?: Task) {
  if (task) {
    task.updatedAt = new Date().toISOString();
    if (task.id === selected) updateDates(task);
  }
  revision++;
  saveStatus.textContent = "保存中…";
  void save();
}
function openAdd() {
  if (!loaded) return;
  element("new-task").hidden = false;
  element<HTMLInputElement>("new-title").focus();
}
element("add").addEventListener("click", openAdd);
element("cancel-add").addEventListener("click", () => {
  element("new-task").hidden = true;
});
element<HTMLFormElement>("new-task").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = element<HTMLInputElement>("new-title");
  const name = input.value.trim();
  if (!name) return;
  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    title: name,
    body: "",
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  input.value = "";
  element("new-task").hidden = true;
  search.value = "";
  filter.value = "all";
  select(task.id);
  changed();
  body.focus();
});
title.addEventListener("input", () => {
  const task = current();
  if (task && title.value.trim()) {
    task.title = title.value.trim();
    changed(task);
    renderList();
  }
});
title.addEventListener("blur", () => {
  if (current()) title.value = current()!.title;
});
body.addEventListener("input", () => {
  const task = current();
  if (task) {
    task.body = body.value;
    changed(task);
    renderList();
  }
});
element("delete").addEventListener("click", async () => {
  const task = current();
  if (task && (await window.taskApi.confirmDelete(task.title))) {
    tasks = tasks.filter((t) => t.id !== task.id);
    select(tasks[0]?.id ?? null);
    changed();
  }
});
search.addEventListener("input", renderList);
filter.addEventListener("change", renderList);
element("retry").addEventListener("click", () => void save());
document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  switch (event.key.toLowerCase()) {
    case "n":
      event.preventDefault();
      openAdd();
      break;
    case "f":
      event.preventDefault();
      search.focus();
      search.select();
      break;
    case "s":
      event.preventDefault();
      void save();
      break;
  }
});
window.taskApi.onClose(async () => {
  document.body.inert = true;
  if (!loaded || saved === revision || (await save()))
    window.taskApi.closeReady();
  else document.body.inert = false;
});
window.taskApi
  .load()
  .then((result) => {
    tasks = result.tasks;
    loaded = true;
    element("path").textContent = result.file;
    saveStatus.textContent = "保存済み";
    select(tasks[0]?.id ?? null);
  })
  .catch(() => {
    saveStatus.textContent =
      "データを読み込めません。保存ファイルを確認して再起動してください。";
    element<HTMLButtonElement>("add").disabled = true;
  });
