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
    
    // Initialize tabs
    initializeTabEvents();
    
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
        initializeFileTree(projectPath);
        
        // Update window title
        document.title = `${projectName || 'Untitled Project'} - Z`;
        
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
            
        } catch (error) {
            console.error('Error initializing file tree:', error);
            sidebar.innerHTML = `<div class="sidebar-error">Error loading files: ${error.message}</div>`;
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
        // Here you would normally load the file contents
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
        
        // Deactivate current active tab
        if (activeTab) {
            const currentTab = document.querySelector(`.tab[data-path="${activeTab.path}"]`);
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
            
            // Load file content (if needed)
            // loadFileContent(filePath);
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
        const breadcrumb = document.querySelector('.file-breadcrumb');
        if (!breadcrumb) return;
        
        if (!filePath) {
            breadcrumb.innerHTML = '';
            return;
        }
        
        // Get file extension for context info
        const fileExt = filePath.split('.').pop().toLowerCase();
        let contextInfo = fileExt;
        
        // You could enhance this to show more specific context
        // For example, detecting classes/methods in code files
        
        // Get relative path from project root
        let relativePath = filePath;
        if (currentProjectPath && filePath.startsWith(currentProjectPath)) {
            relativePath = filePath.substring(currentProjectPath.length + 1);
        }
        
        // Update breadcrumb elements
        breadcrumb.innerHTML = `
            <span class="file-path">${relativePath}</span>
            <span class="breadcrumb-separator">›</span>
            <span class="context-info">${contextInfo}</span>
        `;
    }
}); 


