const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, readFile, writeFile, rm } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { TaskStore } = require("../dist/store");
const task = {
  id: "1",
  title: "管理会社へ電話",
  body: "電話内容\n☐ 見積作成",
  completed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
test("追加・連続保存・再起動後復元・完了・削除", async () => {
  const dir = await mkdtemp(join(tmpdir(), "task-store-"));
  try {
    const file = join(dir, "data", "tasks.json"),
      store = new TaskStore(file);
    assert.deepEqual(await store.load(), []);
    await Promise.all([
      store.save([task]),
      store.save([{ ...task, body: "日本語の更新\n2行目", completed: true }]),
    ]);
    const restored = await new TaskStore(file).load();
    assert.equal(restored[0].body, "日本語の更新\n2行目");
    assert.equal(restored[0].completed, true);
    await store.save([]);
    assert.deepEqual(await new TaskStore(file).load(), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("破損データを空データとして扱わず保持する", async () => {
  const dir = await mkdtemp(join(tmpdir(), "task-corrupt-"));
  try {
    const file = join(dir, "tasks.json");
    await writeFile(file, "broken");
    await assert.rejects(new TaskStore(file).load());
    assert.equal(await readFile(file, "utf8"), "broken");
    assert.throws(() =>
      new TaskStore(file).save([{ ...task, completed: "yes" }]),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
