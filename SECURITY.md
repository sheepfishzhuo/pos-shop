# Electron 安全说明

## 关于CSP警告

您在开发环境中看到的警告是**正常且预期的行为**：

```
Electron Security Warning (Insecure Content-Security-Policy)
This renderer process has either no Content Security Policy set or a policy with "unsafe-eval" enabled.
```

### 为什么会出现这个警告？

在开发环境中，Vite的热重载（HMR）功能需要使用`unsafe-eval`和`unsafe-inline`来：
- 实现代码热更新
- 支持Source Map
- 提供开发工具支持

### 我们的解决方案

我们已经实现了**双模式CSP策略**：

#### 开发环境（宽松策略）
```javascript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:"
"connect-src 'self' ws://localhost:5173 http://localhost:3000"
```
- 允许Vite开发服务器正常工作
- 支持热重载和调试
- 允许WebSocket连接（HMR需要）

#### 生产环境（严格策略）
```javascript
"script-src 'self'"
"connect-src 'self' http://localhost:3000"
```
- 禁止`unsafe-eval`和`unsafe-inline`
- 只允许加载同源脚本
- 更高的安全性

### 如何验证

#### 开发环境
```bash
npm run electron:dev
```
您会看到警告信息，这是正常的。

#### 生产环境
```bash
npm run electron:build
```
打包后的应用将使用严格的CSP策略，警告将消失。

## 其他安全措施

我们已经实现了以下Electron安全最佳实践：

### 1. 禁用Node.js集成
```javascript
webPreferences: {
  nodeIntegration: false,  // ✅ 已禁用
  contextIsolation: true,  // ✅ 已启用上下文隔离
  webSecurity: true,       // ✅ 已启用Web安全
}
```

### 2. 使用预加载脚本
```javascript
preload: path.join(__dirname, '../dist-electron/preload.js')
```
通过预加载脚本安全地暴露有限的API给渲染进程。

### 3. 上下文隔离
启用`contextIsolation`确保预加载脚本和渲染进程的JavaScript环境隔离。

### 4. 安全的IPC通信
所有IPC通信都通过`contextBridge`安全暴露，而不是直接暴露Node.js API。

## 生产环境建议

### 1. 构建前检查
```bash
# 确保没有硬编码的密钥
grep -r "password\|secret\|key" src/

# 检查依赖安全
npm audit
```

### 2. 代码签名
为您的应用添加代码签名，避免被杀毒软件误报。

### 3. 自动更新
实现安全的自动更新机制：
```bash
npm install electron-updater
```

### 4. 内容安全策略
生产环境已配置严格的CSP，无需额外操作。

## 参考资源

- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Electron Best Practices](https://www.electronjs.org/docs/latest/tutorial/security-best-practices)

## 常见问题

### Q: 开发环境的警告会影响应用吗？
A: 不会。这只是Electron的安全提示，提醒开发者注意安全配置。在生产环境中会自动使用更严格的策略。

### Q: 如何在生产环境中测试CSP？
A: 运行`npm run electron:build`构建应用，然后安装并运行。生产版本不会有警告。

### Q: 可以完全禁用警告吗？
A: 不建议。警告有助于提醒开发者关注安全问题。但在生产构建中，警告会自动消失。

## 安全检查清单

- [x] 禁用`nodeIntegration`
- [x] 启用`contextIsolation`
- [x] 启用`webSecurity`
- [x] 使用`preload`脚本
- [x] 实现CSP策略
- [x] 区分开发/生产环境
- [x] 使用`contextBridge`暴露API
- [ ] 代码签名（生产环境）
- [ ] 实现自动更新（可选）
- [ ] 安全审计（生产环境）

---

**注意**：开发环境的CSP警告是预期行为，不影响应用功能。生产环境会自动应用更严格的安全策略。
