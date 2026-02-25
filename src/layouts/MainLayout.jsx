import { Layout, Avatar, Dropdown } from 'antd'
import {
  ShopOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  TagsOutlined,
  SwapOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  GiftOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import './MainLayout.css'

const { Header, Content } = Layout

const allNavItems = [
  { key: '/', icon: <ShopOutlined />, label: '收银', permission: 'cashier' },
  { key: '/products', icon: <AppstoreOutlined />, label: '商品', permission: 'products' },
  { key: '/categories', icon: <TagsOutlined />, label: '分类', permission: 'categories' },
  { key: '/inventory', icon: <DatabaseOutlined />, label: '库存', permission: 'inventory' },
  { key: '/members', icon: <CrownOutlined />, label: '会员', permission: 'members' },
  { key: '/point-products', icon: <GiftOutlined />, label: '积分商品', permission: 'members' },
  { key: '/transactions', icon: <FileTextOutlined />, label: '交易', permission: 'transactions' },
  { key: '/promotions', icon: <GiftOutlined />, label: '促销', permission: 'promotions' },
  { key: '/reports', icon: <BarChartOutlined />, label: '报表', permission: 'reports' },
  { key: '/shift', icon: <SwapOutlined />, label: '交接班', permission: 'shift' },
  { key: '/users', icon: <UserOutlined />, label: '用户', permission: 'users' },
  { key: '/permissions', icon: <SafetyOutlined />, label: '权限', permission: 'users' },
  { key: '/logs', icon: <FileSearchOutlined />, label: '日志', permission: 'logs' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置', permission: 'settings' },
]

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const permissions = user?.permissions || []
  const filteredNavItems = allNavItems.filter(item => permissions.includes(item.permission))

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleMenuClick = (key) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else if (key === 'profile') {
      navigate('/settings')
    }
  }

  return (
    <Layout className="main-layout">
      <Header className="top-header">
        <div className="header-brand">
          <ShopOutlined className="brand-icon" />
          <span className="brand-text">智慧收银</span>
        </div>

        <nav className="header-nav">
          {filteredNavItems.map((item) => (
            <div
              key={item.key}
              className={`nav-item ${location.pathname === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="header-actions">
          <span className="user-name">{user?.name || '用户'}</span>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: ({ key }) => handleMenuClick(key),
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Avatar 
              size={32} 
              icon={<UserOutlined />}
              className="user-avatar"
            />
          </Dropdown>
        </div>
      </Header>

      <Content className="main-content">
        <Outlet />
      </Content>
    </Layout>
  )
}

export default MainLayout
