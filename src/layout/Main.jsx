import React from 'react';
import { Outlet } from "react-router-dom";
import Header from "./Header"

function Main() {
  return (
    <main className="main">
      <Header />
    </main>
  )
}

export default Main