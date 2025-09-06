import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetch(`https://a139ac647c5e2feb.mokky.dev/transactions?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(err => console.error("Xatolik: ", err));
  }, [user]);

  const kirim = transactions
    .filter(t => t.type === "kirim")
    .reduce((sum, t) => sum + t.amount, 0);

  const chiqim = transactions
    .filter(t => t.type === "chiqim")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = kirim - chiqim;

  // O‘zbekcha kunlar
  const kunlar = ["Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba","Yakshanba"];

  const today = new Date();
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);

  const haftalikData = kunlar.map((kun, index) => {
    const sana = new Date(firstDayOfWeek);
    sana.setDate(firstDayOfWeek.getDate() + index);

    const kunTrans = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return (
        tDate.getDate() === sana.getDate() &&
        tDate.getMonth() === sana.getMonth() &&
        tDate.getFullYear() === sana.getFullYear()
      );
    });

    return {
      date: kun,
      kirim: kunTrans.filter(t => t.type === "kirim").reduce((sum, t) => sum + t.amount, 0),
      chiqim: kunTrans.filter(t => t.type === "chiqim").reduce((sum, t) => sum + t.amount, 0),
    };
  });

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ Dashboard uchun login qiling</h2>;
  }

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
              <p className="dashboard-cards-title">Umumiy kirim</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-green">{kirim.toLocaleString()} so'm</p>
            </div>
            <div className="dashboard-cards-output">
              <p className="dashboard-cards-title">Umumiy chiqim</p>
              <p className="dashboard-cards-sum dashboard-cards-sum-red">{chiqim.toLocaleString()} so'm</p>
            </div>
          </div>

          {/* Chart */}
          <div style={{ width: "100%", height: 400, marginTop: 30 }}>
            <ResponsiveContainer>
              <LineChart data={haftalikData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="kirim" stroke="green" strokeWidth={3} />
                <Line type="monotone" dataKey="chiqim" stroke="red" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;