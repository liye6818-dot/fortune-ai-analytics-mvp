# API 说明

第二阶段新增服务端安全码、项目模式、注单、日志、在线状态接口。所有业务写操作都由服务器校验安全码或管理员 token，禁止前端绕过。

## 通用

鉴权头：

```http
Authorization: Bearer <token>
X-CSRF-Token: <csrfToken>
```

`POST`、`PATCH`、`DELETE` 必须带 `X-CSRF-Token`。

## 健康检查

```http
GET /health
```

## 管理后台

后台页面：

```http
GET /admin/
```

### 管理员登录

```http
POST /api/admin/login
```

请求：

```json
{
  "username": "admin",
  "password": "password"
}
```

返回：

```json
{
  "token": "...",
  "csrfToken": "...",
  "expiresAt": "..."
}
```

### 安全码列表

```http
GET /api/admin/security-codes?q=<keyword>
```

### 新增安全码

```http
POST /api/admin/security-codes
```

```json
{
  "code": "customer-safe-code",
  "customerName": "客户名称",
  "contact": "联系方式",
  "remark": "备注",
  "duration": "365"
}
```

`duration` 支持：`30`、`90`、`180`、`365`、`permanent`、`custom`。

### 修改安全码

```http
PATCH /api/admin/security-codes/:id
```

支持修改客户名称、联系方式、备注、启用状态、到期时间。

### 一键续期

```http
POST /api/admin/security-codes/:id/renew
```

### 删除安全码

```http
DELETE /api/admin/security-codes/:id
```

逻辑删除，不物理删除。

### 项目列表

```http
GET /api/admin/projects
```

### 项目成员

```http
GET /api/admin/projects/:projectId/members
```

### 踢出成员

```http
POST /api/admin/projects/:projectId/members/:memberId/kick
```

### 日志查询

```http
GET /api/admin/logs?action=<optional>
```

## 客户端

### 安全码登录

```http
POST /api/auth/security-code
```

```json
{
  "code": "客户安全码",
  "deviceId": "device-id",
  "deviceInfo": "browser/device"
}
```

服务器校验：

- 安全码 hash
- 是否启用
- 是否到期
- 是否逻辑删除
- 登录次数、IP、最后登录时间、在线状态

### 心跳

```http
POST /api/session/heartbeat
```

用于更新在线状态、最后活跃时间、IP、设备信息。

### 退出

```http
POST /api/session/logout
```

## 项目

### 项目列表

```http
GET /api/projects
```

### 创建项目

```http
POST /api/projects
```

```json
{
  "name": "项目名称",
  "mode": "standalone"
}
```

`mode` 只允许创建时指定：`standalone` 或 `collaboration`。后续不提供修改模式 API。

## 注单

所有注单接口都依赖服务器认证上下文。

### 查询注单与服务器统计

```http
GET /api/projects/:projectId/orders
```

返回包含 `items` 和服务器计算的 `summary`。

### 新增注单

```http
POST /api/projects/:projectId/orders
```

### 修改注单

```http
PATCH /api/projects/:projectId/orders/:orderId
```

### 删除注单

```http
DELETE /api/projects/:projectId/orders/:orderId
```

逻辑删除，写入 `order_revisions` 和 `audit_logs`。

### 恢复注单

```http
POST /api/projects/:projectId/orders/:orderId/restore
```

### 降级轮询同步

```http
GET /api/projects/:projectId/sync?since=<iso-time>
```

WebSocket 不可用时使用。

## WebSocket

路径由 `.env` 配置：

```text
WEBSOCKET_PATH=/ws
```

连接示例：

```text
wss://domain/ws?project_id=prj_xxx
```

联合模式下，服务器广播：

- `order:create`
- `order:update`
- `order:delete`
- `order:restore`
- `member:kicked`
