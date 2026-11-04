import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { auth, db, firebaseConfigReady } from "../../shared/firebase/client.js";
import "./account.css";

const text = {
  "pt-BR": {
    eyebrow: "SUA CONTA 3DXESS", title: "Sua evolução, em um só lugar.",
    subtitle: "Acompanhe rating, nível, partidas e posição no ranking.",
    login: "Entrar", register: "Criar conta", recover: "Recuperar senha",
    identifier: "E-mail", email: "E-mail", username: "Nome de jogador",
    password: "Senha", confirm: "Confirmar senha", submit: "Continuar",
    forgot: "Esqueci minha senha", createIntro: "Escolha o nome público que aparecerá no seu perfil e nas partidas.",
    profileTitle: "Complete seu perfil", profileIntro: "Escolha um nome de jogador para continuar.",
    logout: "Sair", rating: "Rating", level: "Nível", xp: "XP", rank: "Patente",
    wins: "Vitórias", draws: "Empates", losses: "Derrotas", games: "Partidas",
    leaderboard: "Ranking global", player: "Jogador", points: "Pontos",
    recoveryTitle: "Recuperar senha",
    recoveryInfo: "Informe o e-mail da sua conta. O Firebase enviará um link para criar uma nova senha.",
    sendReset: "Enviar link de recuperação", back: "Voltar",
    loading: "Carregando…", missingConfig: "Firebase não configurado. Confira as variáveis VITE_FIREBASE_* no GitHub Actions.",
    noRanking: "O ranking aparecerá quando houver jogadores cadastrados.",
    passwordShort: "A senha precisa ter pelo menos 8 caracteres.",
    passwordMismatch: "As senhas não coincidem.",
    invalidUsername: "Use de 3 a 20 caracteres: letras, números e underline.",
    wrongCredentials: "E-mail ou senha incorretos.",
    genericError: "Não foi possível concluir. Confira os dados e tente novamente.",
    created: "Conta criada. Seu perfil está pronto.",
    resetDone: "Se o e-mail estiver cadastrado, você receberá uma mensagem com o link para redefinir a senha.",
  },
  en: {
    eyebrow: "YOUR 3DXESS ACCOUNT", title: "Your progress, in one place.",
    subtitle: "Track your rating, level, games and leaderboard position.",
    login: "Sign in", register: "Create account", recover: "Reset password",
    identifier: "Email", email: "Email", username: "Player name",
    password: "Password", confirm: "Confirm password", submit: "Continue",
    forgot: "Forgot password?", createIntro: "Choose the public name shown on your profile and in games.",
    profileTitle: "Complete your profile", profileIntro: "Choose a player name to continue.",
    logout: "Sign out", rating: "Rating", level: "Level", xp: "XP", rank: "Rank",
    wins: "Wins", draws: "Draws", losses: "Losses", games: "Games",
    leaderboard: "Global leaderboard", player: "Player", points: "Points",
    recoveryTitle: "Reset password",
    recoveryInfo: "Enter your account email. Firebase will send you a link to create a new password.",
    sendReset: "Send recovery link", back: "Back",
    loading: "Loading…", missingConfig: "Firebase is not configured. Check VITE_FIREBASE_* variables in GitHub Actions.",
    noRanking: "The leaderboard will appear when players join.",
    passwordShort: "Password must contain at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    invalidUsername: "Use 3–20 characters: letters, numbers and underscores.",
    wrongCredentials: "Email or password is incorrect.",
    genericError: "Could not complete the request. Check your details and try again.",
    created: "Account created. Your profile is ready.",
    resetDone: "If this email is registered, you will receive a message with a password reset link.",
  },
  es: {
    eyebrow: "TU CUENTA 3DXESS", title: "Tu progreso, en un solo lugar.",
    subtitle: "Consulta tu rating, nivel, partidas y posición en la clasificación.",
    login: "Entrar", register: "Crear cuenta", recover: "Recuperar contraseña",
    identifier: "Correo electrónico", email: "Correo electrónico", username: "Nombre de jugador",
    password: "Contraseña", confirm: "Confirmar contraseña", submit: "Continuar",
    forgot: "Olvidé mi contraseña", createIntro: "Elige el nombre público que aparecerá en tu perfil y en las partidas.",
    profileTitle: "Completa tu perfil", profileIntro: "Elige un nombre de jugador para continuar.",
    logout: "Salir", rating: "Rating", level: "Nivel", xp: "XP", rank: "Rango",
    wins: "Victorias", draws: "Empates", losses: "Derrotas", games: "Partidas",
    leaderboard: "Clasificación global", player: "Jugador", points: "Puntos",
    recoveryTitle: "Recuperar contraseña",
    recoveryInfo: "Introduce el correo de tu cuenta. Firebase enviará un enlace para crear una nueva contraseña.",
    sendReset: "Enviar enlace de recuperación", back: "Volver",
    loading: "Cargando…", missingConfig: "Firebase no está configurado. Revisa las variables VITE_FIREBASE_* en GitHub Actions.",
    noRanking: "La clasificación aparecerá cuando haya jugadores.",
    passwordShort: "La contraseña debe tener al menos 8 caracteres.",
    passwordMismatch: "Las contraseñas no coinciden.",
    invalidUsername: "Usa de 3 a 20 caracteres: letras, números y guion bajo.",
    wrongCredentials: "El correo o la contraseña son incorrectos.",
    genericError: "No se pudo completar. Revisa los datos e inténtalo de nuevo.",
    created: "Cuenta creada. Tu perfil está listo.",
    resetDone: "Si el correo está registrado, recibirás un mensaje con el enlace para restablecer la contraseña.",
  },
  "zh-CN": {
    eyebrow: "你的 3DXESS 账户", title: "在一个地方查看你的进度。",
    subtitle: "查看等级分、等级、对局和排行榜位置。",
    login: "登录", register: "创建账户", recover: "重置密码",
    identifier: "邮箱", email: "邮箱", username: "玩家名称",
    password: "密码", confirm: "确认密码", submit: "继续",
    forgot: "忘记密码？", createIntro: "选择将在个人资料和对局中显示的公开名称。",
    profileTitle: "完善个人资料", profileIntro: "选择玩家名称以继续。",
    logout: "退出", rating: "等级分", level: "等级", xp: "经验", rank: "段位",
    wins: "胜利", draws: "和棋", losses: "失败", games: "对局",
    leaderboard: "全球排行榜", player: "玩家", points: "分数",
    recoveryTitle: "找回密码",
    recoveryInfo: "输入账户邮箱。Firebase 将发送用于创建新密码的链接。",
    sendReset: "发送密码重置链接", back: "返回",
    loading: "正在加载…", missingConfig: "Firebase 尚未配置。请检查 GitHub Actions 中的 VITE_FIREBASE_* 变量。",
    noRanking: "玩家加入后，排行榜将在这里显示。",
    passwordShort: "密码至少需要 8 个字符。",
    passwordMismatch: "两次输入的密码不一致。",
    invalidUsername: "用户名需为 3–20 个字符，只能使用字母、数字和下划线。",
    wrongCredentials: "邮箱或密码错误。",
    genericError: "无法完成操作。请检查信息后重试。",
    created: "账户已创建。个人资料已准备就绪。",
    resetDone: "如果该邮箱已注册，你将收到包含密码重置链接的邮件。",
  },
};

