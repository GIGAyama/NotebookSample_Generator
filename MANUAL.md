# ノート見本作成ツール　つかいかた

先生向けの使い方説明は、**画面写真つきのマニュアル**に移しました。

- 公開ページ（印刷して配れます）: https://giga-school.com/apps/notebooksample-generator/manual/
- リポジトリの中の原稿: [docs/manual/manual.md](docs/manual/manual.md)

アプリの画面のいちばん下にある「つかいかた」からも開けます。

---

## この 1 枚を残してある理由

`quality.config.json` の `requiredFiles` がこのファイルを見ているため、置き場所だけ残してあります。
**中身を書き足さないでください。** 2 か所に手引きがあると、必ず片方が古くなります。

直すのは `docs/manual/manual.md` のほうです。書き方の決まりと、画面写真の撮り直し方は
`.claude/skills/giga-manual/`（正本は `GIGAyama.github.io/standards/skills/giga-manual/`）にあります。
撮影のシナリオは [docs/manual/shots.mjs](docs/manual/shots.mjs)、寄りの絵の切り出しは
[docs/manual/crop.py](docs/manual/crop.py) です。
