// ==========================================
// Googleドライブ連携（バックエンド不要のクライアントサイドOAuth）
// ------------------------------------------
// - Google Identity Services (GIS) でアクセストークンを取得
// - Drive REST API v3 でアプリ専用のバックアップファイルを読み書き
// - スコープは drive.file（このアプリが作成したファイルのみアクセス可能）＋
//   openid/email（ログイン中のアカウント表示用）のみ。ユーザーの他のファイルには一切触れない。
//
// Client ID はビルド時の環境変数 VITE_GOOGLE_CLIENT_ID から読み込む。
// （Client ID は公開情報でありシークレットではない。詳しくは docs/google-drive-sync.md を参照）
// ==========================================

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPES = 'openid email https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'notebook_sample_backup.json';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Client ID が設定されているときのみ機能を有効化する
export const isConfigured = () => Boolean(CLIENT_ID);

// --- GIS スクリプトの遅延読み込み（必要になったときだけ読み込む） ---
let gisPromise = null;
export function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error('Google 認証スクリプトの読み込みに失敗しました'));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

// --- トークンクライアント（1回だけ初期化して使い回す） ---
let tokenClient = null;
async function getTokenClient() {
  await loadGis();
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {}, // リクエストごとに差し替える
    });
  }
  return tokenClient;
}

// アクセストークンを取得する。
// prompt: '' … 同意済みなら追加のUIなしで取得（サイレント）。未同意なら同意画面を表示。
// prompt: 'consent' … 毎回同意画面を表示。
// 戻り値には access_token と expires_in（秒）が含まれる。
export async function requestAccessToken({ prompt = '' } = {}) {
  const client = await getTokenClient();
  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      resolve(resp);
    };
    client.error_callback = (err) => {
      reject(new Error(err?.type || 'auth_error'));
    };
    try {
      client.requestAccessToken({ prompt });
    } catch (e) {
      reject(e);
    }
  });
}

// アクセストークンを失効させる（連携解除時）
export function revokeToken(token) {
  try {
    window.google?.accounts?.oauth2?.revoke?.(token, () => {});
  } catch (e) {
    console.warn(e);
  }
}

// --- ログイン中アカウントのメールアドレスを取得（表示用・失敗しても無視） ---
export async function fetchUserEmail(token) {
  try {
    const r = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const j = await r.json();
    return j.email || null;
  } catch {
    return null;
  }
}

// --- バックアップファイルを探す（このアプリが作成したもののみ検索対象） ---
export async function findBackupFile(token) {
  const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const url =
    `${DRIVE_FILES}?q=${q}&spaces=drive` +
    `&fields=files(id,modifiedTime)&pageSize=1&orderBy=modifiedTime desc`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('Google ドライブの検索に失敗しました');
  const j = await r.json();
  return j.files?.[0] || null;
}

// --- バックアップの中身を読み込む ---
export async function downloadBackup(token, fileId) {
  const r = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error('Google ドライブからの読み込みに失敗しました');
  return await r.json();
}

// --- バックアップを保存する（fileId があれば更新、なければ新規作成） ---
export async function uploadBackup(token, fileId, notes) {
  const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json' };
  const boundary = 'notebook_sample_sync_boundary';
  const multipart =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(notes)}\r\n` +
    `--${boundary}--`;

  const method = fileId ? 'PATCH' : 'POST';
  const base = fileId ? `${DRIVE_UPLOAD}/${fileId}` : DRIVE_UPLOAD;
  const url = `${base}?uploadType=multipart&fields=id,modifiedTime`;

  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipart,
  });
  if (!r.ok) throw new Error('Google ドライブへの保存に失敗しました');
  return await r.json();
}

// --- ローカルとリモートのノートを統合する ---
// 同じ id のノートは date が新しい方を採用する。どちらか一方にしか無いノートは必ず残す
// （＝ union マージ。バックアップ用途のためデータの取りこぼしを防ぐ。削除は自動同期しない）。
export function mergeNotes(local = [], remote = []) {
  const map = new Map();
  for (const n of [...(local || []), ...(remote || [])]) {
    if (!n || !n.id) continue;
    const prev = map.get(n.id);
    if (!prev) {
      map.set(n.id, n);
      continue;
    }
    const tPrev = Date.parse(prev.date) || 0;
    const tCur = Date.parse(n.date) || 0;
    if (tCur >= tPrev) map.set(n.id, n);
  }
  return Array.from(map.values()).sort(
    (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
  );
}
