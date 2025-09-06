import React, { useEffect, useState } from "react";
import { Table, Tag, Button } from "antd";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import { useAuth } from "../context/AuthContext";

const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const { user } = useAuth(); // ✅ to‘g‘rilandi

  useEffect(() => {
    if (!user) return;

    fetch(`https://a139ac647c5e2feb.mokky.dev/transactions?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        const withKeys = data.map((t, i) => ({ ...t, key: t.id || i }));
        setTransactions(withKeys);
      })
      .catch(err => console.error("Xatolik:", err));

  }, [user]);

  const filtered = transactions.filter((t) =>
    filter === "all" ? true : t.type === filter
  );

  const columns = [
    {
      title: "#",
      dataIndex: "key",
      key: "key",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "sana",
      render: (createdAt) =>
        new Date(createdAt).toLocaleDateString("uz-UZ"),
    },
    {
      title: "Soat",
      dataIndex: "createdAt",
      key: "soat",
      render: (createdAt) =>
        new Date(createdAt).toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Turi",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "kirim" ? "green" : "red"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Summa",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `${amount.toLocaleString()} so'm`,
    },
    {
      title: "Izoh",
      dataIndex: "desc",
      key: "desc",
      render: (desc) => desc || "-",
    },
  ];

  const totalKirim = filtered
    .filter((t) => t.type === "kirim")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalChiqim = filtered
    .filter((t) => t.type === "chiqim")
    .reduce((sum, t) => sum + t.amount, 0);

  const chartData = [
    { name: "Kirim", value: totalKirim },
    { name: "Chiqim", value: totalChiqim },
  ];

  const COLORS = ["#52c41a", "#ff4d4f"];

  const exportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Sana,Soat,Turi,Summa,Izoh"]
        .concat(
          filtered.map(
            (r) =>
              `${new Date(r.createdAt).toLocaleDateString("uz-UZ")},${new Date(
                r.createdAt
              ).toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
              })},${r.type},${r.amount},${r.desc || "-"}`
          )
        )
        .join("\n");

    const a = document.createElement("a");
    a.href = encodeURI(csvContent);
    a.download = "hisobot.csv";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("📊 Hisobot", 10, 10);

    filtered.forEach((r, i) => {
      doc.text(
        `${i + 1}. ${new Date(r.createdAt).toLocaleDateString(
          "uz-UZ"
        )} ${new Date(r.createdAt).toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
        })} | ${r.type.toUpperCase()} | ${r.amount} so'm | ${r.desc || "-"}`,
        10,
        20 + i * 10
      );
    });

    doc.save("hisobot.pdf");
  };

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ Hisobotni ko‘rish uchun login qiling</h2>;
  }

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

  return (
    <section className="hisobot">
      <div className="cantainer">
        <div className="hisobot-wrap">
          <h2>📊 {user.username} ning hisobotlari</h2>

          {/* Filter tugmalari */}
          <div style={{ marginBottom: 15 }}>
            <Button
              type={filter === "all" ? "primary" : "default"}
              onClick={() => setFilter("all")}
            >
              Hammasi
            </Button>
            <Button
              type={filter === "kirim" ? "primary" : "default"}
              onClick={() => setFilter("kirim")}
              style={{ marginLeft: 10 }}
            >
              Faqat kirim
            </Button>
            <Button
              type={filter === "chiqim" ? "primary" : "default"}
              onClick={() => setFilter("chiqim")}
              style={{ marginLeft: 10 }}
            >
              Faqat chiqim
            </Button>
          </div>

          {/* Export tugmalari */}
          <div style={{ marginBottom: 15 }}>
            <Button onClick={exportCSV} style={{ marginRight: 10 }}>
              📥 CSV yuklab olish
            </Button>
            <Button onClick={exportPDF}>📄 PDF yuklab olish</Button>
          </div>

          {/* Jadval */}
          {/* <Table
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 7 }}
            rowKey="id"
            className="hisobot-bg"
          /> */}
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

          {/* Umumiy natijalar */}
          <div style={{ marginTop: 20 }}>
            <h3>Umumiy kirim: {totalKirim.toLocaleString()} so'm</h3>
            <h3>Umumiy chiqim: {totalChiqim.toLocaleString()} so'm</h3>
          </div>

          {/* PieChart */}
          <div style={{ width: "100%", height: 300, marginTop: 30 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reports;