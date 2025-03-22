/**
 * z-rosetta.js - Multilingual support module for Zen applications
 * © 2024 Zen Team
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
    this.currentTheme = 'zen-theme-light'; // Default theme
    this.availableThemes = [];
    this.themeFileWatcher = null;
    this.activeThemePath = null;
  }

  /**
   * Initialize the translation system
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Set up settings path in AppData/Local/Zen/settings.json
      const appDataPath = path.join(process.env.APPDATA || 
        (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : 
        path.join(process.env.HOME, '.local', 'share')), 'Zen');
      
      // Ensure the directory exists
      if (!fs.existsSync(appDataPath)) {
        fs.mkdirSync(appDataPath, { recursive: true });
      }
      
      this.settingsPath = path.join(appDataPath, 'settings.json');

      // Load available themes
      await this.loadAvailableThemes();

      // Load settings or create default
      await this.loadSettings();
      
      // Load all available translations
      await this.loadTranslations();
      
      // Set up IPC handlers
      this.setupIPC();
      
      // Watch settings file for changes
      this.watchSettingsFile();
      
      // Set up theme file watcher
      this.setupThemeFileWatcher();
      
      this.initialized = true;
      console.log(`[z-rosetta] Initialized with language: ${this.currentLanguage} and theme: ${this.currentTheme}`);
      
      return true;
    } catch (error) {
      console.error('[z-rosetta] Initialization error:', error);
      return false;
    }
  }

  /**
   * Load available themes from the themes directory
   */
  async loadAvailableThemes() {
    try {
      // Clear existing themes list
      this.availableThemes = [];
      
      // Built-in themes directory
      const themesDir = path.join(__dirname, '..', 'themes');
      
      // Ensure themes directory exists
      if (!fs.existsSync(themesDir)) {
        fs.mkdirSync(themesDir, { recursive: true });
      }
      
      // Read all theme files
      const themeFiles = fs.readdirSync(themesDir).filter(file => file.endsWith('.json'));
      
      for (const themeFile of themeFiles) {
        try {
          const themePath = path.join(themesDir, themeFile);
          const themeData = JSON.parse(fs.readFileSync(themePath, 'utf8'));
          
          // Check if theme has the required metadata
          if (themeData.name && themeData.author && themeData.version) {
            this.availableThemes.push({
              id: path.basename(themeFile, '.json'),
              name: themeData.name,
              author: themeData.author,
              description: themeData.description || '',
              version: themeData.version,
              path: themePath
            });
          }
        } catch (err) {
          console.error(`[z-rosetta] Error loading theme ${themeFile}:`, err);
        }
      }
      
      // Also look for custom themes in appData themes directory
      const appDataPath = path.dirname(this.settingsPath);
      const customThemesDir = path.join(appDataPath, 'themes');
      
      if (fs.existsSync(customThemesDir)) {
        const customThemeFiles = fs.readdirSync(customThemesDir).filter(file => file.endsWith('.json'));
        
        for (const themeFile of customThemeFiles) {
          try {
            const themePath = path.join(customThemesDir, themeFile);
            const themeData = JSON.parse(fs.readFileSync(themePath, 'utf8'));
            
            // Check if theme has the required metadata
            if (themeData.name && themeData.author && themeData.version) {
              this.availableThemes.push({
                id: path.basename(themeFile, '.json'),
                name: themeData.name,
                author: themeData.author,
                description: themeData.description || '',
                version: themeData.version,
                path: themePath,
                custom: true
              });
            }
          } catch (err) {
            console.error(`[z-rosetta] Error loading custom theme ${themeFile}:`, err);
          }
        }
      }
      
      console.log(`[z-rosetta] Loaded ${this.availableThemes.length} themes`);
    } catch (error) {
      console.error('[z-rosetta] Error loading available themes:', error);
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
        
        // Load theme setting if it exists
        if (settings.theme) {
          // Check if it's a file path or theme ID
          if (settings.theme.endsWith('.json') && fs.existsSync(settings.theme)) {
            // It's a custom theme file path
            this.currentTheme = settings.theme;
            this.activeThemePath = settings.theme;
          } else {
            // It's a theme ID, check if it exists in available themes
            const themeExists = this.availableThemes.some(theme => theme.id === settings.theme);
            if (themeExists) {
              this.currentTheme = settings.theme;
              const theme = this.availableThemes.find(t => t.id === settings.theme);
              if (theme && theme.path) {
                this.activeThemePath = theme.path;
              }
            }
          }
        } else {
          // No theme specified, use default theme
          const defaultTheme = this.availableThemes.find(t => t.id === this.currentTheme);
          if (defaultTheme && defaultTheme.path) {
            this.activeThemePath = defaultTheme.path;
          }
        }
        
        console.log(`[z-rosetta] Loaded settings: language=${this.currentLanguage}, theme=${this.currentTheme}`);
      } else {
        // Create default settings file
        const defaultSettings = {
          language: this.currentLanguage,
          theme: this.currentTheme
        };
        
        // Set active theme path to default theme
        const defaultTheme = this.availableThemes.find(t => t.id === this.currentTheme);
        if (defaultTheme && defaultTheme.path) {
          this.activeThemePath = defaultTheme.path;
        }
        
        fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
        console.log(`[z-rosetta] Created default settings file: language=${this.currentLanguage}, theme=${this.currentTheme}`);
      }
    } catch (error) {
      console.error('[z-rosetta] Error loading settings:', error);
    }
  }

  /**
   * Save language settings
   * @param {string} language - Language code to save
   */
  async saveSettings(language = null, theme = null) {
    try {
      // Read existing settings to preserve other values
      let settings = {};
      if (fs.existsSync(this.settingsPath)) {
        settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
      }
      
      // Update language if provided
      if (language !== null) {
        // Make sure it's a valid language
        if (!this.availableLanguages.includes(language)) {
          console.error(`[z-rosetta] Invalid language: ${language}`);
          return false;
        }
        
        settings.language = language;
        this.currentLanguage = language;
      }
      
      // Update theme if provided
      if (theme !== null) {
        settings.theme = theme;
        this.currentTheme = theme;
        
        // Update active theme path
        if (theme.endsWith('.json') && fs.existsSync(theme)) {
          this.activeThemePath = theme;
        } else {
          const themeObj = this.availableThemes.find(t => t.id === theme);
          if (themeObj && themeObj.path) {
            this.activeThemePath = themeObj.path;
          }
        }
        
        // Update theme file watcher
        this.setupThemeFileWatcher();
      }
      
      // Save settings
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      
      console.log(`[z-rosetta] Saved settings: language=${this.currentLanguage}, theme=${this.currentTheme}`);
      
      return true;
    } catch (error) {
      console.error('[z-rosetta] Error saving settings:', error);
      return false;
    }
  }

  /**
   * Watch settings file for changes and apply language/theme updates instantly
   */
  watchSettingsFile() {
    if (this.settingsWatcher) {
      this.settingsWatcher.close();
    }

    try {
      this.settingsWatcher = fs.watch(this.settingsPath, async (eventType) => {
        if (eventType === 'change') {
          console.log('[z-rosetta] Settings file changed, updating settings');
          
          // Add a small delay to ensure the file is fully written
          setTimeout(async () => {
            try {
              // Read the updated settings file
              const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
              let changesDetected = false;
              
              // Check if language was changed
              if (settings.language && 
                  this.availableLanguages.includes(settings.language) && 
                  settings.language !== this.currentLanguage) {
                
                // Update the current language
                this.currentLanguage = settings.language;
                console.log(`[z-rosetta] Language updated from settings file: ${this.currentLanguage}`);
                changesDetected = true;
              }
              
              // Check if theme was changed
              if (settings.theme && settings.theme !== this.currentTheme) {
                // Update the current theme
                this.currentTheme = settings.theme;
                console.log(`[z-rosetta] Theme updated from settings file: ${this.currentTheme}`);
                
                // Update active theme path
                if (settings.theme.endsWith('.json') && fs.existsSync(settings.theme)) {
                  this.activeThemePath = settings.theme;
                } else {
                  const themeObj = this.availableThemes.find(t => t.id === settings.theme);
                  if (themeObj && themeObj.path) {
                    this.activeThemePath = themeObj.path;
                  }
                }
                
                // Update theme file watcher for new theme
                this.setupThemeFileWatcher();
                
                changesDetected = true;
              }
              
              // Notify all windows about the changes
              if (changesDetected) {
                this.broadcastSettingsChange();
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
   * Set up theme file watcher to detect changes in the active theme file
   */
  setupThemeFileWatcher() {
    // Close existing watcher if it exists
    if (this.themeFileWatcher) {
      this.themeFileWatcher.close();
      this.themeFileWatcher = null;
    }

    // If there's no active theme path, do nothing
    if (!this.activeThemePath || !fs.existsSync(this.activeThemePath)) {
      console.log('[z-rosetta] No active theme file to watch');
      return;
    }

    try {
      console.log(`[z-rosetta] Setting up theme file watcher for: ${this.activeThemePath}`);
      
      this.themeFileWatcher = fs.watch(this.activeThemePath, async (eventType) => {
        if (eventType === 'change') {
          console.log('[z-rosetta] Theme file changed, updating theme');
          
          // Add a small delay to ensure the file is fully written
          setTimeout(async () => {
            try {
              // Broadcast theme change to all windows
              this.broadcastThemeChange();
            } catch (error) {
              console.error('[z-rosetta] Error processing theme file change:', error);
            }
          }, 100);
        }
      });
      
      console.log('[z-rosetta] Now watching theme file for changes');
    } catch (error) {
      console.error('[z-rosetta] Error setting up theme file watcher:', error);
    }
  }

  /**
   * Broadcast theme change to all renderer processes
   */
  broadcastThemeChange() {
    try {
      const windows = require('electron').BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('z-rosetta-theme-changed', {
            theme: this.currentTheme
          });
        }
      }
      console.log('[z-rosetta] Broadcasted theme change to all windows');
    } catch (error) {
      console.error('[z-rosetta] Error broadcasting theme change:', error);
    }
  }

  /**
   * Broadcast settings change to all renderer processes
   */
  broadcastSettingsChange() {
    try {
      const windows = require('electron').BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('z-rosetta-settings-changed', {
            language: this.currentLanguage,
            translations: this.translations[this.currentLanguage] || {},
            theme: this.currentTheme
          });
        }
      }
      console.log('[z-rosetta] Broadcasted settings change to all windows');
    } catch (error) {
      console.error('[z-rosetta] Error broadcasting settings change:', error);
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
      const success = await this.saveSettings(language, null);
      
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

    // Get current theme
    ipcMain.handle('z-rosetta-get-theme', () => {
      return {
        currentTheme: this.currentTheme,
        availableThemes: this.availableThemes
      };
    });
    
    // Get theme data (CSS variables)
    ipcMain.handle('z-rosetta-get-theme-data', async () => {
      try {
        // If theme is a full path, use it directly
        if (this.currentTheme.endsWith('.json') && fs.existsSync(this.currentTheme)) {
          const themeData = JSON.parse(fs.readFileSync(this.currentTheme, 'utf8'));
          return { success: true, theme: themeData };
        }
        
        // Otherwise, find theme in available themes
        const theme = this.availableThemes.find(t => t.id === this.currentTheme);
        if (theme && fs.existsSync(theme.path)) {
          const themeData = JSON.parse(fs.readFileSync(theme.path, 'utf8'));
          return { success: true, theme: themeData };
        }
        
        // If theme not found, use default light theme
        const defaultThemePath = path.join(__dirname, '..', 'themes', 'zen-theme-light.json');
        if (fs.existsSync(defaultThemePath)) {
          const themeData = JSON.parse(fs.readFileSync(defaultThemePath, 'utf8'));
          return { success: true, theme: themeData };
        }
        
        return { success: false, error: 'Theme not found' };
      } catch (error) {
        console.error('[z-rosetta] Error getting theme data:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Change theme
    ipcMain.handle('z-rosetta-set-theme', async (event, theme) => {
      const success = await this.saveSettings(null, theme);
      return { success };
    });
    
    // Get all available themes
    ipcMain.handle('z-rosetta-get-available-themes', async () => {
      await this.loadAvailableThemes(); // Refresh available themes
      return this.availableThemes;
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