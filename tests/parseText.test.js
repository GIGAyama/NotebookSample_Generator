// ==========================================
// parseTextToPages（見本テキスト → マス目 → ページ）のテスト
// ------------------------------------------
// ノート見本の見た目そのものを決めている処理。
// ここが狂うと、先生が印刷して配ったあとで初めて気づくことになる。
//
// 特に守りたいのは:
//   - 記号（【め】【赤字】など）が正しく解釈され、記号自体はマスを消費しないこと
//   - 1行のマス数・1ページの行数がぴったり埋まること（印刷のずれ防止）
//   - 禁則処理（行頭に句読点を置かない）が効いていること
// ==========================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTextToPages } from '../src/parseText.js';

// 読みやすさのため、1ページ目の指定行の「文字だけ」を取り出す補助
const row = (pages, line = 0, page = 0) => pages[page][line].map((c) => c.content);
const filled = (pages, line = 0, page = 0) => row(pages, line, page).filter((c) => c !== '');

test('文字は1マスに1文字ずつ入り、行はマス数ぴったりに埋まる', () => {
  const pages = parseTextToPages('あいうえお', 10, 5, 'vertical');

  assert.equal(pages.length, 1);
  assert.equal(pages[0].length, 5, '1ページは指定した行数になる');
  assert.equal(pages[0][0].length, 10, '1行は指定したマス数になる');
  assert.deepEqual(filled(pages), ['あ', 'い', 'う', 'え', 'お']);
});

test('1行のマス数を超えたら次の行へ折り返す', () => {
  const pages = parseTextToPages('あいうえおかきくけこさ', 5, 5, 'vertical');

  assert.deepEqual(filled(pages, 0), ['あ', 'い', 'う', 'え', 'お']);
  assert.deepEqual(filled(pages, 1), ['か', 'き', 'く', 'け', 'こ']);
  assert.deepEqual(filled(pages, 2), ['さ']);
});

test('行数を超えたらページが増え、最後のページも行数ぴったりに埋まる', () => {
  // 1行3マス・1ページ2行 → 3文字ずつで5行分 = 3ページ
  const pages = parseTextToPages('あいう\nかきく\nさしす\nたちつ\nなにぬ', 3, 2, 'vertical');

  assert.equal(pages.length, 3);
  for (const p of pages) {
    assert.equal(p.length, 2);
    for (const line of p) assert.equal(line.length, 3);
  }
  assert.deepEqual(filled(pages, 0, 2), ['な', 'に', 'ぬ']);
});

test('【め】【も】【問】は丸囲みになり、以降が青枠で囲まれる', () => {
  for (const mark of ['め', 'も', '問']) {
    const pages = parseTextToPages(`【${mark}】あい`, 10, 3, 'vertical');
    const cells = pages[0][0];

    assert.equal(cells[0].type, 'circle');
    assert.equal(cells[0].content, mark, '記号は中身1文字だけを表示する');
    assert.equal(cells[0].boxColor, 'blue');
    assert.equal(cells[1].boxColor, 'blue', '後続の文字も同じ枠に入る');
    assert.equal(cells[1].blockId, cells[0].blockId);
  }
});

test('【ま】は赤枠になる', () => {
  const pages = parseTextToPages('【ま】あ', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[0].type, 'circle');
  assert.equal(cells[0].content, 'ま');
  assert.equal(cells[0].boxColor, 'red');
  assert.equal(cells[1].boxColor, 'red', '後続の文字も赤枠に入る');
});

test('【じ】【自】は丸囲みだが枠をリセットする', () => {
  const pages = parseTextToPages('【め】あ【自】い', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[1].boxColor, 'blue', '【め】の直後は青枠の中');
  assert.equal(cells[2].type, 'circle');
  assert.equal(cells[2].boxColor, null, '【自】で枠が切れる');
  assert.equal(cells[3].boxColor, null);
});

test('【終】で枠が終わる', () => {
  const pages = parseTextToPages('【め】あ【終】い', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[1].boxColor, 'blue');
  assert.equal(cells[2].content, 'い');
  assert.equal(cells[2].boxColor, null);
});

test('【赤字】【字終】ではさんだ部分だけが赤字になる', () => {
  const pages = parseTextToPages('あ【赤字】い【字終】う', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[0].textColor, null);
  assert.equal(cells[1].textColor, 'red');
  assert.equal(cells[2].textColor, null);
});

test('【赤線】【青線】【黒線】ではさんだ部分に傍線がつく', () => {
  const pages = parseTextToPages('【赤線】あ【線終】【青線】い【線終】【黒線】う【線終】え', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[0].lineColor, 'red');
  assert.equal(cells[1].lineColor, 'blue');
  assert.equal(cells[2].lineColor, 'black');
  assert.equal(cells[3].lineColor, null);
});

