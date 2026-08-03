# GIGA Standard v3 監査：NotebookSample_Generator

実施日: 2026-08-03 / アーキテクチャ型: **B型（Vite + React 19 + Tailwind 4 + PWA）**
対象コミット: `8124adc`（main） / 作業ブランチ: `claude/rollout-lp4p78`

このアプリは「小学校のノート指導用の見本（板書計画）を作成・印刷するツール」です。
GitHub Pages で配信され、データは各先生の端末（localStorage）と、任意でその先生自身の
Googleドライブにだけ保存されます。**サーバーは無く、児童の個人情報は一切扱いません。**

---

## 判定表

| # | 項目 | 判定 | 実測値 | 対応フェーズ |
|---|---|:--:|---|---|
| 1 | LICENSE 実ファイル | ❌ | 無し。README も無いため権利表記がどこにも無い＝法的には全権利留保 | P0 |
| 2 | .gitignore | ⚠️ | 有り（node_modules / dist / dev-dist / .env / .env.local / .DS_Store）。`*.log` のみ不足 | P0 |
| 3 | 秘密情報の直書き | ✅ | 検出なし。Client ID はビルド時 env（`VITE_GOOGLE_CLIENT_ID`）経由で、そもそも公開情報 | — |
| 4 | OAuthスコープ最小 | ✅ | `openid email drive.file`。`drive.file` は本アプリが作ったファイルのみ。最小構成 | — |
| 5 | CSP | ❌ | 未設定（`Content-Security-Policy` 検出 0 件） | P1 |
| 6 | LockService（C型） | — | 該当なし（GAS ではない） | — |
| 7 | 自動復旧ロジック | ✅ | `useLocalStorage` / `googleDrive.js` とも try-catch 済み。壊れた JSON で白画面にならない | — |
| 8 | 設定のGUI化 | ✅ | Client ID はビルド時変数、同期の ON/OFF は画面から操作可能 | — |
| 9 | 最大ファイルサイズ | ⚠️ | `src/App.jsx` = 103KB / 1,673行（基準 400KB・5,000行 は下回るが単一ファイルとしては大きい） | P3（提案のみ） |
| 10 | 画像 150KB超 | ❌ | **3件**（下表） | P2 |
| 11 | CI（audit/test/build） | ❌ | `deploy.yml` に build のみ。`npm audit` も `npm test` も無い | P1 |
| 12 | テスト | ❌ | 無し（テストファイル 0 件、`test` スクリプト無し） | P1 |
| 13 | dependabot | ❌ | 無し | P0 |
| 14 | README / MANUAL | ❌ | **README.md が存在しない**。`docs/google-drive-sync.md` のみ | P3 |
| 15 | study.v1 準拠 | — | 該当なし（学習ログを扱わないツール） | — |
| 16 | 危険API（eval / innerHTML） | ✅ | `eval` / `dangerouslySetInnerHTML` / `innerHTML=` いずれも検出なし | — |
| 17 | `postMessage(…, '*')` | ✅ | 検出なし | — |
| 18 | 履歴内の機微ファイル | ✅ | 追加履歴に `.env` / 認証情報系なし（`.env.example` は値が空のテンプレート） | — |
| 19 | npm audit | ⚠️ | 本番依存 **0件** ／ 開発依存 **high 3件**（`postcss`, `fast-uri`）。`npm audit fix` で解消可（メジャー更新なし） | P1 |

### 画像の実測（#10 の内訳）

| ファイル | 寸法 | 現在 | 目標 |
|---|---|---:|---:|
| `public/favicon.png` | 512×512 | **226 KB** | ≤ 30 KB |
| `public/pwa-512x512.png` | 512×512 | **243 KB** | ≤ 60 KB |
| `public/pwa-maskable-512x512.png` | 512×512 | **173 KB** | ≤ 60 KB |
| `public/pwa-192x192.png` | 192×192 | 40 KB | 据え置き可 |
| `public/apple-touch-icon.png` | 180×180 | 35 KB | 据え置き可 |
| **画像 合計** | | **717 KB** | 目標 ≤ 200 KB |

ビルド成果物 `dist/` 総サイズ = **1.4 MB**、うち PWA プリキャッシュ 1,272 KB。
**その約 56% が上記のアイコン画像**です。JS は既に分割済み（`html2canvas-pro` が別チャンク）で健全。

### 外部通信先の棚卸し（CSP 設計の前提）

| 宛先 | 用途 | 発生箇所 |
|---|---|---|
| `fonts.googleapis.com` / `fonts.gstatic.com` | 本文フォント Zen Maru Gothic | `src/App.jsx:14`（`@import`） |
| `accounts.google.com/gsi/client` | Google ログイン（同期を使うときだけ動的読込） | `src/googleDrive.js:13` |
| `www.googleapis.com` | ドライブ読み書き・アカウント表示 | `src/googleDrive.js:17-19` |

`index.html` にインライン `<script>` は **0 件**（`<script type="module" src>` のみ）。
ただし `App.jsx` は CSS を `<style>` として実行時に注入するため、`style-src` には
`'unsafe-inline'` が必要です（React + Tailwind の一般的な構成）。

