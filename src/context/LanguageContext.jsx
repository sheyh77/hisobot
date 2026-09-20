import React, { createContext, useContext, useState } from "react";

const translations = {
  uz: { home: "Asosiy", transactions: "Kirim-chiqim", reports: "Hisobot", settings: "Sozlamalar", notifications: "Xabarlar", admin: "Admin", profile: "Profil", language: "Til", pro: "Moliyam Pro", upgrade: "Pro tarifga o'tish", save: "Saqlash", activity: "Faoliyat", today: "Bugungi tranzaksiyalar", all: "Barcha tranzaksiyalar", income: "Kirim", expense: "Chiqim", add: "Tranzaksiya qo'shish", loading: "Yuklanmoqda...", noData: "Hali ma'lumot yo'q" },
  ru: { home: "Главная", transactions: "Доходы-расходы", reports: "Отчёты", settings: "Настройки", notifications: "Уведомления", admin: "Админ", profile: "Профиль", language: "Язык", pro: "Moliyam Pro", upgrade: "Перейти на Pro", save: "Сохранить", activity: "Активность", today: "Сегодняшние операции", all: "Все операции", income: "Доход", expense: "Расход", add: "Добавить операцию", loading: "Загрузка...", noData: "Пока нет данных" },
  en: { home: "Home", transactions: "Income-expenses", reports: "Reports", settings: "Settings", notifications: "Notifications", admin: "Admin", profile: "Profile", language: "Language", pro: "Moliyam Pro", upgrade: "Upgrade to Pro", save: "Save", activity: "Activity", today: "Today's transactions", all: "All transactions", income: "Income", expense: "Expense", add: "Add transaction", loading: "Loading...", noData: "No data yet" },
};
const LanguageContext = createContext(null);
export const LanguageProvider = ({ children }) => { const [language, setLanguage] = useState(() => localStorage.getItem("moliyam-language") || "uz"); const changeLanguage = (next) => { setLanguage(next); localStorage.setItem("moliyam-language", next); }; const t = (key) => translations[language]?.[key] || translations.uz[key] || key; return <LanguageContext.Provider value={{ language, changeLanguage, t }}>{children}</LanguageContext.Provider>; };
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
