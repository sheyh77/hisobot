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
import { useSubscription } from "../context/SubscriptionContext";
import { getUserTransactions } from "../services/firestore";
import { useLanguage } from "../context/LanguageContext";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    getUserTransactions(user.id)
      .then((data) => setTransactions(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ {t("loginRequiredDashboard")}</h2>;
  }

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const actualTransactions = transactions.filter((transaction) => transaction.status !== "planned");
  const totalKirim = actualTransactions
    .filter((item) => item.type === "kirim")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalChiqim = actualTransactions
    .filter((item) => item.type === "chiqim")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthTransactions = actualTransactions.filter((item) => {
    const date = new Date(item.createdAt);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthIncome = monthTransactions.filter((item) => item.type === "kirim").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthExpense = monthTransactions.filter((item) => item.type === "chiqim").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const todayTrans = actualTransactions.filter((item) => new Date(item.createdAt).toDateString() === today.toDateString()).slice(0, 5).map((item, index) => ({ ...item, key: item.id || index }));
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentYear, currentMonth - 5 + index, 1);
    const items = actualTransactions.filter((item) => {
      const transactionDate = new Date(item.createdAt);
      return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear();
    });
    return {
      name: date.toLocaleDateString("uz-UZ", { month: "short" }),
      kirim: items.filter((item) => item.type === "kirim").reduce((sum, item) => sum + Number(item.amount || 0), 0),
      chiqim: items.filter((item) => item.type === "chiqim").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  });

  const balance = totalKirim - totalChiqim;
  const formatMoney = (amount) => `${amount.toLocaleString("uz-UZ")} ${t("monthlyCurrency")}`;
  const monthName = today.toLocaleDateString("uz-UZ", { month: "long" });

  return (
    <section className="dashboard">
      <div className="cantainer">
        <div className="dashboard-wrap">
          <div className="dashboard-intro">
            <div>
              <p className="eyebrow">{t("dashboardCenter")}</p>
              <h1 className="dashboard-title">{t("hello", { name: user?.username || "User" })}</h1>
              <p className="dashboard-subtitle">{t("dashboardSubtitle")}</p>
            </div>
            <Link to="/kirim-chiqim" className="primary-action"><PlusOutlined /> {t("add")}</Link>
          </div>
          <div className="dashboard-cards">
            <div className="dashboard-cards-balance">
              <div className="stat-icon stat-icon-blue"><WalletOutlined /></div>
              <p className="dashboard-cards-title">{t("yourBalance")}</p>
              <p className="dashboard-cards-sum">{formatMoney(balance)}</p>
              <span className="stat-note">{t("allTime")}</span>
            </div>
            <div className="dashboard-cards-income">
              <div className="stat-icon stat-icon-green"><ArrowUpOutlined /></div>
              <p className="dashboard-cards-title">{t("totalIncome")}</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-green">{formatMoney(totalKirim)}</p>
              <span className="stat-note">{t("income")}</span>
            </div>
            <div className="dashboard-cards-output">
              <div className="stat-icon stat-icon-red"><ArrowDownOutlined /></div>
              <p className="dashboard-cards-title">{t("totalExpense")}</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-red">{formatMoney(totalChiqim)}</p>
              <span className="stat-note">{t("expense")}</span>
            </div>
          </div>
          {isPro && <Link to="/pro" className="dashboard-pro-entry"><span><strong>{t("proWorkspace")}</strong><small>{t("advancedAnalysis")}</small></span><b>{t("detailAnalysis")} <span>→</span></b></Link>}

          <div className="dashboard-grid">
            <div className="dashboard-panel chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{t("monthlyView")}</p>
                  <h2>{t("monthlyDynamic", { month: monthName })}</h2>
                </div>
                <span className="chart-legend"><i className="legend-income" /> {t("incomeLegend")} <i className="legend-expense" /> {t("expenseLegend")}</span>
              </div>
              {loading ? <div className="empty-state">{t("loading")}</div> : <ResponsiveContainer width="100%" height={245}><BarChart data={chartData} barGap={6}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => formatMoney(value)} /><Bar dataKey="kirim" fill="#159a78" radius={[5, 5, 0, 0]} /><Bar dataKey="chiqim" fill="#e8795f" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>}
              <div className="month-summary"><span>{t("monthIncome")} <strong className="text-green">{formatMoney(monthIncome)}</strong></span><span>{t("monthExpense")} <strong className="text-red">{formatMoney(monthExpense)}</strong></span></div>
            </div>
            <div className="dashboard-panel insight-panel">
              <p className="eyebrow">{t("insight")}</p>
              <h2>{t("financialHabit")}</h2>
              <div className="insight-mark">{monthIncome > 0 && monthExpense <= monthIncome ? "✓" : "!"}</div>
              <p>{monthIncome > 0 && monthExpense <= monthIncome ? "Ajoyib! Bu oy daromadingiz xarajatingizdan yuqori." : "Xarajatlarni nazorat qilish uchun bugun birinchi qaydni kiriting."}</p>
              <Link to="/hisobot" className="text-link">{t("detailAnalysis")} <span>→</span></Link>
            </div>
          </div>

          <div className="dashboard-transactions dashboard-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">{t("activity")}</p><h2>{t("today")}</h2></div>
              <Link to="/hisobot" className="text-link">{t("all")} <span>→</span></Link>
            </div>
            {error && <div className="empty-state error-state">{error}</div>}
            {!loading && !error && todayTrans.length === 0 && <div className="empty-state">{t("noTransactionsToday")}</div>}
            <div className="dashboard-transactions-list">
              {todayTrans.map((item) => (
                <div key={item.key} className="transaction-card">
                  <div className="transaction-icon">
                    {item.type === "chiqim" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                  </div>
                  <div className="transaction-info">
                    <p className="transaction-title">{item.desc || t("transactionDefault")}</p>
                    <p className="transaction-subtitle">{item.type === "chiqim" ? t("expense") : t("income")}</p>
                  </div>
                  <div className={`transaction-amount ${item.type === "chiqim" ? "red" : "green"}`}>
                    {item.type === "chiqim" ? "-" : "+"}{formatMoney(Number(item.amount || 0))}
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