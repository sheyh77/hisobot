import React, { useState } from "react";

function Output() {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("kirim"); // default = kirim
  const [desc, setDesc] = useState("");
  const [message, setMessage] = useState(""); // 🔹 Saqlash xabari uchun

  const handleSave = async () => {
    if (!amount) return setMessage("❌ Summani kiriting!");

    try {
      await fetch("https://a139ac647c5e2feb.mokky.dev/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type, // kirim yoki chiqim
          desc,
          createdAt: new Date().toISOString(),
        }),
      });

      setAmount("");
      setDesc("");
      setMessage("✅ Saqlandi!"); // 🔹 alert o‘rniga yashil yozuv
      setTimeout(() => setMessage(""), 3000); // 3 sekundan keyin o‘chadi
    } catch (err) {
      console.error("Xatolik: ", err);
      setMessage("❌ Xatolik yuz berdi!");
    }
  };

  return (
    <section className="output">
      <div className="output-box">
        <h2>Kirim/Chiqim kiritish</h2>
        <div className="output-inp">
          <input
            type="number"
            placeholder="Summani kiriting"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
          <button onClick={handleSave} className="output-save-button">Saqlash</button>

          {/* 🔹 Xabar chiqishi */}
          {message && (
            <p style={{ color: message.startsWith("✅") ? "green" : "red", marginTop: "10px" }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Output;
