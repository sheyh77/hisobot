import React, { createContext, useContext, useState } from "react";

const translations = {
  uz: { home: "Asosiy", transactions: "Kirim-chiqim", reports: "Hisobot", settings: "Sozlamalar", notifications: "Xabarlar", admin: "Admin", profile: "Profil", language: "Til", pro: "Moliyam Pro", upgrade: "Pro tarifga o'tish", save: "Saqlash" },
  ru: { home: "Главная", transactions: "Доходы-расходы", reports: "Отчёты", settings: "Настройки", notifications: "Уведомления", admin: "Админ", profile: "Профиль", language: "Язык", pro: "Moliyam Pro", upgrade: "Перейти на Pro", save: "Сохранить" },
  en: { home: "Home", transactions: "Income-expenses", reports: "Reports", settings: "Settings", notifications: "Notifications", admin: "Admin", profile: "Profile", language: "Language", pro: "Moliyam Pro", upgrade: "Upgrade to Pro", save: "Save" },
};
const LanguageContext = createContext(null);
export const LanguageProvider = ({ children }) => { const [language, setLanguage] = useState(() => localStorage.getItem("moliyam-language") || "uz"); const changeLanguage = (next) => { setLanguage(next); localStorage.setItem("moliyam-language", next); }; const t = (key) => translations[language]?.[key] || translations.uz[key] || key; return <LanguageContext.Provider value={{ language, changeLanguage, t }}>{children}</LanguageContext.Provider>; };
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
