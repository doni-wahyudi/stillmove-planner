import { AI_PROVIDERS, AI_DEFAULT_CONFIG } from '@/config';

const AI_SETTINGS_KEY = 'stillmove_ai_settings';

export interface AISettings {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface HabitSuggestion {
  name: string;
  reason: string;
}

export interface NaturalLanguageParseResult {
  title: string;
  deadline: string | null;
  category: string | null;
  type: 'goal' | 'task' | 'habit';
}

export interface ScheduleSuggestion {
  activity: string;
  suggestedTime: string;
  duration: number;
  reason: string;
}

class AIService {
  private cache = new Map<string, string>();

  /**
   * Get AI settings from localStorage
   */
  public getSettings(): AISettings {
    try {
      const stored = localStorage.getItem(AI_SETTINGS_KEY);
      if (stored) {
        return { ...AI_DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load AI settings:', e);
    }
    return AI_DEFAULT_CONFIG as AISettings;
  }

  /**
   * Get API key from localStorage (stored separately for security)
   */
  public getApiKey(): string {
    try {
      return localStorage.getItem('stillmove_ai_apikey') || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if AI features are available
   */
  public isAvailable(): boolean {
    const settings = this.getSettings();
    const apiKey = this.getApiKey();
    return settings.enabled && !!apiKey && !!settings.baseUrl;
  }

  /**
   * Make a request to the AI API
   */
  public async makeRequest(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: Partial<Pick<AISettings, 'model' | 'maxTokens' | 'temperature'>> = {}
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error(
        'AI features not configured. Please set up your API key in Settings > AI Settings'
      );
    }

    const settings = this.getSettings();
    const apiKey = this.getApiKey();
    const provider = AI_PROVIDERS[settings.provider] || {};

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider.headers || {}),
    };

    // Check if model appears to be a reasoning model (gpt-5, o1, o3, etc.)
    const model = options.model || settings.model;
    const isReasoningModel = /gpt-5|^o1|^o3/i.test(model);

    // Reasoning models need much higher token limits
    const maxTokens = options.maxTokens || settings.maxTokens;
    const effectiveMaxTokens = isReasoningModel
      ? Math.max(maxTokens, 2000)
      : maxTokens;

    const body: Record<string, any> = {
      model: model,
      messages: messages,
      max_tokens: effectiveMaxTokens,
      temperature: options.temperature ?? settings.temperature,
    };

    // For reasoning models, some providers support max_completion_tokens instead
    if (isReasoningModel) {
      body.max_completion_tokens = effectiveMaxTokens;
    }

    // Build URL - handle trailing slash
    const baseUrl = settings.baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    try {
      console.log('AI Request URL:', url);
      console.log('Is reasoning model:', isReasoningModel);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // Check for empty content with reasoning tokens
      if (
        !content &&
        data.usage?.completion_tokens_details?.reasoning_tokens > 0
      ) {
        console.warn(
          'Model used all tokens for reasoning, no output generated. Try a different model or increase max_tokens.'
        );
        throw new Error(
          'This model used reasoning tokens but produced no output. Try using a different model (e.g., gpt-4o-mini) or use OpenRouter with free Gemini models.'
        );
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
  public async getCachedOrFetch(
    cacheKey: string,
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: Partial<Pick<AISettings, 'model' | 'maxTokens' | 'temperature'>> = {}
  ): Promise<string> {
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const response = await this.makeRequest(messages, options);
    this.cache.set(cacheKey, response);
    return response;
  }

  /**
   * Suggest daily habits based on a goal
   */
  public async suggestHabitsForGoal(
    goalTitle: string,
    goalDescription = ''
  ): Promise<HabitSuggestion[]> {
    const cacheKey = `habits-${goalTitle}`;

    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: `You are a productivity coach. Suggest 3 specific, actionable daily habits that would help achieve the given goal. Reply ONLY with a JSON array of objects with "name" and "reason" fields. Keep habit names short (under 30 chars). Example: [{"name": "Read 30 minutes", "reason": "Builds knowledge consistently"}]`,
      },
      {
        role: 'user',
        content: `Goal: ${goalTitle}${
          goalDescription ? `\nDetails: ${goalDescription}` : ''
        }`,
      },
    ];

    const response = await this.getCachedOrFetch(cacheKey, messages);

    try {
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
  public async categorizeActivity(
    activityName: string,
    availableCategories: string[]
  ): Promise<string> {
    const cacheKey = `cat-${activityName}`;

    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: `Categorize the activity into one of these categories: ${availableCategories.join(
          ', '
        )}. Reply with ONLY the category name, nothing else.`,
      },
      {
        role: 'user',
        content: activityName,
      },
    ];

    const response = await this.getCachedOrFetch(cacheKey, messages, {
      maxTokens: 20,
    });
    const category = response.trim();

    const match = availableCategories.find(
      (c) => c.toLowerCase() === category.toLowerCase()
    );

    return match || availableCategories[0];
  }

  /**
   * Parse natural language into structured goal/task
   */
  public async parseNaturalLanguage(
    input: string
  ): Promise<NaturalLanguageParseResult> {
    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: `Parse the input into a structured format. Reply ONLY with JSON: {"title": "...", "deadline": "YYYY-MM-DD or null", "category": "...", "type": "goal|task|habit"}. If no deadline mentioned, use null.`,
      },
      {
        role: 'user',
        content: input,
      },
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
  public async suggestSchedule(
    activities: string[],
    existingBlocks: { start_time: string; activity: string }[]
  ): Promise<ScheduleSuggestion[]> {
    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: `You are a scheduling assistant. Given activities to schedule and existing time blocks, suggest optimal times. Consider: morning for focus work, afternoon for meetings, evening for personal. Reply with JSON array: [{"activity": "...", "suggestedTime": "HH:MM", "duration": 30, "reason": "..."}]`,
      },
      {
        role: 'user',
        content: `Activities to schedule: ${activities.join(
          ', '
        )}\n\nExisting blocks: ${JSON.stringify(
          existingBlocks.map((b) => ({ time: b.start_time, activity: b.activity }))
        )}`,
      },
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
  public async generateWeeklyInsights(weekData: {
    timeBlocks: number;
    hours: number;
    habitsCompleted: number;
    habitsTotal: number;
    goalsProgress: number;
    bestDay: string;
    categoryBreakdown: Record<string, number>;
  }): Promise<string> {
    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: `You are a productivity coach. Analyze the weekly data and provide 2-3 brief, actionable insights. Be encouraging but honest. Keep response under 150 words. Start your response immediately with the insights.`,
      },
      {
        role: 'user',
        content: `This week's data:
- Time blocks completed: ${weekData.timeBlocks}
- Hours scheduled: ${weekData.hours}
- Habits completed: ${weekData.habitsCompleted}/${weekData.habitsTotal}
- Goals progress: ${weekData.goalsProgress}%
- Most productive day: ${weekData.bestDay}
- Categories: ${JSON.stringify(weekData.categoryBreakdown)}`,
      },
    ];

    return await this.makeRequest(messages, { maxTokens: 500 });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

const aiService = new AIService();
export default aiService;
