import React, { useEffect, useMemo, useState } from "react";
import { Button, message } from "antd";
import {
  BellOutlined,
  DeleteOutlined,
  LineChartOutlined,
  PlusOutlined,
  SendOutlined,
  TeamOutlined,
  AppstoreOutlined,
  UserOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { createCategory, createNotification, getAllTransactions, getAllUsers, getCategories, removeCategory } from "../services/firestore";
import { Link } from "react-router-dom";

const defaultSections = [
  { id: "food", name: "Oziq-ovqat", color: "#e99b68" },
  { id: "transport", name: "Transport", color: "#7b9bd4" },
  { id: "home", name: "Uy-joy", color: "#75c5a0" },
  { id: "health", name: "Salomatlik", color: "#d98ba0" },
];

const Admin = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [sections, setSections] = useState(() => JSON.parse(localStorage.getItem("moliyam-sections") || "null") || defaultSections);
  const [newSection, setNewSection] = useState("");
  const [sectionColor, setSectionColor] = useState("#159a78");
  const [notification, setNotification] = useState({ title: "", body: "", audience: "all" });
  const [sending, setSending] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState(() => JSON.parse(localStorage.getItem("moliyam-admin-notifications") || "[]"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, transactionsData, categoriesData] = await Promise.all([getAllUsers(), getAllTransactions(), getCategories()]);
        setUsers(Array.isArray(usersData) ? usersData.map((item) => {
          const safeUser = { ...item };
          delete safeUser.password;
          return safeUser;
        }) : []);
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        if (categoriesData.length) setSections(categoriesData);
      } catch {
        message.error("Admin ma'lumotlarini yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const userStats = useMemo(() => users.map((item) => {
    const userTransactions = transactions.filter((transaction) => String(transaction.userId) === String(item.id));
    const expense = userTransactions.filter((transaction) => transaction.type === "chiqim" && transaction.status !== "planned").reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    return { ...item, transactionCount: userTransactions.length, expense };
  }), [users, transactions]);

  const stats = useMemo(() => ({
    users: users.length,
    transactions: transactions.length,
    expense: transactions.filter((item) => item.type === "chiqim" && item.status !== "planned").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    planned: transactions.filter((item) => item.status === "planned").length,
  }), [users, transactions]);

  const saveSections = (nextSections) => {
    setSections(nextSections);
    localStorage.setItem("moliyam-sections", JSON.stringify(nextSections));
  };

  const addSection = (event) => {
    event.preventDefault();
    const name = newSection.trim();
    if (!name) return;
    createCategory({ name, color: sectionColor, createdAt: new Date().toISOString() }).then((created) => {
      saveSections([...sections, created]);
      setNewSection("");
      message.success("Yangi bo'lim qo'shildi");
    }).catch(() => message.error("Bo'limni saqlab bo'lmadi"));
  };

  const removeSection = (sectionId) => {
    removeCategory(sectionId).then(() => saveSections(sections.filter((section) => section.id !== sectionId))).catch(() => message.error("Bo'limni o'chirib bo'lmadi"));
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    if (!notification.title.trim() || !notification.body.trim()) {
      message.warning("Sarlavha va xabar matnini kiriting");
      return;
    }
    setSending(true);
    const recipients = notification.audience === "all" ? users : users.filter((item) => String(item.id) === notification.audience);
    const pushCount = 0;
    try {
      await createNotification({ ...notification, createdAt: new Date().toISOString(), adminId: user.id, recipientCount: recipients.length, status: "queued" });
      const historyItem = { ...notification, id: Date.now(), createdAt: new Date().toISOString(), pushCount, recipientCount: recipients.length };
      const nextHistory = [historyItem, ...notificationHistory].slice(0, 10);
      setNotificationHistory(nextHistory);
      localStorage.setItem("moliyam-admin-notifications", JSON.stringify(nextHistory));
      setNotification({ title: "", body: "", audience: "all" });
      message.success(`Xabar Firebase navbatiga qo'shildi (${recipients.length} ta qabul qiluvchi)`);
    } catch {
      message.error("Xabarni yuborishda serverga ulanib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const menu = [
    { id: "overview", label: "Umumiy ko'rinish", icon: <LineChartOutlined /> },
    { id: "users", label: "Foydalanuvchilar", icon: <TeamOutlined /> },
    { id: "sections", label: "Bo'limlar", icon: <AppstoreOutlined /> },
    { id: "notifications", label: "Bildirishnomalar", icon: <BellOutlined /> },
  ];

  if (!user || (user.role !== "admin" && user.isAdmin !== true)) {
    return <section className="admin-denied"><div><span>403</span><h1>Kirish cheklangan</h1><p>Bu bo'lim faqat administratorlar uchun.</p></div></section>;
  }

  return (
    <section className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span /> Moliyam <small>ADMIN</small></div>
        <div className="admin-profile"><div className="admin-avatar">{user.username?.slice(0, 1).toUpperCase() || "A"}</div><div><strong>{user.username}</strong><span>Administrator</span></div></div>
        <nav>{menu.map((item) => <button type="button" key={item.id} className={activeSection === item.id ? "active" : ""} onClick={() => setActiveSection(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
        <Link to="/admin/tolovlar" className="admin-payment-link"><CreditCardOutlined /> Pro to'lovlar</Link><div className="admin-sidebar-note"><BellOutlined /><span>Platforma nazorat ostida</span></div>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar"><div><span className="admin-kicker">Boshqaruv paneli</span><h1>{menu.find((item) => item.id === activeSection)?.label}</h1></div><div className="admin-topbar-user"><span>Bugun, {new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })}</span><div className="admin-mini-avatar"><UserOutlined /></div></div></header>

        {activeSection === "overview" && <>
          <div className="admin-stat-grid"><div className="admin-stat stat-teal"><span>Jami foydalanuvchilar</span><strong>{stats.users}</strong><small><TeamOutlined /> Faol profillar</small></div><div className="admin-stat stat-orange"><span>Tranzaksiyalar</span><strong>{stats.transactions}</strong><small><LineChartOutlined /> Barcha yozuvlar</small></div><div className="admin-stat stat-rose"><span>Jami chiqim</span><strong>{stats.expense.toLocaleString("uz-UZ")} <small>so'm</small></strong><small><SendOutlined /> Rejalardan tashqari</small></div><div className="admin-stat stat-lilac"><span>Rejalashtirilgan</span><strong>{stats.planned}</strong><small><BellOutlined /> Kutilayotgan xarajat</small></div></div>
          <div className="admin-overview-grid"><div className="admin-surface"><div className="admin-surface-head"><div><span className="admin-kicker">Eng faol</span><h2>Foydalanuvchilar</h2></div><button type="button" className="admin-link" onClick={() => setActiveSection("users")}>Barchasi →</button></div><div className="admin-user-list">{userStats.slice(0, 5).map((item) => <div className="admin-user-row" key={item.id}><div className="admin-user-avatar">{item.username?.slice(0, 1).toUpperCase()}</div><div><strong>{item.username}</strong><span>{item.transactionCount} ta tranzaksiya</span></div><b>{item.expense.toLocaleString("uz-UZ")} so'm</b></div>)}</div></div><div className="admin-surface admin-quick"><span className="admin-kicker">Tezkor amal</span><h2>Jamoangizga xabar yuboring</h2><p>Yangilik, eslatma yoki muhim e'lonni barcha foydalanuvchilarga yuboring.</p><button type="button" className="admin-primary" onClick={() => setActiveSection("notifications")}><BellOutlined /> Xabar yozish</button></div></div>
        </>}

        {activeSection === "users" && <div className="admin-surface admin-table-surface"><div className="admin-surface-head"><div><span className="admin-kicker">Jamoa</span><h2>Foydalanuvchilar ro'yxati</h2></div><span className="admin-count">{users.length} ta profil</span></div>{loading ? <div className="admin-empty">Ma'lumotlar yuklanmoqda...</div> : <div className="admin-table"><div className="admin-table-head"><span>Foydalanuvchi</span><span>Holat</span><span>Tranzaksiyalar</span><span>Jami chiqim</span></div>{userStats.map((item) => <div className="admin-table-row" key={item.id}><div className="admin-table-person"><div className="admin-user-avatar">{item.username?.slice(0, 1).toUpperCase()}</div><div><strong>{item.username}</strong><span>{item.email || `ID: ${item.id}`}</span></div></div><span className="admin-status">Faol</span><span>{item.transactionCount} ta</span><b>{item.expense.toLocaleString("uz-UZ")} so'm</b></div>)}</div>}</div>}

        {activeSection === "sections" && <div className="admin-sections-layout"><div className="admin-surface"><div className="admin-surface-head"><div><span className="admin-kicker">Tasnif</span><h2>Harajat bo'limlari</h2></div></div><p className="admin-muted">Foydalanuvchilar xarajatlarini tartibli yozishi uchun bo'limlar yarating.</p><form className="section-form" onSubmit={addSection}><input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="Yangi bo'lim nomi" /><input type="color" value={sectionColor} onChange={(event) => setSectionColor(event.target.value)} /><button type="submit" className="admin-primary"><PlusOutlined /> Qo'shish</button></form><div className="section-list">{sections.map((section) => <div className="section-item" key={section.id}><i style={{ background: section.color }} /><strong>{section.name}</strong><button type="button" onClick={() => removeSection(section.id)} aria-label={`${section.name} bo'limini o'chirish`}><DeleteOutlined /></button></div>)}</div></div><div className="admin-surface section-preview"><span className="admin-kicker">Ko'rinish</span><h2>Kategoriyalar</h2><div className="section-cloud">{sections.map((section) => <span style={{ borderColor: section.color, color: section.color }} key={section.id}>{section.name}</span>)}</div></div></div>}

        {activeSection === "notifications" && <div className="admin-notifications-layout"><div className="admin-surface"><span className="admin-kicker">Broadcast</span><h2>Yangi bildirishnoma</h2><p className="admin-muted">Foydalanuvchilarga kerakli xabarni chiroyli va qisqa yuboring.</p><form className="notification-form" onSubmit={sendNotification}><label>Sarlavha<input value={notification.title} onChange={(event) => setNotification({ ...notification, title: event.target.value })} placeholder="Masalan: Yangi imkoniyat" maxLength={60} /></label><label>Kimga yuboriladi<select value={notification.audience} onChange={(event) => setNotification({ ...notification, audience: event.target.value })}><option value="all">Barcha foydalanuvchilar</option>{users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label><label>Xabar matni<textarea value={notification.body} onChange={(event) => setNotification({ ...notification, body: event.target.value })} placeholder="Xabaringizni shu yerga yozing..." rows={5} maxLength={240} /></label><button className="admin-primary" type="submit" disabled={sending}><SendOutlined /> {sending ? "Yuborilmoqda..." : "Bildirishnoma yuborish"}</button></form></div><div className="admin-surface"><div className="admin-surface-head"><div><span className="admin-kicker">Arxiv</span><h2>So'nggi xabarlar</h2></div></div><div className="notification-history">{notificationHistory.length === 0 ? <div className="admin-empty">Hali xabar yuborilmagan</div> : notificationHistory.map((item) => <div className="notification-history-item" key={item.id}><div className="notification-icon"><BellOutlined /></div><div><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleDateString("uz-UZ")} · {item.pushCount || 0} ta push</small></div></div>)}</div></div></div>}
      </main>
    </section>
  );
};

export default Admin;
