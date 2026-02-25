import { useState, useEffect } from 'react'
import { Table, Card, Tag, DatePicker, Space, Statistic, Row, Col, Modal, Descriptions, Divider, Spin, App, Button, Checkbox, Popconfirm } from 'antd'
import { getTransactions, getTransaction, refundTransaction } from '../services/transactionService'
import { ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import dayjs from 'dayjs'
import './Transactions.css'

const { RangePicker } = DatePicker

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [dateRange, setDateRange] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refundModalVisible, setRefundModalVisible] = useState(false)
  const [refundItems, setRefundItems] = useState([])
  const [refunding, setRefunding] = useState(false)
  const { message } = App.useApp()
  const { user } = useAuthStore()
  const canRefund = user?.permissions?.includes('refund')

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }
      
      const response = await getTransactions(params.startDate, params.endDate)
      if (response.success) {
        setTransactions(response.data)
      }
    } catch (error) {
      message.error('获取交易记录失败')
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [dateRange])

  const getPaymentMethodTag = (method) => {
    const colors = {
      cash: 'green',
      card: 'blue',
      wechat: 'cyan',
      alipay: 'gold',
      member_balance: 'purple',
    }
    const names = {
      cash: '现金',
      card: '银行卡',
      wechat: '微信支付',
      alipay: '支付宝',
      member_balance: '会员余额',
    }
    return <Tag color={colors[method]}>{names[method]}</Tag>
  }

  const getStatusTag = (status) => {
    const colors = {
      completed: 'success',
      refunded: 'error',
      partial_refund: 'warning',
    }
    const names = {
      completed: '已完成',
      refunded: '已退款',
      partial_refund: '部分退款',
    }
    return <Tag color={colors[status] || 'default'}>{names[status] || status}</Tag>
  }

  const handleViewDetail = async (transactionId) => {
    setLoading(true)
    try {
      const response = await getTransaction(transactionId)
      if (response.success) {
        setSelectedTransaction(response.data)
        setDetailModalVisible(true)
      }
    } catch (error) {
      message.error('获取交易详情失败')
      console.error('Failed to fetch transaction detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenRefund = () => {
    if (selectedTransaction?.items) {
      setRefundItems(selectedTransaction.items.map(item => ({
        ...item,
        checked: false,
        refundQuantity: 0
      })))
    }
    setDetailModalVisible(false)
    setRefundModalVisible(true)
  }

  const handleRefundItemChange = (productId, checked, quantity) => {
    setRefundItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          checked,
          refundQuantity: checked ? quantity : 0
        }
      }
      return item
    }))
  }

  const handleRefundQuantityChange = (productId, refundQuantity) => {
    setRefundItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const maxRefundable = item.quantity - (item.refundedQuantity || 0)
        return {
          ...item,
          refundQuantity: Math.min(Math.max(0, refundQuantity), maxRefundable)
        }
      }
      return item
    }))
  }

  const calculateRefundAmount = () => {
    return refundItems
      .filter(item => item.checked && item.refundQuantity > 0)
      .reduce((sum, item) => sum + (item.unitPrice || item.product?.price || 0) * item.refundQuantity, 0)
  }

  const handleConfirmRefund = async () => {
    const itemsToRefund = refundItems
      .filter(item => item.checked && item.refundQuantity > 0)
      .map(item => ({
        productId: item.product.id,
        quantity: item.refundQuantity
      }))

    if (itemsToRefund.length === 0) {
      message.warning('请选择要退款的商品')
      return
    }

    setRefunding(true)
    try {
      const response = await refundTransaction(selectedTransaction.id, itemsToRefund)
      if (response.success) {
        message.success('退款成功')
        setRefundModalVisible(false)
        fetchTransactions()
      }
    } catch (error) {
      message.error('退款失败')
      console.error('Refund failed:', error)
    } finally {
      setRefunding(false)
    }
  }

  const columns = [
    {
      title: '交易编号',
      dataIndex: 'id',
      key: 'id',
      width: 200,
    },
    {
      title: '商品数量',
      dataIndex: 'itemCount',
      key: 'itemCount',
    },
    {
      title: '总金额',
      key: 'total',
      render: (_, record) => {
        const total = record.total || record.totalAmount || 0
        return `¥${total.toFixed(2)}`
      },
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => getPaymentMethodTag(method),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status || 'completed'),
    },
    {
      title: '收银员',
      dataIndex: 'cashierName',
      key: 'cashierName',
    },
    {
      title: '交易时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => 
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <a onClick={() => handleViewDetail(record.id)}>查看详情</a>
      ),
    },
  ]

  const itemColumns = [
    {
      title: '商品名称',
      dataIndex: ['product', 'name'],
      key: 'name',
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price, record) => `¥${(price || record.product?.price || 0).toFixed(2)}`,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (subtotal) => `¥${subtotal.toFixed(2)}`,
    },
  ]

  const refundColumns = [
    {
      title: '选择',
      width: 60,
      render: (_, record) => {
        const maxRefundable = record.quantity - (record.refundedQuantity || 0)
        return (
          <Checkbox 
            checked={record.checked}
            onChange={(e) => handleRefundItemChange(record.product.id, e.target.checked, maxRefundable)}
            disabled={maxRefundable <= 0}
          />
        )
      },
    },
    {
      title: '商品名称',
      dataIndex: ['product', 'name'],
      key: 'name',
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price, record) => `¥${(price || record.product?.price || 0).toFixed(2)}`,
    },
    {
      title: '购买数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '已退款',
      dataIndex: 'refundedQuantity',
      key: 'refundedQuantity',
      render: (qty) => qty ? <span style={{ color: '#cf1322' }}>{qty}</span> : 0,
    },
    {
      title: '可退款',
      key: 'refundable',
      render: (_, record) => {
        const maxRefundable = record.quantity - (record.refundedQuantity || 0)
        return <span style={{ color: maxRefundable > 0 ? '#52c41a' : '#999' }}>{maxRefundable}</span>
      },
    },
    {
      title: '退款数量',
      key: 'refundQuantity',
      width: 120,
      render: (_, record) => {
        const maxRefundable = record.quantity - (record.refundedQuantity || 0)
        return (
          <input
            type="number"
            min={0}
            max={maxRefundable}
            value={record.refundQuantity}
            onChange={(e) => handleRefundQuantityChange(record.product.id, parseInt(e.target.value) || 0)}
            className="refund-qty-input"
            disabled={!record.checked || maxRefundable <= 0}
          />
        )
      },
    },
  ]

  const totalAmount = transactions.reduce((sum, t) => sum + (t.total || t.totalAmount || 0), 0)

  return (
    <div className="transactions-page">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="交易笔数"
              value={transactions.length}
              suffix="笔"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="交易总额"
              value={totalAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="平均交易额"
              value={transactions.length > 0 ? totalAmount / transactions.length : 0}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="交易记录"
        extra={
          <Space>
            <RangePicker
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]])
                } else {
                  setDateRange(null)
                }
              }}
            />
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={transactions}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="交易详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          canRefund && selectedTransaction?.status !== 'refunded' ? (
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleOpenRefund}>
              退款
            </Button>
          ) : null
        }
        width={800}
      >
        {selectedTransaction && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="交易编号">{selectedTransaction.id}</Descriptions.Item>
              <Descriptions.Item label="交易时间">{selectedTransaction.createdAt}</Descriptions.Item>
              <Descriptions.Item label="收银员">{selectedTransaction.cashierName}</Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {getPaymentMethodTag(selectedTransaction.paymentMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedTransaction.status || 'completed')}
              </Descriptions.Item>
              <Descriptions.Item label="商品数量">
                {selectedTransaction.items ? selectedTransaction.items.reduce((sum, item) => sum + item.quantity, 0) : 0} 件
              </Descriptions.Item>
              {selectedTransaction.discount > 0 && (
                <>
                  <Descriptions.Item label="折扣">
                    {selectedTransaction.discountType === 'percent' 
                      ? `${selectedTransaction.discount}%` 
                      : `¥${selectedTransaction.discount}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="商品金额">
                    ¥{selectedTransaction.subtotal?.toFixed(2) || '0.00'}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="交易总额" span={selectedTransaction.discount > 0 ? 1 : 2}>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: '#6366f1' }}>
                  ¥{((selectedTransaction.total || selectedTransaction.totalAmount || 0)).toFixed(2)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">商品明细</Divider>
            
            {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
              <Table
                dataSource={selectedTransaction.items}
                columns={itemColumns}
                pagination={false}
                rowKey={(record) => record.product.id}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3} align="right">
                      <strong>合计：</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong style={{ color: '#6366f1' }}>
                        ¥{((selectedTransaction.total || selectedTransaction.totalAmount || 0)).toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                暂无商品明细
              </div>
            )}

            {selectedTransaction.refunds && selectedTransaction.refunds.length > 0 && (
              <>
                <Divider orientation="left">退款记录</Divider>
                <div style={{ marginBottom: 16 }}>
                  {selectedTransaction.refunds.map((refund, index) => (
                    <div key={refund.id} style={{ 
                      padding: '12px 16px', 
                      background: '#fff1f0', 
                      borderRadius: 8, 
                      marginBottom: 8,
                      border: '1px solid #ffa39e'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                            <Tag color="red">退款 #{index + 1}</Tag>
                            <span style={{ color: '#666', marginLeft: 8 }}>
                              {refund.createdAt}
                            </span>
                          </span>
                        <span style={{ color: '#cf1322', fontWeight: 600, fontSize: 16 }}>
                          -¥{refund.amount.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, color: '#666', fontSize: 13 }}>
                        退款商品：{refund.items.map(item => `${item.productId.slice(0, 8)}... x${item.quantity}`).join('、')}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#f6ffed', 
                  borderRadius: 8,
                  border: '1px solid #b7eb8f',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 500 }}>实收金额：</span>
                  <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 18 }}>
                    ¥{((selectedTransaction.total || selectedTransaction.totalAmount || 0) - (selectedTransaction.totalRefunded || 0)).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="商品退款"
        open={refundModalVisible}
        onCancel={() => setRefundModalVisible(false)}
        onOk={handleConfirmRefund}
        okText="确认退款"
        cancelText="取消"
        confirmLoading={refunding}
        width={700}
      >
        <div className="refund-modal-content">
          <div className="refund-info">
            <span>交易编号：</span>
            <code>{selectedTransaction?.id}</code>
          </div>
          
          <Table
            dataSource={refundItems}
            columns={refundColumns}
            pagination={false}
            rowKey={(record) => record.product.id}
            style={{ marginTop: 16 }}
          />
          
          <div className="refund-summary">
            <span>退款金额：</span>
            <span className="refund-amount">¥{calculateRefundAmount().toFixed(2)}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Transactions
