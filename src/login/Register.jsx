import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

function Register() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-container">
      <div className="auth-visual"><span className="auth-kicker">YANGI BOSHLANISH</span><h1>Moliyaviy<br /><em>erkinlik.</em></h1><p>Yaxshi odatlar kichik yozuvlardan boshlanadi.</p><div className="auth-orbit"><strong>01</strong><span>birinchi qadam</span></div></div>
      <div className="auth-card">
        <span className="auth-small">{t("registerWelcome")}</span><h2 className="auth-title">{t("registerTitle")}</h2><p className="auth-lead">{t("registerLead")}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>{t("username")}<input type="text" placeholder={t("usernamePlaceholder")} value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label>{t("emailAddress")}<input type="email" placeholder={t("emailPlaceholderRegister")} value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>{t("password")}<input type="password" placeholder={t("passwordHint")} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
          <button type="submit" disabled={loading}>{loading ? "Yaratilmoqda..." : `${t("register")} →`}</button>
        </form>
        {error && <p className="login-error">❌ {error}</p>}
        <p className="auth-link">{t("existingAccount")} <Link to="/login">{t("login")}</Link></p>
      </div>
    </div>
  );
}

export default Register;