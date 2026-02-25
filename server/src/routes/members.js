import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { search, level, status } = req.query
    
    let query = 'SELECT * FROM members WHERE 1=1'
    const params = []
    
    if (search) {
      query += ' AND (member_no LIKE ? OR name LIKE ? OR phone LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }
    
    if (level) {
      query += ' AND level = ?'
      params.push(level)
    }
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const [rows] = await pool.execute(query, params)
    
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('获取会员列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const [memberRows] = await pool.execute(
      'SELECT * FROM members WHERE id = ?',
      [id]
    )
    
    if (memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '会员不存在',
      })
    }
    
    const [pointsRows] = await pool.execute(
      'SELECT * FROM member_points_log WHERE member_id = ? ORDER BY created_at DESC LIMIT 20',
      [id]
    )
    
    const [rechargeRows] = await pool.execute(
      'SELECT * FROM member_recharge_log WHERE member_id = ? ORDER BY created_at DESC LIMIT 20',
      [id]
    )
    
    const [transactionRows] = await pool.execute(
      `SELECT t.*, u.name as cashier_name 
       FROM transactions t 
       LEFT JOIN users u ON t.cashier_id = u.id 
       WHERE t.member_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT 20`,
      [id]
    )
    
    res.json({
      success: true,
      data: {
        ...memberRows[0],
        pointsHistory: pointsRows,
        rechargeHistory: rechargeRows,
        transactions: transactionRows,
      },
    })
  } catch (error) {
    console.error('获取会员详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, gender, birthday, level } = req.body
    
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: '姓名和手机号不能为空',
      })
    }
    
    const [existingMembers] = await pool.execute(
      'SELECT id FROM members WHERE phone = ?',
      [phone]
    )
    
    if (existingMembers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该手机号已注册',
      })
    }
    
    const id = crypto.randomUUID()
    
    const memberNo = `M${new Date().getFullYear()}${String(Date.now()).slice(-6)}`
    
    await pool.execute(
      `INSERT INTO members (id, member_no, name, phone, email, gender, birthday, level) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, memberNo, name, phone, email || null, gender || 'male', birthday || null, level || 'normal']
    )
    
    const [newMember] = await pool.execute(
      'SELECT * FROM members WHERE id = ?',
      [id]
    )
    
    res.status(201).json({
      success: true,
      data: newMember[0],
      message: '会员创建成功',
    })
  } catch (error) {
    console.error('创建会员错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, phone, email, gender, birthday, level, status } = req.body
    
    const [existingMembers] = await pool.execute(
      'SELECT id FROM members WHERE id = ?',
      [id]
    )
    
    if (existingMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: '会员不存在',
      })
    }
    
    if (phone) {
      const [phoneCheck] = await pool.execute(
        'SELECT id FROM members WHERE phone = ? AND id != ?',
        [phone, id]
      )
      
      if (phoneCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: '该手机号已被其他会员使用',
        })
      }
    }
    
    await pool.execute(
      `UPDATE members 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           gender = COALESCE(?, gender),
           birthday = COALESCE(?, birthday),
           level = COALESCE(?, level),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name, phone, email, gender, birthday, level, status, id]
    )
    
    const [updatedMember] = await pool.execute(
      'SELECT * FROM members WHERE id = ?',
      [id]
    )
    
    res.json({
      success: true,
      data: updatedMember[0],
      message: '会员信息更新成功',
    })
  } catch (error) {
    console.error('更新会员错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/:id/recharge', async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    const { id } = req.params
    const { amount, paymentMethod, operatorId, remark } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '充值金额必须大于0',
      })
    }
    
    await connection.beginTransaction()
    
    const [memberRows] = await connection.execute(
      'SELECT * FROM members WHERE id = ? FOR UPDATE',
      [id]
    )
    
    if (memberRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: '会员不存在',
      })
    }
    
    const currentBalance = parseFloat(memberRows[0].balance)
    const newBalance = currentBalance + parseFloat(amount)
    
    await connection.execute(
      'UPDATE members SET balance = ? WHERE id = ?',
      [newBalance, id]
    )
    
    const logId = crypto.randomUUID()
    
    await connection.execute(
      `INSERT INTO member_recharge_log (id, member_id, amount, payment_method, operator_id, remark) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [logId, id, amount, paymentMethod, operatorId || null, remark || null]
    )
    
    const balanceLogId = crypto.randomUUID()
    await connection.execute(
      `INSERT INTO member_balance_log (id, member_id, type, amount, balance, source, operator_id, remark) 
       VALUES (?, ?, 'recharge', ?, ?, '会员充值', ?, ?)`,
      [balanceLogId, id, amount, newBalance, operatorId || null, remark || null]
    )
    
    await connection.commit()
    
    res.json({
      success: true,
      message: '充值成功',
      data: {
        previousBalance: currentBalance,
        rechargeAmount: parseFloat(amount),
        newBalance: newBalance,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('会员充值错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  } finally {
    connection.release()
  }
})

router.post('/:id/points', async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    const { id } = req.params
    const { type, points, source, transactionId, operatorId, remark } = req.body
    
    if (!type || !points) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息',
      })
    }
    
    await connection.beginTransaction()
    
    const [memberRows] = await connection.execute(
      'SELECT * FROM members WHERE id = ? FOR UPDATE',
      [id]
    )
    
    if (memberRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: '会员不存在',
      })
    }
    
    const currentPoints = memberRows[0].points
    let newPoints = currentPoints
    
    if (type === 'earn') {
      newPoints = currentPoints + points
    } else if (type === 'redeem') {
      if (currentPoints < points) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: '积分不足',
        })
      }
      newPoints = currentPoints - points
    } else if (type === 'adjust') {
      newPoints = points
    }
    
    await connection.execute(
      'UPDATE members SET points = ? WHERE id = ?',
      [newPoints, id]
    )
    
    const logId = crypto.randomUUID()
    
    await connection.execute(
      `INSERT INTO member_points_log (id, member_id, type, points, balance, source, transaction_id, operator_id, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, id, type, points, newPoints, source, transactionId, operatorId, remark]
    )
    
    await connection.commit()
    
    res.json({
      success: true,
      message: '积分操作成功',
      data: {
        previousPoints: currentPoints,
        changedPoints: points,
        newPoints: newPoints,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('积分操作错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  } finally {
    connection.release()
  }
})

router.get('/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    
    const [rows] = await pool.execute(
      'SELECT * FROM members WHERE phone = ?',
      [phone]
    )
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '会员不存在',
      })
    }
    
    res.json({
      success: true,
      data: rows[0],
    })
  } catch (error) {
    console.error('查询会员错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
