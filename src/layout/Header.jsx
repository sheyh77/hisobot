import React, { useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom';
import Dashboard from "../assets/icon/DashboardIcon";
import { HomeOutlined, SwapOutlined, BarChartOutlined, SettingOutlined } from "@ant-design/icons";

function Header() {
  const location = useLocation();

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
          </div>

        </div>
      </div>
      <Outlet />
    </header>
  )
}

export default Header