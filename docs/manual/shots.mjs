/* 使い方マニュアル（docs/manual/manual.md）用の画面写真を撮るシナリオ。
 *
 *   npm run dev -- --port 5199
 *   node .claude/skills/note-article/scripts/capture.mjs docs/manual/shots.mjs \
 *        --base http://localhost:5199 --out docs/manual/images
 *   python3 docs/manual/crop.py
 *
 * ⚠️ 撮影の土台（capture.mjs）は正本の配布物なので、ここには作らない。
 *    ここに書くのは「どのボタンを押して、どこで撮るか」だけ。
 *
 * ⚠️ 「寄り」の絵は、撮ったあとに切り出す。shot() は画面まるごとしか撮れないので、
 *    切り出す枠（CSS ピクセル）を images/crops.json に書き出し、crop.py が切る。
 *    画面の中に枠を描いて撮ると、画面が変わったときに枠だけが古くなって残る。
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const viewport = { width: 1440, height: 900 };

/* src/App.jsx の DEFAULT_STATE.text と同じもの。本文の「例」もこの値から書く。 */
const DEFAULT_TEXT = "4/1\n【め】10になるたしざんの\nけいさんをしよう。\n【終】ブロックをつかって\nかんがえてみましょう。\n\n【自】3と【赤線】7【線終】で【赤字】10【字終】になる。\n\n【ま】10になるかずのくみあわせをおぼえよう。";

const crops = [];

