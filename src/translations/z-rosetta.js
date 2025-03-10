/**
 * z-rosetta.js - Multilingual support module for Z applications
 * © 2024 Z Team
 * 
 * This module handles loading, managing and applying translations across the application.
 */

const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

class ZRosetta {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'en';
    this.availableLanguages = ['en', 'ru', 'ja', 'fr', 'de', 'es', 'it', 'zh', 'pt', 'ko', 'ar']; // Added French, German, Spanish, Italian, Chinese, Portuguese, Korean, Arabic
    this.settingsPath = '';
    this.initialized = false;
    this.settingsWatcher = null;
  }

  /**
   * Initialize the translation system
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Set up settings path in AppData/Local/Z/settings.json
      const appDataPath = path.join(process.env.APPDATA || 
        (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : 
        path.join(process.env.HOME, '.local', 'share')), 'Z');
      
      // Ensure the directory exists
      if (!fs.existsSync(appDataPath)) {
        fs.mkdirSync(appDataPath, { recursive: true });
      }
      
      this.settingsPath = path.join(appDataPath, 'settings.json');

      // Load settings or create default
      await this.loadSettings();
      
      // Load all available translations
      await this.loadTranslations();
      
      // Set up IPC handlers
      this.setupIPC();
      
      // Watch settings file for changes
      this.watchSettingsFile();
      
      this.initialized = true;
      console.log(`[z-rosetta] Initialized with language: ${this.currentLanguage}`);
      
      return true;
    } catch (error) {
      console.error('[z-rosetta] Initialization error:', error);
      return false;
    }
  }

  /**
   * Load translations for all available languages
   */
  async loadTranslations() {
    try {
      for (const lang of this.availableLanguages) {
        const translationPath = path.join(__dirname, `${lang}.json`);
        
        if (fs.existsSync(translationPath)) {
          const content = fs.readFileSync(translationPath, 'utf8');
          this.translations[lang] = JSON.parse(content);
          console.log(`[z-rosetta] Loaded translations for: ${lang}`);
        } else {
          console.warn(`[z-rosetta] Translation file not found: ${translationPath}`);
        }
      }
    } catch (error) {
      console.error('[z-rosetta] Error loading translations:', error);
    }
  }

  /**
   * Load language settings or create default if not exists
   */
  async loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        
        if (settings.language && this.availableLanguages.includes(settings.language)) {
          this.currentLanguage = settings.language;
        }
        
        console.log(`[z-rosetta] Loaded language setting: ${this.currentLanguage}`);
      } else {
        // Create default settings file
        const defaultSettings = {
          language: this.currentLanguage
        };
        
        fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
        console.log(`[z-rosetta] Created default settings file with language: ${this.currentLanguage}`);
      }
    } catch (error) {
      console.error('[z-rosetta] Error loading language settings:', error);
    }
  }

  /**
   * Save language settings
   * @param {string} language - Language code to save
   */
  async saveSettings(language) {
    try {
      // Make sure it's a valid language
      if (!this.availableLanguages.includes(language)) {
        console.error(`[z-rosetta] Invalid language: ${language}`);
        return false;
      }
      
      // Read existing settings to preserve other values
      let settings = {};
      if (fs.existsSync(this.settingsPath)) {
        settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
      }
      
      // Update language and save
      settings.language = language;
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      
      this.currentLanguage = language;
      console.log(`[z-rosetta] Saved language setting: ${language}`);
      
      return true;
    } catch (error) {
      console.error('[z-rosetta] Error saving language settings:', error);
      return false;
    }
  }

  /**
   * Watch settings file for changes and apply language updates instantly
   */
  watchSettingsFile() {
    if (this.settingsWatcher) {
      this.settingsWatcher.close();
    }

    try {
      this.settingsWatcher = fs.watch(this.settingsPath, async (eventType) => {
        if (eventType === 'change') {
          console.log('[z-rosetta] Settings file changed, updating language settings');
          
          // Add a small delay to ensure the file is fully written
          setTimeout(async () => {
            try {
              // Read the updated settings file
              const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
              
              // Check if language was changed
              if (settings.language && 
                  this.availableLanguages.includes(settings.language) && 
                  settings.language !== this.currentLanguage) {
                
                // Update the current language
                this.currentLanguage = settings.language;
                console.log(`[z-rosetta] Language updated from settings file: ${this.currentLanguage}`);
                
                // Notify all windows about the language change
                this.broadcastLanguageChange();
              }
            } catch (error) {
              console.error('[z-rosetta] Error processing settings file change:', error);
            }
          }, 100);
        }
      });
      
      console.log('[z-rosetta] Now watching settings file for changes');
    } catch (error) {
      console.error('[z-rosetta] Error setting up settings file watcher:', error);
    }
  }

  /**
   * Broadcast language change to all renderer processes
   */
  broadcastLanguageChange() {
    try {
      const windows = require('electron').BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('z-rosetta-language-changed', {
            language: this.currentLanguage,
            translations: this.translations[this.currentLanguage] || {}
          });
        }
      }
      console.log('[z-rosetta] Broadcasted language change to all windows');
    } catch (error) {
      console.error('[z-rosetta] Error broadcasting language change:', error);
    }
  }

  /**
   * Set up IPC handlers for renderer process
   */
  setupIPC() {
    // Get current language
    ipcMain.handle('z-rosetta-get-language', () => {
      return {
        currentLanguage: this.currentLanguage,
        availableLanguages: this.availableLanguages
      };
    });
    
    // Get translations for current language
    ipcMain.handle('z-rosetta-get-translations', () => {
      return this.translations[this.currentLanguage] || {};
    });
    
    // Change language
    ipcMain.handle('z-rosetta-set-language', async (event, language) => {
      const success = await this.saveSettings(language);
      
      // Return new translations if successful
      if (success) {
        return {
          success: true, 
          language: this.currentLanguage,
          translations: this.translations[this.currentLanguage] || {}
        };
      }
      
      return { success: false };
    });
  }

  /**
   * Get translation for a specific key
   * @param {string} key - Dot notation key (e.g. "welcome.title")
   * @param {string} [lang] - Optional language override
   * @returns {string} Translated text or the key if not found
   */
  translate(key, lang = null) {
    const language = lang || this.currentLanguage;
    const translationData = this.translations[language];
    
    if (!translationData) return key;
    
    // Handle dot notation (e.g., "welcome.title")
    const parts = key.split('.');
    let value = translationData;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return key; // Key not found
      }
    }
    
    return value;
  }
}

// Export singleton instance
const zRosetta = new ZRosetta();
module.exports = zRosetta; 