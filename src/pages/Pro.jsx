import React, { useEffect, useState } from "react";
import { Button, Modal, Upload, message } from "antd";
import { CheckOutlined, CrownOutlined, UploadOutlined } from "@ant-design/icons";
import { useSubscription } from "../context/SubscriptionContext";
import { createPaymentRequest, getPaymentMethods, getUserTransactions, uploadPaymentReceipt } from "../services/firestore";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const Pro = () => {
  const { isPro, status, expiresAt } = useSubscription();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [methods, setMethods] = useState([]);
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState("");
  const [budgetDraft, setBudgetDraft] = useState("");

  const features = [t("feature1"), t("feature2"), t("feature3"), t("feature4"), t("feature5"), t("feature6"), t("feature7"), t("feature8")];

  useEffect(() => {
    if (open) getPaymentMethods().then(setMethods).catch(() => message.error(t("paymentLoadError")));
  }, [open, t]);

  useEffect(() => {
    if (!isPro || !user) return;
    const savedGoal = localStorage.getItem(`moliyam-pro-budget-${user.id}`) || "";
    setBudgetGoal(savedGoal);
    setBudgetDraft(savedGoal);
    setInsightsLoading(true);
    getUserTransactions(user.id).then(setTransactions).catch(() => setTransactions([])).finally(() => setInsightsLoading(false));
  }, [isPro, user]);

  const saveBudgetGoal = (event) => {
    event.preventDefault();
    const value = Math.max(0, Number(budgetDraft || 0));
    setBudgetGoal(value ? String(value) : "");
    if (user) localStorage.setItem(`moliyam-pro-budget-${user.id}`, value ? String(value) : "");
  };

  const submitPayment = async () => {
    if (!file || !methods.length) return message.warning(t("paymentCardRequired"));
    setSending(true);
    try {
      const receiptUrl = await uploadPaymentReceipt(user.id, file);
      await createPaymentRequest({ receiptUrl });
      message.success(t("paymentSubmitted"));
      setOpen(false);
    } catch {
      message.error(t("paymentFailed"));
    } finally {
      setSending(false);
    }
  };

  const actualTransactions = transactions.filter((item) => item.status !== "planned");
  const income = actualTransactions.filter((item) => item.type === "kirim").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = actualTransactions.filter((item) => item.type === "chiqim").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const savingsRate = income ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
  const healthScore = income ? Math.min(100, Math.max(0, Math.round((savingsRate * 0.7) + (actualTransactions.length ? 30 : 0)))) : 0;
  const plannedCount = transactions.filter((item) => item.status === "planned").length;
  const budgetValue = Number(budgetGoal || 0);
  const budgetProgress = budgetValue ? Math.min(100, Math.round((expense / budgetValue) * 100)) : 0;
  const categoryTotals = actualTransactions.filter((item) => item.type === "chiqim").reduce((totals, item) => ({ ...totals, [item.category || t("generalCategory")]: (totals[item.category || t("generalCategory")] || 0) + Number(item.amount || 0) }), {});
  const topCategory = Object.entries(categoryTotals).sort(([, first], [, second]) => second - first)[0];
  const currentMonth = new Date();
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const monthExpense = (date) => actualTransactions.filter((item) => {
    const createdAt = new Date(item.createdAt);
    return item.type === "chiqim" && createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
  }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentMonthExpense = monthExpense(currentMonth);
  const previousMonthExpense = monthExpense(previousMonth);
  const expenseChange = previousMonthExpense ? Math.round(((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100) : 0;
  const categoryRows = Object.entries(categoryTotals).sort(([, first], [, second]) => second - first).slice(0, 5);
  const advisorText = !transactions.length ? t("proInsightEmpty") : savingsRate >= 20 ? t("proInsightPositive", { rate: savingsRate }) : t("proInsightNegative", { amount: expense.toLocaleString("uz-UZ") });

  return (
    <section className="pro-page">
      <div className="pro-hero">
        <div className="pro-badge"><CrownOutlined /> MOLIYAM PRO</div>
        <h1>{t("proTitle")}</h1>
        <p>{t("proLead")}</p>
      </div>
      <div className="pro-card">
        <div>
          <span className="pro-card-kicker">{isPro ? t("activeSubscription") : t("premiumPlan")}</span>
          <h2>{isPro ? t("pro") : t("proMonthly")}</h2>
          <p>{isPro ? `${t("subscriptionActive")}${expiresAt ? `, ${new Date(expiresAt).toLocaleDateString("uz-UZ")} gacha` : ""}.` : t("proSmart")}</p>
        </div>
        {isPro ? <button type="button" className="pro-button" disabled>{t("proActive")}</button> : <button type="button" className="pro-button" onClick={() => setOpen(true)}>{t("upgrade")}</button>}
      </div>
      <div className="pro-features">
        {features.map((feature) => <div key={feature}><CheckOutlined /><span>{feature}</span></div>)}
      </div>
      {isPro && <section className="pro-workspace">
        <div className="pro-workspace-heading"><div><p className="pro-card-kicker">{t("proWorkspace")}</p><h2>{t("advancedAnalysis")}</h2></div><span className="pro-live-dot">{t("proActive")}</span></div>
        {insightsLoading ? <div className="pro-insight-loading">{t("loading")}</div> : <>
          <div className="pro-metrics">
            <div className="pro-metric pro-score"><span>{t("healthScore")}</span><strong>{healthScore}<small>/100</small></strong><em>{healthScore >= 70 ? t("healthy") : t("needsAttention")}</em></div>
            <div className="pro-metric"><span>{t("savingsRate")}</span><strong>{savingsRate}%</strong><em>{t("incomeAndExpense")}</em></div>
            <div className="pro-metric"><span>{t("plannedItems")}</span><strong>{plannedCount}</strong><em>{t("reminders")}</em></div>
            <div className="pro-metric"><span>{t("topCategory")}</span><strong>{topCategory ? topCategory[0] : "-"}</strong><em>{topCategory ? `${topCategory[1].toLocaleString("uz-UZ")} ${t("monthlyCurrency")}` : t("noData")}</em></div>
          </div>
          <div className="pro-advisor"><div className="pro-advisor-mark">✦</div><div><span>{t("aiAdvisor")}</span><p>{advisorText}</p></div></div>
          <div className="pro-budget-tool">
            <div className="pro-budget-head"><div><span>{t("budgetGoal")}</span><p>{budgetValue ? `${expense.toLocaleString("uz-UZ")} / ${budgetValue.toLocaleString("uz-UZ")} ${t("monthlyCurrency")}` : t("budgetGoalEmpty")}</p></div><strong>{budgetValue ? `${budgetProgress}%` : "-"}</strong></div>
            {budgetValue > 0 && <div className="pro-budget-track"><i style={{ width: `${budgetProgress}%` }} /></div>}
            <form onSubmit={saveBudgetGoal}><input type="number" min="0" value={budgetDraft} onChange={(event) => setBudgetDraft(event.target.value)} placeholder={t("budgetGoalPlaceholder")} /><button type="submit">{t("saveGoal")}</button></form>
            {budgetValue > 0 && budgetProgress >= 80 && <small className="pro-budget-warning">{t("budgetWarning")}</small>}
          </div>
          <div className="pro-detail-grid">
            <div className="pro-detail-card">
              <div className="pro-detail-heading"><span>{t("categoryBreakdown")}</span><small>{t("topFive")}</small></div>
              {categoryRows.length ? categoryRows.map(([category, value]) => <div className="pro-category-row" key={category}><div><span>{category}</span><b>{value.toLocaleString("uz-UZ")} {t("monthlyCurrency")}</b></div><i><em style={{ width: `${expense ? Math.min(100, (value / expense) * 100) : 0}%` }} /></i></div>) : <p className="pro-detail-empty">{t("noCategoryData")}</p>}
            </div>
            <div className="pro-detail-card">
              <div className="pro-detail-heading"><span>{t("monthlyComparison")}</span><small>{t("expenseTrend")}</small></div>
              <strong className={`pro-trend-value ${expenseChange > 0 ? "up" : "down"}`}>{expenseChange > 0 ? "+" : ""}{expenseChange}%</strong>
              <p className="pro-trend-copy">{expenseChange > 0 ? t("expenseIncreased") : t("expenseDecreased")}</p>
              <div className="pro-compare-bars"><i style={{ height: `${Math.min(100, previousMonthExpense ? (previousMonthExpense / Math.max(previousMonthExpense, currentMonthExpense, 1)) * 100 : 12)}%` }} /><i style={{ height: `${Math.min(100, currentMonthExpense ? (currentMonthExpense / Math.max(previousMonthExpense, currentMonthExpense, 1)) * 100 : 12)}%` }} /></div>
            </div>
          </div>
        </>}
      </section>}
      {status === "UNKNOWN" && <p className="pro-error">{t("statusUnknown")}</p>}
      <Modal className="pro-payment-modal" open={open} onCancel={() => setOpen(false)} footer={null} title={t("paymentTitle")}>
        <div className="modal-payment-content">
          <p>{t("paymentHelp")}</p>
          {methods.map((method) => <div className="modal-card-number" key={method.id}><strong>{method.bankName || t("paymentCardDefault")}</strong><b>{method.cardNumber}</b><small>{method.holderName}</small></div>)}
          <Upload beforeUpload={(selected) => { setFile(selected); return false; }} maxCount={1} accept="image/*">
            <Button icon={<UploadOutlined />}>{file ? file.name : t("chooseReceipt")}</Button>
          </Upload>
          <button type="button" className="admin-primary modal-submit" disabled={sending} onClick={submitPayment}>{sending ? t("submitting") : t("sendPayment")}</button>
        </div>
      </Modal>
    </section>
  );
};

export default Pro;
