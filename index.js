/**
 * crs-issue-bot — Slack issue reporter for CRS portal staff
 *
 * Usage:
 *   const { SlackReporter } = require('@EricMensah/crs-issue-bot');
 *
 *   const app = new SlackReporter.Builder()
 *       .setBotToken(process.env.SLACK_BOT_TOKEN)
 *       .setChannelId(process.env.SLACK_CHANNEL_ID)
 *       .setAppName('CRS Portal')
 *       .build();
 *
 *   await app.sendMessage('Deployment complete');
 *   await app.reportIssue({ title: 'Login failed', severity: 'critical', description: '...' });
 *   await app.uploadFile('./debug.log', 'Error log attached');
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Internal — low-level HTTPS request to Slack Web API
// ---------------------------------------------------------------------------
function slackRequest(method, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const url = new URL(`https://slack.com/api/${method}`);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (!parsed.ok) {
                        return reject(new Error(`Slack API ${method} error: ${parsed.error || 'unknown'}`));
                    }
                    resolve(parsed);
                } catch (err) {
                    reject(new Error(`Slack API ${method} invalid response: ${data.slice(0, 200)}`));
                }
            });
        });

        req.on('error', (err) => reject(new Error(`Slack API ${method} request failed: ${err.message}`)));
        req.write(body);
        req.end();
    });
}

// ---------------------------------------------------------------------------
// SlackReporter class
// ---------------------------------------------------------------------------
class SlackReporter {
    /**
     * @param {object} config
     * @param {string} config.botToken   - Slack bot token (xoxb-...)
     * @param {string} config.channelId  - Target channel ID (C...)
     * @param {string} [config.appName]  - Optional app name for issue formatting
     */
    constructor(config) {
        if (!config || !config.botToken || !config.channelId) {
            throw new Error('SlackReporter: botToken and channelId are required');
        }
        this._botToken = config.botToken;
        this._channelId = config.channelId;
        this._appName = config.appName || 'CRS App';
    }

    // -----------------------------------------------------------------------
    // Builder
    // -----------------------------------------------------------------------
    static get Builder() {
        return class SlackReporterBuilder {
            constructor() {
                this.config = {};
            }

            setBotToken(token) {
                this.config.botToken = token;
                return this;
            }

            setChannelId(id) {
                this.config.channelId = id;
                return this;
            }

            setAppName(name) {
                this.config.appName = name;
                return this;
            }

            build() {
                if (!this.config.botToken) throw new Error('SlackReporter.Builder: botToken is required');
                if (!this.config.channelId) throw new Error('SlackReporter.Builder: channelId is required');
                return new SlackReporter(this.config);
            }
        };
    }

    // -----------------------------------------------------------------------
    // sendMessage — post a plain text message to the channel
    // -----------------------------------------------------------------------
    async sendMessage(text) {
        if (!text || typeof text !== 'string') throw new Error('sendMessage: text must be a non-empty string');

        const result = await slackRequest('chat.postMessage', {
            channel: this._channelId,
            text,
        });
        return result;
    }

    // -----------------------------------------------------------------------
    // uploadFile — upload a file to the channel via 3-step Slack API
    // -----------------------------------------------------------------------
    async uploadFile(filePath, comment) {
        if (!filePath) throw new Error('uploadFile: filePath is required');
        if (!fs.existsSync(filePath)) throw new Error(`uploadFile: file not found — ${filePath}`);

        const stats = fs.statSync(filePath);
        if (stats.size <= 0) throw new Error(`uploadFile: file is empty — ${filePath}`);

        const filename = path.basename(filePath);
        const fileSize = stats.size;

        // Step 1: getUploadURLExternal
        const step1 = await slackRequest('files.getUploadURLExternal', {
            filename,
            length: fileSize,
            alt_txt: filename,
        });

        const uploadUrl = step1.upload_url;
        const fileId = step1.file_id;

        // Step 2: upload binary to the returned CDN URL
        await new Promise((resolve, reject) => {
            const url = new URL(uploadUrl);
            const fileStream = fs.createReadStream(filePath);
            const req = https.request(
                {
                    hostname: url.hostname,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': fileSize,
                    },
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
                        else reject(new Error(`Binary upload failed (HTTP ${res.statusCode}): ${data.slice(0, 200)}`));
                    });
                }
            );
            req.on('error', reject);
            fileStream.pipe(req);
        });

        // Step 3: completeUploadExternal
        const step3 = await slackRequest('files.completeUploadExternal', {
            files: [{ id: fileId, title: filename }],
            channel_id: this._channelId,
            initial_comment: comment || '',
        });

        return step3;
    }

    // -----------------------------------------------------------------------
    // reportIssue — format and send an issue report to Slack
    // -----------------------------------------------------------------------
    async reportIssue({ title, description, severity, reportedBy, filePath } = {}) {
        if (!title) throw new Error('reportIssue: title is required');
        if (!severity) throw new Error('reportIssue: severity is required');

        const validSeverities = ['critical', 'high', 'medium', 'low'];
        const sev = severity.toLowerCase();
        if (!validSeverities.includes(sev)) {
            throw new Error(`reportIssue: severity must be one of: ${validSeverities.join(', ')}`);
        }

        const severityEmoji = {
            critical: ':red_circle:',
            high: ':large_orange_circle:',
            medium: ':large_yellow_circle:',
            low: ':large_green_circle:',
        };

        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const emoji = severityEmoji[sev];
        const reportedLine = reportedBy ? `> *Reported by:* ${reportedBy}` : '';

        const message = [
            `${emoji} *[${this._appName}] Issue Report — ${sev.toUpperCase()}*`,
            ``,
            `>*Title:* ${title}`,
            `>*Severity:* ${sev.toUpperCase()}`,
            reportedLine,
            `>*Time:* ${timestamp} UTC`,
            ``,
            description ? `>${description}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        if (filePath) {
            return this.uploadFile(filePath, message);
        }

        return this.sendMessage(message);
    }
}

module.exports = { SlackReporter };
