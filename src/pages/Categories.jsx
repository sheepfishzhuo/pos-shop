import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  App,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Spin,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService'
import dayjs from 'dayjs'

const Categories = () => {
  const [categories, setCategories] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await getCategories()
      if (response.success) {
        setCategories(response.data)
      }
    } catch (error) {
      message.error('获取分类列表失败')
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleAdd = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingCategory(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      const response = await deleteCategory(id)
      if (response.success) {
        message.success('删除成功')
        fetchCategories()
      }
    } catch (error) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('删除失败')
      }
      console.error('Failed to delete category:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingCategory) {
        const response = await updateCategory(editingCategory.id, values)
        if (response.success) {
          message.success('更新成功')
          setModalVisible(false)
          form.resetFields()
          fetchCategories()
        }
      } else {
        const response = await createCategory(values)
        if (response.success) {
          message.success('添加成功')
          setModalVisible(false)
          form.resetFields()
          fetchCategories()
        }
      }
    } catch (error) {
      message.error('操作失败')
      console.error('Failed to save category:', error)
    }
  }

  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Space>
          <AppstoreOutlined />
          <strong>{name}</strong>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '商品数量',
      dataIndex: 'productCount',
      key: 'productCount',
      render: (count) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count} 种
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此分类吗？"
            description={record.productCount > 0 ? '该分类下还有商品，无法删除' : '删除后无法恢复'}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.productCount > 0}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              disabled={record.productCount > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const totalCategories = categories.length
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0)

  return (
    <div className="categories-page">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="分类总数"
              value={totalCategories}
              suffix="个"
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="商品总数"
              value={totalProducts}
              suffix="种"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="分类列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加分类
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={categories}
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
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 20, message: '分类名称不能超过20个字符' },
            ]}
          >
            <Input placeholder="请输入分类名称" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 100, message: '描述不能超过100个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入分类描述"
              rows={3}
              maxLength={100}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Categories
