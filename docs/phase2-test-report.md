# 第二阶段测试报告

## 已执行

```powershell
.\scripts\phase2-static-test.ps1
```

覆盖：

- 后端 JS 语法检查
- 数据库 schema 必需表检查
- API 源码关键接口检查
- `/admin` 页面关键内容检查
- 敏感文件检查

## 当前限制

本机环境无法访问 npm registry：

```text
ERR_PNPM_META_FETCH_FAIL / EACCES
```

因此未能安装 `express`、`better-sqlite3`、`bcryptjs` 等依赖，运行级 API 集成测试需要在可以访问 npm 的环境执行。

## 服务器上线前必须补测

1. `GET /health`
2. 管理员登录
3. 新增安全码
4. 安全码登录
5. 创建单机项目
6. 创建联合项目
7. 新增注单
8. 修改注单
9. 删除注单
10. 恢复注单
11. 查询日志
12. WebSocket 连接
13. 断线后 `/sync` 补数据

## 风险

- 当前静态前端尚未接入新 API，仍需要后续第三阶段适配。
- WebSocket 已预留并可广播服务端事件，但客户端订阅逻辑尚未接入现有页面。
