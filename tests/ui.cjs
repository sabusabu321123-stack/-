const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { mkdtemp, rm, readFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { TaskStore } = require("../dist/store");
(async () => {
  const dir = await mkdtemp(join(tmpdir(), "task-ui-")),
    store = new TaskStore(join(dir, "tasks.json"));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.exposeFunction("loadTasks", async () => ({
      tasks: await store.load(),
      file: store.file,
    }));
    await page.exposeFunction("saveTasks", (tasks) => store.save(tasks));
    await page.addInitScript(() => {
      window.allowDelete = false;
      window.taskApi = {
        load: () => window.loadTasks(),
        save: (t) => window.saveTasks(t),
        confirmDelete: async () => window.allowDelete,
        onClose: () => {},
        closeReady: () => {},
      };
    });
    await page.route("https://task.test/**", async (route) => {
      const name =
        new URL(route.request().url()).pathname.slice(1) || "index.html";
      if (!["index.html", "style.css", "renderer.js"].includes(name))
        return route.abort();
      await route.fulfill({
        body: await readFile(join(__dirname, "../dist", name)),
        contentType: name.endsWith(".html")
          ? "text/html"
          : name.endsWith(".css")
            ? "text/css"
            : "application/javascript",
      });
    });
    const open = async () => {
      await page.goto("https://task.test/index.html");
      await page.getByRole("status").filter({ hasText: "保存済み" }).waitFor();
    };
    const saved = () =>
      page.waitForFunction(
        () => document.querySelector("#status").textContent === "保存済み",
      );
    await open();
    await page.locator("#add").click();
    await page.locator("#new-title").fill("管理会社へ電話");
    await page.locator("#new-task button[type=submit]").click();
    await page
      .locator("#body")
      .fill("電話内容\n給湯器交換について\n☐ 見積作成");
    await saved();
    await page.keyboard.press("Control+n");
    await page.locator("#new-title").fill("価格表を確認");
    await page.locator("#new-task button[type=submit]").click();
    await saved();
    await page.getByRole("button", { name: /管理会社へ電話/ }).click();
    assert.match(await page.locator("#body").inputValue(), /給湯器/);
    await page.locator("#title").fill("管理会社へ連絡");
    await saved();
    await page.locator("#search").fill("給湯器");
    assert.equal(await page.locator(".row").count(), 1);
    await page.locator("#search").fill("");
    await page.getByRole("checkbox", { name: "管理会社へ連絡の完了" }).check();
    await saved();
    await page.locator("#filter").selectOption("done");
    assert.equal(await page.locator(".row").count(), 1);
    await page.reload();
    await saved();
    await page.getByRole("button", { name: /管理会社へ連絡/ }).click();
    assert.match(await page.locator("#body").inputValue(), /☐ 見積作成/);
    assert.equal(
      await page
        .getByRole("checkbox", { name: "管理会社へ連絡の完了" })
        .isChecked(),
      true,
    );
    await page.locator("#delete").click();
    assert.equal(await page.locator(".row").count(), 2);
    await page.evaluate(() => (window.allowDelete = true));
    await page.locator("#delete").click();
    await saved();
    assert.equal(await page.locator(".row").count(), 1);
    await page.keyboard.press("Control+f");
    assert.equal(
      await page
        .locator("#search")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await page.keyboard.press("Control+s");
    await saved();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 追加、選択、日本語複数行入力、名前編集、自動保存、再読み込み復元、完了、検索、フィルター、削除キャンセル・確定、ショートカット",
    );
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
