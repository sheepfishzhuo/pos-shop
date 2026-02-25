import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/status', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        p.id,
        p.barcode,
        p.name,
        p.category_id,
        c.name as category_name,
        p.stock,
        p.min_stock,
        p.unit,
        p.supplier,
        CASE 
          WHEN p.stock <= 0 THEN 'out_of_stock'
          WHEN p.stock <= p.min_stock THEN 'low_stock'
          ELSE 'normal'
        END as status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY 
        CASE 
          WHEN p.stock <= 0 THEN 1
          WHEN p.stock <= p.min_stock THEN 2
          ELSE 3
        END,
        p.stock ASC
    `)

    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('获取库存状态错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/summary', async (req, res) => {
  try {
    const [summaryRows] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT id) as total_products,
        SUM(stock) as total_stock,
        SUM(stock * cost) as total_value
      FROM products
    `)

    const [lowStockRows] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM products
      WHERE stock <= min_stock
    `)

    res.json({
      success: true,
      data: {
        totalProducts: summaryRows[0].total_products,
        totalStock: summaryRows[0].total_stock,
        totalValue: parseFloat(summaryRows[0].total_value || 0),
        lowStockCount: lowStockRows[0].count,
      },
    })
  } catch (error) {
    console.error('获取库存摘要错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/adjust', async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    const { productId, type, quantity, reason, operatorId } = req.body

    if (!productId || !type || !quantity || !operatorId) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息',
      })
    }

    await connection.beginTransaction()

    const [productRows] = await connection.execute(
      'SELECT stock FROM products WHERE id = ?',
      [productId]
    )

    if (productRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      })
    }

    const previousStock = productRows[0].stock
    let newStock = previousStock

    if (type === 'in') {
      newStock = previousStock + quantity
    } else if (type === 'out') {
      if (previousStock < quantity) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: '库存不足',
        })
      }
      newStock = previousStock - quantity
    } else if (type === 'adjustment') {
      newStock = quantity
    }

    await connection.execute(
      'UPDATE products SET stock = ? WHERE id = ?',
      [newStock, productId]
    )

    const logId = crypto.randomUUID()
    await connection.execute(
      `INSERT INTO inventory_logs (id, product_id, type, quantity, previous_stock, new_stock, reason, operator_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, productId, type, quantity, previousStock, newStock, reason || null, operatorId]
    )

    await connection.commit()

    res.json({
      success: true,
      message: '库存调整成功',
      data: {
        previousStock,
        newStock,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('库存调整错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  } finally {
    connection.release()
  }
})

export default router
