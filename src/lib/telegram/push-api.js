import { $fetch } from 'ofetch'

// Telegram Bot API 基础 URL
const TELEGRAM_API_BASE = 'https://api.telegram.org'

// 请求超时时间(毫秒)
const REQUEST_TIMEOUT = 10000

/**
 * 发送消息到 Telegram 频道(支持文本和图片)
 * @param {string} botToken - Bot Token
 * @param {string} channelId - 目标频道 ID
 * @param {object} message - 消息对象
 * @param {string} message.text - 消息文本(支持 HTML)
 * @param {string} message.parse_mode - 解析模式(HTML/Markdown)
 * @param {string} [message.imageUrl] - 图片 URL(如果有则使用 sendPhoto)
 * @returns {Promise<{success: boolean, error?: string}>} 发送结果
 */
export async function sendTelegramMessage(botToken, channelId, message) {
  const baseUrl = `${TELEGRAM_API_BASE}/bot${botToken}`

  try {
    // 如果有图片,使用 sendPhoto API
    if (message.imageUrl) {
      return await sendPhoto(baseUrl, channelId, message)
    }

    // 否则使用 sendMessage API
    return await sendText(baseUrl, channelId, message)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 发送文本消息
 */
async function sendText(baseUrl, channelId, message) {
  const response = await $fetch(`${baseUrl}/sendMessage`, {
    method: 'POST',
    timeout: REQUEST_TIMEOUT,
    body: {
      chat_id: channelId,
      text: message.text,
      parse_mode: message.parse_mode,
      disable_web_page_preview: true,
    },
  })

  if (response.ok !== false) {
    return { success: true }
  }
  return { success: false, error: `API returned status: ${response.status}` }
}

/**
 * 发送带图片的消息
 */
async function sendPhoto(baseUrl, channelId, message) {
  const response = await $fetch(`${baseUrl}/sendPhoto`, {
    method: 'POST',
    timeout: REQUEST_TIMEOUT,
    body: {
      chat_id: channelId,
      photo: message.imageUrl,
      caption: message.text,
      parse_mode: message.parse_mode,
    },
  })

  if (response.ok !== false) {
    return { success: true }
  }
  return { success: false, error: `API returned status: ${response.status}` }
}

/**
 * 处理 API 错误
 */
function handleApiError(error) {
  if (error.response) {
    const status = error.response.status
    if (status === 401 || status === 403) {
      return {
        success: false,
        error: `Invalid bot token or forbidden (HTTP ${status})`,
      }
    }
    if (status === 429) {
      return {
        success: false,
        error: 'Rate limited by Telegram API',
      }
    }
    return {
      success: false,
      error: `HTTP error: ${status}`,
    }
  }

  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return {
      success: false,
      error: 'Request timeout',
    }
  }

  return {
    success: false,
    error: error.message || 'Unknown error',
  }
}
