import React, { useEffect, useState } from "react";
import { Button, message } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import { useAuth } from "../context/AuthContext";
import { cancelExpenseReminders } from "../utils/reminders";
import { getUserTransactions, updateTransaction } from "../services/firestore";

const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const { user } = useAuth(); // ✅ to‘g‘rilandi

  useEffect(() => {
    if (!user) return;

    getUserTransactions(user.id)
      .then(data => {
        const withKeys = data.map((t, i) => ({ ...t, key: t.id || i }));
        setTransactions(withKeys);
      })
      .catch(err => console.error("Xatolik:", err));

  }, [user]);

  const filtered = transactions.filter((t) => {
    const matchesType = filter === "all" || t.type === filter;
    const matchesSearch = !search || `${t.desc || ""} ${t.category || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalKirim = filtered
    .filter((t) => t.type === "kirim")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalChiqim = filtered
    .filter((t) => t.type === "chiqim")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const plannedCount = filtered.filter((transaction) => transaction.status === "planned").length;

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

  const markAsSpent = async (transaction) => {
    setUpdatingId(transaction.id);
    try {
      await updateTransaction(transaction.id, { status: "completed", spentAt: new Date().toISOString() });
      setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, status: "completed" } : item));
      await cancelExpenseReminders(transaction.id);
      message.success("Xarajat bajarildi va eslatmalar o'chirildi");
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ Hisobotni ko‘rish uchun login qiling</h2>;
  }

  const reportTransactions = filtered.map((t, i) => ({ ...t, key: t.id || i }));

  return (
    <section className="hisobot">
      <div className="cantainer">
        <div className="hisobot-wrap">
          <div className="reports-hero"><div><p className="eyebrow">Moliyaviy tahlil</p><h1>{user.username}ning hisoboti</h1><p>Daromad va xarajatlaringizni bir joyda kuzating.</p></div><div className="reports-hero-mark">↗</div></div>

          <div className="report-summary-grid"><div className="report-summary report-summary-income"><span><ArrowUpOutlined /> Jami kirim</span><strong>{totalKirim.toLocaleString("uz-UZ")} <small>so'm</small></strong></div><div className="report-summary report-summary-expense"><span><ArrowDownOutlined /> Jami chiqim</span><strong>{totalChiqim.toLocaleString("uz-UZ")} <small>so'm</small></strong></div><div className="report-summary report-summary-planned"><span>Rejalashtirilgan</span><strong>{plannedCount} <small>ta</small></strong></div></div>

          <div className="report-toolbar">
            <Button
              type={filter === "all" ? "primary" : "default"}
              onClick={() => setFilter("all")}
            >
              Hammasi ({transactions.length})
            </Button>
            <Button
              type={filter === "kirim" ? "primary" : "default"}
              onClick={() => setFilter("kirim")}
              style={{ marginLeft: 10 }}
            >
              Kirim
            </Button>
            <Button
              type={filter === "chiqim" ? "primary" : "default"}
              onClick={() => setFilter("chiqim")}
              style={{ marginLeft: 10 }}
            >
              Chiqim
            </Button>
          </div>

          <div className="report-toolbar report-actions">
            <div className="report-search-wrap"><SearchOutlined /><input className="report-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Izoh yoki kategoriya bo'yicha qidirish" /></div>
            <Button icon={<DownloadOutlined />} onClick={exportCSV}>
              CSV
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportPDF}>PDF</Button>
          </div>

          {/* Jadval */}
          {/* <Table
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 7 }}
            rowKey="id"
            className="hisobot-bg"
          /> */}
          <div className="dashboard-transactions dashboard-panel">
            <h2 className="dashboard-transactions-title">Barcha tranzaksiyalar <span>({filtered.length})</span></h2>
            <div className="dashboard-transactions-list">
              {reportTransactions.map((t) => (
                <div key={t.key} className="transaction-card">
                  <div className={`transaction-icon ${t.type === "chiqim" ? "transaction-icon-expense" : ""}`}>{t.type === "chiqim" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}</div>
                  <div className="transaction-info">
                    <p className="transaction-title">{t.desc || "No description"}</p>
                    <p className="transaction-subtitle">{t.status === "planned" ? `Reja: ${new Date(`${t.dueDate}T00:00:00`).toLocaleDateString("uz-UZ")}` : t.type === "chiqim" ? "Chiqim" : "Kirim"}</p>
                  </div>
                  <div className={`transaction-amount ${t.status === "planned" ? "planned" : t.type === "chiqim" ? "red" : "green"}`}>
                    {t.status === "planned" ? <Button size="small" loading={updatingId === t.id} onClick={() => markAsSpent(t)}>Sarflandi</Button> : `${t.type === "chiqim" ? "-" : "+"}${Number(t.amount || 0).toLocaleString()} so'm`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Umumiy natijalar */}
          <div className="report-chart-panel">
            <div className="report-chart-title"><div><p className="eyebrow">Nisbat</p><h2>Kirim va chiqim</h2></div><span>{totalKirim + totalChiqim ? Math.round((totalChiqim / (totalKirim + totalChiqim)) * 100) : 0}% sarf</span></div>
          <div style={{ width: "100%", height: 245 }}>
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
      </div>
    </section>
  );
};

export default Reports;