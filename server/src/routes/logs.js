import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

export async function logOperation({ userId, userName, action, module, description, ipAddress }) {
  try {
    const logId = crypto.randomUUID()
    await pool.execute(
      `INSERT INTO operation_logs (id, user_id, user_name, action, module, description, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logId, userId, userName, action, module, description, ipAddress || null]
    )
  } catch (error) {
    console.error('记录操作日志错误:', error)
  }
}

router.get('/logs', async (req, res) => {
  try {
    const { userId, action, module, startDate, endDate, page = 1, pageSize = 50 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    let query = 'SELECT * FROM operation_logs WHERE 1=1'
    const params = []

    if (userId) {
      query += ' AND user_id = ?'
      params.push(userId)
    }

    if (action) {
      query += ' AND action = ?'
      params.push(action)
    }

    if (module) {
      query += ' AND module = ?'
      params.push(module)
    }

    if (startDate && endDate) {
      query += ' AND DATE(created_at) BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const [rows] = await pool.execute(query, params)

    let countQuery = 'SELECT COUNT(*) as total FROM operation_logs WHERE 1=1'
    const countParams = []
    if (userId) {
      countQuery += ' AND user_id = ?'
      countParams.push(userId)
    }
    if (action) {
      countQuery += ' AND action = ?'
      countParams.push(action)
    }
    if (module) {
      countQuery += ' AND module = ?'
      countParams.push(module)
    }
    if (startDate && endDate) {
      countQuery += ' AND DATE(created_at) BETWEEN ? AND ?'
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
    console.error('获取操作日志错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/logs/actions', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT action FROM operation_logs ORDER BY action'
    )
    res.json({
      success: true,
      data: rows.map(r => r.action),
    })
  } catch (error) {
    console.error('获取操作类型错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/logs/modules', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT module FROM operation_logs ORDER BY module'
    )
    res.json({
      success: true,
      data: rows.map(r => r.module),
    })
  } catch (error) {
    console.error('获取模块列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
