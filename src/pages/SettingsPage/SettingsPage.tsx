import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/Toast/Toast';
import dataService from '@/services/DataService';
import aiService, { type AISettings } from '@/services/AIService';
import cacheService from '@/services/CacheService';
import { getSupabaseClient } from '@/db/supabase';
import { AI_PROVIDERS } from '@/config';
import './SettingsPage.css';

type ActiveTab = 'general' | 'ai' | 'profiles' | 'account' | 'data';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const {
    profiles,
    activeProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('general');

  // General Settings State
  const [preferences, setPreferences] = useState({
    soundEnabled: true,
    hapticEnabled: true,
    weekStart: '0', // 0 Sunday, 1 Monday, 6 Saturday
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  });

  // Account Settings State
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState<AISettings>({
    enabled: false,
    provider: 'openrouter',
    baseUrl: '',
    model: '',
    maxTokens: 500,
    temperature: 1.0,
  });
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiModels, setAiModels] = useState<{ id: string; name: string }[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [customModelId, setCustomModelId] = useState('');

  // Sub Profiles Edit State
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileEmoji, setNewProfileEmoji] = useState('👤');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmoji, setEditingEmoji] = useState('👤');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProfileId, setUploadingProfileId] = useState<string | null>(null);

  // Data State
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importFile, setImportFile] = useState<File | null>(null);

  // Initialize display settings and user details
  useEffect(() => {
    // Load local preferences
    const savedPrefs = localStorage.getItem('stillmove_preferences');
    if (savedPrefs) {
      try {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(savedPrefs) }));
      } catch (e) {
        console.warn('Failed to load preferences:', e);
      }
    }

    // Load AI Config
    const aiSettings = aiService.getSettings();
    const apiKey = aiService.getApiKey();
    setAiConfig(aiSettings);
    setAiApiKey(apiKey);
    setCustomUrl(aiSettings.baseUrl);
    if (aiSettings.provider === 'custom') {
      setCustomModelId(aiSettings.model);
    }

    // Load User Account Profile
    const loadUserProfile = async () => {
      try {
        const profile = await dataService.getUserProfile();
        if (profile) {
          setDisplayName(profile.display_name || '');
          setTimezone(profile.timezone || 'UTC');
        }
      } catch (e) {
        console.error('Failed to load user profile:', e);
      }
    };
    loadUserProfile();
  }, []);

  // Update AI models list when provider changes
  useEffect(() => {
    const provider = aiConfig.provider;
    const provInfo = AI_PROVIDERS[provider];
    if (provInfo) {
      setAiModels(provInfo.models || []);
    } else {
      setAiModels([]);
    }
  }, [aiConfig.provider]);

  // General Settings Handlers
  const handlePreferenceChange = (key: string, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('stillmove_preferences', JSON.stringify(updated));
    showToast('Preference saved', 'success');
  };

  const handleSaveDisplaySettings = () => {
    localStorage.setItem('stillmove_preferences', JSON.stringify(preferences));
    showToast('Display settings saved', 'success');
  };

  // Account Settings Handlers
  const handleSaveAccount = async () => {
    try {
      await dataService.upsertUserProfile({
        display_name: displayName,
        timezone: timezone,
      });
      showToast('Profile saved successfully', 'success');
    } catch (e) {
      showToast('Failed to save profile', 'error');
    }
  };

  // AI Configuration Handlers
  const handleSaveAiConfig = () => {
    try {
      const finalModel =
        aiConfig.provider === 'custom' ? customModelId : aiConfig.model;
      const finalUrl =
        aiConfig.provider === 'custom'
          ? customUrl
          : AI_PROVIDERS[aiConfig.provider]?.baseUrl || '';

      const updatedConfig = {
        ...aiConfig,
        baseUrl: finalUrl,
        model: finalModel,
      };

      localStorage.setItem('stillmove_ai_settings', JSON.stringify(updatedConfig));
      localStorage.setItem('stillmove_ai_apikey', aiApiKey);
      showToast('AI settings saved successfully', 'success');
    } catch (e) {
      showToast('Failed to save AI settings', 'error');
    }
  };

  const handleTestAiConnection = async () => {
    try {
      showToast('Testing AI connection...', 'info');
      // Create a temporary instance to test with the unsaved state
      const provider = aiConfig.provider;
      const provInfo = AI_PROVIDERS[provider];
      const finalModel = provider === 'custom' ? customModelId : aiConfig.model;
      const finalUrl =
        provider === 'custom' ? customUrl : provInfo?.baseUrl || '';

      // Set headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
        ...(provInfo?.headers || {}),
      };

      const body = {
        model: finalModel,
        messages: [{ role: 'user', content: 'Say "Connection successful!" in exactly three words.' }],
        max_tokens: 15,
        temperature: 0.7,
      };

      const response = await fetch(`${finalUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      showToast(`AI connection successful: "${content}"`, 'success');
    } catch (error: any) {
      showToast(`AI connection failed: ${error.message}`, 'error');
    }
  };

  // Profiles CRUD Handlers
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      showToast('Profile name is required', 'warning');
      return;
    }
    try {
      await createProfile(newProfileName.trim(), newProfileEmoji);
      setNewProfileName('');
      setNewProfileEmoji('👤');
      showToast('Profile created successfully', 'success');
    } catch (e) {
      showToast('Failed to create profile', 'error');
    }
  };

  const handleStartEditing = (profile: any) => {
    setEditingProfileId(profile.id);
    setEditingName(profile.name);
    setEditingEmoji(profile.emoji || '👤');
  };

  const handleSaveProfileEdit = async () => {
    if (!editingProfileId) return;
    if (!editingName.trim()) {
      showToast('Profile name is required', 'warning');
      return;
    }
    try {
      await updateProfile(editingProfileId, {
        name: editingName.trim(),
        emoji: editingEmoji,
      });
      setEditingProfileId(null);
      showToast('Profile updated successfully', 'success');
    } catch (e) {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleDeleteProfileClick = async (profileId: string) => {
    if (profiles.length <= 1) {
      showToast('Cannot delete the only profile', 'warning');
      return;
    }
    if (confirm('Are you sure you want to delete this profile? All its isolated data will be lost forever.')) {
      try {
        await deleteProfile(profileId);
        showToast('Profile deleted successfully', 'success');
      } catch (e) {
        showToast('Failed to delete profile', 'error');
      }
    }
  };

  // Avatar Base64 Photo Upload Handlers
  const handlePhotoUploadClick = (profileId: string) => {
    setUploadingProfileId(profileId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingProfileId) return;

    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed', 'warning');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        await updateProfile(uploadingProfileId, { avatar_data: base64Data });
        showToast('Profile picture uploaded successfully', 'success');
      } catch (err) {
        showToast('Failed to upload profile picture', 'error');
      } finally {
        setUploadingProfileId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async (profileId: string) => {
    try {
      await updateProfile(profileId, { avatar_data: null });
      showToast('Profile picture removed', 'success');
    } catch (err) {
      showToast('Failed to remove profile picture', 'error');
    }
  };

  // Data Export/Import Handlers
  const handleExportData = async () => {
    try {
      showToast('Preparing export data...', 'info');
      // Fetch all tables from DB
      const tables = [
        'annual_goals',
        'reading_list',
        'monthly_data',
        'weekly_goals',
        'time_blocks',
        'daily_entries',
        'daily_habits',
        'daily_habit_completions',
        'weekly_habits',
        'weekly_habit_completions',
        'mood_tracker',
        'sleep_tracker',
        'water_tracker',
        'action_plans',
        'sub_profiles',
      ];

      const exportObj: Record<string, any[]> = {};
      const supabase = getSupabaseClient();

      await Promise.all(
        tables.map(async (table) => {
          const { data } = await supabase.from(table).select('*');
          exportObj[table] = data || [];
        })
      );

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stillmove_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch (error: any) {
      showToast(`Export failed: ${error.message}`, 'error');
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
  };

  const handleImportData = async () => {
    if (!importFile) {
      showToast('Please select a file to import', 'warning');
      return;
    }

    try {
      showToast('Importing data...', 'info');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const importObj = JSON.parse(reader.result as string);
          const supabase = getSupabaseClient();

          // Simple validation
          if (typeof importObj !== 'object' || Array.isArray(importObj)) {
            throw new Error('Invalid backup file structure');
          }

          // Import table by table
          const keys = Object.keys(importObj);
          for (const table of keys) {
            const rows = importObj[table];
            if (!Array.isArray(rows)) continue;

            if (importMode === 'replace') {
              // Delete existing rows
              await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }

            if (rows.length > 0) {
              // Upsert rows
              const { error } = await supabase.from(table).upsert(rows);
              if (error) console.warn(`Error importing table ${table}:`, error);
            }
          }

          showToast('Data imported successfully! Reloading...', 'success');
          setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
          showToast(`Import failed: ${err.message}`, 'error');
        }
      };
      reader.readAsText(importFile);
    } catch (error: any) {
      showToast(`Import failed: ${error.message}`, 'error');
    }
  };

  const handleClearLocalCache = async () => {
    if (confirm('Clear local cache? This will clear browser IndexedDB cache. Your cloud data remains safe.')) {
      try {
        await cacheService.clear('goals');
        await cacheService.clear('habits');
        await cacheService.clear('habit_logs');
        await cacheService.clear('time_blocks');
        await cacheService.clear('reading_list');
        cacheService.invalidateAllCaches();
        showToast('Local cache cleared successfully', 'success');
      } catch (e) {
        showToast('Failed to clear cache', 'error');
      }
    }
  };

  return (
    <div className="settings-page">
      <div className="view-header">
        <h2>Settings</h2>
      </div>

      {/* Tabs Selector */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          ⚙️ General
        </button>
        <button
          className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          ✨ AI Configuration
        </button>
        <button
          className={`settings-tab ${activeTab === 'profiles' ? 'active' : ''}`}
          onClick={() => setActiveTab('profiles')}
        >
          👥 Manage Profiles
        </button>
        <button
          className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          👤 Account
        </button>
        <button
          className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          💾 Data Management
        </button>
      </div>

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div className="settings-content">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="settings-tab-content active">
            <section className="settings-section">
              <h3>Preferences</h3>
              <div className="preferences-list">
                <div className="preference-item">
                  <div className="preference-info">
                    <label>Sound Effects</label>
                    <p className="preference-description">Play sounds when completing habits</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.soundEnabled}
                      onChange={(e) => handlePreferenceChange('soundEnabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="preference-item">
                  <div className="preference-info">
                    <label>Haptic Feedback</label>
                    <p className="preference-description">Vibrate on mobile when completing habits</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.hapticEnabled}
                      onChange={(e) => handlePreferenceChange('hapticEnabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <h3>Display</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label htmlFor="week-start">Week Starts On</label>
                  <select
                    id="week-start"
                    className="form-select"
                    value={preferences.weekStart}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, weekStart: e.target.value }))
                    }
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="date-format">Date Format</label>
                  <select
                    id="date-format"
                    className="form-select"
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, dateFormat: e.target.value }))
                    }
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="time-format">Time Format</label>
                  <select
                    id="time-format"
                    className="form-select"
                    value={preferences.timeFormat}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, timeFormat: e.target.value }))
                    }
                  >
                    <option value="24h">24-hour (14:30)</option>
                    <option value="12h">12-hour (2:30 PM)</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleSaveDisplaySettings}>
                  💾 Save Display Settings
                </button>
              </div>
            </section>
          </div>
        )}

        {/* AI Configuration Tab */}
        {activeTab === 'ai' && (
          <div className="settings-tab-content active">
            <section className="settings-section">
              <h3>AI Configuration</h3>
              <p className="tab-intro">
                Configure AI-powered features like habit suggestions and weekly insights. Your API key is stored locally in your browser.
              </p>

              <div className="ai-settings-form">
                <div className="preference-item">
                  <div className="preference-info">
                    <label>Enable AI Features</label>
                    <p className="preference-description">Turn on AI-powered suggestions and insights</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={aiConfig.enabled}
                      onChange={(e) =>
                        setAiConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {aiConfig.enabled && (
                  <div className="ai-config-fields">
                    <div className="form-group">
                      <label htmlFor="ai-provider">Provider</label>
                      <select
                        id="ai-provider"
                        className="form-select"
                        value={aiConfig.provider}
                        onChange={(e) =>
                          setAiConfig((prev) => ({
                            ...prev,
                            provider: e.target.value,
                            model: '',
                          }))
                        }
                      >
                        <option value="openrouter">OpenRouter (Recommended - Free models)</option>
                        <option value="groq">Groq (Fast)</option>
                        <option value="openai">OpenAI</option>
                        <option value="custom">Custom</option>
                      </select>
                      <p className="form-hint">
                        {aiConfig.provider === 'openrouter' &&
                          'OpenRouter offers free Gemini/Gemma models with high availability.'}
                        {aiConfig.provider === 'groq' && 'Groq offers ultra-low latency inference.'}
                        {aiConfig.provider === 'openai' && 'Standard OpenAI API connection.'}
                        {aiConfig.provider === 'custom' && 'Provide your own custom API base endpoint URL.'}
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="ai-api-key">API Key</label>
                      <div className="api-key-input-wrapper">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          id="ai-api-key"
                          className="form-input"
                          placeholder="Enter your API key"
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-icon-only"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                    {aiConfig.provider === 'custom' && (
                      <div className="form-group">
                        <label htmlFor="ai-base-url">Base URL</label>
                        <input
                          type="text"
                          id="ai-base-url"
                          className="form-input"
                          placeholder="https://api.example.com/v1"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                        />
                      </div>
                    )}

                    {aiConfig.provider !== 'custom' && (
                      <div className="form-group">
                        <label htmlFor="ai-model">Model</label>
                        <select
                          id="ai-model"
                          className="form-select"
                          value={aiConfig.model}
                          onChange={(e) =>
                            setAiConfig((prev) => ({ ...prev, model: e.target.value }))
                          }
                        >
                          <option value="">Select a model</option>
                          {aiModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {aiConfig.provider === 'custom' && (
                      <div className="form-group">
                        <label htmlFor="ai-custom-model">Custom Model ID</label>
                        <input
                          type="text"
                          id="ai-custom-model"
                          className="form-input"
                          placeholder="e.g. gpt-4o"
                          value={customModelId}
                          onChange={(e) => setCustomModelId(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="ai-temperature">Temperature</label>
                      <div className="temperature-input-wrapper">
                        <input
                          type="range"
                          id="ai-temperature"
                          min="0"
                          max="2"
                          step="0.1"
                          value={aiConfig.temperature}
                          onChange={(e) =>
                            setAiConfig((prev) => ({
                              ...prev,
                              temperature: parseFloat(e.target.value),
                            }))
                          }
                        />
                        <span className="temp-value">{aiConfig.temperature.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="ai-max-tokens">Max Tokens</label>
                      <select
                        id="ai-max-tokens"
                        className="form-select"
                        value={aiConfig.maxTokens}
                        onChange={(e) =>
                          setAiConfig((prev) => ({
                            ...prev,
                            maxTokens: parseInt(e.target.value),
                          }))
                        }
                      >
                        <option value="500">500 (Default)</option>
                        <option value="1000">1000</option>
                        <option value="2000">2000</option>
                        <option value="4000">4000</option>
                      </select>
                    </div>

                    <div className="ai-settings-actions">
                      <button className="btn btn-secondary" onClick={handleTestAiConnection}>
                        🔌 Test Connection
                      </button>
                      <button className="btn btn-primary" onClick={handleSaveAiConfig}>
                        💾 Save AI Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Manage Profiles Tab */}
        {activeTab === 'profiles' && (
          <div className="settings-tab-content active">
            <section className="settings-section">
              <h3>Profiles Isolation Manager</h3>
              <p className="tab-intro">
                Create multiple workspace profiles. Each profile contains completely isolated habits, goals, canvas sheets, and routines.
              </p>

              {/* Profiles List */}
              <div className="settings-profiles-list">
                {profiles.map((p) => {
                  const isEditing = editingProfileId === p.id;
                  const isActive = activeProfile?.id === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`profile-settings-card ${isActive ? 'active' : ''}`}
                      style={{ borderLeftColor: p.color }}
                    >
                      <div className="profile-settings-avatar-wrapper">
                        {p.avatar_data ? (
                          <img src={p.avatar_data} alt={p.name} className="profile-settings-img" />
                        ) : (
                          <span className="profile-settings-emoji">{p.emoji || '👤'}</span>
                        )}
                        <div className="avatar-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handlePhotoUploadClick(p.id)}
                            title="Upload Avatar Image"
                          >
                            📸 Upload
                          </button>
                          {p.avatar_data && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemovePhoto(p.id)}
                              title="Remove Photo"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="profile-card-details">
                        {isEditing ? (
                          <div className="profile-edit-fields">
                            <input
                              type="text"
                              className="form-input"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-input emoji-input"
                              value={editingEmoji}
                              maxLength={2}
                              onChange={(e) => setEditingEmoji(e.target.value)}
                              placeholder="Emoji"
                            />
                            <div className="profile-edit-buttons">
                              <button className="btn btn-primary btn-sm" onClick={handleSaveProfileEdit}>
                                Save
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingProfileId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="profile-card-name">
                              {p.name} {isActive && <span className="active-tag">Active</span>}
                            </h4>
                            <p className="profile-card-meta">Emoji: {p.emoji}</p>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="profile-card-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleStartEditing(p)}>
                            ✏️ Rename / Emoji
                          </button>
                          {!isActive && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteProfileClick(p.id)}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Create Profile Section */}
              <div className="create-profile-section">
                <h4>➕ Create New Profile</h4>
                <div className="create-profile-form">
                  <div className="form-group">
                    <label>Profile Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Work, Health, Business"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Profile Emoji</label>
                    <input
                      type="text"
                      className="form-input emoji-input"
                      placeholder="e.g. 💼, 🏋️"
                      maxLength={2}
                      value={newProfileEmoji}
                      onChange={(e) => setNewProfileEmoji(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleCreateProfile}>
                    Create Profile
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="settings-tab-content active">
            <section className="settings-section">
              <h3>Your Account</h3>
              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="display-name">Display Name</label>
                  <input
                    type="text"
                    id="display-name"
                    className="form-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Display Name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="user-email">Account Email</label>
                  <input
                    type="email"
                    id="user-email"
                    className="form-input"
                    value={user?.email || ''}
                    disabled
                  />
                  <p className="form-hint">Email is managed by authentication provider.</p>
                </div>
                <div className="form-group">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    className="form-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB, UTC+7)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleSaveAccount}>
                  💾 Save Profile Details
                </button>
              </div>
            </section>

            <section className="settings-section danger-zone">
              <h3>⚠️ Account Actions</h3>
              <div className="danger-actions">
                <div className="danger-item">
                  <div className="danger-info">
                    <strong>Sign Out</strong>
                    <p>Logout from your account session.</p>
                  </div>
                  <button className="btn btn-secondary" onClick={signOut}>
                    Sign Out
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <div className="settings-tab-content active">
            <section className="settings-section">
              <h3>📥 Export Backup Data</h3>
              <p className="tab-intro">
                Download a complete backup of all goals, habits, logs, and profiles as a single JSON file.
              </p>
              <button className="btn btn-primary" onClick={handleExportData}>
                📥 Export All Data
              </button>
            </section>

            <section className="settings-section">
              <h3>📤 Import Backup Data</h3>
              <p className="tab-intro">
                Restore data from a JSON backup file. You can choose to merge or replace existing data.
              </p>

              <div className="import-controls">
                <input
                  type="file"
                  id="import-file"
                  accept=".json"
                  onChange={handleImportFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => document.getElementById('import-file')?.click()}
                >
                  📤 Choose Backup File
                </button>
                {importFile && <span className="selected-file-name">{importFile.name}</span>}
              </div>

              {importFile && (
                <div className="import-mode-section">
                  <label>Import Mode:</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        name="import-mode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />{' '}
                      Merge with existing data
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="import-mode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />{' '}
                      Replace existing data
                    </label>
                  </div>
                  <button className="btn btn-primary" onClick={handleImportData}>
                    Import Data Now
                  </button>
                </div>
              )}
            </section>

            <section className="settings-section danger-zone">
              <h3>⚠️ Danger Zone</h3>
              <p className="tab-intro">Irreversible data actions. Please exercise caution.</p>
              <div className="danger-actions">
                <div className="danger-item">
                  <div className="danger-info">
                    <strong>Clear Local Cache</strong>
                    <p>Clear browser IndexedDB database cache. Cloud records are not affected.</p>
                  </div>
                  <button className="btn btn-warning" onClick={handleClearLocalCache}>
                    Clear Cache
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
