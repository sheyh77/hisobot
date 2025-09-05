import React from 'react'

function Dashboard() {
  return (
    <section className="dashboard">
      <div className="dashboard-wrap">
        <h1 className="dashboard-titile">Xush kelibsiz, Shahriyor</h1>

        <div className="dashboard-report-card">
          <div className="dashboard-report-card-balance">
            <p className="dashboard-report-card-balance-title">Hozirgi balansingiz</p>
            <p className="dashboard-report-card-balance-cash">2.000.000</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard