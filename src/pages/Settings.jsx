import React, { useState } from "react";

function Settings() {
  const [telegramUser, setTelegramUser] = useState(""); // faqat username
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState("");

  // 🔹 Sozlamalarni saqlash
  const handleSave = async () => {
    if (!telegramUser.trim()) {
      setNotifyStatus("❌ Avval username kiriting");
      return;
    }

    setSaving(true);
    try {
      await fetch("https://a139ac647c5e2feb.mokky.dev/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser, darkMode }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("❌ Saqlashda xatolik:", err);
      setNotifyStatus("❌ Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Test xabar yuborish
  const testNotify = async () => {
    if (!telegramUser.trim()) {
      setNotifyStatus("❌ Username kiriting");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: telegramUser.replace("@", ""), // @ belgisiz yuboramiz
          message: "✅ Hisobotdan test xabar yuborildi!",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setNotifyStatus("✅ Xabar yuborildi!");
      } else {
        setNotifyStatus("❌ Yuborilmadi: " + (data.description || "Xato"));
      }
    } catch (err) {
      console.error("❌ Server xatoligi:", err);
      setNotifyStatus("❌ Serverga ulanishda xatolik");
    }

    setTimeout(() => setNotifyStatus(""), 3000);
  };

  return (
    <section className="settings">
      <h2>⚙️ Sozlamalar</h2>

      {/* Telegram Username */}
      <div className="settings-item">
        <label>Telegram Username:</label>
        <input
          type="text"
          value={telegramUser}
          onChange={(e) => setTelegramUser(e.target.value)}
          placeholder="@username"
        />
        <button onClick={testNotify}>Test yuborish</button>
        {notifyStatus && <p>{notifyStatus}</p>}
      </div>

      {/* Dark Mode */}
      <div className="settings-item">
        <label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          🌙 Tungi rejim
        </label>
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}>
        {saving ? "⏳ Saqlanmoqda..." : "💾 Saqlash"}
      </button>

      {saved && <p style={{ color: "green" }}>✅ Sozlamalar saqlandi</p>}
    </section>
  );
}

export default Settings;
