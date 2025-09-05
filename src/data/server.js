import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔹 Service Account JSON-dan olib qo‘yasiz
const SERVER_KEY = "8b25e2ec304d774cc3204a3cdc27f05aeb8d7aad"; // Firebase console > Project Settings > Cloud Messaging > "Server key"

app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${SERVER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: title || "🔔 Test Notification",
          body: body || "FCM orqali yuborildi!",
        },
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Notification yuborishda xato:", err);
    res.status(500).json({ error: "Yuborilmadi" });
  }
});

app.listen(5000, () => console.log("✅ Server 5000-portda ishlayapti"));
