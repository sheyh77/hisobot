import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        <span className="auth-small">Qo'shilish</span><h2 className="auth-title">O'z hisobingizni yarating</h2><p className="auth-lead">Barcha moliyaviy rejalaringiz bir joyda.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Foydalanuvchi nomi<input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          /></label>
          <label>Email manzil<input
            type="email"
            placeholder="sizning@emailingiz.uz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /></label>
          <label>Parol<input
            type="password"
            placeholder="Kamida 6 ta belgi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          /></label>
          <button type="submit" disabled={loading}>{loading ? "Yaratilmoqda..." : "Hisob ochish →"}</button>
        </form>
        {error && <p className="login-error">❌ {error}</p>}
        <p className="auth-link">
          Hisobingiz bormi? <Link to="/login">Kirish</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;