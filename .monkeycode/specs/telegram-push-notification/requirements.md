# 需求文档

## 介绍

为 Multi-Channel Broadcast 项目增加向 Telegram 频道推送最新消息的能力。该功能允许用户在网站发布或更新内容时,自动将内容推送到指定的 Telegram 频道,实现内容的双向同步。

## 术语表

- **推送通知**: 将网站内容自动发送到 Telegram 频道的过程
- **Telegram Bot**: 用于发送消息到频道的 Telegram 机器人
- **Bot Token**: Telegram 机器人的认证令牌
- **频道 Chat ID**: 目标 Telegram 频道的唯一标识符
- **Webhook**: 接收内容更新事件的 HTTP 端点

## 需求

### 需求 1: Telegram 推送配置管理

**用户故事**: 作为网站管理员,我希望能够配置 Telegram 推送所需的凭据和目标频道,以便系统知道向哪里推送内容。

#### 验收标准

1. WHEN 管理员在环境变量中设置 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_PUSH_CHANNEL_ID`,系统 SHALL 启用推送功能
2. WHEN 环境变量 `TELEGRAM_BOT_TOKEN` 或 `TELEGRAM_PUSH_CHANNEL_ID` 未设置,系统 SHALL 禁用推送功能且不报错
3. IF 提供的 `TELEGRAM_BOT_TOKEN` 无效,系统 SHALL 记录错误日志并跳过推送操作
4. IF 提供的 `TELEGRAM_PUSH_CHANNEL_ID` 无效或机器人无权访问,系统 SHALL 记录错误日志并跳过推送操作

### 需求 2: 新内容自动推送

**用户故事**: 作为内容订阅者,我希望在网站有新内容发布时收到 Telegram 通知,以便及时了解最新动态。

#### 验收标准

1. WHEN 网站成功获取到 Telegram 频道的新消息,系统 SHALL 尝试将消息推送到配置的推送频道
2. WHEN 推送消息时,系统 SHALL 包含消息标题、摘要和指向详情页的链接
3. WHILE 推送操作进行中,系统 SHALL 不影响网站正常的内容展示功能
4. IF 推送操作失败,系统 SHALL 记录失败原因,但不重试(避免阻塞)

### 需求 3: 推送消息格式化

**用户故事**: 作为 Telegram 频道用户,我希望收到的推送消息格式清晰、包含必要信息,以便快速了解内容。

#### 验收标准

1. WHEN 格式化推送消息,系统 SHALL 包含以下内容:
   - 消息标题(如果有)
   - 消息摘要(前 200 字符)
   - 来源频道名称
   - 原文链接
   - 发布时间
2. WHEN 消息包含图片,系统 SHALL 在推送中包含第一张图片的缩略图
3. IF 消息内容超过 Telegram 单条消息限制(4096 字符),系统 SHALL 截断并添加省略号

### 需求 4: 推送去重机制

**用户故事**: 作为 Telegram 频道管理员,我不希望收到重复的推送消息,以免打扰订阅者。

#### 验收标准

1. WHEN 准备推送消息,系统 SHALL 检查该消息是否已经推送过
2. WHILE 去重检查进行中,系统 SHALL 使用消息的唯一 ID(频道名 + 消息 ID)作为标识
3. IF 消息已经推送过,系统 SHALL 跳过本次推送操作

### 需求 5: 错误处理和日志记录

**用户故事**: 作为系统运维人员,我希望能够查看推送操作的执行情况和错误信息,以便排查问题。

#### 验收标准

1. WHEN 推送成功,系统 SHALL 在控制台输出成功日志
2. WHEN 推送失败,系统 SHALL 在控制台输出错误日志,包含失败原因和消息 ID
3. IF Telegram API 返回速率限制错误,系统 SHALL 记录警告并跳过当前推送
4. IF 推送模块发生未预期异常,系统 SHALL 捕获异常并记录日志,不影响主流程

### 需求 6: 环境变量配置

**用户故事**: 作为部署人员,我希望通过环境变量灵活配置推送功能,以适应不同的部署环境。

#### 验收标准

1. WHEN 配置推送功能,系统 SHALL 支持以下环境变量:
   - `TELEGRAM_BOT_TOKEN`: Telegram Bot 认证令牌
   - `TELEGRAM_PUSH_CHANNEL_ID`: 目标推送频道 ID(格式: @channelname 或 chat ID)
   - `TELEGRAM_PUSH_ENABLED`: 是否启用推送(默认: false)
2. IF `TELEGRAM_PUSH_ENABLED` 设置为 false 或未设置,系统 SHALL 不执行任何推送操作
3. WHEN 环境变量发生变化,系统 SHALL 在下次推送时使用新配置
