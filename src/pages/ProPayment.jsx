import React, { useEffect, useState } from "react";
import { Button, Upload, message } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createPaymentRequest, getPaymentMethods, getPaymentRequests, uploadPaymentReceipt } from "../services/firestore";

const ProPayment = () => {
  const { user } = useAuth();
  const [methods, setMethods] = useState([]);
  const [request, setRequest] = useState(null);
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  useEffect(() => { Promise.all([getPaymentMethods(), getPaymentRequests(user.id)]).then(([cards, requests]) => { setMethods(cards); setRequest(requests[0] || null); }).catch(() => message.error("To'lov ma'lumotlarini yuklab bo'lmadi")); }, [user.id]);
  const submit = async () => {
    if (!file || !methods.length) { message.warning("Karta o'tkazmasi rasmi va faol karta kerak"); return; }
    setSending(true);
    try { const receiptUrl = await uploadPaymentReceipt(user.id, file); const created = await createPaymentRequest({ userId: user.id, username: user.username, amount: methods[0].price || null, receiptUrl, status: "pending", createdAt: new Date().toISOString() }); setRequest(created); message.success("To'lov rasmi yuborildi. Admin tekshiradi."); } catch { message.error("To'lovni yuborib bo'lmadi"); } finally { setSending(false); }
  };
  return <section className="payment-page"><Link to="/pro" className="payment-back"><ArrowLeftOutlined /> Pro tarifga qaytish</Link><div className="payment-header"><p className="eyebrow">Moliyam Pro</p><h1>Pro tarifni faollashtiring</h1><p>Karta orqali to'lov qiling va chek rasmini yuboring.</p></div><div className="payment-grid"><div className="payment-card"><span className="payment-label">To'lov uchun karta</span>{methods.length ? methods.map((method) => <div className="card-number" key={method.id}><strong>{method.bankName || "Moliyam karta"}</strong><b>{method.cardNumber}</b><small>{method.holderName || ""}</small></div>) : <div className="payment-empty">Admin hali karta qo'shmagan.</div>}<p className="payment-note">To'lov summasi Google Play emas, admin belgilagan karta bo'yicha tekshiriladi.</p></div><div className="payment-card payment-upload"><span className="payment-label">To'lov tasdig'i</span>{request ? <div className={`payment-status ${request.status}`}><CheckCircleOutlined /><strong>{request.status === "pending" ? "Tekshirilmoqda" : request.status === "approved" ? "Pro faollashdi" : "To'lov bekor qilindi"}</strong><p>{request.adminNote || "Admin tasdig'ini kuting."}</p></div> : <><p>Bank ilovasidan to'lov chekini screenshot qiling va shu yerga yuklang.</p><Upload beforeUpload={(selected) => { setFile(selected); return false; }} maxCount={1} accept="image/*"><Button icon={<UploadOutlined />}>{file ? file.name : "Rasm tanlash"}</Button></Upload><button className="admin-primary payment-submit" type="button" disabled={sending} onClick={submit}>{sending ? "Yuborilmoqda..." : "To'lovni yuborish"}</button></>}</div></div></section>;
};
export default ProPayment;
