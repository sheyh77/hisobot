import React, { useEffect, useState } from "react";
import { Table, Tag } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    if (!user) return;

    fetch(`https://a139ac647c5e2feb.mokky.dev/transactions?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(err => console.error("Xatolik: ", err));
  }, [user]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ Dashboard uchun login qiling</h2>;
  }

  // Bugungi tranzaksiyalar
  const today = new Date();
  const todayTrans = transactions
    .filter(t => {
      const tDate = new Date(t.createdAt);
      return (
        tDate.getDate() === today.getDate() &&
        tDate.getMonth() === today.getMonth() &&
        tDate.getFullYear() === today.getFullYear()
      );
    })
    .map((t, i) => ({ ...t, key: t.id || i }));

  const totalKirim = todayTrans
    .filter(t => t.type === "kirim")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalChiqim = todayTrans
    .filter(t => t.type === "chiqim")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalKirim - totalChiqim;

  return (
    <section className="dashboard">
      <div className="cantainer">
        <div className="dashboard-wrap">
          <h1 className="dashboard-title">Salom, {user?.username} 👋</h1>
          {/* Cards */}
          <div className="dashboard-cards">
            <div className="dashboard-cards-balance">
              <p className="dashboard-cards-title">Sizning hisobingiz</p>
              <p className="dashboard-cards-sum">{balance.toLocaleString()} so'm</p>
            </div>
            <div className="dashboard-cards-income">
              <p className="dashboard-cards-title">Bugungi kirim</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-green">{totalKirim.toLocaleString()} so'm</p>
            </div>
            <div className="dashboard-cards-output">
              <p className="dashboard-cards-title">Bugungi chiqim</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-red">{totalChiqim.toLocaleString()} so'm</p>
            </div>
          </div>
          {/* Table */}
          <div className="dashboard-transactions">
            <h2 className="dashboard-transactions-title">Bugungi hisobot</h2>
            <div className="dashboard-transactions-list">
              {todayTrans.map((t) => (
                <div key={t.key} className="transaction-card">
                  <div className="transaction-icon">
                    {t.type === "chiqim" ? (
                      <span role="img" aria-label="minus">🛒</span>
                    ) : (
                      <span role="img" aria-label="plus">💰</span>
                    )}
                  </div>
                  <div className="transaction-info">
                    <p className="transaction-title">{t.desc || "No description"}</p>
                    <p className="transaction-subtitle">{t.type === "chiqim" ? "Chiqim" : "Kirim"}</p>
                  </div>
                  <div className={`transaction-amount ${t.type === "chiqim" ? "red" : "green"}`}>
                    {t.type === "chiqim" ? "-" : "+"}{t.amount.toLocaleString()} so'm
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