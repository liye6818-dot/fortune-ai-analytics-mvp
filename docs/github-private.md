# GitHub 私有仓库迁移说明

## 当前状态

第一阶段不部署、不上线、不修改线上环境。

本地已经准备：

- `.gitignore`
- 私密数据禁止提交规则
- 目录结构
- 文档
- 后端和数据库骨架

## 私有仓库要求

GitHub 仓库必须设置为 Private。

如果仓库当前是 Public，后续确认后再执行：

1. 打开 GitHub 仓库。
2. 进入 `Settings`。
3. 进入 `General`。
4. 找到 `Danger Zone`。
5. 选择 `Change repository visibility`。
6. 改为 `Private`。

## 提交前必须检查

禁止进入 GitHub：

- `.env`
- SQLite 数据库
- `uploads/`
- `logs/`
- `backups/`
- 临时缓存
- 客户安全码数据

本地可执行：

```powershell
.\scripts\preflight-check.ps1
```

## 当前 Git 注意事项

当前项目根目录的 `.git` 目录不完整，不能直接作为有效 Git 仓库使用。

当前检测到 `github-pages-deploy/` 目录是一个有效 Git 仓库。继续使用现有仓库时，不新建仓库，保留历史记录。

下一步需要你确认：

1. 把根目录重新初始化为正式项目仓库；或
2. 把 `github-pages-deploy/` 仓库迁移为新的私有项目仓库；或
3. 新建一个全新的 Private Repository，再把整理后的项目首次提交进去。

建议选择第 3 种，最干净，也不会影响现在已经给熟人试用的页面。
