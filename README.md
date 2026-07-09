English|[简体中文](./README.zh-cn.md)
# Multi-Channel Broadcast

**Aggregate multiple Telegram channels into a single microblog**- inspired by [BroadcastChannel](https://github.com/ccbikai/BroadcastChannel).


## 🆚 Difference from BroadcastChannel

| Feature | BroadcastChannel | Multi-Channel Broadcast |
|------|------------------|------------------------|
| Number of Channels | Single Channel | **Multi-channel Aggregation** |
| Content Source | Single Channel | **Mixed from Multiple Channels** |
| Deduplication | Not Required | **Smart Deduplication** |
| Channel Attribution | None | **Displays Source Channel** |
| Rate Control | Basic Retry | **Enhanced Rate Limiting** |
| User Agent | Fixed | **Rotating UA Pool** |
| Comment Function | Supported | **Supported (Multi-channel)** |


---

## Tech Stack

- **Framework**: [Astro](https://astro.build/) v4.15+
- **Content Source**: [Telegram Channels](https://telegram.org/tour/channels)
- **Template**: [Sepia](https://github.com/Planetable/SiteTemplateSepia)
- **Caching**: LRU Cache
- **Code Highlighting**: Prism.js
- **Language Detection**: Flourite


### Local Development

```bash
# Clone the project
git clone https://github.com/banlanzs/MultiChannelBroadCast.git
cd MultiChannelBroadcast

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit the .env file and set CHANNELS

# Start the development server
pnpm dev
```

Visit `http://localhost:4321` to see the result

### Docker Deployment

Deploy using Docker and Docker Compose:

```bash
# Clone the project
git clone https://github.com/banlanzs/MultiChannelBroadCast.git
cd MultiChannelBroadcast

# Configure environment variables
cp .env.example .env
# Edit the .env file, set CHANNELS and other configurations

# Use Docker Compose to build and start (Dockerfile.cn is used by default for users in China)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

Or use Docker commands:

```bash
# Build the image
docker build -t multi-channel-broadcast .

# Run the container
docker run -d \
  --name multi-channel-broadcast \
  -p 4321:4321 \
  -e CHANNELS="channel1,channel2,channel3" \
  -e SITE_NAME="My Blog" \
  -e LOCALE="zh-cn" \
  -e TIMEZONE="Asia/Shanghai" \
  multi-channel-broadcast

# View logs
docker logs -f multi-channel-broadcast

# Stop the container
docker stop multi-channel-broadcast
docker rm multi-channel-broadcast
```

Visit `http://localhost:4321` to see the result

**Notes**:
- Ensure Docker and Docker Compose are installed
- It is recommended to use a `.env` file to manage environment variables
- For production, it is recommended to configure a reverse proxy (e.g., Nginx)

---

## Configuration

Create a `.env` file and configure the following environment variables:

### Core Configuration

```env
## Multi-channel configuration - use commas to separate multiple channels (required)
CHANNELS=channel1,channel2,channel3

## Or use a single channel (backward compatibility)
CHANNEL=your_channel_name

## Site name
SITE_NAME=My Multi-Channel Blog

## Language and timezone
LOCALE=zh-cn
TIMEZONE=Asia/Shanghai
```

### Social Media Configuration

```env
## Social media usernames
TELEGRAM=your_telegram
TWITTER=your_twitter
GITHUB=your_github

## Social media that requires full URLs
MASTODON=https://mastodon.social/@username
BLUESKY=https://bsky.app/profile/username
DISCORD=https://discord.gg/invite
PODCAST=https://your-podcast.com
```

### Advanced Configuration

```env
## Telegram host (generally no need to change)
TELEGRAM_HOST=t.me

## Static resource proxy (optional)
STATIC_PROXY=/static/

## Enable Telegram comments
## Set to true to display the Telegram comment section on the post detail page
## Note: The channel must have the discussion group feature enabled
COMMENTS=true

## Code injection (supports HTML)
HEADER_INJECT=<!-- Google Analytics -->
FOOTER_INJECT=<!-- Footer tracking code -->

## Sentry error tracking (optional)
SENTRY_DSN=your_sentry_dsn
SENTRY_PROJECT=your_project
SENTRY_AUTH_TOKEN=your_auth_token
```

### Telegram Push Notification (Optional)

Automatically push new messages to a specified Telegram channel when content is fetched:

```env
## Enable push notification (set to true to enable)
TELEGRAM_PUSH_ENABLED=true

## Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

## Target channel ID (format: @channelname or chat ID)
## Bot must be admin in the channel or have send message permission
TELEGRAM_PUSH_CHANNEL_ID=@your_channel_name
```

**Setup Steps:**
1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the instructions to get your Bot Token
3. Add the bot as an administrator to your target channel (or ensure it has send message permission)
4. Configure the environment variables above
5. The push feature is disabled by default and won't affect existing functionality


## Custom Styling

Style files are in the `src/assets/` directory:

- `normalize.css` - CSS reset
- `style.css` - Main styles
- `item.css` - Article item styles
- `global.css` - Global styles

You can directly modify these files to customize the website's appearance.

---


**Suggestions**:
- Don't set too many channels (recommend ≤5)
- Appropriately increase cache time
- Use a proxy (if needed)

### How are multi-channel contents sorted?

All channel contents are sorted in **reverse chronological order** by publication time, with the newest content appearing first. Deduplication is also performed to avoid duplicate displays.

### How to distinguish content from different channels?

A "From channel: @channel_name" will be displayed below each piece of content, which can be clicked to jump to that channel.

### How to enable the comment function?

1. Add `COMMENTS=true` to the `.env` file
2. Ensure your Telegram channel has the discussion group feature enabled
3. Click the post timestamp to enter the detail page, and the comment section will appear below

**Notes**:
- The comment function uses the official Telegram widget, and data is stored on Telegram
- Only messages from channels with discussion groups enabled can display comments
- The comment section loads asynchronously and may take a few seconds
- A maximum of 50 comments are displayed per post

---

## Cloudflare Pages Deployment
1. Link the repository
2. Build command
```
pnpm install && pnpm build
dist
```

## Vercel Deployment

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/banlanzs/MultiChannelBroadCast)

### Manual Deployment

1. Fork this repository to your GitHub account
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Configure environment variables (required):
   - `CHANNELS`: Channel list (comma-separated)
   - `SITE_NAME`: Site name
   - See `.env.example` for other optional variables
4. Click "Deploy" to start deployment

### Build Configuration

Vercel will automatically detect the Astro project, no manual configuration needed. If you need to customize:

- **Framework Preset**: Astro
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`
- **Node.js Version**: 20.x

### Environment Variables

Add in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `CHANNELS` | Channel list (comma-separated) | ✅ |
| `SITE_NAME` | Site name | ✅ |
| `LOCALE` | Language code (default: zh-cn) | ❌ |
| `TIMEZONE` | Timezone (default: Asia/Shanghai) | ❌ |
| `COMMENTS` | Enable comments (true/false) | ❌ |

See `.env.example` for the complete list of environment variables.

### Performance Notes

This project uses ISR (Incremental Static Regeneration) caching strategy:
- Pages are cached at edge nodes for 30 minutes
- Automatically regenerated after cache expiration
- First visit may take 1-3 seconds to load
- Subsequent visits respond in <100ms

### Important Notes

⚠️ **Important**:
- Vercel deployment uses serverless architecture, memory cache is not shared
- Background cache update mechanism is not available on Vercel
- For high-traffic scenarios, consider using Docker deployment or configuring Vercel KV (Redis)

## TO DO

### Deployment Related
- [x] Improve Vercel deployment support
- [ ] Optimize Cloudflare Pages build process
- [ ] Add Netlify deployment documentation

### Feature Enhancements
- [ ] Add channel filtering functionality
- [ ] Support custom sorting rules
- [ ] Add channel grouping functionality
- [ ] Support more content platforms

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📄 License

MIT

## Thanks

[BroadcastChannel](https://github.com/ccbikai/BroadcastChannel)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=banlanzs/MultiChannelBroadCast&type=date&legend=top-left)](https://www.star-history.com/#banlanzs/MultiChannelBroadCast&type=date&legend=top-left)