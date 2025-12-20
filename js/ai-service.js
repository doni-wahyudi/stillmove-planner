/**
 * AI Service
 * Handles AI-powered features like habit suggestions, categorization, etc.
 */

import { AI_PROVIDERS, AI_DEFAULT_CONFIG } from './config.js';

const AI_SETTINGS_KEY = 'stillmove_ai_settings';

class AIService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get AI settings from localStorage
     */
    getSettings() {
        try {
            const stored = localStorage.getItem(AI_SETTINGS_KEY);
            if (stored) {
                return { ...AI_DEFAULT_CONFIG, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to load AI settings:', e);
        }
        return AI_DEFAULT_CONFIG;
    }

    /**
     * Get API key from localStorage (stored separately for security)
     */
    getApiKey() {
        try {
            return localStorage.getItem('stillmove_ai_apikey') || '';
        } catch {
            return '';
        }
    }

    /**
     * Check if AI features are available
     */
    isAvailable() {
        const settings = this.getSettings();
        const apiKey = this.getApiKey();
        return settings.enabled && apiKey && settings.baseUrl;
    }

    /**
     * Make a request to the AI API
     */
    async makeRequest(messages, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('AI features not configured. Please set up your API key in Settings > AI Settings');
        }

        const settings = this.getSettings();
        const apiKey = this.getApiKey();
        const provider = AI_PROVIDERS[settings.provider] || {};

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(provider.headers || {})
        };

        // Check if model appears to be a reasoning model (gpt-5, o1, o3, etc.)
        const model = options.model || settings.model;
        const isReasoningModel = /gpt-5|^o1|^o3/i.test(model);
        
        // Reasoning models need much higher token limits
        const maxTokens = options.maxTokens || settings.maxTokens;
        const effectiveMaxTokens = isReasoningModel ? Math.max(maxTokens, 2000) : maxTokens;

        const body = {
            model: model,
            messages: messages,
            max_tokens: effectiveMaxTokens,
            temperature: options.temperature ?? settings.temperature
        };

        // For reasoning models, some providers support max_completion_tokens instead
        if (isReasoningModel) {
            body.max_completion_tokens = effectiveMaxTokens;
        }

        // Build URL - handle trailing slash
        let baseUrl = settings.baseUrl.replace(/\/+$/, '');
        const url = `${baseUrl}/chat/completions`;

        try {
            console.log('AI Request URL:', url);
            console.log('Is reasoning model:', isReasoningModel);
            console.log('AI Request body:', JSON.stringify(body, null, 2));
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('AI Response:', JSON.stringify(data, null, 2));
            
            const content = data.choices[0]?.message?.content || '';
            
            // Check for empty content with reasoning tokens (common with reasoning models)
            if (!content && data.usage?.completion_tokens_details?.reasoning_tokens > 0) {
                console.warn('Model used all tokens for reasoning, no output generated. Try a different model or increase max_tokens.');
                throw new Error('This model uses reasoning tokens but produced no output. Try using a different model (e.g., gpt-4o-mini, gpt-3.5-turbo) or use OpenRouter with free Gemini models.');
            }
            
            return content;
        } catch (error) {
            console.error('AI request failed:', error);
            throw error;
        }
    }

    /**
     * Get cached response or make new request
     */
    async getCachedOrFetch(cacheKey, messages, options = {}) {
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const response = await this.makeRequest(messages, options);
        this.cache.set(cacheKey, response);
        return response;
    }

    /**
     * Suggest daily habits based on a goal
     */
    async suggestHabitsForGoal(goalTitle, goalDescription = '') {
        const cacheKey = `habits-${goalTitle}`;
        
        const messages = [
            {
                role: 'system',
                content: `You are a productivity coach. Suggest 3 specific, actionable daily habits that would help achieve the given goal. Reply ONLY with a JSON array of objects with "name" and "reason" fields. Keep habit names short (under 30 chars). Example: [{"name": "Read 30 minutes", "reason": "Builds knowledge consistently"}]`
            },
            {
                role: 'user',
                content: `Goal: ${goalTitle}${goalDescription ? `\nDetails: ${goalDescription}` : ''}`
            }
        ];

        const response = await this.getCachedOrFetch(cacheKey, messages);
        
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch (e) {
            console.error('Failed to parse AI response:', response);
            return [];
        }
    }

    /**
     * Auto-categorize a time block activity
     */
    async categorizeActivity(activityName, availableCategories) {
        const cacheKey = `cat-${activityName}`;
        
        const messages = [
            {
                role: 'system',
                content: `Categorize the activity into one of these categories: ${availableCategories.join(', ')}. Reply with ONLY the category name, nothing else.`
            },
            {
                role: 'user',
                content: activityName
            }
        ];

        const response = await this.getCachedOrFetch(cacheKey, messages, { maxTokens: 20 });
        const category = response.trim();
        
        // Validate it's one of the available categories
        const match = availableCategories.find(c => 
            c.toLowerCase() === category.toLowerCase()
        );
        
        return match || availableCategories[0];
    }

    /**
     * Parse natural language into structured goal/task
     */
    async parseNaturalLanguage(input) {
        const messages = [
            {
                role: 'system',
                content: `Parse the input into a structured format. Reply ONLY with JSON: {"title": "...", "deadline": "YYYY-MM-DD or null", "category": "...", "type": "goal|task|habit"}. If no deadline mentioned, use null.`
            },
            {
                role: 'user',
                content: input
            }
        ];

        const response = await this.makeRequest(messages, { maxTokens: 100 });
        
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch (e) {
            console.error('Failed to parse:', response);
            return { title: input, deadline: null, category: null, type: 'task' };
        }
    }

    /**
     * Get smart scheduling suggestion
     */
    async suggestSchedule(activities, existingBlocks, preferences = {}) {
        const messages = [
            {
                role: 'system',
                content: `You are a scheduling assistant. Given activities to schedule and existing time blocks, suggest optimal times. Consider: morning for focus work, afternoon for meetings, evening for personal. Reply with JSON array: [{"activity": "...", "suggestedTime": "HH:MM", "duration": minutes, "reason": "..."}]`
            },
            {
                role: 'user',
                content: `Activities to schedule: ${activities.join(', ')}\n\nExisting blocks: ${JSON.stringify(existingBlocks.map(b => ({ time: b.start_time, activity: b.activity })))}`
            }
        ];

        const response = await this.makeRequest(messages);
        
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (e) {
            console.error('Failed to parse schedule:', response);
            return [];
        }
    }

    /**
     * Generate weekly reflection/insights
     */
    async generateWeeklyInsights(weekData) {
        const messages = [
            {
                role: 'system',
                content: `You are a productivity coach. Analyze the weekly data and provide 2-3 brief, actionable insights. Be encouraging but honest. Keep response under 150 words. Start your response immediately with the insights.`
            },
            {
                role: 'user',
                content: `This week's data:
- Time blocks completed: ${weekData.timeBlocks}
- Hours scheduled: ${weekData.hours}
- Habits completed: ${weekData.habitsCompleted}/${weekData.habitsTotal}
- Goals progress: ${weekData.goalsProgress}%
- Most productive day: ${weekData.bestDay}
- Categories: ${JSON.stringify(weekData.categoryBreakdown)}`
            }
        ];

        return await this.makeRequest(messages, { maxTokens: 500 });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export singleton instance
const aiService = new AIService();
export default aiService;
