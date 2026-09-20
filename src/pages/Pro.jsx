import React, { useEffect, useState } from "react";
import { Button, Modal, Upload, message } from "antd";
import { CheckOutlined, CrownOutlined, UploadOutlined } from "@ant-design/icons";
import { useSubscription } from "../context/SubscriptionContext";
import { createPaymentRequest, getPaymentMethods, uploadPaymentReceipt } from "../services/firestore";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const features = ["Advanced analytics", "Budgets and financial goals", "AI financial assistant", "Smart notifications", "Debt and recurring transactions", "Professional reports", "Family finance", "Financial health score"];

const Pro = () => {
  const { isPro, status, expiresAt } = useSubscription();
  const { user } = useAuth(); const { t } = useLanguage(); const [open, setOpen] = useState(false); const [methods, setMethods] = useState([]); const [file, setFile] = useState(null); const [sending, setSending] = useState(false);
  useEffect(() => { if (open) getPaymentMethods().then(setMethods).catch(() => message.error("To'lov ma'lumotlarini yuklab bo'lmadi")); }, [open]);
  const submitPayment = async () => { if (!file || !methods.length) return message.warning("Karta va chek rasmini tanlang"); setSending(true); try { const receiptUrl = await uploadPaymentReceipt(user.id, file); await createPaymentRequest({ receiptUrl }); message.success("To'lov so'rovi yuborildi"); setOpen(false); } catch { message.error("To'lovni yuborib bo'lmadi"); } finally { setSending(false); } };
  return <section className="pro-page"><div className="pro-hero"><div className="pro-badge"><CrownOutlined /> MOLIYAM PRO</div><h1>Moliyangizni keyingi<br /><em>darajaga olib chiqing.</em></h1><p>Ko'proq tushuncha, yaxshiroq reja, xotirjam kelajak.</p></div><div className="pro-card"><div><span className="pro-card-kicker">{isPro ? "Faol obuna" : "Premium reja"}</span><h2>{isPro ? "Moliyam Pro" : "Moliyam Pro Monthly"}</h2><p>{isPro ? `Obuna faol${expiresAt ? `, ${new Date(expiresAt).toLocaleDateString("uz-UZ")} gacha` : ""}.` : "Moliyangizni yanada aqlli boshqaring."}</p></div>{isPro ? <button type="button" className="pro-button" disabled>Pro faol</button> : <button type="button" className="pro-button" onClick={() => setOpen(true)}>{t("upgrade")}</button>}</div><div className="pro-features">{features.map((feature) => <div key={feature}><CheckOutlined /><span>{feature}</span></div>)}</div>{status === "UNKNOWN" && <p className="pro-error">Obuna holatini tekshirib bo'lmadi.</p>}<Modal className="pro-payment-modal" open={open} onCancel={() => setOpen(false)} footer={null} title="Moliyam Pro tarifiga o'tish"><div className="modal-payment-content"><p>Admin ko'rsatgan kartaga to'lov qiling va chek rasmini yuboring.</p>{methods.map((method) => <div className="modal-card-number" key={method.id}><strong>{method.bankName || "To'lov kartasi"}</strong><b>{method.cardNumber}</b><small>{method.holderName}</small></div>)}<Upload beforeUpload={(selected) => { setFile(selected); return false; }} maxCount={1} accept="image/*"><Button icon={<UploadOutlined />}>{file ? file.name : "Chek rasmini tanlash"}</Button></Upload><button type="button" className="admin-primary modal-submit" disabled={sending} onClick={submitPayment}>{sending ? "Yuborilmoqda..." : "To'lovni yuborish"}</button></div></Modal></section>;
};

export default Pro;
