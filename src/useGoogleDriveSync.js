// ==========================================
// Googleドライブ自動同期フック
// ------------------------------------------
// savedNotes（保存されたノート一覧）を Google ドライブとバックアップ／同期する。
//  - connect()   : 初回ログイン＋全同期（リモートと統合してから保存）
//  - syncNow()   : 手動で全同期（取り込み＋保存）
//  - disconnect(): 連携解除
//  - 接続中は savedNotes の変更を検知して自動でバックアップ（デバウンス）
//  - 起動時、前回接続済みなら追加操作なしでサイレントに再開を試みる
// ==========================================

import { useState, useRef, useEffect, useCallback } from 'react';
import * as gd from './googleDrive';

const CONNECTED_KEY = 'notebookGDriveConnected';
const AUTOSYNC_KEY = 'notebookGDriveAutoSync';
const AUTO_SYNC_DEBOUNCE_MS = 2500;

export function useGoogleDriveSync(savedNotes, setSavedNotes, notify) {
  // status: idle | connecting | syncing | synced | error | disabled
  const [status, setStatus] = useState(gd.isConfigured() ? 'idle' : 'disabled');
  const [email, setEmail] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [autoSync, setAutoSyncState] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(AUTOSYNC_KEY) !== '0';
  });

  const setAutoSync = useCallback((v) => {
    setAutoSyncState(v);
    try {
      window.localStorage.setItem(AUTOSYNC_KEY, v ? '1' : '0');
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // メモリ上に保持する短命な情報（Stateにしない＝再レンダリング不要）
  const tokenRef = useRef({ value: null, exp: 0 });
  const fileIdRef = useRef(null);

  // 常に最新の値を参照するための ref
  const notesRef = useRef(savedNotes);
  useEffect(() => { notesRef.current = savedNotes; }, [savedNotes]);
  const setNotesRef = useRef(setSavedNotes);
  useEffect(() => { setNotesRef.current = setSavedNotes; }, [setSavedNotes]);
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  // 自動同期の初回発火（＝直後の全同期）をスキップするためのフラグ
  const skipNextAuto = useRef(false);

  // --- 有効なアクセストークンを取得（期限内ならキャッシュを再利用） ---
  const acquireToken = useCallback(async () => {
    const now = Date.now();
    if (tokenRef.current.value && tokenRef.current.exp - 120000 > now) {
      return tokenRef.current.value;
    }
    const resp = await gd.requestAccessToken({ prompt: '' });
    tokenRef.current = {
      value: resp.access_token,
      exp: now + (Number(resp.expires_in) || 3600) * 1000,
    };
    return resp.access_token;
  }, []);

  // --- 全同期（リモート取り込み → 統合 → 保存） ---
  const runFullSync = useCallback(async () => {
    setStatus('syncing');
    const token = await acquireToken();

    // ログイン中アカウントの表示（取得できたら反映。失敗しても同期は続行）
    gd.fetchUserEmail(token).then((e) => { if (e) setEmail(e); });

    const remoteFile = await gd.findBackupFile(token);
    let remoteNotes = [];
    if (remoteFile) {
      fileIdRef.current = remoteFile.id;
      try {
        const data = await gd.downloadBackup(token, remoteFile.id);
        if (Array.isArray(data)) remoteNotes = data;
      } catch (e) {
        console.warn('リモートの読み込みに失敗（新規として扱います）', e);
      }
    }

    const merged = gd.mergeNotes(notesRef.current, remoteNotes);

    // ローカルへ反映（次の自動同期発火はスキップして二重アップロードを防ぐ）
    skipNextAuto.current = true;
    notesRef.current = merged;
    setNotesRef.current(merged);

    const saved = await gd.uploadBackup(token, fileIdRef.current, merged);
    if (saved?.id) fileIdRef.current = saved.id;

    setLastSync(Date.now());
    setStatus('synced');
    return merged;
  }, [acquireToken]);

  // --- 初回ログイン＋同期（ユーザー操作から呼ぶ） ---
  const connect = useCallback(async () => {
    if (!gd.isConfigured()) {
      setStatus('disabled');
      return;
    }
    try {
      setStatus('connecting');
      await runFullSync();
      setConnected(true);
      try { window.localStorage.setItem(CONNECTED_KEY, '1'); } catch (e) { console.warn(e); }
      notifyRef.current?.('Google ドライブと同期しました');
    } catch (e) {
      console.warn('Google 同期に失敗', e);
      setStatus('error');
      notifyRef.current?.('Google ドライブとの接続に失敗しました', 'info');
    }
  }, [runFullSync]);

  // --- 手動同期（接続済みで呼ぶ） ---
  const syncNow = useCallback(async () => {
    try {
      await runFullSync();
      notifyRef.current?.('同期しました');
    } catch (e) {
      console.warn('手動同期に失敗', e);
      setStatus('error');
      notifyRef.current?.('同期に失敗しました。再度お試しください', 'info');
    }
  }, [runFullSync]);

  // --- 連携解除 ---
  const disconnect = useCallback(() => {
    if (tokenRef.current.value) gd.revokeToken(tokenRef.current.value);
    tokenRef.current = { value: null, exp: 0 };
    fileIdRef.current = null;
    setConnected(false);
    setEmail(null);
    setLastSync(null);
    setStatus('idle');
    try { window.localStorage.removeItem(CONNECTED_KEY); } catch (e) { console.warn(e); }
    notifyRef.current?.('Google ドライブとの連携を解除しました', 'info');
  }, []);

  // --- 起動時のサイレント再開（前回接続済みのときだけ） ---
  useEffect(() => {
    if (!gd.isConfigured()) return;
    if (window.localStorage.getItem(CONNECTED_KEY) !== '1') return;
    let cancelled = false;
    (async () => {
      try {
        setStatus('connecting');
        await runFullSync();
        if (!cancelled) setConnected(true);
      } catch (e) {
        // 追加操作が必要な場合（別端末・セッション切れ等）は静かに待機し、
        // 画面のログインボタンから再接続してもらう
        console.warn('サイレント再開に失敗（ログインボタンから再接続してください）', e);
        if (!cancelled) setStatus('idle');
      }
    })();
    return () => { cancelled = true; };
    // 初回マウント時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- savedNotes の変更を検知して自動バックアップ（接続中かつ自動同期ONのとき） ---
  useEffect(() => {
    if (!connected || !autoSync) return;
    if (skipNextAuto.current) {
      skipNextAuto.current = false;
      return;
    }
    const id = setTimeout(async () => {
      try {
        setStatus('syncing');
        const token = await acquireToken();
        const saved = await gd.uploadBackup(token, fileIdRef.current, notesRef.current);
        if (saved?.id) fileIdRef.current = saved.id;
        setLastSync(Date.now());
        setStatus('synced');
      } catch (e) {
        console.warn('自動バックアップに失敗', e);
        setStatus('error');
      }
    }, AUTO_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [savedNotes, connected, autoSync, acquireToken]);

  return {
    configured: gd.isConfigured(),
    status,
    email,
    connected,
    lastSync,
    autoSync,
    setAutoSync,
    connect,
    syncNow,
    disconnect,
  };
}
