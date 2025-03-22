const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'windowControls',
    {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    }
);

// Expose Git functionality
contextBridge.exposeInMainWorld(
    'git',
    {
        cloneRepository: (url, directory) => ipcRenderer.invoke('git-clone', { url, directory }),
        getCloneProgress: (callback) => ipcRenderer.on('clone-progress', callback)
    }
);

// Expose project functionality
contextBridge.exposeInMainWorld(
    'project',
    {
        selectDirectory: () => ipcRenderer.invoke('select-directory'),
        openProject: (projectPath) => ipcRenderer.invoke('open-project', { projectPath }),
        onProjectLoaded: (callback) => ipcRenderer.on('project-loaded', callback),
        getFileTree: (projectPath) => ipcRenderer.invoke('get-file-tree', { projectPath }),
        getFileContent: (filePath) => ipcRenderer.invoke('get-file-content', { filePath }),
        saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
        onFileChanged: (callback) => ipcRenderer.on('file-changed', callback)
    }
);

// Expose build information - using IPC instead of direct file access
contextBridge.exposeInMainWorld(
    'buildInfo',
    {
        getBuildInfo: () => ipcRenderer.invoke('get-build-info')
    }
);

// Expose analytics settings API
contextBridge.exposeInMainWorld(
    'analytics',
    {
        updateSettings: (settings) => ipcRenderer.invoke('update-analytics-settings', settings),
        getSettings: () => ipcRenderer.invoke('get-analytics-settings')
    }
);

// Expose z-rosetta translation & theme API
contextBridge.exposeInMainWorld(
    'zRosetta',
    {
        // Language functions
        getLanguage: () => ipcRenderer.invoke('z-rosetta-get-language'),
        getTranslations: () => ipcRenderer.invoke('z-rosetta-get-translations'),
        setLanguage: (language) => ipcRenderer.invoke('z-rosetta-set-language', language),
        onLanguageChanged: (callback) => ipcRenderer.on('z-rosetta-language-changed', callback),
        
        // Theme functions
        getTheme: () => ipcRenderer.invoke('z-rosetta-get-theme'),
        getThemeData: () => ipcRenderer.invoke('z-rosetta-get-theme-data'),
        setTheme: (theme) => ipcRenderer.invoke('z-rosetta-set-theme', theme),
        getAvailableThemes: () => ipcRenderer.invoke('z-rosetta-get-available-themes')
    }
);

// Expose general IPC for events
contextBridge.exposeInMainWorld(
    'ipc',
    {
        on: (channel, callback) => ipcRenderer.on(channel, callback),
        invoke: (channel, args) => ipcRenderer.invoke(channel, args),
        send: (channel, args) => ipcRenderer.send(channel, args)
    }
); 