import React, { useRef } from 'react'
import { Link, Outlet } from 'react-router-dom';
import Dashboard from "../assets/icon/DashboardIcon";

function Header() {
  return (
    <header className="header">
      <div className="cantainer">
        <div className="header-wrap">
          <Link to="/" className="header-logo">Logo</Link>
          <div className="header-left-menu">
            <Link to="/" className="header-left-menu-title">Asosiy</Link>
            <Link to="/kirim-chiqim" className="header-left-menu-title">Kirim-chiqim</Link>
            <Link to="/hisobot" className="header-left-menu-title">Hisobot</Link>
            <Link to="/sozlamalar" className="header-left-menu-title">Sozlamalar</Link>
          </div>

          {/* responsive */}
          <div className="header-menu-nav">
            <div className="header-menu-nav-block">
              <Link to="/ ">
                <Dashboard />
                <p className="header-menu-nav-title">Asosiy</p>
              </Link>
            </div>
            <div className="header-menu-nav-block">
              <Link to="/kirim-chiqim">
                <Dashboard />
                <p className="header-menu-nav-title">Asosiy</p>
              </Link>
            </div>
            <div className="header-menu-nav-block">
              <Link to="/hisobot">
                <Dashboard />
                <p className="header-menu-nav-title">Asosiy</p>
              </Link>
            </div>
            <div className="header-menu-nav-block">
              <Link to="/sozlamalar">
                <Dashboard />
                <p className="header-menu-nav-title">Asosiy</p>
              </Link>
            </div>
          </div>

        </div>
      </div>
      <Outlet />
    </header>
  )
}

export default Header