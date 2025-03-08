/**
 * Monaco Editor initialization with Rust language support
 */

let editor = null;
let currentModel = null;
let currentDecorations = [];
let editorContainer = null;
let monaco = null;
let modelCache = new Map(); // Кэш для моделей файлов

// Theme configuration for the editor
const themes = {
    light: {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '#0068bf' },
            { token: 'string', foreground: '#b01717' },
            { token: 'number', foreground: '#006400' },
            { token: 'comment', foreground: '#707070', fontStyle: 'italic' },
            { token: 'type', foreground: '#267f99' },
            { token: 'identifier', foreground: '#000000' },
            { token: 'function', foreground: '#795e26' },
            { token: 'macro', foreground: '#af00db' }
        ],
        colors: {
            'editor.foreground': '#000000',
            'editor.background': '#ffffff',
            'editor.lineHighlightBackground': '#f0f0f0',
            'editorCursor.foreground': '#000000',
            'editor.selectionBackground': '#b9d7fb'
        }
    },
    dark: {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '#569cd6' },
            { token: 'string', foreground: '#ce9178' },
            { token: 'number', foreground: '#b5cea8' },
            { token: 'comment', foreground: '#6a9955', fontStyle: 'italic' },
            { token: 'type', foreground: '#4ec9b0' },
            { token: 'identifier', foreground: '#9cdcfe' },
            { token: 'function', foreground: '#dcdcaa' },
            { token: 'macro', foreground: '#c586c0' }
        ],
        colors: {
            'editor.foreground': '#d4d4d4',
            'editor.background': '#1e1e1e',
            'editor.lineHighlightBackground': '#282828',
            'editorCursor.foreground': '#ffffff',
            'editor.selectionBackground': '#264f78'
        }
    }
};

// Map для отслеживания состояния моделей файлов
const modifiedFiles = new Map();
// Map для хранения оригинального содержимого файлов
const originalFileContents = new Map();

/**
 * Initialize Monaco Editor
 */
function initMonaco() {
    return new Promise((resolve, reject) => {
        editorContainer = document.querySelector('.editor-container');
        
        if (!editorContainer) {
            return reject(new Error('Editor container not found'));
        }
        
        // Clear any placeholders
        editorContainer.innerHTML = '';
        
        // Create a div for the editor
        const editorDiv = document.createElement('div');
        editorDiv.id = 'monaco-editor';
        editorDiv.style.width = '100%';
        editorDiv.style.height = '100%';
        editorContainer.appendChild(editorDiv);
        
        // Определим переменные для начального замера производительности
        const startTime = performance.now();
        
        // Initialize loader with оптимизированной конфигурацией
        require.config({
            paths: { 'vs': 'monaco-editor/vs' }
        });
        
        // Устанавливаем языковую конфигурацию отдельно
        window.MonacoEnvironment = {
            getWorkerUrl: function() {
                return './monaco-editor/vs/base/worker/workerMain.js';
            }
        };
        
        // Загружаем только необходимые модули
        require(['vs/editor/editor.main'], function() {
            monaco = window.monaco;
            
            // Performance metrics
            const loadTime = performance.now() - startTime;
            console.log(`Monaco loaded in ${loadTime.toFixed(2)}ms`);
            
            // Register custom themes
            monaco.editor.defineTheme('z-light', themes.light);
            monaco.editor.defineTheme('z-dark', themes.dark);
            
            // Create editor instance with optimized settings
            editor = monaco.editor.create(editorDiv, {
                automaticLayout: true,
                fontSize: 14,
                fontFamily: "'Zed Mono', Consolas, 'Courier New', monospace",
                minimap: {
                    enabled: true,
                    maxColumn: 100, // Ограничиваем для производительности
                    renderCharacters: false // Отключаем рендер символов для повышения производительности
                },
                scrollBeyondLastLine: false,
                roundedSelection: true,
                renderIndentGuides: true,
                renderLineHighlight: 'all',
                scrollbar: {
                    useShadows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    alwaysConsumeMouseWheel: false // Улучшает прокрутку
                },
                theme: 'z-light',
                // Оптимизация производительности
                renderWhitespace: 'selection', // Отображаем пробелы только в выделении
                renderControlCharacters: false,
                renderFinalNewline: false,
                copyWithSyntaxHighlighting: true,
                // Улучшения для кода
                autoIndent: 'full',
                formatOnPaste: true,
                formatOnType: true,
                // Rust оптимизации
                wordBasedSuggestions: true,
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                },
                acceptSuggestionOnCommitCharacter: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                // Редко используемые функции отключены для оптимизации
                colorDecorators: false,
                hover: {
                    enabled: true,
                    delay: 300, // Задержка для предотвращения излишней активности
                    sticky: true
                },
                // Оптимизация памяти
                bracketPairColorization: {
                    enabled: true,
                    independentColorPoolPerBracketType: false
                },
                guides: {
                    bracketPairs: true,
                    indentation: true
                }
            });
            
            // Отслеживание изменений в редакторе для обновления состояния файла
            setupFileChangeTracking();
            
            // Добавляем горячие клавиши
            setupKeyboardShortcuts();
            
            // Отключаем некоторые тяжелые для процессора функции при работе с большими файлами
            editor.onDidChangeModel(e => {
                if (e.newModelUrl) {
                    const lineCount = editor.getModel().getLineCount();
                    if (lineCount > 5000) {
                        // Для очень больших файлов отключаем некоторые возможности
                        editor.updateOptions({
                            minimap: { enabled: false },
                            renderLineHighlight: 'none',
                            folding: false,
                            bracketPairColorization: { enabled: false },
                            guides: { indentation: false, bracketPairs: false }
                        });
                    }
                }
            });
            
            // Определение содержимого мусора для уменьшения утечек памяти
            window.addEventListener('beforeunload', () => {
                if (editor) {
                    editor.dispose();
                }
                monaco.editor.getModels().forEach(model => model.dispose());
            });
            
            // Register Rust language configuration
            registerRustLanguage();
            
            // Set editor ready
            window.monacoEditor = {
                instance: editor,
                monaco: monaco,
                openFile: openFile,
                saveFile: saveFile,
                setTheme: setTheme,
                updateFileContent: updateFileContent,
                dispose: () => {
                    editor.dispose();
                    monaco.editor.getModels().forEach(model => model.dispose());
                    modelCache.clear();
                }
            };
            
            resolve();
        });
    });
}

