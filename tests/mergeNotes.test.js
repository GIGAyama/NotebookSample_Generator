// ==========================================
// mergeNotes（ローカルとGoogleドライブのノート統合）のテスト
// ------------------------------------------
// このアプリで「壊れたら先生が困る」度合いが最も高いのがこの関数。
// 職員室のPCと教室のタブレットで同じアカウントを使ったとき、
// ここの判定を1つ間違えるだけで、作ったノートが静かに消える。
//
// 守るべき約束は3つ:
//   1. どちらか一方にしか無いノートは、絶対に消さない（union）
//   2. 同じノートが両方にあるときは、保存日時が新しい方を採用する
//   3. 壊れたデータが混ざっていても、例外を投げずに残せるものは残す
// ==========================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotes } from '../src/googleDrive.js';

const note = (id, date, name) => ({ id, date, name });

test('片方にしか無いノートは必ず残る（取りこぼさない）', () => {
  const local = [note('a', '2026-01-01T00:00:00Z', '職員室で作った')];
  const remote = [note('b', '2026-01-02T00:00:00Z', '教室で作った')];

  const merged = mergeNotes(local, remote);

  assert.equal(merged.length, 2);
  const ids = merged.map((n) => n.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
});

test('同じ id は保存日時が新しい方を採用する', () => {
  const old = note('a', '2026-01-01T00:00:00Z', '古い内容');
  const fresh = note('a', '2026-03-01T00:00:00Z', '新しい内容');

  // ローカルが新しい場合
  assert.equal(mergeNotes([fresh], [old])[0].name, '新しい内容');
  // リモートが新しい場合（順序を入れ替えても結果は同じでなければならない）
  assert.equal(mergeNotes([old], [fresh])[0].name, '新しい内容');
});

test('統合結果は保存日時の新しい順に並ぶ', () => {
  const merged = mergeNotes(
    [note('a', '2026-01-01T00:00:00Z'), note('c', '2026-05-01T00:00:00Z')],
    [note('b', '2026-03-01T00:00:00Z')]
  );

  assert.deepEqual(merged.map((n) => n.id), ['c', 'b', 'a']);
});

test('削除は同期されない（片方に残っていれば復活する）', () => {
  // 教室のタブレットで消したノートが、職員室のPCには残っている状況。
  // 取りこぼし防止を優先する設計なので「復活する」が正しい振る舞い。
  const local = [note('a', '2026-01-01T00:00:00Z')];
  const remoteAfterDelete = [];

  const merged = mergeNotes(local, remoteAfterDelete);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'a');
});

test('引数が無い・null でも落ちない', () => {
  assert.deepEqual(mergeNotes(), []);
  assert.deepEqual(mergeNotes(null, null), []);
  assert.deepEqual(mergeNotes([], []), []);
  assert.equal(mergeNotes(null, [note('a', '2026-01-01T00:00:00Z')]).length, 1);
});

test('壊れた要素（null・id 無し）は捨て、正常なものは残す', () => {
  const merged = mergeNotes(
    [null, undefined, { name: 'idが無い' }, note('a', '2026-01-01T00:00:00Z')],
    [note('b', '2026-02-01T00:00:00Z')]
  );

  assert.deepEqual(merged.map((n) => n.id), ['b', 'a']);
});

test('日付が壊れていてもノートを失わない', () => {
  // 手書きで書き換えられた JSON を取り込んだ場合など。
  // 日付が読めなくても「消える」ことがあってはならない。
  const merged = mergeNotes(
    [note('a', 'こわれた日付')],
    [note('b', undefined)]
  );

  assert.equal(merged.length, 2);
});

test('日付が同じときはリモート側（後から読む方）を採用する', () => {
  // 実装は tCur >= tPrev で後勝ち。ドライブ側を正とする挙動を固定しておく。
  const merged = mergeNotes(
    [note('a', '2026-01-01T00:00:00Z', 'ローカル')],
    [note('a', '2026-01-01T00:00:00Z', 'リモート')]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, 'リモート');
});

test('渡した配列を書き換えない（呼び出し側の状態を壊さない）', () => {
  const local = [note('a', '2026-01-01T00:00:00Z')];
  const remote = [note('a', '2026-02-01T00:00:00Z')];
  const localSnapshot = JSON.stringify(local);
  const remoteSnapshot = JSON.stringify(remote);

  mergeNotes(local, remote);

  assert.equal(JSON.stringify(local), localSnapshot);
  assert.equal(JSON.stringify(remote), remoteSnapshot);
});
