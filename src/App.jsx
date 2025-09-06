import { Route, Routes } from "react-router-dom";
import Main from "./layout/Main";
import Dashboard from "./pages/Dashboard";
import Output from "./pages/Output";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./login/Login";
import Register from "./login/Register";

function App() {
  return (
    <Routes>
      {/* Auth sahifalari */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Faqat login bo‘lgandan keyin ishlaydigan layout */}
      <Route path="/" element={<Main />}>
        <Route index element={<Dashboard />} /> {/* Asosiy sahifa */}
        <Route path="kirim-chiqim" element={<Output />} />
        <Route path="hisobot" element={<Reports />} />
        <Route path="sozlamalar" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;