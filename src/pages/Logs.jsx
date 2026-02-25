import { useState, useEffect } from 'react'
import { Card, Table, Form, Select, DatePicker, Button, Space, Tag, App, Spin } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const Logs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState([])
  const [modules, setModules] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 })
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const fetchLogs = async (page = 1, pageSize = 50) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      if (values.action) params.append('action', values.action)
      if (values.module) params.append('module', values.module)
      if (values.dateRange && values.dateRange[0] && values.dateRange[1]) {
        params.append('startDate', values.dateRange[0].format('YYYY-MM-DD'))
        params.append('endDate', values.dateRange[1].format('YYYY-MM-DD'))
      }

      const response = await fetch(`http://localhost:3000/api/logs/logs?${params}`)
      const data = await response.json()
      if (data.success) {
        setLogs(data.data.list)
        setPagination({
          current: data.data.page,
          pageSize: data.data.pageSize,
          total: data.data.total,
        })
      }
    } catch (error) {
      message.error('获取操作日志失败')
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilters = async () => {
    try {
      const [actionsRes, modulesRes] = await Promise.all([
        fetch('http://localhost:3000/api/logs/logs/actions'),
        fetch('http://localhost:3000/api/logs/logs/modules'),
      ])
      const actionsData = await actionsRes.json()
      const modulesData = await modulesRes.json()
      if (actionsData.success) setActions(actionsData.data)
      if (modulesData.success) setModules(modulesData.data)
    } catch (error) {
      console.error('Failed to fetch filters:', error)
    }
  }

  useEffect(() => {
    fetchFilters()
    fetchLogs()
  }, [])

  const handleSearch = () => {
    fetchLogs(1, pagination.pageSize)
  }

  const handleReset = () => {
    form.resetFields()
    fetchLogs(1, pagination.pageSize)
  }

  const handleTableChange = (pag) => {
    fetchLogs(pag.current, pag.pageSize)
  }

  const getActionColor = (action) => {
    const colors = {
      login: 'green',
      logout: 'orange',
      create: 'blue',
      update: 'cyan',
      delete: 'red',
      refund: 'magenta',
      shift_start: 'purple',
      shift_end: 'geekblue',
    }
    return colors[action] || 'default'
  }

  const getActionName = (action) => {
    const names = {
      login: '登录',
      logout: '退出',
      create: '创建',
      update: '更新',
      delete: '删除',
      refund: '退款',
      shift_start: '开班',
      shift_end: '交接班',
    }
    return names[action] || action
  }

  const getModuleName = (module) => {
    const names = {
      auth: '认证',
      product: '商品',
      category: '分类',
      inventory: '库存',
      transaction: '交易',
      member: '会员',
      user: '用户',
      shift: '交接班',
      system: '系统',
    }
    return names[module] || module
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作人',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 120,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: (module) => <Tag>{getModuleName(module)}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => <Tag color={getActionColor(action)}>{getActionName(action)}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
      render: (ip) => ip || '-',
    },
  ]

  return (
    <div className="logs-page">
      <Card title="操作日志">
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="module" label="模块">
            <Select allowClear placeholder="选择模块" style={{ width: 120 }}>
              {modules.map(m => (
                <Select.Option key={m} value={m}>{getModuleName(m)}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="action" label="操作">
            <Select allowClear placeholder="选择操作" style={{ width: 120 }}>
              {actions.map(a => (
                <Select.Option key={a} value={a}>{getActionName(a)}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="时间范围">
            <RangePicker style={{ width: 240 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Spin spinning={loading}>
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            pagination={{
              ...pagination,
              showTotal: (total) => `共 ${total} 条记录`,
              showSizeChanger: true,
            }}
            onChange={handleTableChange}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default Logs
