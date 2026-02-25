import { Router } from 'express'
import { pool } from '../config/database.js'
import { logOperation } from './logs.js'

const router = Router()

router.post('/shift/start', async (req, res) => {
  try {
    const { cashierId, cashierName, startCash } = req.body

    const [activeShift] = await pool.execute(
      'SELECT id FROM shift_records WHERE cashier_id = ? AND status = "active"',
      [cashierId]
    )

    if (activeShift.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您已有进行中的班次，请先结束当前班次',
      })
    }

    const shiftId = crypto.randomUUID()
    const startTime = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.execute(
      `INSERT INTO shift_records (id, cashier_id, cashier_name, start_time, start_cash, status) 
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [shiftId, cashierId, cashierName, startTime, startCash || 0]
    )

    logOperation({
      userId: cashierId,
      userName: cashierName,
      action: 'shift_start',
      module: 'shift',
      description: `开班, 起始现金: ¥${startCash || 0}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '开班成功',
      data: {
        id: shiftId,
        startTime,
        startCash: startCash || 0,
      },
    })
  } catch (error) {
    console.error('开班错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/shift/end', async (req, res) => {
  try {
    const { cashierId, endCash, notes } = req.body

    const [activeShift] = await pool.execute(
      'SELECT * FROM shift_records WHERE cashier_id = ? AND status = "active"',
      [cashierId]
    )

    if (activeShift.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有进行中的班次',
      })
    }

    const shift = activeShift[0]
    const endTime = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const [salesData] = await pool.execute(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'wechat' THEN total_amount ELSE 0 END), 0) as wechat_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'alipay' THEN total_amount ELSE 0 END), 0) as alipay_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'member_balance' THEN total_amount ELSE 0 END), 0) as member_balance_sales
       FROM transactions 
       WHERE cashier_id = ? AND created_at >= ? AND status != 'cancelled'`,
      [cashierId, shift.start_time]
    )

    const [refundData] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT r.transaction_id) as refund_count,
        COALESCE(SUM(r.amount), 0) as refund_amount
       FROM refunds r
       JOIN transactions t ON r.transaction_id = t.id
       WHERE t.cashier_id = ? AND r.created_at >= ?`,
      [cashierId, shift.start_time]
    )

    const sales = salesData[0]
    const refunds = refundData[0]

    await pool.execute(
      `UPDATE shift_records SET 
        end_time = ?, 
        end_cash = ?, 
        total_sales = ?,
        cash_sales = ?,
        card_sales = ?,
        wechat_sales = ?,
        alipay_sales = ?,
        member_balance_sales = ?,
        transaction_count = ?,
        refund_count = ?,
        refund_amount = ?,
        notes = ?,
        status = 'completed'
       WHERE id = ?`,
      [
        endTime,
        endCash || 0,
        sales.total_sales,
        sales.cash_sales,
        sales.card_sales,
        sales.wechat_sales,
        sales.alipay_sales,
        sales.member_balance_sales,
        sales.transaction_count,
        refunds.refund_count,
        refunds.refund_amount,
        notes || null,
        shift.id,
      ]
    )

    logOperation({
      userId: cashierId,
      userName: shift.cashier_name,
      action: 'shift_end',
      module: 'shift',
      description: `交接班, 销售总额: ¥${parseFloat(sales.total_sales).toFixed(2)}, 交易笔数: ${sales.transaction_count}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '交接班成功',
      data: {
        shiftId: shift.id,
        startTime: shift.start_time,
        endTime,
        startCash: parseFloat(shift.start_cash),
        endCash: endCash || 0,
        totalSales: parseFloat(sales.total_sales),
        cashSales: parseFloat(sales.cash_sales),
        cardSales: parseFloat(sales.card_sales),
        wechatSales: parseFloat(sales.wechat_sales),
        alipaySales: parseFloat(sales.alipay_sales),
        memberBalanceSales: parseFloat(sales.member_balance_sales),
        transactionCount: sales.transaction_count,
        refundCount: refunds.refund_count,
        refundAmount: parseFloat(refunds.refund_amount),
      },
    })
  } catch (error) {
    console.error('交接班错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/shift/active', async (req, res) => {
  try {
    const { cashierId } = req.query

    const [rows] = await pool.execute(
      'SELECT * FROM shift_records WHERE cashier_id = ? AND status = "active"',
      [cashierId]
    )

    res.json({
      success: true,
      data: rows.length > 0 ? rows[0] : null,
    })
  } catch (error) {
    console.error('获取当前班次错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/shift/history', async (req, res) => {
  try {
    const { cashierId, startDate, endDate, page = 1, pageSize = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    let query = 'SELECT * FROM shift_records WHERE 1=1'
    const params = []

    if (cashierId) {
      query += ' AND cashier_id = ?'
      params.push(cashierId)
    }

    if (startDate && endDate) {
      query += ' AND DATE(start_time) BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }

    query += ` ORDER BY start_time DESC LIMIT ${limit} OFFSET ${offset}`

    const [rows] = await pool.execute(query, params)

    let countQuery = 'SELECT COUNT(*) as total FROM shift_records WHERE 1=1'
    const countParams = []
    if (cashierId) {
      countQuery += ' AND cashier_id = ?'
      countParams.push(cashierId)
    }
    if (startDate && endDate) {
      countQuery += ' AND DATE(start_time) BETWEEN ? AND ?'
      countParams.push(startDate, endDate)
    }
    const [countRows] = await pool.execute(countQuery, countParams)

    res.json({
      success: true,
      data: {
        list: rows,
        total: countRows[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    })
  } catch (error) {
    console.error('获取交接班记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
