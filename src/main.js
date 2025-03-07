const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const { trackBuildInFirebase } = require('./firebase-config');
// Import z-rosetta language module
const zRosetta = require('./translations/z-rosetta');

let mainWindow;

// Generate about.json with current system information
function generateAboutJson() {
    const aboutPath = path.join(__dirname, 'about.json');
    
    // Check if about.json already exists, if so, just return the existing data
    if (fs.existsSync(aboutPath)) {
        try {
            const existingData = JSON.parse(fs.readFileSync(aboutPath, 'utf8'));
            console.log('Using existing build information');
            return existingData;
        } catch (error) {
            console.error('Error reading existing about.json, will create new one:', error);
            // Continue to generate new file if there was an error
        }
    }
    
    const buildDate = new Date().toISOString().split('T')[0];
    const dateFormatted = buildDate.replace(/-/g, '');
    
    // Generate a unique build code based on date, random hash, and os+arch
    const randomHash = Math.random().toString(36).substring(2, 8);
    const osCode = process.platform === 'win32' ? 'win' : 
                  process.platform === 'darwin' ? 'mac' : 
                  process.platform === 'linux' ? 'linux' : 'unknown';
    const archCode = process.arch === 'x64' ? '64' : 
                    process.arch === 'ia32' ? '32' : 
                    process.arch === 'arm64' ? 'arm64' : process.arch;
    
    // Technical format with channel: 0.1.0-dev+win64.20250305.wase3c
    const version = '0.1.0';
    const channel = 'dev'; // Could be 'dev', 'beta', 'stable', etc.
    const platform = `${osCode}${archCode}`;
    const buildCode = `${version}-${channel}+${platform}.${dateFormatted}.${randomHash}`;
    
    const aboutData = {
        version: version,
        channel: channel,
        fullVersion: `${version}-${channel}`,
        buildCode: buildCode,
        buildDate: buildDate,
        os: {
            windows: process.platform === 'win32',
            macos: process.platform === 'darwin',
            linux: process.platform === 'linux'
        },
        currentOS: process.platform === 'win32' ? 'Windows' : 
                  process.platform === 'darwin' ? 'macOS' : 
                  process.platform === 'linux' ? 'Linux' : 
                  'Unknown',
        architecture: process.arch,
        contributors: ["Z Team"],
        repository: "https://github.com/z-editor/z",
        license: "MIT"
    };
    
    fs.writeFileSync(aboutPath, JSON.stringify(aboutData, null, 2));
    console.log('Generated about.json with build information:', buildCode);
    return aboutData;
}

// Check if git is installed and get its path
function getGitPath() {
    try {
        const isWindows = process.platform === 'win32';
        console.log('Platform:', process.platform);

        // First try which/where command
        try {
            const command = isWindows ? 'where git' : 'which git';
            const wherePath = execSync(command, { encoding: 'utf8' }).split('\n')[0].trim();
            console.log('Git path from which/where command:', wherePath);
            if (fs.existsSync(wherePath)) {
                return wherePath;
            }
        } catch (e) {
            console.log('which/where git failed:', e.message);
        }

        if (isWindows) {
            // Windows-specific paths
            const commonPaths = [
                'C:\\Program Files\\Git\\cmd\\git.exe',
                'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
                process.env.PROGRAMFILES + '\\Git\\cmd\\git.exe',
                process.env['PROGRAMFILES(X86)'] + '\\Git\\cmd\\git.exe',
            ];

            for (const gitPath of commonPaths) {
                console.log('Checking Windows git path:', gitPath);
                if (fs.existsSync(gitPath)) {
                    console.log('Found git at:', gitPath);
                    return gitPath;
                }
            }
        } else {
            // Linux/Unix paths
            const unixPaths = [
                '/usr/bin/git',
                '/usr/local/bin/git',
                '/opt/local/bin/git',
                path.join(os.homedir(), '.local/bin/git')
            ];

            for (const gitPath of unixPaths) {
                console.log('Checking Unix git path:', gitPath);
                if (fs.existsSync(gitPath)) {
                    console.log('Found git at:', gitPath);
                    return gitPath;
                }
            }
        }

        throw new Error('Git executable not found in common locations');
    } catch (error) {
        console.error('Error finding git:', error);
        throw new Error('Could not find Git installation. Please install Git from https://git-scm.com/downloads');
    }
}

