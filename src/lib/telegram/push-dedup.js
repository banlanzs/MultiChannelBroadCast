import { LRUCache } from 'lru-cache'

// 已推送消息缓存,最多保留 1000 条记录
const pushedMessages = new LRUCache({ max: 1000 })

/**
 * 检查消息是否已经推送过
 * @param {string} messageId - 消息唯一 ID (格式: {channelName}:{messageId})
 * @returns {boolean} 是否已推送
 */
export function hasPushed(messageId) {
  return pushedMessages.has(messageId)
}

/**
 * 标记消息为已推送
 * @param {string} messageId - 消息唯一 ID (格式: {channelName}:{messageId})
 */
export function markAsPushed(messageId) {
  pushedMessages.set(messageId, true)
}

/**
 * 获取已推送消息数量(用于调试)
 * @returns {number} 已推送消息数量
 */
export function getPushedCount() {
  return pushedMessages.size
}

/**
 * 清空已推送消息记录(用于测试)
 */
export function clearPushedMessages() {
  pushedMessages.clear()
}
