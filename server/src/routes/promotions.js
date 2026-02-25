import { Router } from 'express'
import { pool } from '../config/database.js'
import { logOperation } from './logs.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query
    let query = 'SELECT * FROM promotions WHERE 1=1'
    const params = []

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY created_at DESC'

    const [rows] = await pool.execute(query, params)

    const promotions = await Promise.all(rows.map(async (row) => {
      const promotion = {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        priority: row.priority,
        createdAt: row.created_at,
      }

      if (row.type === 'full_reduction') {
        const [frRows] = await pool.execute(
          'SELECT * FROM promotion_full_reductions WHERE promotion_id = ?',
          [row.id]
        )
        promotion.rules = frRows.map(r => ({
          id: r.id,
          fullAmount: parseFloat(r.full_amount),
          reductionAmount: parseFloat(r.reduction_amount),
        }))
      } else if (row.type === 'special') {
        const [spRows] = await pool.execute(
          `SELECT ps.*, p.name as product_name, p.barcode 
           FROM promotion_specials ps 
           LEFT JOIN products p ON ps.product_id = p.id 
           WHERE ps.promotion_id = ?`,
          [row.id]
        )
        promotion.products = spRows.map(r => ({
          id: r.id,
          productId: r.product_id,
          productName: r.product_name,
          barcode: r.barcode,
          originalPrice: parseFloat(r.original_price),
          specialPrice: parseFloat(r.special_price),
          limitQuantity: r.limit_quantity,
        }))
      } else if (row.type === 'combo') {
        const [comboRows] = await pool.execute(
          'SELECT * FROM promotion_combos WHERE promotion_id = ?',
          [row.id]
        )
        promotion.combos = await Promise.all(comboRows.map(async (c) => {
          const [itemRows] = await pool.execute(
            `SELECT pci.*, p.name as product_name, p.barcode, p.price
             FROM promotion_combo_items pci 
             LEFT JOIN products p ON pci.product_id = p.id 
             WHERE pci.combo_id = ?`,
            [c.id]
          )
          return {
            id: c.id,
            comboName: c.combo_name,
            comboPrice: parseFloat(c.combo_price),
            items: itemRows.map(i => ({
              id: i.id,
              productId: i.product_id,
              productName: i.product_name,
              barcode: i.barcode,
              price: parseFloat(i.price),
              quantity: i.quantity,
            })),
          }
        }))
      } else if (row.type === 'coupon') {
        const [couponRows] = await pool.execute(
          'SELECT * FROM coupons WHERE promotion_id = ?',
          [row.id]
        )
        promotion.coupons = couponRows.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          type: c.type,
          value: parseFloat(c.value),
          minAmount: parseFloat(c.min_amount),
          status: c.status,
        }))
      }

      return promotion
    }))

    res.json({
      success: true,
      data: promotions,
    })
  } catch (error) {
    console.error('获取促销活动错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/', async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { name, type, description, startTime, endTime, status, rules, products, combos, coupons } = req.body

    const promotionId = crypto.randomUUID()
    await connection.execute(
      `INSERT INTO promotions (id, name, type, description, start_time, end_time, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [promotionId, name, type, description, startTime, endTime, status || 'active']
    )

    if (type === 'full_reduction' && rules) {
      for (const rule of rules) {
        await connection.execute(
          `INSERT INTO promotion_full_reductions (id, promotion_id, full_amount, reduction_amount) 
           VALUES (?, ?, ?, ?)`,
          [crypto.randomUUID(), promotionId, rule.fullAmount, rule.reductionAmount]
        )
      }
    } else if (type === 'special' && products) {
      for (const p of products) {
        await connection.execute(
          `INSERT INTO promotion_specials (id, promotion_id, product_id, original_price, special_price, limit_quantity) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), promotionId, p.productId, p.originalPrice, p.specialPrice, p.limitQuantity || 0]
        )
      }
    } else if (type === 'combo' && combos) {
      for (const combo of combos) {
        const comboId = crypto.randomUUID()
        await connection.execute(
          `INSERT INTO promotion_combos (id, promotion_id, combo_name, combo_price) 
           VALUES (?, ?, ?, ?)`,
          [comboId, promotionId, combo.comboName, combo.comboPrice]
        )
        for (const item of combo.items) {
          await connection.execute(
            `INSERT INTO promotion_combo_items (id, combo_id, product_id, quantity) 
             VALUES (?, ?, ?, ?)`,
            [crypto.randomUUID(), comboId, item.productId, item.quantity]
          )
        }
      }
    } else if (type === 'coupon' && coupons) {
      for (const c of coupons) {
        await connection.execute(
          `INSERT INTO coupons (id, promotion_id, code, name, type, value, min_amount, start_time, end_time, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), promotionId, c.code, c.name, c.type, c.value, c.minAmount || 0, startTime, endTime, 'active']
        )
      }
    }

    await connection.commit()

    logOperation({
      userId: null,
      userName: 'system',
      action: 'create',
      module: 'promotions',
      description: `创建促销活动: ${name}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '创建成功',
      data: { id: promotionId },
    })
  } catch (error) {
    await connection.rollback()
    console.error('创建促销活动错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  } finally {
    connection.release()
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, startTime, endTime, status } = req.body

    await pool.execute(
      `UPDATE promotions SET name = ?, description = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?`,
      [name, description, startTime, endTime, status, id]
    )

    logOperation({
      userId: null,
      userName: 'system',
      action: 'update',
      module: 'promotions',
      description: `更新促销活动: ${name}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '更新成功',
    })
  } catch (error) {
    console.error('更新促销活动错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await pool.execute('DELETE FROM promotions WHERE id = ?', [id])

    logOperation({
      userId: null,
      userName: 'system',
      action: 'delete',
      module: 'promotions',
      description: `删除促销活动: ${id}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除促销活动错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const [rows] = await pool.execute(
      `SELECT * FROM promotions 
       WHERE status = 'active' AND start_time <= ? AND end_time >= ?`,
      [now, now]
    )

    const promotions = await Promise.all(rows.map(async (row) => {
      const promotion = {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
      }

      if (row.type === 'full_reduction') {
        const [frRows] = await pool.execute(
          'SELECT * FROM promotion_full_reductions WHERE promotion_id = ? ORDER BY full_amount DESC',
          [row.id]
        )
        promotion.rules = frRows.map(r => ({
          fullAmount: parseFloat(r.full_amount),
          reductionAmount: parseFloat(r.reduction_amount),
        }))
      } else if (row.type === 'special') {
        const [spRows] = await pool.execute(
          `SELECT ps.*, p.name as product_name, p.barcode 
           FROM promotion_specials ps 
           LEFT JOIN products p ON ps.product_id = p.id 
           WHERE ps.promotion_id = ?`,
          [row.id]
        )
        promotion.products = spRows.map(r => ({
          productId: r.product_id,
          productName: r.product_name,
          barcode: r.barcode,
          specialPrice: parseFloat(r.special_price),
          limitQuantity: r.limit_quantity,
        }))
      } else if (row.type === 'combo') {
        const [comboRows] = await pool.execute(
          'SELECT * FROM promotion_combos WHERE promotion_id = ?',
          [row.id]
        )
        promotion.combos = await Promise.all(comboRows.map(async (c) => {
          const [itemRows] = await pool.execute(
            `SELECT pci.*, p.name as product_name, p.barcode 
             FROM promotion_combo_items pci 
             LEFT JOIN products p ON pci.product_id = p.id 
             WHERE pci.combo_id = ?`,
            [c.id]
          )
          return {
            id: c.id,
            comboName: c.combo_name,
            comboPrice: parseFloat(c.combo_price),
            items: itemRows.map(i => ({
              productId: i.product_id,
              productName: i.product_name,
              barcode: i.barcode,
              quantity: i.quantity,
            })),
          }
        }))
      }

      return promotion
    }))

    res.json({
      success: true,
      data: promotions,
    })
  } catch (error) {
    console.error('获取活动促销错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/coupon/verify', async (req, res) => {
  try {
    const { code, amount } = req.body
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const [rows] = await pool.execute(
      `SELECT * FROM coupons 
       WHERE code = ? AND status = 'active' AND start_time <= ? AND end_time >= ?`,
      [code, now, now]
    )

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: '优惠券无效或已过期',
      })
    }

    const coupon = rows[0]

    if (parseFloat(coupon.min_amount) > amount) {
      return res.json({
        success: false,
        message: `订单金额需满¥${parseFloat(coupon.min_amount).toFixed(2)}才能使用此优惠券`,
      })
    }

    res.json({
      success: true,
      data: {
        id: coupon.id,
        name: coupon.name,
        type: coupon.type,
        value: parseFloat(coupon.value),
        discount: coupon.type === 'fixed' 
          ? parseFloat(coupon.value) 
          : amount * parseFloat(coupon.value) / 100,
      },
    })
  } catch (error) {
    console.error('验证优惠券错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/coupon/use', async (req, res) => {
  try {
    const { couponId, transactionId, userId } = req.body
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.execute(
      `UPDATE coupons SET status = 'used', used_at = ?, used_by = ?, transaction_id = ? WHERE id = ?`,
      [now, userId, transactionId, couponId]
    )

    res.json({
      success: true,
      message: '优惠券已使用',
    })
  } catch (error) {
    console.error('使用优惠券错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
