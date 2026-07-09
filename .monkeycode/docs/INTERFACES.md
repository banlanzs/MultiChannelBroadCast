# 接口和类型定义

## 核心数据类型

### Post 对象

从 Telegram 频道获取的单条消息结构:

```typescript
interface Post {
  id: string                    // 消息 ID (格式: channel/messageId)
  title: string                 // 消息标题(自动提取)
  channel: string               // 来源频道用户名
  type: 'text' | 'service'      // 消息类型
  datetime: string              // 发布时间 (ISO 8601)
  tags: string[]                // 标签列表(不含 #)
  text: string                  // 纯文本内容
  content: string               // HTML 格式内容
}
```

### ChannelInfo 对象

单频道信息结构:

```typescript
interface ChannelInfo {
  posts: Post[]                 // 消息列表
  title: string                 // 频道显示名称
  description: string           // 频道描述(纯文本)
  descriptionHTML: string       // 频道描述(HTML)
  avatar: string                // 头像 URL(代理后)
  avatarFallback: string        // 头像备用 URL
  username: string              // 频道用户名
}
```

### AggregatedInfo 对象

多频道聚合信息结构:

```typescript
interface AggregatedInfo {
  posts: Post[]                 // 聚合后的消息列表(按时间倒序)
  title: string                 // 站点名称
  description: string           // 站点描述
  descriptionHTML: string       // 站点描述(HTML)
  avatar: string                // 站点头像
  channels: ChannelSummary[]    // 频道摘要列表
}

interface ChannelSummary {
  username: string              // 频道用户名
  title: string                 // 频道显示名称
  avatar: string                // 频道头像 URL
}
```

### PushConfig 对象

推送配置结构:

```typescript
interface PushConfig {
  enabled: boolean              // 是否启用推送
  botToken: string | undefined  // Telegram Bot Token
  channelId: string | undefined // 目标频道 ID
  isValid: boolean              // 配置是否有效
}
```

### PushMessage 对象

推送到 Telegram 的消息格式:

```typescript
interface PushMessage {
  text: string                  // 消息文本(HTML 格式)
  parse_mode: 'HTML'            // 解析模式
  link_preview_options: {
    is_disabled: boolean        // 禁用链接预览
  }
}
```

### API 响应对象

Telegram Bot API 调用结果:

```typescript
interface ApiResponse {
  success: boolean              // 是否成功
  error?: string                // 错误信息(失败时)
}
```

## 核心函数接口

### 内容获取函数

#### getSingleChannelInfo

获取单个频道信息:

```typescript
async function getSingleChannelInfo(
  Astro: AstroContext,
  channel: string,
  options?: {
    before?: string             // 获取此 ID 之前的消息
    after?: string              // 获取此 ID 之后的消息
    q?: string                  // 搜索关键词
    type?: 'list' | 'single'    // 查询类型
    id?: string                 // 单条消息 ID
  }
): Promise<ChannelInfo>
```

#### getChannelInfo

获取多频道聚合信息:

```typescript
async function getChannelInfo(
  Astro: AstroContext,
  options?: {
    before?: string
    after?: string
    q?: string
  }
): Promise<AggregatedInfo>
```

### 推送服务函数

#### getPushConfig

获取推送配置:

```typescript
function getPushConfig(
  importMetaEnv?: object,
  Astro?: AstroContext
): PushConfig
```

#### formatPushMessage

格式化推送消息:

```typescript
function formatPushMessage(
  message: Post,
  options?: {
    siteUrl?: string            // 网站 URL
    locale?: string             // 语言代码
    timezone?: string           // 时区
  }
): PushMessage
```

#### sendTelegramMessage

发送消息到 Telegram:

```typescript
async function sendTelegramMessage(
  botToken: string,
  channelId: string,
  message: PushMessage
): Promise<ApiResponse>
```

#### pushMessage

推送单条消息(编排函数):

```typescript
async function pushMessage(
  message: Post,
  Astro?: AstroContext,
  importMetaEnv?: object
): Promise<void>
```

### 去重函数

#### hasPushed

检查消息是否已推送:

```typescript
function hasPushed(messageId: string): boolean
```

#### markAsPushed

标记消息为已推送:

```typescript
function markAsPushed(messageId: string): void
```

## 环境变量接口

### 必需环境变量

```env
CHANNELS=channel1,channel2,channel3  # 频道列表(逗号分隔)
```

### 可选环境变量

```env
SITE_NAME=My Blog                    # 站点名称
LOCALE=zh-cn                         # 语言代码
TIMEZONE=Asia/Shanghai               # 时区
TELEGRAM_HOST=t.me                   # Telegram 主机
STATIC_PROXY=/static/                # 静态资源代理
COMMENTS=true                        # 启用评论
```

### 推送相关环境变量

```env
TELEGRAM_PUSH_ENABLED=true           # 启用推送
TELEGRAM_BOT_TOKEN=xxx               # Bot Token
TELEGRAM_PUSH_CHANNEL_ID=@channel    # 目标频道
```

## 错误类型

### 内容获取错误

```typescript
type ContentError =
  | 'NO_CHANNELS_CONFIGURED'         // 未配置频道
  | 'FETCH_FAILED'                   // 网络请求失败
  | 'PARSE_ERROR'                    // HTML 解析错误
  | 'TIMEOUT'                        // 请求超时
```

### 推送服务错误

```typescript
type PushError =
  | 'INVALID_CONFIG'                 // 配置无效
  | 'API_UNAUTHORIZED'               // Bot Token 无效
  | 'API_FORBIDDEN'                  // 无权限发送消息
  | 'API_RATE_LIMITED'               // 触发速率限制
  | 'NETWORK_ERROR'                  // 网络错误
  | 'TIMEOUT'                        // 请求超时
```
