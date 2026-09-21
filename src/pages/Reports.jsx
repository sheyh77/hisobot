import React, { useEffect, useState } from "react";
import { Button, message } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import { useAuth } from "../context/AuthContext";
import { cancelExpenseReminders } from "../utils/reminders";
import { getUserTransactions, updateTransaction } from "../services/firestore";
import { useLanguage } from "../context/LanguageContext";

const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user) return;

    getUserTransactions(user.id)
      .then((data) => {
        const withKeys = data.map((item, index) => ({ ...item, key: item.id || index }));
        setTransactions(withKeys);
      })
      .catch((err) => console.error("Xatolik:", err));
  }, [user]);

  const filtered = transactions.filter((item) => {
    const matchesType = filter === "all" || item.type === filter;
    const matchesSearch = !search || `${item.desc || ""} ${item.category || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalKirim = filtered.filter((item) => item.type === "kirim").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalChiqim = filtered.filter((item) => item.type === "chiqim").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const plannedCount = filtered.filter((transaction) => transaction.status === "planned").length;

  const totalFlow = totalKirim + totalChiqim;
  const incomeShare = totalFlow ? Math.round((totalKirim / totalFlow) * 100) : 0;
  const expenseShare = totalFlow ? 100 - incomeShare : 0;
  const categoryTotals = filtered.filter((item) => item.type === "chiqim").reduce((totals, item) => ({ ...totals, [item.category || t("generalCategory")]: (totals[item.category || t("generalCategory")] || 0) + Number(item.amount || 0) }), {});
  const categoryRows = Object.entries(categoryTotals).sort(([, first], [, second]) => second - first).slice(0, 5);

  const exportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Sana,Soat,Turi,Summa,Izoh"]
        .concat(
          filtered.map(
            (r) => `${new Date(r.createdAt).toLocaleDateString("uz-UZ")},${new Date(r.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })},${r.type},${r.amount},${r.desc || "-"}`
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
        `${i + 1}. ${new Date(r.createdAt).toLocaleDateString("uz-UZ")} ${new Date(r.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} | ${r.type.toUpperCase()} | ${r.amount} so'm | ${r.desc || "-"}`,
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
      setTransactions((current) => current.map((item) => (item.id === transaction.id ? { ...item, status: "completed" } : item)));
      await cancelExpenseReminders(transaction.id);
      message.success("Xarajat bajarildi va eslatmalar o'chirildi");
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>⛔ {t("neutralReport")}</h2>;
  }

  const reportTransactions = filtered.map((item, index) => ({ ...item, key: item.id || index }));

  return (
    <section className="hisobot">
      <div className="cantainer">
        <div className="hisobot-wrap">
          <div className="reports-hero">
            <div>
              <p className="eyebrow">{t("financialAnalysis")}</p>
              <h1>{user.username}ning hisoboti</h1>
              <p>{t("reportSubtitle")}</p>
            </div>
            <div className="reports-hero-mark">↗</div>
          </div>

          <div className="report-summary-grid">
            <div className="report-summary report-summary-income"><span><ArrowUpOutlined /> {t("totalIncome")}</span><strong>{totalKirim.toLocaleString("uz-UZ")} <small>{t("monthlyCurrency")}</small></strong></div>
            <div className="report-summary report-summary-expense"><span><ArrowDownOutlined /> {t("totalExpense")}</span><strong>{totalChiqim.toLocaleString("uz-UZ")} <small>{t("monthlyCurrency")}</small></strong></div>
            <div className="report-summary report-summary-planned"><span>{t("planned")}</span><strong>{plannedCount} <small>ta</small></strong></div>
          </div>

          <div className="report-toolbar">
            <Button type={filter === "all" ? "primary" : "default"} onClick={() => setFilter("all")}>{t("all")} ({transactions.length})</Button>
            <Button type={filter === "kirim" ? "primary" : "default"} onClick={() => setFilter("kirim")} style={{ marginLeft: 10 }}>{t("income")}</Button>
            <Button type={filter === "chiqim" ? "primary" : "default"} onClick={() => setFilter("chiqim")} style={{ marginLeft: 10 }}>{t("expense")}</Button>
          </div>

          <div className="report-toolbar report-actions">
            <div className="report-search-wrap"><SearchOutlined /><input className="report-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchPlaceholder")} /></div>
            <Button icon={<DownloadOutlined />} onClick={exportCSV}>{t("exportCSV")}</Button>
            <Button icon={<DownloadOutlined />} onClick={exportPDF}>{t("exportPDF")}</Button>
          </div>

          <div className="dashboard-transactions dashboard-panel">
            <h2 className="dashboard-transactions-title">{t("all")} <span>({filtered.length})</span></h2>
            <div className="dashboard-transactions-list">
              {reportTransactions.map((item) => (
                <div key={item.key} className="transaction-card">
                  <div className={`transaction-icon ${item.type === "chiqim" ? "transaction-icon-expense" : ""}`}>{item.type === "chiqim" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}</div>
                  <div className="transaction-info">
                    <p className="transaction-title">{item.desc || t("transactionDefault")}</p>
                    <p className="transaction-subtitle">{item.status === "planned" ? `Reja: ${new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("uz-UZ")}` : item.type === "chiqim" ? t("expense") : t("income")}</p>
                  </div>
                  <div className={`transaction-amount ${item.status === "planned" ? "planned" : item.type === "chiqim" ? "red" : "green"}`}>
                    {item.status === "planned" ? <Button size="small" loading={updatingId === item.id} onClick={() => markAsSpent(item)}>Sarflandi</Button> : `${item.type === "chiqim" ? "-" : "+"}${Number(item.amount || 0).toLocaleString()} ${t("monthlyCurrency")}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="report-insights-grid">
            <div className="report-chart-panel report-flow-panel">
              <div className="report-chart-title">
                <div><p className="eyebrow">{t("relationship")}</p><h2>{t("incomeAndExpense")}</h2></div>
                <span>{expenseShare}% {t("expenseRate")}</span>
              </div>
              <div className="report-flow-bar"><i style={{ width: `${incomeShare}%` }} /><b style={{ width: `${expenseShare}%` }} /></div>
              <div className="report-flow-legend"><span><i className="income-dot" />{t("income")} <strong>{incomeShare}%</strong></span><span><i className="expense-dot" />{t("expense")} <strong>{expenseShare}%</strong></span></div>
              <div className="report-flow-totals"><div><small>{t("totalIncome")}</small><strong>{totalKirim.toLocaleString("uz-UZ")} {t("monthlyCurrency")}</strong></div><div><small>{t("totalExpense")}</small><strong>{totalChiqim.toLocaleString("uz-UZ")} {t("monthlyCurrency")}</strong></div></div>
            </div>
            <div className="report-chart-panel report-category-panel">
              <div className="report-chart-title"><div><p className="eyebrow">{t("categoryBreakdown")}</p><h2>{t("topFive")}</h2></div></div>
              {categoryRows.length ? categoryRows.map(([category, value]) => <div className="report-category-row" key={category}><div><span>{category}</span><b>{value.toLocaleString("uz-UZ")} {t("monthlyCurrency")}</b></div><i><em style={{ width: `${totalChiqim ? Math.min(100, (value / totalChiqim) * 100) : 0}%` }} /></i></div>) : <p className="report-category-empty">{t("noCategoryData")}</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reports;