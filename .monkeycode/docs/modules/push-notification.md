# 推送通知模块

## 概述

推送通知模块位于 `src/lib/telegram/push-*.js`,负责在网站获取新内容时,自动将消息推送到指定的 Telegram 频道。

## 模块结构

```
push-config.js      # 配置管理
push-dedup.js       # 消息去重
push-formatter.js   # 消息格式化
push-api.js         # Telegram API 调用
push-service.js     # 服务编排
```

## 模块详情

### 1. push-config.js - 配置管理

**职责**: 读取和验证推送相关的环境变量配置

**导出函数**:
- `getPushConfig(importMetaEnv, Astro)`: 返回 PushConfig 对象

**环境变量**:
- `TELEGRAM_PUSH_ENABLED`: 是否启用推送
- `TELEGRAM_BOT_TOKEN`: Bot Token
- `TELEGRAM_PUSH_CHANNEL_ID`: 目标频道 ID

**验证逻辑**:
```javascript
isValid = enabled && !!botToken && !!channelId
```

### 2. push-dedup.js - 消息去重

**职责**: 使用 LRU Cache 管理已推送消息记录,避免重复推送

**导出函数**:
- `hasPushed(messageId)`: 检查消息是否已推送
- `markAsPushed(messageId)`: 标记消息为已推送
- `getPushedCount()`: 获取已推送消息数量
- `clearPushedMessages()`: 清空记录(用于测试)

**消息 ID 格式**: `{channelName}:{messageId}`

**缓存配置**:
```javascript
const pushedMessages = new LRUCache({ max: 1000 })
```

### 3. push-formatter.js - 消息格式化

**职责**: 将消息内容格式化为 Telegram HTML 格式

**导出函数**:
- `formatPushMessage(message, options)`: 返回格式化后的消息对象

**消息模板**:
```html
<b>{title}</b>

{summary}

<i>来源: <a href="{channelUrl}">{channelName}</a></i>
<i>发布时间: {publishTime}</i>

<a href="{postUrl}">查看原文</a>
```

**特性**:
- HTML 特殊字符转义(`escapeHtml`)
- 自动生成摘要(前 200 字符)
- 超长消息截断(4096 字符限制)
- 时间格式化(使用 Day.js)

### 4. push-api.js - Telegram API 调用

**职责**: 调用 Telegram Bot API 发送消息

**导出函数**:
- `sendTelegramMessage(botToken, channelId, message)`: 返回 ApiResponse

**API 端点**:
```
POST https://api.telegram.org/bot{token}/sendMessage
```

**错误处理**:
- 401/403: Bot Token 无效或无权限
- 429: 速率限制
- 超时: 10 秒超时
- 网络错误: 捕获并返回

### 5. push-service.js - 服务编排

**职责**: 协调各模块,完成推送流程

**导出函数**:
- `pushMessage(message, Astro, importMetaEnv)`: 推送单条消息

**推送流程**:
1. 检查推送配置
2. 构建消息唯一 ID
3. 检查是否已推送
4. 格式化消息内容
5. 调用 Telegram API 发送
6. 标记为已推送
7. 记录日志

**异步设计**:
- 完全异步,不阻塞主流程
- 使用 `.catch()` 捕获异常
- 推送失败不影响内容展示

## 使用示例

### 启用推送

在 `.env` 中配置:

```env
TELEGRAM_PUSH_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_PUSH_CHANNEL_ID=@your_channel
```

### 手动调用推送

```javascript
import { pushMessage } from './lib/telegram/push-service.js'

// 在获取内容后
const posts = await getChannelInfo(Astro)
posts.forEach(post => {
  pushMessage(post, Astro, import.meta.env)
})
```

## 测试

测试文件位于 `src/lib/telegram/__tests__/`:

- `push-config.test.js`: 5 个测试用例
- `push-dedup.test.js`: 5 个测试用例
- `push-formatter.test.js`: 10 个测试用例
- `push-api.test.js`: 6 个测试用例

运行测试:
```bash
pnpm test
```

## 日志格式

```
[Push] Success: channel:123
[Push] Skipped (already pushed): channel:123
[Push] Failed: channel:123 - error message
[Push] Invalid configuration, skipping push
[Push] Error: channel:123 - Error stack
```

## 注意事项

1. **推送是尽力而为**: 失败不会重试,不影响主流程
2. **去重是内存级**: 服务重启后失效
3. **Bot 权限**: 机器人需要是频道管理员或有发送消息权限
4. **速率限制**: Telegram API 有速率限制,高流量场景需注意
5. **消息长度**: 单条消息不超过 4096 字符