function validUsername(value) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(value.trim());
}

function syncGameNickname(value, uid) {
  const nickname = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 20);
  if (!nickname || !uid) return;
  try {
    // Must match legacy/game/app.js exactly.
    const settingsKey = "xadrez3d.settings.v3";
    const current = JSON.parse(localStorage.getItem(settingsKey) || "{}");
    localStorage.setItem(settingsKey, JSON.stringify({ ...current, nickname }));
    localStorage.setItem("3dxess.account.session.v1", JSON.stringify({
      uid,
      username: nickname,
    }));
  } catch {
    // Firestore remains the source of truth if local storage is unavailable.
  }
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
  if (code.includes("permission-denied")) return "O Firestore bloqueou esta operação. Publique as regras atualizadas do arquivo firestore.rules no Console do Firebase.";
  if (code.includes("operation-not-allowed")) return "Ative E-mail/senha em Authentication → Método de login no Firebase.";
  return error?.message || labels.genericError;
}

const initialProfile = (username) => ({
  username: username.trim(),
  rating: 1000,
  level: 1,
  xp: 0,
  rank: "Bronze",
  wins: 0,
  draws: 0,
  losses: 0,
  gamesPlayed: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export function AccountPage({ locale = "pt-BR" }) {
  const t = text[locale] || text["pt-BR"];
  const creatingProfileRef = useRef(false);
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
        if (snapshot.exists()) {
          const nextProfile = snapshot.data();
          setProfile(nextProfile);
          syncGameNickname(nextProfile.username, nextUser.uid);
        } else setProfileMissing(true);
      } catch (loadError) {
        setError(readableError(loadError, t));
      } finally {
        setLoading(false);
      }
    });
  }, [t.genericError, t.passwordShort, t.wrongCredentials]);

  useEffect(() => {
    if (!db || !user || !profile) return undefined;
    let active = true;
    getDocs(query(collection(db, "users"), orderBy("rating", "desc"), limit(10)))
      .then((snapshot) => {
        if (active) setLeaderboard(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      })
      .catch((loadError) => {
        if (active) setError(readableError(loadError, t));
      });
    return () => { active = false; };
  }, [user, profile, t.genericError]);

  async function createProfile(targetUser, playerName) {
    const profileRef = doc(db, "users", targetUser.uid);
    const existing = await getDoc(profileRef);
    if (existing.exists()) {
      await updateDoc(profileRef, {
        username: playerName.trim(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(profileRef, initialProfile(playerName));
    }
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) throw new Error("O perfil não foi encontrado no Firestore após salvar.");
    setProfile(snapshot.data());
    syncGameNickname(snapshot.data().username, targetUser.uid);
    setProfileMissing(false);
    setNotice(t.created);
  }

  async function register(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!validUsername(username)) return setError(t.invalidUsername);
    if (password.length < 8) return setError(t.passwordShort);
    if (password !== confirmPassword) return setError(t.passwordMismatch);
    setBusy(true);
    creatingProfileRef.current = true;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createProfile(credential.user, username);
      setPassword("");
      setConfirmPassword("");
    } catch (registerError) {
      if (auth.currentUser) setProfileMissing(true);
      setError(readableError(registerError, t));
    } finally {
      creatingProfileRef.current = false;
      setBusy(false);
    }
  }

  async function finishProfile(event) {
    event.preventDefault();
    setError("");
    if (!validUsername(username)) return setError(t.invalidUsername);
    if (!user) return;
    setBusy(true);
    try {
      await createProfile(user, username);
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
      await signInWithEmailAndPassword(auth, identifier.trim(), password);
      setPassword("");
    } catch (loginError) {
      setError(readableError(loginError, t));
    } finally {
      setBusy(false);
    }
  }

  async function recover(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const targetEmail = identifier.trim();
    if (!targetEmail.includes("@")) return setError("Informe o e-mail cadastrado na conta.");
    setBusy(true);
    try {
      auth.languageCode = locale;
      await sendPasswordResetEmail(auth, targetEmail);
      setMode("login");
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
      try { localStorage.removeItem("3dxess.account.session.v1"); } catch { /* ignore */ }
      setProfile(null);
      setLeaderboard([]);
      setNotice("");
      setError("");
      setMode("login");
      setIdentifier("");
    } catch (logoutError) {
      setError(readableError(logoutError, t));
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseConfigReady) {
    return <main id="main" className="account-page"><div className="account-shell"><section className="account-panel"><p className="account-eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="account-muted">{t.missingConfig}</p></section></div></main>;
  }

  if (loading) {
    return <main id="main" className="account-page"><div className="account-shell"><section className="account-panel">{t.loading}</section></div></main>;
  }

  return (
    <main id="main" className="account-page">
      <div className="account-shell">
        <header className="account-heading">
          <p className="account-eyebrow">{t.eyebrow}</p>
          <h1>{user && profile ? "@" + profile.username : t.title}</h1>
          <p className="account-muted">{t.subtitle}</p>
        </header>

        {error ? <p className="account-message is-error" role="alert">{error}</p> : null}
        {notice ? <p className="account-message is-success" role="status">{notice}</p> : null}

        {user && profileMissing && !profile ? (
          <section className="account-panel">
            <h2>{t.profileTitle}</h2><p className="account-muted">{t.profileIntro}</p>
            <form className="account-form" onSubmit={finishProfile}>
              <label>{t.username}<input autoComplete="nickname" minLength={3} maxLength={20} value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.submit}</button>
            </form>
          </section>
        ) : null}

        {user && profile ? (
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
              <label>{t.identifier}<input type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              <label>{t.password}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.submit}</button>
            </form>
            <button className="account-link" type="button" onClick={() => { setMode("recover"); setError(""); setNotice(""); }}>{t.forgot}</button>
          </section>
        ) : null}

        {!user && mode === "register" ? (
          <section className="account-panel">
            <div className="account-tabs"><button type="button" onClick={() => setMode("login")}>{t.login}</button><button className="is-active" type="button">{t.register}</button></div>
            <p className="account-muted">{t.createIntro}</p>
            <form className="account-form" onSubmit={register}>
              <label>{t.username}<input autoComplete="nickname" minLength={3} maxLength={20} value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
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
              <label>{t.email}<input type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t.loading : t.sendReset}</button>
            </form>
            <button className="account-link" type="button" onClick={() => { setMode("login"); setError(""); }}>{t.back}</button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
