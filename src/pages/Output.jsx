import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { scheduleExpenseReminders } from "../utils/reminders";
import { createTransaction, getCategories } from "../services/firestore";

function Output() {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("kirim");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Umumiy");
  const [dueDate, setDueDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem("moliyam-sections") || "null") || [
    { name: "Umumiy" }, { name: "Oziq-ovqat" }, { name: "Transport" }, { name: "Uy-joy" }, { name: "Salomatlik" }, { name: "Ta'lim" }, { name: "Ko'ngilochar" }, { name: "Ish haqi" },
  ]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    getCategories().then((items) => {
      if (items.length) setCategories(items);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!user) {
      setMessage("❌ Avval tizimga kiring (login).");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setMessage("❌ Summani to‘g‘ri kiriting!");
      return;
    }
    if (type !== "kirim" && type !== "chiqim") {
      setMessage("❌ Turi noto‘g‘ri!");
      return;
    }

    setSaving(true);
    try {
      const savedTransaction = await createTransaction({
          amount: Number(amount),
          type,                 // "kirim" | "chiqim"
          desc,
          category,
          dueDate: dueDate || null,
          status: dueDate ? "planned" : "completed",
          reminderEnabled: Boolean(dueDate && reminderEnabled),
          createdAt: new Date().toISOString(),
          userId: user.id,      // 🔑 MUHIM: foydalanuvchiga bog‘laymiz
      });
      if (dueDate && reminderEnabled) {
        await scheduleExpenseReminders({ ...savedTransaction, amount: Number(amount), desc, dueDate, reminderEnabled: true });
      }
      setAmount("");
      setDesc("");
      setCategory("Umumiy");
      setDueDate("");
      setMessage("✅ Saqlandi!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Xatolik: ", err);
      setMessage("❌ Xatolik yuz berdi!");
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
              <h2>Kirim/Chiqim kiritish</h2>
              <p style={{ color: "red", marginTop: 10 }}>
                ⛔ Bu bo‘limdan foydalanish uchun avval login qiling.
              </p>
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
            <p className="eyebrow">Yangi yozuv</p>
            <h2>Tranzaksiya qo'shish</h2>
            <p className="output-description">Daromad yoki xarajatni kiriting. Bu ma'lumotlar balans va hisobotlarda avtomatik aks etadi.</p>
            <div className="output-inp">
              <div className="type-switch" role="group" aria-label="Tranzaksiya turi">
                <button type="button" className={type === "kirim" ? "selected income" : ""} onClick={() => setType("kirim")}><ArrowUpOutlined /> Kirim</button>
                <button type="button" className={type === "chiqim" ? "selected expense" : ""} onClick={() => setType("chiqim")}><ArrowDownOutlined /> Chiqim</button>
              </div>
              <label>Summa<input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" /></label>
              <label>Kategoriya<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item.id || item.name}>{item.name}</option>)}</select></label>
              <label>Qachon sarflanadi? <span>(ixtiyoriy)</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
              {dueDate && <label className="reminder-check"><input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} /> Eslatma yoqilsin <span>1 kun oldin va belgilangan kuni har 2 soatda</span></label>}
              <label>Izoh <span>(ixtiyoriy)</span><input type="text" placeholder="Masalan: Oylik xaridlar" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
              <button
                onClick={handleSave}
                className="output-save-button"
                disabled={saving}
              >
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>

              {message && (
                <p
                  style={{
                    color: message.startsWith("✅") ? "green" : "red",
                    marginTop: "10px",
                  }}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Output;