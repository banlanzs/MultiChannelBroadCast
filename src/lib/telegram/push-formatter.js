import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
dayjs.extend(timezone)

// Telegram 消息最大字符限制
const MAX_MESSAGE_LENGTH = 4096

/**
 * 转义 HTML 特殊字符
 * @param {string} text - 原始文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 生成消息摘要
 * @param {string} content - 消息内容(可能包含 HTML)
 * @param {number} maxLength - 最大长度
 * @returns {string} 摘要文本
 */
function generateSummary(content, maxLength = 200) {
  if (!content) return ''
  // 移除 HTML 标签
  const plainText = content.replace(/<[^>]*>/g, '')
  if (plainText.length <= maxLength) return plainText
  return plainText.substring(0, maxLength) + '...'
}

/**
 * 格式化推送消息为 Telegram HTML 格式
 * @param {object} message - 消息对象
 * @param {string} message.id - 消息 ID
 * @param {string} message.channel - 来源频道名
 * @param {string} message.channelTitle - 频道显示名称
 * @param {string} message.title - 消息标题
 * @param {string} message.content - 消息内容(HTML)
 * @param {string} message.datetime - 发布时间
 * @param {string} [message.imageUrl] - 第一张图片 URL
 * @param {object} [options] - 可选配置
 * @param {string} [options.siteUrl] - 网站 URL
 * @param {string} [options.locale] - 语言代码
 * @param {string} [options.timezone] - 时区
 * @returns {object} 格式化后的消息
 */
export function formatPushMessage(message, options = {}) {
  const {
    siteUrl = '',
    locale = 'zh-cn',
    timezone: tz = 'Asia/Shanghai',
  } = options

  // 构建原文链接
  const postUrl = siteUrl
    ? `${siteUrl}/posts/${message.channel}/${message.id}`
    : `/posts/${message.channel}/${message.id}`

  // 构建频道链接
  const channelUrl = `https://t.me/${message.channel}`

  // 格式化时间
  const publishTime = dayjs(message.datetime).tz(tz).locale(locale).format('YYYY-MM-DD HH:mm:ss')

  // 生成摘要
  const summary = generateSummary(message.content, 200)

  // 构建消息文本
  const parts = []

  // 标题(如果有)
  if (message.title) {
    parts.push(`<b>${escapeHtml(message.title)}</b>`)
  }

  // 摘要
  if (summary) {
    parts.push(escapeHtml(summary))
  }

  // 来源和时间
  const channelName = message.channelTitle || `@${message.channel}`
  parts.push(`<i>来源: <a href="${escapeHtml(channelUrl)}">${escapeHtml(channelName)}</a></i>`)
  parts.push(`<i>发布时间: ${publishTime}</i>`)

  // 原文链接 - 使用纯 URL 文本，Telegram 会自动转为可点击链接
  parts.push(`${escapeHtml(postUrl)}`)

  // 拼接消息
  let text = parts.join('\n\n')

  // 截断超长消息
  if (text.length > MAX_MESSAGE_LENGTH) {
    text = text.substring(0, MAX_MESSAGE_LENGTH - 3) + '...'
  }

  return {
    text,
    parse_mode: 'HTML',
    imageUrl: message.imageUrl || null,
  }
}
