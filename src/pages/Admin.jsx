import React, { useEffect, useMemo, useState } from "react";
import { Button, message } from "antd";
import { BellOutlined, DeleteOutlined, LineChartOutlined, PlusOutlined, SendOutlined, TeamOutlined, AppstoreOutlined, UserOutlined, CreditCardOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { createCategory, createNotification, getAllTransactions, getAllUsers, getCategories, removeCategory } from "../services/firestore";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const getDefaultSections = (t) => [
  { id: "food", name: t("foodCategory"), color: "#e99b68" },
  { id: "transport", name: t("transportCategory"), color: "#7b9bd4" },
  { id: "home", name: t("homeCategory"), color: "#75c5a0" },
  { id: "health", name: t("healthCategory"), color: "#d98ba0" },
];

const Admin = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [sections, setSections] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("moliyam-sections") || "null");
    return saved || getDefaultSections(t);
  });
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
        message.error(t("paymentLoadError"));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [t]);

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
      message.success(t("sectionAdded"));
    }).catch(() => message.error(t("sectionSaveFailed")));
  };

  const removeSection = (sectionId) => {
    removeCategory(sectionId).then(() => saveSections(sections.filter((section) => section.id !== sectionId))).catch(() => message.error(t("sectionDeleteFailed")));
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    if (!notification.title.trim() || !notification.body.trim()) {
      message.warning(t("notificationTitleRequired"));
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
      message.success(t("notificationQueued", { count: recipients.length }));
    } catch {
      message.error(t("notificationDeliveryFailed"));
    } finally {
      setSending(false);
    }
  };

  const menu = [
    { id: "overview", label: t("overview"), icon: <LineChartOutlined /> },
    { id: "users", label: t("userList"), icon: <TeamOutlined /> },
    { id: "sections", label: t("sections"), icon: <AppstoreOutlined /> },
    { id: "notifications", label: t("notifications"), icon: <BellOutlined /> },
  ];

  if (!user || (user.role !== "admin" && user.isAdmin !== true)) {
    return <section className="admin-denied"><div><span>403</span><h1>{t("accountAccessDenied")}</h1><p>{t("adminOnlyMessage")}</p></div></section>;
  }

  return (
    <section className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span /> Moliyam <small>ADMIN</small></div>
        <div className="admin-profile"><div className="admin-avatar">{user.username?.slice(0, 1).toUpperCase() || "A"}</div><div><strong>{user.username}</strong><span>{t("adminRole")}</span></div></div>
        <nav>{menu.map((item) => <button type="button" key={item.id} className={activeSection === item.id ? "active" : ""} onClick={() => setActiveSection(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
        <Link to="/admin/tolovlar" className="admin-payment-link"><CreditCardOutlined /> {t("adminPayments")}</Link>
        <div className="admin-sidebar-note"><BellOutlined /><span>{t("monitorPlatform")}</span></div>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar"><div><span className="admin-kicker">{t("dashboardPanel")}</span><h1>{menu.find((item) => item.id === activeSection)?.label}</h1></div><div className="admin-topbar-user"><span>{t("todayDate", { date: new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long" }) })}</span><div className="admin-mini-avatar"><UserOutlined /></div></div></header>

        {activeSection === "overview" && <>
          <div className="admin-stat-grid"><div className="admin-stat stat-teal"><span>{t("totalUsers")}</span><strong>{stats.users}</strong><small><TeamOutlined /> {t("activeProfiles")}</small></div><div className="admin-stat stat-orange"><span>{t("transactionsCount")}</span><strong>{stats.transactions}</strong><small><LineChartOutlined /> {t("allRecords")}</small></div><div className="admin-stat stat-rose"><span>{t("totalExpenses")}</span><strong>{stats.expense.toLocaleString("uz-UZ")} <small>{t("monthlyCurrency")}</small></strong><small><SendOutlined /> {t("plannedExpenses")}</small></div><div className="admin-stat stat-lilac"><span>{t("plannedExpenses")}</span><strong>{stats.planned}</strong><small><BellOutlined /> {t("upcomingExpense")}</small></div></div>
          <div className="admin-overview-grid"><div className="admin-surface"><div className="admin-surface-head"><div><span className="admin-kicker">{t("mostActive")}</span><h2>{t("userList")}</h2></div><button type="button" className="admin-link" onClick={() => setActiveSection("users")}>{t("allUsers")} →</button></div><div className="admin-user-list">{userStats.slice(0, 5).map((item) => <div className="admin-user-row" key={item.id}><div className="admin-user-avatar">{item.username?.slice(0, 1).toUpperCase()}</div><div><strong>{item.username}</strong><span>{item.transactionCount} {t("transactionCountLabel")}</span></div><b>{item.expense.toLocaleString("uz-UZ")} {t("monthlyCurrency")}</b></div>)}</div></div><div className="admin-surface admin-quick"><span className="admin-kicker">{t("quickAction")}</span><h2>{t("sendTeamMessage")}</h2><p>{t("teamMessageText")}</p><button type="button" className="admin-primary" onClick={() => setActiveSection("notifications")}><BellOutlined /> {t("newNotification")}</button></div></div>
        </>}

        {activeSection === "users" && <div className="admin-surface admin-table-surface"><div className="admin-surface-head"><div><span className="admin-kicker">{t("teamLabel")}</span><h2>{t("userListTitle")}</h2></div><span className="admin-count">{users.length} {t("profiles")}</span></div>{loading ? <div className="admin-empty">{t("loading")}</div> : <div className="admin-table"><div className="admin-table-head"><span>{t("userLabel")}</span><span>{t("statusLabel")}</span><span>{t("transactionsCount")}</span><span>{t("totalExpenses")}</span></div>{userStats.map((item) => <div className="admin-table-row" key={item.id}><div className="admin-table-person"><div className="admin-user-avatar">{item.username?.slice(0, 1).toUpperCase()}</div><div><strong>{item.username}</strong><span>{item.email || `ID: ${item.id}`}</span></div></div><span className="admin-status">{t("activeStatus")}</span><span>{item.transactionCount} {t("monthlyCurrency")}</span><b>{item.expense.toLocaleString("uz-UZ")} {t("monthlyCurrency")}</b></div>)}</div>}</div>}

        {activeSection === "sections" && <div className="admin-sections-layout"><div className="admin-surface"><div className="admin-surface-head"><div><span className="admin-kicker">{t("categorySection")}</span><h2>{t("categoriesTitle")}</h2></div></div><p className="admin-muted">{t("categoryHelp")}</p><form className="section-form" onSubmit={addSection}><input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder={t("newSectionName")} /><input type="color" value={sectionColor} onChange={(event) => setSectionColor(event.target.value)} /><button type="submit" className="admin-primary"><PlusOutlined /> {t("addSection")}</button></form><div className="section-list">{sections.map((section) => <div className="section-item" key={section.id}><i style={{ background: section.color }} /><strong>{section.name}</strong><button type="button" onClick={() => removeSection(section.id)} aria-label={t("removeSectionAria", { name: section.name })}><DeleteOutlined /></button></div>)}</div></div><div className="admin-surface section-preview"><span className="admin-kicker">{t("viewMode")}</span><h2>{t("categories")}</h2><div className="section-cloud">{sections.map((section) => <span style={{ borderColor: section.color, color: section.color }} key={section.id}>{section.name}</span>)}</div></div></div>}

        {activeSection === "notifications" && <div className="admin-notifications-layout"><div className="admin-surface"><span className="admin-kicker">{t("broadcast")}</span><h2>{t("newNotification")}</h2><p className="admin-muted">{t("teamMessageText")}</p><form className="notification-form" onSubmit={sendNotification}><label>{t("messageText")}<input value={notification.title} onChange={(event) => setNotification({ ...notification, title: event.target.value })} placeholder={t("exampleNotification")} maxLength={60} /></label><label>{t("sendTo")}<select value={notification.audience} onChange={(event) => setNotification({ ...notification, audience: event.target.value })}><option value="all">{t("allUsersOption")}</option>{users.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label><label>{t("messageText")}<textarea value={notification.body} onChange={(event) => setNotification({ ...notification, body: event.target.value })} placeholder={t("messagePlaceholder")} rows={5} maxLength={240} /></label><button className="admin-primary" type="submit" disabled={sending}><SendOutlined /> {sending ? t("submitting") : t("sendNotification")}</button></form></div><div className="admin-surface"><div className="admin-surface-head"><div><span className="admin-kicker">{t("archive")}</span><h2>{t("latestMessages")}</h2></div></div><div className="notification-history">{notificationHistory.length === 0 ? <div className="admin-empty">{t("noMessagesSent")}</div> : notificationHistory.map((item) => <div className="notification-history-item" key={item.id}><div className="notification-icon"><BellOutlined /></div><div><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleDateString("uz-UZ")} · {t("pushCount", { count: item.pushCount || 0 })}</small></div></div>)}</div></div></div>}
      </main>
    </section>
  );
};

export default Admin;
