import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";

export interface Task {
  id: string;
  title: string;
  body: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
export function validate(value: unknown): Task[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (t) =>
        !t ||
        typeof t.id !== "string" ||
        !t.id ||
        typeof t.title !== "string" ||
        !t.title.trim() ||
        typeof t.body !== "string" ||
        typeof t.completed !== "boolean" ||
        typeof t.createdAt !== "string" ||
        !Number.isFinite(Date.parse(t.createdAt)) ||
        typeof t.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(t.updatedAt)),
    ) ||
    new Set(value.map((t) => t.id)).size !== value.length
  )
    throw new Error("保存データの形式が正しくありません。");
  return value.map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    completed: t.completed,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}
export class TaskStore {
  private pending: Promise<void> = Promise.resolve();
  constructor(readonly file: string) {}
  async load(): Promise<Task[]> {
    try {
      return validate(JSON.parse(await readFile(this.file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  save(value: unknown): Promise<void> {
    const data = JSON.stringify(validate(value), null, 2) + "\n";
    const operation = this.pending.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      await writeFile(this.file + ".tmp", data, "utf8");
      await rename(this.file + ".tmp", this.file);
    });
    this.pending = operation.catch(() => {});
    return operation;
  }
}
