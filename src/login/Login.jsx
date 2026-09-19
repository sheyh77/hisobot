import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

function Login() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate(searchParams.get("next") === "admin" ? "/admin" : "/");
    } catch (loginError) {
      setError(`❌ ${loginError.message}`);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email.includes("@")) {
      setError("Parolni tiklash uchun email manzilini kiriting.");
      return;
    }
    try {
      await resetPassword(email);
      setResetMessage("Parolni tiklash havolasi emailingizga yuborildi.");
      setError("");
    } catch (resetError) {
      setError(resetError.code === "auth/user-not-found" ? "Bu email Firebase'da topilmadi." : "Parolni tiklashda xatolik yuz berdi.");
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-visual"><span className="auth-kicker">MOLIYAVIY KUNDALIK</span><h1>Har bir so'm<br /><em>o'z o'rnida.</em></h1><p>Moliyangizni tushuning, rejalashtiring va xotirjam yashang.</p><div className="auth-orbit"><strong>24/7</strong><span>nazorat sizning qo'lingizda</span></div></div>
      <div className="login-card auth-card">
        <span className="auth-small">Xush kelibsiz</span><h2 className="login-title">Hisobingizga kiring</h2><p className="auth-lead">Moliyaviy kundaligingiz sizni kutmoqda.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>Email yoki login<input
            type="text"
            placeholder="email yoki login"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            required
            className="login-input"
          /></label>
          <label>Parol<input
            type="password"
            placeholder="Parolingizni kiriting"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            required
            className="login-input"
          /></label>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Tekshirilmoqda..." : "Kirish →"}
          </button>
          <button type="button" className="auth-reset" onClick={handleReset}>Parolni unutdingizmi?</button>
        </form>
        {error && <p className="login-error">{error}</p>}
        {resetMessage && <p className="auth-success">{resetMessage}</p>}
        <p className="auth-link">Yangi foydalanuvchimisiz? <Link to="/register">Hisob ochish</Link></p>
      </div>
    </div>
  );
}

export default Login;