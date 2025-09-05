import React, { useRef } from 'react'
import { Link, Outlet } from 'react-router-dom';
import MenuIcon from "../assets/icon/MenuIcon";
import MenuCloseIcon from "../assets/icon/MenuCloseIcon";

function Header() {

  const MenuRef = useRef(document.querySelector(".header-menu-nav"))

  function MenuOpen() {
    MenuRef.current.classList.add("active")
  }

  function MenuClose() {
    MenuRef.current.classList.remove("active")
  }

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
          <button className='header-menu-btn' onClick={MenuOpen}>
            <MenuIcon />
          </button>

          {/* responsive */}
          <div className="header-menu-nav" ref={MenuRef}>
            <button className='header-menu-nav-close' onClick={MenuClose}>
              <MenuCloseIcon />
            </button>
            <Link to="/" className="header-logo">Logo</Link>
            <div className="header-left-nav">
              <Link to="/" className="header-left-nav-title">Asosiy</Link>
              <Link to="/kirim-chiqim" className="header-left-nav-title">Kirim-chiqim</Link>
              <Link to="/hisobot" className="header-left-nav-title">Hisobot</Link>
              <Link to="/sozlamalar" className="header-left-nav-title">Sozlamalar</Link>
            </div>
          </div>

        </div>
      </div>
      <Outlet />
    </header>
  )
}

export default Header