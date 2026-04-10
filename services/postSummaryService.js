const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const SUMMARY_MODEL = process.env.NEMOTRON_SUMMARY_MODEL
    || process.env.NEMOTRON_MODEL
    || process.env.OPENROUTER_MODEL
    || 'nvidia/llama-3.1-nemotron-70b-instruct:free';

const sanitizeDescription = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
};

const buildFallbackSummary = (description) => {
    const text = sanitizeDescription(description);
    if (!text) {
        return {
            shortSummary: 'No user description provided. Location and image were submitted.',
            priority: 'low',
            keywords: []
        };
    }

    return {
        shortSummary: text.length > 180 ? `${text.slice(0, 177)}...` : text,
        priority: 'medium',
        keywords: []
    };
};

exports.summarizePostDescription = async ({ description, lat, lng }) => {
    const fallback = buildFallbackSummary(description);

    if (!process.env.OPENROUTER_API_KEY) {
        return {
            ...fallback,
            source: 'fallback'
        };
    }

    try {
        const prompt = [
            'Summarize this civic issue report for NGO and authority review.',
            'Return strict JSON only with keys: shortSummary, priority, keywords.',
            'Priority must be one of low, medium, high.',
            'Keywords must be an array of up to 5 short strings.',
            `Latitude: ${lat}`,
            `Longitude: ${lng}`,
            `Description: ${sanitizeDescription(description) || 'No description provided.'}`
        ].join('\n');

        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5000',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'Urban-Canopy-Backend'
            },
            body: JSON.stringify({
                model: SUMMARY_MODEL,
                temperature: 0.2,
                max_tokens: 180,
                messages: [
                    {
                        role: 'system',
                        content: 'You summarize civic incident reports for officials. Always return JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            return {
                ...fallback,
                source: 'fallback'
            };
        }

        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) {
            return {
                ...fallback,
                source: 'fallback'
            };
        }

        const parsed = JSON.parse(raw);
        const shortSummary = typeof parsed.shortSummary === 'string' && parsed.shortSummary.trim()
            ? parsed.shortSummary.trim()
            : fallback.shortSummary;
        const priority = ['low', 'medium', 'high'].includes(parsed.priority) ? parsed.priority : fallback.priority;
        const keywords = Array.isArray(parsed.keywords)
            ? parsed.keywords.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
            : fallback.keywords;

        return {
            shortSummary,
            priority,
            keywords,
            source: 'ai',
            model: data?.model || SUMMARY_MODEL
        };
    } catch (err) {
        return {
            ...fallback,
            source: 'fallback'
        };
    }
};