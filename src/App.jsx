import { Route, Routes } from 'react-router-dom';
import Main from "./layout/Main";
import Dashboard from "./pages/Dashboard";
import Output from "./pages/Output";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {

  return (
    <>
      <Routes>
        <Route path='/' element={<Main />} >
          <Route path='/' element={<Dashboard />} />
          <Route path='/kirim-chiqim' element={<Output />} />
          <Route path='/hisobot' element={<Reports />} />
          <Route path='/sozlamalar' element={<Settings />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
