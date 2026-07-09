# 开发者指南

## 开发环境设置

### 前提条件

- Node.js >= 20.0.0
- pnpm >= 9.9.0

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/banlanzs/MultiChannelBroadCast.git
cd MultiChannelBroadCast

# 安装依赖
pnpm install

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件,配置 CHANNELS

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:4321` 查看效果。

## 项目结构

```
src/
├── lib/                      # 工具库和业务逻辑
│   ├── telegram/             # Telegram 相关模块
│   │   ├── index.js          # 核心内容获取模块
│   │   ├── push-config.js    # 推送配置模块
│   │   ├── push-dedup.js     # 推送去重模块
│   │   ├── push-formatter.js # 消息格式化模块
│   │   ├── push-api.js       # Telegram API 调用模块
│   │   ├── push-service.js   # 推送服务编排模块
│   │   └── __tests__/        # 单元测试
│   ├── dayjs.js              # Day.js 配置
│   ├── env.js                # 环境变量辅助函数
│   └── prism.js              # Prism.js 配置
├── pages/                    # 页面路由
│   ├── index.astro           # 首页
│   ├── posts/[id].astro      # 消息详情页
│   ├── channel/[channel].astro  # 频道页
│   ├── rss.xml.js            # RSS 订阅
│   └── ...
├── components/               # UI 组件
├── layouts/                  # 页面布局
└── assets/                   # 静态资源(CSS/图片)
```

## 添加新功能

### 1. 添加新的内容源

如果要支持除 Telegram 外的其他平台:

1. 在 `src/lib/` 下创建新模块,如 `src/lib/twitter.js`
2. 实现内容获取和解析函数
3. 在 `getChannelInfo` 中集成新模块
4. 更新环境变量配置

### 2. 添加新的推送目标

如果要推送到其他平台(如 Discord、Slack):

1. 创建新的推送模块,如 `src/lib/push-discord.js`
2. 实现格式化函数和 API 调用函数
3. 在 `push-service.js` 中添加新的推送逻辑
4. 添加对应的环境变量

### 3. 自定义样式

样式文件位于 `src/assets/`:

- `normalize.css` - CSS 重置
- `style.css` - 主样式
- `item.css` - 文章项样式
- `global.css` - 全局样式

直接修改这些文件即可自定义外观。

## 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式(开发时使用)
pnpm test -- --watch
```

### 编写测试

测试文件位于 `src/lib/telegram/__tests__/`,使用 Vitest 框架:

```javascript
import { describe, it, expect } from 'vitest'
import { yourFunction } from '../your-module.js'

describe('Your Module', () => {
  it('should do something', () => {
    expect(yourFunction()).toBe(expectedValue)
  })
})
```

### 测试覆盖范围

- 推送配置模块: 5 个测试用例
- 推送去重模块: 5 个测试用例
- 消息格式化模块: 10 个测试用例
- API 调用模块: 6 个测试用例

## 部署

### Vercel

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 部署
vercel
```

或在 Vercel Dashboard 中导入 GitHub 仓库。

### Docker

```bash
# 构建镜像
docker build -t multi-channel-broadcast .

# 运行容器
docker run -d \
  --name multi-channel-broadcast \
  -p 4321:4321 \
  -e CHANNELS="channel1,channel2" \
  multi-channel-broadcast
```

### Cloudflare Pages

在 Cloudflare Dashboard 中:
1. 连接 GitHub 仓库
2. 设置构建命令: `pnpm build`
3. 设置输出目录: `dist`
4. 配置环境变量

## 调试

### 启用调试日志

所有推送操作都会输出日志:

```
[Push] Success: channel:123
[Push] Skipped (already pushed): channel:123
[Push] Failed: channel:123 - error message
[Push] Invalid configuration, skipping push
```

### 检查推送配置

在代码中临时添加:

```javascript
import { getPushConfig } from './lib/telegram/push-config.js'

const config = getPushConfig(import.meta.env, Astro)
console.log('Push config:', config)
```

### 测试推送功能

1. 设置 `TELEGRAM_PUSH_ENABLED=true`
2. 配置有效的 Bot Token 和频道 ID
3. 访问网站触发内容获取
4. 检查控制台日志

## 常见问题

### Q: 推送没有触发?

A: 检查以下几点:
1. `TELEGRAM_PUSH_ENABLED` 是否设置为 `true`
2. `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_PUSH_CHANNEL_ID` 是否配置
3. 机器人是否有目标频道的发送权限
4. 检查日志是否有错误信息

### Q: 推送失败?

A: 常见原因:
- Bot Token 无效(401)
- 机器人不是频道管理员(403)
- 触发速率限制(429)
- 网络超时

### Q: 如何禁用推送?

A: 删除或注释掉 `.env` 中的推送相关配置,或设置 `TELEGRAM_PUSH_ENABLED=false`。

### Q: 缓存时间如何调整?

A: 修改 `src/lib/telegram/index.js` 中的 `ttl` 值:

```javascript
const cache = new LRUCache({
  ttl: 1000 * 60 * 5,  // 改为需要的毫秒
  // ...
})
```

## 贡献指南

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License
