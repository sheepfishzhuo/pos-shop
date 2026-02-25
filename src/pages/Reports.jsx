import { useState } from 'react'
import { Card, Row, Col, DatePicker, Select } from 'antd'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const { RangePicker } = DatePicker

const Reports = () => {
  const [timeRange, setTimeRange] = useState('week')

  const salesData = [
    { date: '2024-01-09', sales: 4500, profit: 1200 },
    { date: '2024-01-10', sales: 3800, profit: 950 },
    { date: '2024-01-11', sales: 5200, profit: 1400 },
    { date: '2024-01-12', sales: 4800, profit: 1300 },
    { date: '2024-01-13', sales: 6100, profit: 1800 },
    { date: '2024-01-14', sales: 5500, profit: 1500 },
    { date: '2024-01-15', sales: 5800, profit: 1600 },
  ]

  const categoryData = [
    { name: '饮料', value: 35 },
    { name: '食品', value: 28 },
    { name: '零食', value: 20 },
    { name: '日用品', value: 12 },
    { name: '文具', value: 5 },
  ]

  const topProducts = [
    { name: '可口可乐 500ml', sales: 156, revenue: 546 },
    { name: '农夫山泉 550ml', sales: 142, revenue: 284 },
    { name: '康师傅红烧牛肉面', sales: 98, revenue: 441 },
    { name: '旺旺雪饼', sales: 76, revenue: 608 },
    { name: '飘柔洗发水', sales: 45, revenue: 1575 },
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="reports-page">
      <div className="report-controls" style={{ marginBottom: 24 }}>
        <Select
          value={timeRange}
          onChange={setTimeRange}
          style={{ width: 200 }}
          options={[
            { label: '最近7天', value: 'week' },
            { label: '最近30天', value: 'month' },
            { label: '最近3个月', value: 'quarter' },
            { label: '最近一年', value: 'year' },
          ]}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="销售趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" name="销售额" />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="利润" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="分类销售占比">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="热销商品TOP5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" name="销量" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Reports
