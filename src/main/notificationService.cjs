const { Notification } = require('electron');
const notificationModels = require('../models/notificationModels')

function getDaysUntilExpiry(expiryDateString) {
    const expiry = new Date(expiryDateString);
    const today = new Date;
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function formatNotificationContent(token, daysUntilExpiry) {
    const serviceName = token.service_name;
    const tokenName = token.token_name;
    const expiryDate = new Date(token.expiry_date).toLocaleDateString();

    let title, body, urgency;

    if (daysUntilExpiry === 7) {
        title = `${serviceName} token expiring soon`;
        body = `Your '${tokenName}' expires in 7 days (${expiryDate}). Update it now to avoid service disruption.`;
        urgency = 'normal';
    } else if (daysUntilExpiry === 1) {
        title = `⚠️ ${serviceName} token expires tomorrow`;
        body = `Your '${tokenName}' expires tomorrow (${expiryDate}). Update it immediately!`;
        urgency = 'critical';
    } else if (daysUntilExpiry <= 0) {
        title = `🔴 ${serviceName} token has expired`;
        body = `Your '${tokenName}' expired on ${expiryDate}. Services may be disrupted.`;
        urgency = 'critical';
    } else {
        title = `${serviceName} token expiring`;
        body = `Your '${tokenName}' expires in ${daysUntilExpiry} days (${expiryDate}).`;
        urgency = 'normal';
    }
    return { title, body, urgency };
}

async function sendTokenExpiryNotification(token, daysUntilExpiry, category) {
    try {
        // Check if notifications are supported
        if (!Notification.isSupported()) {
            console.error('Notifications are not supported on this system');
            return false;
        }

        const alreadySent = await notificationModels.hasNotificationBeenSent(token.id, category);

        if (alreadySent) {
            console.log(`Notification already sent for token ${token.id} (${category})`);
            return false;
        }

        const { title, body, urgency } = formatNotificationContent(token, daysUntilExpiry);

        const notification = new Notification({
            title,
            body,
            urgency,
            timeoutType: 'default',
            silent: false
        });

        notification.on('show', () => {
            console.log(`✓ Notification displayed: ${title}`);
        });

        notification.on('failed', (error) => {
            console.error(`✗ Notification failed:`, error);
        });

        notification.show();

        await notificationModels.recordNotification(
            token.id,
            category,
            `${title}: ${body}`,
            daysUntilExpiry
        );

        console.log(`Sent ${category} notification for token: ${token.token_name}`);
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

async function checkExpiringTokens() {
    try {
        console.log('[Notifications] Checking for expiring tokens...');
        const tokens = await notificationModels.getTokensExpiringWithin(365);
        let notificationsSent = 0;

        for (const token of tokens) {
            const daysUntilExpiry = getDaysUntilExpiry(token.expiry_date);
            if (daysUntilExpiry === 7) {
                const sent = await sendTokenExpiryNotification(token, 7, 'SEVEN_DAYS');
                if (sent) notificationsSent++;
            }
            if (daysUntilExpiry === 1) {
                const sent = await sendTokenExpiryNotification(token, 1, 'ONE_DAY');
                if (sent) notificationsSent++;
            }
            if (daysUntilExpiry <= 0) {
                const sent = await sendTokenExpiryNotification(token, daysUntilExpiry, 'EXPIRED');
                if (sent) notificationsSent++;
            }
        }
        console.log(`[Notifications] Check complete. Sent ${notificationsSent} notifications.`);
        return notificationsSent; 
    } catch (error) {
        console.error('[Notifications] Error checking expiring token:', error);
        return 0;
    }
}

function startNotificationScheduler() {
    console.log('[Notifications] Starting notification scheduler...');
    setTimeout(() => {
        checkExpiringTokens();
    }, 5000);

    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => {
        checkExpiringTokens();
    }, SIX_HOURS);

    console.log('[Notifications] Scheduler started (checking every 6 hours)');
}

module.exports = {
    checkExpiringTokens,
    startNotificationScheduler
}