/**
 * Register Rust language configuration and syntax highlighting
 */
function registerRustLanguage() {
    // Rust language configuration
    monaco.languages.setLanguageConfiguration('rust', {
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"', notIn: ['string'] },
            { open: '\'', close: '\'', notIn: ['string', 'comment'] },
            { open: '/*', close: ' */', notIn: ['string'] }
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '\'', close: '\'' }
        ],
        folding: {
            markers: {
                start: /^\s*#\s*region\b/,
                end: /^\s*#\s*endregion\b/
            }
        },
        // Оптимизированное автоформатирование
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        indentationRules: {
            increaseIndentPattern: /^\s*({|\(|if|while|for|loop|match|else|impl|fn|struct|enum|trait|pub|unsafe|let|async).*$/,
            decreaseIndentPattern: /^\s*(\}|\)).*$/
        },
        onEnterRules: [
            {
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                afterText: /^\s*\*\/$/,
                action: {
                    indentAction: monaco.languages.IndentAction.IndentOutdent,
                    appendText: ' * '
                }
            },
            {
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                action: {
                    indentAction: monaco.languages.IndentAction.None,
                    appendText: ' * '
                }
            },
            {
                beforeText: /^(\t|[ ])*[ ]\*([ ]([^\*]|\*(?!\/))*)?$/,
                action: {
                    indentAction: monaco.languages.IndentAction.None,
                    appendText: '* '
                }
            },
            {
                beforeText: /^(\t|[ ])*[ ]\*\/\s*$/,
                action: {
                    indentAction: monaco.languages.IndentAction.None,
                    removeText: 1
                }
            },
            // Автоматический отступ после фигурных скобок
            {
                beforeText: /^\s*\{\s*$/,
                action: {
                    indentAction: monaco.languages.IndentAction.Indent
                }
            }
        ]
    });

    // Rust token provider for syntax highlighting с улучшенной поддержкой новых версий Rust
    monaco.languages.setMonarchTokensProvider('rust', {
        defaultToken: 'invalid',
        tokenPostfix: '.rust',

        keywords: [
            'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
            'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
            'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
            'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
            'unsafe', 'use', 'where', 'while', 'yield', 'try', 'union'
        ],

        typeKeywords: [
            'bool', 'char', 'f32', 'f64', 'i8', 'i16', 'i32', 'i64', 'i128',
            'isize', 'str', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'Vec',
            'String', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell',
            'HashMap', 'BTreeMap', 'VecDeque', 'LinkedList'
        ],

        constants: [
            'Some', 'None', 'Ok', 'Err', 'true', 'false', 'Empty'
        ],

        operators: [
            '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
            '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
            '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
            '%=', '<<=', '>>=', '>>>='
        ],

        symbols: /[=><!~?:&|+\-*\/\^%]+/,

        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u\{[0-9A-Fa-f]{1,6}\}|U[0-9A-Fa-f]{8})/,

        tokenizer: {
            root: [
                // Атрибуты и декораторы
                [/#\[.*\]/, 'attribute'],
                [/#!\[.*\]/, 'attribute'],
                
                // Lifetime annotations
                [/'[a-zA-Z_][a-zA-Z0-9_]*(?!')/, 'lifetime'],
                
                // Macros
                [/\b[a-z_][a-z0-9_]*!/, 'macro'],
                
                // Identifiers
                [/\b([A-Z][a-zA-Z0-9_]*)(?:\b|\s*::)/, {
                    cases: {
                        '@constants': 'constant',
                        '@default': 'type.identifier'
                    }
                }],
                
                [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, {
                    cases: {
                        '@typeKeywords': 'type',
                        '@keywords': 'keyword',
                        '@constants': 'constant',
                        '@default': 'identifier'
                    }
                }],
                
                // Whitespace
                { include: '@whitespace' },

                // Delimiters and operators
                [/[{}()\[\]]/, '@brackets'],
                [/[<>](?!@symbols)/, '@brackets'],
                [/@symbols/, {
                    cases: {
                        '@operators': 'operator',
                        '@default': ''
                    }
                }],

                // Формат номеров с улучшенной поддержкой разделителей
                [/\b\d[\d_]*(?:u|i|f)(?:8|16|32|64|128|size)?\b/, 'number.float'],
                [/\b0x[\da-fA-F][\da-fA-F_]*(?:u|i)(?:8|16|32|64|128|size)?\b/, 'number.hex'],
                [/\b0o[0-7][0-7_]*(?:u|i)(?:8|16|32|64|128|size)?\b/, 'number.octal'],
                [/\b0b[01][01_]*(?:u|i)(?:8|16|32|64|128|size)?\b/, 'number.binary'],
                [/\b\d[\d_]*\.\d[\d_]*(?:[eE][\-+]?\d[\d_]*)?\b/, 'number.float'],
                [/\b\d[\d_]*(?:[eE][\-+]?\d[\d_]*)?\b/, 'number'],
                [/\b\d[\d_]*\b/, 'number'],

                // Raw strings
                [/r#*"/, { token: 'string.quote', bracket: '@open', next: '@rawstring' }],
                
                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

                // Character literals
                [/'[^']*'/, 'string'],
                [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
                [/'/, 'string.invalid']
            ],

            comment: [
                [/[^\/*]+/, 'comment'],
                [/\/\*/, 'comment', '@push'],
                ["\\*/", 'comment', '@pop'],
                [/[\/*]/, 'comment']
            ],

            string: [
                [/[^\\"]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
            
            // Raw strings (improved for Rust r#"..."# syntax)
            rawstring: [
                [/[^"]+/, 'string'],
                [/"#*/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],

            whitespace: [
                [/[ \t\r\n]+/, 'white'],
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment']
            ]
        }
    });
    
    // Добавление автокомплита для Rust
    monaco.languages.registerCompletionItemProvider('rust', {
        provideCompletionItems: (model, position) => {
            const rustSnippets = [
                {
                    label: 'fn',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t${0}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Function definition'
                },
                {
                    label: 'struct',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Structure definition'
                },
                {
                    label: 'impl',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'impl ${1:Type} {\n\t${0}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Implementation block'
                },
                {
                    label: 'enum',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'enum ${1:Name} {\n\t${2:Variant},\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Enumeration definition'
                },
                {
                    label: 'match',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'match ${1:expression} {\n\t${2:pattern} => ${3:expression},\n\t_ => ${0},\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Match expression'
                },
                {
                    label: 'trait',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'trait ${1:Name} {\n\t${0}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Trait definition'
                },
                {
                    label: 'loop',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'loop {\n\t${0}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Infinite loop'
                },
                {
                    label: 'if let',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'if let ${1:pattern} = ${2:expression} {\n\t${0}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'If let expression'
                }
            ];
            
            // Возвращаем предложения автодополнения
            return {
                suggestions: rustSnippets
            };
        }
    });
}

/**
 * Преобразует URI или путь Monaco в правильный системный путь
 * @param {string} path - Путь или URI для преобразования
 * @returns {string} - Правильный системный путь
 */
function normalizePath(path) {
    if (!path) return path;
    
    // Если путь - это URI объект
    if (typeof path === 'object' && path.scheme === 'file') {
        path = path.fsPath || path.path;
    }
    
    // Преобразуем к строке и нормализуем слеши
    path = String(path).replace(/\\/g, '/');
    
    // Исправляем пути Windows, которые начинаются с /C:/ -> C:/
    if (path.match(/^\/[a-zA-Z]:/)) {
        path = path.substring(1);
    }
    
    // Убираем любой префикс file:///
    path = path.replace(/^file:\/\/\/?/, '');
    
    // Исправляем URI-кодированные символы
    try {
        path = decodeURIComponent(path);
    } catch (e) {
        // Игнорируем ошибки декодирования
    }
    
    return path;
}

/**
 * Open a file in the editor
 * @param {string} filePath - The path to the file
 * @param {string} content - The file content
 * @param {string} language - The language identifier
 */
function openFile(filePath, content, language) {
    if (!editor || !monaco) {
        console.error('Monaco editor not initialized');
        return;
    }

    // Normalize the path properly
    filePath = normalizePath(filePath);
    const cacheKey = `model-${filePath}`;
    
    // Запоминаем исходное содержимое файла
    originalFileContents.set(filePath, content);
    
    let model = null;
    
    // Проверяем кэш моделей
    if (modelCache.has(cacheKey)) {
        model = modelCache.get(cacheKey);
        // Обновляем содержимое, если модель существует
        model.setValue(content);
        
        // Сбрасываем флаг изменения при открытии файла
        modifiedFiles.delete(filePath);
        updateTabState(filePath, false);
    } else {
        // Проверим, существует ли уже модель
        const models = monaco.editor.getModels();
        for (const m of models) {
            const modelPath = normalizePath(m.uri);
            if (modelPath === filePath || 
                modelPath.endsWith(filePath) || 
                filePath.endsWith(modelPath)) {
                model = m;
                break;
            }
        }
        
        // Создаем новую модель, если не существует
        if (!model) {
            const uri = monaco.Uri.file(filePath);
            const languageToUse = language || 'plaintext';
            model = monaco.editor.createModel(content, languageToUse, uri);
            
            // Добавляем в кэш
            modelCache.set(cacheKey, model);
            
            // Оптимизируем крупные файлы
            if (content.length > 100000 || content.split('\n').length > 5000) {
                model.setEOL(0); // CRLF
                // Отключаем некоторые функции для больших файлов
                editor.updateOptions({
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    renderWhitespace: 'none',
                    renderIndentGuides: false,
                    renderLineHighlight: 'none'
                });
            } else {
                // Для обычных файлов включаем все возможности
                editor.updateOptions({
                    minimap: { enabled: true },
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    renderIndentGuides: true,
                    renderLineHighlight: 'all'
                });
            }
            
            // Настраиваем обработчик уничтожения модели для очистки кэша
            model.onWillDispose(() => {
                modelCache.delete(cacheKey);
                originalFileContents.delete(filePath);
            });
        }
    }
    
    // Устанавливаем модель в редактор
    editor.setModel(model);
    currentModel = model;
    
    // Настраиваем отслеживание курсора для breadcrumb (показывать текущий метод/функцию)
    setupCursorTracking(filePath, language);
    
    // Фокусировка редактора
    setTimeout(() => {
        editor.focus();
        // Устанавливаем курсор в начало файла
        editor.setPosition({ lineNumber: 1, column: 1 });
        // Выполняем прокрутку к началу
        editor.revealPosition({ lineNumber: 1, column: 1 });
    }, 50);
}

/**
 * Настройка отслеживания курсора для определения текущего метода/функции
 * @param {string} filePath - Путь к файлу
 * @param {string} language - Язык файла
 */
function setupCursorTracking(filePath, language) {
    // Отписываемся от предыдущих слушателей, если они были
    if (editor._cursorChangeSubscription) {
        editor._cursorChangeSubscription.dispose();
        editor._cursorChangeSubscription = null;
    }
    
    // Не настраиваем для не-Rust файлов или если это большой файл
    if (language !== 'rust' || editor.getModel().getLineCount() > 10000) {
        return;
    }
    
    // Подписываемся на изменения позиции курсора
    editor._cursorChangeSubscription = editor.onDidChangeCursorPosition((e) => {
        updateBreadcrumbWithContext(filePath, e.position);
    });
    
    // Обновляем сразу при загрузке
    const position = editor.getPosition();
    if (position) {
        updateBreadcrumbWithContext(filePath, position);
    }
}

/**
 * Обновление breadcrumb с текущим контекстом (метод/функция/класс)
 * @param {string} filePath - Путь к файлу
 * @param {object} position - Позиция курсора
 */
function updateBreadcrumbWithContext(filePath, position) {
    if (!editor || !editor.getModel()) return;
    
    const model = editor.getModel();
    const lineNumber = position.lineNumber;
    
    // Находим текущий контекст с иерархией
    const contextHierarchy = findContextHierarchy(model, lineNumber);
    
    // Обновляем breadcrumb
    const contextElement = document.querySelector('.context-info');
    if (contextElement && contextHierarchy && contextHierarchy.length > 0) {
        // Очищаем предыдущее содержимое
        contextElement.innerHTML = '';
        
        // Создаем цепочку контекстов
        contextHierarchy.forEach((context, index) => {
            // Добавляем разделитель между элементами
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '›';
                contextElement.appendChild(separator);
            }
            
            // Создаем подсвеченное представление контекста
            const syntaxSpan = document.createElement('span');
            syntaxSpan.className = 'syntax-highlighted';
            
            // Подсвечиваем ключевые слова Rust
            const keywords = ['pub', 'fn', 'struct', 'enum', 'trait', 'impl', 'async', 'unsafe', 'const'];
            const parts = context.split(' ');
            
            let html = '';
            parts.forEach((part, partIndex) => {
                if (keywords.includes(part)) {
                    html += `<span class="keyword">${part}</span>`;
                } else if (partIndex === parts.length - 1 && context.includes('fn ')) {
                    // Подсвечиваем имя функции/метода
                    html += `<span class="function">${part}</span>`;
                } else if (partIndex === parts.length - 1 && 
                          (context.includes('struct ') || context.includes('enum ') || 
                           context.includes('trait ') || context.includes('impl '))) {
                    // Подсвечиваем имя типа
                    html += `<span class="type">${part}</span>`;
                } else {
                    html += part;
                }
                
                // Добавляем пробел между частями
                if (partIndex < parts.length - 1) {
                    html += ' ';
                }
            });
            
            syntaxSpan.innerHTML = html;
            contextElement.appendChild(syntaxSpan);
        });
    } else if (contextElement) {
        // Если контекст не найден, отображаем расширение файла
        const extension = filePath.split('.').pop().toLowerCase();
        contextElement.textContent = extension;
    }
}

/**
 * Находит иерархию контекста (nested impl, fn, blocks) на основе позиции курсора
 * @param {object} model - Модель редактора
 * @param {number} lineNumber - Номер строки
 * @returns {string[]} - Массив контекстов от внешнего к внутреннему
 */
function findContextHierarchy(model, lineNumber) {
    // Проверяем модель
    if (!model) return [];
    
    // Всего строк в файле
    const totalLines = model.getLineCount();
    
    // Массив для хранения иерархии контекстов
    const contextHierarchy = [];
    
    // Паттерны для поиска определений в Rust
    const implPattern = /^\s*(pub\s+)?(impl)\s+([a-zA-Z0-9_]+)(?:\s*<.*>)?(?:\s+for\s+([a-zA-Z0-9_]+)(?:\s*<.*>)?)?/;
    const funcPattern = /^\s*(pub\s+)?(async\s+)?(unsafe\s+)?(fn\s+)([a-zA-Z0-9_]+)/;
    const structPattern = /^\s*(pub\s+)?(struct|enum|trait)\s+([a-zA-Z0-9_]+)/;
    const blockPattern = /^\s*([a-zA-Z0-9_]+)\s*\{/;
    
    // Стек для отслеживания уровней фигурных скобок и их контекстов
    const braceStack = [];
    let currBraceLevel = 0;
    
    // Сначала определим текущую вложенность фигурных скобок
    for (let i = 1; i <= lineNumber; i++) {
        const line = model.getLineContent(i);
        
        // Подсчитываем открывающие и закрывающие скобки
        for (const char of line) {
            if (char === '{') {
                currBraceLevel++;
                
                // Ищем контекст для этой открывающей скобки
                let contextLine = '';
                
                // Проверяем текущую строку на наличие контекста (impl, fn, struct и т.д.)
                if (i === lineNumber) {
                    contextLine = line;
                } else {
                    // Ищем предыдущую строку с контекстом
                    for (let j = i; j >= Math.max(1, i - 3); j--) {
                        const potentialContextLine = model.getLineContent(j);
                        if (implPattern.test(potentialContextLine) || 
                            funcPattern.test(potentialContextLine) || 
                            structPattern.test(potentialContextLine) ||
                            blockPattern.test(potentialContextLine)) {
                            contextLine = potentialContextLine;
                            break;
                        }
                    }
                }
                
                // Определяем тип контекста и добавляем в стек
                let context = null;
                
                // Проверяем impl
                const implMatch = contextLine.match(implPattern);
                if (implMatch) {
                    let implDef = '';
                    if (implMatch[1]) implDef += implMatch[1].trim() + ' '; // pub
                    implDef += 'impl ' + implMatch[3]; // impl Type
                    if (implMatch[4]) implDef += ' for ' + implMatch[4]; // for AnotherType
                    context = implDef;
                } else {
                    // Проверяем функцию
                    const funcMatch = contextLine.match(funcPattern);
                    if (funcMatch) {
                        let funcDef = '';
                        if (funcMatch[1]) funcDef += funcMatch[1].trim() + ' '; // pub
                        if (funcMatch[2]) funcDef += funcMatch[2].trim() + ' '; // async
                        if (funcMatch[3]) funcDef += funcMatch[3].trim() + ' '; // unsafe
                        funcDef += 'fn ' + funcMatch[5]; // fn name
                        context = funcDef;
                    } else {
                        // Проверяем структуру
                        const structMatch = contextLine.match(structPattern);
                        if (structMatch) {
                            let structDef = '';
                            if (structMatch[1]) structDef += structMatch[1].trim() + ' '; // pub
                            structDef += structMatch[2] + ' ' + structMatch[3]; // struct/enum/trait name
                            context = structDef;
                        } else {
                            // Проверяем другие блоки кода (например, User { ... })
                            const blockMatch = contextLine.match(blockPattern);
                            if (blockMatch) {
                                context = blockMatch[1];
                            }
                        }
                    }
                }
                
                // Добавляем в стек уровень скобки и его контекст
                braceStack.push({ level: currBraceLevel, context: context });
                
            } else if (char === '}') {
                // Уменьшаем уровень вложенности
                currBraceLevel--;
                
                // Удаляем из стека закрытые уровни
                while (braceStack.length > 0 && braceStack[braceStack.length - 1].level > currBraceLevel) {
                    braceStack.pop();
                }
            }
            
            // Если мы дошли до текущей строки, прерываем построение стека
            if (i === lineNumber && braceStack.length > 0) {
                break;
            }
        }
    }
    
    // Строим иерархию контекстов на основе стека
    for (const braceInfo of braceStack) {
        if (braceInfo.context) {
            contextHierarchy.push(braceInfo.context);
        }
    }
    
    return contextHierarchy;
}

/**
 * Set editor theme
 * @param {string} theme - Theme name ('light' or 'dark')
 */
function setTheme(theme) {
    if (!editor) return;
    
    const themeMap = {
        'light': 'z-light',
        'dark': 'z-dark'
    };
    
    editor.updateOptions({
        theme: themeMap[theme] || 'z-light'
    });
}

/**
 * Dispose of editor resources
 * Важно вызывать при закрытии вкладки или смене файла
 */
function disposeEditor() {
    if (editor) {
        // Сохранить курсорную позицию и состояние прокрутки
        const viewState = editor.saveViewState();
        
        // Сохраняем состояние в кэше моделей для текущей модели
        if (currentModel) {
            const uri = currentModel.uri.toString();
            const cacheKey = `viewstate-${uri}`;
            sessionStorage.setItem(cacheKey, JSON.stringify(viewState));
        }
    }
}

/**
 * Настройка горячих клавиш для редактора
 */
function setupKeyboardShortcuts() {
    // Добавляем горячую клавишу Ctrl+S для сохранения
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
        const model = editor.getModel();
        if (model) {
            const filePath = model.uri.path;
            if (filePath) {
                saveFile(filePath);
            }
        }
    });
}

/**
 * Настройка отслеживания изменений файла
 */
function setupFileChangeTracking() {
    // Отслеживаем изменения в редакторе
    editor.onDidChangeModelContent((event) => {
        const model = editor.getModel();
        if (model) {
            const filePath = normalizePath(model.uri);
            if (filePath) {
                // Получаем текущее содержимое модели
                const currentContent = model.getValue();
                // Получаем исходное содержимое файла
                const originalContent = originalFileContents.get(filePath);
                
                // Сравниваем текущее содержимое с исходным
                if (originalContent === currentContent) {
                    // Если содержимое вернулось к исходному, убираем индикатор изменений
                    console.log('File content reverted to original for:', filePath);
                    modifiedFiles.delete(filePath);
                    updateTabState(filePath, false);
                } else {
                    // Если содержимое отличается от исходного, добавляем индикатор изменений
                    console.log('File content modified for:', filePath);
                    modifiedFiles.set(filePath, true);
                    updateTabState(filePath, true);
                }
            }
        }
    });
}

/**
 * Обновляет состояние таба для отображения индикатора изменений
 * @param {string} filePath - Путь к файлу
 * @param {boolean} isModified - Флаг модификации
 */
function updateTabState(filePath, isModified) {
    // Нормализуем путь
    filePath = normalizePath(filePath);
    
    // Находим все табы, где может быть этот файл (с полным или частичным путем)
    const tabs = document.querySelectorAll('.tab');
    
    // Для каждого таба проверяем, относится ли он к нашему файлу
    tabs.forEach(tab => {
        const tabPath = tab.getAttribute('data-path');
        if (tabPath) {
            const normalizedTabPath = normalizePath(tabPath);
            
            // Проверяем соответствие путей
            if (normalizedTabPath === filePath || 
                normalizedTabPath.endsWith(filePath) || 
                filePath.endsWith(normalizedTabPath)) {
                
                console.log(`Updating tab state for ${tabPath} to isModified=${isModified}`);
                
                if (isModified) {
                    // Добавляем индикатор изменений, если его еще нет
                    if (!tab.querySelector('.tab-modified')) {
                        const indicator = document.createElement('span');
                        indicator.className = 'tab-modified';
                        
                        // Вставляем индикатор в начало таба (перед именем файла)
                        const tabName = tab.querySelector('.tab-name');
                        if (tabName) {
                            tab.insertBefore(indicator, tabName);
                        }
                    }
                } else {
                    // Удаляем индикатор изменений, если он есть
                    const indicator = tab.querySelector('.tab-modified');
                    if (indicator) {
                        indicator.remove();
                    }
                }
            }
        }
    });
}

/**
 * Сохраняет файл
 * @param {string} filePath - Путь к файлу (может быть неполным)
 */
function saveFile(filePath) {
    // Пытаемся получить полный путь из breadcrumb
    const breadcrumbFilePathElement = document.querySelector('.file-path');
    let fullPath = filePath;
    
    if (breadcrumbFilePathElement) {
        const storedFullPath = breadcrumbFilePathElement.getAttribute('data-full-path');
        if (storedFullPath) {
            fullPath = storedFullPath;
            console.log('Using full path from breadcrumb:', fullPath);
        }
    }
    
    // Нормализуем путь для использования
    fullPath = normalizePath(fullPath);
    
    // Если это все еще относительный путь, попробуем использовать текущий проект
    if (!fullPath.match(/^[a-zA-Z]:\//)) {
        // Получаем корневой путь проекта из window
        const projectPath = window.currentProjectPath || '';
        if (projectPath) {
            fullPath = normalizePath(projectPath + '/' + fullPath);
            console.log('Using full path with project root:', fullPath);
        }
    }
    
    // Получаем модель для этого файла
    let model;
    const models = monaco.editor.getModels();
    for (const m of models) {
        const modelPath = normalizePath(m.uri);
        if (modelPath === fullPath || 
            modelPath.endsWith(fullPath) || 
            fullPath.endsWith(modelPath) ||
            modelPath.includes(fullPath) ||
            fullPath.includes(modelPath)) {
            model = m;
            break;
        }
    }
    
    if (!model) {
        console.error('Model not found for file:', fullPath);
        return;
    }
    
    // Получаем содержимое
    const content = model.getValue();
    
    console.log('Saving file to:', fullPath);
    
    // Отправляем запрос на сохранение через IPC
    window.project.saveFile(fullPath, content)
        .then((result) => {
            if (result.success) {
                console.log('File saved successfully:', fullPath);
                
                // Обновляем исходное содержимое
                originalFileContents.set(fullPath, content);
                
                // Убираем индикатор изменений
                modifiedFiles.delete(fullPath);
                updateTabState(fullPath, false);
            } else {
                console.error('Error saving file:', result.error);
                alert(`Failed to save file: ${result.error}`);
            }
        })
        .catch((error) => {
            console.error('Error in saveFile IPC call:', error);
            alert(`Error saving file: ${error.message}`);
        });
}

/**
 * Обновляет содержимое файла, если он был изменен извне
 * @param {string} filePath - Путь к файлу
 * @param {string} content - Новое содержимое
 * @param {boolean} forceFocus - Принудительно установить фокус
 */
function updateFileContent(filePath, content, forceFocus = false) {
    // Нормализуем путь
    filePath = normalizePath(filePath);
    
    // Проверяем, есть ли несохраненные изменения
    const hasUnsavedChanges = modifiedFiles.has(filePath);
    
    // Получаем модель
    let model;
    const models = monaco.editor.getModels();
    for (const m of models) {
        const modelPath = normalizePath(m.uri);
        if (modelPath === filePath || 
            modelPath.endsWith(filePath) || 
            filePath.endsWith(modelPath)) {
            model = m;
            break;
        }
    }
    
    if (!model) {
        console.error('Model not found for file update:', filePath);
        return;
    }
    
    // Если есть несохраненные изменения, спрашиваем пользователя
    if (hasUnsavedChanges) {
        const userChoice = confirm(`File "${filePath.split(/[\/\\]/).pop()}" has been modified. Do you want to reload it?`);
        if (!userChoice) {
            return; // Пользователь отказался перезагружать файл
        }
    }
    
    // Сохраняем текущую позицию и выделение перед обновлением
    const currentPosition = editor.getPosition();
    const currentSelection = editor.getSelection();
    const isCurrentModel = editor.getModel() === model;
    
    // Обновляем содержимое
    model.setValue(content);
    
    // Сбрасываем индикатор изменений
    modifiedFiles.delete(filePath);
    updateTabState(filePath, false);
    
    // Если текущий файл открыт в редакторе, восстанавливаем позицию и выделение
    if (isCurrentModel || forceFocus) {
        setTimeout(() => {
            // Фокусируемся
            editor.focus();
            
            // Восстанавливаем позицию, если она была сохранена
            if (currentPosition) {
                // Проверяем, что позиция не выходит за пределы файла
                const lineCount = model.getLineCount();
                if (currentPosition.lineNumber <= lineCount) {
                    // Убедимся, что столбец тоже не выходит за пределы строки
                    const lineContent = model.getLineContent(currentPosition.lineNumber);
                    const column = Math.min(currentPosition.column, lineContent.length + 1);
                    
                    // Устанавливаем проверенную позицию
                    editor.setPosition({
                        lineNumber: currentPosition.lineNumber,
                        column: column
                    });
                    
                    // Восстанавливаем выделение, если оно было
                    if (currentSelection) {
                        editor.setSelection(currentSelection);
                    }
                    
                    // Прокручиваем к позиции
                    editor.revealPositionInCenter(currentPosition);
                }
            }
        }, 50);
    }
}

// Export the initialization function
window.initMonaco = initMonaco;
// Export the dispose function
window.disposeEditor = disposeEditor; 