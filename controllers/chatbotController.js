const { generateChatReply } = require('../services/chatbotService');

/**
 * POST /api/chatbot
 * Authenticated: Any role can chat with the AI assistant.
 */
exports.chatWithAssistant = async (req, res) => {
    try {
        const { message, history } = req.body;
        const result = await generateChatReply({ message, history });

        return res.json({
            success: true,
            data: {
                reply: result.reply,
                model: result.model,
                usage: result.usage
            }
        });
    } catch (err) {
        if (err.message === 'Message is required.') {
            return res.status(400).json({ success: false, error: { code: 'MISSING_MESSAGE', message: err.message } });
        }

        if (err.message === 'OPENROUTER_API_KEY is missing.') {
            return res.status(500).json({ success: false, error: { code: 'CHATBOT_NOT_CONFIGURED', message: 'Chatbot is not configured on server.' } });
        }

        console.error('chatWithAssistant error:', err.message);
        return res.status(502).json({ success: false, error: { code: 'UPSTREAM_ERROR', message: 'Failed to fetch chatbot response.' } });
    }
};