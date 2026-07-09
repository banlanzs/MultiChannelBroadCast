#!/usr/bin/env node
// 后台定时缓存更新脚本
// 定期更新Telegram频道数据缓存

import { LRUCache } from 'lru-cache';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { $fetch } from 'ofetch';
import * as cheerio from 'cheerio';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建一个临时的LRU缓存实例用于预构建
const backgroundCache = new LRUCache({
  ttl: 1000 * 60 * 60, // 1小时TTL
  maxSize: 200 * 1024 * 1024, // 200MB最大缓存
  sizeCalculation: (item) => {
    return JSON.stringify(item).length;
  },
  allowStale: true,
});

// 模拟环境变量获取函数
function getEnv(env, astro, key) {
  return process.env[key] || (astro && astro.locals && astro.locals[key]) || (env && env[key]);
}

// 从环境变量获取频道配置
function getChannelsFromEnv() {
  const channelsStr = process.env.CHANNELS || process.env.CHANNEL || '';
  return channelsStr.split(',').map(c => c.trim()).filter(Boolean);
}

// 请求速率限制器 - 防止Telegram风控
class RateLimiter {
  constructor(maxRequests = 5, timeWindow = 10000) {
    this.maxRequests = maxRequests // 每个时间窗口最多请求数
    this.timeWindow = timeWindow // 时间窗口(毫秒)
    this.requests = []
  }

