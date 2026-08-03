// ==========================================
// 見本テキストの解析（文章 → マス目の並び → ページ）
// ------------------------------------------
// 先生が入力した文章を、1マス1文字のグリッドに割り付け、
// 用紙のページ単位に分ける。ノート見本の見た目そのものを決めている処理。
//
// 画面の組み立て（App.jsx）から切り離してあるのは、
// ここだけを取り出してテストできるようにするため。
// React には一切依存していない純粋な関数。
// ==========================================

// 行頭に置かない文字（句読点）。禁則処理で前の行の最後のマスに送る。
export const PUNCTUATION_CHARS = ['、', '。', '，', '．', ',', '.', '！', '？', '!', '?'];

// 縦書きのときに90度回転させて表示する文字
export const VERTICAL_ROTATE_CHARS = ['ー', '「', '」', '『', '』', '（', '）', '【', '】', '〈', '〉', '《', '》', '〜', '…', '＝', '-', '～'];

export const OPEN_BRACKETS = ['「', '『', '（', '【', '〈', '《'];
export const CLOSE_BRACKETS = ['」', '』', '）', '】', '〉', '》'];

/**
 * 見本テキストを、ページ → 行 → マス の3階層の配列に変換する。
 *
 * @param {string} text        先生が入力した文章
 * @param {number} cellsPerLine 1行のマス数
 * @param {number} maxLines     1ページの行数
 * @param {'vertical'|'horizontal'} direction 縦書きか横書きか（枠線の向きの計算に使う）
 * @returns {Array} pages[ページ][行][マス]
 */
