# Cloudflare 部署说明

## 结论

如果你现在只是把仓库接到了 Cloudflare Pages，`git push` 通常只会触发前端静态构建，不会自动部署这个项目里的 Worker 后端，也不会自动执行 D1 migration。

本项目当前采用 Cloudflare Workers Static Assets：

- `dist` 承载前端静态资源。
- `/api/*` 由 `server/app.ts` Worker 先处理。
- D1 数据库通过 `wrangler.jsonc` 里的 `DB` binding 绑定。
- `npx wrangler deploy` 会部署 Worker 后端，并上传当前 `dist` 静态资源；它不是“只部署后端”。

## 本地开发

第一次本地开发或本地 D1 被清空后，先执行本地 migration：

```bash
npm run db:migrate:local
```

启动 Worker 后端和前端 assets：

```bash
npm run worker:dev
```

默认端口是 `8787`，本地访问：

```text
http://127.0.0.1:8787
```

如果只启动 Vite 前端：

```bash
npm run dev
```

此时前端 API 地址需要通过 `.env.development` 指向本地 Worker：

```text
VITE_API_BASE_URL=http://127.0.0.1:8787
```

## 首次部署准备

登录 Wrangler：

```bash
npx wrangler login
```

如果浏览器打开 `http://localhost:8976/oauth/callback`，这是 Wrangler 登录流程自己监听的临时回调地址，不需要你手动启动这个端口。

确认 `wrangler.jsonc` 的 D1 配置已经是 Cloudflare 真实数据库 ID：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "the-chosen-one",
    "database_id": "dd008314-617f-453b-8280-72939ba30286",
    "migrations_dir": "migrations"
  }
]
```

如果换了新的 D1 数据库，需要先创建：

```bash
npx wrangler d1 create the-chosen-one
```

然后把返回的 `database_id` 填回 `wrangler.jsonc`。

## 远程数据库 migration

部署远程环境前，先执行远程 D1 migration：

```bash
npx wrangler d1 migrations apply the-chosen-one --remote
```

这个命令会创建远程表结构，并执行 seed：

- `admin_users`
- `users`
- `birth_charts`
- `ai_configs`
- `payment_configs`
- `orders`
- `api_call_logs`

当前 seed 默认后台账号：

```text
账号：admin
密码：admin123
```

正式环境不要长期使用默认密码。

## 设置生产密钥

当前 `wrangler.jsonc` 里有本地开发用的默认值：

```jsonc
"vars": {
  "JWT_SECRET": "local-dev-jwt-secret-change-before-production",
  "CONFIG_ENCRYPTION_KEY": "local-dev-config-encryption-key-change"
}
```

正式环境建议改成 Cloudflare Secret，不要把真实密钥写进仓库。

设置 Worker Secret：

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put CONFIG_ENCRYPTION_KEY
```

`CONFIG_ENCRYPTION_KEY` 用于加密后台保存的模型 Key 和支付私钥，建议使用足够长的随机字符串。

## 部署 Worker 后端和前端 assets

先构建前端：

```bash
npm run build
```

再部署：

```bash
npx wrangler deploy
```

部署完成后，Cloudflare 会发布：

- Worker API：`/api/*`
- 前端页面：`dist`
- SPA fallback：未匹配静态资源时返回 `index.html`

`wrangler.jsonc` 里的关键配置是：

```jsonc
"assets": {
  "directory": "./dist",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/api/*"]
}
```

`run_worker_first: ["/api/*"]` 表示 `/api/*` 请求会先进入 Worker 后端，而不是被前端静态资源接管。

## git push 会不会自动部署后端

默认不会。

只有在下面任一情况成立时，`git push` 才会自动部署后端：

- 你配置了 Cloudflare Workers 的 Git 集成，并且构建命令包含 `npx wrangler deploy`。
- 你在 GitHub Actions / CI 里写了部署流程，并配置了 Cloudflare API Token。
- 你把 Cloudflare Pages 的构建命令改成能执行 Worker 部署，但这通常不建议和 Pages 静态部署混在一起。

如果当前 Cloudflare 项目只是 Pages 自动部署：

```text
git push -> npm run build -> 发布静态前端
```

那它不会自动执行：

```bash
npx wrangler deploy
```

也不会自动执行：

```bash
npx wrangler d1 migrations apply the-chosen-one --remote
```

## 配置 git push 自动部署前后端

推荐使用 Cloudflare Workers Builds，而不是继续用 Pages 的静态自动部署。

### 方案 A：Cloudflare Workers Builds 推荐

进入 Cloudflare Dashboard：

```text
Workers & Pages -> Workers -> 选择或创建 Worker: the-chosen-one -> Settings -> Builds
```

连接 GitHub/GitLab 仓库后，设置：

```text
Production branch: main
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

这个流程是：

```text
git push main
  -> Cloudflare 拉取代码
  -> npm install
  -> npm run build
  -> npx wrangler deploy
  -> 部署 Worker 后端 + dist 前端 assets
```

注意 Worker 名称要和 `wrangler.jsonc` 里的 `name` 一致：

```jsonc
"name": "the-chosen-one"
```

否则 Workers Builds 可能会拒绝部署。

如果希望每次推送时自动执行远程 D1 migration，可以把 Deploy command 改成：

```bash
npx wrangler d1 migrations apply the-chosen-one --remote && npx wrangler deploy
```

这种做法会在每次发布前应用所有未执行的 migration。没有新 migration 时通常不会改动数据库；如果 migration 失败，部署会中断。

更稳的生产习惯是：

```text
普通代码发布：Cloudflare 自动 npm run build + npx wrangler deploy
有数据库结构变更：先手动执行 npx wrangler d1 migrations apply the-chosen-one --remote，再 git push 部署代码
```

### 方案 B：GitHub Actions

如果不用 Cloudflare Workers Builds，也可以用 GitHub Actions 在 push 时执行 Wrangler。

需要在 GitHub 仓库 Settings -> Secrets and variables -> Actions 添加：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

`CLOUDFLARE_API_TOKEN` 至少需要能部署 Workers、读取/写入 D1。

示例 workflow：

```yaml
name: Deploy Cloudflare Worker

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run build

      # 有 migration 时可以保留；如果你想手动控制数据库变更，可以删除这一步。
      - run: npx wrangler d1 migrations apply the-chosen-one --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

如果已经使用方案 A，不需要再加 GitHub Actions，避免同一个 push 触发两次部署。

## 推荐上线流程

每次有数据库 migration：

```bash
npx wrangler d1 migrations apply the-chosen-one --remote
```

每次发布代码：

```bash
npm run build
npx wrangler deploy
```

如果只改前端页面，但你仍然使用 Workers Static Assets 承载前端，也需要重新执行：

```bash
npm run build
npx wrangler deploy
```

如果只改后台模型配置、视觉模型配置或 API Key，不需要重新部署代码，直接在后台系统保存配置即可。

## 测试环境域名

测试环境域名：

```text
https://xxymj.indevs.in
```

如果前端和 Worker 同域部署，生产构建可以不设置 `VITE_API_BASE_URL`，前端会走同源 `/api/*`。

如果前端由 Pages 单独部署、Worker 由另一个域名部署，则需要：

- 前端设置 `VITE_API_BASE_URL` 指向 Worker 域名；或
- 在 Cloudflare 路由里把 `https://xxymj.indevs.in/api/*` 指向 Worker。

