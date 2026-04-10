const { generateChatReply } = require('../services/chatbotService');

exports.chatWithAssistant = async (req, res) => {
    try {
        const { message, history } = req.body;
        const result = await generateChatReply({ message, history });

        return res.json({
            reply: result.reply,
            model: result.model,
            usage: result.usage
        });
    } catch (err) {
        if (err.message === 'Message is required.') {
            return res.status(400).json({ msg: err.message });
        }

        if (err.message === 'OPENROUTER_API_KEY is missing.') {
            return res.status(500).json({ msg: 'Chatbot is not configured on server.' });
        }

        console.error(err.message);
        return res.status(502).json({ msg: 'Failed to fetch chatbot response.' });
    }
};