export function parseTextToPages(text, cellsPerLine, maxLines, direction) {
  const lines = text.split('\n');
  const gridData = [];
  const CLOSING_BRACKETS = ['」', '』', '）', '】', '〉', '》'];

  let currentBoxColor = null;
  let currentBlockId = null;
  let currentLineColor = null;
  let currentTextColor = null;
  let currentBlankId = null;
  let currentBorderId = null;
  let currentBorderMode = null;
  let blockCounter = 0;
  let blankCounter = 0;
  let borderCounter = 0;

  // 元テキストとのマッピング用
  let currentIndex = 0;

  for (const line of lines) {
    if (line.trim() === '') {
      currentBoxColor = null;
      currentBlockId = null;
      currentBlankId = null;
    }

    let currentLineCells = [];
    const tokens = line.match(/(【[めも問じ自ま終]】|【[△□○][^】]*】|【穴】|【穴終】|【枠】|【枠終】|【左】|【左終】|【右】|【右終】|【上】|【上終】|【下】|【下終】|【[黒赤青]線】|【線終】|【赤字】|【字終】|\d{1,2}\/\d{1,2}|\d{2,}|[\s\S])/g) || [];

    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      let tokenStartIndex = currentIndex;
      currentIndex += token.length;

      if (token === '【終】') { currentBoxColor = null; currentBlockId = null; continue; }
      if (token === '【黒線】') { currentLineColor = 'black'; continue; }
      if (token === '【赤線】') { currentLineColor = 'red'; continue; }
      if (token === '【青線】') { currentLineColor = 'blue'; continue; }
      if (token === '【線終】') { currentLineColor = null; continue; }
      if (token === '【赤字】') { currentTextColor = 'red'; continue; }
      if (token === '【字終】') { currentTextColor = null; continue; }
      if (token === '【穴】') { currentBlankId = ++blankCounter; continue; }
      if (token === '【穴終】') { currentBlankId = null; continue; }
      if (token === '【枠】') { currentBorderId = ++borderCounter; currentBorderMode = 'box'; continue; }
      if (token === '【左】') { currentBorderId = ++borderCounter; currentBorderMode = 'l'; continue; }
      if (token === '【右】') { currentBorderId = ++borderCounter; currentBorderMode = 'r'; continue; }
      if (token === '【上】') { currentBorderId = ++borderCounter; currentBorderMode = 't'; continue; }
      if (token === '【下】') { currentBorderId = ++borderCounter; currentBorderMode = 'b'; continue; }
      if (token === '【枠終】' || token === '【左終】' || token === '【右終】' || token === '【上終】' || token === '【下終】') { currentBorderId = null; currentBorderMode = null; continue; }

      let cellObj = {
        content: token, type: 'normal', boxColor: currentBoxColor, blockId: currentBlockId,
        lineColor: currentLineColor, textColor: currentTextColor, blankId: currentBlankId,
        borderId: currentBorderId, borderMode: currentBorderMode,
        originalIndex: tokenStartIndex, originalLength: token.length
      };

      if (token.match(/^【([めも問])】$/)) {
        cellObj.type = 'circle'; cellObj.content = RegExp.$1;
        currentBoxColor = 'blue'; currentBlockId = ++blockCounter;
        cellObj.boxColor = currentBoxColor; cellObj.blockId = currentBlockId;
      } else if (token.match(/^【([ま])】$/)) {
        cellObj.type = 'circle'; cellObj.content = RegExp.$1;
        currentBoxColor = 'red'; currentBlockId = ++blockCounter;
        cellObj.boxColor = currentBoxColor; cellObj.blockId = currentBlockId;
      } else if (token.match(/^【([じ自])】$/)) {
        cellObj.type = 'circle'; cellObj.content = RegExp.$1;
        currentBoxColor = null; currentBlockId = null; // 枠リセット
        cellObj.boxColor = currentBoxColor; cellObj.blockId = currentBlockId;
      } else if (token.match(/^【([△□○])([^】]*)】$/)) {
        cellObj.type = 'shape'; cellObj.shape = RegExp.$1; cellObj.content = RegExp.$2;
        cellObj.lineColor = null;
      } else if (token.match(/^(\d{1,2})\/(\d{1,2})$/)) {
        cellObj.type = 'date'; cellObj.month = RegExp.$1; cellObj.day = RegExp.$2; cellObj.content = token;
        cellObj.lineColor = null; cellObj.textColor = null;
      }

      // 禁則処理（合体）
      const isTokenNormalChar = cellObj.type === 'normal' && token.length === 1;
      if (isTokenNormalChar) {
        if (currentLineCells.length > 0) {
          const lastCell = currentLineCells[currentLineCells.length - 1];
          if (lastCell.type === 'normal') {
            const lastSingleChar = lastCell.content.slice(-1);
            if (PUNCTUATION_CHARS.includes(lastSingleChar) && CLOSING_BRACKETS.includes(token)) {
              lastCell.content += token;
              // 合体した場合、originalLengthを拡張して両方を選択できるようにする
              lastCell.originalLength += token.length;
              continue;
            }
          }
        }
        if (currentLineCells.length === 0 && gridData.length > 0) {
          if (PUNCTUATION_CHARS.includes(token) || CLOSING_BRACKETS.includes(token)) {
            const prevLine = gridData[gridData.length - 1];
            const lastCellOfPrevLine = prevLine[prevLine.length - 1];
            if (lastCellOfPrevLine && lastCellOfPrevLine.type === 'normal') {
              lastCellOfPrevLine.content += token;
              lastCellOfPrevLine.originalLength += token.length;
              continue;
            }
          }
        }
      }
      currentLineCells.push(cellObj);
      if (currentLineCells.length === cellsPerLine) { gridData.push(currentLineCells); currentLineCells = []; }
    }

    if (currentLineCells.length > 0 || tokens.length === 0) {
      while (currentLineCells.length < cellsPerLine) {
        currentLineCells.push({ content: '', type: 'normal', boxColor: currentBoxColor, blockId: currentBlockId, lineColor: null, textColor: null });
      }
      gridData.push(currentLineCells);
    }
    currentIndex++; // 改行文字の分
  }

  if (gridData.length === 0) gridData.push(Array(cellsPerLine).fill().map(()=>({ content: '', type: 'normal', boxColor: null, blockId: null, lineColor: null, textColor: null })));

  // ページ分割
  const totalPages = Math.ceil(gridData.length / maxLines) || 1;
  const pages = [];
  for (let p = 0; p < totalPages; p++) {
    const pageData = gridData.slice(p * maxLines, (p + 1) * maxLines);
    while (pageData.length < maxLines) pageData.push(Array(cellsPerLine).fill().map(()=>({ content: '', type: 'normal', boxColor: null, blockId: null, lineColor: null, textColor: null })));
    pages.push(pageData);
  }

  // 枠線・穴埋め枠の境界計算
  const computeEdges = (p, l, c, matches) => {
    const isSame = (otherL, otherC) => {
      if (otherL < 0 || otherL >= maxLines || otherC < 0 || otherC >= cellsPerLine) return false;
      return matches(pages[p][otherL][otherC]);
    };
    const edges = { top: false, bottom: false, left: false, right: false };
    if (direction === 'horizontal') {
      edges.top = !isSame(l - 1, c); edges.bottom = !isSame(l + 1, c);
      edges.left = !isSame(l, c - 1); edges.right = !isSame(l, c + 1);
    } else {
      edges.top = !isSame(l, c - 1); edges.bottom = !isSame(l, c + 1);
      edges.right = !isSame(l - 1, c); edges.left = !isSame(l + 1, c);
    }
    return edges;
  };

  for (let p = 0; p < pages.length; p++) {
    for (let l = 0; l < maxLines; l++) {
      for (let c = 0; c < cellsPerLine; c++) {
        const cell = pages[p][l][c];
        if (cell.blockId) {
          cell.edges = computeEdges(p, l, c, (o) => o.blockId === cell.blockId);
        }
        if (cell.blankId) {
          cell.blankEdges = computeEdges(p, l, c, (o) => o.blankId === cell.blankId);
        }
        if (cell.borderId) {
          cell.borderEdges = computeEdges(p, l, c, (o) => o.borderId === cell.borderId);
        }
      }
    }
  }
  return pages;
}
