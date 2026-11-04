import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query,
} from "firebase/firestore";
import { accountApiUrl, auth, db, firebaseConfigReady } from "../../shared/firebase/client.js";
import { callAccountApi } from "./accountApi.js";
import "./account.css";

const text = {
  "pt-BR": {
    eyebrow: "SUA CONTA 3DXESS", title: "Sua evolução, em um só lugar.",
    subtitle: "Acompanhe rating, nível, partidas e posição no ranking.",
    login: "Entrar", register: "Criar conta", recover: "Recuperar senha",
    identifier: "E-mail ou username", email: "E-mail", username: "Username",
    password: "Senha", confirm: "Confirmar senha", submit: "Continuar",
    forgot: "Esqueci minha senha", createIntro: "Escolha um username público. Seu e-mail não aparece no perfil.",
    noEmailVerify: "Não enviaremos verificação de e-mail. O autenticador é obrigatório.",
    setupProfile: "Finalize seu perfil", setupProfileText: "Escolha seu username para concluir o cadastro.",
    totpTitle: "Configure o Google Authenticator", totpIntro: "Escaneie o QR Code com o Google Authenticator ou outro app TOTP. Depois informe o código de seis dígitos.",
    secret: "Chave de configuração", code: "Código de 6 dígitos", confirmTotp: "Confirmar autenticador",
    setupTotp: "A configuração do autenticador é obrigatória antes de usar a conta.",
    startTotp: "Gerar QR Code", copySecret: "Copiar chave", logout: "Sair",
    rating: "Rating", level: "Nível", xp: "XP", rank: "Patente",
    wins: "Vitórias", draws: "Empates", losses: "Derrotas", games: "Partidas",
    leaderboard: "Ranking global", player: "Jogador", points: "Pontos",
    recoveryTitle: "Recuperar senha", recoveryInfo: "A recuperação usa exclusivamente seu código TOTP. Não existe recuperação por e-mail.",
    newPassword: "Nova senha", reset: "Redefinir senha", back: "Voltar",
    loading: "Carregando…", missingConfig: "Firebase não configurado. Confira as variáveis VITE_FIREBASE_* no GitHub Actions.",
    missingWorker: "A API de contas ainda não foi publicada. O cadastro precisa do Worker para reservar username e configurar o autenticador.",
    noRanking: "O ranking aparecerá quando houver jogadores cadastrados.",
    passwordShort: "A senha precisa ter pelo menos 8 caracteres.",
    passwordMismatch: "As senhas não coincidem.",
    invalidUsername: "Use de 3 a 20 caracteres: letras, números e underline.",
    wrongCredentials: "Username/e-mail ou senha incorretos.",
    genericError: "Não foi possível concluir. Confira os dados e tente novamente.",
    created: "Conta criada. Configure o autenticador para liberar o perfil.",
    resetDone: "Senha redefinida. Entre com sua nova senha.",
    secretCopied: "Chave copiada.",
  },
  en: {
    eyebrow: "YOUR 3DXESS ACCOUNT", title: "Your progress, in one place.",
    subtitle: "Track your rating, level, games and leaderboard position.",
    login: "Sign in", register: "Create account", recover: "Reset password",
    identifier: "Email or username", email: "Email", username: "Username",
    password: "Password", confirm: "Confirm password", submit: "Continue",
    forgot: "Forgot password?", createIntro: "Choose a public username. Your email stays private.",
    noEmailVerify: "No email verification is sent. Authenticator setup is required.",
    setupProfile: "Complete your profile", setupProfileText: "Choose a username to finish registration.",
    totpTitle: "Set up Google Authenticator", totpIntro: "Scan this QR code with Google Authenticator or another TOTP app, then enter the six-digit code.",
    secret: "Setup key", code: "6-digit code", confirmTotp: "Confirm authenticator",
    setupTotp: "Authenticator setup is required before using your account.",
    startTotp: "Generate QR code", copySecret: "Copy key", logout: "Sign out",
    rating: "Rating", level: "Level", xp: "XP", rank: "Rank",
    wins: "Wins", draws: "Draws", losses: "Losses", games: "Games",
    leaderboard: "Global leaderboard", player: "Player", points: "Points",
    recoveryTitle: "Reset password", recoveryInfo: "Password recovery uses only your TOTP code. Email recovery is disabled.",
    newPassword: "New password", reset: "Reset password", back: "Back",
    loading: "Loading…", missingConfig: "Firebase is not configured. Check VITE_FIREBASE_* variables in GitHub Actions.",
    missingWorker: "The account API has not been deployed. Registration needs the Worker to reserve usernames and set up the authenticator.",
    noRanking: "The leaderboard will appear when players join.",
    passwordShort: "Password must contain at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    invalidUsername: "Use 3–20 characters: letters, numbers and underscores.",
    wrongCredentials: "Username/email or password is incorrect.",
    genericError: "Could not complete the request. Check your details and try again.",
    created: "Account created. Set up the authenticator to unlock your profile.",
    resetDone: "Password reset. Sign in with your new password.",
    secretCopied: "Key copied.",
  },
  es: {
    eyebrow: "TU CUENTA 3DXESS", title: "Tu progreso, en un solo lugar.",
    subtitle: "Consulta tu rating, nivel, partidas y posición en la clasificación.",
    login: "Entrar", register: "Crear cuenta", recover: "Recuperar contraseña",
    identifier: "Correo o username", email: "Correo", username: "Username",
    password: "Contraseña", confirm: "Confirmar contraseña", submit: "Continuar",
    forgot: "Olvidé mi contraseña", createIntro: "Elige un username público. Tu correo permanece privado.",
    noEmailVerify: "No enviaremos verificación por correo. El autenticador es obligatorio.",
    setupProfile: "Completa tu perfil", setupProfileText: "Elige un username para completar el registro.",
    totpTitle: "Configura Google Authenticator", totpIntro: "Escanea el QR con Google Authenticator u otra app TOTP e introduce el código de seis dígitos.",
    secret: "Clave de configuración", code: "Código de 6 dígitos", confirmTotp: "Confirmar autenticador",
    setupTotp: "El autenticador es obligatorio antes de usar la cuenta.",
    startTotp: "Generar QR", copySecret: "Copiar clave", logout: "Salir",
    rating: "Rating", level: "Nivel", xp: "XP", rank: "Rango",
    wins: "Victorias", draws: "Empates", losses: "Derrotas", games: "Partidas",
    leaderboard: "Clasificación global", player: "Jugador", points: "Puntos",
    recoveryTitle: "Recuperar contraseña", recoveryInfo: "La recuperación usa exclusivamente el código TOTP. No hay recuperación por correo.",
    newPassword: "Nueva contraseña", reset: "Restablecer", back: "Volver",
    loading: "Cargando…", missingConfig: "Firebase no está configurado. Revisa las variables VITE_FIREBASE_* en GitHub Actions.",
    missingWorker: "La API de cuentas aún no está publicada. El registro necesita el Worker para reservar username y configurar el autenticador.",
    noRanking: "La clasificación aparecerá cuando haya jugadores.",
    passwordShort: "La contraseña debe tener al menos 8 caracteres.",
    passwordMismatch: "Las contraseñas no coinciden.",
    invalidUsername: "Usa de 3 a 20 caracteres: letras, números y guion bajo.",
    wrongCredentials: "Username/correo o contraseña incorrectos.",
    genericError: "No se pudo completar. Revisa los datos e inténtalo de nuevo.",
    created: "Cuenta creada. Configura el autenticador para desbloquear el perfil.",
    resetDone: "Contraseña restablecida. Entra con tu nueva contraseña.",
    secretCopied: "Clave copiada.",
  },
  "zh-CN": {
    eyebrow: "你的 3DXESS 账户", title: "在一个地方查看你的进度。",
    subtitle: "查看等级分、等级、对局和排行榜位置。",
    login: "登录", register: "创建账户", recover: "重置密码",
    identifier: "邮箱或用户名", email: "邮箱", username: "用户名",
    password: "密码", confirm: "确认密码", submit: "继续",
    forgot: "忘记密码？", createIntro: "选择公开用户名。邮箱不会显示在个人资料中。",
    noEmailVerify: "暂不发送邮箱验证。必须设置身份验证器。",
    setupProfile: "完善个人资料", setupProfileText: "选择用户名以完成注册。",
    totpTitle: "设置 Google Authenticator", totpIntro: "使用 Google Authenticator 或其他 TOTP 应用扫描二维码，然后输入六位验证码。",
    secret: "设置密钥", code: "六位验证码", confirmTotp: "确认身份验证器",
    setupTotp: "使用账户前必须设置身份验证器。",
    startTotp: "生成二维码", copySecret: "复制密钥", logout: "退出",
    rating: "等级分", level: "等级", xp: "经验", rank: "段位",
    wins: "胜利", draws: "和棋", losses: "失败", games: "对局",
    leaderboard: "全球排行榜", player: "玩家", points: "分数",
    recoveryTitle: "重置密码", recoveryInfo: "只能使用 TOTP 验证码恢复密码，不提供邮箱找回。",
    newPassword: "新密码", reset: "重置密码", back: "返回",
    loading: "正在加载…", missingConfig: "Firebase 尚未配置。请检查 GitHub Actions 中的 VITE_FIREBASE_* 变量。",
    missingWorker: "账户 API 尚未部署。注册需要 Worker 来保留用户名并设置身份验证器。",
    noRanking: "玩家加入后，排行榜将在这里显示。",
    passwordShort: "密码至少需要 8 个字符。",
    passwordMismatch: "两次输入的密码不一致。",
    invalidUsername: "用户名需为 3–20 个字符，只能使用字母、数字和下划线。",
    wrongCredentials: "用户名/邮箱或密码错误。",
    genericError: "无法完成操作。请检查信息后重试。",
    created: "账户已创建。请设置身份验证器以启用个人资料。",
    resetDone: "密码已重置。请使用新密码登录。",
    secretCopied: "密钥已复制。",
  },
};

