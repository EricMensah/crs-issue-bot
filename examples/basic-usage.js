/**
 * Basic usage example for crs-issue-bot
 *
 * Run:
 *   set SLACK_BOT_TOKEN=xoxb-xxx...
 *   set SLACK_CHANNEL_ID=C04B7DALX70
 *   node examples/basic-usage.js
 */

const { SlackBot } = require('../index');

async function main() {
    // ---- Build the app ----
    const app = new SlackBot.Builder()
        .setBotToken(process.env.SLACK_BOT_TOKEN)
        .setChannelId(process.env.SLACK_CHANNEL_ID)
        .setAppName('CRS Portal')
        .build();

    // ---- 1. Send a simple message ----
    console.log('Sending message...');
    await app.sendMessage(
        ':white_check_mark: *CRS Portal* — deployment to production completed successfully.'
    );

    // ---- 2. Report an issue ----
    console.log('Reporting issue...');
    await app.reportIssue({
        title: 'User login timeout',
        description: 'Users are experiencing 10+ second delays on the login page. Possible database connection pool exhaustion.',
        severity: 'high',
        reportedBy: 'ops@crs.com',
    });

    // ---- 3. Report a critical issue with file attachment ----
    console.log('Reporting critical issue with file...');
    await app.reportIssue({
        title: 'Payment gateway returning 503',
        description: 'Payment API is unresponsive. Error rate increased by 300% in the last 5 minutes.',
        severity: 'critical',
        reportedBy: 'backend@crs.com',
        filePath: './examples/error.log', // optional file attachment
    });

    // ---- 4. Upload a file alone ----
    console.log('Uploading file...');
    await app.uploadFile('./package.json', 'Package config for reference');

    console.log('All done!');
}

main().catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
