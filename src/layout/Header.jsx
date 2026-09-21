import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom';
import { HomeOutlined, SwapOutlined, BarChartOutlined, SettingOutlined, CrownOutlined, BellOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function Header({ standalone = false }) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <header className={`header ${standalone ? "standalone-header" : ""}`}>
      <div className="cantainer">
        <div className="header-wrap">
          <Link to="/" className="header-logo">Moliyam</Link>
          <div className="header-left-menu">
            <Link to="/" className="header-left-menu-title">{t("home")}</Link>
            <Link to="/kirim-chiqim" className="header-left-menu-title">{t("transactions")}</Link>
            <Link to="/hisobot" className="header-left-menu-title">{t("reports")}</Link>
            <Link to="/sozlamalar" className="header-left-menu-title">{t("settings")}</Link>
            <Link to="/bildirishnomalar" className="header-left-menu-title"><BellOutlined /> {t("notifications")}</Link>
            {isAdmin && <Link to="/admin" className="header-left-menu-title header-admin-link"><CrownOutlined /> {t("admin")}</Link>}
          </div>

          <div className="header-menu-nav">
            <Link to="/">
              <div className={`header-menu-nav-block ${isActive("/")}`}>
                <HomeOutlined />
                <p className="header-menu-nav-title">{t("home")}</p>
              </div>
            </Link>

            <Link to="/kirim-chiqim">
              <div className={`header-menu-nav-block ${isActive("/kirim-chiqim")}`}>
                <SwapOutlined />
                <p className="header-menu-nav-title">{t("transactions")}</p>
              </div>
            </Link>

            <Link to="/hisobot">
              <div className={`header-menu-nav-block ${isActive("/hisobot")}`}>
                <BarChartOutlined />
                <p className="header-menu-nav-title">{t("reports")}</p>
              </div>
            </Link>

            <Link to="/sozlamalar">
              <div className={`header-menu-nav-block ${isActive("/sozlamalar")}`}>
                <SettingOutlined />
                <p className="header-menu-nav-title">{t("settings")}</p>
              </div>
            </Link>
            <Link to="/bildirishnomalar">
              <div className={`header-menu-nav-block ${isActive("/bildirishnomalar")}`}>
                <BellOutlined />
                <p className="header-menu-nav-title">{t("notifications")}</p>
              </div>
            </Link>
            {isAdmin && <Link to="/admin"><div className={`header-menu-nav-block ${isActive("/admin")}`}><CrownOutlined /><p className="header-menu-nav-title">{t("admin")}</p></div></Link>}
          </div>
        </div>
      </div>
      <Outlet />
    </header>
  )
}

export default Header