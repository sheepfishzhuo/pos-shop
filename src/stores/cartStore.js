import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],
  total: 0,
  subtotal: 0,
  discount: 0,
  discountType: 'percent',
  promotions: [],
  appliedPromotions: [],
  couponCode: '',
  couponDiscount: 0,
  promotionDiscount: 0,

  setPromotions: (promotions) => {
    set({ promotions })
    get().applyPromotions()
  },

  addItem: (product, quantity = 1) => {
    const items = get().items
    const existingItem = items.find((item) => item.product.id === product.id)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      const updatedItems = items.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
          : item
      )
      set({ items: updatedItems })
    } else {
      const promotions = get().promotions
      const specialPromo = promotions.find(p => 
        p.type === 'special' && p.products?.some(sp => sp.productId === product.id)
      )
      
      let unitPrice = product.price
      let isSpecial = false
      
      if (specialPromo) {
        const specialProduct = specialPromo.products.find(sp => sp.productId === product.id)
        unitPrice = specialProduct.specialPrice
        isSpecial = true
      }

      const newItem = {
        product,
        quantity,
        unitPrice,
        originalPrice: product.price,
        isSpecial,
        subtotal: quantity * unitPrice,
      }
      set({ items: [...items, newItem] })
    }
    get().applyPromotions()
  },

  removeItem: (productId) => {
    const items = get().items.filter((item) => item.product.id !== productId)
    set({ items })
    get().applyPromotions()
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    const items = get().items.map((item) =>
      item.product.id === productId
        ? { ...item, quantity, subtotal: quantity * item.unitPrice }
        : item
    )
    set({ items })
    get().applyPromotions()
  },

  setDiscount: (discount, type = 'percent') => {
    set({ discount, discountType: type })
    get().calculateTotal()
  },

  setCoupon: (code, discount) => {
    set({ couponCode: code, couponDiscount: discount })
    get().calculateTotal()
  },

  clearCoupon: () => {
    set({ couponCode: '', couponDiscount: 0 })
    get().calculateTotal()
  },

  applyPromotions: () => {
    const items = get().items
    const promotions = get().promotions
    const appliedPromotions = []
    let promotionDiscount = 0

    promotions.forEach(promo => {
      if (promo.type === 'full_reduction' && promo.rules?.length > 0) {
        const itemsSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        const sortedRules = [...promo.rules].sort((a, b) => b.fullAmount - a.fullAmount)
        const applicableRule = sortedRules.find(rule => itemsSubtotal >= rule.fullAmount)
        
        if (applicableRule) {
          promotionDiscount += applicableRule.reductionAmount
          appliedPromotions.push({
            name: promo.name,
            type: 'full_reduction',
            discount: applicableRule.reductionAmount,
            description: `满${applicableRule.fullAmount}减${applicableRule.reductionAmount}`,
          })
        }
      }
    })

    set({ promotionDiscount, appliedPromotions })
    get().calculateTotal()
  },

  calculateTotal: () => {
    const items = get().items
    const { discount, discountType, couponDiscount, promotionDiscount } = get()
    
    let subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    let total = subtotal

    if (promotionDiscount > 0) {
      total -= promotionDiscount
    }

    if (discount > 0) {
      if (discountType === 'percent') {
        total = total * (1 - discount / 100)
      } else {
        total = total - discount
      }
    }

    if (couponDiscount > 0) {
      total -= couponDiscount
    }
    
    set({ subtotal, total: Math.max(0, total) })
  },

  clearCart: () => set({ 
    items: [], 
    total: 0, 
    subtotal: 0, 
    discount: 0, 
    discountType: 'percent',
    couponCode: '',
    couponDiscount: 0,
    promotionDiscount: 0,
    appliedPromotions: [],
  }),
}))
