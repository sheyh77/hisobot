import React, { useEffect, useState } from "react";
import { Button, Input, message } from "antd";
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { createNotification, createPaymentMethod, getPaymentMethods, getPaymentRequests, removePaymentMethod, saveUserEntitlement, updatePaymentRequest } from "../services/firestore";

const AdminPayments = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [methods, setMethods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ bankName: "", cardNumber: "", holderName: "", price: "" });
  const [busy, setBusy] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const reload = () => Promise.all([getPaymentMethods(), getPaymentRequests()]).then(([cards, payments]) => {
    setMethods(cards);
    setRequests(payments);
  });

  useEffect(() => {
    reload().catch(() => message.error(t("paymentLoadError")));
  }, [t]);

  const addCard = async (event) => {
    event.preventDefault();
    if (!form.cardNumber.trim()) return message.warning(t("cardNumberRequired"));
    setBusy(true);
    try {
      await createPaymentMethod({ ...form, createdAt: new Date().toISOString(), active: true });
      setForm({ bankName: "", cardNumber: "", holderName: "", price: "" });
      await reload();
      message.success(t("cardAdded"));
    } catch {
      message.error(t("cardNotSaved"));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (payment, status) => {
    setProcessingId(payment.id);
    try {
      await updatePaymentRequest(payment.id, { status, reviewedAt: new Date().toISOString(), reviewedBy: user.id });
      if (status === "approved") {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await saveUserEntitlement(payment.userId, { plan: "pro", subscriptionStatus: "active", expiresAt: expiresAt.toISOString() });
        await createNotification({ audience: payment.userId, title: t("paymentAcceptedNotice"), body: t("paymentAcceptedBody"), createdAt: new Date().toISOString(), status: "queued" });
      } else {
        await saveUserEntitlement(payment.userId, { plan: "free", subscriptionStatus: "rejected", expiresAt: null });
        await createNotification({ audience: payment.userId, title: t("paymentRejectedNotice"), body: t("paymentRejectedBody"), createdAt: new Date().toISOString(), status: "queued" });
      }
      await reload();
      message.success(status === "approved" ? t("cardApproved") : t("cardRejected"));
    } catch {
      message.error(t("paymentActionFailed"));
    } finally {
      setProcessingId(null);
    }
  };

  if (!user || (user.role !== "admin" && user.isAdmin !== true)) return null;

  return (
    <section className="admin-payments-page">
      <Link to="/admin" className="payment-back"><ArrowLeftOutlined /> {t("backToAdmin")}</Link>
      <div className="admin-payment-header">
        <div>
          <p className="admin-kicker">{t("pro")}</p>
          <h1>{t("managePayments")}</h1>
          <p>{t("paymentHelp")}</p>
        </div>
      </div>
      <div className="admin-payment-grid">
        <div className="admin-surface">
          <div className="admin-surface-head"><div><span className="admin-kicker">{t("paymentReceive")}</span><h2>{t("paymentDetails")}</h2></div></div>
          <form className="admin-card-form" onSubmit={addCard}>
            <Input placeholder={t("bankNameLabel")} value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
            <Input placeholder={t("cardNumberLabel")} value={form.cardNumber} onChange={(event) => setForm({ ...form, cardNumber: event.target.value })} />
            <Input placeholder={t("holderNameLabel")} value={form.holderName} onChange={(event) => setForm({ ...form, holderName: event.target.value })} />
            <Input placeholder={t("priceOptionalLabel")} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            <Button htmlType="submit" type="primary" icon={<PlusOutlined />} loading={busy}>{t("addCardButton")}</Button>
          </form>
          <div className="admin-card-list">
            {methods.map((method) => <div className="admin-card-row" key={method.id}><div><strong>{method.bankName || t("paymentCardDefault")}</strong><span>{method.cardNumber} · {method.holderName}</span></div><button type="button" onClick={() => removePaymentMethod(method.id).then(reload)} aria-label={t("removeCard")}><DeleteOutlined /></button></div>)}
          </div>
        </div>
        <div className="admin-surface">
          <div className="admin-surface-head"><div><span className="admin-kicker">{t("reviewLabel")}</span><h2>{t("checkPaymentRequests")}</h2></div><span className="admin-count">{t("paymentCount", { count: requests.length })}</span></div>
          <div className="admin-payment-list">
            {requests.length === 0 ? <div className="admin-empty">{t("noPaymentRequests")}</div> : requests.map((payment) => <article className="admin-payment-row" key={payment.id}><div className="admin-payment-info"><strong>{payment.username || payment.userId}</strong><span>{payment.amount ? `${payment.amount} ${t("monthlyCurrency")}` : "-"}</span>{payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noreferrer">{t("viewReceipt")}</a>}</div><div className="admin-payment-actions">{payment.status === "pending" ? <><button type="button" className="admin-payment-approve" disabled={processingId === payment.id} onClick={() => decide(payment, "approved")}><CheckOutlined /> {t("approveLabel")}</button><button type="button" className="admin-payment-reject" disabled={processingId === payment.id} onClick={() => decide(payment, "rejected")}><CloseOutlined /> {t("rejectLabel")}</button></> : <span className={`admin-payment-status ${payment.status}`}>{payment.status === "approved" ? t("approved") : t("rejected")}</span>}</div></article>)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminPayments;