function validUsername(value) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(value.trim());
}

function readableError(error, labels) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "Este e-mail já está cadastrado.";
  if (code.includes("invalid-email")) return "Informe um e-mail válido.";
  if (code.includes("weak-password")) return labels.passwordShort;
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return labels.wrongCredentials;
  }
  if (code.includes("too-many-requests")) return "Muitas tentativas. Aguarde e tente novamente.";
  return error?.message || labels.genericError;
}

export function AccountPage({ locale = "pt-BR" }) {
  const t = text[locale] || text["pt-BR"];
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [totp, setTotp] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!firebaseConfigReady || !auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setProfile(null);
      setProfileMissing(false);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "users", nextUser.uid));
        if (snapshot.exists()) setProfile(snapshot.data());
        else setProfileMissing(true);
      } catch (loadError) {
        setError(readableError(loadError, t));
      } finally {
        setLoading(false);
      }
    });
  }, [t.genericError, t.passwordShort, t.wrongCredentials]);

  useEffect(() => {
    if (!db || !user || !profile?.isTotpEnabled) return undefined;
    let active = true;
    getDocs(query(collection(db, "users"), orderBy("rating", "desc"), limit(10)))
      .then((snapshot) => {
        if (active) setLeaderboard(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      })
      .catch((loadError) => {
        if (active) setError(readableError(loadError, t));
      });
    return () => { active = false; };
  }, [user, profile?.isTotpEnabled, t.genericError]);

  async function currentIdToken() {
    if (!auth?.currentUser) throw new Error("Sua sessão expirou. Entre novamente.");
    return auth.currentUser.getIdToken();
  }

  async function initializeProfile() {
    const token = await currentIdToken();
    await callAccountApi("/account/init", { username }, token);
    const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (!snapshot.exists()) throw new Error("O perfil não foi criado no Firestore.");
    setProfile(snapshot.data());
    setProfileMissing(false);
    setNotice(t.created);
  }

  async function beginTotp() {
    setBusy(true);
    setError("");
    try {
      const token = await currentIdToken();
      const result = await callAccountApi("/totp/enroll", {}, token);
      setTotp(result);
      setQrDataUrl(await QRCode.toDataURL(result.otpauthUri, {
        width: 220,
        margin: 2,
        color: { dark: "#0b0f14", light: "#ffffff" },
      }));
    } catch (startError) {
      setError(readableError(startError, t));
    } finally {
      setBusy(false);
    }
  }

  async function register(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!accountApiUrl) return setError(t.missingWorker);
    if (!validUsername(username)) return setError(t.invalidUsername);
    if (password.length < 8) return setError(t.passwordShort);
    if (password !== confirmPassword) return setError(t.passwordMismatch);
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      await initializeProfile();
      setMode("login");
      // The TOTP screen is mandatory: profile data stays locked until confirmed.
      await beginTotp();
    } catch (registerError) {
      setError(readableError(registerError, t));
      if (auth.currentUser) setProfileMissing(true);
    } finally {
      setBusy(false);
    }
  }

  async function finishProfile(event) {
    event.preventDefault();
    setError("");
    if (!validUsername(username)) return setError(t.invalidUsername);
    setBusy(true);
    try {
      await initializeProfile();
      await beginTotp();
    } catch (profileError) {
      setError(readableError(profileError, t));
    } finally {
      setBusy(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const value = identifier.trim();
      if (value.includes("@")) {
        await signInWithEmailAndPassword(auth, value, password);
      } else {
        const result = await callAccountApi("/auth/username-login", { username: value, password });
        await signInWithCustomToken(auth, result.customToken);
      }
    } catch (loginError) {
      setError(readableError(loginError, t));
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = await currentIdToken();
      await callAccountApi("/totp/confirm", { code }, token);
      const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
      setProfile(snapshot.data());
      setTotp(null);
      setQrDataUrl("");
      setCode("");
      setNotice("Autenticador confirmado. Sua conta está pronta.");
    } catch (confirmError) {
      setError(readableError(confirmError, t));
    } finally {
      setBusy(false);
    }
  }

  async function recover(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 8) return setError(t.passwordShort);
    setBusy(true);
    try {
      await callAccountApi("/auth/recover", { identifier: identifier.trim(), code, newPassword });
      setMode("login");
      setPassword("");
      setNewPassword("");
      setCode("");
      setNotice(t.resetDone);
    } catch (recoveryError) {
      setError(readableError(recoveryError, t));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await signOut(auth);
      setProfile(null);
      setLeaderboard([]);
      setTotp(null);
      setNotice("");
      setError("");
      setMode("login");
    } catch (logoutError) {
      setError(readableError(logoutError, t));
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(totp.secret);
      setNotice(t.secretCopied);
    } catch {
      setError("Não foi possível copiar. Selecione a chave e copie manualmente.");
    }
  }

  if (!firebaseConfigReady) {
    return <main id="main" className="account-page"><div className="account-shell"><section className="account-panel"><p className="account-eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="account-muted">{t.missingConfig}</p></section></div></main>;
  }

  if (loading) {
    return <main id="main" className="account-page"><div className="account-shell"><section className="account-panel">{t.loading}</section></div></main>;
  }

  const needsTotp = Boolean(user && profile && !profile.isTotpEnabled);

  return (
    <main id="main" className="account-page">
      <div className="account-shell">
        <header className="account-heading">
          <p className="account-eyebrow">{t.eyebrow}</p>
          <h1>{user && profile?.isTotpEnabled ? "@" + profile.username : t.title}</h1>
          <p className="account-muted">{t.subtitle}</p>
        </header>

        {error ? <p className="account-message is-error" role="alert">{error}</p> : null}
        {notice ? <p className="account-message is-success" role="status">{notice}</p> : null}

        {user && profileMissing ? (
          <section className="account-panel">
            <h2>{t.setupProfile}</h2><p className="account-muted">{t.setupProfileText}</p>
            <form className="account-form" onSubmit={finishProfile}>
              <label>{t.username}<input autoComplete="username" minLength={3} maxLength={20} value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
              <p className="account-muted">{t.missingWorker}</p>
              <button className="site-button site-button-primary" disabled={busy}>{t.submit}</button>
            </form>
          </section>
        ) : null}

        {needsTotp ? (
          <section className="account-panel">
            <h2>{t.totpTitle}</h2>
            <p className="account-muted">{t.setupTotp}</p>
            {!totp ? (
              <div className="account-form">
                <p className="account-muted">{t.totpIntro}</p>
                <button className="site-button site-button-primary" type="button" onClick={beginTotp} disabled={busy}>{busy ? t.loading : t.startTotp}</button>
              </div>
            ) : (
              <form className="account-totp" onSubmit={confirmTotp}>
                {qrDataUrl ? <img className="account-qr" src={qrDataUrl} alt="QR Code de configuração do autenticador" /> : null}
                <p className="account-muted">{t.totpIntro}</p>
                <label>{t.secret}<code className="account-secret">{totp.secret}</code></label>
                <button className="account-link" type="button" onClick={copySecret}>{t.copySecret}</button>
                <label>{t.code}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} required /></label>
                <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.confirmTotp}</button>
              </form>
            )}
          </section>
        ) : null}

        {user && profile?.isTotpEnabled ? (
          <>
            <section className="account-stats">
              <article><span>{t.rating}</span><strong>{profile.rating ?? 1000}</strong></article>
              <article><span>{t.level}</span><strong>{profile.level ?? 1}</strong></article>
              <article><span>{t.xp}</span><strong>{profile.xp ?? 0}</strong></article>
              <article><span>{t.rank}</span><strong>{profile.rank ?? "Bronze"}</strong></article>
            </section>
            <section className="account-panel account-profile">
              <div><span>{t.wins}</span><strong>{profile.wins ?? 0}</strong></div>
              <div><span>{t.draws}</span><strong>{profile.draws ?? 0}</strong></div>
              <div><span>{t.losses}</span><strong>{profile.losses ?? 0}</strong></div>
              <div><span>{t.games}</span><strong>{profile.gamesPlayed ?? 0}</strong></div>
              <button className="site-button site-button-secondary" type="button" onClick={logout} disabled={busy}>{t.logout}</button>
            </section>
            <section className="account-panel">
              <h2>{t.leaderboard}</h2>
              {leaderboard.length ? (
                <div className="account-table-wrap"><table className="account-table">
                  <thead><tr><th>#</th><th>{t.player}</th><th>{t.level}</th><th>{t.points}</th></tr></thead>
                  <tbody>{leaderboard.map((entry, index) => (
                    <tr key={entry.id} className={entry.id === user.uid ? "is-current" : ""}>
                      <td>{index + 1}</td><td>@{entry.username || "player"}</td><td>{entry.level ?? 1}</td><td>{entry.rating ?? 1000}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              ) : <p className="account-muted">{t.noRanking}</p>}
            </section>
          </>
        ) : null}

        {!user && mode === "login" ? (
          <section className="account-panel">
            <div className="account-tabs"><button className="is-active" type="button">{t.login}</button><button type="button" onClick={() => { setMode("register"); setError(""); setNotice(""); }}>{t.register}</button></div>
            <form className="account-form" onSubmit={login}>
              <label>{t.identifier}<input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              <label>{t.password}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.submit}</button>
            </form>
            <button className="account-link" type="button" onClick={() => { setMode("recover"); setError(""); setNotice(""); }}>{t.forgot}</button>
          </section>
        ) : null}

        {!user && mode === "register" ? (
          <section className="account-panel">
            <div className="account-tabs"><button type="button" onClick={() => setMode("login")}>{t.login}</button><button className="is-active" type="button">{t.register}</button></div>
            <p className="account-muted">{t.createIntro} {t.noEmailVerify}</p>
            <form className="account-form" onSubmit={register}>
              <label>{t.username}<input autoComplete="username" minLength={3} maxLength={20} value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
              <label>{t.email}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>{t.password}<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <label>{t.confirm}<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.submit}</button>
            </form>
          </section>
        ) : null}

        {!user && mode === "recover" ? (
          <section className="account-panel">
            <h2>{t.recoveryTitle}</h2><p className="account-muted">{t.recoveryInfo}</p>
            <form className="account-form" onSubmit={recover}>
              <label>{t.identifier}<input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              <label>{t.code}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} required /></label>
              <label>{t.newPassword}<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.reset}</button>
            </form>
            <button className="account-link" type="button" onClick={() => { setMode("login"); setError(""); }}>{t.back}</button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
