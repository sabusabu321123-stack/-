# 動作確認の記録

クラウドのLinux環境で確認しています。Windows実機の確認とは区別してください。

## 通過した確認

- `npm ci`：ロックファイルからの再インストール。
- `npm run build`：TypeScriptの型チェックと出力生成。
- `npm test`：保存処理の2テスト。追加、連続保存、実ファイルからの復元、完了状態、削除、破損ファイルの保持。
- `npm run test:ui`：Chromiumの画面操作。追加、選択、日本語複数行本文、名前変更、自動保存、再読み込み復元、完了、名前・本文検索、状態フィルター、削除のキャンセル・確定、Ctrl+N/F/S。
- `npm run test:electron`：Xvfb上でElectron本体を起動。preload/IPC経由の保存、保存完了を待たずにウィンドウを閉じた際の保存、実プロセス再起動後の日本語本文の復元、完了状態のJSON保存。
- 再利用用に保持した `/workspace/.tools/Xvfb` から新しい仮想画面を起動し、Electronテストも通過。

画面テストはローカルのJSON保存処理と結合しています。Chromiumの環境ポリシーが `file://` を制限するため、画面リソースはテスト内で応答しています。Electron本体のテストは実際の `file://` とIPCを使います。これらのテストでは一時フォルダを使用します。

## Windows配布と未検証事項

Windows x64の実行ファイルの生成を確認しています。Linuxのクロスビルドでは実行ファイルのアイコン／メタデータ編集を省略する `-c.win.signAndEditExecutable=false` を使っています。アプリは標準のElectronアイコンです。

`npm run package:win:zip -- -c.win.signAndEditExecutable=false` が成功し、`release/Task Text Editor-1.0.0-win.zip` を生成しました。配布アーカイブ内のmain、preload、renderer、store、HTML、CSSの6ファイルが検証済みビルドと一致することも確認しました。

NSISインストーラー生成はLinux側のWineの問題で未完了です。標準Wineが存在せず、ビルドツール対応のWine 11バンドルも `ntdll.dll` の読み込みに失敗しました。不完全なインストーラーは削除しました。Windows上では `npm run package:win` で生成できますが、その操作はここでは未検証です。

Windows実機の日本語IME変換、Ctrl+C/V/Z/Yのネイティブ動作、インストーラーからの起動は未検証です。本文は標準のtextareaを使い、Electronの編集メニューを設けています。これらの最終確認はWindows PCで行ってください。
