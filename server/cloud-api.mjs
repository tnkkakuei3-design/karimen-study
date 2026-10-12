import * as oauth from './vendor/oauth4webapi.mjs';
import { schema } from './schema.mjs';

const ORIGIN = 'https://karimen-study.pages.dev';
const SESSION = '__Host-karimen-session', STATE = '__Host-karimen-oauth';
const MAX_BODY = 900_000, SESSION_SECONDS = 30 * 86400;
const GOOGLE = {
  issuer: 'https://accounts.google.com',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_endpoint: 'https://oauth2.googleapis.com/token',
  jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
  id_token_signing_alg_values_supported: ['RS256']
};
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const reply = (data, status = 200, extra = {}) => Response.json(data, { status, headers: { ...headers, ...extra } });
const random = () => oauth.generateRandomState();
export const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), n => n.toString(16).padStart(2, '0')).join('');
const cookie = (name, value, age) => `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
const cookies = request => Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(v => v.trim().split('=')));
const ready = env => env.CLOUD_ENABLED === 'true' && !!env.DB && !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
const client = env => ({ client_id: env.GOOGLE_CLIENT_ID, id_token_signed_response_alg: 'RS256' });
const invalid = (message, status = 400) => Object.assign(new Error(message), { status, publicMessage: message });
const initialized = new WeakMap();
async function ensureSchema(db) {
  if (!initialized.has(db)) initialized.set(db, db.batch(schema.map(sql => db.prepare(sql).bind())).catch(error => { initialized.delete(db); throw error; }));
  await initialized.get(db);
}

async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw invalid('JSON形式で送信してください。', 415);
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) throw invalid('記録の容量が上限を超えています。端末の記録は残っています。', 413);
  const reader = request.body?.getReader();
  if (!reader) throw invalid('送信内容がありません。');
  let length = 0; const chunks = [];
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) { await reader.cancel(); throw invalid('記録の容量が上限を超えています。端末の記録は残っています。', 413); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); } catch { throw invalid('送信内容を読み取れませんでした。'); }
}

async function limit(db, key, count, now) {
  const bucket = `${key}:${Math.floor(now / 60000)}`;
  const row = await db.prepare('INSERT INTO cloud_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket, now + 120000).first();
  if (row.count > count) throw invalid('少し待ってから、もう一度お試しください。', 429);
}
async function identity(request, db, now) {
  const token = cookies(request)[SESSION];
  if (!token || !/^[\w-]{40,128}$/.test(token)) return null;
  return db.prepare('SELECT u.id,u.email FROM cloud_sessions s JOIN cloud_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token), now).first();
}
function validateProgress(value, user) {
  if (!value || value.version !== 5 || value.kind !== 'karimen-progress' || value.sync?.owner !== user.id || value.sync?.v !== 1 || !value.sync.baselines || !value.sync.events || typeof value.sync.events !== 'object' || Array.isArray(value.sync.events)) throw invalid('対応していない記録です。端末の記録は変更していません。');
  // These are private backups, never trusted leaderboard scores.
  if (Object.keys(value.sync.events).length > 50000) throw invalid('同期できる回答履歴の上限に達しました。端末の記録は残っています。', 413);
}

export async function handleCloud(request, env, context = {}, dependencies = {}) {
  const now = (dependencies.now || Date.now)(), url = new URL(request.url), path = url.pathname;
  try {
    // Preview deployments and the old GitHub origin must never share production login cookies/data.
    if (url.origin !== ORIGIN) return reply({ error: '本番サイトから開いてください。' }, 403);
    if (path === '/api/cloud/config' && request.method === 'GET') return reply({ enabled: ready(env) });
    if (!ready(env)) return reply({ error: 'クラウド保存は準備中です。学習記録は端末に保存されます。' }, 503);
    const db = env.DB;
    await ensureSchema(db);
    if (!['GET','HEAD'].includes(request.method) && (request.headers.get('Origin') !== ORIGIN || request.headers.get('X-Karimen-Request') !== '1')) return reply({ error: 'このサイトの画面から操作してください。' }, 403);

    if (path === '/api/auth/start' && request.method === 'POST') {
      const ipKey = await digest((request.headers.get('CF-Connecting-IP') || 'unknown') + env.GOOGLE_CLIENT_SECRET + Math.floor(now / 86400000));
      await limit(db, `login:${ipKey}`, 10, now);
      const state = random(), verifier = oauth.generateRandomCodeVerifier(), nonce = oauth.generateRandomNonce();
      await db.prepare('INSERT INTO cloud_oauth(state_hash,verifier,nonce,expires_at) VALUES(?,?,?,?)').bind(await digest(state), verifier, nonce, now + 600000).run();
      const target = new URL(GOOGLE.authorization_endpoint);
      target.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: ORIGIN + '/api/auth/callback', response_type: 'code', scope: 'openid email', state, nonce, code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      return reply({ url: target.href }, 200, { 'Set-Cookie': cookie(STATE, state, 600) });
    }
    if (path === '/api/auth/callback' && request.method === 'GET') {
      const state = cookies(request)[STATE];
      if (!state || !/^[\w-]{40,128}$/.test(state) || url.searchParams.get('state') !== state) throw invalid('ログインの確認ができませんでした。元の画面からやり直してください。');
      const flow = await db.prepare('DELETE FROM cloud_oauth WHERE state_hash=? AND expires_at>? RETURNING verifier,nonce').bind(await digest(state), now).first();
      if (!flow) throw invalid('ログインの有効時間が切れました。元の画面からやり直してください。');
      const oauthOptions = { signal: AbortSignal.timeout(10000), ...(dependencies.oauthOptions || {}) };
      const params = oauth.validateAuthResponse(GOOGLE, client(env), url, state);
      const response = await oauth.authorizationCodeGrantRequest(GOOGLE, client(env), oauth.ClientSecretPost(env.GOOGLE_CLIENT_SECRET), params, ORIGIN + '/api/auth/callback', flow.verifier, oauthOptions);
      const tokens = await oauth.processAuthorizationCodeResponse(GOOGLE, client(env), response, { expectedNonce: flow.nonce, requireIdToken: true });
      await oauth.validateApplicationLevelSignature(GOOGLE, response, oauthOptions);
      const claims = oauth.getValidatedIdTokenClaims(tokens);
      if (!claims || typeof claims.sub !== 'string' || claims.sub.length > 255 || claims.email_verified !== true || typeof claims.email !== 'string' || claims.email.length > 320) throw invalid('Googleアカウントを確認できませんでした。');
      if (env.CLOUD_ALLOWED_EMAILS && !env.CLOUD_ALLOWED_EMAILS.split(',').map(v => v.trim().toLowerCase()).includes(claims.email.toLowerCase())) throw invalid('現在は設定確認中です。管理者が指定したアカウントでログインしてください。', 403);
      const user = await db.prepare('INSERT INTO cloud_users(id,google_sub,email,created_at) VALUES(?,?,?,?) ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email RETURNING id').bind(crypto.randomUUID(), claims.sub, claims.email, now).first();
      const token = random();
      await db.prepare('INSERT INTO cloud_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token), user.id, now + SESSION_SECONDS * 1000).run();
      const h = new Headers({ ...headers, Location: ORIGIN + '/?cloud=connected' });
      h.append('Set-Cookie', cookie(SESSION, token, SESSION_SECONDS)); h.append('Set-Cookie', cookie(STATE, '', 0));
      return new Response(null, { status: 303, headers: h });
    }
    const user = await identity(request, db, now);
    if (path === '/api/auth/me' && request.method === 'GET') return reply({ user });
    if (!user) return reply({ error: 'ログインしてください。' }, 401);
    if (path === '/api/auth/logout' && request.method === 'POST') {
      await db.prepare('DELETE FROM cloud_sessions WHERE token_hash=?').bind(await digest(cookies(request)[SESSION])).run();
      return reply({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION, '', 0) });
    }
    if (path === '/api/progress' && request.method === 'GET') {
      const row = await db.prepare('SELECT revision,raw,updated_at FROM cloud_progress WHERE user_id=?').bind(user.id).first();
      return reply(row ? { revision: row.revision, state: JSON.parse(row.raw), updatedAt: row.updated_at } : { revision: 0, state: null });
    }
    if (path === '/api/progress' && request.method === 'PUT') {
      await limit(db, `save:${user.id}`, 60, now);
      const data = await body(request);
      if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw invalid('同期の版を確認できませんでした。');
      validateProgress(data.state, user);
      const raw = JSON.stringify(data.state), next = data.revision + 1;
      // Compare-and-swap is one SQLite statement. The history insert shares its transaction.
      const results = await db.batch([
        db.prepare('INSERT INTO cloud_progress(user_id,revision,raw,updated_at) SELECT ?,1,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM cloud_progress WHERE user_id=? AND revision=?) ON CONFLICT(user_id) DO UPDATE SET revision=cloud_progress.revision+1,raw=excluded.raw,updated_at=excluded.updated_at WHERE cloud_progress.revision=? RETURNING revision').bind(user.id, raw, now, data.revision, user.id, data.revision, data.revision),
        db.prepare('INSERT OR IGNORE INTO cloud_history(user_id,revision,raw,updated_at) SELECT user_id,revision,raw,updated_at FROM cloud_progress WHERE user_id=? AND revision=?').bind(user.id, next)
      ]);
      if (!results[0].results.length) return reply({ error: '別の端末の記録を確認してから再送します。' }, 409);
      // Keep 30 latest revisions and one final snapshot per day for 30 days.
      const cleanup = db.batch([
        db.prepare('DELETE FROM cloud_history WHERE user_id=? AND revision<? AND (updated_at<? OR revision NOT IN (SELECT MAX(revision) FROM cloud_history WHERE user_id=? GROUP BY CAST(updated_at/86400000 AS INTEGER)))').bind(user.id, next - 30, now - 30 * 86400000, user.id),
        db.prepare('DELETE FROM cloud_limits WHERE expires_at<?').bind(now),
        db.prepare('DELETE FROM cloud_oauth WHERE expires_at<?').bind(now),
        db.prepare('DELETE FROM cloud_sessions WHERE expires_at<?').bind(now)
      ]).catch(() => {});
      context.waitUntil?.(cleanup);
      return reply({ revision: next, updatedAt: now });
    }
    return reply({ error: '見つかりません。' }, 404);
  } catch (error) {
    // Never leak tokens, SQL, private state or Google responses into a page or log.
    return reply({ error: error.publicMessage || 'クラウドに接続できませんでした。端末の記録は残っています。' }, error.status || 503);
  }
}
