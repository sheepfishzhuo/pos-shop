import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/database.js'
import { logOperation } from './logs.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
      })
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      })
    }

    const user = rows[0]
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    )

    logOperation({
      userId: user.id,
      userName: user.name,
      action: 'login',
      module: 'auth',
      description: `用户 ${user.name} 登录系统`,
      ipAddress: req.ip,
    })

    const [permRows] = await pool.execute(
      `SELECT p.code FROM permissions p 
       JOIN role_permissions rp ON p.id = rp.permission_id 
       WHERE rp.role = ?`,
      [user.role]
    )

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          permissions: permRows.map(r => r.code),
        },
        token,
      },
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role } = req.body

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息',
      })
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = crypto.randomUUID()

    await pool.execute(
      'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, username, hashedPassword, name, role || 'cashier']
    )

    logOperation({
      userId: null,
      userName: 'system',
      action: 'create',
      module: 'user',
      description: `创建用户: ${username} (${name})`,
      ipAddress: req.ip,
    })

    res.status(201).json({
      success: true,
      message: '注册成功',
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'
    )

    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, role } = req.body

    await pool.execute(
      'UPDATE users SET name = ?, role = ? WHERE id = ?',
      [name, role, id]
    )

    logOperation({
      userId: null,
      userName: 'system',
      action: 'update',
      module: 'user',
      description: `更新用户信息: ${name}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '更新成功',
    })
  } catch (error) {
    console.error('更新用户错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [userRows] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [id]
    )

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      })
    }

    if (userRows[0].role === 'admin') {
      const [adminCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
      )
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能删除最后一个管理员',
        })
      }
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id])

    logOperation({
      userId: null,
      userName: 'system',
      action: 'delete',
      module: 'user',
      description: `删除用户ID: ${id}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码至少6个字符',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    )

    res.json({
      success: true,
      message: '密码重置成功',
    })
  } catch (error) {
    console.error('重置密码错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
