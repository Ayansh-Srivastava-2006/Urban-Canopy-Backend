const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.NEMOTRON_MODEL || process.env.OPENROUTER_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct:free';

const toMessage = (message) => {
    if (!message || typeof message !== 'object') return null;
    const role = ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user';
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (!content) return null;
    return { role, content };
};

exports.generateChatReply = async ({ message, history = [] }) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is missing.');
    }

    const sanitizedHistory = Array.isArray(history)
        ? history.map(toMessage).filter(Boolean).slice(-12)
        : [];

    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) {
        throw new Error('Message is required.');
    }

    const payload = {
        model: OPENROUTER_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are an assistant for Urban Canopy. Provide concise, practical, and safe responses for civic reporting workflows.'
            },
            ...sanitizedHistory,
            { role: 'user', content: userMessage }
        ],
        temperature: 0.4,
        max_tokens: 500
    };

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5000',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Urban-Canopy-Backend'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nemotron API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('Nemotron API returned an empty response.');
    }

    return {
        reply: content,
        model: data?.model || OPENROUTER_MODEL,
        usage: data?.usage || null
    };
};