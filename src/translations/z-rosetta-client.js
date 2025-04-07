/**
 * z-rosetta-client.js - Client-side multilingual support for Zen applications
 * © 2024 Zen Team
 * 
 * This module handles translations and themes in the renderer process.
 */

class ZRosettaClient {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'en';
    this.availableLanguages = [];
    this.currentTheme = 'zen-theme-light';
    this.availableThemes = [];
    this.initialized = false;
    this.observers = [];
    this.themeObservers = [];
  }

  /**
   * Initialize the translation system
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Get current language and available languages
      const langInfo = await window.zRosetta.getLanguage();
      this.currentLanguage = langInfo.currentLanguage;
      this.availableLanguages = langInfo.availableLanguages;
      
      // Load translations for current language
      this.translations = await window.zRosetta.getTranslations();
      
      // Get current theme and available themes
      const themeInfo = await window.zRosetta.getTheme();
      this.currentTheme = themeInfo.currentTheme;
      this.availableThemes = themeInfo.availableThemes;
      
      // Apply current theme
      await this.applyTheme();
      
      // Set up IPC listeners for language and theme changes from main process
      this.setupIPCListeners();
      
      this.initialized = true;
      console.log(`[z-rosetta-client] Initialized with language: ${this.currentLanguage} and theme: ${this.currentTheme}`);
      
      return true;
    } catch (error) {
      console.error('[z-rosetta-client] Initialization error:', error);
      return false;
    }
  }

  /**
   * Set up IPC listeners for changes from main process
   */
  setupIPCListeners() {
    // Listen for language/theme changes triggered externally (e.g. settings file changes)
    window.zRosetta.onLanguageChanged((event, data) => {
      console.log(`[z-rosetta-client] Language change detected from main process: ${data.language}`);
      
      // Update language and translations
      this.currentLanguage = data.language;
      this.translations = data.translations;
      
      // Notify observers
      this.notifyObservers();
      
      // Update page content
      this.updatePageContent();
      
      // Update language selector if it exists
      this.updateLanguageSelectors();
    });
    
    // Listen for settings changes (including theme changes)
    window.ipc.on('z-rosetta-settings-changed', (event, data) => {
      console.log(`[z-rosetta-client] Settings change detected from main process`);
      
      let languageChanged = false;
      let themeChanged = false;
      
      // Check if language changed
      if (data.language && data.language !== this.currentLanguage) {
        this.currentLanguage = data.language;
        this.translations = data.translations || {};
        languageChanged = true;
      }
      
      // Check if theme changed
      if (data.theme && data.theme !== this.currentTheme) {
        this.currentTheme = data.theme;
        themeChanged = true;
      }
      
      // Update UI if needed
      if (languageChanged) {
        this.notifyObservers();
        this.updatePageContent();
        this.updateLanguageSelectors();
      }
      
      if (themeChanged) {
        this.applyTheme();
        this.notifyThemeObservers();
        this.updateThemeSelectors();
      }
    });
    
    // Listen for theme file changes
    window.ipc.on('z-rosetta-theme-changed', async (event, data) => {
      console.log(`[z-rosetta-client] Theme file change detected from main process`);
      
      // Apply the updated theme
      await this.applyTheme();
      
      // Notify theme observers
      this.notifyThemeObservers();
    });
  }

  /**
   * Apply the current theme to the document
   * @returns {Promise<boolean>} Success status
   */
  async applyTheme() {
    try {
      // Get theme data from main process
      const result = await window.zRosetta.getThemeData();
      
      if (result.success && result.theme) {
        // Apply theme by setting CSS variables
        const root = document.documentElement;
        
        // Apply all theme variables
        if (result.theme.variables) {
          Object.entries(result.theme.variables).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
          });
        }
        
        // Обновляем тему Monaco Editor, если он доступен
        if (window.updateMonacoTheme && typeof window.updateMonacoTheme === 'function') {
          try {
            // Определяем, темная или светлая тема, по цвету фона
            const bgColor = result.theme.variables['body-background'] || '#ffffff';
            let isDark = false;
            
            // Более точная проверка на темную тему по яркости цвета фона
            if (bgColor.startsWith('#')) {
              // Для HEX цветов
              const hex = bgColor.substring(1);
              const bigint = parseInt(hex, 16);
              const r = (bigint >> 16) & 255;
              const g = (bigint >> 8) & 255;
              const b = bigint & 255;
              // Расчет яркости по формуле (R+R+B+G+G+G)/6
              const brightness = (r + r + b + g + g + g) / 6;
              isDark = brightness < 128;
            } else if (bgColor.startsWith('rgb')) {
              // Для RGB цветов
              const matches = bgColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
              if (matches) {
                const r = parseInt(matches[1], 10);
                const g = parseInt(matches[2], 10);
                const b = parseInt(matches[3], 10);
                // Расчет яркости по формуле (R+R+B+G+G+G)/6
                const brightness = (r + r + b + g + g + g) / 6;
                isDark = brightness < 128;
              }
            }
            
            // Обновляем тему Monaco
            console.log(`[z-rosetta-client] Обновляем тему Monaco Editor, isDark: ${isDark}`);
            window.updateMonacoTheme(isDark);
          } catch (error) {
            console.error('[z-rosetta-client] Ошибка при обновлении темы Monaco Editor:', error);
          }
        }
        
        console.log(`[z-rosetta-client] Applied theme: ${this.currentTheme}`);
        return true;
      }
      
      console.error('[z-rosetta-client] Failed to apply theme:', result.error);
      return false;
    } catch (error) {
      console.error('[z-rosetta-client] Error applying theme:', error);
      return false;
    }
  }

  /**
   * Update all theme selector UI elements
   */
  updateThemeSelectors() {
    const selectors = document.querySelectorAll('.z-rosetta-theme-select');
    selectors.forEach(select => {
      const options = select.querySelectorAll('option');
      options.forEach(option => {
        option.selected = option.value === this.currentTheme;
      });
    });
  }

  /**
   * Update all language selector UI elements
   */
  updateLanguageSelectors() {
    const selectors = document.querySelectorAll('.z-rosetta-language-select');
    selectors.forEach(select => {
      const options = select.querySelectorAll('option');
      options.forEach(option => {
        option.selected = option.value === this.currentLanguage;
      });
    });
  }

  /**
   * Change the current language
   * @param {string} language - Language code to switch to
   * @returns {Promise<boolean>} Success status
   */
  async setLanguage(language) {
    try {
      const result = await window.zRosetta.setLanguage(language);
      
      if (result.success) {
        this.currentLanguage = result.language;
        this.translations = result.translations;
        
        // Notify observers about language change
        this.notifyObservers();
        
        // Update page content
        this.updatePageContent();
        
        console.log(`[z-rosetta-client] Language changed to: ${this.currentLanguage}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[z-rosetta-client] Error changing language:', error);
      return false;
    }
  }

  /**
   * Change the current theme
   * @param {string} theme - Theme to switch to (theme ID or file path)
   * @returns {Promise<boolean>} Success status
   */
  async setTheme(theme) {
    try {
      const result = await window.zRosetta.setTheme(theme);
      
      if (result.success) {
        this.currentTheme = theme;
        
        // Apply the new theme
        await this.applyTheme();
        
        // Notify observers about theme change
        this.notifyThemeObservers();
        
        console.log(`[z-rosetta-client] Theme changed to: ${this.currentTheme}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[z-rosetta-client] Error changing theme:', error);
      return false;
    }
  }

  /**
   * Get translation for a specific key
   * @param {string} key - Dot notation key (e.g. "welcome.title")
   * @returns {string} Translated text or the key if not found
   */
  translate(key) {
    // Handle dot notation (e.g., "welcome.title")
    const parts = key.split('.');
    let value = this.translations;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return key; // Key not found
      }
    }
    
    return value;
  }

  /**
   * Update all translatable elements on the page
   */
  updatePageContent() {
    // Find all elements with data-z-rosetta attribute
    const elements = document.querySelectorAll('[data-z-rosetta]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-z-rosetta');
      const translation = this.translate(key);
      
      // Update element content
      element.textContent = translation;
    });
    
    // Find all elements with data-z-rosetta-placeholder attribute
    const placeholderElements = document.querySelectorAll('[data-z-rosetta-placeholder]');
    
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-z-rosetta-placeholder');
      const translation = this.translate(key);
      
      // Update placeholder attribute
      element.placeholder = translation;
    });
    
    // Find all elements with data-z-rosetta-title attribute
    const titleElements = document.querySelectorAll('[data-z-rosetta-title]');
    
    titleElements.forEach(element => {
      const key = element.getAttribute('data-z-rosetta-title');
      const translation = this.translate(key);
      
      // Update title attribute
      element.title = translation;
    });
  }

  /**
   * Add language change observer
   * @param {Function} callback - Function to call when language changes
   */
  addObserver(callback) {
    if (typeof callback === 'function') {
      this.observers.push(callback);
    }
  }

  /**
   * Remove language change observer
   * @param {Function} callback - Function to remove from observers
   */
  removeObserver(callback) {
    this.observers = this.observers.filter(observer => observer !== callback);
  }

  /**
   * Add theme change observer
   * @param {Function} callback - Function to call when theme changes
   */
  addThemeObserver(callback) {
    if (typeof callback === 'function') {
      this.themeObservers.push(callback);
    }
  }

  /**
   * Remove theme change observer
   * @param {Function} callback - Function to remove from observers
   */
  removeThemeObserver(callback) {
    this.themeObservers = this.themeObservers.filter(observer => observer !== callback);
  }

  /**
   * Notify all language observers about language change
   */
  notifyObservers() {
    this.observers.forEach(callback => {
      try {
        callback(this.currentLanguage, this.translations);
      } catch (error) {
        console.error('[z-rosetta-client] Error in language observer callback:', error);
      }
    });
  }

  /**
   * Notify all theme observers about theme change
   */
  notifyThemeObservers() {
    this.themeObservers.forEach(callback => {
      try {
        callback(this.currentTheme);
      } catch (error) {
        console.error('[z-rosetta-client] Error in theme observer callback:', error);
      }
    });
  }

  /**
   * Create language selector UI
   * @param {string} targetId - ID of element to insert the language selector
   * @returns {HTMLElement} Language selector element
   * @note You may not need to use this method directly as it creates a UI element.
   *       Only use when you need to manually add a language selector to your interface.
   */
  createLanguageSelector(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.error(`[z-rosetta-client] Target element not found: ${targetId}`);
      return null;
    }
    
    // Create language selector container
    const container = document.createElement('div');
    container.className = 'z-rosetta-language-selector';
    
    // Create label
    const label = document.createElement('span');
    label.className = 'z-rosetta-language-label';
    label.setAttribute('data-z-rosetta', 'language.title');
    label.textContent = this.translate('language.title');
    container.appendChild(label);
    
    // Create select element
    const select = document.createElement('select');
    select.className = 'z-rosetta-language-select';
    
    // Add options for each available language
    this.availableLanguages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = this.translate(`language.${lang}`);
      option.selected = lang === this.currentLanguage;
      
      // Add data-z-rosetta attribute for language translation
      option.setAttribute('data-z-rosetta', `language.${lang}`);
      
      select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', (event) => {
      this.setLanguage(event.target.value);
    });
    
    container.appendChild(select);
    targetElement.appendChild(container);
    
    return container;
  }

  /**
   * Create theme selector UI
   * @param {string} targetId - ID of element to insert the theme selector
   * @returns {HTMLElement} Theme selector element
   */
  createThemeSelector(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.error(`[z-rosetta-client] Target element not found: ${targetId}`);
      return null;
    }
    
    // Create theme selector container
    const container = document.createElement('div');
    container.className = 'z-rosetta-theme-selector';
    
    // Create label
    const label = document.createElement('span');
    label.className = 'z-rosetta-theme-label';
    label.setAttribute('data-z-rosetta', 'theme.title');
    label.textContent = this.translate('theme.title') || 'Theme';
    container.appendChild(label);
    
    // Create select element
    const select = document.createElement('select');
    select.className = 'z-rosetta-theme-select';
    
    // Add options for each available theme
    this.availableThemes.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      option.selected = theme.id === this.currentTheme;
      select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', (event) => {
      this.setTheme(event.target.value);
    });
    
    container.appendChild(select);
    targetElement.appendChild(container);
    
    return container;
  }
}

// Create global instance
window.zRosettaClient = new ZRosettaClient(); 