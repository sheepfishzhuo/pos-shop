import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { Toaster } from 'react-hot-toast'
import MainLayout from './layouts/MainLayout'
import Cashier from './pages/Cashier'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Inventory from './pages/Inventory'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Members from './pages/Members'
import Users from './pages/Users'
import Shift from './pages/Shift'
import Logs from './pages/Logs'
import Permissions from './pages/Permissions'
import Promotions from './pages/Promotions'
import PointProducts from './pages/PointProducts'
import Login from './pages/Login'
import { useAuthStore } from './stores/authStore'
import './App.css'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route
              path="/"
              element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
            >
              <Route index element={<Cashier />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="members" element={<Members />} />
              <Route path="users" element={<Users />} />
              <Route path="shift" element={<Shift />} />
              <Route path="logs" element={<Logs />} />
              <Route path="permissions" element={<Permissions />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="point-products" element={<PointProducts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
