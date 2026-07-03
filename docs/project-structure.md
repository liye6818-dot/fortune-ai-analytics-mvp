# 项目目录说明

## 根目录

```text
frontend/
backend/
database/
scripts/
docs/
.env.example
.gitignore
README.md
deploy.ps1
```

## frontend/

放置当前可用的前端页面：

- `index.html`：录单宝主页面
- `styles.css`：页面样式
- `app.js` / `main.js`：前端业务逻辑
- `license-admin.html`：旧版授权管理页面，后续会迁移为后台 API + Admin 页面

## backend/

后端服务骨架，后续用于：

- 管理员登录
- 客户安全码授权
- Workspace 数据隔离
- SQLite 数据读写
- WebSocket 协同同步
- 审计日志

当前只放结构，不部署。

## database/

数据库结构、迁移脚本和说明。

真实数据库放到 `database/runtime/`，该目录已被 Git 忽略。

## scripts/

本地维护脚本，例如初始化数据库、检查结构、备份等。

## docs/

项目说明文档，交付、二次开发、部署前确认都从这里看。

## backups/

历史备份和本地备份目录，已被 Git 忽略，不提交。
