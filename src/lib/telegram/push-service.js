import { getPushConfig } from './push-config.js'
import { hasPushed, markAsPushed, getPushedCount } from './push-dedup.js'
import { formatPushMessage } from './push-formatter.js'
import { sendTelegramMessage } from './push-api.js'

/**
 * 推送单条消息到 Telegram 频道
 * @param {object} message - 消息对象
 * @param {string} message.id - 消息 ID
 * @param {string} message.channel - 来源频道名
 * @param {string} message.channelTitle - 频道显示名称
 * @param {string} message.title - 消息标题
 * @param {string} message.content - 消息内容(HTML)
 * @param {string} message.datetime - 发布时间
 * @param {string} [message.imageUrl] - 第一张图片 URL
 * @param {object} [Astro] - Astro context
 * @param {object} [importMetaEnv] - import.meta.env
 * @returns {Promise<void>}
 */
export async function pushMessage(message, Astro, importMetaEnv) {
  try {
    // 1. 检查推送配置
    const config = getPushConfig(importMetaEnv, Astro)
    if (!config.isValid) {
      if (config.enabled) {
        console.warn('[Push] Invalid configuration, skipping push')
      }
      return
    }

    // 2. 首次部署检测: 如果去重缓存为空,跳过本次推送(避免推送大量历史消息)
    if (getPushedCount() === 0) {
      console.info('[Push] First deployment detected, skipping initial batch push')
      return
    }

    // 3. 构建消息唯一 ID
    const messageId = `${message.channel}:${message.id}`

    // 4. 检查是否已推送
    if (hasPushed(messageId)) {
      console.info(`[Push] Skipped (already pushed): ${messageId}`)
      return
    }

    // 5. 获取网站 URL
    const siteUrl = Astro?.site?.origin || ''

    // 6. 获取语言和时区配置
    const locale = Astro?.request?.headers?.get('accept-language')?.split(',')[0] || 'zh-cn'
    const timezone = 'Asia/Shanghai' // 默认时区

    // 7. 格式化消息
    const formattedMessage = formatPushMessage(message, {
      siteUrl,
      locale,
      timezone,
    })

    // 8. 发送消息
    const result = await sendTelegramMessage(
      config.botToken,
      config.channelId,
      formattedMessage
    )

    // 9. 处理结果
    if (result.success) {
      markAsPushed(messageId)
      console.info(`[Push] Success: ${messageId}`)
    } else {
      console.error(`[Push] Failed: ${messageId} - ${result.error}`)
    }
  } catch (error) {
    // 捕获未预期异常,不影响主流程
    const messageId = `${message?.channel}:${message?.id}` || 'unknown'
    console.error(`[Push] Error: ${messageId} -`, error)
  }
}
