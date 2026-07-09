简体中文|[English](./README.md)
# Multi-Channel Broadcast

**将多个 Telegram 频道聚合为一个微博客** -inspired by [BroadcastChannel](https://github.com/ccbikai/BroadcastChannel).


## 🆚 与 BroadcastChannel 的区别

| 特性 | BroadcastChannel | Multi-Channel Broadcast |
|------|------------------|------------------------|
| 频道数量 | 单频道 | **多频道聚合** |
| 内容来源 | 单一频道 | **多个频道混合** |
| 去重处理 | 不需要 | **智能去重** |
| 频道标注 | 无 | **显示来源频道** |
| 速率控制 | 基础重试 | **强化速率限制** |
| 用户代理 | 固定 | **轮换UA池** |
| 评论功能 | 支持 | **支持(多频道)** |


---

## 技术栈

- **框架**: [Astro](https://astro.build/) v4.15+
- **内容源**: [Telegram Channels](https://telegram.org/tour/channels)
- **模板**: [Sepia](https://github.com/Planetable/SiteTemplateSepia)
- **缓存**: LRU Cache
- **代码高亮**: Prism.js
- **语言检测**: Flourite


### 本地开发

```bash
# 克隆项目
git clone https://github.com/banlanzs/MultiChannelBroadCast.git
cd MultiChannelBroadcast

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件,设置 CHANNELS

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:4321` 查看效果

### Docker 部署

使用 Docker 和 Docker Compose 部署:

```bash
# 克隆项目
git clone https://github.com/banlanzs/MultiChannelBroadCast.git
cd MultiChannelBroadcast

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件,设置 CHANNELS 等配置

# 使用 Docker Compose 构建并启动 (国内用户默认使用 Dockerfile.cn)
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

或者使用 Docker 命令:

```bash
# 构建镜像
docker build -t multi-channel-broadcast .

# 运行容器
docker run -d \
  --name multi-channel-broadcast \
  -p 4321:4321 \
  -e CHANNELS="channel1,channel2,channel3" \
  -e SITE_NAME="My Blog" \
  -e LOCALE="zh-cn" \
  -e TIMEZONE="Asia/Shanghai" \
  multi-channel-broadcast

# 查看日志
docker logs -f multi-channel-broadcast

# 停止容器
docker stop multi-channel-broadcast
docker rm multi-channel-broadcast
```

访问 `http://localhost:4321` 查看效果

**注意事项**:
- 确保 Docker 和 Docker Compose 已安装
- 建议使用 `.env` 文件管理环境变量
- 生产环境建议配置反向代理(如 Nginx)

---

## 配置说明

创建 `.env` 文件并配置以下环境变量:

### 核心配置

```env
## 多频道配置 - 使用逗号分隔多个频道 (必需)
CHANNELS=channel1,channel2,channel3

## 或者使用单个频道 (向下兼容)
CHANNEL=your_channel_name

## 站点名称
SITE_NAME=My Multi-Channel Blog

## 语言和时区
LOCALE=zh-cn
TIMEZONE=Asia/Shanghai
```

### 社交媒体配置

```env
## 社交媒体用户名
TELEGRAM=your_telegram
TWITTER=your_twitter
GITHUB=your_github

## 需要完整URL的社交媒体
MASTODON=https://mastodon.social/@username
BLUESKY=https://bsky.app/profile/username
DISCORD=https://discord.gg/invite
PODCAST=https://your-podcast.com
```

### 高级配置

```env
## Telegram主机 (一般不需要修改)
TELEGRAM_HOST=t.me

## 静态资源代理 (可选)
STATIC_PROXY=/static/

## 启用 Telegram 评论功能
## 设置为 true 后,在帖子详情页会显示 Telegram 评论区
## 注意: 需要频道开启了讨论组功能
COMMENTS=true

## 代码注入 (支持HTML)
HEADER_INJECT=<!-- Google Analytics -->
FOOTER_INJECT=<!-- 页脚统计代码 -->

## Sentry错误追踪 (可选)
SENTRY_DSN=your_sentry_dsn
SENTRY_PROJECT=your_project
SENTRY_AUTH_TOKEN=your_auth_token
```

### Telegram 推送功能 (可选)

在网站获取新内容时,自动将消息推送到指定的 Telegram 频道:

```env
## 启用推送通知 (设置为 true 启用)
TELEGRAM_PUSH_ENABLED=true

## Telegram Bot Token (通过 @BotFather 获取)
TELEGRAM_BOT_TOKEN=your_bot_token_here

## 目标推送频道 ID (格式: @频道名 或 chat ID)
## 机器人需要是该频道的管理员或有发送消息权限
TELEGRAM_PUSH_CHANNEL_ID=@your_channel_name
```

**配置步骤:**
1. 通过 Telegram 的 [@BotFather](https://t.me/BotFather) 创建机器人
2. 发送 `/newbot` 并按提示获取 Bot Token
3. 将机器人添加为目标频道的管理员(或确保有发送消息权限)
4. 配置上述环境变量
5. 推送功能默认关闭,不会影响现有功能


## 自定义样式

样式文件位于 `src/assets/` 目录:

- `normalize.css` - CSS重置
- `style.css` - 主样式
- `item.css` - 文章项样式
- `global.css` - 全局样式

可以直接修改这些文件来自定义网站外观。

---


建议:
- 不要设置过多频道(建议≤5个)
- 适当增加缓存时间
- 使用代理(如需要)

### 多频道内容如何排序?

所有频道的内容会按照 **发布时间倒序** 排列,最新的内容显示在最前面。同时会进行去重处理,避免重复显示。

### 如何区分不同频道的内容?

每条内容下方会显示 "来自频道: @channel_name",点击可以跳转到该频道。

### 如何启用评论功能?

1. 在 `.env` 文件中添加 `COMMENTS=true`
2. 确保你的 Telegram 频道已开启讨论组功能
3. 点击帖子时间戳进入详情页,会在下方显示评论区

**注意事项**:
- 评论功能使用 Telegram 官方 widget,数据存储在 Telegram
- 只有开启了讨论组的频道消息才能显示评论
- 评论区会异步加载,可能需要几秒钟
- 每个帖子最多显示 50 条评论

---

## Cloudflare Pages 部署
1.git链接仓库
2.构建命令
```
pnpm install && pnpm build
dist
```

## Vercel 部署

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/banlanzs/MultiChannelBroadCast)

### 手动部署

1. Fork 本仓库到你的 GitHub 账号
2. 在 [Vercel Dashboard](https://vercel.com/new) 导入项目
3. 配置环境变量（必需）：
   - `CHANNELS`：频道列表（逗号分隔）
   - `SITE_NAME`：站点名称
   - 其他可选变量参考 `.env.example`
4. 点击 "Deploy" 开始部署

### 构建配置

Vercel 会自动检测 Astro 项目，无需手动配置。如果需要自定义：

- **Framework Preset**: Astro
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`
- **Node.js Version**: 20.x

### 环境变量配置

在 Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `CHANNELS` | 频道列表（逗号分隔） | ✅ |
| `SITE_NAME` | 站点名称 | ✅ |
| `LOCALE` | 语言代码（默认 zh-cn） | ❌ |
| `TIMEZONE` | 时区（默认 Asia/Shanghai） | ❌ |
| `COMMENTS` | 启用评论功能（true/false） | ❌ |

完整环境变量列表参考 `.env.example`。

### 性能说明

本项目使用 ISR（Incremental Static Regeneration）缓存策略：
- 页面在边缘节点缓存 30 分钟
- 缓存过期后自动重新生成
- 首次访问可能需要 1-3 秒加载时间
- 后续访问响应时间 <100ms

### 注意事项

⚠️ **重要**：
- Vercel 部署使用 serverless 架构，内存缓存不共享
- 后台缓存更新机制在 Vercel 上不可用
- 高流量场景建议使用 Docker 部署或配置 Vercel KV (Redis)

## TO DO

### 部署相关
- [x] 完善 Vercel 部署支持
- [ ] 优化 Cloudflare Pages 构建流程
- [ ] 添加 Netlify 部署文档

### 功能增强
- [ ] 添加频道过滤功能
- [ ] 支持自定义排序规则
- [ ] 添加频道分组功能
- [ ] 支持更多内容平台

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

## 📄 许可证

MIT

## Thanks

[BroadcastChannel](https://github.com/ccbikai/BroadcastChannel)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=banlanzs/MultiChannelBroadCast&type=date&legend=top-left)](https://www.star-history.com/#banlanzs/MultiChannelBroadCast&type=date&legend=top-left)