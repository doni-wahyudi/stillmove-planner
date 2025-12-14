/**
 * Settings View Controller
 * Handles data export/import and user profile settings
 */

import dataService from '../js/data-service.js';
import { showToast } from '../components/toast.js';

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
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        const prefs = this.getPreferences();
        
        const soundToggle = document.getElementById('sound-enabled');
        const hapticToggle = document.getElementById('haptic-enabled');
        
        if (soundToggle) {
            soundToggle.checked = prefs.soundEnabled !== false; // Default true
        }
        if (hapticToggle) {
            hapticToggle.checked = prefs.hapticEnabled !== false; // Default true
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
            
            if (profile) {
                const displayNameInput = document.getElementById('display-name');
                const timezoneSelect = document.getElementById('timezone');
                
                if (displayNameInput && profile.display_name) {
                    displayNameInput.value = profile.display_name;
                }
                
                if (timezoneSelect && profile.timezone) {
                    timezoneSelect.value = profile.timezone;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
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

            // Confirm with user
            const confirmMessage = mode === 'replace' 
                ? 'This will replace all existing data. Are you sure?'
                : 'This will merge the imported data with your existing data. Continue?';
            
            if (!confirm(confirmMessage)) {
                statusDiv.textContent = 'Import cancelled';
                statusDiv.className = 'status-message';
                return;
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

            const profile = {
                display_name: displayNameInput.value,
                timezone: timezoneSelect.value
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
            saveBtn.textContent = 'Save Profile';
            
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 5000);
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
