# 部署说明

本阶段代码只在本地完成，不自动覆盖当前已上线静态网站。

## 环境变量

复制 `.env.example` 为 `.env`，填写真实值：

```text
APP_BASE_URL=https://caishenye88.com
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
SESSION_SECRET=<long random secret>
DATABASE_URL=sqlite:./database/runtime/app.sqlite
SECURITY_CODE_PEPPER=<long random pepper>
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/ws
```

生成管理员密码 hash：

```powershell
node -e "import('bcryptjs').then(async b=>console.log(await b.hash('你的密码',12)))"
```

## 安装依赖

```powershell
cd backend
npm install
```

或：

```powershell
pnpm install
```

## 启动

```powershell
cd backend
npm start
```

启动后访问：

```text
http://localhost:3000/health
http://localhost:3000/admin/
```

## IIS 反向代理建议

正式上线时建议：

- IIS 继续负责 HTTPS
- 后端 Node 监听 `127.0.0.1:3000`
- IIS URL Rewrite 反向代理 `/api/*`、`/admin/*`、`/ws`
- 当前静态站点暂不替换，等测试确认后再切

## 不影响当前线上网站

本次修改在本地 `backend/ database/ docs/ scripts/` 中完成。没有执行服务器覆盖命令，没有修改 `C:\Sites\caishenye88`。
