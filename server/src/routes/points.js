import { Router } from 'express'
import { pool } from '../config/database.js'
import { logOperation } from './logs.js'

const router = Router()

router.get('/products', async (req, res) => {
  try {
    const { all } = req.query
    let query = 'SELECT * FROM point_products'
    if (!all) {
      query += ' WHERE status = "active"'
    }
    query += ' ORDER BY created_at DESC'
    
    const [rows] = await pool.execute(query)
    res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.image_url,
        pointsRequired: r.points_required,
        stock: r.stock,
        status: r.status,
      })),
    })
  } catch (error) {
    console.error('获取积分商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/products', async (req, res) => {
  try {
    const { name, description, imageUrl, pointsRequired, stock } = req.body
    const id = crypto.randomUUID()

    await pool.execute(
      `INSERT INTO point_products (id, name, description, image_url, points_required, stock) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, imageUrl || null, pointsRequired, stock || 0]
    )

    logOperation({
      userId: null,
      userName: 'system',
      action: 'create',
      module: 'members',
      description: `创建积分商品: ${name}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '创建成功',
      data: { id },
    })
  } catch (error) {
    console.error('创建积分商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, imageUrl, pointsRequired, stock, status } = req.body

    await pool.execute(
      `UPDATE point_products SET name = ?, description = ?, image_url = ?, points_required = ?, stock = ?, status = ? WHERE id = ?`,
      [name, description, imageUrl, pointsRequired, stock, status, id]
    )

    res.json({
      success: true,
      message: '更新成功',
    })
  } catch (error) {
    console.error('更新积分商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.execute('DELETE FROM point_products WHERE id = ?', [id])

    res.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除积分商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/exchange', async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { memberId, pointProductId, quantity = 1 } = req.body

    const [memberRows] = await connection.execute(
      'SELECT * FROM members WHERE id = ?',
      [memberId]
    )

    if (memberRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: '会员不存在',
      })
    }

    const member = memberRows[0]

    const [productRows] = await connection.execute(
      'SELECT * FROM point_products WHERE id = ? AND status = "active"',
      [pointProductId]
    )

    if (productRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: '积分商品不存在或已下架',
      })
    }

    const product = productRows[0]
    const pointsNeeded = product.points_required * quantity

    if (member.points < pointsNeeded) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: `积分不足，需要 ${pointsNeeded} 积分，当前 ${member.points} 积分`,
      })
    }

    if (product.stock < quantity) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: '库存不足',
      })
    }

    const exchangeId = crypto.randomUUID()
    await connection.execute(
      `INSERT INTO point_exchanges (id, member_id, point_product_id, points_used, quantity) 
       VALUES (?, ?, ?, ?, ?)`,
      [exchangeId, memberId, pointProductId, pointsNeeded, quantity]
    )

    await connection.execute(
      'UPDATE members SET points = points - ? WHERE id = ?',
      [pointsNeeded, memberId]
    )

    await connection.execute(
      'UPDATE point_products SET stock = stock - ? WHERE id = ?',
      [quantity, pointProductId]
    )

    await connection.commit()

    logOperation({
      userId: null,
      userName: 'system',
      action: 'exchange',
      module: 'members',
      description: `会员 ${member.name} 兑换 ${product.name} x${quantity}，消耗 ${pointsNeeded} 积分`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '兑换成功',
      data: {
        exchangeId,
        pointsUsed: pointsNeeded,
        remainingPoints: member.points - pointsNeeded,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('积分兑换错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  } finally {
    connection.release()
  }
})

router.get('/history/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params
    const [rows] = await pool.execute(
      `SELECT pe.*, pp.name as product_name 
       FROM point_exchanges pe 
       LEFT JOIN point_products pp ON pe.point_product_id = pp.id 
       WHERE pe.member_id = ? 
       ORDER BY pe.created_at DESC 
       LIMIT 50`,
      [memberId]
    )

    res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        productName: r.product_name,
        pointsUsed: r.points_used,
        quantity: r.quantity,
        status: r.status,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('获取兑换记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
