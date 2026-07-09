# 系统架构文档

## 架构概览

Multi-Channel Broadcast 采用静态站点生成(SSG)与增量静态再生成(ISR)相结合的架构,在边缘节点提供高性能的内容展示。

```mermaid
graph TB
    A[用户请求] --> B[Astro 路由]
    B --> C{页面类型}
    C -->|首页| D[index.astro]
    C -->|频道页| E[channel/[channel].astro]
    C -->|详情页| F[posts/[id].astro]
    C -->|RSS| G[rss.xml.js]
    
    D --> H[getChannelInfo]
    E --> I[getSingleChannelInfo]
    F --> I
    G --> H
    
    H --> J[Telegram API]
    I --> J
    
    J --> K[HTML 解析]
    K --> L[内容提取]
    L --> M[LRU Cache]
    
    M --> N[推送服务]
    N --> O[Telegram Bot API]
    
    L --> P[页面渲染]
    P --> A
```

## 分层架构

### 1. 路由层 (Pages)

位于 `src/pages/`,负责:
- URL 路由匹配
- 页面布局和模板
- 调用数据获取函数
- 渲染 HTML

### 2. 数据层 (Lib)

位于 `src/lib/`,负责:
- Telegram 内容获取和解析
- 缓存管理
- 推送通知服务

### 3. 展示层 (Components)

位于 `src/components/`,负责:
- UI 组件复用
- 样式管理
- 交互逻辑

## 核心数据流

### 内容获取流程

1. **用户访问页面** → 触发 Astro 页面组件
2. **调用 `getChannelInfo`** → 检查缓存
3. **缓存未命中** → 并发请求 Telegram 频道页面
4. **HTML 解析** → 使用 Cheerio 提取消息内容
5. **内容处理** → 图片代理、代码高亮、格式化
6. **缓存结果** → 存入 LRU Cache (5 分钟 TTL)
7. **触发推送** → 异步推送到配置的 Telegram 频道
8. **返回数据** → 渲染页面

### 推送通知流程

1. **内容获取完成** → 遍历新消息列表
2. **配置检查** → 验证推送配置是否有效
3. **去重检查** → 检查消息是否已推送
4. **消息格式化** → 生成 HTML 格式推送消息
5. **调用 Bot API** → 发送消息到目标频道
6. **标记已推送** → 记录到去重缓存
7. **日志记录** → 输出成功/失败日志

## 缓存策略

### LRU Cache 配置

```javascript
const cache = new LRUCache({
  ttl: 1000 * 60 * 5,        // 5 分钟 TTL
  maxSize: 50 * 1024 * 1024, // 50MB 最大缓存
  sizeCalculation: (item) => JSON.stringify(item).length
})
```

### 缓存键设计

- **单频道**: `JSON.stringify({ channel, before, after, q, type, id })`
- **多频道**: `JSON.stringify({ channels, before, after, q })`

### 缓存失效

- 自动: TTL 过期后自动失效
- 手动: 服务重启后清空

## 图片代理架构

支持多代理哈希分片负载均衡:

```
用户请求图片
  ↓
计算 URL 哈希值
  ↓
分配到代理服务器
  ├── cdnjson (启用)
  ├── wesrv (启用)
  └── wsrv (启用, 作为降级选项)
```

### 故障转移

- 主代理失败 → 尝试 wsrv 降级代理
- 图片加载失败 → onerror 回退到备用 URL

## 推送服务架构

### 模块依赖关系

```
push-service.js (编排层)
  ├── push-config.js (配置层)
  ├── push-dedup.js (去重层)
  ├── push-formatter.js (格式化层)
  └── push-api.js (API 层)
```

### 异步设计

- 推送操作完全异步,不阻塞主流程
- 使用 `.catch()` 捕获未处理异常
- 推送失败不影响内容展示

## 部署架构

### 支持的部署平台

1. **Vercel**: Serverless 架构,ISR 缓存
2. **Cloudflare Pages**: 边缘网络,Worker 支持
3. **Netlify**: 静态站点 + Functions
4. **Node.js**: 传统服务器部署
5. **Docker**: 容器化部署

### 环境变量优先级

1. 部署平台自动设置 (如 `SITE`)
2. `.env` 文件配置
3. 代码默认值

## 错误处理策略

### 内容获取错误

- 网络错误: 重试 3 次,间隔 100ms
- 解析错误: 记录日志,跳过问题消息
- 缓存命中: 返回旧数据,避免空页面

### 推送服务错误

- 配置错误: 跳过推送,记录警告
- API 错误: 记录错误,不重试
- 超时: 10 秒超时,跳过推送
- 未知异常: 捕获并记录,不影响主流程

## 安全考虑

### XSS 防护

- 用户输入转义
- HTML 内容使用 Cheerio 安全解析
- 推送消息使用 `escapeHtml` 函数

### 凭据安全

- Bot Token 存储在环境变量
- 不在日志中输出敏感信息
- `.env` 文件在 `.gitignore` 中

## 性能优化

### 并发请求

- 多频道使用 `Promise.all` 并发获取
- 单频道内消息串行解析

### 缓存策略

- LRU 缓存减少重复请求
- 图片使用 CDN 代理缓存

### 懒加载

- 图片使用 `loading="lazy"`
- 前 5 条消息使用 `eager` 加载
