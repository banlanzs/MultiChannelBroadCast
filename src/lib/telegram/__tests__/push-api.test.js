import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendTelegramMessage } from '../push-api.js'

// Mock ofetch
vi.mock('ofetch', () => ({
  $fetch: vi.fn()
}))

import { $fetch } from 'ofetch'

describe('Push API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return success on successful text response', async () => {
    $fetch.mockResolvedValue({ ok: true })

    const result = await sendTelegramMessage(
      'test-token',
      '@test-channel',
      {
        text: 'Test message',
        parse_mode: 'HTML'
      }
    )

    expect(result.success).toBe(true)
    expect($fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          chat_id: '@test-channel',
          text: 'Test message',
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      })
    )
  })

  it('should use sendPhoto when imageUrl is provided', async () => {
    $fetch.mockResolvedValue({ ok: true })

    const result = await sendTelegramMessage(
      'test-token',
      '@test-channel',
      {
        text: 'Test message',
        parse_mode: 'HTML',
        imageUrl: 'https://example.com/image.jpg'
      }
    )

    expect(result.success).toBe(true)
    expect($fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendPhoto',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          chat_id: '@test-channel',
          photo: 'https://example.com/image.jpg',
          caption: 'Test message',
          parse_mode: 'HTML'
        })
      })
    )
  })

  it('should return error on HTTP 401', async () => {
    const error = new Error('Unauthorized')
    error.response = { status: 401 }
    $fetch.mockRejectedValue(error)

    const result = await sendTelegramMessage(
      'invalid-token',
      '@test-channel',
      { text: 'Test', parse_mode: 'HTML' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid bot token')
  })

  it('should return error on HTTP 403', async () => {
    const error = new Error('Forbidden')
    error.response = { status: 403 }
    $fetch.mockRejectedValue(error)

    const result = await sendTelegramMessage(
      'test-token',
      '@private-channel',
      { text: 'Test', parse_mode: 'HTML' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('forbidden')
  })

  it('should return error on HTTP 429 (rate limit)', async () => {
    const error = new Error('Rate limited')
    error.response = { status: 429 }
    $fetch.mockRejectedValue(error)

    const result = await sendTelegramMessage(
      'test-token',
      '@test-channel',
      { text: 'Test', parse_mode: 'HTML' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Rate limited')
  })

  it('should return error on timeout', async () => {
    const error = new Error('Request timeout')
    error.code = 'ETIMEDOUT'
    $fetch.mockRejectedValue(error)

    const result = await sendTelegramMessage(
      'test-token',
      '@test-channel',
      { text: 'Test', parse_mode: 'HTML' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('timeout')
  })

  it('should return error on unknown error', async () => {
    const error = new Error('Network error')
    $fetch.mockRejectedValue(error)

    const result = await sendTelegramMessage(
      'test-token',
      '@test-channel',
      { text: 'Test', parse_mode: 'HTML' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
})
