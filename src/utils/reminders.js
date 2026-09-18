import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const webTimers = new Map();
const reminderKey = (transactionId) => `moliyam-reminders-${transactionId}`;

const parseLocalDate = (dateValue, hour, minute) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const getReminderTimes = (dueDate) => {
  const times = [parseLocalDate(dueDate, 9, 0)];
  for (let hour = 8; hour <= 20; hour += 2) {
    times.push(parseLocalDate(dueDate, hour, 0));
  }
  return times.filter((date, index, list) => date > new Date() && list.findIndex((item) => item.getTime() === date.getTime()) === index);
};

const numericId = (value, index) => {
  const text = String(value);
  let hash = 0;
  for (let characterIndex = 0; characterIndex < text.length; characterIndex += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(characterIndex);
    hash |= 0;
  }
  return Math.abs(hash % 900000000) + index + 1;
};

const showWebNotification = (title, body) => {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/images/icon.png" });
  }
};

export const requestReminderPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }
  if (typeof Notification === "undefined") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const scheduleExpenseReminders = async (transaction) => {
  if (!transaction?.dueDate || !transaction?.id || !transaction.reminderEnabled) return [];
  const dueDate = new Date(`${transaction.dueDate}T00:00:00`);
  const dayBefore = new Date(dueDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const times = [new Date(dayBefore.setHours(9, 0, 0, 0)), ...getReminderTimes(transaction.dueDate)];
  const validTimes = times.filter((date, index, list) => date > new Date() && list.findIndex((item) => item.getTime() === date.getTime()) === index);
  await requestReminderPermission();

  if (Capacitor.isNativePlatform()) {
    const ids = validTimes.map((_, index) => numericId(transaction.id, index));
    await LocalNotifications.schedule({
      notifications: validTimes.map((date, index) => ({
        id: ids[index],
        title: date < dueDate ? "Ertangi rejangiz" : "Rejalashtirilgan xarajat",
        body: `${transaction.amount.toLocaleString("uz-UZ")} so'm - ${transaction.desc || "xarajatni amalga oshirish vaqti"}`,
        schedule: { at: date, allowWhileIdle: true },
        extra: { transactionId: transaction.id },
      })),
    });
    localStorage.setItem(reminderKey(transaction.id), JSON.stringify(ids));
    return ids;
  }

  const timers = validTimes.map((date) => window.setTimeout(() => {
    showWebNotification(date < dueDate ? "Ertangi rejangiz" : "Rejalashtirilgan xarajat", `${transaction.amount.toLocaleString("uz-UZ")} so'm - ${transaction.desc || "xarajatni amalga oshiring"}`);
  }, date.getTime() - Date.now()));
  webTimers.set(String(transaction.id), timers);
  localStorage.setItem(reminderKey(transaction.id), JSON.stringify(timers));
  return timers;
};

export const cancelExpenseReminders = async (transactionId) => {
  const savedIds = JSON.parse(localStorage.getItem(reminderKey(transactionId)) || "[]");
  if (Capacitor.isNativePlatform() && savedIds.length) {
    await LocalNotifications.cancel({ notifications: savedIds.map((id) => ({ id })) });
  }
  (webTimers.get(String(transactionId)) || []).forEach((timer) => window.clearTimeout(timer));
  webTimers.delete(String(transactionId));
  localStorage.removeItem(reminderKey(transactionId));
};
