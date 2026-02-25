import { Card, Form, Input, Button, Switch, Divider, App } from 'antd'
import { useAuthStore } from '../stores/authStore'

const Settings = () => {
  const { user } = useAuthStore()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const handleSave = () => {
    message.success('设置保存成功')
  }

  return (
    <div className="settings-page">
      <Card title="个人信息" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" initialValues={user || {}}>
          <Form.Item label="用户名" name="username">
            <Input disabled />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="role">
            <Input disabled />
          </Form.Item>
          <Button type="primary" onClick={handleSave}>
            保存修改
          </Button>
        </Form>
      </Card>

      <Card title="系统设置" style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Form.Item label="自动打印小票">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="库存预警提醒">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="交易成功提示音">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="收银台全屏模式">
            <Switch />
          </Form.Item>
        </Form>
      </Card>

      <Card title="数据库设置">
        <Form layout="vertical">
          <Form.Item label="数据库地址">
            <Input placeholder="localhost" defaultValue="localhost" />
          </Form.Item>
          <Form.Item label="端口号">
            <Input placeholder="3306" defaultValue="3306" />
          </Form.Item>
          <Form.Item label="数据库名">
            <Input placeholder="pos_system" defaultValue="pos_system" />
          </Form.Item>
          <Form.Item label="用户名">
            <Input placeholder="root" defaultValue="root" />
          </Form.Item>
          <Form.Item label="密码">
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" onClick={handleSave}>
            保存配置
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default Settings
