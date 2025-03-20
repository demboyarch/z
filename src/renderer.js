document.addEventListener('DOMContentLoaded', () => {
    // Setup z-rosetta IPC bridge for renderer process
    if (!window.zRosetta) {
        window.zRosetta = {
            getLanguage: () => window.ipc.invoke('z-rosetta-get-language'),
            getTranslations: () => window.ipc.invoke('z-rosetta-get-translations'),
            setLanguage: (language) => window.ipc.invoke('z-rosetta-set-language', language),
            onLanguageChanged: (callback) => window.ipc.on('z-rosetta-language-changed', callback)
        };
    }

    // Create a namespace for error handling features
    if (!window.errorHandler) {
        window.errorHandler = {
            detailTabs: new Map(), // Store references to error/warning detail tabs
            originalFiles: new Map() // Map error tabs to their original files
        };
    }

    // Window control buttons
    const closeButton = document.querySelector('.control.close');
    const minimizeButton = document.querySelector('.control.minimize');
    const maximizeButton = document.querySelector('.control.maximize');
    
    // File tree state
    let currentProjectPath = null;
    const expandedFolders = new Set();
    let activeFile = null;
    
    // Tab System State
    let openTabs = [];
    let activeTab = null;
    
    // Editor State
    let monacoInitialized = false;
    let fileTreeInitialized = false;
    
    // Global variables to track errors and warnings
    let errorCount = 0;
    let warningCount = 0;
    let statusMessage = '';
    
    // Initialize tabs
    initializeTabEvents();
    
    // Initialize Monaco editor
    initializeMonaco();
    
    // Setup error details click handlers
    setupErrorDetailsOnClick();
    
    // Window control button event listeners
    closeButton.addEventListener('click', () => {
        windowControls.close();
    });
    
    minimizeButton.addEventListener('click', () => {
        windowControls.minimize();
    });
    
    maximizeButton.addEventListener('click', () => {
        windowControls.maximize();
    });

    // Handle project loading event
    window.project?.onProjectLoaded((event, { projectPath, projectName }) => {
        console.log('Project loaded:', { projectPath, projectName });
        
        // Update the project name in the title bar
        const projectNameElement = document.querySelector('.project-name');
        if (projectNameElement) {
            projectNameElement.textContent = projectName || 'Untitled Project';
            
            // Add tooltip with full path
            projectNameElement.title = projectPath;
        }
        
        // Initialize file explorer with the project files
        currentProjectPath = projectPath;
        
        // Делаем путь проекта доступным глобально
        window.currentProjectPath = projectPath;
        
        initializeFileTree(projectPath);
        
        // Update window title
        document.title = `${projectName || 'Untitled Project'} - Zen`;
        
        // Initialize tabs after project is loaded
        initializeTabEvents();
    });

    // File tree toggle
    const fileTreeButton = document.querySelector('.file-tree-toggle');
    const sidebar = document.getElementById('sidebar');
    let isFileTreeVisible = true;

    // Set initial state
    fileTreeButton.classList.add('active');

    fileTreeButton.addEventListener('click', () => {
        isFileTreeVisible = !isFileTreeVisible;
        fileTreeButton.classList.toggle('active', isFileTreeVisible);
        sidebar.classList.toggle('hidden', !isFileTreeVisible);
    });

    // Sidebar resize functionality
    const resizer = document.getElementById('resizer');
    let isResizing = false;
    let lastDownX = 0;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        lastDownX = e.clientX;
        resizer.classList.add('resizing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const delta = e.clientX - lastDownX;
        lastDownX = e.clientX;

        const sidebarWidth = sidebar.offsetWidth + delta;
        if (sidebarWidth >= 200 && sidebarWidth <= 600) {
            sidebar.style.width = `${sidebarWidth}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        resizer.classList.remove('resizing');
    });

    // Function to hide loading overlay and show content
    function hideLoadingOverlay() {
        // Make sure both Monaco editor and file tree are initialized
        if (!monacoInitialized || !fileTreeInitialized) {
            return;
        }
        
        // Hide the loading overlay immediately when content is ready
        actuallyHideLoadingOverlay();
    }
    
    // Function that actually hides the loading overlay
    function actuallyHideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const mainLayout = document.querySelector('.main-layout');
        
        if (loadingOverlay && mainLayout) {
            // Hide overlay with animation
            loadingOverlay.classList.add('hidden');
            
            // Show main content
            mainLayout.classList.remove('loading');
            
            // Remove overlay after animation completes
            setTimeout(() => {
                loadingOverlay.remove();
            }, 300);
            
            console.log('Loading completed, interface is now visible');
        }
    }

    // Initialize file tree
    async function initializeFileTree(projectPath) {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = ''; // Clear existing content
        
        try {
            console.log('Initializing file tree for:', projectPath);
            
            // Fetch file tree data
            const result = await window.project.getFileTree(projectPath);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to load file tree');
            }
            
            // Create file tree element
            const fileTree = document.createElement('div');
            fileTree.className = 'file-tree';
            
            // Create root item (project folder)
            renderFileTreeItem(fileTree, result.fileTree, 0);
            
            // Add to sidebar
            sidebar.appendChild(fileTree);
            
            // Find and expand root folder
            const rootFolderItem = fileTree.querySelector('.file-tree-item[data-type="directory"]');
            if (rootFolderItem) {
                const rootFolderId = rootFolderItem.getAttribute('data-folder-id');
                if (rootFolderId) {
                    console.log('Expanding root folder with ID:', rootFolderId);
                    expandedFolders.add(result.fileTree.path);
                    toggleFolder(rootFolderId, result.fileTree.path);
                }
            }

            // Mark file tree as initialized and try to hide loading overlay
            fileTreeInitialized = true;
            hideLoadingOverlay();
            
        } catch (error) {
            console.error('Error initializing file tree:', error);
            sidebar.innerHTML = `<div class="file-tree-error">Error loading file tree: ${error.message}</div>`;
            
            // Even if there's an error, mark as initialized so we can hide loading overlay
            fileTreeInitialized = true;
            hideLoadingOverlay();
        }
    }
    
    // Render a single file tree item
    function renderFileTreeItem(parentElement, item, level) {
        const itemElement = document.createElement('div');
        itemElement.className = 'file-tree-item';
        itemElement.setAttribute('data-path', item.path);
        itemElement.setAttribute('data-type', item.type);
        itemElement.setAttribute('title', item.path); // Для отладки
        
        if (item.type === 'directory') {
            // Создаем уникальный идентификатор для папки
            const folderId = `folder-${Math.random().toString(36).substring(2, 10)}`;
            itemElement.setAttribute('data-folder-id', folderId);
            
            // Folder toggle arrow
            const folderToggle = document.createElement('span');
            folderToggle.className = 'folder-toggle';
            folderToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 1l4 3-4 3"/></svg>`;
            itemElement.appendChild(folderToggle);
            
            // Folder name
            const nameElement = document.createElement('span');
            nameElement.className = 'file-tree-item-name';
            nameElement.textContent = item.name;
            itemElement.appendChild(nameElement);
            
            // Add folder item to parent
            parentElement.appendChild(itemElement);
            
            // Create container for children
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'file-tree-children';
            childrenContainer.id = folderId; // Используем сгенерированный ID
            childrenContainer.style.display = 'none'; // Hidden by default
            parentElement.appendChild(childrenContainer);
            
            // Add click handlers
            folderToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFolder(folderId, item.path);
            });
            
            itemElement.addEventListener('click', (e) => {
                if (e.target !== folderToggle) {
                    toggleFolder(folderId, item.path);
                }
            });
            
            // Render children
            if (item.children && item.children.length > 0) {
                item.children.forEach(child => {
                    renderFileTreeItem(childrenContainer, child, level + 1);
                });
            } else {
                // Empty folder
                const emptyFolderElement = document.createElement('div');
                emptyFolderElement.className = 'file-tree-item empty-folder';
                emptyFolderElement.textContent = 'Empty folder';
                childrenContainer.appendChild(emptyFolderElement);
            }
        } else {
            // File item
            const spacer = document.createElement('span');
            spacer.className = 'file-indicator';
            spacer.textContent = ' ';
            itemElement.appendChild(spacer);
            
            // File name
            const nameElement = document.createElement('span');
            nameElement.className = 'file-tree-item-name';
            nameElement.textContent = item.name;
            itemElement.appendChild(nameElement);
            
            // Click handler for files
            itemElement.addEventListener('click', (e) => {
                e.stopPropagation();
                handleFileClick(item.path);
            });
            
            // Add file item to parent
            parentElement.appendChild(itemElement);
        }
    }
    
    // Toggle folder expansion - теперь использует ID вместо пути
    function toggleFolder(folderId, folderPath) {
        const folderElement = document.getElementById(folderId);
        
        if (!folderElement) {
            console.error(`Cannot find folder element with id: ${folderId}`);
            return;
        }
        
        const folderItemElement = document.querySelector(`[data-folder-id="${folderId}"]`);
        if (!folderItemElement) {
            console.error(`Cannot find folder item with data-folder-id: ${folderId}`);
            return;
        }
        
        const folderToggle = folderItemElement.querySelector('.folder-toggle');
        if (!folderToggle) {
            console.error('Cannot find folder toggle element');
            return;
        }
        
        const isExpanded = expandedFolders.has(folderPath);
        
        if (isExpanded) {
            // Закрываем папку
            folderElement.style.display = 'none';
            expandedFolders.delete(folderPath);
            folderToggle.classList.remove('expanded');
        } else {
            // Открываем папку
            folderElement.style.display = 'block';
            expandedFolders.add(folderPath);
            folderToggle.classList.add('expanded');
        }
    }
    
    // Handle file click
    function handleFileClick(filePath) {
        if (activeFile) {
            // Deactivate current file
            const currentActiveElement = document.querySelector(`.file-tree-item[data-path="${activeFile}"]`);
            if (currentActiveElement) {
                currentActiveElement.classList.remove('active');
            }
        }
        
        // Activate new file
        activeFile = filePath;
        const newActiveElement = document.querySelector(`.file-tree-item[data-path="${activeFile}"]`);
        if (newActiveElement) {
            newActiveElement.classList.add('active');
        }
        
        // Get file name for tab - properly handle both Unix and Windows paths
        const fileName = filePath.split(/[/\\]/).pop();
        
        // Create or activate tab for this file
        createOrActivateTab(fileName, filePath);
        
        // Update breadcrumb with relative path
        updateFileBreadcrumb(filePath);
        
        console.log('File clicked:', filePath);
        
        // Load file content
        loadFileContent(filePath);
    }
    
    // Tab System Functionality
    function initializeTabEvents() {
        // Tab navigation arrows
        const leftArrow = document.querySelector('.tab-arrow-left');
        const rightArrow = document.querySelector('.tab-arrow-right');
        
        if (leftArrow) {
            leftArrow.addEventListener('click', () => {
                const tabsContainer = document.querySelector('.tabs-container');
                if (tabsContainer) {
                    tabsContainer.scrollBy({ left: -100, behavior: 'smooth' });
                }
            });
        }
        
        if (rightArrow) {
            rightArrow.addEventListener('click', () => {
                const tabsContainer = document.querySelector('.tabs-container');
                if (tabsContainer) {
                    tabsContainer.scrollBy({ left: 100, behavior: 'smooth' });
                }
            });
        }
        
        // Initialize drag and drop functionality for tabs
        initializeTabDragDrop();
        
        // Add click events to initial tabs
        const tabs = document.querySelectorAll('.tab');
        if (tabs.length > 0) {
            tabs.forEach(tab => {
                // Get file path from tab data attribute
                const filePath = tab.getAttribute('data-path');
                const fileName = tab.querySelector('.tab-name')?.textContent;
                
                if (filePath && fileName) {
                    if (tab.classList.contains('active')) {
                        activeTab = { name: fileName, path: filePath };
                        openTabs.push(activeTab);
                    } else {
                        openTabs.push({ name: fileName, path: filePath });
                    }
                    
                    // Add click event to tab
                    tab.addEventListener('click', () => {
                        activateTab(fileName, filePath);
                    });
                    
                    // Add click event to close button
                    const closeButton = tab.querySelector('.tab-close');
                    if (closeButton) {
                        closeButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            closeTab(fileName, filePath);
                        });
                    }
                }
            });
        }
    }
    
    // Initialize drag and drop functionality for tabs
    function initializeTabDragDrop() {
        const tabsContainer = document.querySelector('.tabs-container');
        if (!tabsContainer) return;
        
        let draggedTab = null;
        let initialX = 0;
        let initialScrollLeft = 0;
        
        // Function to determine which tab is at a specific position
        function getTabAtPosition(x) {
            const tabs = Array.from(document.querySelectorAll('.tab'));
            for (let i = 0; i < tabs.length; i++) {
                const tab = tabs[i];
                const rect = tab.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right) {
                    return { tab, index: i };
                }
            }
            // If position is after all tabs, return the last tab
            if (tabs.length > 0) {
                return { tab: tabs[tabs.length - 1], index: tabs.length - 1 };
            }
            return null;
        }
        
        // Add event listeners to each tab
        function setupTabDragging() {
            const tabs = document.querySelectorAll('.tab');
            
            tabs.forEach((tab) => {
                // Skip if already has drag handlers
                if (tab.hasAttribute('data-drag-initialized')) return;
                
                tab.setAttribute('data-drag-initialized', 'true');
                tab.setAttribute('draggable', 'true');
                
                tab.addEventListener('dragstart', (e) => {
                    draggedTab = tab;
                    // Store the initial position for reordering calculations
                    initialX = e.clientX;
                    initialScrollLeft = tabsContainer.scrollLeft;
                    
                    // Set drag image and effect
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // Add a class to show it's being dragged
                    setTimeout(() => {
                        tab.classList.add('dragging');
                    }, 0);
                });
                
                tab.addEventListener('dragend', () => {
                    draggedTab.classList.remove('dragging');
                    draggedTab = null;
                });
                
                tab.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });
                
                tab.addEventListener('drop', (e) => {
                    e.preventDefault();
                    if (!draggedTab || draggedTab === tab) return;
                    
                    // Reorder tabs in the DOM
                    const targetRect = tab.getBoundingClientRect();
                    const targetCenter = targetRect.left + targetRect.width / 2;
                    
                    if (e.clientX < targetCenter) {
                        tabsContainer.insertBefore(draggedTab, tab);
                    } else {
                        tabsContainer.insertBefore(draggedTab, tab.nextSibling);
                    }
                    
                    // Reorder tabs in the state array
                    reorderTabsInState();
                });
            });
        }
        
        // Function to reorder tabs in the state array
        function reorderTabsInState() {
            const newOpenTabs = [];
            const tabElements = document.querySelectorAll('.tab');
            
            tabElements.forEach((tabElement) => {
                const path = tabElement.getAttribute('data-path');
                const name = tabElement.querySelector('.tab-name').textContent;
                
                // Find the tab in the original array
                const existingTab = openTabs.find(tab => tab.path === path);
                if (existingTab) {
                    newOpenTabs.push(existingTab);
                } else {
                    newOpenTabs.push({ name, path });
                }
            });
            
            // Update the state
            openTabs = newOpenTabs;
        }
        
        // Add drop handling to the container itself
        tabsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        tabsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedTab) return;
            
            // Handle dropping at the end of the container
            const target = getTabAtPosition(e.clientX);
            if (!target) {
                tabsContainer.appendChild(draggedTab);
            }
            
            // Reorder tabs in the state array
            reorderTabsInState();
        });
        
        // Call setup initially
        setupTabDragging();
        
        // Make setupTabDragging available globally
        window.setupTabDragging = setupTabDragging;
    }
    
    // Create or activate tab
    function createOrActivateTab(fileName, filePath) {
        // Check if tab already exists
        const existingTab = openTabs.find(tab => tab.path === filePath);
        
        if (existingTab) {
            // Tab exists, just activate it
            activateTab(existingTab.name, filePath);
        } else {
            // Create new tab
            createTab(fileName, filePath);
        }
    }
    
    // Modified createTab to initialize drag and drop after creating a tab
    function createTab(fileName, filePath) {
        const tabsContainer = document.querySelector('.tabs-container');
        
        // Ensure consistent path format (using forward slashes)
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // Create tab element
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-path', normalizedPath);
        
        tab.innerHTML = `
            <span class="tab-name">${fileName}</span>
            <button class="tab-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        // Add to tabs container
        tabsContainer.appendChild(tab);
        
        // Add to open tabs array - store consistent path
        const newTab = { name: fileName, path: normalizedPath };
        openTabs.push(newTab);
        
        // Add click event to tab
        tab.addEventListener('click', () => {
            activateTab(fileName, normalizedPath);
        });
        
        // Add click event to close button
        const closeButton = tab.querySelector('.tab-close');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(fileName, normalizedPath);
        });
        
        // Activate the new tab
        activateTab(fileName, normalizedPath);
        
        // Scroll to the new tab
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Setup dragging for the new tab
        setupTabDragging();
    }
    
    // Activate an existing tab
    function activateTab(fileName, filePath) {
        // Normalize the path for consistent handling
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // If it's already the active tab, do nothing
        if (activeTab && activeTab.path === normalizedPath) {
            return;
        }
        
        // Remember the previous tab to handle cases where we're coming from error details
        const previousTabPath = activeTab ? activeTab.path : null;
        const wasVirtualTab = activeTab && activeTab.id !== undefined;
        const previousTabId = wasVirtualTab ? activeTab.id : null;
        
        // Store the error counts before switching
        const prevErrors = errorCount;
        const prevWarnings = warningCount;
        
        // Deactivate current active tab
        if (activeTab) {
            // First try to find a regular tab
            let currentTab = document.querySelector(`.tab[data-path="${activeTab.path}"]`);
            // If not found, try to find a virtual tab
            if (!currentTab && activeTab.id) {
                currentTab = document.querySelector(`.tab[data-virtual-id="${activeTab.id}"]`);
            }
            
            if (currentTab) {
                currentTab.classList.remove('active');
            }
        }
        
        // Activate new tab
        const newTab = document.querySelector(`.tab[data-path="${normalizedPath}"]`);
        if (newTab) {
            newTab.classList.add('active');
            activeTab = { name: fileName, path: normalizedPath };
            
            // Activate the corresponding file in the file tree
            if (activeFile !== filePath) {
                // Deactivate current file in tree if different
                if (activeFile) {
                    const currentActiveElement = document.querySelector(`.file-tree-item[data-path="${activeFile}"]`);
                    if (currentActiveElement) {
                        currentActiveElement.classList.remove('active');
                    }
                }
                
                // Activate file in tree
                activeFile = filePath;
                const newActiveElement = document.querySelector(`.file-tree-item[data-path="${filePath}"]`);
                if (newActiveElement) {
                    newActiveElement.classList.add('active');
                    
                    // Make sure the file's parent folders are expanded
                    ensureParentFoldersExpanded(filePath);
                }
            }
            
            // Update breadcrumb
            updateFileBreadcrumb(filePath);
            
            // Load file content
            loadFileContent(filePath);
            
            // Always ensure errors are refreshed when switching tabs
            const refreshErrorIndicators = () => {
                // Force validation to update error counts
                validateCurrentModel();
                
                // If we have Monaco initialized, recheck for markers
                if (window.monacoEditor && window.monacoEditor.monaco && window.monacoEditor.instance) {
                    const model = window.monacoEditor.instance.getModel();
                    if (model) {
                        const markers = window.monacoEditor.monaco.editor.getModelMarkers({ resource: model.uri });
                        
                        // Count errors and warnings
                        let errCount = 0;
                        let warnCount = 0;
                        
                        markers.forEach(marker => {
                            if (marker.severity === window.monacoEditor.monaco.MarkerSeverity.Error) {
                                errCount++;
                            } else if (marker.severity === window.monacoEditor.monaco.MarkerSeverity.Warning) {
                                warnCount++;
                            }
                        });
                        
                        // Update UI with error counts
                        updateErrorsAndWarnings(errCount, warnCount);
                    }
                }
            };
            
            // Run the error refresh checks at staggered intervals to catch any race conditions
            setTimeout(refreshErrorIndicators, 100);
            setTimeout(refreshErrorIndicators, 300);
            setTimeout(refreshErrorIndicators, 500);
            
            // Handle switching from error details tab (existing code)
            if (wasVirtualTab && window.errorHandler.detailTabs.has(previousTabId)) {
                // We're coming from an error details tab, force refresh the error indicators
                const forceRefreshErrors = () => {
                    // Force validation
                    validateCurrentModel();
                    
                    // If the indicators still show no errors but we know there were errors before,
                    // manually update them
                    if (prevErrors > 0 || prevWarnings > 0) {
                        setTimeout(() => {
                            if (errorCount === 0 && warningCount === 0) {
                                updateErrorsAndWarnings(prevErrors, prevWarnings);
                            }
                        }, 50);
                    }
                };
                
                // Force multiple checks to catch race conditions
                setTimeout(forceRefreshErrors, 50);
                setTimeout(forceRefreshErrors, 200);
                setTimeout(forceRefreshErrors, 500);
            }
        }
    }
    
    // Ensure parent folders are expanded for a given file path
    function ensureParentFoldersExpanded(filePath) {
        const pathParts = filePath.split(/[/\\]/);
        let currentPath = '';
        
        // Build each parent path and expand it
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (i === 0) {
                currentPath = pathParts[0];
            } else {
                currentPath = currentPath + '/' + pathParts[i];
            }
            
            // Find folder by path and expand it
            const folderElement = document.querySelector(`.file-tree-item[data-path="${currentPath}"][data-type="directory"]`);
            if (folderElement) {
                const folderId = folderElement.getAttribute('data-folder-id');
                if (folderId && !expandedFolders.has(currentPath)) {
                    toggleFolder(folderId, currentPath);
                }
            }
        }
    }
    
    // Close a tab
    function closeTab(fileName, filePath) {
        // Find tab in open tabs - ensure path comparison works correctly
        const tabIndex = openTabs.findIndex(tab => {
            // Normalize paths for comparison to handle mixed slash types
            return tab.path === filePath || 
                   tab.path.replace(/\\/g, '/') === filePath.replace(/\\/g, '/');
        });
        
        if (tabIndex !== -1) {
            const targetTab = openTabs[tabIndex];
            // Remove from array
            openTabs.splice(tabIndex, 1);
            
            // Remove from DOM - handle case sensitivity and path separator differences
            let tab = document.querySelector(`.tab[data-path="${targetTab.path}"]`);
            if (!tab) {
                // Try with normalized path as fallback
                const normalizedPath = targetTab.path.replace(/\\/g, '/');
                tab = document.querySelector(`.tab[data-path="${normalizedPath}"]`);
            }
            
            if (tab) {
                tab.remove();
            } else {
                console.error(`Failed to find tab element for path: ${targetTab.path}`);
            }
            
            // If the closed tab was the active one, activate another tab
            if (activeTab && (activeTab.path === targetTab.path || 
                activeTab.path.replace(/\\/g, '/') === targetTab.path.replace(/\\/g, '/'))) {
                if (openTabs.length > 0) {
                    // Activate the tab to the left, or the first tab if none to the left
                    const newTabIndex = Math.max(0, tabIndex - 1);
                    const newTab = openTabs[newTabIndex];
                    activateTab(newTab.name, newTab.path);
                } else {
                    // No tabs left
                    activeTab = null;
                    // Clear breadcrumb
                    updateFileBreadcrumb(null);
                }
            }
        }
    }
    
    // Update file breadcrumb
    function updateFileBreadcrumb(filePath) {
        const breadcrumbFilePathElement = document.querySelector('.file-path');
        const breadcrumbContextElement = document.querySelector('.context-info');
        
        if (breadcrumbFilePathElement && breadcrumbContextElement) {
            // Make path relative to project
            let displayPath = filePath;
            if (currentProjectPath && filePath.startsWith(currentProjectPath)) {
                displayPath = filePath.substring(currentProjectPath.length + 1);
            }
            
            breadcrumbFilePathElement.textContent = displayPath;
            
            // Store full path as a data attribute
            breadcrumbFilePathElement.setAttribute('data-full-path', filePath);
            
            // Extract file extension for context info
            const extension = filePath.split('.').pop().toLowerCase();
            breadcrumbContextElement.textContent = extension;
        }
    }

    // Initialize Monaco Editor
    async function initializeMonaco() {
        try {
            // Replace placeholder with loading indicator
            const editorContainer = document.querySelector('.editor-container');
            if (editorContainer) {
                const loadingEl = document.createElement('div');
                loadingEl.className = 'editor-loading';
                loadingEl.innerHTML = '<div class="spinner"></div><div>Initializing editor...</div>';
                editorContainer.innerHTML = '';
                editorContainer.appendChild(loadingEl);
            }
            
            // Initialize Monaco
            await window.initMonaco();
            monacoInitialized = true;
            console.log('Monaco editor initialized');
            
            // Configure Monaco editor for error detection
            setupErrorDetection();
            
            // Setup click handler for errors in the editor
            setupEditorErrorClickHandler();
            
            // If there's an active file, open it
            if (activeFile) {
                loadFileContent(activeFile);
            }
            
            // Try to hide loading overlay
            hideLoadingOverlay();
        } catch (error) {
            console.error('Failed to initialize Monaco editor:', error);
            
            // Show error message in editor container
            const editorContainer = document.querySelector('.editor-container');
            if (editorContainer) {
                editorContainer.innerHTML = `
                    <div class="editor-error">
                        <div>Failed to initialize editor</div>
                        <div class="error-details">${error.message}</div>
                    </div>
                `;
            }
            
            // Even if there's an error, mark as initialized
            monacoInitialized = true;
            hideLoadingOverlay();
        }
    }
    
    // Load file content
    async function loadFileContent(filePath) {
        try {
            // Check if the file is already loaded in Monaco
            if (monacoInitialized && window.monacoEditor) {
                const normalizedPath = filePath.replace(/\\/g, '/');
                const loadedModels = window.monacoEditor.monaco.editor.getModels();
                const existingModel = loadedModels.find(model => 
                    model.uri.path === normalizedPath || 
                    model.uri.toString().includes(normalizedPath)
                );
                
                // If model already exists, just set it as the active model
                if (existingModel) {
                    window.monacoEditor.instance.setModel(existingModel);
                    // Focus the editor after switching tabs
                    setTimeout(() => window.monacoEditor.instance.focus(), 50);
                    
                    // Validate the model to update error indicators
                    setTimeout(() => validateCurrentModel(), 100);
                    return;
                }
            }
            
            // Show loading indicator in editor
            if (!monacoInitialized) {
                const editorContainer = document.querySelector('.editor-container');
                if (editorContainer) {
                    const loadingEl = document.createElement('div');
                    loadingEl.className = 'editor-loading';
                    loadingEl.innerHTML = '<div class="spinner"></div><div>Loading file...</div>';
                    editorContainer.innerHTML = '';
                    editorContainer.appendChild(loadingEl);
                }
            } else {
                // Show loading in editor status bar or use Monaco's built-in loading indicator
                // This keeps the UI responsive while loading large files
            }
            
            // Get file content from the main process
            const result = await window.project.getFileContent(filePath);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to load file content');
            }
            
            // If Monaco is initialized, open the file in the editor
            if (monacoInitialized && window.monacoEditor) {
                window.monacoEditor.openFile(filePath, result.content, result.language);
                
                // Начинаем отслеживать изменения файла извне
                startWatchingExternalChanges();
                
                // Validate the model to update error indicators
                setTimeout(() => validateCurrentModel(), 200);
            } else {
                console.log('Monaco not ready, will open file when initialized');
            }
        } catch (error) {
            console.error('Error loading file content:', error);
            
            // Show error message in editor container
            if (!monacoInitialized) {
                const editorContainer = document.querySelector('.editor-container');
                if (editorContainer) {
                    editorContainer.innerHTML = `
                        <div class="editor-error">
                            <div>Failed to load file</div>
                            <div class="error-details">${error.message}</div>
                        </div>
                    `;
                }
            }
        }
    }

    // Настраиваем отслеживание внешних изменений в файлах
    function startWatchingExternalChanges() {
        // Убедимся, что не дублируем обработчики
        window.project.onFileChanged((event, { filePath, content }) => {
            console.log('File changed externally:', filePath);
            
            // Обновляем содержимое в редакторе
            if (monacoInitialized && window.monacoEditor) {
                window.monacoEditor.updateFileContent(filePath, content);
            }
        });
    }

    // Setup error detection for Monaco editor
    function setupErrorDetection() {
        if (!window.monacoEditor || !window.monacoEditor.monaco) {
            console.error('Monaco editor not available for error detection setup');
            return;
        }
        
        const monaco = window.monacoEditor.monaco;
        
        // Update status message to "Checking..." during validation
        updateStatusMessage('Checking...');
        
        // Create a timeout to avoid too frequent updates
        let checkTimeout = null;
        
        // Listen for model content changes
        window.monacoEditor.instance.onDidChangeModelContent(() => {
            // Clear any previous timeout
            if (checkTimeout) {
                clearTimeout(checkTimeout);
            }
            
            // Set status to checking
            updateStatusMessage('Checking...');
            
            // Setup timeout to check for errors after typing stops
            checkTimeout = setTimeout(() => {
                validateCurrentModel();
            }, 300); // 300ms delay before checking
        });
        
        // Listen for marker changes (Monaco's internal representation of errors/warnings)
        monaco.editor.onDidChangeMarkers(([uri]) => {
            if (!uri) return;
            
            const currentModel = window.monacoEditor.instance.getModel();
            if (!currentModel) return;
            
            // Only process markers for the current model
            if (currentModel.uri.toString() === uri.toString()) {
                processMarkers(uri);
            }
        });
        
        // Listen for model changes (when switching between files/tabs)
        window.monacoEditor.instance.onDidChangeModel(() => {
            // Ensure we validate the new model for errors
            validateCurrentModel();
        });
        
        // Initial validation of the current model
        validateCurrentModel();
    }

    // Validate the current model for errors/warnings
    function validateCurrentModel() {
        if (!window.monacoEditor || !window.monacoEditor.instance) return;
        
        const model = window.monacoEditor.instance.getModel();
        if (!model) {
            // No model, so no errors
            resetErrorsAndWarnings();
            return;
        }
        
        processMarkers(model.uri);
    }

    // Process markers (errors/warnings) for a given model URI
    function processMarkers(uri) {
        if (!window.monacoEditor || !window.monacoEditor.monaco) return;
        
        const monaco = window.monacoEditor.monaco;
        const markers = monaco.editor.getModelMarkers({ resource: uri });
        
        // Count errors and warnings
        let errors = 0;
        let warnings = 0;
        
        markers.forEach(marker => {
            if (marker.severity === monaco.MarkerSeverity.Error) {
                errors++;
            } else if (marker.severity === monaco.MarkerSeverity.Warning) {
                warnings++;
            }
        });
        
        // Update UI with new counts
        updateErrorsAndWarnings(errors, warnings);
        
        // Clear "Checking..." message if present
        if (statusMessage === 'Checking...') {
            updateStatusMessage('');
        }
    }

    // Update the error and warning counts in the UI
    function updateErrorsAndWarnings(errors, warnings) {
        errorCount = errors;
        warningCount = warnings;
        
        // Update the DOM elements
        const errorCountElement = document.querySelector('.error-count');
        const warningCountElement = document.querySelector('.warning-count');
        
        if (errorCountElement) {
            errorCountElement.textContent = errorCount;
        }
        
        if (warningCountElement) {
            warningCountElement.textContent = warningCount;
        }
        
        // Update the status indicator class
        const statusIndicator = document.querySelector('.status-indicators');
        if (statusIndicator) {
            if (errorCount === 0 && warningCount === 0) {
                statusIndicator.classList.add('has-no-issues');
            } else {
                statusIndicator.classList.remove('has-no-issues');
            }
        }
    }

    // Reset errors and warnings to zero
    function resetErrorsAndWarnings() {
        updateErrorsAndWarnings(0, 0);
    }

    // Update the status message
    function updateStatusMessage(message) {
        statusMessage = message;
        
        // Check if status message element exists, if not create it
        let statusMessageElement = document.querySelector('.status-message');
        
        if (!statusMessageElement) {
            // Create the status message element if it doesn't exist
            const downbarRight = document.querySelector('.downbar-left');
            
            if (downbarRight) {
                statusMessageElement = document.createElement('div');
                statusMessageElement.className = 'status-message';
                
                // Insert before the cursor position element
                const cursorPosition = downbarRight.querySelector('.cursor-position');
                if (cursorPosition) {
                    downbarRight.insertBefore(statusMessageElement, cursorPosition);
                } else {
                    downbarRight.appendChild(statusMessageElement);
                }
            }
        }
        
        // Update the message text
        if (statusMessageElement) {
            statusMessageElement.textContent = message;
        }
    }

    // Set up event listener to show error details when clicking on error indicators
    function setupErrorDetailsOnClick() {
        // Get the error and warning indicators
        const errorIndicator = document.querySelector('.error-icon');
        const warningIndicator = document.querySelector('.warning-icon');
        
        if (errorIndicator) {
            // Add tooltip
            errorIndicator.setAttribute('title', 'Click to see error details in a new tab');
            
            errorIndicator.addEventListener('click', () => {
                if (errorCount > 0) {
                    showErrorDetailsInNewTab(true);
                }
            });
        }
        
        if (warningIndicator) {
            // Add tooltip
            warningIndicator.setAttribute('title', 'Click to see warning details in a new tab');
            
            warningIndicator.addEventListener('click', () => {
                if (warningCount > 0) {
                    showErrorDetailsInNewTab(false);
                }
            });
        }
    }

    // Show error details in a new tab
    function showErrorDetailsInNewTab(showError = true) {
        if (!window.monacoEditor || !window.monacoEditor.monaco) return;
        
        const monaco = window.monacoEditor.monaco;
        const model = window.monacoEditor.instance.getModel();
        
        if (!model) return;
        
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        
        // Filter markers based on whether we want errors or warnings
        const filteredMarkers = markers.filter(marker => {
            if (showError) {
                return marker.severity === monaco.MarkerSeverity.Error;
            } else {
                return marker.severity === monaco.MarkerSeverity.Warning;
            }
        });
        
        if (filteredMarkers.length === 0) return;
        
        // Get info about the current file
        const activeModel = window.monacoEditor.instance.getModel();
        if (!activeModel) return;
        
        const originalUri = activeModel.uri;
        const originalFilePath = activeModel.uri.path;
        const fileExtension = originalFilePath.split('.').pop();
        const fileName = originalFilePath.split('/').pop();
        
        // Create a unique virtual tab ID (not a file path)
        const type = showError ? 'Error' : 'Warning';
        const tempFileName = `${type} Details - ${fileName}`;
        const virtualTabId = `virtual:${type.toLowerCase()}-details-${Date.now()}`;
        
        // Save original file's data for reference
        window.errorHandler.originalFiles.set(virtualTabId, {
            uri: originalUri,
            path: originalFilePath,
            fileName: fileName,
            markers: filteredMarkers
        });
        
        // Generate content for the error details tab
        let content = `// ${type}s in ${fileName}\n// Total: ${filteredMarkers.length}\n\n`;
        
        filteredMarkers.forEach((marker, index) => {
            const lineStart = marker.startLineNumber;
            const colStart = marker.startColumn;
            const lineEnd = marker.endLineNumber;
            const colEnd = marker.endColumn;
            
            // Get the code snippet where the error/warning occurred
            const lines = activeModel.getLinesContent();
            
            // Get a few lines before and after for context (if available)
            const contextBefore = 2;
            const contextAfter = 2;
            const startLine = Math.max(0, lineStart - 1 - contextBefore);
            const endLine = Math.min(lines.length - 1, lineEnd - 1 + contextAfter);
            
            const affectedLines = lines.slice(startLine, endLine + 1);
            
            content += `//=======================================================\n`;
            content += `// ${type} ${index + 1}: Line ${lineStart}, Column ${colStart}\n`;
            content += `// Message: ${marker.message}\n\n`;
            
            // Add line numbers to code snippet with clearer formatting
            const snippetWithLineNumbers = affectedLines.map((line, i) => {
                const lineNumber = startLine + i + 1;
                const isErrorLine = lineNumber >= lineStart && lineNumber <= lineEnd;
                // Highlight the error lines
                const prefix = isErrorLine ? '▶ ' : '  ';
                return `${prefix}${lineNumber.toString().padStart(4, ' ')} | ${line}`;
            }).join('\n');
            
            content += snippetWithLineNumbers + '\n\n';
            
            // Add a marker showing exactly where in the line the error is
            if (lineStart === lineEnd) {
                const targetLine = lineStart - startLine - 1;
                if (targetLine >= 0 && targetLine < affectedLines.length) {
                    // Add an arrow pointing to the exact error position
                    const pointerLine = '       ' + ' '.repeat(colStart) + 
                                       '^'.repeat(Math.max(1, colEnd - colStart));
                    content += pointerLine + '\n\n';
                }
            }
            
            content += `// Location: ${fileName}:${lineStart}:${colStart}\n`;
            content += `//=======================================================\n\n`;
        });
        
        // Create a virtual model for this content
        const virtualUri = monaco.Uri.parse(virtualTabId);
        let errorModel = monaco.editor.getModel(virtualUri);
        
        if (!errorModel) {
            errorModel = monaco.editor.createModel(
                content,
                getLanguageForExtension(fileExtension),
                virtualUri
            );
        } else {
            // Update existing model
            errorModel.setValue(content);
        }
        
        // Create a tab
        createVirtualTab(tempFileName, virtualTabId, showError ? 'error' : 'warning');
        
        // Store this tab in our error handler
        window.errorHandler.detailTabs.set(virtualTabId, {
            type: showError ? 'error' : 'warning',
            originalUri: originalUri,
            originalFile: originalFilePath
        });
        
        // Set the model for the editor
        window.monacoEditor.instance.setModel(errorModel);
        
        // Make it editable instead of read-only
        window.monacoEditor.instance.updateOptions({ readOnly: false });
    }
    
    // Create a virtual tab that's not tied to a real file
    function createVirtualTab(tabName, tabId, tabType) {
        const tabsContainer = document.querySelector('.tabs-container');
        
        // Create tab element
        const tab = document.createElement('div');
        tab.className = 'tab virtual-tab';
        if (tabType) {
            tab.classList.add(`virtual-${tabType}-tab`);
        }
        tab.setAttribute('data-virtual-id', tabId);
        
        tab.innerHTML = `
            <span class="tab-name">${tabName}</span>
            <button class="tab-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        // Add to tabs container
        tabsContainer.appendChild(tab);
        
        // Add to virtual tabs tracking - format similar to openTabs
        if (!window.virtualTabs) {
            window.virtualTabs = [];
        }
        window.virtualTabs.push({ name: tabName, id: tabId, type: tabType });
        
        // Add click event to tab
        tab.addEventListener('click', () => {
            activateVirtualTab(tabName, tabId);
        });
        
        // Add click event to close button
        const closeButton = tab.querySelector('.tab-close');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeVirtualTab(tabName, tabId);
        });
        
        // Activate the new tab
        activateVirtualTab(tabName, tabId);
        
        // Scroll to the new tab
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Activate a virtual tab
    function activateVirtualTab(tabName, tabId) {
        // Deactivate current active tab (regular or virtual)
        if (activeTab) {
            // First try to find a regular tab
            let currentTab = document.querySelector(`.tab[data-path="${activeTab.path}"]`);
            // If not found, try to find a virtual tab
            if (!currentTab) {
                currentTab = document.querySelector(`.tab[data-virtual-id="${activeTab.id}"]`);
            }
            
            if (currentTab) {
                currentTab.classList.remove('active');
            }
        }
        
        // Activate new virtual tab
        const newTab = document.querySelector(`.tab[data-virtual-id="${tabId}"]`);
        if (newTab) {
            newTab.classList.add('active');
            // Use id field to distinguish virtual tabs from real files
            activeTab = { name: tabName, id: tabId };
            
            // Update breadcrumb to show it's a virtual tab
            updateVirtualTabBreadcrumb(tabName, tabId);
            
            // Apply the correct model to editor
            if (tabId.startsWith('virtual:')) {
                const monaco = window.monacoEditor.monaco;
                const model = monaco.editor.getModel(monaco.Uri.parse(tabId));
                if (model) {
                    window.monacoEditor.instance.setModel(model);
                    
                    // Force validation to update error counts
                    setTimeout(() => validateCurrentModel(), 100);
                }
            }
        }
    }
    
    // Close a virtual tab
    function closeVirtualTab(tabName, tabId) {
        // Remove from virtual tabs array
        if (window.virtualTabs) {
            const tabIndex = window.virtualTabs.findIndex(tab => tab.id === tabId);
            if (tabIndex !== -1) {
                window.virtualTabs.splice(tabIndex, 1);
            }
        }
        
        // Remove from DOM
        const tab = document.querySelector(`.tab[data-virtual-id="${tabId}"]`);
        if (tab) {
            tab.remove();
        }
        
        // If it's an error/warning details tab, clean up
        if (window.errorHandler.detailTabs.has(tabId)) {
            // Get original file info
            const tabInfo = window.errorHandler.detailTabs.get(tabId);
            
            // Delete this tab info
            window.errorHandler.detailTabs.delete(tabId);
            window.errorHandler.originalFiles.delete(tabId);
            
            // Delete the model
            const monaco = window.monacoEditor.monaco;
            const model = monaco.editor.getModel(monaco.Uri.parse(tabId));
            if (model) {
                model.dispose();
            }
        }
        
        // If the closed tab was the active one, activate another tab
        if (activeTab && activeTab.id === tabId) {
            // Try to find next tab to activate
            if (window.virtualTabs && window.virtualTabs.length > 0) {
                const virtualTab = window.virtualTabs[window.virtualTabs.length - 1];
                activateVirtualTab(virtualTab.name, virtualTab.id);
            } else if (openTabs.length > 0) {
                const realTab = openTabs[openTabs.length - 1];
                activateTab(realTab.name, realTab.path);
            } else {
                // No tabs left
                activeTab = null;
                updateFileBreadcrumb(null);
            }
        }
    }
    
    // Update breadcrumb for virtual tabs
    function updateVirtualTabBreadcrumb(tabName, tabId) {
        const breadcrumbFilePathElement = document.querySelector('.file-path');
        const breadcrumbContextElement = document.querySelector('.context-info');
        
        if (breadcrumbFilePathElement && breadcrumbContextElement) {
            breadcrumbFilePathElement.textContent = tabName;
            
            // For error/warning tabs, show additional context
            if (window.errorHandler.detailTabs.has(tabId)) {
                const tabInfo = window.errorHandler.detailTabs.get(tabId);
                breadcrumbContextElement.textContent = tabInfo.type === 'error' ? 'Error Report' : 'Warning Report';
            } else {
                breadcrumbContextElement.textContent = 'Virtual Document';
            }
            
            // Store tab ID as data attribute
            breadcrumbFilePathElement.setAttribute('data-virtual-id', tabId);
        }
    }

    // Helper function to get language ID from file extension
    function getLanguageForExtension(extension) {
        const extensionMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'rb': 'ruby',
            'rs': 'rust',
            'go': 'go',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp'
        };
        
        return extensionMap[extension] || 'plaintext';
    }
    
    // Show the first error or warning and update status message
    function showFirstErrorOrWarning(showError = true) {
        if (!window.monacoEditor || !window.monacoEditor.monaco) return;
        
        const monaco = window.monacoEditor.monaco;
        const model = window.monacoEditor.instance.getModel();
        
        if (!model) return;
        
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        
        // Filter markers based on whether we want errors or warnings
        const filteredMarkers = markers.filter(marker => {
            if (showError) {
                return marker.severity === monaco.MarkerSeverity.Error;
            } else {
                return marker.severity === monaco.MarkerSeverity.Warning;
            }
        });
        
        if (filteredMarkers.length === 0) return;
        
        // Get the first error/warning
        const firstMarker = filteredMarkers[0];
        
        // Jump to the position of the error/warning
        window.monacoEditor.instance.revealPositionInCenter({
            lineNumber: firstMarker.startLineNumber,
            column: firstMarker.startColumn
        });
        
        // Set the cursor at the position
        window.monacoEditor.instance.setPosition({
            lineNumber: firstMarker.startLineNumber,
            column: firstMarker.startColumn
        });
        
        // Focus the editor
        window.monacoEditor.instance.focus();
        
        // Update status message with error details
        const type = showError ? 'Error' : 'Warning';
        updateStatusMessage(`${type}: ${firstMarker.message}`);
    }

    // Setup click handler for errors in the editor
    function setupEditorErrorClickHandler() {
        if (!window.monacoEditor || !window.monacoEditor.instance) return;
        
        const editor = window.monacoEditor.instance;
        const monaco = window.monacoEditor.monaco;
        
        // Listen for mouse clicks in the editor
        editor.onMouseDown((e) => {
            // Get the position where the user clicked
            const position = e.target.position;
            if (!position) return;
            
            // Get all markers at the current position
            const model = editor.getModel();
            if (!model) return;
            
            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
            const markersAtPosition = markers.filter(marker => {
                return position.lineNumber >= marker.startLineNumber &&
                       position.lineNumber <= marker.endLineNumber &&
                       position.column >= marker.startColumn &&
                       position.column <= marker.endColumn;
            });
            
            // If there are markers at this position, show error details
            if (markersAtPosition.length > 0) {
                const marker = markersAtPosition[0];
                const isError = marker.severity === monaco.MarkerSeverity.Error;
                
                // Show status message with error details
                const type = isError ? 'Error' : 'Warning';
                updateStatusMessage(`${type}: ${marker.message}`);
            }
        });
    }
}); 


