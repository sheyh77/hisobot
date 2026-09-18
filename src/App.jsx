import { Route, Routes, Navigate } from "react-router-dom";
import Main from "./layout/Main";
import Dashboard from "./pages/Dashboard";
import Output from "./pages/Output";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./login/Login";
import Register from "./login/Register";
import Admin from "./pages/Admin";
import { useAuth } from "./context/AuthContext";

// PrivateRoute - foydalanuvchi login qilmagan bo‘lsa redirect qiladi
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Foydalanuvchi hali localStorage’dan o‘qilayotgan bo‘lsa
  if (loading) return <div>Loading...</div>; // yoki spinner

  // Agar user bor bo‘lsa children ko‘rsatiladi, yo‘q bo‘lsa login sahifaga yo‘naltiradi
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login?next=admin" replace />;
  return user.role === "admin" || user.isAdmin === true ? children : <Navigate to="/?admin=denied" replace />;
};

function App() {
  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Main />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="kirim-chiqim" element={<Output />} />
          <Route path="hisobot" element={<Reports />} />
          <Route path="sozlamalar" element={<Settings />} />
        </Route>
    </Routes>
  );
}

export default App;