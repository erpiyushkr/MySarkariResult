/**
 * Returns a formatted message suitable for Telegram, Twitter, LinkedIn, and WhatsApp forwarding.
 * @param {string} title - The post title
 * @param {string} url - Full canonical URL
 * @returns {string} Formatted message
 */
function formatMessage(title, url) {
    return `📢 New Update — MySarkariResult

${title}

View Details:
${url}

#MySarkariResult #GovtJobs`;
}

module.exports = formatMessage;