---

## リスク上位3件

1. **LICENSE も README も無い（法的リスク）**
   権利表記がどこにも無いため、法的には「全権利留保」と解釈されます。他校の先生が
   「使っていいのか、改変していいのか」を判断できず、善意で使った学校が不利益を被る可能性があります。
   同時に README が無いため、**何をするツールで、どんなデータをどこに保存するのか**が
   利用者に一切示されていません。個人情報を扱わない安全な設計なのに、それが伝わっていない状態です。

2. **CI に脆弱性チェックが無く、既に high 3件が入り込んでいる（供給網リスク）**
   `postcss` にパストラバーサル、`fast-uri` にホスト混同の既知脆弱性があります。いずれも
   **開発・ビルド時にしか動かない依存**なので、児童・先生の端末に配られる成果物への
   直接の影響はありません。しかし CI が `npm audit` を実行していないため、
   **今後もし本番依存に脆弱性が入っても誰も気づけません。** これが本当の危険です。

3. **アイコン画像 717KB が PWA プリキャッシュを圧迫（性能リスク）**
   「ホーム画面に追加」した瞬間、Service Worker が 1.27MB を一括ダウンロードします。
   その半分以上がアイコン。40人が同時に初回起動する校内回線・Chromebook では
   体感差がはっきり出ます。画質を落とさずに 1/5 以下にできます。

---

## 提案するPR

| ブランチ（規約上の名前） | 内容 | 所要 | 破壊リスク |
|---|---|:--:|---|
| `giga-v3/p0-legal-and-docs` | LICENSE（MIT）／README.md 新規作成／`.gitignore` に `*.log` 追記／`dependabot.yml` 追加 | 小 | **無** |
| `giga-v3/p1-hardening` | CSP 投入（要動作確認）／CI に `npm audit` + `npm test` 追加／`npm audit fix`（マイナー以下）／中核ロジックに `node:test` を1本 | 中 | **中**（CSP で表示が壊れうる） |
| `giga-v3/p2-performance` | アイコン3枚を可逆的に圧縮（元画像は `.assets-original/` に保存） | 小 | 小（要・画質の目視確認） |
| `giga-v3/p3-maintainability` | `MANUAL.md`（先生向け）作成／`App.jsx` 分割案の提示（実施は合意後） | 中 | 小 |
| `giga-v3/gate` | §4 の品質ゲート（`scripts/check-project.mjs`）移植 | 小 | 無 |

---

## 人間の判断が必要な事項

1. **【ブランチ運用】規約 §1-1 は `giga-v3/{フェーズ名}` を指定していますが、本セッションの
   実行環境は `claude/rollout-lp4p78` への push を必須としています。**
   このままだと §1-4「1つのPRに1つの目的」が守れません。以下のどちらかをご指示ください。
   - (A) `claude/rollout-lp4p78` に **P0 だけ**を載せる（他フェーズは別セッションで）← 推奨
   - (B) 指定ブランチに P0〜P2 をまとめて載せる（コミットはフェーズごとに分ける）

2. **【著作権表記】** LICENSE の著作権者を規約どおり `Copyright (c) 2026 GIGAyama` としてよいか。
   フッターには `Developed by note.com/cute_borage86` の表記があります（`src/App.jsx:223`）。

3. **【CSP の検証】** このセッションにはブラウザがあるため `npm run preview` で
   コンソールエラーの有無まで確認できます。ただし **Google ログインの実挙動は
   Client ID が未設定のため検証できません**。CSP を投入するか、手順書として添えるだけに
   留めるかをご判断ください。

4. **【品質ゲートの正本】** §4 は `SchoolPlan_Editor/scripts/lib/project-quality.mjs` を正本と
   していますが、本セッションからは当該リポジトリを参照できません。移植する場合は
   ファイル内容の提供、またはアクセス許可が必要です。

5. **【フォント】** §P2 は「外部フォントを自己ホストに」としていますが、本アプリは
   Google Fonts の Zen Maru Gothic を実行時に読み込んでいます。自己ホスト化すると
   CSP は締められる一方、日本語 woff2 は分割配信で数百KBになります。
   **現状は Service Worker でキャッシュ済みのためオフラインでも動作します。**
   → 現状維持（CSP に `fonts.googleapis.com` を明示許可）を推奨しますが、ご判断ください。

---

## この監査で「問題なし」と確認できた点（褒めるべき箇所）

- OAuth スコープが `drive.file` に絞られており、先生の他のファイルには一切触れない設計
- Client ID がハードコードされておらず、`.env` / GitHub Actions Variables 経由
- localStorage の読み書きが全て try-catch で保護されており、データが壊れても白画面にならない
- `eval` / `innerHTML` / `postMessage('*')` といった典型的な危険パターンが皆無
- **本番依存の脆弱性ゼロ**、JS チャンクも既に分割済み
- 同期機能が未設定でもビルドが通り、機能だけが無効表示になる（デグレードが穏やか）
