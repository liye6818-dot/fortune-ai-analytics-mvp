# 回滚方案

## 当前阶段

第二阶段未部署到线上服务器，不影响当前网站。

## 本地回滚

如需要撤销第二阶段代码：

```powershell
git status
git revert <commit-id>
```

不要使用 `git reset --hard`，避免误删用户本地改动。

## 服务器回滚

正式部署后建议：

1. 部署前备份 `C:\Sites\caishenye88`
2. 部署前备份 SQLite 数据库
3. Node 后端独立目录部署，例如 `C:\Apps\caishenye88-api`
4. IIS 反向代理规则单独导出

回滚步骤：

1. 停止 Node 服务
2. 恢复旧 IIS 反向代理配置
3. 恢复旧静态目录
4. 恢复数据库备份
5. 重启 IIS

## 数据回滚原则

注单删除采用逻辑删除，日志永久保留。除非用户明确要求，不做物理删除。
