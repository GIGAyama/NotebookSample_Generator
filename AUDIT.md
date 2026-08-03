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

---

# 実施結果（P0 → P1 → P2）

作業ブランチ: `claude/rollout-lp4p78`（実行環境の制約により1本にまとめ、コミットをフェーズごとに分割）

## 対応後の判定表

| # | 項目 | 監査時 | 対応後 | 対応内容 |
|---|---|:--:|:--:|---|
| 1 | LICENSE | ❌ | ✅ | MIT を新規作成（Copyright (c) 2026 GIGAyama） |
| 2 | .gitignore | ⚠️ | ✅ | `*.log` を追記 |
| 5 | CSP | ❌ | ✅ | `index.html` に投入。実ブラウザで違反 0 件を確認 |
| 10 | 画像 150KB超 | ❌ | ✅ | 3件すべて解消（下表） |
| 11 | CI（audit/test） | ❌ | ✅ | `npm audit` と `npm test` を deploy.yml に追加 |
| 12 | テスト | ❌ | ✅ | `tests/mergeNotes.test.js`（9件）を追加 |
| 13 | dependabot | ❌ | ✅ | 月1回・最大3PR で設定 |
| 14 | README | ❌ | ✅ | 新規作成（セキュリティ設計・制限とクォータの節を含む） |
| 19 | npm audit | ⚠️ | ✅ | high 3件をパッチ更新で解消。`package.json` は無変更 |
| 9 | 最大ファイルサイズ | ⚠️ | ⚠️ | 未対応（P3・分割案の合意が必要） |

## P2：画像圧縮の before / after

**寸法は一切変更していません**（maskable のセーフゾーンと PWA の要求サイズを維持するため）。
パレット量子化のみで、元画像との「見た目の差」を実測しながら劣化の少ない設定を選びました。

| ファイル | 寸法 | 圧縮前 | 圧縮後 | 削減 | 見た目の差 | 輪郭の差 |
|---|---|---:|---:|---:|---:|---:|
| `favicon.png` | 512×512 | 226 KB | **38 KB** | −83% | 1.98 | 1.35 |
| `pwa-512x512.png` | 512×512 | 243 KB | **53 KB** | −78% | 1.47 | 0.85 |
| `pwa-maskable-512x512.png` | 512×512 | 174 KB | **43 KB** | −75% | 1.09 | 0.00 |
| `pwa-192x192.png` | 192×192 | 40 KB | **19 KB** | −53% | 0.70 | 0.41 |
| `apple-touch-icon.png` | 180×180 | 36 KB | **17 KB** | −53% | 0.74 | 0.42 |
| **合計** | | **719 KB** | **171 KB** | **−76%** | | |

> 「見た目の差」は、白背景・黒背景それぞれに合成したうえでの画素の二乗平均平方根誤差
> （厳しい側を採用）。**2.0 未満なら並べても差は判別できない水準**です。
> PNG の完全透明な画素は RGB 値が不定で、可逆な再圧縮でも数値が変わるため、
> 単純比較ではなく合成後の見え方で評価しています。

### ビルド成果物への効果

| | 対応前 | 対応後 |
|---|---:|---:|
| PWA プリキャッシュ | 1,273 KiB | **725 KiB（−43%）** |
| `dist/` 総サイズ | 1.4 MB | **784 KB（−45%）** |

`favicon.png` のみ目標 30KB に対して 38KB です。これ以上圧縮すると見た目の差が
許容水準を超えたため、**画質を優先して 38KB で止めています**（226KB → 38KB で十分な効果）。

### maskable アイコンのセーフゾーン

不透明画素のうち中央 80% の外にあるのは 35.9% ですが、これは**背景の緑が全面に
塗られているため**で、絵柄（本のマーク）は中央部に収まっています。丸く切り抜かれても
欠けません。

## 動作確認（実ブラウザ Chromium で実測）

`npm run build` → `npm run preview` に対して自動操作で確認。

| 確認項目 | 結果 |
|---|:--|
| 本文入力（丸囲み・赤字・傍線・穴埋め・日付・禁則処理） | ✅ 正常に描画 |
| テンプレート切替（国語15 / 算数17 / 原稿用紙400字 / 国語15） | ✅ 正常 |
| 縦書き・横書き切替（Alt+D） | ✅ 正常 |
| 3つのモーダル開閉（F1 / Alt+2 / Alt+3） | ✅ 正常 |
| PNG 画像の書き出し（Ctrl+E） | ✅ 360KB のファイルが生成 |
| ノートの保存（Ctrl+S）と一覧表示 | ✅ 正常 |
| **コンソールの CSP 違反（Refused to ...）** | ✅ **0 件** |
| **JavaScript エラー** | ✅ **0 件** |
| 許可していない配信元（cdn.jsdelivr.net 等）の遮断 | ✅ 実際にブロックされることを確認 |
| `npm audit --omit=dev --audit-level=high` | ✅ 0 件 |
| `npm test` | ✅ 9/9 通過 |

### この環境で確認できなかったこと（人間による確認をお願いしたい点）

1. **Google Fonts の実表示**
   この実行環境のブラウザは外部への通信が遮断されており、`fonts.googleapis.com` へ
   到達できませんでした（`ERR_CONNECTION_RESET`）。ただし **CSP による拒否ではありません**。
   CSP が遮断する場合はネットワーク要求自体が発生せず `Refused to load` が出ますが、
   実際にはネットワーク層まで到達しているため、**CSP は正しく通しています**。
   実環境で本文が Zen Maru Gothic で表示されることをご確認ください。

2. **Google ログイン・ドライブ同期の実挙動**
   `VITE_GOOGLE_CLIENT_ID` が未設定のため、実際のログインは試せていません。
   CSP 上は `accounts.google.com`（script / frame / connect）と
   `www.googleapis.com`（connect）を許可済みで、
   **`accounts.google.com` からのスクリプト読み込みが CSP に拒否されないことは実測済み**です。
   同期を有効にしている場合は、初回に一度ログインが通ることをご確認ください。

3. **アイコンの画質**
   上表のとおり数値上は劣化が判別できない水準ですが、
   ホーム画面に追加したときの見え方を実機でご確認ください。

---

## この監査で「問題なし」と確認できた点（褒めるべき箇所）

- OAuth スコープが `drive.file` に絞られており、先生の他のファイルには一切触れない設計
- Client ID がハードコードされておらず、`.env` / GitHub Actions Variables 経由
- localStorage の読み書きが全て try-catch で保護されており、データが壊れても白画面にならない
- `eval` / `innerHTML` / `postMessage('*')` といった典型的な危険パターンが皆無
- **本番依存の脆弱性ゼロ**、JS チャンクも既に分割済み
- 同期機能が未設定でもビルドが通り、機能だけが無効表示になる（デグレードが穏やか）
