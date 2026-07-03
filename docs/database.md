# 数据库结构说明

数据库使用 SQLite，启动时开启 WAL：

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

后端启动时会读取 `database/schema.sql` 自动建表。

## admin_users

管理员账号表。

- `password_hash` 只保存 bcrypt hash
- `status` 支持 active / disabled
- `last_login_at` 保存最近登录时间

## security_codes

客户安全码表。

字段覆盖：

- 安全码 hash：`code_hash`
- 客户名称：`customer_name`
- 联系方式：`contact`
- 备注：`remark`
- 创建时间：`created_at`
- 到期时间：`expires_at`
- 永久授权：`permanent`
- 是否启用：`enabled`
- 登录次数：`login_count`
- 最后登录时间：`last_login_at`
- 最后登录 IP：`last_login_ip`
- 当前在线状态：`online`
- 逻辑删除：`deleted_at`

不保存明文安全码，只保存 hash 和预览字段 `code_preview`。

## projects

统计项目表。

- `mode`：`standalone` 或 `collaboration`
- 模式只在创建时写入，后续不提供修改 API
- `deleted_at` 用于逻辑删除

## project_members

项目成员表，用于联合模式在线成员。

- 成员角色：owner / member
- 在线状态
- 最后活跃时间
- 设备信息
- IP

## sessions

登录会话表。

- 管理员使用 `admin_user_id`
- 客户使用 `security_code_id`
- token 和 CSRF token 只保存 hash
- 支持过期和撤销

## orders

注单表。

- 所属项目：`project_id`
- 创建人安全码：`security_code_id`
- 创建成员：`created_by_member_id`
- `deleted_at`、`deleted_by_member_id`、`delete_reason` 用于逻辑删除
- `version` 防止后续并发覆盖

## order_revisions

注单完整历史表。

保存：

- 新增
- 修改
- 删除
- 恢复
- 操作前 JSON
- 操作后 JSON
- 原因
- IP
- 设备信息

## audit_logs

审计日志表。

保存：

- 登录
- 新增
- 修改
- 删除
- 恢复
- 踢出成员
- 异常

## PostgreSQL 迁移准备

- 主键使用文本 UUID 风格
- JSON 暂存 TEXT，未来可迁移 JSONB
- 业务计算放后端服务层
- 不依赖 SQLite 专属业务逻辑
