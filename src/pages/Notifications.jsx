import React, { useEffect, useState } from "react";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { getUserNotifications } from "../services/firestore";
import { useLanguage } from "../context/LanguageContext";

const Notifications = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    getUserNotifications(user.id).then(setItems).catch(() => setError("Bildirishnomalarni yuklab bo'lmadi."));
  }, [user]);
  return <section className="notifications-page"><div className="notifications-header"><div><p className="eyebrow">{t("notifications")}</p><h1>{t("notifications")}</h1><p>Siz uchun muhim yangiliklar va to'lov holatlari.</p></div><div className="notifications-header-icon"><BellOutlined /></div></div>{error && <p className="notification-error">{error}</p>}{!error && items.length === 0 && <div className="notification-empty"><BellOutlined /><h2>{t("noData")}</h2><p>Yangi bildirishnomalar shu yerda ko'rinadi.</p></div>}<div className="notification-feed">{items.map((item) => <article className="user-notification" key={item.id}><div className="user-notification-icon"><BellOutlined /></div><div><h2>{item.title}</h2><p>{item.body}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("uz-UZ") : ""}</small></div><CheckOutlined className="notification-check" /></article>)}</div></section>;
};
export default Notifications;
