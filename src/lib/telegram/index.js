import { $fetch } from 'ofetch'
import * as cheerio from 'cheerio'
import { LRUCache } from 'lru-cache'
import flourite from 'flourite'
import prism from '../prism'
import { getEnv } from '../env'
import { pushMessage } from './push-service.js'

// ==========================================
// 反风控配置
// ==========================================

// User-Agent 池：模拟真实桌面浏览器
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// 随机延迟函数 (毫秒) - 模拟真人操作间隔
function randomDelay(min = 2000, max = 4000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

// 图片代理服务配置
const IMAGE_PROXIES = [
  {
    name: 'cdnjson',
    enabled: true,
    build: (encoded) => `https://cdn.cdnjson.com/pic.html?url=${encoded}`
  },
  {
    name: 'sogoucdn',
    enabled: false, // 禁用: 对 Telegram 图床不兼容
    build: (encoded, raw) => {
      const hash = hashStringToIndex(raw, 9) + 1
      const shard = String(hash).padStart(2, '0')
      const httpsUrl = raw.replace(/^http:\/\//i, 'https://')
      return `https://img0${shard}.sogoucdn.com/v2/thumb/retype_exclude_gif/ext/auto/q/95/?appid=122&url=${encodeURIComponent(httpsUrl)}`
    }
  },
  {
    name: 'noobzone',
    enabled: false, // 禁用: 防盗链严格，ReferrerPolicy 在部分环境可能失效导致 403
    build: (encoded) => `https://img.noobzone.ru/getimg.php?url=${encoded}`
  },
  {
    name: 'weserv',
    enabled: true,
    build: (encoded) => `https://images.weserv.nl/?url=${encoded}`
  },
  {
    name: 'wsrv',
    enabled: true,
    build: (encoded) => `https://wsrv.nl/?url=${encoded}`
  }
]

const FALLBACK_PROXY_NAME = 'wsrv'

// 哈希函数 - 确保同一 URL 映射到同一代理
function hashStringToIndex(str, modulo) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash % modulo
}

// 图片代理帮助函数 - 多代理哈希分片负载均衡
function getProxyUrl(url) {
  if (!url) return ''

  const encoded = encodeURIComponent(url)

  // 过滤启用的代理,排除 wsrv 作为主选项
  const primaryProxies = IMAGE_PROXIES.filter(p => p.enabled && p.name !== FALLBACK_PROXY_NAME)

  if (primaryProxies.length === 0) {
    // 降级到 wsrv.nl
    const fallback = IMAGE_PROXIES.find(p => p.name === FALLBACK_PROXY_NAME)
    return fallback.build(encoded, url)
  }

  const primaryIndex = hashStringToIndex(url, primaryProxies.length)
  const primary = primaryProxies[primaryIndex]

  try {
    return primary.build(encoded, url)
  } catch (error) {
    console.error('Proxy URL build failed:', error)
    const fallback = IMAGE_PROXIES.find(p => p.name === FALLBACK_PROXY_NAME)
    return fallback.build(encoded, url)
  }
}

// 故障转移 URL 生成函数
function getFallbackUrl(url) {
  if (!url) return ''
  const fallback = IMAGE_PROXIES.find(p => p.name === FALLBACK_PROXY_NAME)
  return fallback.build(encodeURIComponent(url), url)
}

// 使用 BroadcastChannel 的简单缓存配置
const cache = new LRUCache({
  ttl: 1000 * 60 * 5, // 5分钟TTL
  maxSize: 50 * 1024 * 1024, // 50MB最大缓存
  sizeCalculation: (item) => {
    return JSON.stringify(item).length
  },
})

// 不必要的请求头
const unnecessaryHeaders = ['host', 'cookie', 'origin', 'referer']

function getVideoStickers($, item, { staticProxy, index }) {
  return $(item).find('.js-videosticker_video')?.map((_index, video) => {
    const url = $(video)?.attr('src')
    const imgurl = $(video).find('img')?.attr('src')
    const fallbackUrl = getFallbackUrl(imgurl)
    return `
    <div style="background-image: none; width: 256px;">
      <video src="${staticProxy + url}" width="100%" height="100%" alt="Video Sticker" preload muted autoplay loop playsinline disablepictureinpicture >
        <img class="sticker" src="${getProxyUrl(imgurl)}" alt="Video Sticker" loading="${index > 4 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackUrl}'" />
      </video>
    </div>
    `
  })?.get()?.join('')
}

function getImageStickers($, item, { index }) {
  return $(item).find('.tgme_widget_message_sticker')?.map((_index, image) => {
    const url = $(image)?.attr('data-webp')
    const fallbackUrl = getFallbackUrl(url)
    return `<img class="sticker" src="${getProxyUrl(url)}" style="width: 256px;" alt="Sticker" loading="${index > 4 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackUrl}'" />`
  })?.get()?.join('')
}

function getImages($, item, { id, index, title }) {
  const images = $(item).find('.tgme_widget_message_photo_wrap')?.map((_index, photo) => {
    const url = $(photo).attr('style').match(/url\(["'](.*?)["']/)?.[1]
    const popoverId = `modal-${id}-${_index}`
    const fallbackUrl = getFallbackUrl(url)
    return `
      <button class="image-preview-button image-preview-wrap" popovertarget="${popoverId}" popovertargetaction="show">
        <img src="${getProxyUrl(url)}" alt="${title}" loading="${index > 4 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackUrl}'" />
      </button>
      <button class="image-preview-button modal" id="${popoverId}" popovertarget="${popoverId}" popovertargetaction="hide" popover>
        <img class="modal-img" src="${getProxyUrl(url)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackUrl}'" />
      </button>
    `
  })?.get()
  return images.length ? `<div class="image-list-container ${images.length % 2 === 0 ? 'image-list-even' : 'image-list-odd'}">${images?.join('')}</div>` : ''
}

function getVideo($, item, { staticProxy, index }) {
  const video = $(item).find('.tgme_widget_message_video_wrap video')
  video?.attr('src', staticProxy + video?.attr('src'))
    ?.attr('controls', true)
    ?.attr('preload', index > 4 ? 'auto' : 'metadata')
    ?.attr('playsinline', true).attr('webkit-playsinline', true)

  const roundVideo = $(item).find('.tgme_widget_message_roundvideo_wrap video')
  roundVideo?.attr('src', staticProxy + roundVideo?.attr('src'))
    ?.attr('controls', true)
    ?.attr('preload', index > 4 ? 'auto' : 'metadata')
    ?.attr('playsinline', true).attr('webkit-playsinline', true)
  return $.html(video) + $.html(roundVideo)
}

function getAudio($, item, { staticProxy }) {
  const audio = $(item).find('.tgme_widget_message_voice')
  audio?.attr('src', staticProxy + audio?.attr('src'))
    ?.attr('controls', true)
  return $.html(audio)
}

function getLinkPreview($, item, { staticProxy, index }) {
  const link = $(item).find('.tgme_widget_message_link_preview')
  const title = $(item).find('.link_preview_title')?.text() || $(item).find('.link_preview_site_name')?.text()
  const description = $(item).find('.link_preview_description')?.text()

  link?.attr('target', '_blank').attr('rel', 'noopener').attr('title', description)

  const image = $(item).find('.link_preview_image')
  const src = image?.attr('style')?.match(/url\(["'](.*?)["']/i)?.[1]
  const imageSrc = src ? getProxyUrl(src) : ''
  const fallbackUrl = src ? getFallbackUrl(src) : ''

  image?.replaceWith(`<img class="link_preview_image" alt="${title}" src="${imageSrc}" loading="${index > 4 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackUrl}'" />`)
  return $.html(link)
}

function getReply($, item, { channel }) {
  const reply = $(item).find('.tgme_widget_message_reply')
  reply?.wrapInner('<small></small>')?.wrapInner('<blockquote></blockquote>')

  const href = reply?.attr('href')
  if (href) {
    const url = new URL(href)
    reply?.attr('href', `${url.pathname}`.replace(new RegExp(`/${channel}/`, 'i'), '/posts/'))
  }

  // 处理回复消息的缩略图
  const thumb = reply?.find('.tgme_widget_message_reply_thumb')
  if (thumb && thumb.length > 0) {
    const style = thumb.attr('style')
    if (style) {
      const urlMatch = style.match(/url\(['"]?(.*?)['"]?\)/)
      if (urlMatch && urlMatch[1]) {
        const originalUrl = urlMatch[1]
        // CSS 背景图直接使用 wsrv.nl (无法使用 onerror)
        const proxiedUrl = getFallbackUrl(originalUrl)
        const newStyle = style.replace(urlMatch[0], `url('${proxiedUrl}')`)
        thumb.attr('style', newStyle)
      }
    }
  }

  return $.html(reply)
}

function modifyHTMLContent($, content, { index } = {}) {
  $(content).find('.emoji')?.removeAttr('style')
  $(content).find('a')?.each((_index, a) => {
    $(a)?.attr('title', $(a)?.text())?.removeAttr('onclick')
  })
  $(content).find('tg-spoiler')?.each((_index, spoiler) => {
    const id = `spoiler-${index}-${_index}`
    $(spoiler)?.attr('id', id)
      ?.wrap('<label class="spoiler-button"></label>')
      ?.before(`<input type="checkbox" />`)
  })
  $(content).find('pre').each((_index, pre) => {
    try {
      $(pre).find('br')?.replaceWith('\n')

      const code = $(pre).text()
      const language = flourite(code, { shiki: true, noUnknown: true })?.language || 'text'
      const highlightedCode = prism.highlight(code, prism.languages[language], language)
      $(pre).html(`<code class="language-${language}">${highlightedCode}</code>`)
    }
    catch (error) {
      console.error(error)
    }
  })
  return content
}

function getPost($, item, { channel, staticProxy, index = 0 }) {
  item = item ? $(item).find('.tgme_widget_message') : $('.tgme_widget_message')
  const content = $(item).find('.js-message_reply_text')?.length > 0
    ? modifyHTMLContent($, $(item).find('.tgme_widget_message_text.js-message_text'), { index })
    : modifyHTMLContent($, $(item).find('.tgme_widget_message_text'), { index })
  const title = content?.text()?.match(/^.*?(?=[。\n]|http\S)/g)?.[0] ?? content?.text() ?? ''
  const id = $(item).attr('data-post')?.replace(new RegExp(`${channel}/`, 'i'), '')

  const tags = $(content).find('a[href^="?q="]')?.each((_index, a) => {
    $(a)?.attr('href', `/search/${encodeURIComponent($(a)?.text())}`)
  })?.map((_index, a) => $(a)?.text()?.replace('#', ''))?.get()

  return {
    id,
    title,
    channel, // 添加频道信息用于多频道聚合
    type: $(item).attr('class')?.includes('service_message') ? 'service' : 'text',
    datetime: $(item).find('.tgme_widget_message_date time')?.attr('datetime'),
    tags,
    text: content?.text(),
    content: [
      getReply($, item, { channel }),
      getImages($, item, { id, index, title }),
      getVideo($, item, { staticProxy, id, index, title }),
      getAudio($, item, { staticProxy, id, index, title }),
      content?.html(),
      getImageStickers($, item, { index }),
      getVideoStickers($, item, { staticProxy, index }),
      $(item).find('.tgme_widget_message_poll')?.html(),
      $.html($(item).find('.tgme_widget_message_document_wrap')),
      $.html($(item).find('.tgme_widget_message_video_player.not_supported')),
      $.html($(item).find('.tgme_widget_message_location_wrap')),
      getLinkPreview($, item, { staticProxy, index }),
    ].filter(Boolean).join(''),
  }
}

/**
 * 获取单个频道信息
 * @param {object} Astro - Astro context
 * @param {string} channel - 频道用户名
 * @param {object} options - 选项 {before, after, q, type, id}
 */
export async function getSingleChannelInfo(Astro, channel, { before = '', after = '', q = '', type = 'list', id = '' } = {}) {
  const cacheKey = JSON.stringify({ channel, before, after, q, type, id })
  const cachedResult = cache.get(cacheKey)

  if (cachedResult) {
    console.info('Match Cache', channel, { before, after, q, type, id })
    return JSON.parse(JSON.stringify(cachedResult))
  }

  /* Helper function to check if a URL is an image handled by wsrv */
  const isImageRequest = (url) => {
    return true; // We assume we use this proxy primarily for images in this context
  }

  // Load balance between wsrv.nl and statically.io

  // Keep using local proxy for non-image assets (video, audio) if needed
  // or fallback to '' if no local proxy defined (though local proxy is detected via env normally)
  const localProxy = getEnv(import.meta.env, Astro, 'STATIC_PROXY') ?? ''
  
  // 反风控：Host 随机池 (支持配置多个 Host，随机选择以分散压力)
  const hostStr = getEnv(import.meta.env, Astro, 'TELEGRAM_HOST') || 't.me'
  const hosts = hostStr.split(',').map(h => h.trim()).filter(Boolean)
  const host = hosts[Math.floor(Math.random() * hosts.length)]

  // 构建请求头
  const headers = Astro.request ? Object.fromEntries(Astro.request.headers) : {}
  Object.keys(headers).forEach((key) => {
    if (unnecessaryHeaders.includes(key)) {
      delete headers[key]
    }
  })

  // 反风控：确保始终带有有效的 User-Agent (覆盖 Cron 等缺失 UA 的场景)
  if (!headers['User-Agent'] || headers['User-Agent'].toLowerCase().includes('bot') || headers['User-Agent'].toLowerCase().includes('crawler')) {
    headers['User-Agent'] = getRandomUserAgent()
  }

  // 如果是单个帖子,先获取频道首页来提取频道标题
  let channelTitle = channel
  let channelAvatar = null
  let channelAvatarOriginal = null

  if (id) {
    try {
      // 请求频道首页获取频道标题
      const channelPageUrl = `https://${host}/s/${channel}`
      console.info('Fetching channel info from:', channelPageUrl)

      const channelHtml = await $fetch(channelPageUrl, {
        headers,
        retry: 2,
        retryDelay: 100,
      })

      const $channel = cheerio.load(channelHtml, {}, false)
      channelTitle = $channel('.tgme_page_title span')?.text()?.trim() ||
        $channel('.tgme_page_title')?.text()?.trim() ||
        $channel('.tgme_channel_info_header_title')?.text()?.trim() ||
        channel
      channelAvatarOriginal = $channel('.tgme_page_photo_image img')?.attr('src')

      // 通过静态代理加载头像
      if (channelAvatarOriginal) {
        channelAvatar = getProxyUrl(channelAvatarOriginal)
      }

      console.info('Channel info extracted:', { channel, channelTitle, hasAvatar: !!channelAvatar })
    } catch (error) {
      console.warn('Failed to fetch channel info, using username:', error.message)
    }
  }

  // 请求帖子内容
  const url = id ? `https://${host}/${channel}/${id}?embed=1&mode=tme` : `https://${host}/s/${channel}`
  console.info('Fetching content from:', url, { before, after, q, type, id })

  const html = await $fetch(url, {
    headers,
    query: {
      before: before || undefined,
      after: after || undefined,
      q: q || undefined,
    },
    retry: 3,
    retryDelay: 100,
  })

  const $ = cheerio.load(html, {}, false)

  if (id) {
    // Pass specific proxies for different media types
    const post = getPost($, null, {
      channel,
      staticProxy: localProxy, // Videos/Audio use local
    })

    // 返回包含频道信息的对象
    const result = {
      ...post,
      channelTitle, // 从频道首页获取的昵称
      channelAvatar,
      channelAvatarFallback: channelAvatarOriginal ? getFallbackUrl(channelAvatarOriginal) : null,
    }
    cache.set(cacheKey, result)
    return result
  }

  // 列表页获取频道信息
  if (!channelTitle || channelTitle === channel) {
    channelTitle = $('.tgme_page_title span')?.text()?.trim() ||
      $('.tgme_page_title')?.text()?.trim() ||
      $('.tgme_channel_info_header_title')?.text()?.trim() ||
      channel
  }

  if (!channelAvatar) {
    channelAvatarOriginal = $('.tgme_page_photo_image img')?.attr('src')
    // 通过静态代理加载头像
    if (channelAvatarOriginal) {
      channelAvatar = getProxyUrl(channelAvatarOriginal)
    }
  }

  let posts = $('.tgme_channel_history .tgme_widget_message_wrap')?.map((index, item) => {
    return getPost($, item, {
      channel,
      staticProxy: localProxy,
      index
    })
  })?.get()?.reverse().filter(post => ['text'].includes(post.type) && post.id && post.content)

  // 去重: Telegram 搜索页偶尔会重复渲染同一条消息
  if (posts?.length) {
    const seen = new Set()
    posts = posts.filter((post) => {
      const key = `${post.channel}-${post.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // 异步推送新消息
  if (posts?.length > 0) {
    const pushTask = (async () => {
      // 按时间倒序,只推送最新的几条消息,避免一次性推送太多
      const recentPosts = posts.slice(0, 3)
      for (const post of recentPosts) {
        try {
          await pushMessage(post, Astro, import.meta.env)
          // 每条消息间隔 1 秒,避免触发速率限制
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (err) {
          console.error('[Push] Unhandled error:', err)
        }
      }
    })()

    // Cloudflare Pages: 使用 waitUntil 确保响应返回后继续执行
    if (Astro?.locals?.cfContext) {
      Astro.locals.cfContext.waitUntil(pushTask)
    }
  }

  const channelInfo = {
    posts,
    title: channelTitle,
    description: $('.tgme_channel_info_description')?.text(),
    descriptionHTML: modifyHTMLContent($, $('.tgme_channel_info_description'))?.html(),
    avatar: channelAvatar,
    avatarFallback: channelAvatarOriginal ? getFallbackUrl(channelAvatarOriginal) : null,
    username: channel,
  }

  cache.set(cacheKey, channelInfo)
  return channelInfo
}

/**
 * 获取多个频道聚合信息 - 核心多频道功能
 * @param {object} Astro - Astro context  
 * @param {object} options - 选项 {before, after, q}
 */
export async function getChannelInfo(Astro, { before = '', after = '', q = '' } = {}) {
  const channelsStr = getEnv(import.meta.env, Astro, 'CHANNELS') || getEnv(import.meta.env, Astro, 'CHANNEL')
  if (!channelsStr) {
    throw new Error('No CHANNELS or CHANNEL environment variable set')
  }

  const channels = Array.from(new Set(channelsStr.split(',').map(c => c.trim()).filter(Boolean)))

  // 如果只有一个频道,直接返回
  if (channels.length === 1) {
    return getSingleChannelInfo(Astro, channels[0], { before, after, q })
  }

  // 多频道聚合
  const cacheKey = JSON.stringify({ channels, before, after, q })
  const cachedResult = cache.get(cacheKey)

  if (cachedResult) {
    console.info('Match Cache (multi-channel)')
    return JSON.parse(JSON.stringify(cachedResult))
  }

  console.info('Fetching multi-channel:', channels)

  // 分批并发获取频道数据 (防风控: 限制单次并发量)
  const channelInfos = []
  const BATCH_SIZE = 2 // 每次最多并发 2 个频道

  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(channel => getSingleChannelInfo(Astro, channel, { before, after, q }))
    )
    channelInfos.push(...batchResults)

    // 每批之间随机延迟 (模拟真人翻页间隔，降低风控概率)
    if (i + BATCH_SIZE < channels.length) {
      await randomDelay(2000, 4000)
    }
  }

  // 聚合所有帖子
  let allPosts = []
  channelInfos.forEach(info => {
    if (info.posts && info.posts.length > 0) {
      allPosts = allPosts.concat(info.posts)
    }
  })

  // 按时间倒序排序
  allPosts.sort((a, b) => {
    const timeA = new Date(a.datetime).getTime()
    const timeB = new Date(b.datetime).getTime()
    return timeB - timeA
  })

  // 去重(基于频道+ID)
  const seen = new Set()
  allPosts = allPosts.filter(post => {
    const key = `${post.channel}-${post.id}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })

  // 异步推送新消息
  if (allPosts.length > 0) {
    const pushTask = (async () => {
      // 按时间倒序,只推送最新的几条消息,避免一次性推送太多
      const recentPosts = allPosts.slice(0, 3)
      for (const post of recentPosts) {
        try {
          await pushMessage(post, Astro, import.meta.env)
          // 每条消息间隔 1 秒,避免触发速率限制
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (err) {
          console.error('[Push] Unhandled error:', err)
        }
      }
    })()

    // Cloudflare Pages: 使用 waitUntil 确保响应返回后继续执行
    if (Astro?.locals?.cfContext) {
      Astro.locals.cfContext.waitUntil(pushTask)
    }
  }

  // 构建聚合结果
  const siteName = getEnv(import.meta.env, Astro, 'SITE_NAME') || 'Multi-Channel Broadcast'
  const aggregatedInfo = {
    posts: allPosts,
    title: siteName,
    description: `Aggregated content from ${channels.length} channels: ${channels.join(', ')}`,
    descriptionHTML: `<p>Aggregated content from ${channels.length} channels: ${channels.join(', ')}</p>`,
    avatar: channelInfos[0]?.avatar || null,
    channels: channelInfos.map(info => ({
      username: info.username,
      title: info.title,
      avatar: info.avatar,
    })),
  }

  cache.set(cacheKey, aggregatedInfo)
  return aggregatedInfo
}