  async waitForSlot() {
    const now = Date.now()
    // 清理过期的请求记录
    this.requests = this.requests.filter(time => now - time < this.timeWindow)

    if (this.requests.length >= this.maxRequests) {
      // 需要等待
      const oldestRequest = this.requests[0]
      const waitTime = this.timeWindow - (now - oldestRequest) + Math.random() * 1000
      console.info(`Rate limit reached, waiting ${Math.round(waitTime)}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.waitForSlot() // 递归检查
    }

    this.requests.push(now)
  }
}

const rateLimiter = new RateLimiter(3, 10000) // 每10秒最多3个请求

// 不必要的请求头
const unnecessaryHeaders = ['host', 'cookie', 'origin', 'referer']

// 用户代理池
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
]

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

// 随机延迟函数 - 模拟真实用户行为
function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

// 获取单个频道信息
async function getSingleChannelInfo(channel, { before = '', after = '', q = '' } = {}) {
  const cacheKey = JSON.stringify({ channel, before, after, q });
  const cachedResult = backgroundCache.get(cacheKey);

  if (cachedResult) {
    console.info('Cache hit for channel:', channel);
    return JSON.parse(JSON.stringify(cachedResult));
  }

  // 速率限制
  await rateLimiter.waitForSlot();

  // 反风控：Host 随机池 (与主代码逻辑保持一致)
  const hostStr = process.env.TELEGRAM_HOST || 't.me';
  const hosts = hostStr.split(',').map(h => h.trim()).filter(Boolean);
  const host = hosts[Math.floor(Math.random() * hosts.length)];
  const staticProxy = process.env.STATIC_PROXY || '';

  const url = `https://${host}/s/${channel}`;
  const headers = {};

  Object.keys(headers).forEach((key) => {
    if (unnecessaryHeaders.includes(key)) {
      delete headers[key];
    }
  });

  // 添加随机User-Agent
  headers['User-Agent'] = getRandomUserAgent();

  console.info('Fetching channel:', channel, { before, after, q });

  try {
    const html = await $fetch(url, {
      headers,
      query: {
        before: before || undefined,
        after: after || undefined,
        q: q || undefined,
      },
      retry: 3,
      retryDelay: 1000, // 增加重试延迟
      timeout: 15000, // 增加超时时间
    });

    const $ = cheerio.load(html, {}, false);

    const posts = $('.tgme_channel_history .tgme_widget_message_wrap')?.map((index, item) => {
      const postItem = $(item).find('.tgme_widget_message');
      const content = $(postItem).find('.tgme_widget_message_text');
      const title = content?.text()?.match(/^.*?(?=[。\n]|http\S)/g)?.[0] ?? content?.text() ?? '';
      const id = $(postItem).attr('data-post')?.replace(new RegExp(`${channel}/`, 'i'), '');

      return {
        id,
        title,
        channel,
        type: $(postItem).attr('class')?.includes('service_message') ? 'service' : 'text',
        datetime: $(postItem).find('.tgme_widget_message_date time')?.attr('datetime'),
      };
    })?.get()?.reverse().filter(post => ['text'].includes(post.type) && post.id && post.content);

    const channelInfo = {
      posts: posts || [],
      title: $('.tgme_channel_info_header_title')?.text(),
      description: $('.tgme_channel_info_description')?.text(),
      avatar: $('.tgme_page_photo_image img')?.attr('src'),
      username: channel,
    };

    backgroundCache.set(cacheKey, channelInfo);

    // 添加随机延迟
    await randomDelay(500, 1500);

    return channelInfo;
  }
  catch (error) {
    console.error(`Error fetching channel ${channel}:`, error);
    // 返回空数据而不是抛出错误
    return {
      posts: [],
      title: channel,
      description: '',
      avatar: null,
      username: channel,
    };
  }
}

// 获取多个频道聚合信息
async function getChannelInfo({ before = '', after = '', q = '' } = {}) {
  const channelsStr = process.env.CHANNELS || process.env.CHANNEL || '';
  if (!channelsStr) {
    throw new Error('No CHANNELS or CHANNEL environment variable set');
  }

  const channels = channelsStr.split(',').map(c => c.trim()).filter(Boolean);

  // 如果只有一个频道,直接返回
  if (channels.length === 1) {
    return getSingleChannelInfo(channels[0], { before, after, q });
  }

  // 多频道聚合
  const cacheKey = JSON.stringify({ channels, before, after, q });
  const cachedResult = backgroundCache.get(cacheKey);

  if (cachedResult) {
    console.info('Cache hit for multi-channel');
    return JSON.parse(JSON.stringify(cachedResult));
  }

  console.info('Fetching multi-channel:', channels);

  try {
    // 并发获取所有频道数据(带速率限制)
    const channelInfos = await Promise.all(
      channels.map(channel => getSingleChannelInfo(channel, { before, after, q }))
    );

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
      return timeB - timeA // 降序
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

    // 构建聚合结果
    const siteName = process.env.SITE_NAME || 'Multi-Channel Broadcast'
    const aggregatedInfo = {
      posts: allPosts,
      title: siteName,
      description: `Aggregated content from ${channels.length} channels: ${channels.join(', ')}`,
      avatar: channelInfos[0]?.avatar || null,
      channels: channelInfos.map(info => ({
        username: info.username,
        title: info.title,
        avatar: info.avatar,
      })),
    }

    backgroundCache.set(cacheKey, aggregatedInfo)
    return aggregatedInfo
  }
  catch (error) {
    console.error('Error fetching multi-channel:', error)
    throw error
  }
}

// 更新缓存数据
async function updateCache() {
  const channels = getChannelsFromEnv();
  
  if (channels.length === 0) {
    console.log('未配置任何频道，跳过缓存更新');
    return;
  }
  
  console.log(`开始更新 ${channels.length} 个频道的缓存数据...`);
  
  try {
    // 更新首页聚合数据
    console.log('更新首页聚合数据...');
    await getChannelInfo({});
    console.log('首页聚合数据更新完成');
    
    // 更新每个单独频道的数据
    for (const channel of channels) {
      console.log(`更新频道 ${channel} 的数据...`);
      try {
        await getChannelInfo({ channel });
        console.log(`频道 ${channel} 数据更新完成`);
      } catch (error) {
        console.error(`更新频道 ${channel} 数据时出错:`, error.message);
      }
    }
    
    console.log('所有频道缓存数据更新完成');
    return true;
  } catch (error) {
    console.error('更新缓存数据时出错:', error);
    return false;
  }
}

// 主函数
async function main() {
  console.log('开始后台缓存更新任务...');
  
  const success = await updateCache();
  
  if (success) {
    console.log('后台缓存更新任务完成');
    process.exit(0);
  } else {
    console.error('后台缓存更新任务失败');
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateCache };