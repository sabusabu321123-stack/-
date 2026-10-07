# タスク＋テキスト

Windows PCでローカル利用する、Electron＋TypeScript製の小さなデスクトップアプリです。アカウント、クラウド、データベースは使いません。

## Windowsで起動

Node.js 24 LTSとGitをインストールし、このリポジトリのフォルダでPowerShellを開きます。

```powershell
npm ci
npm start
```

Electron 42では初回起動時にElectron本体をダウンロードする場合があります。初回セットアップと配布用ビルドにはインターネット接続が必要です。セットアップ後のタスク操作・保存はオフラインで使えます。

Windows 10以降の64ビットPCを想定しています。日本語変換にはWindowsのIMEをそのまま使います。

## Windowsインストーラーを作る

Windows上で次を実行してください。

```powershell
npm run package:win
```

`release/` に生成される `Task Text Editor Setup 1.0.0.exe` を実行してインストールします。インストール後の利用にNode.jsは不要です。署名証明書は設定していないので、個人利用向けの未署名インストーラーになります。

インストール不要のZIP版は `npm run package:win:zip` で作成できます。ZIP全体を展開して `Task Text Editor.exe` を起動してください。実行ファイルだけを別フォルダに移さず、同梱ファイルと一緒に使います。

## 操作

- 左の「＋タスク追加」で名前を入力すると、そのタスクが選択されます。
- 中央上部で名前、中央のエディタで本文を編集します。変更は自動保存されます。
- 左のチェックボックスで完了を切り替えます。未完了が上、完了が下、それぞれ作成日時の新しい順です。
- 検索は名前と本文を対象にします。「すべて／未完了／完了」で絞り込めます。
- 「削除」は確認ダイアログで確定したときだけ削除します。
- Ctrl+Nで追加、Ctrl+Fで検索、Ctrl+Sで補助的な手動保存ができます。
- 本文は普通の複数行テキストです。コピー・貼り付け、元に戻す・やり直しは標準の編集メニューとショートカットを使用します。`☐` / `☑` は文字として入力できますが、本文内のクリック式チェックボックスはありません。

保存エラーが出た場合はアプリを閉じずに「保存を再試行」を押してください。終了時にも保存を待ち、失敗した場合は閉じる処理を中止します。

## データ保存場所

Electronのユーザーデータフォルダ内の `data/tasks.json` にUTF-8のJSONとして保存します。**正確な絶対パスは画面下部に表示**されます。開発起動時のWindowsでの標準パスは次のとおりです。

```text
%APPDATA%\task-text-editor\data\tasks.json
```

配布版ではアプリ名により親フォルダ名が変わる場合があります。リポジトリやインストール先の変更ではタスクは消えません。バックアップ・移行はアプリを終了した状態でこのファイルをコピーしてください。名前、本文、完了状態、作成日時、更新日時を保存します。

一時ファイルに書き込んでから置き換えます。データが破損して読み込めないときは、空の一覧で上書きせず編集を止めます。ファイルをバックアップして内容を確認し、修復してから再起動してください。

## ファイル構成

```text
src/
  main.ts        Electronウィンドウ・終了処理・IPC
  preload.ts     安全な画面／保存処理の橋渡し
  store.ts       JSON検証・直列化されたファイル保存
  renderer.ts    タスク操作・自動保存・検索
  index.html     左の一覧と中央エディタ
  style.css      白と薄いグレーのPC向けUI
scripts/copy.mjs ビルド時のHTML・CSSコピー
tests/           保存処理、画面操作、Electron再起動テスト
package.json     起動・テスト・Windows配布設定
package-lock.json 固定された依存関係
tsconfig.json    TypeScript設定
```

`dist/`、`node_modules/`、`release/` は生成物で、Gitには含めません。

## テスト

```powershell
npm test
npm run test:electron
```

`npm test` は保存と復元、連続保存、削除、破損データの保持を検証します。`test:electron` はElectronを実際に起動して終了・再起動後の復元まで検証します。テストは一時フォルダを使い、日常利用のデータは触りません。

`npm run test:ui` はChromiumによる画面操作テストです。Linuxでは `/usr/bin/chromium` を使用します。他の環境では `CHROMIUM_PATH` にChromiumまたはChromeの実行ファイルの絶対パスを指定してください。

クラウドのLinux環境でGUIテストを実行する場合はXvfbなどの画面が必要です。Windows実機では、日本語IMEの変換、Ctrl+C/V/Z/Y、削除確認、インストーラーからの起動を最終確認してください。

## 今後必要になったら

本文内の操作できるチェックボックスや、手動のエクスポート／バックアップを小さく追加できます。現時点ではこれらは実装していません。

## Gitに保存

```powershell
git add .
git commit -m "Implement local task and text editor"
```

この作業ではコミット・プッシュを自動実行していません。
