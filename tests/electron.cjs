const { _electron: electron } = require("playwright");
const { mkdtemp, rm, readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const assert = require("node:assert/strict");
(async () => {
  const dir = await mkdtemp(join(tmpdir(), "task-electron-"));
  let app;
  const launch = async () => {
    app = await electron.launch({
      args: [join(__dirname, ".."), "--no-sandbox"],
      env: { ...process.env, XDG_CONFIG_HOME: dir },
    });
    const page = await app.firstWindow();
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "保存済み",
    );
    return page;
  };
  try {
    let page = await launch();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.locator("#add").click();
    await page.locator("#new-title").fill("Electron実機確認");
    await page.locator("#new-task button[type=submit]").click();
    await page.locator("#body").fill("日本語の本文\n再起動後も残す");
    const file = await page.locator("#path").textContent();
    assert.ok(file.startsWith(dir));
    // 保存完了を待たずに閉じ、終了時の保存処理を検証する。
    const closed = app.waitForEvent("close");
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].close(),
    );
    await closed;
    app = null;
    assert.equal(
      JSON.parse(await readFile(file, "utf8"))[0].body,
      "日本語の本文\n再起動後も残す",
    );
    page = await launch();
    assert.equal(await page.locator("#title").inputValue(), "Electron実機確認");
    assert.equal(
      await page.locator("#body").inputValue(),
      "日本語の本文\n再起動後も残す",
    );
    await page.getByRole("checkbox").check();
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "保存済み",
    );
    assert.equal(JSON.parse(await readFile(file, "utf8"))[0].completed, true);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Electron起動、IPC、日本語本文保存、終了時保存、実プロセス再起動後の復元、完了保存",
    );
  } finally {
    if (app) await app.close();
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
