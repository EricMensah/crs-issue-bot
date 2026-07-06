# crs-issue-bot

> Slack issue reporter for the CRS portal — report issues, send messages, and
> upload files to Slack with zero dependencies.

## Install

```bash
npm install crs-issue-bot
```

```bash
yarn add crs-issue-bot
```

## Quick Start

```js
const { SlackBot } = require('crs-issue-bot');

const app = new SlackBot.Builder()
    .setBotToken(process.env.SLACK_BOT_TOKEN)
    .setChannelId(process.env.SLACK_CHANNEL_ID)
    .setAppName('CRS Portal')
    .build();

// Send a message
await app.sendMessage('Deployment complete :rocket:');

// Report an issue
await app.reportIssue({
    title: 'Payment gateway timeout',
    severity: 'critical',
    description: '503 errors on /charge endpoint',
    reportedBy: 'ops@crs.com',
});

// Upload a file
await app.uploadFile('./debug.log', 'Error logs attached');
```

### ESM

```js
import { SlackBot } from 'crs-issue-bot';
```

---

## Prerequisites

1. Create a Slack App at https://api.slack.com/apps
2. Add **Bot Token Scopes**: `chat:write` `files:write`
3. Install the app to your workspace — copy the **Bot User OAuth Token**
4. Invite the bot to your channel: `/invite @your-bot-name`
5. Get the **Channel ID** from channel details

```bash
export SLACK_BOT_TOKEN=xoxb-your-bot-token
export SLACK_CHANNEL_ID=C01234567890
```

---

## API

### `SlackBot.Builder`

| Method | Description |
|--------|-------------|
| `setBotToken(token)` | Slack bot token (`xoxb-...`) |
| `setChannelId(id)` | Target channel ID (`C...`) |
| `setAppName(name)` | App name shown in issue headers |
| `build()` | Returns a configured `SlackBot` |

### `sendMessage(text)`

```js
await app.sendMessage(':white_check_mark: Scan passed');
```

| Param | Type | Description |
|-------|------|-------------|
| `text` | string | Slack mrkdwn message |

### `uploadFile(filePath, comment?)`

```js
await app.uploadFile('/tmp/report.pdf', 'Monthly audit report');
```

| Param | Type | Description |
|-------|------|-------------|
| `filePath` | string | Path to the file to upload |
| `comment` | string? | Optional message with the file |

### `reportIssue({ title, description, severity, reportedBy, filePath? })`

```js
await app.reportIssue({
    title: 'Database connection pool exhausted',
    description: 'Connection pool reached max capacity. App is queuing requests.',
    severity: 'high',
    reportedBy: 'backend@crs.com',
    filePath: '/var/log/app/error.log',
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Short issue summary |
| `description` | string | no | Full description |
| `severity` | string | yes | One of: `critical` `high` `medium` `low` |
| `reportedBy` | string | no | Email or name of the reporter |
| `filePath` | string | no | Attach a file to the report |

Severity determines the emoji and label:

| Severity | Emoji |
|----------|-------|
| `critical` | :red_circle: |
| `high` | :large_orange_circle: |
| `medium` | :large_yellow_circle: |
| `low` | :large_green_circle: |

---

## Requirements

- Node.js 14+
- Zero npm dependencies (uses built-in `https` and `fs`)
