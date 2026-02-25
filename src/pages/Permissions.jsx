import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Checkbox, Space, Tag, App, Spin, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import './Permissions.css'

const Permissions = () => {
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState({})
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const { message } = App.useApp()

  const roles = [
    { key: 'admin', name: '管理员', color: 'red' },
    { key: 'manager', name: '经理', color: 'blue' },
    { key: 'cashier', name: '收银员', color: 'green' },
  ]

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3000/api/permissions')
      const data = await response.json()
      if (data.success) {
        setPermissions(data.data)
      }
    } catch (error) {
      message.error('获取权限列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchRolePermissions = async () => {
    try {
      const perms = {}
      for (const role of roles) {
        const response = await fetch(`http://localhost:3000/api/permissions/role/${role.key}`)
        const data = await response.json()
        if (data.success) {
          perms[role.key] = data.data.map(p => p.id)
        }
      }
      setRolePermissions(perms)
    } catch (error) {
      message.error('获取角色权限失败')
    }
  }

  useEffect(() => {
    fetchPermissions()
    fetchRolePermissions()
  }, [])

  const handlePermissionChange = (role, permId, checked) => {
    setRolePermissions(prev => {
      const current = prev[role] || []
      return {
        ...prev,
        [role]: checked 
          ? [...current, permId]
          : current.filter(id => id !== permId)
      }
    })
  }

  const handleSelectAll = (role, checked) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: checked ? permissions.map(p => p.id) : []
    }))
  }

  const handleSave = async (role) => {
    setSaveLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/permissions/role/${role}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePermissions[role] || [] })
      })
      const data = await response.json()
      if (data.success) {
        message.success('保存成功')
      } else {
        message.error(data.message || '保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setSaveLoading(false)
    }
  }

  const columns = [
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '权限代码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code) => <Tag>{code}</Tag>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ]

  return (
    <div className="permissions-page">
      <Card title="权限管理">
        <Spin spinning={loading}>
          <Table
            dataSource={permissions}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
          />

          <Divider />

          <h3>角色权限配置</h3>
          <div className="role-permissions">
            {roles.map(role => (
              <Card 
                key={role.key} 
                title={<Tag color={role.color}>{role.name}</Tag>}
                size="small"
                style={{ marginBottom: 16 }}
                extra={
                  <Space>
                    <Button 
                      size="small" 
                      onClick={() => handleSelectAll(role.key, true)}
                    >
                      全选
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => handleSelectAll(role.key, false)}
                    >
                      清空
                    </Button>
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<SaveOutlined />}
                      loading={saveLoading}
                      onClick={() => handleSave(role.key)}
                    >
                      保存
                    </Button>
                  </Space>
                }
              >
                <div className="permission-checkboxes">
                  {permissions.map(perm => (
                    <Checkbox
                      key={perm.id}
                      checked={(rolePermissions[role.key] || []).includes(perm.id)}
                      onChange={(e) => handlePermissionChange(role.key, perm.id, e.target.checked)}
                    >
                      {perm.name}
                    </Checkbox>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Spin>
      </Card>
    </div>
  )
}

export default Permissions
