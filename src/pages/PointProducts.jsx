import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, App, Spin, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined } from '@ant-design/icons'
import './PointProducts.css'

const PointProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3000/api/points/products?all=true')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      message.error('获取积分商品失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingProduct(null)
    form.resetFields()
    form.setFieldsValue({ status: 'active', stock: 0 })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingProduct(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      pointsRequired: record.pointsRequired,
      stock: record.stock,
      status: record.status,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/api/points/products/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        message.success('删除成功')
        fetchProducts()
      } else {
        message.error(data.message || '删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingProduct) {
        const response = await fetch(`http://localhost:3000/api/points/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await response.json()
        if (data.success) {
          message.success('更新成功')
          setModalVisible(false)
          fetchProducts()
        } else {
          message.error(data.message || '更新失败')
        }
      } else {
        const response = await fetch('http://localhost:3000/api/points/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await response.json()
        if (data.success) {
          message.success('创建成功')
          setModalVisible(false)
          fetchProducts()
        } else {
          message.error(data.message || '创建失败')
        }
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (text) => text || '-',
    },
    {
      title: '所需积分',
      dataIndex: 'pointsRequired',
      key: 'pointsRequired',
      width: 120,
      render: (points) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
          <GiftOutlined /> {points}
        </span>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock) => (
        <Tag color={stock > 0 ? 'green' : 'red'}>{stock}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '上架' : '下架'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此商品？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="point-products-page">
      <Card
        title="积分商品管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增商品
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={products}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingProduct ? '编辑商品' : '新增商品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="商品名称"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="请输入商品名称" />
          </Form.Item>

          <Form.Item name="description" label="商品描述">
            <Input.TextArea placeholder="请输入商品描述" rows={3} />
          </Form.Item>

          <Form.Item
            name="pointsRequired"
            label="所需积分"
            rules={[{ required: true, message: '请输入所需积分' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入所需积分" />
          </Form.Item>

          <Form.Item
            name="stock"
            label="库存"
            rules={[{ required: true, message: '请输入库存' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入库存" />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="active">上架</Select.Option>
              <Select.Option value="inactive">下架</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PointProducts
