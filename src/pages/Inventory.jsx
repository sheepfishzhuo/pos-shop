import { useState, useEffect } from 'react'
import { Table, Card, Tag, Alert, Statistic, Row, Col, Progress, Button, Modal, Form, InputNumber, Select, Space, App, Spin } from 'antd'
import { WarningOutlined, CheckCircleOutlined, PlusOutlined, MinusOutlined, EditOutlined } from '@ant-design/icons'
import { getInventoryStatus, getInventorySummary, adjustInventory } from '../services/inventoryService'
import { useAuthStore } from '../stores/authStore'

const Inventory = () => {
  const [inventoryData, setInventoryData] = useState([])
  const [summary, setSummary] = useState(null)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [adjustModalVisible, setAdjustModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [adjustType, setAdjustType] = useState('in')
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()

  const fetchInventoryData = async () => {
    setLoading(true)
    try {
      const [statusResponse, summaryResponse] = await Promise.all([
        getInventoryStatus(),
        getInventorySummary()
      ])
      
      if (statusResponse.success) {
        setInventoryData(statusResponse.data)
        const lowStock = statusResponse.data.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock')
        setLowStockProducts(lowStock)
      }
      
      if (summaryResponse.success) {
        setSummary(summaryResponse.data)
      }
    } catch (error) {
      message.error('获取库存数据失败')
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryData()
  }, [])

  const handleAdjustStock = (product, type) => {
    setSelectedProduct(product)
    setAdjustType(type)
    form.resetFields()
    setAdjustModalVisible(true)
  }

  const handleSubmitAdjust = async () => {
    try {
      const values = await form.validateFields()
      
      if (!selectedProduct || !user) return

      const response = await adjustInventory({
        productId: selectedProduct.id,
        type: adjustType,
        quantity: values.quantity,
        reason: values.reason,
        operatorId: user.id
      })

      if (response.success) {
        const actionText = adjustType === 'in' ? '入库' : adjustType === 'out' ? '出库' : '调整'
        message.success(`${actionText}成功！${response.data.previousStock} → ${response.data.newStock}`)
        setAdjustModalVisible(false)
        form.resetFields()
        fetchInventoryData()
      }
    } catch (error) {
      message.error('操作失败')
      console.error('Failed to adjust inventory:', error)
    }
  }

  const columns = [
    {
      title: '商品条码',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 150,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      key: 'category_name',
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '当前库存',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock, record) => (
        <div>
          <Progress
            percent={(stock / (record.min_stock * 3)) * 100}
            size="small"
            status={stock <= record.min_stock ? 'exception' : 'active'}
            format={() => `${stock} ${record.unit}`}
          />
        </div>
      ),
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock',
      render: (minStock, record) => `${minStock} ${record.unit}`,
    },
    {
      title: '库存状态',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'out_of_stock') {
          return <Tag color="red" icon={<WarningOutlined />}>缺货</Tag>
        } else if (record.status === 'low_stock') {
          return <Tag color="orange" icon={<WarningOutlined />}>库存不足</Tag>
        }
        return <Tag color="green" icon={<CheckCircleOutlined />}>库存充足</Tag>
      },
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAdjustStock(record, 'in')}
          >
            入库
          </Button>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() => handleAdjustStock(record, 'out')}
            disabled={record.stock <= 0}
          >
            出库
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleAdjustStock(record, 'adjustment')}
          >
            调整
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="inventory-page">
      {lowStockProducts.length > 0 && (
        <Alert
          message="库存预警"
          description={`有 ${lowStockProducts.length} 种商品库存不足，请及时补货`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="商品种类"
              value={summary?.totalProducts || 0}
              suffix="种"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总量"
              value={summary?.totalStock || 0}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总值"
              value={summary?.totalValue || 0}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存不足"
              value={summary?.lowStockCount || 0}
              suffix="种"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="库存详情">
        <Spin spinning={loading}>
          <Table
            dataSource={inventoryData}
            columns={columns}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={
          adjustType === 'in' ? '商品入库' : 
          adjustType === 'out' ? '商品出库' : '库存调整'
        }
        open={adjustModalVisible}
        onOk={handleSubmitAdjust}
        onCancel={() => {
          setAdjustModalVisible(false)
          form.resetFields()
        }}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="商品名称">
            <InputNumber value={selectedProduct?.name} disabled style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item label="当前库存">
            <InputNumber 
              value={`${selectedProduct?.stock} ${selectedProduct?.unit}`} 
              disabled 
              style={{ width: '100%' }} 
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label={adjustType === 'adjustment' ? '调整后库存' : '数量'}
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber
              min={adjustType === 'adjustment' ? 0 : 1}
              max={adjustType === 'out' ? selectedProduct?.stock : undefined}
              style={{ width: '100%' }}
              placeholder={adjustType === 'adjustment' ? '请输入调整后的库存数量' : '请输入数量'}
            />
          </Form.Item>

          <Form.Item name="reason" label="备注">
            <Select placeholder="请选择或输入备注">
              <Select.Option value="采购入库">采购入库</Select.Option>
              <Select.Option value="退货出库">退货出库</Select.Option>
              <Select.Option value="盘点调整">盘点调整</Select.Option>
              <Select.Option value="损耗">损耗</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Inventory
