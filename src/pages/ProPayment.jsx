import React, { useEffect, useState } from "react";
import { Button, Upload, message } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createPaymentRequest, getPaymentMethods, getPaymentRequests, uploadPaymentReceipt } from "../services/firestore";
import { useLanguage } from "../context/LanguageContext";

const ProPayment = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [methods, setMethods] = useState([]);
  const [request, setRequest] = useState(null);
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([getPaymentMethods(), getPaymentRequests(user.id)])
      .then(([cards, requests]) => {
        setMethods(cards);
        setRequest(requests[0] || null);
      })
      .catch(() => message.error(t("paymentLoadError")));
  }, [user.id, t]);

  const submit = async () => {
    if (!file || !methods.length) {
      message.warning(t("cardTransferRequired"));
      return;
    }
    setSending(true);
    try {
      const receiptUrl = await uploadPaymentReceipt(user.id, file);
      const created = await createPaymentRequest({ userId: user.id, username: user.username, amount: methods[0].price || null, receiptUrl, status: "pending", createdAt: new Date().toISOString() });
      setRequest(created);
      message.success(t("paymentReceiptSent"));
    } catch {
      message.error(t("paymentFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="payment-page">
      <Link to="/pro" className="payment-back"><ArrowLeftOutlined /> {t("backToPro")}</Link>
      <div className="payment-header">
        <p className="eyebrow">{t("pro")}</p>
        <h1>{t("activatePro")}</h1>
        <p>{t("paymentHelp")}</p>
      </div>
      <div className="payment-grid">
        <div className="payment-card">
          <span className="payment-label">{t("paymentDetails")}</span>
          {methods.length ? methods.map((method) => <div className="card-number" key={method.id}><strong>{method.bankName || t("defaultBankCard")}</strong><b>{method.cardNumber}</b><small>{method.holderName || ""}</small></div>) : <div className="payment-empty">{t("noPaymentInfo")}</div>}
          <p className="payment-note">{t("paymentSummaryNote")}</p>
        </div>
        <div className="payment-card payment-upload">
          <span className="payment-label">{t("paymentProof")}</span>
          {request ? (
            <div className={`payment-status ${request.status}`}>
              <CheckCircleOutlined />
              <strong>{request.status === "pending" ? t("verifyPending") : request.status === "approved" ? t("approved") : t("rejected")}</strong>
              <p>{request.adminNote || t("waitingAdmin")}</p>
            </div>
          ) : (
            <>
              <p>{t("uploadReceiptHint")}</p>
              <Upload beforeUpload={(selected) => { setFile(selected); return false; }} maxCount={1} accept="image/*">
                <Button icon={<UploadOutlined />}>{file ? file.name : t("uploadReceipt")}</Button>
              </Upload>
              <button className="admin-primary payment-submit" type="button" disabled={sending} onClick={submit}>{sending ? t("submitting") : t("sendPayment")}</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProPayment;
