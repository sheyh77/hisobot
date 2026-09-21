import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { scheduleExpenseReminders } from "../utils/reminders";
import { createTransaction, getCategories } from "../services/firestore";
import { useLanguage } from "../context/LanguageContext";

function Output() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("kirim");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(t("generalCategory"));
  const [dueDate, setDueDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [categories, setCategories] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("moliyam-sections") || "null");
    if (saved && saved.length) return saved;
    return [
      { name: t("generalCategory") },
      { name: t("foodCategory") },
      { name: t("transportCategory") },
      { name: t("homeCategory") },
      { name: t("healthCategory") },
      { name: t("educationCategory") },
      { name: t("entertainmentCategory") },
      { name: t("salaryCategory") },
    ];
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then((items) => {
      if (items.length) setCategories(items);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!user) {
      setMessage(t("loginRequired"));
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setMessage(t("invalidAmount"));
      return;
    }
    if (type !== "kirim" && type !== "chiqim") {
      setMessage(t("invalidType"));
      return;
    }

    setSaving(true);
    try {
      const savedTransaction = await createTransaction({
        amount: Number(amount),
        type,
        desc,
        category,
        dueDate: dueDate || null,
        status: dueDate ? "planned" : "completed",
        reminderEnabled: Boolean(dueDate && reminderEnabled),
        createdAt: new Date().toISOString(),
        userId: user.id,
      });
      if (dueDate && reminderEnabled) {
        await scheduleExpenseReminders({ ...savedTransaction, amount: Number(amount), desc, dueDate, reminderEnabled: true });
      }
      setAmount("");
      setDesc("");
      setCategory(t("generalCategory"));
      setDueDate("");
      setMessage(t("saveSuccess"));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(t("errorPrefix"), err);
      setMessage(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <section className="output">
        <div className="cantainer">
          <div className="output-wrap">
            <div className="output-box">
              <h2>{t("addTransactionTitle")}</h2>
              <p style={{ color: "red", marginTop: 10 }}>⛔ {t("loginToAccess")}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="output">
      <div className="cantainer">
        <div className="output-wrap">
          <div className="output-box">
            <p className="eyebrow">{t("newEntry")}</p>
            <h2>{t("add")}</h2>
            <p className="output-description">{t("transactionPrompt")}</p>
            <div className="output-inp">
              <div className="type-switch" role="group" aria-label={t("transactionType")}>
                <button type="button" className={type === "kirim" ? "selected income" : ""} onClick={() => setType("kirim")}><ArrowUpOutlined /> {t("income")}</button>
                <button type="button" className={type === "chiqim" ? "selected expense" : ""} onClick={() => setType("chiqim")}><ArrowDownOutlined /> {t("expense")}</button>
              </div>
              <label>{t("amount")}<input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" /></label>
              <label>{t("category")}<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item.id || item.name}>{item.name}</option>)}</select></label>
              <label>{t("dueDate")} <span>{t("optional")}</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
              {dueDate && <label className="reminder-check"><input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} /> {t("reminderToggle")} <span>{t("reminderHint")}</span></label>}
              <label>{t("note")} <span>{t("optional")}</span><input type="text" placeholder={t("exampleExpenseNote")} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
              <button onClick={handleSave} className="output-save-button" disabled={saving}>{saving ? t("saveProgress") : t("save")}</button>
              {message && <p style={{ color: message.startsWith("✅") ? "green" : "red", marginTop: "10px" }}>{message}</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Output;