import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Space, Tag, Tabs, App, Spin, Switch, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined, TagOutlined, ShoppingCartOutlined, DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import './Promotions.css'

const { RangePicker } = DatePicker

const Promotions = () => {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState(null)
  const [activeTab, setActiveTab] = useState('full_reduction')
  const [products, setProducts] = useState([])
  const [form] = Form.useForm()
  const { message } = App.useApp()

  useEffect(() => {
    fetchPromotions()
    fetchProducts()
  }, [])

  const fetchPromotions = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3000/api/promotions')
      const data = await response.json()
      if (data.success) {
        setPromotions(data.data)
      }
    } catch (error) {
      message.error('获取促销活动失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('获取商品失败:', error)
    }
  }

  const handleAdd = (type) => {
    setActiveTab(type)
    setEditingPromotion(null)
    form.resetFields()
    form.setFieldsValue({ type, status: 'active' })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setActiveTab(record.type)
    setEditingPromotion(record)
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      timeRange: [dayjs(record.startTime), dayjs(record.endTime)],
      status: record.status,
      rules: record.rules || [],
      products: record.products || [],
      combos: record.combos || [],
      coupons: record.coupons || [],
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/api/promotions/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        message.success('删除成功')
        fetchPromotions()
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
      const [startTime, endTime] = values.timeRange || []

      const payload = {
        name: values.name,
        type: values.type,
        description: values.description,
        startTime: startTime.format('YYYY-MM-DD HH:mm:ss'),
        endTime: endTime.format('YYYY-MM-DD HH:mm:ss'),
        status: values.status,
        rules: values.rules,
        products: values.products,
        combos: values.combos,
        coupons: values.coupons,
      }

      if (editingPromotion) {
        const response = await fetch(`http://localhost:3000/api/promotions/${editingPromotion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.success) {
          message.success('更新成功')
          setModalVisible(false)
          fetchPromotions()
        } else {
          message.error(data.message || '更新失败')
        }
      } else {
        const response = await fetch('http://localhost:3000/api/promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.success) {
          message.success('创建成功')
          setModalVisible(false)
          fetchPromotions()
        } else {
          message.error(data.message || '创建失败')
        }
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const getTypeTag = (type) => {
    const config = {
      full_reduction: { color: 'orange', icon: <GiftOutlined />, text: '满减' },
      special: { color: 'red', icon: <TagOutlined />, text: '特价' },
      combo: { color: 'blue', icon: <ShoppingCartOutlined />, text: '套餐' },
      coupon: { color: 'green', icon: <DollarOutlined />, text: '优惠券' },
    }
    const c = config[type]
    return <Tag color={c.color} icon={c.icon}>{c.text}</Tag>
  }

  const columns = [
    { title: '活动名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: getTypeTag },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '有效期',
      key: 'time',
      render: (_, r) => `${dayjs(r.startTime).format('MM-DD HH:mm')} 至 ${dayjs(r.endTime).format('MM-DD HH:mm')}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="promotions-page">
      <Card title="促销活动">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(activeTab)}>
              新建活动
            </Button>
          }
          items={[
            { key: 'full_reduction', label: '满减活动', icon: <GiftOutlined /> },
            { key: 'special', label: '特价商品', icon: <TagOutlined /> },
            { key: 'combo', label: '组合套餐', icon: <ShoppingCartOutlined /> },
            { key: 'coupon', label: '优惠券', icon: <DollarOutlined /> },
          ].map(item => ({
            key: item.key,
            label: <span>{item.icon} {item.label}</span>,
          }))}
        />

        <Spin spinning={loading}>
          <Table
            dataSource={promotions.filter(p => p.type === activeTab)}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingPromotion ? '编辑活动' : '新建活动'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="活动名称" rules={[{ required: true }]}>
            <Input placeholder="请输入活动名称" />
          </Form.Item>
          <Form.Item name="type" label="活动类型" rules={[{ required: true }]}>
            <Select disabled={!!editingPromotion}>
              <Select.Option value="full_reduction">满减活动</Select.Option>
              <Select.Option value="special">特价商品</Select.Option>
              <Select.Option value="combo">组合套餐</Select.Option>
              <Select.Option value="coupon">优惠券</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="活动描述">
            <Input.TextArea rows={2} placeholder="请输入活动描述" />
          </Form.Item>
          <Form.Item name="timeRange" label="有效期" rules={[{ required: true }]}>
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(v) => v ? 'active' : 'inactive'} getValueProps={(v) => ({ checked: v === 'active' })}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev.type !== cur.type} noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type')
              if (type === 'full_reduction') {
                return (
                  <Form.List name="rules">
                    {(fields, { add, remove }) => (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Button onClick={() => add()} icon={<PlusOutlined />}>添加满减规则</Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <span>满</span>
                            <Form.Item {...restField} name={[name, 'fullAmount']} rules={[{ required: true }]}>
                              <InputNumber min={0} precision={2} placeholder="金额" />
                            </Form.Item>
                            <span>减</span>
                            <Form.Item {...restField} name={[name, 'reductionAmount']} rules={[{ required: true }]}>
                              <InputNumber min={0} precision={2} placeholder="金额" />
                            </Form.Item>
                            <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                          </Space>
                        ))}
                      </div>
                    )}
                  </Form.List>
                )
              } else if (type === 'special') {
                return (
                  <Form.List name="products">
                    {(fields, { add, remove }) => (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Button onClick={() => add()} icon={<PlusOutlined />}>添加特价商品</Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item {...restField} name={[name, 'productId']} rules={[{ required: true }]}>
                              <Select style={{ width: 200 }} placeholder="选择商品" showSearch optionFilterProp="children">
                                {products.map(p => (
                                  <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'specialPrice']} rules={[{ required: true }]}>
                              <InputNumber min={0} precision={2} placeholder="特价" prefix="¥" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'limitQuantity']}>
                              <InputNumber min={0} placeholder="限购" />
                            </Form.Item>
                            <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                          </Space>
                        ))}
                      </div>
                    )}
                  </Form.List>
                )
              } else if (type === 'combo') {
                return (
                  <Form.List name="combos">
                    {(fields, { add, remove }) => (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Button onClick={() => add({ items: [] })} icon={<PlusOutlined />}>添加套餐</Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Card key={key} size="small" style={{ marginBottom: 8 }} title={`套餐 ${name + 1}`}>
                            <Form.Item {...restField} name={[name, 'comboName']} rules={[{ required: true }]} label="套餐名称">
                              <Input placeholder="套餐名称" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'comboPrice']} rules={[{ required: true }]} label="套餐价格">
                              <InputNumber min={0} precision={2} prefix="¥" />
                            </Form.Item>
                            <Form.List name={[name, 'items']}>
                              {(itemFields, { add: addItem, remove: removeItem }) => (
                                <div>
                                  {itemFields.map(({ key: itemKey, name: itemName, ...itemRest }) => (
                                    <Space key={itemKey} style={{ marginBottom: 8 }}>
                                      <Form.Item {...itemRest} name={[itemName, 'productId']} rules={[{ required: true }]}>
                                        <Select style={{ width: 150 }} placeholder="商品">
                                          {products.map(p => (
                                            <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                                          ))}
                                        </Select>
                                      </Form.Item>
                                      <Form.Item {...itemRest} name={[itemName, 'quantity']} rules={[{ required: true }]}>
                                        <InputNumber min={1} placeholder="数量" />
                                      </Form.Item>
                                      <Button type="link" danger onClick={() => removeItem(itemName)}>删除</Button>
                                    </Space>
                                  ))}
                                  <Button onClick={() => addItem()} icon={<PlusOutlined />}>添加商品</Button>
                                </div>
                              )}
                            </Form.List>
                            <Button type="link" danger onClick={() => remove(name)} style={{ marginTop: 8 }}>删除套餐</Button>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Form.List>
                )
              } else if (type === 'coupon') {
                return (
                  <Form.List name="coupons">
                    {(fields, { add, remove }) => (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Button onClick={() => add()} icon={<PlusOutlined />}>添加优惠券</Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline" wrap>
                            <Form.Item {...restField} name={[name, 'code']} rules={[{ required: true }]}>
                              <Input placeholder="券码" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}>
                              <Input placeholder="名称" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]}>
                              <Select style={{ width: 100 }}>
                                <Select.Option value="fixed">固定金额</Select.Option>
                                <Select.Option value="percent">百分比</Select.Option>
                              </Select>
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true }]}>
                              <InputNumber min={0} precision={2} placeholder="面值" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'minAmount']}>
                              <InputNumber min={0} precision={2} placeholder="最低消费" />
                            </Form.Item>
                            <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                          </Space>
                        ))}
                      </div>
                    )}
                  </Form.List>
                )
              }
              return null
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Promotions