export default async ({ open, log, out }) => {
  const p = await open('main');

  /* ---- 道具 ------------------------------------------------------ */

  // React の textarea は el.value = x では state が動かない
  const setText = (value) => p.eval((v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    const el = document.querySelector('textarea');
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, value);

  // option の値から select を探して選ぶ（何番目の select か、を書かずに済ませる）
  const pick = (value) => p.eval((v) => {
    const el = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].some((o) => o.value === v));
    if (!el) return false;
    const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    set.call(el, v);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, value);

  const setNumber = (nth, value) => p.eval(([n, v]) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const el = document.querySelectorAll('input[type=number]')[n];
    if (!el) return false;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [nth, value]);

  const clickCheckbox = (nth) => p.eval((n) => {
    const el = document.querySelectorAll('input[type=checkbox]')[n];
    if (!el) return false;
    el.click();
    return true;
  }, nth);

  const pickRadio = (name, value) => p.eval(([n, v]) => {
    const el = document.querySelector(`input[name="${n}"][value="${v}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, [name, value]);

  /* マスをなぞって選ぶ。React は onMouseDown / onMouseEnter で受けているので、
     bubbles な MouseEvent を投げれば、実際のなぞりと同じ道を通る。 */
  /* マスをなぞって選ぶ。
     ⚠️ React の onMouseEnter に、生の 'mouseenter' は届かない。React は
        mouseover / mouseout を根で受けて enter / leave を作り直している。
        しかも relatedTarget が React の木の中にあると、そちらの mouseout が
        先に来たものと見なして何も作らない。relatedTarget は付けずに投げる。
     ⚠️ 3 手を続けて投げないこと。isSelecting は次の描画まで false のままで、
        同じ 1 回の中で続けても「なぞっている最中」と見なされない。 */
  const cells = (a, b) => `(() => {
    const all = [...document.querySelectorAll('.a4-paper .cell')];
    const hit = (t) => all.find((c) => c.textContent.trim() === t);
    return { from: hit(${JSON.stringify(a)}), to: hit(${JSON.stringify(b)}) };
  })()`;

  const drag = async (fromText, toText) => {
    const src = cells(fromText, toText);
    const started = await p.eval((s) => {
      const { from } = eval(s);
      if (!from) return false;
      from.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      return true;
    }, src);
    if (!started) return false;
    await p.sleep(300);
    const moved = await p.eval((s) => {
      const { to } = eval(s);
      if (!to) return false;
      to.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
      return true;
    }, src);
    if (!moved) return false;
    await p.sleep(300);
    await p.eval(() => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
    return true;
  };

  /* 撮ってから切り出す枠を控える。値はページの中で評価する式（要素を返す）。 */
  const WHERE = {
    aside: "document.querySelector('aside')",
    nav: "document.querySelector('nav')",
    paper: "document.querySelector('.a4-paper')",
    textarea: "document.querySelector('textarea')",
    printButtons: "document.querySelector('aside > div:last-child')",
    sectionText: "document.querySelectorAll('aside section')[0]",
    sectionTemplate: "document.querySelectorAll('aside section')[1]",
    sectionLayout: "document.querySelectorAll('aside section')[2]",
    sectionFont: "document.querySelectorAll('aside section')[3]",
    statusBar: "document.querySelector('.print-area').previousElementSibling",
    toolbar: "document.querySelector('.print-area').nextElementSibling",
    paperWithToolbar: "(() => { const paper = document.querySelector('.a4-paper').getBoundingClientRect();"
      + " const bar = document.querySelector('.print-area').nextElementSibling.getBoundingClientRect();"
      + " const left = Math.min(paper.left, bar.left); const top = Math.min(paper.top, bar.top);"
      + " return { left, top, width: Math.max(paper.right, bar.right) - left,"
      + " height: Math.max(paper.bottom, bar.bottom) - top }; })()",
    alerts: "(() => { const bar = document.querySelector('.print-area').previousElementSibling;"
      + " const pop = [...bar.querySelectorAll('div')].find((d) => d.textContent.trim().startsWith('検知されたアラート'));"
      + " const a = bar.getBoundingClientRect(); const b = pop.getBoundingClientRect();"
      + " const left = Math.min(a.left, b.left); const top = Math.min(a.top, b.top);"
      + " return { left, top, width: Math.max(a.right, b.right) - left, height: Math.max(a.bottom, b.bottom) - top }; })()",
    gdrive: "[...document.querySelectorAll('div')].filter((d) => d.textContent.trim().startsWith('Google ドライブ同期'))[0]",
  };

  const closeUp = async (name, where, pad = 12) => {
    const expr = WHERE[where];
    if (!expr) throw new Error(`枠の書きかたが無い: ${where}`);
    const rect = await p.eval(([src, pd]) => {
      const el = eval(src);
      if (!el) return null;
      /* 要素でも、枠そのもの（{left, top, width, height}）でも受ける。
         警告のように「帯と、その下に出た吹き出し」の両方を囲みたいことがある。 */
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : el;
      const x = Math.max(0, r.left - pd);
      const y = Math.max(0, r.top - pd);
      return {
        x, y,
        w: Math.min(innerWidth - x, r.width + pd * 2),
        h: Math.min(innerHeight - y, r.height + pd * 2),
        vw: innerWidth, vh: innerHeight,
      };
    }, [expr, pad]);
    if (!rect) throw new Error(`寄れなかった: ${where}`);
    await p.shot(name);
    crops.push({ name: `${name}.png`, ...rect });
  };

  const need = async (label, ok) => { if (!(await ok)) throw new Error(`できなかった: ${label}`); };

  /* ---- 2. 画面の見かた ------------------------------------------- */
  await p.shot('01-home', { expect: 'テンプレート' });
  await closeUp('02-panel', 'aside', 0);
  await closeUp('03-topbar', 'nav', 0);
  await closeUp('04-statusbar', 'statusBar', 0);
  await closeUp('05-print-buttons', 'printButtons', 0);

  /* ---- 3. 最短の流れ --------------------------------------------- */
  await closeUp('06-text-input', 'sectionText');
  await closeUp('07-first-sample', 'paper', 4);

  /* ---- 4. テンプレート ------------------------------------------- */
  await closeUp('08-template-select', 'sectionTemplate');
  await need('国語 12マス', pick('kokugo-12'));
  await p.sleep(600);
  await closeUp('09-kokugo12', 'paper', 4);
  await need('算数 17マス', pick('math-17'));
  await p.sleep(600);
  await closeUp('10-math17', 'paper', 4);
  await need('原稿用紙 400字', pick('genko-400'));
  await p.sleep(700);
  await closeUp('11-genko400', 'paper', 4);
  await need('国語 15マス', pick('kokugo-15'));
  await p.sleep(600);

  /* ---- 5. レイアウト --------------------------------------------- */
  await closeUp('12-layout-fields', 'sectionLayout');
  await need('横書き', pickRadio('dir', 'horizontal'));
  await need('1行のマス数', setNumber(0, 12));
  await need('行数', setNumber(1, 8));
  await p.sleep(700);
  await closeUp('13-horizontal', 'paper', 4);
  await need('枠線なし', pick('style-none'));
  await p.sleep(600);
  await closeUp('14-grid-none', 'paper', 4);
  await need('十字リーダー', pick('style-leader'));
  await need('ヘッダー', clickCheckbox(0));
  await p.sleep(700);
  await closeUp('15-header-on', 'paper', 4);
  await need('ヘッダーを戻す', clickCheckbox(0));
  await need('縦書きに戻す', pickRadio('dir', 'vertical'));
  await need('国語 15マスに戻す', pick('kokugo-15'));
  await p.sleep(700);
  await closeUp('16-fontsize', 'sectionFont');

  /* ---- 6. 記号 ---------------------------------------------------- */
  await p.click('マクロ');
  await p.sleep(500);
  await closeUp('17-macro-help', 'sectionText');
  await p.click('マクロ');
  await p.sleep(400);
  await closeUp('18-tags-text', 'textarea');
  await closeUp('19-tags-result', 'paper', 4);
  await setText('【○1】ブロックをならべる。\n【□2】しきをかく。\n【△3】こたえをたしかめる。\n\n【穴】10【穴終】になるかずをかく。\n\n【枠】まとめ【枠終】\n【左】たてのせん【左終】\n【上】よこのせん【上終】');
  await p.sleep(800);
  await closeUp('20-shapes-blank', 'paper', 4);
  await setText(DEFAULT_TEXT);
  await p.sleep(800);

  /* ---- 7. なぞって装飾 -------------------------------------------- */
  await need('「たしざん」をなぞる', drag('た', 'ん'));
  await p.sleep(600);
  await closeUp('21-drag-select', 'paperWithToolbar', 6);
  /* ⚠️ バーは中で横に送れる。1440px では右端の「クリア」が隠れるので、
     この 1 枚だけ広い画面で撮って、バーのところだけを切り出す。 */
  await p.resize(2400, 900);
  await p.sleep(700);
  await closeUp('22-toolbar', 'toolbar', 10);
  await p.resize(1440, 900);
  await p.sleep(700);
  await p.click('穴埋め');
  await p.sleep(800);
  await closeUp('23-blank-applied', 'paper', 4);
  await setText(DEFAULT_TEXT);
  await p.sleep(700);

  /* ---- 8. 支援・分析 ---------------------------------------------- */
  await p.click('支援・分析');
  await p.sleep(700);
  await p.shot('24-support-modal', { expect: 'スキャフォールディング' });
  await p.click('なぞり書き用');
  await p.sleep(500);
  await p.click('閉じる');
  await p.sleep(700);
  await closeUp('25-trace', 'paper', 4);
  await p.click('支援・分析');
  await p.sleep(600);
  await p.click('穴埋め用');
  await p.sleep(500);
  await p.click('閉じる');
  await p.sleep(600);
  await setText('4/1\n【め】学習発表会のれんしゅうをしよう。\n【終】大きな声で、ゆっくり話します。');
  await p.sleep(800);
  await closeUp('26-fill', 'paper', 4);
  await p.click('支援・分析');
  await p.sleep(600);
  await p.click('通常表示');
  await p.sleep(500);
  await p.click('閉じる');
  await p.sleep(700);

  /* ---- 9. 警告 ----------------------------------------------------- */
  await setText('きょうのじゅぎょうでは、学習発表会のれんしゅうをします。');
  await p.sleep(900);
  await p.click('警告');
  await p.sleep(700);
  await closeUp('27-alerts', 'alerts', 10);
  await p.eval(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
  await p.sleep(500);

  /* ---- 10. 印刷（複数ページ）--------------------------------------- */
  await setText(DEFAULT_TEXT + '\n\n【め】つぎのじかんにやること。\n【終】ノートに見本とおなじように書きます。\n\n【ま】書いたらとなりの人と見せあいましょう。');
  await p.sleep(1000);
  /* 1 ページ目は右端にある（縦書きは右から左へ並ぶ）。そこまで送ってから撮る */
  await p.eval(() => { const el = document.querySelector('.print-area'); el.scrollLeft = el.scrollWidth; });
  await p.sleep(1000);
  await p.shot('28-multipage');
  await setText(DEFAULT_TEXT);
  await p.sleep(800);

  /* ---- 11. データ管理 ---------------------------------------------- */
  await p.click('データ管理');
  await p.sleep(700);
  await p.shot('29-data-modal', { expect: '保存されたノート一覧' });
  await p.eval(() => { window.prompt = () => '3年_たしざんの見本'; });
  await p.click('今の設定を保存');
  await p.sleep(900);
  await p.shot('30-saved-list', { expect: '3年_たしざんの見本' });
  await closeUp('31-gdrive', 'gdrive', 10);
  await p.click('閉じる');
  await p.sleep(600);

  /* ---- 14. ショートカット ------------------------------------------ */
  await p.press('F1');
  await p.sleep(800);
  await p.shot('32-keyboard-help', { expect: 'キーボードショートカット一覧' });
  await p.press('Escape');
  await p.sleep(600);

  /* ---- 13. タブレット・スマートフォン ------------------------------ */
  await p.resize(390, 844);
  await p.sleep(1000);
  await p.shot('33-mobile', { expect: '設定' });
  await p.click('設定');
  await p.sleep(1000);
  await p.shot('34-mobile-drawer', { expect: 'テンプレート' });

  writeFileSync(join(out, 'crops.json'), JSON.stringify(crops, null, 1) + '\n');
  log(`切り出す枠 ${crops.length} 件を crops.json に書いた`);
};
