import { useState, useEffect } from 'react'
import { Card, Button, Modal, Form, InputNumber, Input, Table, Tag, Statistic, Row, Col, Divider, message, App, Spin } from 'antd'
import { ClockCircleOutlined, DollarOutlined, ShoppingCartOutlined, SwapOutlined, HistoryOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import './Shift.css'

const Shift = () => {
  const { user } = useAuthStore()
  const [activeShift, setActiveShift] = useState(null)
  const [loading, setLoading] = useState(false)
  const [startModalVisible, setStartModalVisible] = useState(false)
  const [endModalVisible, setEndModalVisible] = useState(false)
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [history, setHistory] = useState([])
  const [shiftSummary, setShiftSummary] = useState(null)
  const [startForm] = Form.useForm()
  const [endForm] = Form.useForm()
  const { message: msg } = App.useApp()

  const fetchActiveShift = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/system/shift/active?cashierId=${user.id}`)
      const data = await response.json()
      if (data.success) {
        setActiveShift(data.data)
      }
    } catch (error) {
      console.error('获取当前班次失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveShift()
  }, [user?.id])

  const handleStartShift = async () => {
    try {
      const values = await startForm.validateFields()
      const response = await fetch('http://localhost:3000/api/system/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: user.id,
          cashierName: user.name,
          startCash: values.startCash,
        }),
      })
      const data = await response.json()
      if (data.success) {
        msg.success('开班成功')
        setStartModalVisible(false)
        startForm.resetFields()
        fetchActiveShift()
      } else {
        msg.error(data.message || '开班失败')
      }
    } catch (error) {
      msg.error('开班失败')
    }
  }

  const handleEndShift = async () => {
    try {
      const values = await endForm.validateFields()
      const response = await fetch('http://localhost:3000/api/system/shift/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: user.id,
          endCash: values.endCash,
          notes: values.notes,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setShiftSummary(data.data)
        setEndModalVisible(false)
        endForm.resetFields()
        fetchActiveShift()
      } else {
        msg.error(data.message || '交接班失败')
      }
    } catch (error) {
      msg.error('交接班失败')
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/system/shift/history?cashierId=${user.id}&pageSize=50`)
      const data = await response.json()
      if (data.success) {
        setHistory(data.data.list)
        setHistoryModalVisible(true)
      }
    } catch (error) {
      msg.error('获取历史记录失败')
    }
  }

  const formatTime = (time) => {
    if (!time) return '-'
    return new Date(time).toLocaleString('zh-CN')
  }

  const columns = [
    { title: '开始时间', dataIndex: 'start_time', key: 'start_time', render: formatTime },
    { title: '结束时间', dataIndex: 'end_time', key: 'end_time', render: formatTime },
    { title: '起始现金', dataIndex: 'start_cash', key: 'start_cash', render: (v) => `¥${parseFloat(v || 0).toFixed(2)}` },
    { title: '结束现金', dataIndex: 'end_cash', key: 'end_cash', render: (v) => `¥${parseFloat(v || 0).toFixed(2)}` },
    { title: '销售总额', dataIndex: 'total_sales', key: 'total_sales', render: (v) => `¥${parseFloat(v || 0).toFixed(2)}` },
    { title: '交易笔数', dataIndex: 'transaction_count', key: 'transaction_count' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'active' ? 'green' : 'blue'}>{s === 'active' ? '进行中' : '已完成'}</Tag> },
  ]

  return (
    <div className="shift-page">
      <Spin spinning={loading}>
        <Card>
          {!activeShift ? (
            <div className="shift-empty">
              <ClockCircleOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <p>当前没有进行中的班次</p>
              <Button type="primary" size="large" onClick={() => setStartModalVisible(true)}>
                开班
              </Button>
            </div>
          ) : (
            <div className="shift-active">
              <div className="shift-header">
                <div className="shift-status">
                  <Tag color="green" style={{ fontSize: 16, padding: '4px 12px' }}>营业中</Tag>
                  <span className="shift-time">开始时间: {formatTime(activeShift.start_time)}</span>
                </div>
                <div className="shift-actions">
                  <Button icon={<HistoryOutlined />} onClick={fetchHistory}>历史记录</Button>
                  <Button type="primary" danger onClick={() => setEndModalVisible(true)}>
                    交接班
                  </Button>
                </div>
              </div>

              <Divider />

              <Row gutter={[24, 24]}>
                <Col span={6}>
                  <Statistic title="起始现金" value={activeShift.start_cash || 0} prefix="¥" precision={2} />
                </Col>
                <Col span={6}>
                  <Statistic title="收银员" value={activeShift.cashier_name} />
                </Col>
              </Row>
            </div>
          )}
        </Card>

        {shiftSummary && (
          <Card title="交接班汇总" style={{ marginTop: 24 }}>
            <Row gutter={[24, 24]}>
              <Col span={6}>
                <Statistic title="起始现金" value={shiftSummary.startCash} prefix="¥" precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="结束现金" value={shiftSummary.endCash} prefix="¥" precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="销售总额" value={shiftSummary.totalSales} prefix="¥" precision={2} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col span={6}>
                <Statistic title="交易笔数" value={shiftSummary.transactionCount} suffix="笔" />
              </Col>
            </Row>
            <Divider />
            <Row gutter={[24, 24]}>
              <Col span={4}>
                <Statistic title="现金" value={shiftSummary.cashSales} prefix="¥" precision={2} />
              </Col>
              <Col span={4}>
                <Statistic title="银行卡" value={shiftSummary.cardSales} prefix="¥" precision={2} />
              </Col>
              <Col span={4}>
                <Statistic title="微信" value={shiftSummary.wechatSales} prefix="¥" precision={2} />
              </Col>
              <Col span={4}>
                <Statistic title="支付宝" value={shiftSummary.alipaySales} prefix="¥" precision={2} />
              </Col>
              <Col span={4}>
                <Statistic title="会员余额" value={shiftSummary.memberBalanceSales} prefix="¥" precision={2} />
              </Col>
              <Col span={4}>
                <Statistic title="退款金额" value={shiftSummary.refundAmount} prefix="¥" precision={2} valueStyle={{ color: '#cf1322' }} />
              </Col>
            </Row>
            <Divider />
            <Row>
              <Col span={24}>
                <Statistic 
                  title="应交现金" 
                  value={(shiftSummary.startCash + shiftSummary.cashSales - shiftSummary.refundAmount)} 
                  prefix="¥" 
                  precision={2} 
                  valueStyle={{ fontSize: 32, color: '#1890ff' }}
                />
              </Col>
            </Row>
            <Button type="primary" style={{ marginTop: 24 }} onClick={() => setShiftSummary(null)}>
              确定
            </Button>
          </Card>
        )}
      </Spin>

      <Modal
        title="开班"
        open={startModalVisible}
        onOk={handleStartShift}
        onCancel={() => setStartModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={startForm} layout="vertical">
          <Form.Item name="startCash" label="起始现金" rules={[{ required: true, message: '请输入起始现金' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" placeholder="请输入钱箱起始金额" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="交接班"
        open={endModalVisible}
        onOk={handleEndShift}
        onCancel={() => setEndModalVisible(false)}
        okText="确定交接"
        cancelText="取消"
      >
        <Form form={endForm} layout="vertical">
          <Form.Item name="endCash" label="结束现金" rules={[{ required: true, message: '请输入结束现金' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" placeholder="请输入钱箱当前金额" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="可选填写交接班备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="交接班历史"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Table
          dataSource={history}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  )
}

export default Shift
