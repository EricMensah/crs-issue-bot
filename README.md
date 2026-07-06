# crs-issue-bot

> Slack issue reporter for CRS portal staff — report issues, send messages,
> and upload files directly to Slack with zero npm dependencies.

```
npm install ./path/to/crs-issue-bot
```

## Quick Start

```js
const { SlackReporter } = require('crs-issue-bot');

const reporter = new SlackReporter.Builder()
    .setBotToken(process.env.SLACK_BOT_TOKEN)
    .setChannelId(process.env.SLACK_CHANNEL_ID)
    .setAppName('CRS Portal')
    .build();

await reporter.sendMessage('Deployment complete :rocket:');
```

## Setup

1. Create a Slack App at https://api.slack.com/apps
2. Add **Bot Token Scopes**: `chat:write`, `files:write`
3. Install the app and copy the **Bot User OAuth Token** (`xoxb-...`)
4. Invite the bot to your channel: `/invite @your-bot-name`
5. Get the **Channel ID** (right-click channel → View details → ID at bottom)

```bash
set SLACK_BOT_TOKEN=xoxb-your-token-here
set SLACK_CHANNEL_ID=C01234567890
```

## API

### Builder

| Method | Description |
|--------|-------------|
| `setBotToken(token)` | Slack bot token (`xoxb-...`) |
| `setChannelId(id)` | Target channel ID (`C...`) |
| `setAppName(name)` | App name shown in issue reports |
| `build()` | Returns a configured `SlackReporter` instance |

### SlackReporter

#### `sendMessage(text)`

Post a simple text message to the channel.

```js
await reporter.sendMessage(':white_check_mark: Scan completed successfully');
```

#### `uploadFile(filePath, comment?)`

Upload a file using Slack's 3-step API.

```js
await reporter.uploadFile('/tmp/report.pdf', 'Monthly audit report');
```

#### `reportIssue({ title, description, severity, reportedBy, filePath? })`

Format and send a structured issue report.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Short issue title |
| `description` | string | no | Detailed description |
| `severity` | string | yes | `critical` `high` `medium` `low` |
| `reportedBy` | string | no | Email or name of reporter |
| `filePath` | string | no | Path to attach a file |

```js
await reporter.reportIssue({
    title: 'Login page timeout',
    description: 'Users experiencing delays on the login page.',
    severity: 'high',
    reportedBy: 'ops@crs.com',
    filePath: '/tmp/debug.log',
});
```

---

## Requirements

- Node.js 14+
- No npm dependencies (uses built-in `https` and `fs` modules)
