const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

initializeApp();

exports.sendNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
  const notification = event.data?.data();
  if (!notification || notification.status !== "queued") return null;

  const usersSnapshot = notification.audience === "all"
    ? await getFirestore().collection("users").get()
    : { docs: [await getFirestore().collection("users").doc(notification.audience).get()] };
  const tokens = usersSnapshot.docs.filter((item) => item.exists).map((item) => item.data().fcmToken).filter(Boolean);
  if (!tokens.length) {
    await event.data.ref.update({ status: "sent", sentCount: 0, sentAt: new Date().toISOString() });
    return null;
  }

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: notification.title, body: notification.body },
    data: { notificationId: event.params.notificationId },
  });
  await event.data.ref.update({ status: "sent", sentCount: response.successCount, sentAt: new Date().toISOString() });
  return null;
});
