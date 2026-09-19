import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom';
import { HomeOutlined, SwapOutlined, BarChartOutlined, SettingOutlined, CrownOutlined, BellOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";

function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <header className="header">
      <div className="cantainer">
        <div className="header-wrap">
          <Link to="/" className="header-logo">Moliyam</Link>
          <div className="header-left-menu">
            <Link to="/" className="header-left-menu-title">Asosiy</Link>
            <Link to="/kirim-chiqim" className="header-left-menu-title">Kirim-chiqim</Link>
            <Link to="/hisobot" className="header-left-menu-title">Hisobot</Link>
            <Link to="/sozlamalar" className="header-left-menu-title">Sozlamalar</Link>
            <Link to="/bildirishnomalar" className="header-left-menu-title"><BellOutlined /> Xabarlar</Link>
            {isAdmin && <Link to="/admin" className="header-left-menu-title header-admin-link"><CrownOutlined /> Admin</Link>}
          </div>

          {/* responsive */}
          <div className="header-menu-nav">
            <Link to="/">
              <div className={`header-menu-nav-block ${isActive("/")}`}>
                <HomeOutlined />
                <p className="header-menu-nav-title">Asosiy</p>
              </div>
            </Link>

            <Link to="/kirim-chiqim">
              <div className={`header-menu-nav-block ${isActive("/kirim-chiqim")}`}>
                <SwapOutlined />
                <p className="header-menu-nav-title">Kirim-chiqim</p>
              </div>
            </Link>

            <Link to="/hisobot">
              <div className={`header-menu-nav-block ${isActive("/hisobot")}`}>
                <BarChartOutlined />
                <p className="header-menu-nav-title">Hisobot</p>
              </div>
            </Link>

            <Link to="/sozlamalar">
              <div className={`header-menu-nav-block ${isActive("/sozlamalar")}`}>
                <SettingOutlined />
                <p className="header-menu-nav-title">Sozlamalar</p>
              </div>
            </Link>
            <Link to="/bildirishnomalar"><div className={`header-menu-nav-block ${isActive("/bildirishnomalar")}`}><BellOutlined /><p className="header-menu-nav-title">Xabarlar</p></div></Link>
            {isAdmin && <Link to="/admin"><div className={`header-menu-nav-block ${isActive("/admin")}`}><CrownOutlined /><p className="header-menu-nav-title">Admin</p></div></Link>}
          </div>

        </div>
      </div>
      <Outlet />
    </header>
  )
}

export default Header