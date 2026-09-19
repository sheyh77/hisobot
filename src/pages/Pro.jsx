import React from "react";
import { CheckOutlined, CrownOutlined } from "@ant-design/icons";
import { useSubscription } from "../context/SubscriptionContext";

const features = ["Advanced analytics", "Budgets and financial goals", "AI financial assistant", "Smart notifications", "Debt and recurring transactions", "Professional reports", "Family finance", "Financial health score"];

const Pro = () => {
  const { isPro, status, expiresAt } = useSubscription();
  return <section className="pro-page"><div className="pro-hero"><div className="pro-badge"><CrownOutlined /> MOLIYAM PRO</div><h1>Moliyangizni keyingi<br /><em>darajaga olib chiqing.</em></h1><p>Ko'proq tushuncha, yaxshiroq reja, xotirjam kelajak.</p></div><div className="pro-card"><div><span className="pro-card-kicker">{isPro ? "Faol obuna" : "Premium reja"}</span><h2>{isPro ? "Moliyam Pro" : "Moliyam Pro Monthly"}</h2><p>{isPro ? `Obuna faol${expiresAt ? `, ${new Date(expiresAt).toLocaleDateString("uz-UZ")} gacha` : ""}.` : "Google Play orqali obuna narxi va valyutasi hududingizga ko'ra ko'rsatiladi."}</p></div><button type="button" className="pro-button" disabled={!isPro}>{isPro ? "Pro faol" : "Google Play’da boshlash"}</button></div><div className="pro-features">{features.map((feature) => <div key={feature}><CheckOutlined /><span>{feature}</span></div>)}</div>{status === "UNKNOWN" && <p className="pro-error">Obuna holatini tekshirib bo'lmadi. Internet aloqasini tekshiring.</p>}</section>;
};

export default Pro;
