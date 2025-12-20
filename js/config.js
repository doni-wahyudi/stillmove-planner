// Supabase Configuration
// Replace these values with your actual Supabase project credentials
// You can find these in your Supabase project settings under API

export const SUPABASE_URL = 'https://qoubdtqujluxqfkwleuh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdWJkdHF1amx1eHFma3dsZXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTAwNDUsImV4cCI6MjA4MDMyNjA0NX0.i0zo6ipADvqmacBuCU72mpagy2kyn-YFU2bZMFdC4Ks';

// AI Configuration
// API key is stored in localStorage for security (not exposed in source code)
// Users configure this in Settings > AI Settings

// Provider presets for easy configuration
export const AI_PROVIDERS = {
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [
            // Free Google Models
            { id: 'google/gemini-2.0-flash-exp:free', name: '⭐ Gemini 2.0 Flash Exp (Free)' },
            { id: 'google/gemma-3-27b-it:free', name: '⭐ Gemma 3 27B (Free)' },
            { id: 'google/gemma-3-12b-it:free', name: '⭐ Gemma 3 12B (Free)' },
            { id: 'google/gemma-3-4b-it:free', name: '⭐ Gemma 3 4B (Free)' },
            { id: 'google/gemma-3n-e4b-it:free', name: '⭐ Gemma 3n 4B (Free)' },
            { id: 'google/gemma-3n-e2b-it:free', name: '⭐ Gemma 3n 2B (Free)' },
            // Free Meta Models
            { id: 'meta-llama/llama-3.3-70b-instruct:free', name: '⭐ Llama 3.3 70B (Free)' },
            { id: 'meta-llama/llama-3.1-405b-instruct:free', name: '⭐ Llama 3.1 405B (Free)' },
            { id: 'meta-llama/llama-3.2-3b-instruct:free', name: '⭐ Llama 3.2 3B (Free)' },
            // Free Qwen Models
            { id: 'qwen/qwen3-coder:free', name: '⭐ Qwen3 Coder 480B (Free)' },
            { id: 'qwen/qwen3-4b:free', name: '⭐ Qwen3 4B (Free)' },
            { id: 'qwen/qwen-2.5-vl-7b-instruct:free', name: '⭐ Qwen 2.5 VL 7B (Free)' },
            // Free DeepSeek Models
            { id: 'deepseek/deepseek-r1-0528:free', name: '⭐ DeepSeek R1 0528 (Free)' },
            { id: 'tngtech/deepseek-r1t-chimera:free', name: '⭐ DeepSeek R1T Chimera (Free)' },
            { id: 'tngtech/deepseek-r1t2-chimera:free', name: '⭐ DeepSeek R1T2 Chimera (Free)' },
            // Free Mistral Models
            { id: 'mistralai/devstral-2512:free', name: '⭐ Devstral 2 2512 (Free)' },
            { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: '⭐ Mistral Small 3.1 24B (Free)' },
            { id: 'mistralai/mistral-7b-instruct:free', name: '⭐ Mistral 7B (Free)' },
            // Free NVIDIA Models
            { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: '⭐ Nemotron Nano 12B V2 VL (Free)' },
            { id: 'nvidia/nemotron-nano-9b-v2:free', name: '⭐ Nemotron Nano 9B V2 (Free)' },
            { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: '⭐ Nemotron 3 Nano 30B (Free)' },
            // Free OpenAI OSS Models
            { id: 'openai/gpt-oss-120b:free', name: '⭐ GPT-OSS 120B (Free)' },
            { id: 'openai/gpt-oss-20b:free', name: '⭐ GPT-OSS 20B (Free)' },
            // Free Other Models
            { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: '⭐ Hermes 3 405B (Free)' },
            { id: 'moonshotai/kimi-k2:free', name: '⭐ Kimi K2 (Free)' },
            { id: 'allenai/olmo-3.1-32b-think:free', name: '⭐ Olmo 3.1 32B Think (Free)' },
            { id: 'xiaomi/mimo-v2-flash:free', name: '⭐ MiMo V2 Flash (Free)' },
            { id: 'kwaipilot/kat-coder-pro:free', name: '⭐ KAT-Coder-Pro (Free)' },
            { id: 'z-ai/glm-4.5-air:free', name: '⭐ GLM 4.5 Air (Free)' }
        ],
        headers: {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Daily Planner'
        }
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fast)' },
            { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B' }
        ],
        headers: {}
    },
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
            { id: 'o1-mini', name: 'o1 Mini (Reasoning)' },
            { id: 'o1', name: 'o1 (Reasoning)' }
        ],
        headers: {}
    },
    custom: {
        name: 'Custom',
        baseUrl: '',
        models: [],
        headers: {}
    }
};

// Default AI settings (used when nothing in localStorage)
export const AI_DEFAULT_CONFIG = {
    enabled: false,
    provider: 'openrouter',
    baseUrl: AI_PROVIDERS.openrouter.baseUrl,
    model: 'google/gemini-2.0-flash-exp:free',
    maxTokens: 500,
    temperature: 1.0  // Default to 1.0 for maximum compatibility
};

// Application Configuration
export const APP_CONFIG = {
    appName: 'Daily Planner',
    version: '1.0.0',
    defaultView: 'weekly',
    
    // Invitation Code Settings
    // IMPORTANT: Change these codes regularly for security
    // You can add multiple valid codes separated by commas
    invitationCodes: [
        'PLANNER2025',
        'WELCOME2025',
        'DAILYPLAN'
    ],
    
    // Pomodoro Timer Settings
    pomodoro: {
        focusDuration: 25 * 60, // 25 minutes in seconds
        shortBreakDuration: 5 * 60, // 5 minutes in seconds
        longBreakDuration: 15 * 60, // 15 minutes in seconds
        sessionsBeforeLongBreak: 4
    },
    
    // Habit Tracking Settings
    habits: {
        maxDailyHabits: 30,
        maxWeeklyHabits: 10,
        defaultWaterGoal: 8 // glasses per day
    },
    
    // Reading List Settings
    reading: {
        maxBooks: 50
    }
};
