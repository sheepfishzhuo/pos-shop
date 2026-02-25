import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, cashierId } = req.query

    let query = `
      SELECT t.*, u.name as cashier_name 
      FROM transactions t 
      LEFT JOIN users u ON t.cashier_id = u.id 
      WHERE 1=1
    `
    const params = []

    if (startDate && endDate) {
      query += ' AND DATE(t.created_at) BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }

    if (cashierId) {
      query += ' AND t.cashier_id = ?'
      params.push(cashierId)
    }

    query += ' ORDER BY t.created_at DESC'

    const [rows] = await pool.execute(query, params)

    const transactionIds = rows.map(r => r.id)
    let itemCounts = {}
    let refundedCounts = {}
    
    if (transactionIds.length > 0) {
      const placeholders = transactionIds.map(() => '?').join(',')
      const [itemRows] = await pool.execute(
        `SELECT transaction_id, SUM(quantity) as total_quantity 
         FROM transaction_items 
         WHERE transaction_id IN (${placeholders})
         GROUP BY transaction_id`,
        transactionIds
      )
      itemRows.forEach(row => {
        itemCounts[row.transaction_id] = row.total_quantity
      })

      const [refundRows] = await pool.execute(
        `SELECT transaction_id, items 
         FROM refunds 
         WHERE transaction_id IN (${placeholders})`,
        transactionIds
      )
      refundRows.forEach(row => {
        const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        let totalRefunded = 0
        items.forEach(item => {
          totalRefunded += item.quantity
        })
        if (!refundedCounts[row.transaction_id]) {
          refundedCounts[row.transaction_id] = 0
        }
        refundedCounts[row.transaction_id] += totalRefunded
      })
    }

    const transactions = rows.map((row) => ({
      id: row.id,
      totalAmount: parseFloat(row.total_amount),
      paymentMethod: row.payment_method,
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      status: row.status,
      notes: row.notes,
      itemCount: (itemCounts[row.id] || 0) - (refundedCounts[row.id] || 0),
      createdAt: row.created_at,
    }))

    res.json({
      success: true,
      data: transactions,
    })
  } catch (error) {
    console.error('获取交易列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [transactionRows] = await pool.execute(
      `SELECT t.*, u.name as cashier_name 
       FROM transactions t 
       LEFT JOIN users u ON t.cashier_id = u.id 
       WHERE t.id = ?`,
      [id]
    )

    if (transactionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '交易不存在',
      })
    }

    const [itemRows] = await pool.execute(
      `SELECT ti.*, p.name as product_name 
       FROM transaction_items ti 
       LEFT JOIN products p ON ti.product_id = p.id 
       WHERE ti.transaction_id = ?`,
      [id]
    )

    const [refundRows] = await pool.execute(
      `SELECT * FROM refunds WHERE transaction_id = ? ORDER BY created_at DESC`,
      [id]
    )

    const totalRefunded = refundRows.reduce((sum, r) => sum + parseFloat(r.amount), 0)

    const refundedQuantities = {}
    refundRows.forEach(refund => {
      const items = typeof refund.items === 'string' ? JSON.parse(refund.items) : refund.items
      items.forEach(item => {
        if (!refundedQuantities[item.productId]) {
          refundedQuantities[item.productId] = 0
        }
        refundedQuantities[item.productId] += item.quantity
      })
    })

    const transaction = {
      id: transactionRows[0].id,
      totalAmount: parseFloat(transactionRows[0].total_amount),
      paymentMethod: transactionRows[0].payment_method,
      cashierId: transactionRows[0].cashier_id,
      cashierName: transactionRows[0].cashier_name,
      status: transactionRows[0].status,
      notes: transactionRows[0].notes,
      items: itemRows.map((row) => ({
        id: row.id,
        transactionId: row.transaction_id,
        productId: row.product_id,
        product: {
          id: row.product_id,
          name: row.product_name,
          price: parseFloat(row.unit_price),
        },
        quantity: row.quantity,
        refundedQuantity: refundedQuantities[row.product_id] || 0,
        unitPrice: parseFloat(row.unit_price),
        subtotal: parseFloat(row.subtotal),
      })),
      refunds: refundRows.map((row) => ({
        id: row.id,
        amount: parseFloat(row.amount),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        createdAt: row.created_at,
      })),
      totalRefunded,
      createdAt: transactionRows[0].created_at,
    }

    res.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error('获取交易详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/', async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    const { items, paymentMethod, cashierId, memberId, notes } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '购物车为空',
      })
    }

    await connection.beginTransaction()

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)
    const transactionId = crypto.randomUUID()
    const createdAt = new Date().toISOString().split('T')[0]

    if (paymentMethod === 'member_balance') {
      if (!memberId) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: '使用会员余额支付需要选择会员',
        })
      }

      const [memberRows] = await connection.execute(
        'SELECT balance FROM members WHERE id = ?',
        [memberId]
      )

      if (memberRows.length === 0) {
        await connection.rollback()
        return res.status(404).json({
          success: false,
          message: '会员不存在',
        })
      }

      const memberBalance = parseFloat(memberRows[0].balance)
      if (memberBalance < totalAmount) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: `会员余额不足，当前余额: ¥${memberBalance.toFixed(2)}`,
        })
      }
    }

    await connection.execute(
      `INSERT INTO transactions (id, total_amount, payment_method, cashier_id, member_id, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transactionId, totalAmount, paymentMethod, cashierId, memberId || null, notes || null, createdAt]
    )

    for (const item of items) {
      const itemId = crypto.randomUUID()
      
      await connection.execute(
        `INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, transactionId, item.productId, item.quantity, item.unitPrice, item.subtotal]
      )

      await connection.execute(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.productId]
      )
    }

    if (memberId) {
      if (paymentMethod === 'member_balance') {
        await connection.execute(
          'UPDATE members SET balance = balance - ?, total_spent = total_spent + ? WHERE id = ?',
          [totalAmount, totalAmount, memberId]
        )
        
        const [memberRows] = await connection.execute(
          'SELECT balance FROM members WHERE id = ?',
          [memberId]
        )
        
        const logId = crypto.randomUUID()
        await connection.execute(
          `INSERT INTO member_balance_log (id, member_id, type, amount, balance, source, transaction_id) 
           VALUES (?, ?, 'consume', ?, ?, '购物消费', ?)`,
          [logId, memberId, totalAmount, memberRows[0].balance, transactionId]
        )
      }

      const pointsToEarn = Math.floor(totalAmount)
      if (pointsToEarn > 0) {
        await connection.execute(
          'UPDATE members SET points = points + ? WHERE id = ?',
          [pointsToEarn, memberId]
        )
        
        const [memberRows] = await connection.execute(
          'SELECT points FROM members WHERE id = ?',
          [memberId]
        )
        
        const logId = crypto.randomUUID()
        await connection.execute(
          `INSERT INTO member_points_log (id, member_id, type, points, balance, source, transaction_id) 
           VALUES (?, ?, 'earn', ?, ?, '购物', ?)`,
          [logId, memberId, pointsToEarn, memberRows[0].points, transactionId]
        )
      }
    }

    await connection.commit()

    res.status(201).json({
      success: true,
      message: '交易成功',
      data: {
        id: transactionId,
        totalAmount,
        paymentMethod,
        cashierId,
        memberId,
        createdAt,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('创建交易错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  } finally {
    connection.release()
  }
})

router.post('/:id/refund', async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    const { id } = req.params
    const { items } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要退款的商品',
      })
    }

    await connection.beginTransaction()

    const [transactionRows] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    )

    if (transactionRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: '交易不存在',
      })
    }

    const transaction = transactionRows[0]

    if (transaction.status === 'refunded') {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: '该交易已全额退款',
      })
    }

    let totalRefundAmount = 0

    for (const refundItem of items) {
      const [itemRows] = await connection.execute(
        'SELECT * FROM transaction_items WHERE transaction_id = ? AND product_id = ?',
        [id, refundItem.productId]
      )

      if (itemRows.length === 0) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: `商品不存在于该交易中`,
        })
      }

      const originalItem = itemRows[0]
      
      if (refundItem.quantity > originalItem.quantity) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: `退款数量不能超过购买数量`,
        })
      }

      totalRefundAmount += parseFloat(originalItem.unit_price) * refundItem.quantity

      await connection.execute(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [refundItem.quantity, refundItem.productId]
      )
    }

    const refundId = crypto.randomUUID()
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await connection.execute(
      `INSERT INTO refunds (id, transaction_id, amount, items, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [refundId, id, totalRefundAmount, JSON.stringify(items), createdAt]
    )

    if (transaction.member_id) {
      if (transaction.payment_method === 'member_balance') {
        await connection.execute(
          'UPDATE members SET balance = balance + ? WHERE id = ?',
          [totalRefundAmount, transaction.member_id]
        )
        
        const [memberRows] = await connection.execute(
          'SELECT balance FROM members WHERE id = ?',
          [transaction.member_id]
        )
        
        const logId = crypto.randomUUID()
        await connection.execute(
          `INSERT INTO member_balance_log (id, member_id, type, amount, balance, source, transaction_id) 
           VALUES (?, ?, 'refund', ?, ?, '退款', ?)`,
          [logId, transaction.member_id, totalRefundAmount, memberRows[0].balance, id]
        )
      }

      const pointsToDeduct = Math.floor(totalRefundAmount)
      if (pointsToDeduct > 0) {
        await connection.execute(
          'UPDATE members SET points = GREATEST(points - ?, 0) WHERE id = ?',
          [pointsToDeduct, transaction.member_id]
        )
        
        const [memberRows] = await connection.execute(
          'SELECT points FROM members WHERE id = ?',
          [transaction.member_id]
        )
        
        const logId = crypto.randomUUID()
        await connection.execute(
          `INSERT INTO member_points_log (id, member_id, type, points, balance, source, transaction_id) 
           VALUES (?, ?, 'deduct', ?, ?, '退款', ?)`,
          [logId, transaction.member_id, pointsToDeduct, memberRows[0].points, id]
        )
      }
    }

    const [allItemsRows] = await connection.execute(
      'SELECT SUM(quantity) as total_quantity FROM transaction_items WHERE transaction_id = ?',
      [id]
    )
    
    const totalQuantity = allItemsRows[0].total_quantity
    const refundQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    
    if (refundQuantity >= totalQuantity) {
      await connection.execute(
        'UPDATE transactions SET status = ? WHERE id = ?',
        ['refunded', id]
      )
    } else {
      await connection.execute(
        'UPDATE transactions SET status = ? WHERE id = ?',
        ['partial_refund', id]
      )
    }

    await connection.commit()

    res.json({
      success: true,
      message: '退款成功',
      data: {
        refundId,
        amount: totalRefundAmount,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('退款错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    })
  } finally {
    connection.release()
  }
})

export default router
