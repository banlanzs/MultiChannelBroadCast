# Multi-Channel Broadcast 项目文档索引

## 项目概览

**Multi-Channel Broadcast** 是一个基于 Astro 构建的多频道 Telegram 内容聚合器,将多个 Telegram 频道的内容聚合为一个微博风格的网站。

## 核心功能

- **多频道聚合**: 支持配置多个 Telegram 频道,混合展示内容
- **智能去重**: 自动去除重复消息
- **内容缓存**: 使用 LRU Cache 进行 5 分钟缓存
- **图片代理**: 支持多种图片代理服务
- **Telegram 推送**: 自动将新内容推送到指定 Telegram 频道
- **响应式设计**: 基于 Sepia 模板的响应式布局
- **多平台部署**: 支持 Vercel、Cloudflare Pages、Netlify、Node.js、Docker

## 技术栈

- **框架**: Astro v5.16+
- **内容获取**: Cheerio (HTML 解析)
- **缓存**: LRUCache
- **HTTP 客户端**: ofetch
- **代码高亮**: Prism.js
- **语言检测**: Flourite
- **时间处理**: Day.js
- **测试**: Vitest

## 文档结构

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档
- [INTERFACES.md](./INTERFACES.md) - 接口和类型定义
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - 开发者指南
- [modules/telegram.md](./modules/telegram.md) - Telegram 模块文档
- [modules/push-notification.md](./modules/push-notification.md) - 推送通知模块文档

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
pnpm dev
```

## 核心模块

1. **Telegram 内容获取模块** (`src/lib/telegram/`)
   - 获取和解析 Telegram 频道内容
   - 处理图片、视频、音频等多媒体
   - 支持多频道聚合

2. **推送通知模块** (`src/lib/telegram/push-*.js`)
   - 配置管理
   - 消息去重
   - 消息格式化
   - Telegram Bot API 调用

3. **页面路由** (`src/pages/`)
   - 首页: 聚合内容展示
   - 频道页: 单频道内容
   - 详情页: 单条消息详情
   - RSS/JSON/Sitemap: SEO 和订阅支持
