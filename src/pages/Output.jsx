import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Output() {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("kirim");
  const [desc, setDesc] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();

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
      const res = await fetch("https://a139ac647c5e2feb.mokky.dev/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type,                 // "kirim" | "chiqim"
          desc,
          createdAt: new Date().toISOString(),
          userId: user.id,      // 🔑 MUHIM: foydalanuvchiga bog‘laymiz
        }),
      });

      if (!res.ok) {
        throw new Error("Server xatosi");
      }

      setAmount("");
      setDesc("");
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
            <h2>Kirim/Chiqim kiritish</h2>
            <div className="output-inp">
              <input
                type="number"
                placeholder="Summani kiriting"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
              <input
                type="text"
                placeholder="Izoh (ixtiyoriy)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="kirim">Kirim</option>
                <option value="chiqim">Chiqim</option>
              </select>
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