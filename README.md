# 财神爷录单宝 / Fortune AI Analytics MVP

本项目第一阶段只做本地架构整理，不部署服务器，不上线，不修改生产环境。

## 当前目标

- 将项目整理为前后端分离结构。
- 准备私有仓库提交规则，禁止提交真实客户数据和安全码。
- 预留后台、授权、Workspace、WebSocket、日志、SQLite WAL 结构。
- 生成后续开发和部署所需文档。

## 目录

```text
frontend/   现有录单宝前端静态页面
backend/    后台 API 服务骨架
database/   SQLite schema 与迁移资料
scripts/    本地初始化和维护脚本
docs/       项目说明、部署、数据库、API 文档
```

## 禁止提交内容

以下内容已经写入 `.gitignore`，不得提交到 GitHub：

- `.env`
- SQLite 数据库文件：`*.sqlite`、`*.sqlite3`、`*.db`、`*.db-wal`、`*.db-shm`
- `uploads/`
- `logs/`
- `backups/`
- 临时缓存：`tmp/`、`temp/`、`cache/`、`.cache/`
- 客户安全码数据：`customer-security-codes/`、`security-codes/`、`client-secrets/`

## 本地启动准备

第一阶段不要求启动后端。后续如需本地运行：

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 填写真实密钥和本地数据库路径。
3. 执行 `deploy.ps1 -CheckOnly` 检查目录结构。
4. 后端依赖安装和数据库初始化放到第二阶段确认后执行。

## GitHub Private Repository

本地已按私有仓库规则整理。正式迁移/切换 GitHub Private Repository 前，应确认：

- `.gitignore` 已生效。
- 没有真实 `.env`、数据库、上传文件、日志、备份和客户安全码进入暂存区。
- 当前阶段不推送、不部署，等待确认后再操作 GitHub。

## 文档

- [项目目录说明](docs/project-structure.md)
- [部署说明](docs/deployment.md)
- [数据库结构说明](docs/database.md)
- [API 说明](docs/api.md)
- [权限与授权设计](docs/auth-workspace.md)
- [GitHub 私有仓库迁移说明](docs/github-private.md)
