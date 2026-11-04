const IDENTITY = "https://identitytoolkit.googleapis.com/v1";
const FIRESTORE = "https://firestore.googleapis.com/v1/projects/";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CUSTOM_AUD = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
const SCOPE = "https://www.googleapis.com/auth/datastore";
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
let cachedToken = "";
let cachedUntil = 0;
const attempts = new Map();

function reply(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, corsHeaders || {}),
  });
}
function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function pemBytes(pem) {
  return fromB64(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""));
}
function segment(value) {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}
async function signingKey(serviceAccount) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}
async function signJwt(payload, serviceAccount) {
  const unsigned = segment({ alg: "RS256", typ: "JWT" }) + "." + segment(payload);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await signingKey(serviceAccount),
    new TextEncoder().encode(unsigned),
  );
  return unsigned + "." + b64url(new Uint8Array(signature));
}
function serviceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não configurada.");
  const value = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!value.client_email || !value.private_key) throw new Error("Conta de serviço Firebase inválida.");
  return value;
}
async function accessToken(env) {
  if (cachedToken && Date.now() < cachedUntil - 60000) return cachedToken;
  const account = serviceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }, account);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Falha ao autenticar o Worker no Firestore.");
  cachedToken = result.access_token;
  cachedUntil = Date.now() + Number(result.expires_in || 3600) * 1000;
  return cachedToken;
}
async function customToken(uid, env) {
  const account = serviceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    iss: account.client_email,
    sub: account.client_email,
    aud: CUSTOM_AUD,
    iat: now,
    exp: now + 3600,
    uid: uid,
  }, account);
}
function firestoreRoot(env) {
  return FIRESTORE + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents";
}
function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}
function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]));
}
function decodeValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  return null;
}
function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}
async function firestoreRequest(env, path, options) {
  const response = await fetch(firestoreRoot(env) + "/" + path, Object.assign({}, options || {}, {
    headers: Object.assign({
      Authorization: "Bearer " + await accessToken(env),
      "Content-Type": "application/json",
    }, options?.headers || {}),
  }));
  if (response.status === 404) return null;
  const raw = await response.text();
  if (!response.ok) throw new Error("Firestore respondeu com HTTP " + response.status + ".");
  return raw ? JSON.parse(raw) : {};
}
async function getDoc(env, path) {
  const data = await firestoreRequest(env, path);
  return data ? decodeFields(data.fields || {}) : null;
}
async function patchDoc(env, path, data) {
  const mask = Object.keys(data).map((key) => "updateMask.fieldPaths=" + encodeURIComponent(key)).join("&");
  return firestoreRequest(env, path + (mask ? "?" + mask : ""), {
    method: "PATCH",
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
}
async function commitDocs(env, docs) {
  const base = "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents/";
  const writes = docs.map((item) => ({
    update: { name: base + item.path, fields: encodeFields(item.data) },
    currentDocument: { exists: false },
  }));
  const response = await fetch(firestoreRoot(env) + ":commit", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + await accessToken(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 409 || detail.includes("ALREADY_EXISTS") || detail.includes("FAILED_PRECONDITION")) {
      throw new Error("Username ou e-mail já cadastrado.");
    }
    throw new Error("Não foi possível gravar o perfil no Firestore.");
  }
}
async function identity(env, action, data) {
  if (!env.FIREBASE_API_KEY) throw new Error("FIREBASE_API_KEY não configurada.");
  const response = await fetch(
    IDENTITY + "/" + action + "?key=" + encodeURIComponent(env.FIREBASE_API_KEY),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || "Falha no Firebase Authentication.");
  return result;
}
async function authenticatedUser(request, env) {
  const header = request.headers.get("Authorization") || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) throw new Error("Sessão inválida ou expirada.");
  const result = await identity(env, "accounts:lookup", { idToken: idToken });
  const user = result.users && result.users[0];
  if (!user || !user.localId || !user.email) throw new Error("Não foi possível validar a sessão.");
  return { uid: user.localId, email: user.email.toLowerCase() };
}
async function sha256(value) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function base32Encode(bytes) {
  let buffer = 0;
  let bits = 0;
  let output = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += BASE32[(buffer << (5 - bits)) & 31];
  return output;
}
function base32Decode(value) {
  let buffer = 0;
  let bits = 0;
  const output = [];
  for (const char of value.replace(/=+$/g, "").toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Segredo TOTP inválido.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}
function secureEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}
async function verifyTotp(secret, supplied, now) {
  const code = String(supplied || "").trim();
  if (!/^\d{6}$/.test(code)) return false;
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), {
    name: "HMAC", hash: "SHA-1",
  }, false, ["sign"]);
  const counter = Math.floor((now || Date.now()) / 30000);
  for (let offset = -1; offset <= 1; offset += 1) {
    const message = new ArrayBuffer(8);
    new DataView(message).setUint32(4, counter + offset);
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
    const index = signature[signature.length - 1] & 15;
    const number = ((signature[index] & 127) << 24)
      | ((signature[index + 1] & 255) << 16)
      | ((signature[index + 2] & 255) << 8)
      | (signature[index + 3] & 255);
    const expected = String(number % 1000000).padStart(6, "0");
    if (secureEqual(expected, code)) return true;
  }
  return false;
}
async function encryptionKey(env) {
  if (!env.TOTP_ENCRYPTION_KEY) throw new Error("TOTP_ENCRYPTION_KEY não configurada.");
  const bytes = fromB64(env.TOTP_ENCRYPTION_KEY.trim());
  if (bytes.length !== 32) throw new Error("TOTP_ENCRYPTION_KEY precisa ter 32 bytes em Base64.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptSecret(secret, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    await encryptionKey(env),
    new TextEncoder().encode(secret),
  );
  return { iv: b64url(iv), ciphertext: b64url(new Uint8Array(cipher)) };
}
async function decryptSecret(record, env) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(record.iv) },
    await encryptionKey(env),
    fromB64(record.ciphertext),
  );
  return new TextDecoder().decode(plain);
}
function rateLimited(request, key) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const id = ip + ":" + key;
  const now = Date.now();
  const current = attempts.get(id) || { count: 0, at: now };
  if (now - current.at > 600000) { current.count = 0; current.at = now; }
  current.count += 1;
  attempts.set(id, current);
  return current.count > 8;
}
async function initAccount(request, env) {
  const user = await authenticatedUser(request, env);
  const body = await request.json();
  const username = String(body.username || "").trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return reply({ error: "Username deve ter de 3 a 20 caracteres: letras, números e underline." }, 400);
  }
  const normalized = username.toLowerCase();
  const emailHash = await sha256(user.email);
  const usernamePath = "usernameIndex/" + normalized;
  const emailPath = "emailIndex/" + emailHash;
  const existing = await Promise.all([
    getDoc(env, usernamePath),
    getDoc(env, emailPath),
    getDoc(env, "users/" + user.uid),
  ]);
  if (existing[0] && existing[0].uid !== user.uid) return reply({ error: "Este username já está em uso." }, 409);
  if (existing[1] && existing[1].uid !== user.uid) return reply({ error: "Este e-mail já possui um perfil." }, 409);
  if (existing[2]) {
    if (String(existing[2].username || "").toLowerCase() !== normalized) {
      return reply({ error: "Este cadastro já está associado a outro username." }, 409);
    }
    return reply({ success: true, profileExists: true });
  }
  const now = new Date().toISOString();
  const profile = {
    uid: user.uid,
    username: username,
    normalizedUsername: normalized,
    avatarUrl: "",
    bio: "",
    rating: 1000,
    peakRating: 1000,
    xp: 0,
    level: 1,
    rank: "Bronze",
    wins: 0,
    draws: 0,
    losses: 0,
    gamesPlayed: 0,
    isTotpEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
  await commitDocs(env, [
    { path: "users/" + user.uid, data: profile },
    { path: "privateUsers/" + user.uid, data: { email: user.email, createdAt: now } },
    { path: usernamePath, data: { uid: user.uid, username: username, createdAt: now } },
    { path: emailPath, data: { uid: user.uid } },
  ]);
  return reply({ success: true, profileExists: false });
}
async function usernameLogin(request, env) {
  const body = await request.json();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[a-z0-9_]{3,20}$/.test(username) || !password) return reply({ error: "Username ou senha incorretos." }, 400);
  if (rateLimited(request, "login:" + username)) return reply({ error: "Muitas tentativas. Aguarde alguns minutos." }, 429);
  const index = await getDoc(env, "usernameIndex/" + username);
  if (!index || !index.uid) return reply({ error: "Username ou senha incorretos." }, 401);
  const records = await Promise.all([
    getDoc(env, "privateUsers/" + index.uid),
    getDoc(env, "users/" + index.uid),
  ]);
  if (!records[0] || !records[0].email || !records[1] || !records[1].isTotpEnabled) {
    return reply({ error: "Username ou senha incorretos." }, 401);
  }
  let credentials;
  try {
    credentials = await identity(env, "accounts:signInWithPassword", {
      email: records[0].email,
      password: password,
      returnSecureToken: true,
    });
  } catch {
    return reply({ error: "Username ou senha incorretos." }, 401);
  }
  if (credentials.localId !== index.uid) return reply({ error: "Username ou senha incorretos." }, 401);
  return reply({ customToken: await customToken(index.uid, env) }, 200);
}
async function enrollTotp(request, env) {
  const user = await authenticatedUser(request, env);
  const profile = await getDoc(env, "users/" + user.uid);
  if (!profile) return reply({ error: "Finalize seu perfil antes de configurar o autenticador." }, 409);
  const existing = await getDoc(env, "totpSecrets/" + user.uid);
  if (existing && existing.enabled) return reply({ error: "O autenticador já está ativo nesta conta." }, 409);
  let secret;
  if (existing && existing.iv && existing.ciphertext) {
    secret = await decryptSecret(existing, env);
  } else {
    secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
    const encrypted = await encryptSecret(secret, env);
    await patchDoc(env, "totpSecrets/" + user.uid, Object.assign({}, encrypted, {
      enabled: false,
      createdAt: new Date().toISOString(),
    }));
  }
  const label = encodeURIComponent("3dXess:" + profile.username);
  const issuer = encodeURIComponent("3dXess");
  const uri = "otpauth://totp/" + label + "?secret=" + secret
    + "&issuer=" + issuer + "&algorithm=SHA1&digits=6&period=30";
  return reply({ secret: secret, otpauthUri: uri }, 200);
}
async function confirmTotp(request, env) {
  const user = await authenticatedUser(request, env);
  const body = await request.json();
  const record = await getDoc(env, "totpSecrets/" + user.uid);
  if (!record || !record.iv || !record.ciphertext) return reply({ error: "Gere primeiro o QR Code do autenticador." }, 409);
  const secret = await decryptSecret(record, env);
  if (!(await verifyTotp(secret, body.code))) return reply({ error: "Código do autenticador inválido ou expirado." }, 400);
  const now = new Date().toISOString();
  await patchDoc(env, "totpSecrets/" + user.uid, { enabled: true, confirmedAt: now });
  await patchDoc(env, "users/" + user.uid, { isTotpEnabled: true, updatedAt: now });
  return reply({ success: true }, 200);
}
async function recoverPassword(request, env) {
  const body = await request.json();
  const identifier = String(body.identifier || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 8) return reply({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, 400);
  if (rateLimited(request, "recovery:" + identifier)) return reply({ error: "Muitas tentativas. Aguarde alguns minutos." }, 429);
  let uid = "";
  if (identifier.includes("@")) {
    uid = (await getDoc(env, "emailIndex/" + await sha256(identifier)))?.uid || "";
  } else {
    uid = (await getDoc(env, "usernameIndex/" + identifier))?.uid || "";
  }
  if (!uid) return reply({ error: "Identificador ou código inválido." }, 400);
  const record = await getDoc(env, "totpSecrets/" + uid);
  if (!record || !record.enabled) return reply({ error: "Identificador ou código inválido." }, 400);
  const secret = await decryptSecret(record, env);
  if (!(await verifyTotp(secret, code))) return reply({ error: "Identificador ou código inválido." }, 400);
  const token = await customToken(uid, env);
  const session = await identity(env, "accounts:signInWithCustomToken", {
    token: token,
    returnSecureToken: true,
  });
  await identity(env, "accounts:update", {
    idToken: session.idToken,
    password: newPassword,
    returnSecureToken: true,
  });
  return reply({ success: true }, 200);
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.ALLOWED_ORIGINS || "https://vitormartinsalves.github.io,http://localhost:5173")
    .split(",").map((item) => item.trim()).filter(Boolean);
  if (origin && allowed.indexOf(origin) < 0) return null;
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (!cors) return reply({ error: "Origin não autorizado." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const path = new URL(request.url).pathname;
    try {
      if (request.method === "GET" && path === "/health") return reply({ ok: true, service: "3dxess-account-api" }, 200, cors);
      if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405, cors);
      let response;
      if (path === "/account/init") response = await initAccount(request, env);
      else if (path === "/auth/username-login") response = await usernameLogin(request, env);
      else if (path === "/totp/enroll") response = await enrollTotp(request, env);
      else if (path === "/totp/confirm") response = await confirmTotp(request, env);
      else if (path === "/auth/recover") response = await recoverPassword(request, env);
      else response = reply({ error: "Endpoint não encontrado." }, 404);
      const headers = new Headers(response.headers);
      Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers: headers });
    } catch (error) {
      return reply({ error: error.message || "Erro interno no serviço de contas." }, 500, cors);
    }
  },
};
