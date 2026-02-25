import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  App,
  Popconfirm,
  Spin,
  Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, AppstoreOutlined, FireOutlined } from '@ant-design/icons'
import { getProducts, createProduct, updateProduct, deleteProduct, setProductHot } from '../services/productService'
import { getCategories } from '../services/categoryService'
import dayjs from 'dayjs'
import './Products.css'

const Products = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await getProducts(searchText)
      if (response.success) {
        setProducts(response.data)
      }
    } catch (error) {
      message.error('获取商品列表失败')
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await getCategories()
      if (response.success) {
        setCategories(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [searchText])

  const handleAdd = () => {
    setEditingProduct(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingProduct(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      const response = await deleteProduct(id)
      if (response.success) {
        message.success('删除成功')
        fetchProducts()
      }
    } catch (error) {
      message.error('删除失败')
      console.error('Failed to delete product:', error)
    }
  }

  const handleToggleHot = async (id, isHot) => {
    try {
      const response = await setProductHot(id, isHot)
      if (response.success) {
        message.success(response.message)
        fetchProducts()
      }
    } catch (error) {
      message.error('操作失败')
      console.error('Failed to toggle hot:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingProduct) {
        const response = await updateProduct(editingProduct.id, {
          ...values,
          updatedAt: dayjs().format('YYYY-MM-DD'),
        })
        if (response.success) {
          message.success('更新成功')
          setModalVisible(false)
          form.resetFields()
          fetchProducts()
        }
      } else {
        const response = await createProduct(values)
        if (response.success) {
          message.success('添加成功')
          setModalVisible(false)
          form.resetFields()
          fetchProducts()
        }
      }
    } catch (error) {
      message.error('操作失败')
      console.error('Failed to save product:', error)
    }
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : categoryId
  }

  const columns = [
    {
      title: '条码',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 180,
      render: (barcode) => <code className="barcode">{barcode}</code>,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (name, record) => (
        <span className="product-name">
          {name}
          {record.isHot && <FireOutlined style={{ color: '#ff4d4f', marginLeft: 6 }} />}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: 100,
      render: (categoryId) => {
        const categoryName = getCategoryName(categoryId)
        return <Tag color="blue">{categoryName}</Tag>
      },
    },
    {
      title: '售价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price) => <span className="price">¥{price.toFixed(2)}</span>,
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      render: (cost) => <span className="cost">¥{cost.toFixed(2)}</span>,
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock, record) => (
        <Tag color={stock <= record.minStock ? 'red' : 'green'}>
          {stock} {record.unit}
        </Tag>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <button 
            className={`action-btn ${record.isHot ? 'hot' : ''}`} 
            onClick={() => handleToggleHot(record.id, !record.isHot)}
            title={record.isHot ? '取消热门' : '设为热门'}
          >
            <FireOutlined />
          </button>
          <button className="action-btn edit" onClick={() => handleEdit(record)}>
            <EditOutlined />
          </button>
          <Popconfirm
            title="确定删除此商品吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <button className="action-btn delete">
              <DeleteOutlined />
            </button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="products-page">
      <Card className="page-card">
        <div className="page-toolbar">
          <div className="toolbar-left">
            <div className="page-title">
              <AppstoreOutlined className="title-icon" />
              <span>商品管理</span>
            </div>
            <Input
              placeholder="搜索商品名称、条码..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
              allowClear
            />
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">
            添加商品
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            dataSource={products}
            columns={columns}
            rowKey="id"
            scroll={{ x: 1100 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
        okText="确定"
        cancelText="取消"
        className="product-modal"
      >
        <Form form={form} layout="vertical" className="product-form">
          <div className="form-row">
            <Form.Item
              name="barcode"
              label="商品条码"
              rules={[{ required: true, message: '请输入商品条码' }]}
            >
              <Input placeholder="请输入商品条码" />
            </Form.Item>
            <Form.Item
              name="name"
              label="商品名称"
              rules={[{ required: true, message: '请输入商品名称' }]}
            >
              <Input placeholder="请输入商品名称" />
            </Form.Item>
          </div>

          <div className="form-row">
            <Form.Item
              name="categoryId"
              label="商品分类"
              rules={[{ required: true, message: '请选择商品分类' }]}
            >
              <Select placeholder="请选择商品分类" loading={categories.length === 0}>
                {categories.map(category => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="unit"
              label="单位"
              rules={[{ required: true, message: '请输入单位' }]}
            >
              <Input placeholder="请输入单位" />
            </Form.Item>
          </div>

          <div className="form-row">
            <Form.Item
              name="price"
              label="售价"
              rules={[{ required: true, message: '请输入售价' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入售价"
                prefix="¥"
              />
            </Form.Item>
            <Form.Item
              name="cost"
              label="成本"
              rules={[{ required: true, message: '请输入成本' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入成本"
                prefix="¥"
              />
            </Form.Item>
          </div>

          <div className="form-row">
            <Form.Item
              name="stock"
              label="库存数量"
              rules={[{ required: true, message: '请输入库存数量' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入库存数量" />
            </Form.Item>
            <Form.Item
              name="minStock"
              label="最低库存预警"
              rules={[{ required: true, message: '请输入最低库存预警' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入最低库存预警" />
            </Form.Item>
          </div>

          <Form.Item
            name="supplier"
            label="供应商"
            rules={[{ required: true, message: '请输入供应商' }]}
          >
            <Input placeholder="请输入供应商" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Products