// Управление настройками аналитики
let analyticsSettings = {
    basicAnalytics: null, // null означает, что настройки еще не были установлены пользователем
    systemAnalytics: null
};

function loadAnalyticsSettings() {
    const settingsPath = path.join(app.getPath('userData'), 'analytics-settings.json');
    
    try {
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            analyticsSettings = settings;
            console.log('Loaded analytics settings:', analyticsSettings);
        } else {
            // Если файла нет, не создаем настройки по умолчанию, а дождемся решения пользователя
            console.log('No analytics settings found, waiting for user choice');
        }
    } catch (error) {
        console.error('Error loading analytics settings:', error);
        // В случае ошибки используем настройки по умолчанию
    }
    
    return analyticsSettings;
}

function saveAnalyticsSettings() {
    const settingsPath = path.join(app.getPath('userData'), 'analytics-settings.json');
    
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(analyticsSettings, null, 2));
        console.log('Saved analytics settings:', analyticsSettings);
    } catch (error) {
        console.error('Error saving analytics settings:', error);
    }
}

// Function to create the window
async function createWindow() {
    try {
        // Initialize analytics settings and about data
        const aboutData = generateAboutJson();
        analyticsSettings = loadAnalyticsSettings();
        
        // Initialize z-rosetta translation system
        await zRosetta.initialize();
        
        // Create the browser window.
        mainWindow = new BrowserWindow({
            width: 900,
            height: 580,
            frame: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            backgroundColor: '#ffffff'
        });

        // Load the welcome.html file
        mainWindow.loadFile('src/welcome.html');
        
        // НЕ отправляем данные автоматически, дождемся решения пользователя
    } catch (error) {
        console.error('Error creating main window:', error);
    }
}

// Handle window control events
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

// Handle Git operations
ipcMain.handle('git-clone', async (event, { url, directory }) => {
    try {
        // Get git path first
        const gitPath = getGitPath();
        console.log('Using git from:', gitPath);

        return new Promise((resolve, reject) => {
            const targetDir = directory || path.basename(url, '.git');
            const fullPath = path.join(app.getPath('documents'), 'Z-Projects', targetDir);
            console.log('Target directory:', fullPath);

            // Create projects directory if it doesn't exist
            const projectsDir = path.join(app.getPath('documents'), 'Z-Projects');
            if (!fs.existsSync(projectsDir)) {
                console.log('Creating projects directory:', projectsDir);
                fs.mkdirSync(projectsDir, { recursive: true });
            }

            // Check if directory already exists
            if (fs.existsSync(fullPath)) {
                reject(new Error('Directory already exists'));
                return;
            }

            // Set English language and other env vars
            const env = Object.assign({}, process.env, {
                LANG: 'en_US.UTF-8',
                LC_ALL: 'en_US.UTF-8',
                LC_MESSAGES: 'en_US.UTF-8',
                GIT_TERMINAL_PROMPT: '0'
            });

            console.log('Starting git clone...');
            
            // Use different command format based on platform
            const isWindows = process.platform === 'win32';
            const command = isWindows 
                ? `"${gitPath}" clone "${url}" "${fullPath}"`
                : `${gitPath} clone "${url}" "${fullPath}"`;
                
            console.log('Command:', command);
            
            const gitProcess = exec(command, {
                windowsHide: true,
                env,
                encoding: 'utf8'
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Git clone error:', {
                        error: error.message,
                        stdout,
                        stderr,
                        code: error.code
                    });

                    const errorDetails = [
                        `Exit code: ${error.code}`,
                        `Error: ${error.message}`,
                        stdout ? `Output: ${stdout}` : null,
                        stderr ? `Error output: ${stderr}` : null
                    ].filter(Boolean).join('\n');

                    reject(new Error(`Git clone failed:\n${errorDetails}`));
                    return;
                }
                
                console.log('Git clone successful');
                console.log('Stdout:', stdout);
                console.log('Stderr:', stderr);
                
                resolve({ path: fullPath });
            });

            gitProcess.stderr.on('data', (data) => {
                const progress = data.toString();
                console.log('Git progress:', progress);
                mainWindow.webContents.send('clone-progress', progress);
            });

            gitProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('Git output:', output);
                mainWindow.webContents.send('clone-progress', output);
            });

            gitProcess.on('error', (error) => {
                console.error('Process error:', error);
                reject(new Error(`Process error: ${error.message}`));
            });
        });
    } catch (error) {
        console.error('Top-level error:', error);
        throw error;
    }
});

