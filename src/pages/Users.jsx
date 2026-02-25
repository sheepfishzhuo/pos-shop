import { useState, useEffect } from 'react'
import { Table, Card, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, App, Spin } from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import './Users.css'

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const { message } = App.useApp()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      message.error('获取用户列表失败')
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      role: user.role
    })
    setModalVisible(true)
  }

  const handleDelete = async (userId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3000/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        message.success('删除成功')
        fetchUsers()
      } else {
        message.error(data.message || '删除失败')
      }
    } catch (error) {
      message.error('删除失败')
      console.error('Failed to delete user:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const token = localStorage.getItem('token')
      
      if (editingUser) {
        const response = await fetch(`http://localhost:3000/api/auth/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(values)
        })
        const data = await response.json()
        if (data.success) {
          message.success('修改成功')
          setModalVisible(false)
          fetchUsers()
        } else {
          message.error(data.message || '修改失败')
        }
      } else {
        const response = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(values)
        })
        const data = await response.json()
        if (data.success) {
          message.success('添加成功')
          setModalVisible(false)
          fetchUsers()
        } else {
          message.error(data.message || '添加失败')
        }
      }
    } catch (error) {
      message.error('操作失败')
      console.error('Failed to save user:', error)
    }
  }

  const handleResetPassword = async () => {
    try {
      const values = await passwordForm.validateFields()
      const token = localStorage.getItem('token')
      
      const response = await fetch(`http://localhost:3000/api/auth/users/${selectedUserId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: values.password })
      })
      const data = await response.json()
      if (data.success) {
        message.success('密码重置成功')
        setPasswordModalVisible(false)
        passwordForm.resetFields()
      } else {
        message.error(data.message || '密码重置失败')
      }
    } catch (error) {
      message.error('密码重置失败')
      console.error('Failed to reset password:', error)
    }
  }

  const openPasswordModal = (userId) => {
    setSelectedUserId(userId)
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const getRoleTag = (role) => {
    const colors = {
      admin: 'red',
      manager: 'blue',
      cashier: 'green',
    }
    const names = {
      admin: '管理员',
      manager: '经理',
      cashier: '收银员',
    }
    return <Tag color={colors[role]}>{names[role]}</Tag>
  }

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <span>
          <UserOutlined style={{ marginRight: 8, color: '#6366f1' }} />
          {text}
        </span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => getRoleTag(role),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<LockOutlined />}
            onClick={() => openPasswordModal(record.id)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定要删除此用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="users-page">
      <Card
        title="用户管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加用户
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 个用户`,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="manager">经理</Select.Option>
              <Select.Option value="cashier">收银员</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onOk={handleResetPassword}
        onCancel={() => setPasswordModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Users
