import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined, WalletOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserTransactions } from "../services/firestore";
import { useLanguage } from "../context/LanguageContext";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    getUserTransactions(user.id)
      .then(data => setTransactions(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ Dashboard uchun login qiling</h2>;
  }

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const actualTransactions = transactions.filter((transaction) => transaction.status !== "planned");
  const totalKirim = actualTransactions
    .filter(t => t.type === "kirim")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalChiqim = actualTransactions
    .filter(t => t.type === "chiqim")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthTransactions = actualTransactions.filter(t => {
    const date = new Date(t.createdAt);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthIncome = monthTransactions.filter(t => t.type === "kirim").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthExpense = monthTransactions.filter(t => t.type === "chiqim").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const todayTrans = actualTransactions.filter(t => new Date(t.createdAt).toDateString() === today.toDateString()).slice(0, 5).map((t, index) => ({ ...t, key: t.id || index }));
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentYear, currentMonth - 5 + index, 1);
    const items = actualTransactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear();
    });
    return {
      name: date.toLocaleDateString("uz-UZ", { month: "short" }),
      kirim: items.filter(t => t.type === "kirim").reduce((sum, t) => sum + Number(t.amount || 0), 0),
      chiqim: items.filter(t => t.type === "chiqim").reduce((sum, t) => sum + Number(t.amount || 0), 0),
    };
  });

  const balance = totalKirim - totalChiqim;
  const formatMoney = (amount) => `${amount.toLocaleString("uz-UZ")} so'm`;
  const monthName = today.toLocaleDateString("uz-UZ", { month: "long" });

  return (
    <section className="dashboard">
      <div className="cantainer">
        <div className="dashboard-wrap">
          <div className="dashboard-intro">
            <div><p className="eyebrow">Moliyaviy nazorat markazi</p><h1 className="dashboard-title">Salom, {user?.username}!</h1><p className="dashboard-subtitle">Bugungi qarorlaringiz ertangi xotirjamlikni yaratadi.</p></div>
            <Link to="/kirim-chiqim" className="primary-action"><PlusOutlined /> {t("add")}</Link>
          </div>
          <div className="dashboard-cards">
            <div className="dashboard-cards-balance">
              <div className="stat-icon stat-icon-blue"><WalletOutlined /></div>
              <p className="dashboard-cards-title">Sizning hisobingiz</p>
              <p className="dashboard-cards-sum">{formatMoney(balance)}</p><span className="stat-note">Barcha vaqt bo'yicha</span>
            </div>
            <div className="dashboard-cards-income">
              <div className="stat-icon stat-icon-green"><ArrowUpOutlined /></div><p className="dashboard-cards-title">Jami kirim</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-green">{formatMoney(totalKirim)}</p><span className="stat-note">Daromadlar yig'indisi</span>
            </div>
            <div className="dashboard-cards-output">
              <div className="stat-icon stat-icon-red"><ArrowDownOutlined /></div><p className="dashboard-cards-title">Jami chiqim</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-red">{formatMoney(totalChiqim)}</p><span className="stat-note">Xarajatlar yig'indisi</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-panel chart-panel">
              <div className="panel-heading"><div><p className="eyebrow">Oylik ko'rinish</p><h2>{monthName} dinamikasi</h2></div><span className="chart-legend"><i className="legend-income" /> Kirim <i className="legend-expense" /> Chiqim</span></div>
              {loading ? <div className="empty-state">Ma'lumotlar yuklanmoqda...</div> : <ResponsiveContainer width="100%" height={245}><BarChart data={chartData} barGap={6}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => formatMoney(value)} /><Bar dataKey="kirim" fill="#159a78" radius={[5, 5, 0, 0]} /><Bar dataKey="chiqim" fill="#e8795f" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>}
              <div className="month-summary"><span>Bu oy kirim <strong className="text-green">{formatMoney(monthIncome)}</strong></span><span>Bu oy chiqim <strong className="text-red">{formatMoney(monthExpense)}</strong></span></div>
            </div>
            <div className="dashboard-panel insight-panel"><p className="eyebrow">Siz uchun</p><h2>Moliyaviy odat</h2><div className="insight-mark">{monthIncome > 0 && monthExpense <= monthIncome ? "✓" : "!"}</div><p>{monthIncome > 0 && monthExpense <= monthIncome ? "Ajoyib! Bu oy daromadingiz xarajatingizdan yuqori." : "Xarajatlarni nazorat qilish uchun bugun birinchi qaydni kiriting."}</p><Link to="/hisobot" className="text-link">Batafsil tahlil <span>→</span></Link></div>
          </div>

          <div className="dashboard-transactions dashboard-panel">
            <div className="panel-heading"><div><p className="eyebrow">{t("activity")}</p><h2>{t("today")}</h2></div><Link to="/hisobot" className="text-link">{t("all")} <span>→</span></Link></div>
            {error && <div className="empty-state error-state">{error}</div>}
            {!loading && !error && todayTrans.length === 0 && <div className="empty-state">Bugun hali tranzaksiya yo'q. Birinchi yozuvingizni qo'shing.</div>}
            <div className="dashboard-transactions-list">
              {todayTrans.map((t) => (
                <div key={t.key} className="transaction-card">
                  <div className="transaction-icon">
                    {t.type === "chiqim" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                  </div>
                  <div className="transaction-info">
                    <p className="transaction-title">{t.desc || "Nomsiz tranzaksiya"}</p>
                    <p className="transaction-subtitle">{t.type === "chiqim" ? "Chiqim" : "Kirim"}</p>
                  </div>
                  <div className={`transaction-amount ${t.type === "chiqim" ? "red" : "green"}`}>
                    {t.type === "chiqim" ? "-" : "+"}{formatMoney(Number(t.amount || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;