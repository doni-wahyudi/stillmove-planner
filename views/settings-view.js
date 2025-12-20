/**
 * Settings View Controller
 * Handles data export/import and user profile settings
 */

import dataService from '../js/data-service.js';
import { AI_PROVIDERS, AI_DEFAULT_CONFIG } from '../js/config.js';
import aiService from '../js/ai-service.js';

const AI_SETTINGS_KEY = 'stillmove_ai_settings';
const AI_APIKEY_KEY = 'stillmove_ai_apikey';

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    if (window.Toast && typeof window.Toast[type] === 'function') {
        window.Toast[type](message);
    } else if (window.Toast && typeof window.Toast.show === 'function') {
        window.Toast.show({ message, type });
    } else {
        console.log(`[${type}] ${message}`);
    }
}

class SettingsView {
    constructor() {
        this.container = null;
        this.selectedFile = null;
    }

    /**
     * Initialize the settings view
     * @param {HTMLElement} container - Container element to render into
     */
    async init(container) {
        this.container = container;
        await this.render();
        this.attachEventListeners();
        await this.loadProfile();
    }

    /**
     * Render the settings view
     */
    async render() {
        try {
            const response = await fetch('views/settings-view.html');
            const html = await response.text();
            this.container.innerHTML = html;
        } catch (error) {
            console.error('Error loading settings view:', error);
            this.container.innerHTML = '<p>Error loading settings view</p>';
        }
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Setup tabs
        this.setupTabs();
        
        // Load and setup preferences
        this.loadPreferences();
        
        // Sound toggle
        const soundToggle = document.getElementById('sound-enabled');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.savePreference('soundEnabled', e.target.checked);
            });
        }
        
        // Haptic toggle
        const hapticToggle = document.getElementById('haptic-enabled');
        if (hapticToggle) {
            hapticToggle.addEventListener('change', (e) => {
                this.savePreference('hapticEnabled', e.target.checked);
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // Import file selection
        const importFileBtn = document.getElementById('import-file-btn');
        const importFileInput = document.getElementById('import-file-input');
        
        if (importFileBtn && importFileInput) {
            importFileBtn.addEventListener('click', () => {
                importFileInput.click();
            });

            importFileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // Import button
        const importBtn = document.getElementById('import-data-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImport());
        }

        // Save profile button
        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.handleSaveProfile());
        }

        // Danger zone buttons
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.handleClearCache());
        }

        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.handleSignOut());
        }

        // AI Settings
        this.setupAISettings();
        
        // Save display settings button
        const saveDisplayBtn = document.getElementById('save-display-btn');
        if (saveDisplayBtn) {
            saveDisplayBtn.addEventListener('click', () => this.handleSaveDisplaySettings());
        }
    }

    /**
     * Setup tab navigation
     */
    setupTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const contents = document.querySelectorAll('.settings-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `tab-${targetTab}`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        const prefs = this.getPreferences();
        
        const soundToggle = document.getElementById('sound-enabled');
        const hapticToggle = document.getElementById('haptic-enabled');
        const weekStartSelect = document.getElementById('week-start');
        const dateFormatSelect = document.getElementById('date-format');
        const timeFormatSelect = document.getElementById('time-format');
        
        if (soundToggle) {
            soundToggle.checked = prefs.soundEnabled !== false;
        }
        if (hapticToggle) {
            hapticToggle.checked = prefs.hapticEnabled !== false;
        }
        if (weekStartSelect && prefs.weekStart !== undefined) {
            weekStartSelect.value = prefs.weekStart;
        }
        if (dateFormatSelect && prefs.dateFormat) {
            dateFormatSelect.value = prefs.dateFormat;
        }
        if (timeFormatSelect && prefs.timeFormat) {
            timeFormatSelect.value = prefs.timeFormat;
        }
    }
    
    /**
     * Get all preferences from localStorage
     */
    getPreferences() {
        try {
            const stored = localStorage.getItem('stillmove_preferences');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }
    
    /**
     * Save a preference to localStorage
     */
    savePreference(key, value) {
        try {
            const prefs = this.getPreferences();
            prefs[key] = value;
            localStorage.setItem('stillmove_preferences', JSON.stringify(prefs));
            showToast('Preference saved', 'success');
        } catch (error) {
            console.error('Failed to save preference:', error);
        }
    }

    /**
     * Load user profile data
     */
    async loadProfile() {
        try {
            const profile = await dataService.getUserProfile();
            
            // Load from database profile
            if (profile) {
                const displayNameInput = document.getElementById('display-name');
                const timezoneSelect = document.getElementById('timezone');
                const emailInput = document.getElementById('user-email');
                
                if (displayNameInput && profile.display_name) {
                    displayNameInput.value = profile.display_name;
                }
                
                if (timezoneSelect && profile.timezone) {
                    timezoneSelect.value = profile.timezone;
                }
                
                // Try to get email from auth
                if (emailInput && dataService.supabase) {
                    const { data: { user } } = await dataService.supabase.auth.getUser();
                    if (user?.email) {
                        emailInput.value = user.email;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    /**
     * Handle save display settings
     */
    handleSaveDisplaySettings() {
        const statusDiv = document.getElementById('display-status');
        const weekStartSelect = document.getElementById('week-start');
        const dateFormatSelect = document.getElementById('date-format');
        const timeFormatSelect = document.getElementById('time-format');

        try {
            const prefs = this.getPreferences();
            prefs.weekStart = weekStartSelect?.value || '0';
            prefs.dateFormat = dateFormatSelect?.value || 'DD/MM/YYYY';
            prefs.timeFormat = timeFormatSelect?.value || '24h';
            localStorage.setItem('stillmove_preferences', JSON.stringify(prefs));

            statusDiv.textContent = 'Display settings saved!';
            statusDiv.className = 'status-message success';
            showToast('Display settings saved', 'success');

            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 3000);
        } catch (error) {
            statusDiv.textContent = `Failed to save: ${error.message}`;
            statusDiv.className = 'status-message error';
            showToast('Failed to save settings', 'error');
        }
    }

    /**
     * Handle data export
     */
    async handleExport() {
        const exportBtn = document.getElementById('export-data-btn');
        const statusDiv = document.getElementById('export-status');
        
        try {
            // Disable button and show loading
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';
            statusDiv.textContent = 'Preparing export...';
            statusDiv.className = 'status-message info';

            // Export data
            const exportData = await dataService.exportAllData();
            
            // Download file
            dataService.downloadExportFile(exportData);
            
            // Show success message
            statusDiv.textContent = 'Export successful! File downloaded.';
            statusDiv.className = 'status-message success';
            showToast('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            statusDiv.textContent = `Export failed: ${error.message}`;
            statusDiv.className = 'status-message error';
            showToast('Export failed: ' + error.message, 'error');
        } finally {
            // Re-enable button
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<span class="btn-icon">📥</span> Export All Data';
            
            // Clear status after 5 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 5000);
        }
    }

    /**
     * Handle file selection for import
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        const fileNameSpan = document.getElementById('selected-file-name');
        const importModeSection = document.getElementById('import-mode-section');
        
        if (file) {
            this.selectedFile = file;
            fileNameSpan.textContent = file.name;
            importModeSection.style.display = 'block';
        } else {
            this.selectedFile = null;
            fileNameSpan.textContent = '';
            importModeSection.style.display = 'none';
        }
    }

    /**
     * Handle data import
     */
    async handleImport() {
        if (!this.selectedFile) {
            showToast('Please select a file to import', 'warning');
            return;
        }

        const importBtn = document.getElementById('import-data-btn');
        const statusDiv = document.getElementById('import-status');
        const modeRadios = document.getElementsByName('import-mode');
        let mode = 'merge';
        
        for (const radio of modeRadios) {
            if (radio.checked) {
                mode = radio.value;
                break;
            }
        }

        try {
            // Disable button and show loading
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';
            statusDiv.textContent = 'Reading file...';
            statusDiv.className = 'status-message info';

            // Read and parse file
            const importData = await dataService.readImportFile(this.selectedFile);
            
            // Validate data
            statusDiv.textContent = 'Validating data...';
            const validation = dataService.validateImportData(importData);
            
            if (!validation.valid) {
                throw new Error(`Invalid file format: ${validation.errors.join(', ')}`);
            }
            
            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                console.warn('Import warnings:', validation.warnings);
                showToast(`Warning: ${validation.warnings.length} data issues found`, 'warning');
            }

            // Confirm with user
            const confirmMessage = mode === 'replace' 
                ? 'This will replace all existing data. Are you sure?'
                : 'This will merge the imported data with your existing data. Continue?';
            
            if (!confirm(confirmMessage)) {
                statusDiv.textContent = 'Import cancelled';
                statusDiv.className = 'status-message';
                return;
            }

            // Auto-backup before import
            statusDiv.textContent = 'Creating backup before import...';
            try {
                const backupData = await dataService.exportAllData();
                const backupFilename = `planner-backup-before-import-${new Date().toISOString().split('T')[0]}.json`;
                dataService.downloadExportFile(backupData, backupFilename);
                showToast('Backup created automatically', 'success');
                
                // Small delay to ensure backup download starts
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (backupError) {
                console.warn('Auto-backup failed:', backupError);
                // Ask user if they want to continue without backup
                if (!confirm('Could not create automatic backup. Continue with import anyway?')) {
                    statusDiv.textContent = 'Import cancelled - backup failed';
                    statusDiv.className = 'status-message warning';
                    return;
                }
            }

            // Import data
            statusDiv.textContent = 'Importing data...';
            const stats = await dataService.importData(importData, mode);
            
            // Show success message
            let message = `Import complete! Imported ${stats.imported} items.`;
            if (stats.errors.length > 0) {
                message += ` ${stats.errors.length} errors occurred.`;
            }
            
            statusDiv.textContent = message;
            statusDiv.className = stats.errors.length > 0 ? 'status-message warning' : 'status-message success';
            showToast(message, stats.errors.length > 0 ? 'warning' : 'success');
            
            // Reset file selection
            this.selectedFile = null;
            document.getElementById('selected-file-name').textContent = '';
            document.getElementById('import-mode-section').style.display = 'none';
            document.getElementById('import-file-input').value = '';
            
        } catch (error) {
            console.error('Import error:', error);
            statusDiv.textContent = `Import failed: ${error.message}`;
            statusDiv.className = 'status-message error';
            showToast('Import failed: ' + error.message, 'error');
        } finally {
            // Re-enable button
            importBtn.disabled = false;
            importBtn.textContent = 'Import Data';
            
            // Clear status after 10 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 10000);
        }
    }

    /**
     * Handle save profile
     */
    async handleSaveProfile() {
        const saveBtn = document.getElementById('save-profile-btn');
        const statusDiv = document.getElementById('profile-status');
        const displayNameInput = document.getElementById('display-name');
        const timezoneSelect = document.getElementById('timezone');

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            // Save to database
            const profile = {
                display_name: displayNameInput?.value || '',
                timezone: timezoneSelect?.value || 'UTC'
            };

            await dataService.upsertUserProfile(profile);

            statusDiv.textContent = 'Profile saved successfully';
            statusDiv.className = 'status-message success';
            showToast('Profile saved', 'success');

        } catch (error) {
            console.error('Save profile error:', error);
            statusDiv.textContent = `Failed to save: ${error.message}`;
            statusDiv.className = 'status-message error';
            showToast('Failed to save profile', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Profile';
            
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 5000);
        }
    }

    /**
     * Setup AI Settings section
     */
    setupAISettings() {
        const aiEnabled = document.getElementById('ai-enabled');
        const aiConfigFields = document.getElementById('ai-config-fields');
        const providerSelect = document.getElementById('ai-provider');
        const toggleApiKeyBtn = document.getElementById('toggle-api-key');
        const apiKeyInput = document.getElementById('ai-api-key');
        const testBtn = document.getElementById('test-ai-btn');
        const saveBtn = document.getElementById('save-ai-btn');
        const temperatureSlider = document.getElementById('ai-temperature');
        const temperatureValue = document.getElementById('temperature-value');

        // Load saved settings
        this.loadAISettings();

        // Toggle AI enabled
        if (aiEnabled) {
            aiEnabled.addEventListener('change', (e) => {
                aiConfigFields.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Temperature slider
        if (temperatureSlider && temperatureValue) {
            temperatureSlider.addEventListener('input', (e) => {
                temperatureValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }

        // Provider change
        if (providerSelect) {
            providerSelect.addEventListener('change', () => this.handleProviderChange());
        }

        // Toggle API key visibility
        if (toggleApiKeyBtn && apiKeyInput) {
            toggleApiKeyBtn.addEventListener('click', () => {
                const isPassword = apiKeyInput.type === 'password';
                apiKeyInput.type = isPassword ? 'text' : 'password';
                toggleApiKeyBtn.textContent = isPassword ? '🙈' : '👁️';
            });
        }

        // Test connection
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testAIConnection());
        }

        // Save settings
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAISettings());
        }
    }

    /**
     * Load AI settings from localStorage
     */
    loadAISettings() {
        try {
            const stored = localStorage.getItem(AI_SETTINGS_KEY);
            const settings = stored ? { ...AI_DEFAULT_CONFIG, ...JSON.parse(stored) } : AI_DEFAULT_CONFIG;
            const apiKey = localStorage.getItem(AI_APIKEY_KEY) || '';

            // Set form values
            const aiEnabled = document.getElementById('ai-enabled');
            const aiConfigFields = document.getElementById('ai-config-fields');
            const providerSelect = document.getElementById('ai-provider');
            const apiKeyInput = document.getElementById('ai-api-key');
            const baseUrlInput = document.getElementById('ai-base-url');
            const customModelInput = document.getElementById('ai-custom-model');
            const customUrlGroup = document.getElementById('custom-url-group');
            const customModelGroup = document.getElementById('custom-model-group');
            const temperatureSlider = document.getElementById('ai-temperature');
            const temperatureValue = document.getElementById('temperature-value');
            const maxTokensSelect = document.getElementById('ai-max-tokens');

            if (aiEnabled) {
                aiEnabled.checked = settings.enabled;
                if (aiConfigFields) {
                    aiConfigFields.style.display = settings.enabled ? 'block' : 'none';
                }
            }

            if (providerSelect) {
                providerSelect.value = settings.provider || 'openrouter';
                this.handleProviderChange(settings.model);
            }

            if (apiKeyInput) {
                apiKeyInput.value = apiKey;
            }

            // Load custom URL and model for custom provider (after handleProviderChange shows the fields)
            if (settings.provider === 'custom') {
                if (baseUrlInput) {
                    baseUrlInput.value = settings.baseUrl || '';
                }
                if (customModelInput) {
                    customModelInput.value = settings.model || '';
                }
                // Ensure fields are visible
                if (customUrlGroup) customUrlGroup.style.display = 'block';
                if (customModelGroup) customModelGroup.style.display = 'block';
            }

            // Load temperature
            if (temperatureSlider) {
                temperatureSlider.value = settings.temperature ?? 1.0;
                if (temperatureValue) {
                    temperatureValue.textContent = parseFloat(settings.temperature ?? 1.0).toFixed(1);
                }
            }

            // Load max tokens
            if (maxTokensSelect) {
                maxTokensSelect.value = settings.maxTokens || 500;
            }
        } catch (e) {
            console.error('Failed to load AI settings:', e);
        }
    }

    /**
     * Handle provider change - update models and hints
     */
    handleProviderChange(selectedModel = null) {
        const providerSelect = document.getElementById('ai-provider');
        const modelSelect = document.getElementById('ai-model');
        const customUrlGroup = document.getElementById('custom-url-group');
        const customModelGroup = document.getElementById('custom-model-group');
        const providerHint = document.getElementById('provider-hint');
        const baseUrlInput = document.getElementById('ai-base-url');
        const customModelInput = document.getElementById('ai-custom-model');
        const apiKeyInput = document.getElementById('ai-api-key');

        const provider = providerSelect?.value || 'openrouter';
        const providerConfig = AI_PROVIDERS[provider];

        // Show/hide custom URL field
        if (customUrlGroup) {
            customUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';
        }

        // Update hint text
        const hints = {
            openrouter: 'OpenRouter offers free Gemini models with CORS support.',
            groq: 'Groq provides fast inference with free tier available.',
            openai: 'OpenAI requires a paid API key.',
            custom: 'Enter your OpenAI-compatible API endpoint.'
        };
        if (providerHint) {
            providerHint.textContent = hints[provider] || '';
        }

        // Restore API key for this provider from localStorage
        if (apiKeyInput) {
            try {
                const providerApiKey = localStorage.getItem(`${AI_APIKEY_KEY}_${provider}`);
                const globalApiKey = localStorage.getItem(AI_APIKEY_KEY);
                // Use provider-specific key if available, otherwise use global key
                apiKeyInput.value = providerApiKey || globalApiKey || '';
            } catch (e) {
                // Keep current value if error
            }
        }

        // Try to get saved model for this provider
        let savedModelForProvider = selectedModel;
        if (!savedModelForProvider) {
            try {
                const stored = localStorage.getItem(AI_SETTINGS_KEY);
                if (stored) {
                    const savedSettings = JSON.parse(stored);
                    // Check if there's a saved model for this specific provider
                    if (savedSettings.providerModels && savedSettings.providerModels[provider]) {
                        savedModelForProvider = savedSettings.providerModels[provider];
                    } else if (savedSettings.provider === provider) {
                        savedModelForProvider = savedSettings.model;
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        // Populate models
        if (modelSelect && providerConfig) {
            modelSelect.innerHTML = '';
            
            if (provider === 'custom') {
                modelSelect.innerHTML = '<option value="custom">Use custom model below</option>';
                if (customModelGroup) customModelGroup.style.display = 'block';
                
                // Restore saved custom settings from localStorage
                try {
                    const stored = localStorage.getItem(AI_SETTINGS_KEY);
                    if (stored) {
                        const savedSettings = JSON.parse(stored);
                        // Restore custom URL and model if they were saved
                        if (savedSettings.customBaseUrl && baseUrlInput) {
                            baseUrlInput.value = savedSettings.customBaseUrl;
                        }
                        if (savedSettings.customModel && customModelInput) {
                            customModelInput.value = savedSettings.customModel;
                        }
                    }
                } catch (e) {
                    console.error('Failed to restore custom settings:', e);
                }
            } else {
                if (customModelGroup) customModelGroup.style.display = 'none';
                providerConfig.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });

                // Set selected model (use saved model for this provider if available)
                if (savedModelForProvider && providerConfig.models.some(m => m.id === savedModelForProvider)) {
                    modelSelect.value = savedModelForProvider;
                }
            }

            // Set base URL for non-custom providers
            if (baseUrlInput && provider !== 'custom') {
                baseUrlInput.value = providerConfig.baseUrl;
            }
        }
    }

    /**
     * Test AI connection
     */
    async testAIConnection() {
        const testBtn = document.getElementById('test-ai-btn');
        const statusDiv = document.getElementById('ai-status');
        
        // Temporarily save settings for test
        this.saveAISettingsToStorage();

        testBtn.disabled = true;
        testBtn.textContent = '⏳ Testing...';
        statusDiv.textContent = 'Connecting to AI provider...';
        statusDiv.className = 'status-message info';

        try {
            const response = await aiService.makeRequest([
                { role: 'user', content: 'Say "Connection successful!" in exactly those words.' }
            ], { maxTokens: 20 });

            statusDiv.textContent = '✅ Connection successful! AI is ready to use.';
            statusDiv.className = 'status-message success';
            showToast('AI connection successful!', 'success');
        } catch (error) {
            statusDiv.textContent = `❌ Connection failed: ${error.message}`;
            statusDiv.className = 'status-message error';
            showToast('AI connection failed', 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '🔌 Test Connection';
        }
    }

    /**
     * Save AI settings to localStorage
     */
    saveAISettingsToStorage() {
        const aiEnabled = document.getElementById('ai-enabled');
        const providerSelect = document.getElementById('ai-provider');
        const modelSelect = document.getElementById('ai-model');
        const apiKeyInput = document.getElementById('ai-api-key');
        const baseUrlInput = document.getElementById('ai-base-url');
        const customModelInput = document.getElementById('ai-custom-model');
        const temperatureSlider = document.getElementById('ai-temperature');
        const maxTokensSelect = document.getElementById('ai-max-tokens');

        const provider = providerSelect?.value || 'openrouter';
        const providerConfig = AI_PROVIDERS[provider];
        const currentModel = provider === 'custom' ? customModelInput?.value : modelSelect?.value;

        // Load existing settings to preserve provider-specific data
        let existingSettings = {};
        try {
            const existing = localStorage.getItem(AI_SETTINGS_KEY);
            if (existing) {
                existingSettings = JSON.parse(existing);
            }
        } catch (e) {
            // Ignore parse errors
        }

        const settings = {
            enabled: aiEnabled?.checked || false,
            provider: provider,
            baseUrl: provider === 'custom' ? baseUrlInput?.value : providerConfig?.baseUrl,
            model: currentModel,
            maxTokens: parseInt(maxTokensSelect?.value) || 500,
            temperature: parseFloat(temperatureSlider?.value) || 1.0,
            // Preserve existing provider models map
            providerModels: existingSettings.providerModels || {}
        };

        // Save current model for this provider
        if (currentModel) {
            settings.providerModels[provider] = currentModel;
        }

        // Always save custom settings separately so they persist when switching providers
        if (provider === 'custom') {
            settings.customBaseUrl = baseUrlInput?.value || '';
            settings.customModel = customModelInput?.value || '';
        } else {
            // Preserve existing custom settings
            if (existingSettings.customBaseUrl) {
                settings.customBaseUrl = existingSettings.customBaseUrl;
            }
            if (existingSettings.customModel) {
                settings.customModel = existingSettings.customModel;
            }
        }

        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
        
        // Store API key - both globally and per-provider for easy switching
        if (apiKeyInput?.value) {
            localStorage.setItem(AI_APIKEY_KEY, apiKeyInput.value);
            localStorage.setItem(`${AI_APIKEY_KEY}_${provider}`, apiKeyInput.value);
        }
    }

    /**
     * Save AI settings with feedback
     */
    saveAISettings() {
        const statusDiv = document.getElementById('ai-status');
        
        try {
            this.saveAISettingsToStorage();
            
            // Clear AI service cache
            aiService.clearCache();

            statusDiv.textContent = '✅ AI settings saved successfully!';
            statusDiv.className = 'status-message success';
            showToast('AI settings saved', 'success');

            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 3000);
        } catch (error) {
            statusDiv.textContent = `❌ Failed to save: ${error.message}`;
            statusDiv.className = 'status-message error';
            showToast('Failed to save AI settings', 'error');
        }
    }

    /**
     * Handle clear cache
     */
    handleClearCache() {
        if (!confirm('This will clear all locally cached data. Your cloud data will remain safe. Continue?')) {
            return;
        }

        try {
            // Clear specific app caches, not all localStorage
            const keysToKeep = ['stillmove_ai_settings', 'stillmove_ai_apikey', 'stillmove_preferences'];
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('stillmove_') && !keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            showToast('Cache cleared successfully', 'success');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            showToast('Failed to clear cache', 'error');
        }
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        if (!confirm('Are you sure you want to sign out?')) {
            return;
        }

        try {
            await dataService.signOut();
            showToast('Signed out successfully', 'success');
            // Redirect to auth page
            window.location.href = 'auth.html';
        } catch (error) {
            console.error('Sign out failed:', error);
            showToast('Failed to sign out', 'error');
        }
    }

    /**
     * Cleanup when view is destroyed
     */
    destroy() {
        // Remove event listeners if needed
        this.container = null;
        this.selectedFile = null;
    }
}

// Export singleton instance
const settingsView = new SettingsView();
export default settingsView;
