"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  if (code.includes("email-already-in-use")) return labels("emailAlreadyUsed");
  if (code.includes("invalid-email")) return labels("invalidEmail");
  if (code.includes("weak-password")) return labels("passwordShort");
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return labels("wrongCredentials");
  }
  if (code.includes("too-many-requests")) return labels("tooManyRequests");
  if (code.includes("permission-denied")) return labels("permissionDenied");
  if (code.includes("operation-not-allowed")) return labels("authDisabled");
  return error?.message || labels("genericError");
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

export function AccountPage() {
  const { t, i18n } = useTranslation("account");
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
        try { localStorage.removeItem("3dxess.account.session.v1"); } catch { /* ignore */ }
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
  }, [t("genericError"), t("passwordShort"), t("wrongCredentials")]);

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
  }, [user, profile, t("genericError")]);

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
    if (!snapshot.exists()) throw new Error(t("profileSaveFailed"));
    setProfile(snapshot.data());
    syncGameNickname(snapshot.data().username, targetUser.uid);
    setProfileMissing(false);
    setNotice(t("created"));
  }

  async function register(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!validUsername(username)) return setError(t("invalidUsername"));
    if (password.length < 8) return setError(t("passwordShort"));
    if (password !== confirmPassword) return setError(t("passwordMismatch"));
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
    if (!validUsername(username)) return setError(t("invalidUsername"));
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
    if (!targetEmail.includes("@")) return setError(t("invalidEmail"));
    setBusy(true);
    try {
      auth.languageCode = i18n.language;
      await sendPasswordResetEmail(auth, targetEmail);
      setMode("login");
      setNotice(t("resetDone"));
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
    return <main id="main" className="account-page"><div className="account-shell"><section className="account-panel"><p className="account-eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p className="account-muted">{t("missingConfig")}</p></section></div></main>;
  }

  if (loading) {
    return (
      <main id="main" className="account-page">
        <div className="account-shell">
          <header className="account-heading">
            <p className="account-eyebrow">{t("eyebrow")}</p>
            <h1>{t("title")}</h1>
            <p className="account-muted">{t("loading")}</p>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="account-page">
      <div className="account-shell">
        <header className="account-heading">
          <p className="account-eyebrow">{t("eyebrow")}</p>
          <h1>{user && profile ? "@" + profile.username : t("title")}</h1>
          <p className="account-muted">{t("subtitle")}</p><div className="account-shortcuts"><a className="site-button site-button-secondary" href="/3dXess/jogar/">{t("playCta")}</a><a className="site-button site-button-quiet" href="/3dXess/praticar/">{t("practiceCta")}</a></div>
        </header>

        {error ? <p className="account-message is-error" role="alert">{error}</p> : null}
        {notice ? <p className="account-message is-success" role="status">{notice}</p> : null}

        {user && profileMissing && !profile ? (
          <section className="account-panel">
            <h2>{t("profileTitle")}</h2><p className="account-muted">{t("profileIntro")}</p>
            <form className="account-form" onSubmit={finishProfile}>
              <label>{t("username")}<input autoComplete="nickname" minLength={3} maxLength={20} value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t("loading") : t("submit")}</button>
            </form>
          </section>
        ) : null}

        {user && profile ? (
          <>
            <section className="account-stats">
              <article><span>{t("rating")}</span><strong>{profile.rating ?? 1000}</strong></article>
              <article><span>{t("level")}</span><strong>{profile.level ?? 1}</strong></article>
              <article><span>{t("xp")}</span><strong>{profile.xp ?? 0}</strong></article>
              <article><span>{t("rank")}</span><strong>{profile.rank ?? "Bronze"}</strong></article>
            </section>
            <section className="account-panel account-profile">
              <div><span>{t("wins")}</span><strong>{profile.wins ?? 0}</strong></div>
              <div><span>{t("draws")}</span><strong>{profile.draws ?? 0}</strong></div>
              <div><span>{t("losses")}</span><strong>{profile.losses ?? 0}</strong></div>
              <div><span>{t("games")}</span><strong>{profile.gamesPlayed ?? 0}</strong></div>
              <button className="site-button site-button-secondary" type="button" onClick={logout} disabled={busy}>{t("logout")}</button>
            </section>
            <section className="account-panel">
              <h2>{t("leaderboard")}</h2>
              {leaderboard.length ? (
                <div className="account-table-wrap"><table className="account-table">
                  <thead><tr><th>#</th><th>{t("player")}</th><th>{t("level")}</th><th>{t("points")}</th></tr></thead>
                  <tbody>{leaderboard.map((entry, index) => (
                    <tr key={entry.id} className={entry.id === user.uid ? "is-current" : ""}>
                      <td>{index + 1}</td><td>@{entry.username || "player"}</td><td>{entry.level ?? 1}</td><td>{entry.rating ?? 1000}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              ) : <p className="account-muted">{t("noRanking")}</p>}
            </section>
          </>
        ) : null}

        {!user && mode === "login" ? (
          <section className="account-panel">
            <div className="account-tabs"><button className="is-active" type="button">{t("login")}</button><button type="button" onClick={() => { setMode("register"); setError(""); setNotice(""); }}>{t("register")}</button></div>
            <form className="account-form" onSubmit={login}>
              <label>{t("identifier")}<input type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              <label>{t("password")}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t("loading") : t("submit")}</button>
            </form>
            <button className="account-link" type="button" onClick={() => { setMode("recover"); setError(""); setNotice(""); }}>{t("forgot")}</button>
          </section>
        ) : null}

        {!user && mode === "register" ? (
          <section className="account-panel">
            <div className="account-tabs"><button type="button" onClick={() => setMode("login")}>{t("login")}</button><button className="is-active" type="button">{t("register")}</button></div>
            <p className="account-muted">{t("createIntro")}</p>
            <form className="account-form" onSubmit={register}>
              <label>{t("username")}<input autoComplete="nickname" minLength={3} maxLength={20} value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
              <label>{t("email")}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>{t("password")}<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <label>{t("confirm")}<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t("loading") : t("submit")}</button>
            </form>
          </section>
        ) : null}

        {!user && mode === "recover" ? (
          <section className="account-panel">
            <h2>{t("recoveryTitle")}</h2><p className="account-muted">{t("recoveryInfo")}</p>
            <form className="account-form" onSubmit={recover}>
              <label>{t("email")}<input type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              <button className="site-button site-button-primary" disabled={busy}>{busy ? t("loading") : t("sendReset")}</button>
            </form>
            <button className="account-link" type="button" onClick={() => { setMode("login"); setError(""); }}>{t("back")}</button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
