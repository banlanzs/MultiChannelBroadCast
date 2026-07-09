import { getEnv } from '../env'

/**
 * 推送配置对象
 * @typedef {Object} PushConfig
 * @property {boolean} enabled - 是否启用推送
 * @property {string|undefined} botToken - Bot Token
 * @property {string|undefined} channelId - 目标频道 ID
 * @property {boolean} isValid - 配置是否有效
 */

/**
 * 获取推送配置
 * @param {object} [importMetaEnv] - import.meta.env
 * @param {object} [Astro] - Astro context
 * @returns {PushConfig} 推送配置对象
 */
export function getPushConfig(importMetaEnv, Astro) {
  const enabled = getEnv(importMetaEnv, Astro, 'TELEGRAM_PUSH_ENABLED') === 'true'
  const botToken = getEnv(importMetaEnv, Astro, 'TELEGRAM_BOT_TOKEN')
  const channelId = getEnv(importMetaEnv, Astro, 'TELEGRAM_PUSH_CHANNEL_ID')

  const isValid = enabled && !!botToken && !!channelId

  return {
    enabled,
    botToken,
    channelId,
    isValid,
  }
}