test('【穴】【穴終】ではさんだ部分が穴埋め枠になり、境界が計算される', () => {
  const pages = parseTextToPages('【穴】あい【穴終】う', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.ok(cells[0].blankId, '穴埋めの通し番号がつく');
  assert.equal(cells[1].blankId, cells[0].blankId, '同じ穴埋めは同じ番号');
  assert.equal(cells[2].blankId, null);
  assert.ok(cells[0].blankEdges, '枠線を引くための境界情報がある');
});

test('【枠】【左】【右】【上】【下】が囲み罫として解釈される', () => {
  const modes = [['枠', 'box'], ['左', 'l'], ['右', 'r'], ['上', 't'], ['下', 'b']];
  for (const [mark, mode] of modes) {
    const pages = parseTextToPages(`【${mark}】あ【${mark}終】い`, 10, 3, 'vertical');
    const cells = pages[0][0];
    assert.equal(cells[0].borderMode, mode, `【${mark}】→ ${mode}`);
    assert.ok(cells[0].borderId);
    assert.equal(cells[1].borderId, null, `【${mark}終】で終わる`);
  }
});

test('【○…】【□…】【△…】は図形の中に文字が入る', () => {
  const pages = parseTextToPages('【○まる】【□しかく】【△さんかく】', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[0].type, 'shape');
  assert.equal(cells[0].shape, '○');
  assert.equal(cells[0].content, 'まる');
  assert.equal(cells[1].shape, '□');
  assert.equal(cells[2].shape, '△');
});

test('4/1 のような日付は日付マスになる', () => {
  const pages = parseTextToPages('4/1あ', 10, 3, 'vertical');
  const cells = pages[0][0];

  assert.equal(cells[0].type, 'date');
  assert.equal(cells[0].month, '4');
  assert.equal(cells[0].day, '1');
  assert.equal(cells[1].content, 'あ', '日付は1マスに収まり、次の文字が続く');
});

test('禁則処理：句読点のあとの閉じかっこは同じマスに合体する', () => {
  const pages = parseTextToPages('「あ。」', 10, 3, 'vertical');

  // 「 / あ / 。」 の3マスになる（。と」が1マスに同居）
  assert.deepEqual(filled(pages), ['「', 'あ', '。」']);
});

test('禁則処理：行頭に来る句読点は前の行の最後のマスへ送られる', () => {
  // 1行3マス。「あいう。」の「。」は4文字目＝次の行の先頭になってしまうので、
  // 前の行の最後のマス（う）に送る。
  const pages = parseTextToPages('あいう。', 3, 3, 'vertical');

  assert.deepEqual(filled(pages, 0), ['あ', 'い', 'う。']);
  assert.deepEqual(filled(pages, 1), [], '2行目に句読点だけが残らない');
});

test('制御記号そのものはマスを消費しない', () => {
  const withMarks = parseTextToPages('【赤字】あいう【字終】', 10, 3, 'vertical');
  const plain = parseTextToPages('あいう', 10, 3, 'vertical');

  assert.deepEqual(filled(withMarks), filled(plain));
});

test('空行で枠が解除される', () => {
  const pages = parseTextToPages('【め】あ\n\nい', 10, 5, 'vertical');

  assert.equal(pages[0][0][1].boxColor, 'blue');
  assert.equal(pages[0][2][0].content, 'い');
  assert.equal(pages[0][2][0].boxColor, null, '空行をはさむと枠が切れる');
});

test('空のテキストでも1ページ分の空マスが返る（画面が壊れない）', () => {
  const pages = parseTextToPages('', 12, 8, 'vertical');

  assert.equal(pages.length, 1);
  assert.equal(pages[0].length, 8);
  assert.equal(pages[0][0].length, 12);
  assert.deepEqual(filled(pages), []);
});

test('縦書きと横書きで枠線の向きが入れ替わる', () => {
  const text = '【穴】あい【穴終】';
  const v = parseTextToPages(text, 10, 3, 'vertical')[0][0][0].blankEdges;
  const h = parseTextToPages(text, 10, 3, 'horizontal')[0][0][0].blankEdges;

  // 横書きでは隣（右）に同じ穴埋めが続くので右辺は開く。
  // 縦書きでは「次の文字」は下方向なので、開く辺が変わる。
  assert.equal(h.right, false, '横書き：右隣に続くので右辺は引かない');
  assert.equal(v.bottom, false, '縦書き：下に続くので下辺は引かない');
  assert.notDeepEqual(v, h);
});

test('元テキストの位置情報が保持される（クリックで該当箇所を選べるように）', () => {
  const pages = parseTextToPages('あい', 10, 3, 'vertical');

  assert.equal(pages[0][0][0].originalIndex, 0);
  assert.equal(pages[0][0][0].originalLength, 1);
  assert.equal(pages[0][0][1].originalIndex, 1);
});
