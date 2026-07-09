import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the env module
vi.mock('../../env.js', () => ({
  getEnv: (importMetaEnv, Astro, key) => {
    if (importMetaEnv && importMetaEnv[key]) return importMetaEnv[key]
    return undefined
  }
}))

describe('Push Config Module', () => {
  let getPushConfig

  beforeEach(async () => {
    // Clear module cache to get fresh imports
    vi.resetModules()
    const mod = await import('../push-config.js')
    getPushConfig = mod.getPushConfig
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return disabled config when TELEGRAM_PUSH_ENABLED is not set', () => {
    const config = getPushConfig({}, null)
    expect(config.enabled).toBe(false)
    expect(config.isValid).toBe(false)
  })

  it('should return disabled config when TELEGRAM_PUSH_ENABLED is false', () => {
    const env = { TELEGRAM_PUSH_ENABLED: 'false' }
    const config = getPushConfig(env, null)
    expect(config.enabled).toBe(false)
    expect(config.isValid).toBe(false)
  })

  it('should return enabled config when all variables are set', () => {
    const env = {
      TELEGRAM_PUSH_ENABLED: 'true',
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_PUSH_CHANNEL_ID: '@test-channel'
    }
    const config = getPushConfig(env, null)
    expect(config.enabled).toBe(true)
    expect(config.botToken).toBe('test-token')
    expect(config.channelId).toBe('@test-channel')
    expect(config.isValid).toBe(true)
  })

  it('should return invalid when bot token is missing', () => {
    const env = {
      TELEGRAM_PUSH_ENABLED: 'true',
      TELEGRAM_PUSH_CHANNEL_ID: '@test-channel'
    }
    const config = getPushConfig(env, null)
    expect(config.enabled).toBe(true)
    expect(config.isValid).toBe(false)
  })

  it('should return invalid when channel ID is missing', () => {
    const env = {
      TELEGRAM_PUSH_ENABLED: 'true',
      TELEGRAM_BOT_TOKEN: 'test-token'
    }
    const config = getPushConfig(env, null)
    expect(config.enabled).toBe(true)
    expect(config.isValid).toBe(false)
  })
})

describe('Push Dedup Module', () => {
  let hasPushed, markAsPushed, getPushedCount, clearPushedMessages

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../push-dedup.js')
    hasPushed = mod.hasPushed
    markAsPushed = mod.markAsPushed
    getPushedCount = mod.getPushedCount
    clearPushedMessages = mod.clearPushedMessages
    clearPushedMessages()
  })

  it('should return false for new message ID', () => {
    expect(hasPushed('channel:123')).toBe(false)
  })

  it('should return true after marking as pushed', () => {
    const messageId = 'channel:123'
    markAsPushed(messageId)
    expect(hasPushed(messageId)).toBe(true)
  })

  it('should track multiple message IDs', () => {
    markAsPushed('channel:1')
    markAsPushed('channel:2')
    markAsPushed('channel:3')

    expect(hasPushed('channel:1')).toBe(true)
    expect(hasPushed('channel:2')).toBe(true)
    expect(hasPushed('channel:3')).toBe(true)
    expect(hasPushed('channel:4')).toBe(false)
  })

  it('should return correct count', () => {
    markAsPushed('channel:1')
    markAsPushed('channel:2')
    expect(getPushedCount()).toBe(2)
  })

  it('should clear all messages', () => {
    markAsPushed('channel:1')
    markAsPushed('channel:2')
    clearPushedMessages()
    expect(getPushedCount()).toBe(0)
    expect(hasPushed('channel:1')).toBe(false)
  })

  it('should return 0 on fresh start (first deployment)', () => {
    expect(getPushedCount()).toBe(0)
  })
})

describe('Push Formatter Module', () => {
  let formatPushMessage

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../push-formatter.js')
    formatPushMessage = mod.formatPushMessage
  })

  const sampleMessage = {
    id: '123',
    channel: 'test-channel',
    channelTitle: 'Test Channel',
    title: 'Test Title',
    content: '<p>This is test content</p>',
    datetime: '2026-05-06T10:00:00Z'
  }

  it('should format message with HTML parse mode', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.parse_mode).toBe('HTML')
  })

  it('should include title in formatted message', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.text).toContain('<b>Test Title</b>')
  })

  it('should include channel link', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.text).toContain('来源:')
    expect(result.text).toContain('https://t.me/test-channel')
    expect(result.text).toContain('Test Channel')
  })

  it('should include publish time', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.text).toContain('发布时间:')
  })

  it('should include post URL as plain text', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.text).toContain('/posts/test-channel/123')
  })

  it('should truncate long messages', () => {
    const longContent = '<p>' + 'A'.repeat(5000) + '</p>'
    const longMessage = {
      ...sampleMessage,
      content: longContent
    }
    const result = formatPushMessage(longMessage)
    expect(result.text.length).toBeLessThanOrEqual(4096)
  })

  it('should escape HTML special characters', () => {
    const messageWithSpecialChars = {
      ...sampleMessage,
      title: 'Test <script>alert("xss")</script>',
      content: '<p>Content with & special chars</p>'
    }
    const result = formatPushMessage(messageWithSpecialChars)
    expect(result.text).not.toContain('<script>')
    expect(result.text).toContain('&lt;script&gt;')
    expect(result.text).toContain('&amp;')
  })

  it('should handle message without title', () => {
    const messageWithoutTitle = {
      ...sampleMessage,
      title: ''
    }
    const result = formatPushMessage(messageWithoutTitle)
    expect(result.text).toBeDefined()
  })

  it('should generate summary from content', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.text).toContain('This is test content')
  })

  it('should use siteUrl in post link when provided', () => {
    const result = formatPushMessage(sampleMessage, {
      siteUrl: 'https://example.com'
    })
    expect(result.text).toContain('https://example.com/posts/test-channel/123')
  })

  it('should include imageUrl in result when provided', () => {
    const messageWithImage = {
      ...sampleMessage,
      imageUrl: 'https://example.com/image.jpg'
    }
    const result = formatPushMessage(messageWithImage)
    expect(result.imageUrl).toBe('https://example.com/image.jpg')
  })

  it('should return null imageUrl when not provided', () => {
    const result = formatPushMessage(sampleMessage)
    expect(result.imageUrl).toBe(null)
  })
})
