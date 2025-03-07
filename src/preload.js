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
        getFileTree: (projectPath) => ipcRenderer.invoke('get-file-tree', { projectPath })
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

// Expose z-rosetta translation API
contextBridge.exposeInMainWorld(
    'zRosetta',
    {
        getLanguage: () => ipcRenderer.invoke('z-rosetta-get-language'),
        getTranslations: () => ipcRenderer.invoke('z-rosetta-get-translations'),
        setLanguage: (language) => ipcRenderer.invoke('z-rosetta-set-language', language),
        onLanguageChanged: (callback) => ipcRenderer.on('z-rosetta-language-changed', callback)
    }
); 