// Handle opening a project directory
ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Project Folder',
        buttonLabel: 'Open Project'
    });
    
    if (result.canceled) {
        return { canceled: true };
    }
    
    const projectPath = result.filePaths[0];
    return { 
        canceled: false, 
        projectPath 
    };
});

// Handle opening a directory as a project
ipcMain.handle('open-project', async (event, { projectPath }) => {
    try {
        if (!fs.existsSync(projectPath)) {
            throw new Error('Project directory does not exist');
        }
        
        // Load the main editor window with the selected project
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
        
        // Send the project path to the renderer
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('project-loaded', { 
                projectPath, 
                projectName: path.basename(projectPath) 
            });
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error opening project:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// Handle build information request
ipcMain.handle('get-build-info', async (event) => {
    try {
        // Read about.json to get build information
        const aboutPath = path.join(__dirname, 'about.json');
        const aboutData = JSON.parse(fs.readFileSync(aboutPath, 'utf8'));
        return aboutData;
    } catch (error) {
        console.error('Error getting build info:', error);
        return {
            version: '0.1.0',
            channel: 'dev',
            fullVersion: '0.1.0-dev',
            buildCode: 'dev-build',
            buildDate: new Date().toISOString().split('T')[0]
        };
    }
});

// Модифицируем обработчик для обновления настроек аналитики
ipcMain.handle('update-analytics-settings', async (event, settings) => {
    console.log('Updating analytics settings:', settings);
    
    const oldSettings = {...analyticsSettings};
    analyticsSettings = {...analyticsSettings, ...settings};
    saveAnalyticsSettings();
    
    // Если настройки включены и были изменены или установлены впервые,
    // отправляем данные только после получения разрешения пользователя
    if (settings.basicAnalytics && 
        (oldSettings.basicAnalytics === null || oldSettings.basicAnalytics === false)) {
        const aboutPath = path.join(__dirname, 'about.json');
        try {
            const aboutData = JSON.parse(fs.readFileSync(aboutPath, 'utf8'));
            trackBuildInFirebase(aboutData, analyticsSettings)
                .then(() => console.log('Build data tracked in Firebase after user consent'))
                .catch(error => console.error('Failed to track build data:', error));
        } catch (error) {
            console.error('Error reading about.json for analytics:', error);
        }
    }
    
    return analyticsSettings;
});

ipcMain.handle('get-analytics-settings', async () => {
    return analyticsSettings;
});

// Get file tree structure recursively
function getFileTree(dirPath, projectRoot) {
    try {
        const relativePath = path.relative(projectRoot, dirPath);
        const dirName = path.basename(dirPath);
        const isRoot = dirPath === projectRoot;
        
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        // Sort directories first, then files, both alphabetically
        items.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });
        
        const children = items.map(item => {
            const itemPath = path.join(dirPath, item.name);
            const itemRelativePath = path.relative(projectRoot, itemPath);
            
            if (item.isDirectory()) {
                return {
                    name: item.name,
                    path: itemRelativePath,
                    type: 'directory',
                    children: getFileTree(itemPath, projectRoot).children
                };
            } else {
                return {
                    name: item.name,
                    path: itemRelativePath,
                    type: 'file'
                };
            }
        });
        
        if (isRoot) {
            return {
                name: dirName,
                path: relativePath || '.',
                type: 'directory',
                children
            };
        } else {
            return { children };
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return { children: [] };
    }
}

// Handle getting file tree
ipcMain.handle('get-file-tree', async (event, { projectPath }) => {
    try {
        if (!fs.existsSync(projectPath)) {
            throw new Error('Project directory does not exist');
        }
        
        const fileTree = getFileTree(projectPath, projectPath);
        return { success: true, fileTree };
    } catch (error) {
        console.error('Error getting file tree:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
}); 