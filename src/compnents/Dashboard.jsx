import React from 'react';
import { useLanguage } from "../context/LanguageContext";

function Dashboard() {
  const { t } = useLanguage();

  return (
    <section className="dashboard">
      <div className="dashboard-wrap">
        <h1 className="dashboard-titile">{t("hello", { name: "Shahriyor" })}</h1>

        <div className="dashboard-report-card">
          <div className="dashboard-report-card-balance">
            <p className="dashboard-report-card-balance-title">{t("yourBalance")}</p>
            <p className="dashboard-report-card-balance-cash">2.000.000</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;