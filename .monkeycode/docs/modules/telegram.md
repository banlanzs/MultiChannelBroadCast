# Telegram 内容获取模块

## 概述

`src/lib/telegram/index.js` 是项目的核心模块,负责从 Telegram 频道获取和解析内容。

## 主要功能

### 1. 内容获取

- **单频道获取**: `getSingleChannelInfo()` 获取单个频道的内容
- **多频道聚合**: `getChannelInfo()` 聚合多个频道的内容
- **搜索支持**: 通过关键词搜索频道内消息
- **分页支持**: 支持 before/after 游标分页

### 2. 内容解析

使用 Cheerio 解析 Telegram 频道页面的 HTML,提取:

- 消息文本
- 标题(自动提取第一句)
- 发布时间
- 标签
- 图片、视频、音频
- 链接预览
- 回复消息
- 投票、文档、位置等

### 3. 多媒体处理

#### 图片代理

支持多代理哈希分片负载均衡:

```javascript
const IMAGE_PROXIES = [
  { name: 'cdnjson', enabled: true },
  { name: 'wesrv', enabled: true },
  { name: 'wsrv', enabled: true }  // 降级选项
]
```

- 同一 URL 始终映射到同一代理(缓存友好)
- 故障自动切换到 wsrv 降级代理
- 图片加载失败时 onerror 回退

#### 视频和音频

- 使用本地静态代理(`STATIC_PROXY`)
- 添加 controls、preload、playsinline 属性

### 4. 代码高亮

使用 Flourite 检测代码语言,Prism.js 高亮:

```javascript
const language = flourite(code, { shiki: true, noUnknown: true })?.language || 'text'
const highlightedCode = prism.highlight(code, prism.languages[language], language)
```

### 5. 缓存策略

```javascript
const cache = new LRUCache({
  ttl: 1000 * 60 * 5,        // 5 分钟
  maxSize: 50 * 1024 * 1024, // 50MB
  sizeCalculation: (item) => JSON.stringify(item).length
})
```

### 6. 推送集成

在获取内容后自动触发推送:

```javascript
if (posts?.length > 0) {
  posts.forEach(post => {
    pushMessage(post, Astro, import.meta.env).catch(err => {
      console.error('[Push] Unhandled error:', err)
    })
  })
}
```

## 数据结构

### Post 对象

```javascript
{
  id: '123',                    // 消息 ID
  title: '消息标题',             // 自动提取
  channel: 'channel_name',      // 频道用户名
  type: 'text',                 // 消息类型
  datetime: '2026-05-06T10:00:00Z', // 发布时间
  tags: ['tag1', 'tag2'],       // 标签列表
  text: '纯文本内容',            // 纯文本
  content: '<p>HTML 内容</p>'   // HTML 格式
}
```

## 辅助函数

### getPost()

从 HTML 元素提取单条消息:

- 提取消息内容
- 处理回复消息
- 提取图片、视频、音频
- 处理链接预览
- 提取标签

### modifyHTMLContent()

修改 HTML 内容:

- 移除 emoji 样式
- 处理链接 title
- 添加 spoiler 按钮功能
- 代码高亮

### getProxyUrl()

获取图片代理 URL:

- 根据 URL 哈希分配代理
- 故障时降级到 wsrv

## 错误处理

- 网络请求重试 3 次,间隔 100ms
- 解析错误记录日志,跳过问题消息
- 代理构建失败时降级

## 性能优化

- 多频道使用 `Promise.all` 并发获取
- LRU 缓存减少重复请求
- 图片懒加载(前 5 条 eager,后续 lazy)
