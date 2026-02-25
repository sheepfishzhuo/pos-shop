import { useState } from 'react'
import { Form, Input, Button, App } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/authService'
import './Login.css'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const { login: setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const onFinish = async (values) => {
    setLoading(true)
    
    try {
      const response = await login({
        username: values.username,
        password: values.password
      })

      if (response.success) {
        setAuth(response.data.user, response.data.token)
        message.success('登录成功')
        navigate('/')
      }
    } catch (error) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('登录失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-pattern"></div>
      
      <div className="login-container">
        <div className="login-brand">
          <div className="brand-logo">
            <ShopOutlined />
          </div>
          <h1 className="brand-title">智慧收银系统</h1>
          <p className="brand-subtitle">专业超市收银管理系统</p>
        </div>

        <div className="login-card">
          <div className="card-header">
            <h2>欢迎回来</h2>
            <p>请输入您的账号信息登录系统</p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            className="login-form"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined className="input-icon" />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block className="login-btn">
                登录系统
              </Button>
            </Form.Item>
          </Form>

          <div className="card-footer">
            <div className="demo-info">
              <span className="demo-label">演示账号</span>
              <code className="demo-code">admin / 123456</code>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>© 2024 智慧收银系统. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default Login
