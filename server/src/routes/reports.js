import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const [rows] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_sales,
        SUM(total_amount * 0.3) as estimated_profit
      FROM transactions
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]])

    res.json({
      success: true,
      data: rows.map((row) => ({
        date: row.date,
        transactionCount: row.transaction_count,
        totalSales: parseFloat(row.total_sales || 0),
        estimatedProfit: parseFloat(row.estimated_profit || 0),
      })),
    })
  } catch (error) {
    console.error('获取日报表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/category', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT ti.product_id) as product_count,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_sales
      FROM transaction_items ti
      LEFT JOIN products p ON ti.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.status = 'completed'
      GROUP BY c.id, c.name
      ORDER BY total_sales DESC
    `)

    res.json({
      success: true,
      data: rows.map((row) => ({
        categoryName: row.category_name,
        productCount: row.product_count,
        totalQuantity: row.total_quantity,
        totalSales: parseFloat(row.total_sales || 0),
      })),
    })
  } catch (error) {
    console.error('获取分类报表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/top-products', async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const [rows] = await pool.execute(`
      SELECT 
        p.name as product_name,
        p.barcode,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_revenue
      FROM transaction_items ti
      LEFT JOIN products p ON ti.product_id = p.id
      LEFT JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.status = 'completed'
      GROUP BY p.id, p.name, p.barcode
      ORDER BY total_quantity DESC
      LIMIT ?
    `, [parseInt(limit)])

    res.json({
      success: true,
      data: rows.map((row) => ({
        productName: row.product_name,
        barcode: row.barcode,
        totalQuantity: row.total_quantity,
        totalRevenue: parseFloat(row.total_revenue || 0),
      })),
    })
  } catch (error) {
    console.error('获取热销商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
