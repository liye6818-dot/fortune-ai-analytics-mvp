# 权限、授权与 Workspace 设计

## 后台权限

后台只允许管理员账号密码登录。

管理员能力：

- 新增客户
- 修改安全码
- 设置到期时间
- 禁用客户
- 设置允许设备数量
- 查看审计日志

管理员密码只保存哈希。

## 客户授权

客户端不用账号密码，使用安全码模式。

安全码规则：

- 后台生成或修改安全码。
- 数据库只保存安全码哈希。
- 可设置到期时间。
- 可禁用客户。
- 可限制设备数量。

## 客户模式

### standalone

单机模式。

- 客户拥有独立 `workspace_id`。
- 数据不和其他客户共享。
- WebSocket 同步默认关闭。

### collaboration

协同模式。

- 多个客户可共享同一个 `workspace_id`。
- WebSocket 同步开启。
- 同一 Workspace 的注单、客户结算、风险统计实时同步。

## Workspace

所有业务数据必须有 `workspace_id`。

包括：

- clients
- client_devices
- orders
- audit_logs

这样后续可以做：

- 单客户独立账本
- 多人协同账本
- 按工作区备份和迁移
- PostgreSQL 多租户迁移

## 日志

所有关键操作写入 `audit_logs`：

- 登录
- 新增
- 修改
- 删除
- 异常

日志最少包含：

- actor_type
- actor_id
- action
- entity_type
- entity_id
- workspace_id
- ip_address
- user_agent
- metadata_json
- created_at
