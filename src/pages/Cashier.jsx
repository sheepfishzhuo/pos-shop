import { useState, useEffect } from 'react'
import {
  Input,
  Button,
  Table,
  Card,
  App,
  Tag,
  Spin,
  Empty,
  InputNumber,
  Segmented,
  Modal,
  Radio,
} from 'antd'
import {
  SearchOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CreditCardOutlined,
  WechatOutlined,
  AlipayOutlined,
  UserOutlined,
  CrownOutlined,
  WalletOutlined,
  PlusOutlined,
  MinusOutlined,
  BarcodeOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { getProducts, getHotProducts } from '../services/productService'
import { createTransaction } from '../services/transactionService'
import { getMemberByPhone } from '../services/memberService'
import './Cashier.css'

const Cashier = () => {
  const [searchText, setSearchText] = useState('')
  const [products, setProducts] = useState([])
  const [hotProducts, setHotProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberSearchVisible, setMemberSearchVisible] = useState(false)
  const [memberPhone, setMemberPhone] = useState('')
  const [searchingMember, setSearchingMember] = useState(false)
  const [discountModalVisible, setDiscountModalVisible] = useState(false)
  const [discountValue, setDiscountValue] = useState(0)
  const [discountType, setDiscountType] = useState('percent')
  const [couponModalVisible, setCouponModalVisible] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [verifyingCoupon, setVerifyingCoupon] = useState(false)
  const { message } = App.useApp()

  const { items, total, subtotal, discount, discountType: currentDiscountType, promotionDiscount, appliedPromotions, couponDiscount, addItem, removeItem, updateQuantity, clearCart, setDiscount, setPromotions, setCoupon, clearCoupon } = useCartStore()
  const { user } = useAuthStore()
  const canDiscount = user?.permissions?.includes('discount')

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await getProducts()
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

  const fetchPromotions = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/promotions/active')
      const data = await response.json()
      if (data.success) {
        setPromotions(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
    }
  }

  const fetchHotProducts = async () => {
    try {
      const response = await getHotProducts()
      if (response.success) {
        setHotProducts(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch hot products:', error)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchPromotions()
    fetchHotProducts()
  }, [])

  const handleSearch = (value) => {
    setSearchText(value)
    if (value.trim()) {
      const filtered = products.filter(
        (p) =>
          p.barcode.includes(value) ||
          p.name.toLowerCase().includes(value.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(value.toLowerCase()))
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts([])
    }
  }

  const handleProductClick = (product) => {
    if (product.stock <= 0) {
      message.warning('该商品库存不足')
      return
    }
    addItem(product)
    message.success(`已添加 ${product.name}`)
    setSearchText('')
    setFilteredProducts([])
  }

  const handlePayment = () => {
    if (items.length === 0) {
      message.warning('购物车为空')
      return
    }
    setPaymentModalVisible(true)
  }

  const handleMemberSearch = async () => {
    if (!memberPhone.trim()) {
      message.warning('请输入会员手机号')
      return
    }

    setSearchingMember(true)
    try {
      const response = await getMemberByPhone(memberPhone)
      if (response.success) {
        setSelectedMember(response.data)
        setMemberSearchVisible(false)
        setMemberPhone('')
        message.success(`已选择会员：${response.data.name}`)
      }
    } catch (error) {
      if (error.response?.status === 404) {
        message.warning('未找到该会员')
      } else {
        message.error('查询会员失败')
      }
    } finally {
      setSearchingMember(false)
    }
  }

  const handleRemoveMember = () => {
    setSelectedMember(null)
    message.success('已移除会员')
  }

  const handleApplyDiscount = () => {
    if (discountValue <= 0) {
      message.warning('请输入有效的折扣值')
      return
    }
    setDiscount(discountValue, discountType)
    setDiscountModalVisible(false)
    message.success(`已应用${discountType === 'percent' ? discountValue + '%折扣' : '¥' + discountValue + '优惠'}`)
  }

  const handleClearDiscount = () => {
    setDiscount(0, 'percent')
    setDiscountValue(0)
    message.success('已取消折扣')
  }

  const handleVerifyCoupon = async () => {
    if (!couponCode.trim()) {
      message.warning('请输入优惠券码')
      return
    }

    setVerifyingCoupon(true)
    try {
      const response = await fetch('http://localhost:3000/api/promotions/coupon/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, amount: subtotal }),
      })
      const data = await response.json()
      if (data.success) {
        setCoupon(couponCode, data.data.discount)
        setCouponModalVisible(false)
        setCouponCode('')
        message.success(`优惠券已使用，优惠 ¥${data.data.discount.toFixed(2)}`)
      } else {
        message.error(data.message || '优惠券无效')
      }
    } catch (error) {
      message.error('验证优惠券失败')
    } finally {
      setVerifyingCoupon(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!user) {
      message.error('请先登录')
      return
    }

    setProcessing(true)
    try {
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
      const transactionData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          subtotal: item.subtotal
        })),
        paymentMethod,
        cashierId: user.id,
        memberId: selectedMember?.id,
        subtotal,
        discount,
        discountType: currentDiscountType,
        total
      }

      const response = await createTransaction(transactionData)
      
      if (response.success) {
        message.success('结算成功！')
        clearCart()
        setSelectedMember(null)
        setPaymentModalVisible(false)
        setDiscountValue(0)
        fetchProducts()
      }
    } catch (error) {
      message.error('结算失败，请重试')
      console.error('Payment failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const columns = [
    {
      title: '商品',
      dataIndex: ['product', 'name'],
      key: 'name',
      render: (name, record) => (
        <div className="cart-item-name">
          <span className="name">{name}</span>
          <span className="price">¥{record.product.price.toFixed(2)}</span>
        </div>
      ),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_, record) => (
        <div className="quantity-control">
          <button 
            className="qty-btn"
            onClick={() => {
              if (record.quantity > 1) {
                updateQuantity(record.product.id, record.quantity - 1)
              }
            }}
          >
            <MinusOutlined />
          </button>
          <InputNumber
            min={1}
            max={record.product.stock}
            value={record.quantity}
            onChange={(value) => {
              if (value && value <= record.product.stock) {
                updateQuantity(record.product.id, value)
              }
            }}
            className="qty-input"
            controls={false}
          />
          <button 
            className="qty-btn"
            onClick={() => {
              if (record.quantity < record.product.stock) {
                updateQuantity(record.product.id, record.quantity + 1)
              } else {
                message.warning('库存不足')
              }
            }}
          >
            <PlusOutlined />
          </button>
        </div>
      ),
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 100,
      render: (subtotal) => <span className="subtotal">¥{subtotal.toFixed(2)}</span>,
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_, record) => (
        <button 
          className="remove-btn"
          onClick={() => removeItem(record.product.id)}
        >
          <DeleteOutlined />
        </button>
      ),
    },
  ]

  return (
    <div className="cashier-page">
      <div className="cashier-left">
        <Card className="search-card">
          <div className="search-header">
            <BarcodeOutlined className="search-icon" />
            <span>扫描或搜索商品</span>
          </div>
          <Input
            placeholder="输入条码、商品名称或分类..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            size="large"
            prefix={<SearchOutlined />}
            allowClear
            className="search-input"
          />
          {filteredProducts.length > 0 && (
            <div className="search-results">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="product-item"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-meta">
                      <Tag color="blue">{product.category || '未分类'}</Tag>
                      <span className="stock">库存: {product.stock}</span>
                    </div>
                  </div>
                  <div className="product-price">¥{product.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="quick-products-card">
          <div className="section-title">热门商品</div>
          <Spin spinning={loading}>
            <div className="quick-products">
              {hotProducts.length > 0 ? (
                hotProducts.map((product) => (
                  <button
                    key={product.id}
                    className={`quick-product-btn ${product.stock <= 0 ? 'disabled' : ''}`}
                    onClick={() => handleProductClick(product)}
                    disabled={product.stock <= 0}
                  >
                    <div className="quick-product-name">{product.name}</div>
                    <div className="quick-product-barcode">{product.barcode}</div>
                    <div className="quick-product-price">¥{product.price.toFixed(2)}</div>
                  </button>
                ))
              ) : (
                <div className="no-hot-products">
                  暂无热门商品，请在商品管理中设置
                </div>
              )}
            </div>
          </Spin>
        </Card>
      </div>

      <div className="cashier-right">
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingCartOutlined />
            <span>当前订单</span>
            {items.length > 0 && (
              <span className="item-count">{items.length} 件商品</span>
            )}
          </div>
          {items.length > 0 && (
            <button className="clear-btn" onClick={() => clearCart()}>
              清空
            </button>
          )}
        </div>

        {selectedMember ? (
          <div className="member-info">
            <div className="member-avatar">
              <UserOutlined />
            </div>
            <div className="member-details">
              <div className="member-name">{selectedMember.name}</div>
              <div className="member-meta">
                <Tag color="blue">{selectedMember.member_no}</Tag>
                <Tag color="gold"><CrownOutlined /> {selectedMember.points} 积分</Tag>
              </div>
              <div className="member-balance">
                余额 ¥{parseFloat(String(selectedMember.balance)).toFixed(2)}
              </div>
            </div>
            <button className="remove-member-btn" onClick={handleRemoveMember}>
              移除
            </button>
          </div>
        ) : (
          <button 
            className="add-member-btn"
            onClick={() => setMemberSearchVisible(true)}
          >
            <UserOutlined />
            <span>添加会员</span>
          </button>
        )}

        <div className="cart-items">
          {items.length === 0 ? (
            <Empty 
              description="购物车为空" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="empty-cart"
            />
          ) : (
            <Table
              dataSource={items}
              columns={columns}
              pagination={false}
              showHeader={false}
              locale={{ emptyText: '购物车为空' }}
              rowKey={(record) => record.product.id}
            />
          )}
        </div>

        <div className="cart-footer">
          <div className="summary-row">
            <span className="summary-label">商品数量</span>
            <span className="summary-value">{items.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
          </div>
          
          {items.length > 0 && (
            <div className="discount-section">
              {canDiscount && (
                <button 
                  className={`discount-btn ${discount > 0 ? 'active' : ''}`}
                  onClick={() => setDiscountModalVisible(true)}
                >
                  <TagOutlined />
                  <span>{discount > 0 ? `已优惠 ${currentDiscountType === 'percent' ? discount + '%' : '¥' + discount}` : '打折优惠'}</span>
                </button>
              )}
              <button 
                className={`discount-btn ${couponDiscount > 0 ? 'active' : ''}`}
                onClick={() => setCouponModalVisible(true)}
              >
                <TagOutlined />
                <span>{couponDiscount > 0 ? `优惠券 ¥${couponDiscount.toFixed(2)}` : '优惠券'}</span>
              </button>
              {(discount > 0 || couponDiscount > 0) && (
                <button className="clear-discount-btn" onClick={() => { handleClearDiscount(); clearCoupon(); }}>
                  取消优惠
                </button>
              )}
            </div>
          )}

          {appliedPromotions.length > 0 && (
            <div className="promotions-applied">
              {appliedPromotions.map((promo, index) => (
                <div key={index} className="promotion-tag">
                  <Tag color="orange">{promo.description}</Tag>
                  <span className="promotion-discount">-¥{promo.discount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="summary-row">
            <span className="summary-label">商品金额</span>
            <span className="summary-value">¥{subtotal.toFixed(2)}</span>
          </div>
          
          {promotionDiscount > 0 && (
            <div className="summary-row discount">
              <span className="summary-label">促销优惠</span>
              <span className="summary-value">-¥{promotionDiscount.toFixed(2)}</span>
            </div>
          )}
          
          {discount > 0 && (
            <div className="summary-row discount">
              <span className="summary-label">
                {currentDiscountType === 'percent' ? `折扣 (${discount}%)` : '优惠金额'}
              </span>
              <span className="summary-value">-¥{(subtotal * discount / 100).toFixed(2)}</span>
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="summary-row discount">
              <span className="summary-label">优惠券</span>
              <span className="summary-value">-¥{couponDiscount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="summary-row total">
            <span className="summary-label">应收金额</span>
            <span className="summary-value">¥{total.toFixed(2)}</span>
          </div>
          <Button
            type="primary"
            size="large"
            block
            onClick={handlePayment}
            disabled={items.length === 0}
            loading={processing}
            className="checkout-btn"
          >
            结算收款
          </Button>
        </div>
      </div>

      <Modal
        title="选择支付方式"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handleConfirmPayment}
        okText="确认收款"
        cancelText="取消"
        width={480}
        confirmLoading={processing}
        className="payment-modal"
      >
        <div className="payment-amount">
          <span className="amount-label">应收金额</span>
          <span className="amount-value">¥{total.toFixed(2)}</span>
        </div>

        <div className="payment-methods">
          <button
            className={`payment-method ${paymentMethod === 'cash' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('cash')}
          >
            <DollarOutlined className="method-icon cash" />
            <span>现金</span>
          </button>
          <button
            className={`payment-method ${paymentMethod === 'wechat' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('wechat')}
          >
            <WechatOutlined className="method-icon wechat" />
            <span>微信支付</span>
          </button>
          <button
            className={`payment-method ${paymentMethod === 'alipay' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('alipay')}
          >
            <AlipayOutlined className="method-icon alipay" />
            <span>支付宝</span>
          </button>
          <button
            className={`payment-method ${paymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCardOutlined className="method-icon card" />
            <span>银行卡</span>
          </button>
          {selectedMember && parseFloat(String(selectedMember.balance)) >= total && (
            <button
              className={`payment-method ${paymentMethod === 'member_balance' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('member_balance')}
            >
              <WalletOutlined className="method-icon balance" />
              <span>会员余额</span>
            </button>
          )}
        </div>
      </Modal>

      <Modal
        title="添加会员"
        open={memberSearchVisible}
        onCancel={() => {
          setMemberSearchVisible(false)
          setMemberPhone('')
        }}
        onOk={handleMemberSearch}
        okText="确定"
        cancelText="取消"
        confirmLoading={searchingMember}
      >
        <Input
          placeholder="请输入会员手机号"
          prefix={<UserOutlined />}
          value={memberPhone}
          onChange={(e) => setMemberPhone(e.target.value)}
          onPressEnter={handleMemberSearch}
          size="large"
        />
      </Modal>

      <Modal
        title="打折优惠"
        open={discountModalVisible}
        onCancel={() => {
          setDiscountModalVisible(false)
          setDiscountValue(0)
        }}
        onOk={handleApplyDiscount}
        okText="应用"
        cancelText="取消"
        width={400}
      >
        <div className="discount-modal-content">
          <Segmented
            block
            options={[
              { label: '百分比折扣', value: 'percent' },
              { label: '固定金额', value: 'amount' },
            ]}
            value={discountType}
            onChange={(value) => {
              setDiscountType(value)
              setDiscountValue(0)
            }}
            style={{ marginBottom: 20 }}
          />
          
          <div className="discount-input-wrapper">
            <InputNumber
              size="large"
              min={0}
              max={discountType === 'percent' ? 100 : subtotal}
              value={discountValue}
              onChange={(value) => setDiscountValue(value || 0)}
              style={{ width: '100%' }}
              placeholder={discountType === 'percent' ? '输入折扣百分比 (如: 10 表示打9折)' : '输入优惠金额'}
              suffix={discountType === 'percent' ? '%' : '元'}
            />
          </div>
          
          {discountValue > 0 && (
            <div className="discount-preview">
              <span>优惠后金额：</span>
              <span className="preview-amount">
                ¥{(discountType === 'percent' 
                  ? subtotal * (1 - discountValue / 100) 
                  : subtotal - discountValue
                ).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title="使用优惠券"
        open={couponModalVisible}
        onCancel={() => {
          setCouponModalVisible(false)
          setCouponCode('')
        }}
        onOk={handleVerifyCoupon}
        okText="验证并使用"
        cancelText="取消"
        confirmLoading={verifyingCoupon}
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <span>当前订单金额：¥{subtotal.toFixed(2)}</span>
        </div>
        <Input
          placeholder="请输入优惠券码"
          prefix={<TagOutlined />}
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          size="large"
        />
        {couponDiscount > 0 && (
          <div style={{ marginTop: 16, color: '#52c41a' }}>
            当前优惠券已优惠：¥{couponDiscount.toFixed(2)}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Cashier
