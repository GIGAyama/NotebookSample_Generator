import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Settings, Printer, Download, BookOpen, LayoutTemplate, Type, FileText, 
  Clock, AlertTriangle, Save, FolderOpen, Upload, Pencil, Eye, 
  SquareDashed, CheckCircle, Trash2, Loader2, X, Highlighter, Eraser, Keyboard
} from 'lucide-react';

// ==========================================
// 1. デザインと印刷用の特殊スタイル（CSS）
// ==========================================
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap');

  :root {
    --font-kyokasho: "UD Digi Kyokasho N-R", "UD Digi Kyokasho N-B", "Klee One", "BIZ UDPMincho", "Yu Mincho", serif;
  }

  body {
    font-family: 'Zen Maru Gothic', sans-serif;
    background-color: transparent;
  }

  .a4-paper {
    width: 210mm;
    height: 297mm;
    background-color: white;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    margin: 0 auto 2rem auto;
    position: relative;
    padding: 20mm;
    box-sizing: border-box;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .a4-paper.a4-landscape { width: 297mm; height: 210mm; }

  .notebook-header {
    width: 100%; height: 25mm; display: flex; justify-content: space-between;
    align-items: flex-end; margin-bottom: 10mm; font-family: var(--font-kyokasho);
    border-bottom: 2px solid #374151; padding-bottom: 5mm; box-sizing: border-box;
  }
  .header-item { display: flex; align-items: center; }
  .header-label { font-size: 14px; color: #4b5563; margin-right: 5mm; white-space: nowrap; }
  .header-line { border-bottom: 1px dashed #9ca3af; height: 20px; }
  .header-date { width: 40mm; }
  .header-title { width: 60mm; flex-grow: 1; margin: 0 10mm; }
  .header-name { width: 50mm; }

  .notebook-grid { display: grid; font-family: var(--font-kyokasho); flex-grow: 1; }
  /* セル選択のためのCSS追加 */
  .cell { 
    display: flex; justify-content: center; align-items: center; position: relative; 
    box-sizing: border-box; line-height: 1; user-select: none; cursor: crosshair; 
  }

  .style-grid .cell { border: 1px solid #16a34a; }
  .style-grid-gray .cell { border: 1px solid #9ca3af; }
  .style-leader .cell { border: 1px solid #16a34a; }
  .style-leader .cell::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; border-top: 1px dashed #86efac; z-index: 0; }
  .style-leader .cell::after { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1px dashed #86efac; z-index: 0; }
  .style-leader-gray .cell { border: 1px solid #9ca3af; }
  .style-leader-gray .cell::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; border-top: 1px dashed #d1d5db; z-index: 0; }
  .style-leader-gray .cell::after { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1px dashed #d1d5db; z-index: 0; }
  .cell-content { z-index: 10; transition: color 0.2s; }

  .rotate-90 { transform: rotate(90deg); display: inline-block; }

  .cell-content.punctuation {
    position: absolute; width: 50%; height: 50%; font-size: 0.8em;
    display: flex;
  }
  .cell-content.punctuation.is-vertical {
    top: 0; right: 0; justify-content: center; align-items: center;
    transform: translate(15%, -15%);
  }
  .cell-content.punctuation.is-horizontal {
    bottom: 0; left: 0; justify-content: flex-start; align-items: flex-end;
    transform: translate(20%, 10%);
  }

  .bracket-open-v {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; justify-content: center; align-items: center;
    transform: translateY(25%) rotate(90deg); 
  }
  .bracket-close-v-top {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; justify-content: center; align-items: center;
    transform: translateY(-25%) rotate(90deg);
  }
  .bracket-close-v-bottom {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; justify-content: center; align-items: center;
    transform: translateY(25%) rotate(90deg);
  }

  .genko-container { display: flex; flex-direction: column; width: 100%; height: 100%; border: 3px solid #1a1a1a; box-sizing: border-box; font-family: var(--font-kyokasho); position: relative; }
  .genko-header { width: 100%; height: 12mm; border-bottom: 2px solid #1a1a1a; display: flex; background: white; }
  .header-cell-title { flex: 1; border-right: 1px solid #16a34a; font-size: 10px; color: #6b7280; padding-left: 5mm; display: flex; align-items: center; }
  .header-cell-name { width: 60mm; font-size: 10px; color: #6b7280; padding-left: 3mm; display: flex; align-items: center; }
  .genko-grid-wrapper { flex: 1; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; }
  .genko-grid { display: grid; height: 100%; }
  .genko-grid .cell { display: flex; justify-content: center; align-items: center; position: relative; border: 1px solid #16a34a; box-sizing: border-box; }
  .genko-grid .cell.col-border-left { border-left: 1.5px solid #2d8a4e; }
  .genko-grid .cell.col-border-right { border-right: 1.5px solid #2d8a4e; }
  .genko-center-line { position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 0; border-left: 2px solid #1a1a1a; z-index: 5; pointer-events: none; }
  .genko-center-line::before { content: ''; position: absolute; top: -3px; left: -7px; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 12px solid #1a1a1a; }
  .genko-center-line::after { content: ''; position: absolute; bottom: -3px; left: -7px; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 12px solid #1a1a1a; }

  @media print {
    body, html { background-color: white !important; margin: 0; padding: 0; }
    .no-print { display: none !important; }
    .print-area { width: 100% !important; padding: 0 !important; margin: 0 !important; background: white !important; }
    #scaleWrapper { transform: none !important; margin: 0 !important; }
    .a4-paper { box-shadow: none !important; margin: 0 !important; border: none !important; page-break-after: always; break-after: page; }
    .a4-paper:last-child { page-break-after: auto; break-after: auto; }
  }
`;

// ==========================================
// 2. 定数とカスタムフック
// ==========================================

const TEMPLATES = {
  'custom': { name: 'カスタム設定' },
  'kokugo-15': { name: '国語 15マス（縦）', cols: 15, rows: 10, dir: 'vertical', style: 'style-leader' },
  'kokugo-12': { name: '国語 12マス（縦）', cols: 12, rows: 8, dir: 'vertical', style: 'style-leader' },
  'math-17': { name: '算数 17マス（横）', cols: 17, rows: 12, dir: 'horizontal', style: 'style-grid' },
  'math-22': { name: '算数 22マス（横）', cols: 22, rows: 15, dir: 'horizontal', style: 'style-grid' },
  'genko-400': { name: '原稿用紙 400字', cols: 20, rows: 20, dir: 'vertical', style: 'style-none', isGenko: true }
};

const PUNCTUATION_CHARS = ['、', '。', '，', '．', ',', '.', '！', '？', '!', '?'];
const VERTICAL_ROTATE_CHARS = ['ー', '「', '」', '『', '』', '（', '）', '【', '】', '〈', '〉', '《', '》', '〜', '…', '＝', '-', '～'];
const OPEN_BRACKETS = ['「', '『', '（', '【', '〈', '《'];
const CLOSE_BRACKETS = ['」', '』', '）', '】', '〉', '》'];
const WRITING_SPEEDS = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35 };

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(error);
    }
  };
  return [storedValue, setValue];
}

const loadHtml2Canvas = () => {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ==========================================
// 3. UIコンポーネント群
// ==========================================

const Header = ({ onShowHelp }) => (
  <nav className="bg-white border-b-4 border-emerald-700 px-6 py-2.5 flex justify-between items-center shadow-sm z-10 no-print relative">
    <div className="flex items-center gap-2">
      <div className="bg-emerald-100 p-2 rounded-xl text-emerald-800">
        <BookOpen size={24} strokeWidth={2.5} />
      </div>
      <h1 className="text-xl font-bold text-slate-800 tracking-wide">ノート見本作成ツール <span className="text-sm text-emerald-700 font-bold ml-2 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PRO</span></h1>
    </div>
    <button onClick={onShowHelp} className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors text-sm font-bold shadow-sm" title="キーボードショートカット一覧">
      <Keyboard size={16} />
      <span className="hidden sm:inline">ショートカット</span> <kbd className="font-mono text-[10px] bg-white px-1 border border-emerald-200 rounded shadow-sm text-slate-500">F1</kbd>
    </button>
  </nav>
);

const Footer = () => (
  <footer className="w-full bg-white border-t border-slate-200 pt-3 pb-2 text-center text-sm text-slate-500 font-bold shadow-sm no-print relative z-10">
    <p>&copy; {new Date().getFullYear()} ノート見本作成ツール Developed by <a href="https://note.com/cute_borage86" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:underline">GIGA山</a></p>
  </footer>
);

// --- キーボードヘルプモーダル ---
const KeyboardHelpModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={20} className="text-emerald-600"/> キーボードショートカット一覧</h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-6 overflow-y-auto text-sm text-slate-700">
        <section>
          <h3 className="font-bold text-emerald-700 mb-3 border-b border-emerald-100 pb-1">🌐 全体操作（どこでも使用可能）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">S</kbd></span><span>現在の設定を保存</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">P</kbd></span><span>A4印刷・PDF保存</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">E</kbd></span><span>画像(PNG)を保存</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">F1</kbd> 又は <kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">/</kbd></span><span>この一覧を開閉</span></div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-emerald-700 mb-3 border-b border-emerald-100 pb-1">🎛 タブ・設定切り替え</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Alt</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">1</kbd> ~ <kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">3</kbd></span><span>メニュータブ切替</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Alt</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">D</kbd></span><span>縦書き/横書き 切替</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Alt</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">H</kbd></span><span>ヘッダー表示 切替</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Alt</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">↑</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">↓</kbd></span><span>プレビューをスクロール</span></div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-emerald-700 mb-3 border-b border-emerald-100 pb-1">✏️ テキスト入力マクロ <span className="text-xs font-normal text-slate-500">(※テキスト入力中のみ)</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">1</kbd></span><span>【め】を挿入</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">2</kbd></span><span>【も】を挿入</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">3</kbd></span><span>【問】を挿入</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">4</kbd></span><span>【じ】を挿入</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">5</kbd></span><span>【自】を挿入</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">6</kbd></span><span>【ま】を挿入</span></div>
            <div className="flex justify-between items-center"><span className="flex gap-1"><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Ctrl</kbd><kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">Q</kbd> 又は <kbd className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 shadow-sm text-xs font-mono">0</kbd></span><span>【終】を挿入</span></div>
          </div>
        </section>
        <p className="text-xs text-center text-slate-500 pt-2">※ Macをお使いの場合は「Ctrl」を「Command(⌘)」、「Alt」を「Option(⌥)」に置き換えてください。</p>
      </div>
      <div className="p-4 bg-slate-50 rounded-b-2xl border-t border-slate-200 text-center">
        <button onClick={onClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm">閉じる</button>
      </div>
    </div>
  </div>
);

// ==========================================
// 4. メインアプリケーション
// ==========================================

export default function App() {
  const [state, setState] = useLocalStorage('notebookToolState_v3', {
    text: "4/1\n【め】10になるたしざんの\nけいさんをしよう。\n【終】ブロックをつかって\nかんがえてみましょう。\n\n【自】3と【赤線】7【線終】で【赤字】10【字終】になる。\n\n【ま】10になるかずの\nくみあわせをおぼえよう。",
    direction: 'vertical',
    colsCount: 15,
    rowsCount: 10,
    gridStyle: 'style-leader',
    showHeader: false,
    templateSelect: 'kokugo-15',
    fontSizeRatio: 80,
    grade: 3,
    supportMode: 'normal'
  });

  const [savedNotes, setSavedNotes] = useLocalStorage('notebookToolSavedNotes', []);
  const [activeTab, setActiveTab] = useState('basic');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const previewScrollRef = useRef(null);

  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // --- キーボードイベント用 最新State参照 ---
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const isExportingRef = useRef(isExporting);
  useEffect(() => { isExportingRef.current = isExporting; }, [isExporting]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const updateState = useCallback((key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, [setState]);

  const handleTemplateChange = (e) => {
    const tid = e.target.value;
    const tpl = TEMPLATES[tid];
    if (tid === 'custom') { updateState('templateSelect', tid); return; }
    setState(prev => ({
      ...prev, templateSelect: tid, colsCount: tpl.cols || prev.colsCount,
      rowsCount: tpl.rows || prev.rowsCount, direction: tpl.dir || prev.direction,
      gridStyle: tpl.style || prev.gridStyle,
    }));
  };

  const handleCustomChange = (key, value) => setState(prev => ({ ...prev, [key]: value, templateSelect: 'custom' }));
  const isGenko = TEMPLATES[state.templateSelect]?.isGenko;

  const saveCurrentNote = useCallback(() => {
    const currentState = stateRef.current;
    const title = window.prompt('このノート設定に名前をつけて保存します', `${currentState.grade}年_${new Date().toLocaleDateString()}`);
    if (!title) return;
    const newNote = { id: Date.now().toString(), title, date: new Date().toISOString(), stateData: currentState };
    setSavedNotes(prev => [newNote, ...prev]);
    showToast('ノートをローカルに保存しました');
  }, [setSavedNotes, showToast]);

  const loadNote = (noteId) => {
    if(!window.confirm('現在の編集内容は失われます。読み込みますか？')) return;
    const note = savedNotes.find(n => n.id === noteId);
    if(note) { setState(note.stateData); showToast('ノートを読み込みました'); }
  };

  const deleteNote = (noteId) => {
    if(window.confirm('この保存データを削除しますか？')) {
      setSavedNotes(savedNotes.filter(n => n.id !== noteId));
      showToast('データを削除しました', 'info');
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(savedNotes);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri; link.download = 'notebook_data_backup.json'; link.click();
    showToast('バックアップを出力しました');
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) { setSavedNotes([...imported, ...savedNotes]); showToast('データをインポートしました！'); } 
        else { throw new Error('Invalid format'); }
      } catch(err) { alert('ファイルの読み込みに失敗しました。'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadPNG = useCallback(async () => {
    const papers = document.querySelectorAll('.a4-paper');
    if (papers.length === 0) return;
    setIsExporting(true);
    const wrapper = document.getElementById('scaleWrapper');
    const originalTransform = wrapper.style.transform;
    const originalMargin = wrapper.style.marginBottom;
    wrapper.style.transform = 'scale(1)'; wrapper.style.marginBottom = '0px';

    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const html2canvas = await loadHtml2Canvas();
      const scale = window.devicePixelRatio ? Math.max(window.devicePixelRatio, 2) : 2;
      const canvas = await html2canvas(papers[0], { scale: scale, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `notebook-sample_${new Date().getTime()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
      showToast('画像を保存しました');
    } catch (err) { alert('画像の保存に失敗しました。'); console.error(err); } 
    finally {
      wrapper.style.transform = originalTransform; wrapper.style.marginBottom = originalMargin;
      window.dispatchEvent(new Event('resize'));
      setIsExporting(false);
    }
  }, [showToast]);

  // --- カーソル位置へテキスト挿入（マクロ機能） ---
  const insertTextAtCursor = useCallback((textToInsert) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = stateRef.current.text;
    const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    
    updateState('text', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  }, [updateState]);

  // --- キーボードショートカットの登録 ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ヘルプの表示 (F1 または Ctrl+/)
      if (e.key === 'F1' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
      
      if (showHelp) {
        if (e.key === 'Escape') setShowHelp(false);
        return; 
      }

      // 保存・印刷・保存 (Ctrl / Cmd)
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 's') { e.preventDefault(); saveCurrentNote(); return; }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); return; }
        if (e.key.toLowerCase() === 'e') { e.preventDefault(); if (!isExportingRef.current) handleDownloadPNG(); return; }
      }

      // タブ・トグル・スクロール操作 (Alt)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('basic'); return; }
        if (e.key === '2') { e.preventDefault(); setActiveTab('support'); return; }
        if (e.key === '3') { e.preventDefault(); setActiveTab('data'); return; }
        
        const currentIsGenko = TEMPLATES[stateRef.current.templateSelect]?.isGenko;
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          if (!currentIsGenko) {
             const newDir = stateRef.current.direction === 'vertical' ? 'horizontal' : 'vertical';
             updateState('direction', newDir); updateState('templateSelect', 'custom');
          }
          return;
        }
        if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          if (!currentIsGenko) {
             updateState('showHeader', !stateRef.current.showHeader); updateState('templateSelect', 'custom');
          }
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (previewScrollRef.current) previewScrollRef.current.scrollBy({ top: 150, behavior: 'smooth' });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (previewScrollRef.current) previewScrollRef.current.scrollBy({ top: -150, behavior: 'smooth' });
          return;
        }
      }

      // マクロ挿入 (テキストエリアフォーカス時)
      if (document.activeElement === textareaRef.current && (e.ctrlKey || e.metaKey)) {
        if (e.key === '1') { e.preventDefault(); insertTextAtCursor('【め】'); return; }
        if (e.key === '2') { e.preventDefault(); insertTextAtCursor('【も】'); return; }
        if (e.key === '3') { e.preventDefault(); insertTextAtCursor('【問】'); return; }
        if (e.key === '4') { e.preventDefault(); insertTextAtCursor('【じ】'); return; }
        if (e.key === '5') { e.preventDefault(); insertTextAtCursor('【自】'); return; }
        if (e.key === '6') { e.preventDefault(); insertTextAtCursor('【ま】'); return; }
        if (e.key === '0' || e.key.toLowerCase() === 'q') { e.preventDefault(); insertTextAtCursor('【終】'); return; }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, saveCurrentNote, handleDownloadPNG, updateState, insertTextAtCursor]);

  const TabButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex-1 py-2 px-1 text-xs font-bold rounded-t-lg border-b-4 transition-all flex flex-col items-center gap-1 ${activeTab === id ? 'border-emerald-700 text-emerald-800 bg-emerald-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Zen_Maru_Gothic']">
      <style>{globalStyles}</style>
      <style id="printPageStyle">{`@media print { @page { size: ${isGenko ? 'A4 landscape' : 'A4 portrait'}; margin: 0; } }`}</style>

      <Header onShowHelp={() => setShowHelp(true)} />
      {showHelp && <KeyboardHelpModal onClose={() => setShowHelp(false)} />}

      <main className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        <aside className="w-full md:w-80 lg:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col flex-none h-[45vh] md:h-full no-print shadow-sm z-10">
          
          <div className="flex px-4 pt-4 border-b border-slate-200">
            <TabButton id="basic" icon={Settings} label="基本設定" />
            <TabButton id="support" icon={Eye} label="支援・分析" />
            <TabButton id="data" icon={FolderOpen} label="データ管理" />
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* --- タブ1: 基本設定 --- */}
            {activeTab === 'basic' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <section>
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700 mb-2">
                    <span className="flex items-center gap-2"><FileText size={16} className="text-emerald-600" /> 見本テキスト</span>
                    <button onClick={() => setShowHelp(true)} className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors">マクロ一覧を見る</button>
                  </label>
                  <textarea ref={textareaRef} value={state.text} onChange={(e) => updateState('text', e.target.value)} rows={6} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-emerald-700/20 focus:border-emerald-700 outline-none transition-all resize-none shadow-inner bg-slate-50" placeholder="ここに板書計画を入力します..." />
                </section>

                <section className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">💡 PRO機能: 直感的な装飾操作</h3>
                  <p className="text-xs text-emerald-700 leading-tight mb-2">
                    右側の<b>プレビュー画面上の文字をマウスでなぞって選択</b>すると、簡単にサイドラインや赤文字の装飾ができます！
                  </p>
                  <ul className="text-xs text-emerald-800 space-y-1.5 list-disc pl-4">
                    <li><span className="font-bold bg-white px-1 rounded shadow-sm text-slate-700">4/1</span> : 1マスに対角線で日付を配置</li>
                    <li><span className="font-bold bg-white px-1 rounded shadow-sm text-slate-700">【め】</span> : ◯囲み文字 + <b>青枠</b>（空行まで）</li>
                    <li><span className="font-bold bg-white px-1 rounded shadow-sm text-slate-700">【ま】</span> : ◯囲み文字 + <b>赤枠</b>（空行まで）</li>
                    <li><span className="font-bold bg-white px-1 rounded shadow-sm text-emerald-700">【終】</span> : 枠囲みを途中で終わらせる</li>
                  </ul>
                </section>

                <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3"><LayoutTemplate size={16} className="text-emerald-600" /> テンプレート</label>
                  <select value={state.templateSelect} onChange={handleTemplateChange} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-700 transition-colors bg-white font-medium text-slate-700">
                    {Object.entries(TEMPLATES).map(([key, tpl]) => (<option key={key} value={key}>{tpl.name}</option>))}
                  </select>
                </section>

                <section className={`space-y-5 transition-opacity ${isGenko ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between">
                     <label className="flex items-center gap-2 text-sm font-bold text-slate-700">ヘッダー(名前欄) <kbd className="text-[10px] font-normal text-slate-400 ml-1">Alt+H</kbd></label>
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" checked={state.showHeader} onChange={(e) => handleCustomChange('showHeader', e.target.checked)} disabled={isGenko} />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
                     </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`border-2 rounded-xl p-2 text-center text-sm font-medium cursor-pointer transition-all ${state.direction === 'vertical' ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <input type="radio" name="dir" value="vertical" className="hidden" checked={state.direction === 'vertical'} onChange={(e) => handleCustomChange('direction', e.target.value)} disabled={isGenko} />縦書き <kbd className="text-[10px] text-slate-400 ml-1">Alt+D</kbd>
                    </label>
                    <label className={`border-2 rounded-xl p-2 text-center text-sm font-medium cursor-pointer transition-all ${state.direction === 'horizontal' ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <input type="radio" name="dir" value="horizontal" className="hidden" checked={state.direction === 'horizontal'} onChange={(e) => handleCustomChange('direction', e.target.value)} disabled={isGenko} />横書き
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">1行のマス数</label>
                      <input type="number" min="5" max="30" value={state.colsCount} onChange={(e) => handleCustomChange('colsCount', parseInt(e.target.value)||10)} disabled={isGenko} className="w-full border-2 border-slate-200 rounded-xl p-2 text-sm text-center outline-none focus:border-emerald-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">行数</label>
                      <input type="number" min="3" max="25" value={state.rowsCount} onChange={(e) => handleCustomChange('rowsCount', parseInt(e.target.value)||7)} disabled={isGenko} className="w-full border-2 border-slate-200 rounded-xl p-2 text-sm text-center outline-none focus:border-emerald-700" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">マス目の種類</label>
                    <select value={state.gridStyle} onChange={(e) => handleCustomChange('gridStyle', e.target.value)} disabled={isGenko} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-700 transition-colors bg-white">
                      <option value="style-leader">十字リーダーあり（緑）</option>
                      <option value="style-grid">マス目のみ（緑）</option>
                      <option value="style-none">枠線なし（白紙）</option>
                    </select>
                  </div>
                </section>
                
                <section className="pt-4 border-t border-slate-100">
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700 mb-2">
                    <span className="flex items-center gap-2"><Type size={16} className="text-emerald-600" /> 文字の大きさ</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-xs">{state.fontSizeRatio}%</span>
                  </label>
                  <input type="range" min="30" max="100" value={state.fontSizeRatio} onChange={(e) => updateState('fontSizeRatio', parseInt(e.target.value))} className="w-full accent-emerald-700" />
                </section>
              </div>
            )}

            {/* --- タブ2: 支援・分析 --- */}
            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><Clock size={16}/> 学習時間の予測設定</h3>
                  <label className="block text-xs text-blue-700 mb-1 mt-3">対象の学年を選択</label>
                  <select value={state.grade} onChange={(e) => updateState('grade', parseInt(e.target.value))} className="w-full border-2 border-blue-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                    {[1,2,3,4,5,6].map(g => <option key={g} value={g}>小学{g}年生 (約{WRITING_SPEEDS[g]}文字/分)</option>)}
                  </select>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2"><Eye size={16}/> スキャフォールディング</h3>
                  <div className="space-y-2">
                    <label className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${state.supportMode === 'normal' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="support" checked={state.supportMode === 'normal'} onChange={() => updateState('supportMode', 'normal')} className="hidden"/>
                      <CheckCircle size={18} className={`mr-2 ${state.supportMode === 'normal' ? 'text-emerald-500' : 'text-slate-300'}`}/>
                      <span className="text-sm font-bold">通常表示</span>
                    </label>
                    <label className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${state.supportMode === 'trace' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="support" checked={state.supportMode === 'trace'} onChange={() => updateState('supportMode', 'trace')} className="hidden"/>
                      <Pencil size={18} className={`mr-2 ${state.supportMode === 'trace' ? 'text-emerald-500' : 'text-slate-300'}`}/>
                      <span className="text-sm font-bold">なぞり書き用 (薄文字)</span>
                    </label>
                    <label className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${state.supportMode === 'fill' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="support" checked={state.supportMode === 'fill'} onChange={() => updateState('supportMode', 'fill')} className="hidden"/>
                      <SquareDashed size={18} className={`mr-2 ${state.supportMode === 'fill' ? 'text-emerald-500' : 'text-slate-300'}`}/>
                      <span className="text-sm font-bold">穴埋め用 (漢字・カナ空欄)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* --- タブ3: データ管理 --- */}
            {activeTab === 'data' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <button onClick={saveCurrentNote} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md">
                  <Save size={18} /> 今の設定を保存 <kbd className="text-[10px] font-normal text-slate-400 ml-1">Ctrl+S</kbd>
                </button>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="bg-slate-200/50 px-3 py-2 text-xs font-bold text-slate-600 flex justify-between items-center">
                    <span>保存されたノート一覧</span><span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">{savedNotes.length}件</span>
                  </div>
                  <ul className="max-h-48 overflow-y-auto divide-y divide-slate-200">
                    {savedNotes.length === 0 ? <li className="p-4 text-center text-xs text-slate-400">保存データはありません</li> : (
                      savedNotes.map(note => (
                        <li key={note.id} className="p-3 bg-white hover:bg-emerald-50 transition-colors flex justify-between items-center group">
                          <div className="overflow-hidden cursor-pointer flex-1" onClick={() => loadNote(note.id)}>
                            <p className="text-sm font-bold text-slate-700 truncate">{note.title}</p>
                            <p className="text-[10px] text-slate-400">{new Date(note.date).toLocaleString()}</p>
                          </div>
                          <button onClick={() => deleteNote(note.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 ml-2" title="削除"><Trash2 size={16} /></button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <button onClick={exportData} className="flex flex-col items-center justify-center gap-1 p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-700 hover:text-emerald-700 transition-colors text-slate-600 font-bold text-xs"><Download size={20} /> バックアップ出力</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1 p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-700 hover:text-emerald-700 transition-colors text-slate-600 font-bold text-xs"><Upload size={20} /> バックアップ読込</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
            <button onClick={() => window.print()} disabled={isExporting} className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
              <Printer size={18} /> A4印刷・PDF保存 <kbd className="text-[10px] font-normal text-emerald-200 ml-1">Ctrl+P</kbd>
            </button>
            <button onClick={handleDownloadPNG} disabled={isExporting} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm relative overflow-hidden">
              {isExporting ? <><Loader2 size={18} className="animate-spin" /> 処理中...</> : <><Download size={18} /> 画像を保存 <kbd className="text-[10px] font-normal text-teal-200 ml-1">Ctrl+E</kbd></>}
            </button>
          </div>
        </aside>

        <PreviewArea state={state} updateState={updateState} isGenko={isGenko} scrollRef={previewScrollRef} />

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-slate-500'}`}><CheckCircle size={14} className="text-white" /></div>
              <span className="text-sm font-bold tracking-wide">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// ==========================================
// 5. プレビュー＆解析エンジン＆直感的操作UI
// ==========================================

const PreviewArea = ({ state, updateState, isGenko, scrollRef }) => {
  const wrapperRef = useRef(null);
  const alertRef = useRef(null);

  // --- ドラッグ選択の状態管理 ---
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  useEffect(() => {
    let timeoutId;
    const adjustScale = () => {
      if (!wrapperRef.current) return;
      if (window.matchMedia('print').matches) { wrapperRef.current.style.transform = 'scale(1)'; wrapperRef.current.style.marginBottom = '0px'; return; }
      wrapperRef.current.style.transform = 'scale(1)'; wrapperRef.current.style.marginBottom = '0px';
      const parent = wrapperRef.current.parentElement;
      if(!parent) return;
      
      const wrapperWidth = parent.clientWidth;
      const paperWidth = (isGenko ? 297 : 210) * 3.78;
      const padding = window.innerWidth < 768 ? 20 : 60; 
      
      if (wrapperWidth < paperWidth + padding) {
        const scale = (wrapperWidth - padding) / paperWidth;
        const unscaledHeight = wrapperRef.current.offsetHeight;
        wrapperRef.current.style.transform = `scale(${scale})`;
        wrapperRef.current.style.marginBottom = `-${unscaledHeight * (1 - scale)}px`;
      }
    };
    const handleResize = () => { clearTimeout(timeoutId); timeoutId = setTimeout(adjustScale, 50); };
    window.addEventListener('resize', handleResize);
    adjustScale();
    const initialTimer = setTimeout(adjustScale, 50);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timeoutId); clearTimeout(initialTimer); };
  }, [state, isGenko]);

  useEffect(() => {
    const handleClickOutside = (event) => { if (alertRef.current && !alertRef.current.contains(event.target)) setShowAlerts(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- マウスによる直感的なセル選択ロジック ---
  useEffect(() => {
    const handleMouseUpGlobal = () => { if (isSelecting) setIsSelecting(false); };
    document.addEventListener('mouseup', handleMouseUpGlobal);
    return () => document.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [isSelecting]);

  const handleCellMouseDown = useCallback((cellObj) => {
    if (cellObj && cellObj.originalIndex !== undefined) {
      setIsSelecting(true);
      setSelectionStart(cellObj);
      setSelectionEnd(cellObj);
    }
  }, []);

  const handleCellMouseEnter = useCallback((cellObj) => {
    if (isSelecting && cellObj && cellObj.originalIndex !== undefined) {
      setSelectionEnd(cellObj);
    }
  }, [isSelecting]);

  const handlePreviewClick = (e) => {
    // セル以外をクリックした場合は選択解除
    if (!e.target.closest('.cell')) {
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  const selectedRange = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;
    const startIdx = selectionStart.originalIndex;
    const endIdx = selectionEnd.originalIndex;
    return [
      Math.min(startIdx, endIdx), 
      Math.max(startIdx + selectionStart.originalLength, endIdx + selectionEnd.originalLength)
    ];
  }, [selectionStart, selectionEnd]);

  // --- 装飾適用ロジック ---
  const applyDecoration = (startTag, endTag) => {
    if (!selectedRange) return;
    const [minIdx, maxIdx] = selectedRange;
    const before = state.text.substring(0, minIdx);
    const middle = state.text.substring(minIdx, maxIdx);
    const after = state.text.substring(maxIdx);
    
    // middleの中にある同種のタグを掃除しておく
    const cleanMiddle = middle.replace(new RegExp(`【[黒赤青]線】|【線終】|【赤字】|【字終】`, 'g'), '');
    const newText = before + startTag + cleanMiddle + endTag + after;
    
    updateState('text', newText);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const clearDecoration = () => {
    if (!selectedRange) return;
    const [minIdx, maxIdx] = selectedRange;
    const before = state.text.substring(0, minIdx);
    const middle = state.text.substring(minIdx, maxIdx);
    const after = state.text.substring(maxIdx);
    
    const cleanMiddle = middle.replace(/【[黒赤青]線】|【線終】|【赤字】|【字終】/g, '');
    const newText = before + cleanMiddle + after;
    
    updateState('text', newText);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const cellsPerLine = isGenko ? 20 : state.colsCount;
  const maxLines = isGenko ? 20 : state.rowsCount;
  const pages = useParsedText(state.text, cellsPerLine, maxLines, state.direction);
  
  const writingInfo = useMemo(() => {
    const count = state.text.replace(/[\s\n\u3000【】]/g, '').length;
    const speed = WRITING_SPEEDS[state.grade] || 20;
    const minutes = Math.ceil(count / speed);
    return { count, minutes };
  }, [state.text, state.grade]);

  const alerts = useMemo(() => {
    const detected = [];
    const getCharType = (char) => {
      if (!char || PUNCTUATION_CHARS.includes(char)) return 'other';
      if (/^[一-龯]+$/.test(char)) return 'kanji';
      if (/^[ァ-ヶー]+$/.test(char)) return 'katakana';
      return 'other';
    };

    const allLines = [];
    pages.forEach((p, pIdx) => p.forEach((l, lIdx) => allLines.push({ data: l, page: pIdx+1, line: lIdx+1 })));

    for (let i = 0; i < allLines.length - 1; i++) {
      const current = allLines[i].data;
      const next = allLines[i+1].data;
      if (current.every(c => !c.content) || next.every(c => !c.content)) continue;

      let lastValidChar = '';
      for(let j=current.length-1; j>=0; j--) { 
        if(current[j] && current[j].type === 'normal' && current[j].content) { lastValidChar = current[j].content.slice(-1); break; } 
      }
      let firstValidChar = '';
      for(let j=0; j<next.length; j++) { 
        if(next[j] && next[j].type === 'normal' && next[j].content) { firstValidChar = next[j].content.charAt(0); break; } 
      }
      
      if (lastValidChar && firstValidChar) {
        const t1 = getCharType(lastValidChar); const t2 = getCharType(firstValidChar);
        if (t1 === 'kanji' && t2 === 'kanji') detected.push(`P.${allLines[i].page} の ${allLines[i].line}〜${allLines[i+1].line}行目: 漢字の単語が分断されている可能性があります（「${lastValidChar}」と「${firstValidChar}」）`);
        else if (t1 === 'katakana' && t2 === 'katakana') detected.push(`P.${allLines[i].page} の ${allLines[i].line}〜${allLines[i+1].line}行目: カタカナの単語が分断されている可能性があります（「${lastValidChar}」と「${firstValidChar}」）`);
      }
    }
    return detected;
  }, [pages]);

  const [showAlerts, setShowAlerts] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 relative">
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center shadow-sm text-sm no-print z-20">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 font-medium">
            <Clock size={16} /><span>小{state.grade} 推定書字時間:</span><span className="font-bold text-blue-800 text-base ml-1">{writingInfo.minutes}</span> 分<span className="text-xs opacity-70 ml-1">({writingInfo.count}文字)</span>
          </div>
        </div>
        <div className="relative" ref={alertRef}>
          <button onClick={() => setShowAlerts(!showAlerts)} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold transition-colors ${alerts.length > 0 ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default'}`}>
            {alerts.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />} レイアウト警告: {alerts.length}件
          </button>
          {showAlerts && alerts.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-3 z-50">
              <h4 className="text-xs font-bold text-slate-500 mb-2 border-b pb-1">検知されたアラート</h4>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map((alt, idx) => (<li key={idx} className="text-xs text-slate-700 bg-red-50 p-2 rounded-lg border border-red-100 leading-tight">{alt}</li>))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start print-area relative" onMouseDown={handlePreviewClick} ref={scrollRef}>
        <div id="scaleWrapper" ref={wrapperRef} style={{ transformOrigin: 'top center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {isGenko 
            ? <GenkoPaper state={state} pages={pages} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} selectedRange={selectedRange} /> 
            : <NormalPaper state={state} pages={pages} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} selectedRange={selectedRange} />}
        </div>
      </div>

      {/* --- フローティング・ツールバー (装飾メニュー) --- */}
      {selectedRange && !isSelecting && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white px-5 py-3 rounded-full shadow-2xl border-2 border-slate-200 z-50 flex items-center gap-3 animate-in slide-in-from-bottom-4 no-print">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 mr-1"><Highlighter size={14} className="inline mr-0.5" />ライン</span>
            <button onClick={() => applyDecoration('【黒線】', '【線終】')} className="p-2 hover:bg-slate-100 rounded-full group transition-colors" title="黒線を引く">
               <div className="w-5 h-0.5 bg-slate-800 group-hover:scale-110 transition-transform shadow-sm"></div>
            </button>
            <button onClick={() => applyDecoration('【赤線】', '【線終】')} className="p-2 hover:bg-red-50 rounded-full group transition-colors" title="赤線を引く">
               <div className="w-5 h-0.5 bg-red-500 group-hover:scale-110 transition-transform shadow-sm"></div>
            </button>
            <button onClick={() => applyDecoration('【青線】', '【線終】')} className="p-2 hover:bg-blue-50 rounded-full group transition-colors" title="青線を引く">
               <div className="w-5 h-0.5 bg-blue-500 group-hover:scale-110 transition-transform shadow-sm"></div>
            </button>
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 mr-1"><Type size={14} className="inline mr-0.5" />文字色</span>
            <button onClick={() => applyDecoration('【赤字】', '【字終】')} className="p-2 hover:bg-red-50 rounded-full text-red-600 font-extrabold text-sm transition-colors" title="赤字にする">
               赤
            </button>
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={clearDecoration} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-xs font-bold" title="装飾をクリア">
             <Eraser size={16} /> クリア
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. 用紙・セル描画コンポーネント
// ==========================================

const NormalPaper = ({ state, pages, onCellMouseDown, onCellMouseEnter, selectedRange }) => {
  const { colsCount, rowsCount, direction, showHeader, gridStyle, fontSizeRatio, supportMode } = state;
  const fontRatio = fontSizeRatio / 100;
  const AVAIL_W_MM = 170; const AVAIL_H_MM = showHeader ? (257 - 35) : 257;
  const gridCols = direction === 'horizontal' ? colsCount : rowsCount;
  const gridRows = direction === 'horizontal' ? rowsCount : colsCount;
  const cellSizeMM = Math.floor(Math.min(AVAIL_W_MM / gridCols, AVAIL_H_MM / gridRows) * 10) / 10;
  const fontSizePx = (cellSizeMM * 3.7795) * fontRatio;

  return (
    <>
      {pages.map((pageData, pageIdx) => (
        <div key={pageIdx} className="a4-paper">
          {showHeader && (
            <div className="notebook-header">
              <div className="header-item"><span className="header-label">月</span><div className="header-line header-date"></div><span className="header-label ml-2">日</span><div className="header-line header-date"></div></div>
              <div className="header-item header-title"><div className="header-line w-full"></div></div>
              <div className="header-item"><span className="header-label">なまえ</span><div className="header-line header-name"></div></div>
            </div>
          )}
          <div className={`notebook-grid ${gridStyle}`} style={{ gridTemplateColumns: `repeat(${gridCols}, ${cellSizeMM}mm)`, gridTemplateRows: `repeat(${gridRows}, ${cellSizeMM}mm)`, fontSize: `${fontSizePx}px` }}>
            {direction === 'horizontal' ? (
              pageData.map((line, rIdx) => line.map((cellObj, cIdx) => <Cell key={`${rIdx}-${cIdx}`} cellObj={cellObj} supportMode={supportMode} isVertical={false} onMouseDown={onCellMouseDown} onMouseEnter={onCellMouseEnter} selectedRange={selectedRange} />))
            ) : (
              pageData.map((line, lineIdx) => line.map((cellObj, charIdx) => <Cell key={`${lineIdx}-${charIdx}`} cellObj={cellObj} supportMode={supportMode} isVertical={true} gridColumn={rowsCount - lineIdx} gridRow={charIdx + 1} onMouseDown={onCellMouseDown} onMouseEnter={onCellMouseEnter} selectedRange={selectedRange} />))
            )}
          </div>
        </div>
      ))}
    </>
  );
};

const GenkoPaper = ({ state, pages, onCellMouseDown, onCellMouseEnter, selectedRange }) => {
  const HEADER_HEIGHT = 12; const AVAIL_W_MM = 287; const AVAIL_H_MM = 202;
  const cellSizeMM = Math.floor(Math.min(AVAIL_W_MM / 20, (AVAIL_H_MM - HEADER_HEIGHT) / 20) * 100) / 100;
  const fontSizePx = (cellSizeMM * 3.7795) * (state.fontSizeRatio / 100);

  return (
    <>
      {pages.map((pageData, pIdx) => (
        <div key={pIdx} className="a4-paper a4-landscape" style={{ padding: '3mm 5mm 5mm 5mm' }}>
          <div className="genko-container">
            <div className="genko-header"><div className="header-cell-title">題名</div><div className="header-cell-name">名前</div></div>
            <div className="genko-grid-wrapper">
              <div className="genko-center-line"></div>
              <div className="genko-grid" style={{ gridTemplateColumns: `repeat(20, ${cellSizeMM}mm)`, gridTemplateRows: `repeat(20, ${cellSizeMM}mm)`, fontSize: `${fontSizePx}px` }}>
                {pageData.map((line, lineIdx) => line.map((cellObj, charIdx) => (
                  <Cell key={`${lineIdx}-${charIdx}`} cellObj={cellObj} supportMode={state.supportMode} isVertical={true} className={`${charIdx===0?'col-border-left':''} ${charIdx===19?'col-border-right':''}`} gridColumn={20 - lineIdx} gridRow={charIdx + 1} onMouseDown={onCellMouseDown} onMouseEnter={onCellMouseEnter} selectedRange={selectedRange} />
                )))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

const Cell = React.memo(({ cellObj, className = '', supportMode, isVertical, gridColumn, gridRow, onMouseDown, onMouseEnter, selectedRange }) => {
  const style = (gridColumn && gridRow) ? { gridColumn, gridRow } : {};
  if (!cellObj) return <div className={`cell ${className}`} style={style} />;

  const { content, type, boxColor, edges, month, day, lineColor, textColor, originalIndex } = cellObj;
  
  // 選択状態の判定
  const isSelected = selectedRange && originalIndex !== undefined && originalIndex >= selectedRange[0] && originalIndex <= selectedRange[1];

  // 枠線の描画用要素 (チョーク・色鉛筆のような少し柔らかい線の表現)
  let borderClass = '';
  if (boxColor && edges) {
    const colorClass = boxColor === 'blue' ? 'border-blue-400' : 'border-red-400';
    borderClass = `absolute inset-0 pointer-events-none z-20 ${colorClass}`;
    if (edges.top) borderClass += ' border-t-2';
    if (edges.bottom) borderClass += ' border-b-2';
    if (edges.left) borderClass += ' border-l-2';
    if (edges.right) borderClass += ' border-r-2';
  }

  // スキャフォールディングの共通判定
  const applySupport = (charStr) => {
      if (supportMode === 'trace') return 'text-slate-300 font-bold opacity-60';
      if (supportMode === 'fill' && /^[一-龯ァ-ヶー]+$/.test(charStr)) return 'opacity-0'; // 空欄化
      return '';
  };

  const interactiveProps = {
    onMouseDown: () => onMouseDown && onMouseDown(cellObj),
    onMouseEnter: () => onMouseEnter && onMouseEnter(cellObj),
  };

  if (type === 'normal') {
      const chars = Array.from(content);
      const hasPunctuation = chars.some(c => PUNCTUATION_CHARS.includes(c));

      let lineElement = null;
      if (lineColor) {
        const lColorMap = { black: 'border-slate-800', red: 'border-red-500', blue: 'border-blue-500' };
        const lc = lColorMap[lineColor] || 'border-slate-800';
        if (isVertical) {
          lineElement = <div className={`absolute top-0 bottom-0 right-[15%] border-r-[2.5px] ${lc} pointer-events-none z-10`} />;
        } else {
          lineElement = <div className={`absolute left-0 right-0 bottom-[15%] border-b-[2.5px] ${lc} pointer-events-none z-10`} />;
        }
      }

      return (
        <div className={`cell ${className}`} style={style} {...interactiveProps}>
          {borderClass && <div className={borderClass} />}
          {lineElement}
          {isSelected && <div className="absolute inset-0 bg-emerald-500/20 z-30 pointer-events-none" />}
          
          {chars.map((c, i) => {
            let cContent = c;
            let cClass = 'cell-content ';
            const isPunct = PUNCTUATION_CHARS.includes(c);
            const isOpenBracket = OPEN_BRACKETS.includes(c);
            const isCloseBracket = CLOSE_BRACKETS.includes(c);
            const isRotateChar = VERTICAL_ROTATE_CHARS.includes(c);
            
            if (isPunct) cClass += 'punctuation ' + (isVertical ? 'is-vertical' : 'is-horizontal');
            else if (isVertical && isOpenBracket) cClass += 'bracket-open-v';
            else if (isVertical && isCloseBracket) cClass += hasPunctuation ? 'bracket-close-v-bottom' : 'bracket-close-v-top';
            else {
              cClass += 'absolute inset-0 flex items-center justify-center';
              if (isVertical && isRotateChar) cClass += ' rotate-90';
            }
            
            // 文字色の適用
            if (textColor === 'red') {
              cClass += ' text-red-600 font-bold';
            }

            const supportClass = applySupport(c);
            if(supportMode === 'fill' && supportClass === 'opacity-0' && !isPunct) cContent = '';
            else if(supportClass) cClass += ` ${supportClass}`;

            return cContent ? <span key={i} className={cClass}>{cContent}</span> : null;
          })}
        </div>
      );
  }

  if (type === 'circle') {
      let cClass = `w-[80%] h-[80%] rounded-full border-[1.5px] border-current flex items-center justify-center ${applySupport(content)}`;
      let dispContent = content;
      if (supportMode === 'fill' && applySupport(content) === 'opacity-0') dispContent = ''; 
      return (
        <div className={`cell ${className}`} style={style} {...interactiveProps}>
          {borderClass && <div className={borderClass} />}
          {isSelected && <div className="absolute inset-0 bg-emerald-500/20 z-30 pointer-events-none" />}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cClass}><span style={{ fontSize: '0.7em' }}>{dispContent}</span></div>
          </div>
        </div>
      );
  }

  if (type === 'date') {
      return (
        <div className={`cell ${className}`} style={style} {...interactiveProps}>
          {borderClass && <div className={borderClass} />}
          {isSelected && <div className="absolute inset-0 bg-emerald-500/20 z-30 pointer-events-none" />}
          {/* 右上と左下を結ぶ（／）の斜線 */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to bottom right, transparent 48%, rgba(0,0,0,0.3) 48.5%, rgba(0,0,0,0.3) 51.5%, transparent 52%)' }} />
          <span className="absolute top-[8%] left-[8%] text-[0.6em] font-bold leading-none pointer-events-none">{month}</span>
          <span className="absolute bottom-[8%] right-[8%] text-[0.6em] font-bold leading-none pointer-events-none">{day}</span>
        </div>
      );
  }

  return <div className={`cell ${className}`} style={style} {...interactiveProps}>
    {borderClass && <div className={borderClass} />}
    {isSelected && <div className="absolute inset-0 bg-emerald-500/20 z-30 pointer-events-none" />}
  </div>;
});

// --- 最新のテキスト解析ロジック（PRO機能・直感的操作対応） ---
function useParsedText(text, cellsPerLine, maxLines, direction) {
  return useMemo(() => {
    const lines = text.split('\n');
    const gridData = [];
    const CLOSING_BRACKETS = ['」', '』', '）', '】', '〉', '》'];

    let currentBoxColor = null;
    let currentBlockId = null;
    let currentLineColor = null;
    let currentTextColor = null;
    let blockCounter = 0;
    
    // 元テキストとのマッピング用
    let currentIndex = 0;

    for (const line of lines) {
      if (line.trim() === '') {
        currentBoxColor = null;
        currentBlockId = null;
      }

      let currentLineCells = [];
      const tokens = line.match(/(【[めも問じ自ま終]】|【[黒赤青]線】|【線終】|【赤字】|【字終】|\d{1,2}\/\d{1,2}|[\s\S])/g) || [];
      
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

        let cellObj = { 
          content: token, type: 'normal', boxColor: currentBoxColor, blockId: currentBlockId, 
          lineColor: currentLineColor, textColor: currentTextColor,
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

    // 枠線の境界計算
    for (let p = 0; p < pages.length; p++) {
      for (let l = 0; l < maxLines; l++) {
        for (let c = 0; c < cellsPerLine; c++) {
          const cell = pages[p][l][c];
          if (!cell.blockId) continue;
          
          const isSame = (otherL, otherC) => {
            if (otherL < 0 || otherL >= maxLines || otherC < 0 || otherC >= cellsPerLine) return false;
            return pages[p][otherL][otherC].blockId === cell.blockId;
          };
          const edges = { top: false, bottom: false, left: false, right: false };

          if (direction === 'horizontal') {
            edges.top = !isSame(l - 1, c); edges.bottom = !isSame(l + 1, c);
            edges.left = !isSame(l, c - 1); edges.right = !isSame(l, c + 1);
          } else {
            edges.top = !isSame(l, c - 1); edges.bottom = !isSame(l, c + 1);
            edges.right = !isSame(l - 1, c); edges.left = !isSame(l + 1, c);
          }
          cell.edges = edges;
        }
      }
    }
    return pages;
  }, [text, cellsPerLine, maxLines, direction]);
}
