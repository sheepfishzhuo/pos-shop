import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query

    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE 1=1
    `
    const params = []

    if (search) {
      query += ' AND (p.barcode LIKE ? OR p.name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (category) {
      query += ' AND p.category_id = ?'
      params.push(category)
    }

    if (status) {
      query += ' AND p.status = ?'
      params.push(status)
    }

    query += ' ORDER BY p.created_at DESC'

    const [rows] = await pool.execute(query, params)

    const products = rows.map((row) => ({
      id: row.id,
      barcode: row.barcode,
      name: row.name,
      categoryId: row.category_id,
      category: row.category_name,
      price: parseFloat(row.price),
      cost: parseFloat(row.cost),
      stock: row.stock,
      minStock: row.min_stock,
      unit: row.unit,
      supplier: row.supplier,
      imageUrl: row.image_url,
      status: row.status,
      isHot: row.is_hot === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    res.json({
      success: true,
      data: products,
    })
  } catch (error) {
    console.error('获取商品列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/hot/list', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.is_hot = 1 AND p.status = 'active'
       ORDER BY p.name`
    )

    const products = rows.map((row) => ({
      id: row.id,
      barcode: row.barcode,
      name: row.name,
      categoryId: row.category_id,
      category: row.category_name,
      price: parseFloat(row.price),
      cost: parseFloat(row.cost),
      stock: row.stock,
      minStock: row.min_stock,
      unit: row.unit,
      supplier: row.supplier,
      imageUrl: row.image_url,
      status: row.status,
      isHot: row.is_hot === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    res.json({
      success: true,
      data: products,
    })
  } catch (error) {
    console.error('获取热门商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      })
    }

    const product = {
      id: rows[0].id,
      barcode: rows[0].barcode,
      name: rows[0].name,
      categoryId: rows[0].category_id,
      category: rows[0].category_name,
      price: parseFloat(rows[0].price),
      cost: parseFloat(rows[0].cost),
      stock: rows[0].stock,
      minStock: rows[0].min_stock,
      unit: rows[0].unit,
      supplier: rows[0].supplier,
      imageUrl: rows[0].image_url,
      status: rows[0].status,
      isHot: rows[0].is_hot === 1,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    }

    res.json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('获取商品详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/', async (req, res) => {
  try {
    const { barcode, name, categoryId, price, cost, stock, minStock, unit, supplier } = req.body

    if (!barcode || !name || !price || !cost || stock === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: '请填写完整商品信息',
      })
    }

    const [existingProducts] = await pool.execute(
      'SELECT id FROM products WHERE barcode = ?',
      [barcode]
    )

    if (existingProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: '商品条码已存在',
      })
    }

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString().split('T')[0]

    await pool.execute(
      `INSERT INTO products (id, barcode, name, category_id, price, cost, stock, min_stock, unit, supplier, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, barcode, name, categoryId, price, cost, stock, minStock || 10, unit, supplier, createdAt, createdAt]
    )

    res.status(201).json({
      success: true,
      data: {
        id,
        barcode,
        name,
        categoryId,
        price,
        cost,
        stock,
        minStock: minStock || 10,
        unit,
        supplier,
        createdAt,
      },
      message: '商品添加成功',
    })
  } catch (error) {
    console.error('添加商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { barcode, name, categoryId, price, cost, stock, minStock, unit, supplier, status } = req.body

    await pool.execute(
      `UPDATE products 
       SET barcode = ?, name = ?, category_id = ?, price = ?, cost = ?, 
           stock = ?, min_stock = ?, unit = ?, supplier = ?, status = ?
       WHERE id = ?`,
      [barcode, name, categoryId, price, cost, stock, minStock, unit, supplier, status, id]
    )

    res.json({
      success: true,
      message: '商品更新成功',
    })
  } catch (error) {
    console.error('更新商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/:id/hot', async (req, res) => {
  try {
    const { id } = req.params
    const { isHot } = req.body

    await pool.execute(
      'UPDATE products SET is_hot = ? WHERE id = ?',
      [isHot ? 1 : 0, id]
    )

    res.json({
      success: true,
      message: isHot ? '已设为热门商品' : '已取消热门商品',
    })
  } catch (error) {
    console.error('设置热门商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await pool.execute('DELETE FROM products WHERE id = ?', [id])

    res.json({
      success: true,
      message: '商品删除成功',
    })
  } catch (error) {
    console.error('删除商品错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
