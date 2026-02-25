import { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Statistic,
  Row,
  Col,
  Descriptions,
  Divider,
  Tabs,
  App,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  PhoneOutlined,
  CrownOutlined,
  WalletOutlined,
  GiftOutlined,
} from '@ant-design/icons'
import { getMembers, getMember, createMember, updateMember, rechargeMember, adjustMemberPoints } from '../services/memberService'
import { useAuthStore } from '../stores/authStore'
import dayjs from 'dayjs'

const Members = () => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [levelFilter, setLevelFilter] = useState()
  const [statusFilter, setStatusFilter] = useState()
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false)
  const [pointsModalVisible, setPointsModalVisible] = useState(false)
  const [exchangeModalVisible, setExchangeModalVisible] = useState(false)
  const [pointProducts, setPointProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [exchanging, setExchanging] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [form] = Form.useForm()
  const [rechargeForm] = Form.useForm()
  const [pointsForm] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const response = await getMembers({
        search: searchText,
        level: levelFilter,
        status: statusFilter,
      })
      if (response.success) {
        setMembers(response.data)
      }
    } catch (error) {
      message.error('获取会员列表失败')
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [searchText, levelFilter, statusFilter])

  const handleViewDetail = async (memberId) => {
    setLoading(true)
    try {
      const response = await getMember(memberId)
      if (response.success) {
        setSelectedMember(response.data)
        setDetailModalVisible(true)
      }
    } catch (error) {
      message.error('获取会员详情失败')
      console.error('Failed to fetch member detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (member) => {
    setEditingMember(member)
    form.setFieldsValue({
      name: member.name,
      phone: member.phone,
      email: member.email,
      gender: member.gender,
      birthday: member.birthday ? dayjs(member.birthday) : null,
      level: member.level,
      status: member.status,
    })
    setEditModalVisible(true)
  }

  const handleUpdateMember = async () => {
    try {
      const values = await form.validateFields()
      if (!editingMember) return

      const response = await updateMember(editingMember.id, {
        ...values,
        birthday: values.birthday?.format('YYYY-MM-DD'),
      })

      if (response.success) {
        message.success('会员信息更新成功')
        setEditModalVisible(false)
        form.resetFields()
        fetchMembers()
      }
    } catch (error) {
      message.error('更新失败')
      console.error('Failed to update member:', error)
    }
  }

  const handleCreateMember = async () => {
    try {
      const values = await form.validateFields()
      
      const response = await createMember({
        ...values,
        birthday: values.birthday?.format('YYYY-MM-DD'),
      })

      if (response.success) {
        message.success('会员创建成功')
        setEditModalVisible(false)
        form.resetFields()
        fetchMembers()
      }
    } catch (error) {
      message.error('创建失败')
      console.error('Failed to create member:', error)
    }
  }

  const handleRecharge = (member) => {
    setEditingMember(member)
    rechargeForm.resetFields()
    setRechargeModalVisible(true)
  }

  const handleRechargeSubmit = async () => {
    try {
      const values = await rechargeForm.validateFields()
      if (!editingMember || !user) return

      const response = await rechargeMember(editingMember.id, {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        operatorId: user.id,
        remark: values.remark,
      })

      if (response.success) {
        message.success(`充值成功！余额：${response.data.previousBalance} → ${response.data.newBalance}`)
        setRechargeModalVisible(false)
        rechargeForm.resetFields()
        fetchMembers()
      }
    } catch (error) {
      message.error('充值失败')
      console.error('Failed to recharge:', error)
    }
  }

  const handlePoints = (member) => {
    setEditingMember(member)
    pointsForm.resetFields()
    setPointsModalVisible(true)
  }

  const handlePointsSubmit = async () => {
    try {
      const values = await pointsForm.validateFields()
      if (!editingMember || !user) return

      const response = await adjustMemberPoints(editingMember.id, {
        type: values.type,
        points: values.points,
        source: values.source,
        operatorId: user.id,
        remark: values.remark,
      })

      if (response.success) {
        message.success(`积分操作成功！积分：${response.data.previousPoints} → ${response.data.newPoints}`)
        setPointsModalVisible(false)
        pointsForm.resetFields()
        fetchMembers()
      }
    } catch (error) {
      message.error('积分操作失败')
      console.error('Failed to adjust points:', error)
    }
  }

  const fetchPointProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/points/products')
      const data = await response.json()
      if (data.success) {
        setPointProducts(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch point products:', error)
    }
  }

  const handleExchange = (member) => {
    setEditingMember(member)
    setSelectedProduct(null)
    fetchPointProducts()
    setExchangeModalVisible(true)
  }

  const handleExchangeSubmit = async () => {
    if (!selectedProduct || !editingMember) {
      message.warning('请选择要兑换的商品')
      return
    }

    setExchanging(true)
    try {
      const response = await fetch('http://localhost:3000/api/points/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: editingMember.id,
          pointProductId: selectedProduct.id,
          quantity: 1,
        }),
      })
      const data = await response.json()
      if (data.success) {
        message.success(`兑换成功！消耗 ${data.data.pointsUsed} 积分，剩余 ${data.data.remainingPoints} 积分`)
        setExchangeModalVisible(false)
        fetchMembers()
      } else {
        message.error(data.message || '兑换失败')
      }
    } catch (error) {
      message.error('兑换失败')
    } finally {
      setExchanging(false)
    }
  }

  const getLevelTag = (level) => {
    const config = {
      normal: { color: 'default', text: '普通会员' },
      silver: { color: 'silver', text: '银卡会员' },
      gold: { color: 'gold', text: '金卡会员' },
      platinum: { color: 'purple', text: '白金会员' },
    }
    const { color, text } = config[level] || config.normal
    return <Tag color={color}>{text}</Tag>
  }

  const columns = [
    {
      title: '会员编号',
      dataIndex: 'member_no',
      key: 'member_no',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level) => getLevelTag(level),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      render: (points) => <span style={{ color: '#1890ff' }}>{points}</span>,
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 100,
      render: (balance) => `¥${parseFloat(balance).toFixed(2)}`,
    },
    {
      title: '累计消费',
      dataIndex: 'total_spent',
      key: 'total_spent',
      width: 100,
      render: (total) => `¥${parseFloat(total).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 280,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => handleRecharge(record)}>
            充值
          </Button>
          <Button type="link" size="small" onClick={() => handlePoints(record)}>
            积分
          </Button>
          <Button type="link" size="small" onClick={() => handleExchange(record)}>
            兑换
          </Button>
        </Space>
      ),
    },
  ]

  const totalMembers = members.length
  const activeMembers = members.filter(m => m.status === 'active').length
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0)
  const totalBalance = members.reduce((sum, m) => sum + parseFloat(String(m.balance)), 0)

  return (
    <div className="members-page">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="会员总数" value={totalMembers} suffix="人" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃会员" value={activeMembers} suffix="人" valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总积分" value={totalPoints} prefix={<CrownOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总余额" value={totalBalance} precision={2} prefix="¥" />
          </Card>
        </Col>
      </Row>

      <Card
        title="会员管理"
        extra={
          <Space>
            <Input
              placeholder="搜索会员编号/姓名/手机号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="会员等级"
              style={{ width: 120 }}
              value={levelFilter}
              onChange={setLevelFilter}
              allowClear
            >
              <Select.Option value="normal">普通会员</Select.Option>
              <Select.Option value="silver">银卡会员</Select.Option>
              <Select.Option value="gold">金卡会员</Select.Option>
              <Select.Option value="platinum">白金会员</Select.Option>
            </Select>
            <Select
              placeholder="状态"
              style={{ width: 100 }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingMember(null)
                form.resetFields()
                setEditModalVisible(true)
              }}
            >
              新增会员
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={members}
            columns={columns}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="会员详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedMember && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="会员编号">{selectedMember.member_no}</Descriptions.Item>
                    <Descriptions.Item label="姓名">{selectedMember.name}</Descriptions.Item>
                    <Descriptions.Item label="手机号">{selectedMember.phone}</Descriptions.Item>
                    <Descriptions.Item label="邮箱">{selectedMember.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="性别">
                      {selectedMember.gender === 'male' ? '男' : selectedMember.gender === 'female' ? '女' : '其他'}
                    </Descriptions.Item>
                    <Descriptions.Item label="生日">{selectedMember.birthday || '-'}</Descriptions.Item>
                    <Descriptions.Item label="会员等级">{getLevelTag(selectedMember.level)}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={selectedMember.status === 'active' ? 'green' : 'red'}>
                        {selectedMember.status === 'active' ? '正常' : '停用'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="积分">
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedMember.points}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="余额">
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                        ¥{parseFloat(selectedMember.balance).toFixed(2)}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="累计消费" span={2}>
                      ¥{parseFloat(selectedMember.total_spent).toFixed(2)}
                    </Descriptions.Item>
                    <Descriptions.Item label="注册时间" span={2}>
                      {dayjs(selectedMember.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'points',
                label: '积分记录',
                children: (
                  <Table
                    dataSource={selectedMember.pointsHistory}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '类型', dataIndex: 'type', render: (type) => type === 'earn' ? '获得' : type === 'redeem' ? '兑换' : '调整' },
                      { title: '积分', dataIndex: 'points' },
                      { title: '余额', dataIndex: 'balance' },
                      { title: '来源', dataIndex: 'source' },
                      { title: '时间', dataIndex: 'created_at', render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm') },
                    ]}
                  />
                ),
              },
              {
                key: 'recharge',
                label: '充值记录',
                children: (
                  <Table
                    dataSource={selectedMember.rechargeHistory}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '金额', dataIndex: 'amount', render: (amount) => `¥${parseFloat(amount).toFixed(2)}` },
                      { title: '支付方式', dataIndex: 'payment_method' },
                      { title: '备注', dataIndex: 'remark' },
                      { title: '时间', dataIndex: 'created_at', render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm') },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        title={editingMember ? '编辑会员' : '新增会员'}
        open={editModalVisible}
        onOk={editingMember ? handleUpdateMember : handleCreateMember}
        onCancel={() => {
          setEditModalVisible(false)
          form.resetFields()
        }}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" prefix={<PhoneOutlined />} />
          </Form.Item>

          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" type="email" />
          </Form.Item>

          <Form.Item name="gender" label="性别">
            <Select placeholder="请选择性别">
              <Select.Option value="male">男</Select.Option>
              <Select.Option value="female">女</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="birthday" label="生日">
            <DatePicker style={{ width: '100%' }} placeholder="请选择生日" />
          </Form.Item>

          <Form.Item name="level" label="会员等级">
            <Select placeholder="请选择会员等级">
              <Select.Option value="normal">普通会员</Select.Option>
              <Select.Option value="silver">银卡会员</Select.Option>
              <Select.Option value="gold">金卡会员</Select.Option>
              <Select.Option value="platinum">白金会员</Select.Option>
            </Select>
          </Form.Item>

          {editingMember && (
            <Form.Item name="status" label="状态">
              <Select placeholder="请选择状态">
                <Select.Option value="active">正常</Select.Option>
                <Select.Option value="inactive">停用</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="会员充值"
        open={rechargeModalVisible}
        onOk={handleRechargeSubmit}
        onCancel={() => {
          setRechargeModalVisible(false)
          rechargeForm.resetFields()
        }}
        okText="确认充值"
        cancelText="取消"
      >
        {editingMember && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>会员：</strong>{editingMember.name} ({editingMember.member_no})</p>
            <p><strong>当前余额：</strong>¥{parseFloat(editingMember.balance).toFixed(2)}</p>
          </div>
        )}
        <Form form={rechargeForm} layout="vertical">
          <Form.Item
            name="amount"
            label="充值金额"
            rules={[{ required: true, message: '请输入充值金额' }]}
          >
            <Input prefix="¥" type="number" placeholder="请输入充值金额" />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="支付方式"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select placeholder="请选择支付方式">
              <Select.Option value="cash">现金</Select.Option>
              <Select.Option value="wechat">微信</Select.Option>
              <Select.Option value="alipay">支付宝</Select.Option>
              <Select.Option value="card">银行卡</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="积分操作"
        open={pointsModalVisible}
        onOk={handlePointsSubmit}
        onCancel={() => {
          setPointsModalVisible(false)
          pointsForm.resetFields()
        }}
        okText="确认"
        cancelText="取消"
      >
        {editingMember && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>会员：</strong>{editingMember.name} ({editingMember.member_no})</p>
            <p><strong>当前积分：</strong>{editingMember.points}</p>
          </div>
        )}
        <Form form={pointsForm} layout="vertical">
          <Form.Item
            name="type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Select.Option value="earn">获得积分</Select.Option>
              <Select.Option value="redeem">兑换积分</Select.Option>
              <Select.Option value="adjust">调整积分</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="points"
            label="积分数量"
            rules={[{ required: true, message: '请输入积分数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入积分数量" />
          </Form.Item>

          <Form.Item name="source" label="来源">
            <Input placeholder="请输入来源" />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="积分兑换"
        open={exchangeModalVisible}
        onOk={handleExchangeSubmit}
        onCancel={() => {
          setExchangeModalVisible(false)
          setSelectedProduct(null)
        }}
        okText="确认兑换"
        cancelText="取消"
        confirmLoading={exchanging}
        width={600}
      >
        {editingMember && (
          <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <p style={{ margin: 0 }}><strong>会员：</strong>{editingMember.name} ({editingMember.member_no})</p>
            <p style={{ margin: '8px 0 0 0' }}><strong>当前积分：</strong><span style={{ color: '#1890ff', fontSize: 18 }}>{editingMember.points}</span></p>
          </div>
        )}
        <div className="point-products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {pointProducts.map(product => (
            <div
              key={product.id}
              onClick={() => product.stock > 0 && setSelectedProduct(product)}
              style={{
                padding: 16,
                border: selectedProduct?.id === product.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: 8,
                cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                opacity: product.stock > 0 ? 1 : 0.5,
                background: selectedProduct?.id === product.id ? '#e6f7ff' : '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{product.name}</div>
              <div style={{ color: '#ff4d4f', fontSize: 16, marginBottom: 4 }}>
                <GiftOutlined /> {product.pointsRequired} 积分
              </div>
              <div style={{ color: '#999', fontSize: 12 }}>
                库存: {product.stock}
              </div>
              {product.description && (
                <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                  {product.description}
                </div>
              )}
            </div>
          ))}
        </div>
        {pointProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无可兑换商品
          </div>
        )}
        {selectedProduct && (
          <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 8 }}>
            <span>将消耗 </span>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{selectedProduct.pointsRequired}</span>
            <span> 积分，兑换后剩余 </span>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{editingMember.points - selectedProduct.pointsRequired}</span>
            <span> 积分</span>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Members
