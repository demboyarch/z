/**
 * z-rosetta-client.js - Client-side multilingual support for Zen applications
 * © 2024 Zen Team
 * 
 * This module handles translations in the renderer process.
 */

class ZRosettaClient {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'en';
    this.availableLanguages = [];
    this.initialized = false;
    this.observers = [];
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
      
      // Set up IPC listeners for language changes from main process
      this.setupIPCListeners();
      
      this.initialized = true;
      console.log(`[z-rosetta-client] Initialized with language: ${this.currentLanguage}`);
      
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
    // Listen for language changes triggered externally (e.g. settings file changes)
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
   * Notify all observers about language change
   */
  notifyObservers() {
    this.observers.forEach(callback => {
      try {
        callback(this.currentLanguage, this.translations);
      } catch (error) {
        console.error('[z-rosetta-client] Error in observer callback:', error);
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
}

// Create global instance
window.zRosettaClient = new ZRosettaClient(); 