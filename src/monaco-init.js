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
        inherit: false, // Отключаем наследование, чтобы полностью переопределить тему
        rules: [
            // Базовые токены с цветами, подходящими для Rust
            { token: 'keyword', foreground: '#D73A49' },       // Красно-оранжевый для ключевых слов (let, fn, pub)
            { token: 'keyword.control', foreground: '#D73A49' }, // Красно-оранжевый для управляющих конструкций (if, else, match)
            { token: 'keyword.control.conditional', foreground: '#D73A49' }, // Красно-оранжевый для if/else
            { token: 'keyword.control.loop', foreground: '#D73A49' }, // Красно-оранжевый для циклов
            { token: 'keyword.control.flow', foreground: '#D73A49' }, // Красно-оранжевый для flow control
            { token: 'keyword.operator', foreground: '#D73A49' }, // Красно-оранжевый для операторных ключевых слов
            { token: 'keyword.other', foreground: '#D73A49' }, // Красно-оранжевый для других ключевых слов
            { token: 'keyword.declaration', foreground: '#D73A49' }, // Красно-оранжевый для деклараций (fn, struct, etc)
            { token: 'keyword.unsafe', foreground: '#CB2431', fontStyle: 'bold' }, // Выделение для unsafe
            
            // Строки и символы
            { token: 'string', foreground: '#0A8744' },        // Зеленый для строк
            { token: 'string.quote', foreground: '#0A8744' },  // Зеленый для кавычек
            { token: 'string.raw', foreground: '#0A8744' },    // Зеленый для raw строк
            { token: 'string.escape', foreground: '#E36209' }, // Оранжевый для escape-последовательностей
            { token: 'character', foreground: '#0A8744' },     // Зеленый для символов
            { token: 'character.escape', foreground: '#E36209' }, // Оранжевый для escape в символах
            
            // Числа
            { token: 'number', foreground: '#005CC5' },        // Синий для чисел
            { token: 'number.float', foreground: '#005CC5' },  // Синий для чисел с плавающей запятой
            { token: 'number.hex', foreground: '#005CC5' },    // Синий для hex
            { token: 'number.octal', foreground: '#005CC5' },  // Синий для octal
            { token: 'number.binary', foreground: '#005CC5' }, // Синий для binary
            
            // Комментарии
            { token: 'comment', foreground: '#6A737D', fontStyle: 'italic' }, // Серый для комментариев
            { token: 'comment.doc', foreground: '#5C6370', fontStyle: 'italic' }, // Документационные комментарии
            { token: 'comment.line', foreground: '#6A737D', fontStyle: 'italic' }, // Однострочные комментарии
            { token: 'comment.block', foreground: '#6A737D', fontStyle: 'italic' }, // Многострочные комментарии
            { token: 'comment.doc.tag', foreground: '#85632E', fontStyle: 'italic' }, // Теги в документационных комментариях
            
            // Rust-специфичные токены с преобладанием "ржавого" цвета
            { token: 'type', foreground: '#6F42C1' },          // Фиолетовый для типов (i32, String)
            { token: 'type.builtin', foreground: '#6F42C1' },  // Фиолетовый для встроенных типов
            { token: 'type.identifier', foreground: '#6F42C1' }, // Фиолетовый для пользовательских типов
            { token: 'type.parameter', foreground: '#6F42C1' }, // Фиолетовый для параметров типа
            { token: 'type.primitive', foreground: '#6F42C1' }, // Фиолетовый для примитивных типов
            { token: 'struct', foreground: '#6F42C1' },        // Фиолетовый для структур
            { token: 'struct.field', foreground: '#24292E' },  // Темный для полей структур
            { token: 'enum', foreground: '#6F42C1' },          // Фиолетовый для перечислений
            { token: 'enum.variant', foreground: '#24292E' },  // Темный для вариантов enum
            { token: 'trait', foreground: '#6F42C1' },         // Фиолетовый для трейтов
            { token: 'interface', foreground: '#6F42C1' },     // Фиолетовый для интерфейсов
            { token: 'typeAlias', foreground: '#6F42C1' },     // Фиолетовый для type aliases
            
            // Идентификаторы, переменные и функции
            { token: 'identifier', foreground: '#24292E' },    // Темный для идентификаторов
            { token: 'variable', foreground: '#24292E' },      // Темный для переменных
            { token: 'variable.readonly', foreground: '#24292E' }, // Темный для неизменяемых переменных
            { token: 'variable.mutable', foreground: '#953800', fontStyle: 'italic' }, // Курсив для изменяемых переменных
            { token: 'variable.parameter', foreground: '#953800' }, // Темно-оранжевый для параметров
            { token: 'variable.other', foreground: '#24292E' }, // Темный для других переменных
            { token: 'function', foreground: '#005CC5' },      // Синий для функций
            { token: 'function.declaration', foreground: '#005CC5' }, // Синий для деклараций функций
            { token: 'function.call', foreground: '#005CC5' }, // Синий для вызовов функций
            { token: 'function.method', foreground: '#005CC5' }, // Синий для методов
            { token: 'function.method.call', foreground: '#005CC5' }, // Синий для вызовов методов
            { token: 'function.self', foreground: '#953800' }, // Темно-оранжевый для self
            { token: 'function.parameter', foreground: '#953800' }, // Темно-оранжевый для параметров функций
            
            // Макросы и процедурные макросы
            { token: 'function.macro', foreground: '#CB2431' }, // Красный для макросов
            { token: 'macro', foreground: '#CB2431' },         // Красный для макросов (альтернативный токен)
            { token: 'macro.attribute', foreground: '#CB2431' }, // Красный для атрибутивных макросов
            { token: 'macro.derive', foreground: '#CB2431' },  // Красный для derive макросов
            
            // Лайфтаймы и атрибуты
            { token: 'lifetime', foreground: '#D73A49' },      // Красно-оранжевый для lifetime параметров
            { token: 'lifetime.declaration', foreground: '#D73A49' }, // Красно-оранжевый для декларации лайфтаймов
            { token: 'attribute', foreground: '#0086B3' },     // Голубой для атрибутов
            { token: 'attribute.bracket', foreground: '#0086B3' }, // Голубой для скобок атрибутов
            { token: 'attribute.name', foreground: '#0086B3' }, // Голубой для имен атрибутов
            
            // Константы и статические переменные
            { token: 'constant', foreground: '#005CC5' },      // Синий для констант
            { token: 'constant.language', foreground: '#005CC5' }, // Синий для встроенных констант
            { token: 'constant.numeric', foreground: '#005CC5' }, // Синий для числовых констант
            { token: 'constant.character', foreground: '#0A8744' }, // Зеленый для символьных констант
            { token: 'constant.other', foreground: '#005CC5' }, // Синий для других констант
            { token: 'static', foreground: '#005CC5' },        // Синий для статических переменных
            
            // Операторы и разделители
            { token: 'operator', foreground: '#D73A49' },      // Красно-оранжевый для операторов
            { token: 'operator.assignment', foreground: '#D73A49' }, // Красно-оранжевый для операторов присваивания
            { token: 'operator.arithmetic', foreground: '#D73A49' }, // Красно-оранжевый для арифметических операторов
            { token: 'operator.logical', foreground: '#D73A49' }, // Красно-оранжевый для логических операторов
            { token: 'operator.comparison', foreground: '#D73A49' }, // Красно-оранжевый для операторов сравнения
            { token: 'operator.range', foreground: '#D73A49' }, // Красно-оранжевый для операторов диапазона
            { token: 'delimiter', foreground: '#24292E' },     // Темный для разделителей
            { token: 'delimiter.bracket', foreground: '#24292E' }, // Темный для скобок
            { token: 'delimiter.parenthesis', foreground: '#24292E' }, // Темный для круглых скобок
            { token: 'delimiter.square', foreground: '#24292E' }, // Темный для квадратных скобок
            { token: 'delimiter.angle', foreground: '#24292E' }, // Темный для угловых скобок
            { token: 'delimiter.curly', foreground: '#24292E' }, // Темный для фигурных скобок
            { token: 'punctuation', foreground: '#24292E' },    // Темный для пунктуации
            
            // Особые случаи и специфика Rust
            { token: 'custom-error', foreground: '#B31D28' },  // Ярко-красный для ошибок синтаксиса
            { token: 'invalid', foreground: '#B31D28' },       // Ярко-красный для недопустимого синтаксиса
            { token: 'regexp', foreground: '#032F62' },        // Темно-синий для регулярных выражений
            { token: 'storage', foreground: '#D73A49' },       // Красно-оранжевый для storage keywords
            { token: 'storage.type', foreground: '#D73A49' },  // Красно-оранжевый для типов хранения
            { token: 'storage.modifier', foreground: '#D73A49' }, // Красно-оранжевый для модификаторов хранения
            { token: 'annotation', foreground: '#CB2431' },    // Красный для аннотаций
            { token: 'modifier', foreground: '#D73A49' },      // Красно-оранжевый для модификаторов
            { token: 'entity.name.namespace', foreground: '#6F42C1' },  // Фиолетовый для пространств имен
            { token: 'entity.name.type', foreground: '#6F42C1' }, // Фиолетовый для имен типов
            { token: 'entity.name.function', foreground: '#005CC5' }, // Синий для имен функций
            { token: 'entity.name.tag', foreground: '#22863A' }, // Зеленый для тегов
            { token: 'entity.other.attribute-name', foreground: '#6F42C1' }, // Фиолетовый для имен атрибутов
            { token: 'meta.tag', foreground: '#22863A' },     // Зеленый для метатегов
            { token: 'meta.preprocessor', foreground: '#CB2431' }, // Красный для препроцессора
            { token: 'meta.preprocessor.string', foreground: '#0A8744' }, // Зеленый для строк препроцессора
            { token: 'meta.preprocessor.numeric', foreground: '#005CC5' }, // Синий для чисел препроцессора
            { token: 'meta.structure.tuple', foreground: '#24292E' }, // Темный для структуры кортежей
            { token: 'meta.parameter', foreground: '#953800' }, // Темно-оранжевый для параметров
            { token: 'meta.return-type', foreground: '#6F42C1' }, // Фиолетовый для возвращаемых типов
            { token: 'meta.impl', foreground: '#6F42C1' },    // Фиолетовый для impl блоков
            { token: 'meta.trait', foreground: '#6F42C1' },   // Фиолетовый для trait блоков
            { token: 'meta.directive', foreground: '#CB2431' }, // Красный для директив
            { token: 'meta.path', foreground: '#24292E' },    // Темный для путей
            { token: 'meta.use', foreground: '#D73A49' },     // Красно-оранжевый для use директив
        ],
        colors: {
            'editor.foreground': '#000000',
            'editor.background': '#ffffff',
            'editor.lineHighlightBackground': '#f0f0f0',
            'editorCursor.foreground': '#000000',
            'editor.selectionBackground': '#e3f2fd'
        }
    },
    dark: {
        base: 'vs-dark',
        inherit: false, // Отключаем наследование, чтобы полностью переопределить тему
        rules: [
            // Базовые токены с цветами, подходящими для Rust в темной теме
            { token: 'keyword', foreground: '#FF6B8B' },       // Яркий красно-розовый для ключевых слов (let, fn, pub)
            { token: 'keyword.control', foreground: '#FF6B8B' }, // Яркий красно-розовый для управляющих конструкций
            { token: 'keyword.control.conditional', foreground: '#FF6B8B' }, // Яркий красно-розовый для if/else
            { token: 'keyword.control.loop', foreground: '#FF6B8B' }, // Яркий красно-розовый для циклов
            { token: 'keyword.control.flow', foreground: '#FF6B8B' }, // Яркий красно-розовый для flow control
            { token: 'keyword.operator', foreground: '#FF6B8B' }, // Яркий красно-розовый для операторных ключевых слов
            { token: 'keyword.other', foreground: '#FF6B8B' }, // Яркий красно-розовый для других ключевых слов
            { token: 'keyword.declaration', foreground: '#FF6B8B' }, // Яркий красно-розовый для деклараций
            { token: 'keyword.unsafe', foreground: '#FF3333', fontStyle: 'bold' }, // Выделение для unsafe
            
            // Строки и символы
            { token: 'string', foreground: '#7EEAB4' },        // Яркий зеленый для строк
            { token: 'string.quote', foreground: '#7EEAB4' },  // Яркий зеленый для кавычек
            { token: 'string.raw', foreground: '#7EEAB4' },    // Яркий зеленый для raw строк
            { token: 'string.escape', foreground: '#FFAB70' }, // Оранжевый для escape-последовательностей
            { token: 'character', foreground: '#7EEAB4' },     // Яркий зеленый для символов
            { token: 'character.escape', foreground: '#FFAB70' }, // Оранжевый для escape в символах
            
            // Числа
            { token: 'number', foreground: '#79B8FF' },        // Яркий синий для чисел
            { token: 'number.float', foreground: '#79B8FF' },  // Яркий синий для чисел с плавающей запятой
            { token: 'number.hex', foreground: '#79B8FF' },    // Яркий синий для hex
            { token: 'number.octal', foreground: '#79B8FF' },  // Яркий синий для octal
            { token: 'number.binary', foreground: '#79B8FF' }, // Яркий синий для binary
            
            // Комментарии
            { token: 'comment', foreground: '#8B949E', fontStyle: 'italic' }, // Серый для комментариев
            { token: 'comment.doc', foreground: '#959DA5', fontStyle: 'italic' }, // Документационные комментарии
            { token: 'comment.line', foreground: '#8B949E', fontStyle: 'italic' }, // Однострочные комментарии
            { token: 'comment.block', foreground: '#8B949E', fontStyle: 'italic' }, // Многострочные комментарии
            { token: 'comment.doc.tag', foreground: '#FFDF9E', fontStyle: 'italic' }, // Теги в док. комментариях - светло-янтарный
            
            // Rust-специфичные токены в темной теме
            { token: 'type', foreground: '#D2A8FF' },          // Светло-фиолетовый для типов
            { token: 'type.builtin', foreground: '#D2A8FF' },  // Светло-фиолетовый для встроенных типов
            { token: 'type.identifier', foreground: '#D2A8FF' }, // Светло-фиолетовый для пользовательских типов
            { token: 'type.parameter', foreground: '#D2A8FF' }, // Светло-фиолетовый для параметров типа
            { token: 'type.primitive', foreground: '#D2A8FF' }, // Светло-фиолетовый для примитивных типов
            { token: 'struct', foreground: '#D2A8FF' },        // Светло-фиолетовый для структур
            { token: 'struct.field', foreground: '#E1E4E8' },  // Светлый для полей структур
            { token: 'enum', foreground: '#D2A8FF' },          // Светло-фиолетовый для перечислений
            { token: 'enum.variant', foreground: '#E1E4E8' },  // Светлый для вариантов enum
            { token: 'trait', foreground: '#D2A8FF' },         // Светло-фиолетовый для трейтов
            { token: 'interface', foreground: '#D2A8FF' },     // Светло-фиолетовый для интерфейсов
            { token: 'typeAlias', foreground: '#D2A8FF' },     // Светло-фиолетовый для type aliases
            
            // Идентификаторы, переменные и функции
            { token: 'identifier', foreground: '#E1E4E8' },    // Светлый для идентификаторов
            { token: 'variable', foreground: '#E1E4E8' },      // Светлый для переменных
            { token: 'variable.readonly', foreground: '#E1E4E8' }, // Светлый для неизменяемых переменных
            { token: 'variable.mutable', foreground: '#FFAB70', fontStyle: 'italic' }, // Курсив для изменяемых переменных, оранжевый
            { token: 'variable.parameter', foreground: '#FFAB70' }, // Оранжевый для параметров
            { token: 'variable.other', foreground: '#E1E4E8' }, // Светлый для других переменных
            { token: 'function', foreground: '#79B8FF' },      // Яркий синий для функций
            { token: 'function.declaration', foreground: '#79B8FF' }, // Яркий синий для деклараций функций
            { token: 'function.call', foreground: '#79B8FF' }, // Яркий синий для вызовов функций
            { token: 'function.method', foreground: '#79B8FF' }, // Яркий синий для методов
            { token: 'function.method.call', foreground: '#79B8FF' }, // Яркий синий для вызовов методов
            { token: 'function.self', foreground: '#FFAB70' }, // Оранжевый для self
            { token: 'function.parameter', foreground: '#FFAB70' }, // Оранжевый для параметров функций
            
            // Макросы и процедурные макросы
            { token: 'function.macro', foreground: '#FF6B8B' }, // Яркий красно-розовый для макросов
            { token: 'macro', foreground: '#FF6B8B' },         // Яркий красно-розовый для макросов
            { token: 'macro.attribute', foreground: '#FF6B8B' }, // Яркий красно-розовый для атрибутивных макросов
            { token: 'macro.derive', foreground: '#FF6B8B' },  // Яркий красно-розовый для derive макросов
            
            // Лайфтаймы и атрибуты
            { token: 'lifetime', foreground: '#FF6B8B' },      // Яркий красно-розовый для lifetime параметров
            { token: 'lifetime.declaration', foreground: '#FF6B8B' }, // Яркий красно-розовый для декларации лайфтаймов
            { token: 'attribute', foreground: '#56D4DD' },     // Бирюзовый для атрибутов
            { token: 'attribute.bracket', foreground: '#56D4DD' }, // Бирюзовый для скобок атрибутов
            { token: 'attribute.name', foreground: '#56D4DD' }, // Бирюзовый для имен атрибутов
            
            // Константы и статические переменные
            { token: 'constant', foreground: '#79B8FF' },      // Яркий синий для констант
            { token: 'constant.language', foreground: '#79B8FF' }, // Яркий синий для встроенных констант
            { token: 'constant.numeric', foreground: '#79B8FF' }, // Яркий синий для числовых констант
            { token: 'constant.character', foreground: '#7EEAB4' }, // Яркий зеленый для символьных констант
            { token: 'constant.other', foreground: '#79B8FF' }, // Яркий синий для других констант
            { token: 'static', foreground: '#79B8FF' },        // Яркий синий для статических переменных
            
            // Операторы и разделители
            { token: 'operator', foreground: '#FF6B8B' },      // Яркий красно-розовый для операторов
            { token: 'operator.assignment', foreground: '#FF6B8B' }, // Яркий красно-розовый для операторов присваивания
            { token: 'operator.arithmetic', foreground: '#FF6B8B' }, // Яркий красно-розовый для арифметических операторов
            { token: 'operator.logical', foreground: '#FF6B8B' }, // Яркий красно-розовый для логических операторов
            { token: 'operator.comparison', foreground: '#FF6B8B' }, // Яркий красно-розовый для операторов сравнения
            { token: 'operator.range', foreground: '#FF6B8B' }, // Яркий красно-розовый для операторов диапазона
            { token: 'delimiter', foreground: '#E1E4E8' },     // Светлый для разделителей
            { token: 'delimiter.bracket', foreground: '#E1E4E8' }, // Светлый для скобок
            { token: 'delimiter.parenthesis', foreground: '#E1E4E8' }, // Светлый для круглых скобок
            { token: 'delimiter.square', foreground: '#E1E4E8' }, // Светлый для квадратных скобок
            { token: 'delimiter.angle', foreground: '#E1E4E8' }, // Светлый для угловых скобок
            { token: 'delimiter.curly', foreground: '#E1E4E8' }, // Светлый для фигурных скобок
            { token: 'punctuation', foreground: '#E1E4E8' },    // Светлый для пунктуации
            
            // Особые случаи и специфика Rust
            { token: 'custom-error', foreground: '#FF5252' },  // Яркий красный для ошибок синтаксиса
            { token: 'invalid', foreground: '#FF5252' },       // Яркий красный для недопустимого синтаксиса
            { token: 'regexp', foreground: '#9CDCFE' },        // Светло-голубой для регулярных выражений
            { token: 'storage', foreground: '#FF6B8B' },       // Яркий красно-розовый для storage keywords
            { token: 'storage.type', foreground: '#FF6B8B' },  // Яркий красно-розовый для типов хранения
            { token: 'storage.modifier', foreground: '#FF6B8B' }, // Яркий красно-розовый для модификаторов хранения
            { token: 'annotation', foreground: '#FF6B8B' },    // Яркий красно-розовый для аннотаций
            { token: 'modifier', foreground: '#FF6B8B' },      // Яркий красно-розовый для модификаторов
            { token: 'entity.name.namespace', foreground: '#D2A8FF' },  // Светло-фиолетовый для пространств имен
            { token: 'entity.name.type', foreground: '#D2A8FF' }, // Светло-фиолетовый для имен типов
            { token: 'entity.name.function', foreground: '#79B8FF' }, // Яркий синий для имен функций
            { token: 'entity.name.tag', foreground: '#7EEAB4' }, // Яркий зеленый для тегов
            { token: 'entity.other.attribute-name', foreground: '#D2A8FF' }, // Светло-фиолетовый для имен атрибутов
            { token: 'meta.tag', foreground: '#7EEAB4' },     // Яркий зеленый для метатегов
            { token: 'meta.preprocessor', foreground: '#FF6B8B' }, // Яркий красно-розовый для препроцессора
            { token: 'meta.preprocessor.string', foreground: '#7EEAB4' }, // Яркий зеленый для строк препроцессора
            { token: 'meta.preprocessor.numeric', foreground: '#79B8FF' }, // Яркий синий для чисел препроцессора
            { token: 'meta.structure.tuple', foreground: '#E1E4E8' }, // Светлый для структуры кортежей
            { token: 'meta.parameter', foreground: '#FFAB70' }, // Оранжевый для параметров
            { token: 'meta.return-type', foreground: '#D2A8FF' }, // Светло-фиолетовый для возвращаемых типов
            { token: 'meta.impl', foreground: '#D2A8FF' },    // Светло-фиолетовый для impl блоков
            { token: 'meta.trait', foreground: '#D2A8FF' },   // Светло-фиолетовый для trait блоков
            { token: 'meta.directive', foreground: '#FF6B8B' }, // Яркий красно-розовый для директив
            { token: 'meta.path', foreground: '#E1E4E8' },    // Светлый для путей
            { token: 'meta.use', foreground: '#FF6B8B' },     // Яркий красно-розовый для use директив
        ],
        colors: {
            'editor.foreground': '#e0e0e0',
            'editor.background': '#1e1e1e',
            'editor.lineHighlightBackground': '#2a2a2a',
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
                    enabled: false,
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
            
            // Настраиваем отслеживание позиции курсора
            setupCursorPositionTracking();
            
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

    // Register Rust completion provider
    monaco.languages.registerCompletionItemProvider('rust', {
        provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });

            // Get the word at the current position
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            // Define suggestion categories
            const suggestions = [];

            // Keywords
            const keywords = [
                'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
                'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
                'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
                'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
                'unsafe', 'use', 'where', 'while', 'yield', 'try', 'union'
            ];

            // Types
            const types = [
                'bool', 'char', 'f32', 'f64', 'i8', 'i16', 'i32', 'i64', 'i128',
                'isize', 'str', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize'
            ];

            // Standard library types
            const stdTypes = [
                'Vec', 'String', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'Cell', 
                'RefCell', 'HashMap', 'BTreeMap', 'VecDeque', 'LinkedList', 'HashSet',
                'BTreeSet', 'Mutex', 'RwLock', 'Ordering', 'Path', 'PathBuf'
            ];

            // Standard library modules
            const stdModules = [
                'std::collections', 'std::env', 'std::fs', 'std::io', 'std::net',
                'std::path', 'std::process', 'std::sync', 'std::thread', 'std::time'
            ];

            // Common traits
            const traits = [
                'Clone', 'Copy', 'Debug', 'Default', 'Eq', 'Hash', 'Ord', 'PartialEq',
                'PartialOrd', 'Send', 'Sized', 'Sync', 'ToString', 'From', 'Into',
                'AsRef', 'AsMut', 'Deref', 'DerefMut', 'Drop', 'Fn', 'FnMut', 'FnOnce'
            ];

            // Common macros
            const macros = [
                'println!', 'print!', 'format!', 'vec!', 'assert!', 'assert_eq!',
                'assert_ne!', 'panic!', 'dbg!', 'include_str!', 'include_bytes!',
                'todo!', 'unimplemented!', 'unreachable!', 'cfg!', 'env!', 'option_env!'
            ];

            // Common attributes
            const attributes = [
                '#[derive(', '#[cfg(', '#[allow(', '#[deny(', '#[warn(',
                '#[inline]', '#[test]', '#[bench]', '#[macro_export]',
                '#[no_mangle]', '#[non_exhaustive]', '#[path = "', '#[repr('
            ];

            // Context-aware suggestions
            const isAfterUse = /use\s+[\w:]*$/.test(textUntilPosition);
            const isAfterImpl = /impl\s+[\w:]*$/.test(textUntilPosition);
            const isAfterFn = /fn\s+[\w]*\s*\([^)]*\)\s*->\s*[\w:]*$/.test(textUntilPosition);
            const isAfterType = /(:\s*|->\s*)[\w:]*$/.test(textUntilPosition);
            const isAfterHash = /#\s*$/.test(textUntilPosition);
            const isAfterDeriveOpen = /#\[derive\(\s*[\w,\s]*$/.test(textUntilPosition);
            const isInStructOrEnum = /(?:struct|enum)\s+\w+\s*\{[^}]*$/.test(textUntilPosition);
            
            // Check if we're after a dot (for method suggestions)
            const dotMatch = textUntilPosition.match(/(\w+)\.\s*$/);
            const isAfterDot = !!dotMatch;
            const objectBeforeDot = isAfterDot ? dotMatch[1] : '';

            // Method suggestions for common types
            const methodSuggestions = {
                // String methods
                'String': [
                    { label: 'len', detail: 'Returns the length of the String', insertText: 'len()' },
                    { label: 'is_empty', detail: 'Returns true if the String is empty', insertText: 'is_empty()' },
                    { label: 'push', detail: 'Appends a character to the String', insertText: 'push(${1:ch})' },
                    { label: 'push_str', detail: 'Appends a string slice to the String', insertText: 'push_str(${1:string})' },
                    { label: 'clear', detail: 'Clears the String', insertText: 'clear()' },
                    { label: 'as_str', detail: 'Converts to a string slice', insertText: 'as_str()' },
                    { label: 'trim', detail: 'Returns a trimmed string slice', insertText: 'trim()' },
                    { label: 'chars', detail: 'Returns an iterator over the chars', insertText: 'chars()' },
                    { label: 'split', detail: 'Splits the string by pattern', insertText: 'split(${1:pattern})' },
                    { label: 'replace', detail: 'Replaces all matches with replacement', insertText: 'replace(${1:from}, ${2:to})' }
                ],
                // Vec methods
                'Vec': [
                    { label: 'len', detail: 'Returns the length of the Vec', insertText: 'len()' },
                    { label: 'is_empty', detail: 'Returns true if the Vec is empty', insertText: 'is_empty()' },
                    { label: 'push', detail: 'Appends an element to the Vec', insertText: 'push(${1:value})' },
                    { label: 'pop', detail: 'Removes and returns the last element', insertText: 'pop()' },
                    { label: 'insert', detail: 'Inserts an element at position', insertText: 'insert(${1:index}, ${2:element})' },
                    { label: 'remove', detail: 'Removes and returns an element at position', insertText: 'remove(${1:index})' },
                    { label: 'clear', detail: 'Clears the Vec', insertText: 'clear()' },
                    { label: 'iter', detail: 'Returns an iterator', insertText: 'iter()' },
                    { label: 'iter_mut', detail: 'Returns a mutable iterator', insertText: 'iter_mut()' },
                    { label: 'into_iter', detail: 'Returns a consuming iterator', insertText: 'into_iter()' }
                ],
                // Option methods
                'Option': [
                    { label: 'is_some', detail: 'Returns true if the option is Some', insertText: 'is_some()' },
                    { label: 'is_none', detail: 'Returns true if the option is None', insertText: 'is_none()' },
                    { label: 'unwrap', detail: 'Returns the contained Some value or panics', insertText: 'unwrap()' },
                    { label: 'unwrap_or', detail: 'Returns the contained Some value or a default', insertText: 'unwrap_or(${1:default})' },
                    { label: 'unwrap_or_else', detail: 'Returns the contained Some value or computes it from a closure', insertText: 'unwrap_or_else(${1:|_|})' },
                    { label: 'map', detail: 'Maps an Option<T> to Option<U> by applying a function', insertText: 'map(${1:|x| })' },
                    { label: 'and_then', detail: 'Returns None if the option is None, otherwise calls f and returns the result', insertText: 'and_then(${1:|x| })' },
                    { label: 'or_else', detail: 'Returns the option if it contains a value, otherwise calls f and returns the result', insertText: 'or_else(${1:|_| })' },
                    { label: 'take', detail: 'Takes the value out of the option, leaving a None in its place', insertText: 'take()' }
                ],
                // Result methods
                'Result': [
                    { label: 'is_ok', detail: 'Returns true if the result is Ok', insertText: 'is_ok()' },
                    { label: 'is_err', detail: 'Returns true if the result is Err', insertText: 'is_err()' },
                    { label: 'ok', detail: 'Converts from Result<T, E> to Option<T>', insertText: 'ok()' },
                    { label: 'err', detail: 'Converts from Result<T, E> to Option<E>', insertText: 'err()' },
                    { label: 'unwrap', detail: 'Returns the contained Ok value or panics', insertText: 'unwrap()' },
                    { label: 'unwrap_err', detail: 'Returns the contained Err value or panics', insertText: 'unwrap_err()' },
                    { label: 'unwrap_or', detail: 'Returns the contained Ok value or a default', insertText: 'unwrap_or(${1:default})' },
                    { label: 'unwrap_or_else', detail: 'Returns the contained Ok value or computes it from a closure', insertText: 'unwrap_or_else(${1:|_|})' },
                    { label: 'map', detail: 'Maps a Result<T, E> to Result<U, E> by applying a function to the contained Ok value', insertText: 'map(${1:|x| })' },
                    { label: 'map_err', detail: 'Maps a Result<T, E> to Result<T, F> by applying a function to the contained Err value', insertText: 'map_err(${1:|e| })' }
                ],
                // Iterator methods
                'iter': [
                    { label: 'next', detail: 'Advances the iterator and returns the next value', insertText: 'next()' },
                    { label: 'count', detail: 'Consumes the iterator, counting the number of iterations', insertText: 'count()' },
                    { label: 'last', detail: 'Consumes the iterator, returning the last element', insertText: 'last()' },
                    { label: 'nth', detail: 'Returns the nth element of the iterator', insertText: 'nth(${1:n})' },
                    { label: 'collect', detail: 'Transforms the iterator into a collection', insertText: 'collect::<${1:Vec<_>>>()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
                    { label: 'filter', detail: 'Creates an iterator which uses a closure to determine if an element should be yielded', insertText: 'filter(${1:|x| })' },
                    { label: 'map', detail: 'Takes a closure and creates an iterator which calls that closure on each element', insertText: 'map(${1:|x| })' },
                    { label: 'fold', detail: 'Folds every element into an accumulator by applying an operation', insertText: 'fold(${1:initial}, ${2:|acc, x| })' },
                    { label: 'for_each', detail: 'Calls a closure on each element of an iterator', insertText: 'for_each(${1:|x| })' },
                    { label: 'find', detail: 'Returns the first element satisfying the predicate', insertText: 'find(${1:|x| })' }
                ],
                // HashMap methods
                'HashMap': [
                    { label: 'insert', detail: 'Inserts a key-value pair into the map', insertText: 'insert(${1:key}, ${2:value})' },
                    { label: 'get', detail: 'Returns a reference to the value corresponding to the key', insertText: 'get(${1:&key})' },
                    { label: 'contains_key', detail: 'Returns true if the map contains a value for the specified key', insertText: 'contains_key(${1:&key})' },
                    { label: 'remove', detail: 'Removes a key from the map, returning the value', insertText: 'remove(${1:&key})' },
                    { label: 'len', detail: 'Returns the number of elements in the map', insertText: 'len()' },
                    { label: 'is_empty', detail: 'Returns true if the map contains no elements', insertText: 'is_empty()' },
                    { label: 'clear', detail: 'Clears the map, removing all key-value pairs', insertText: 'clear()' },
                    { label: 'iter', detail: 'Returns an iterator over the map', insertText: 'iter()' },
                    { label: 'keys', detail: 'Returns an iterator over the map\'s keys', insertText: 'keys()' },
                    { label: 'values', detail: 'Returns an iterator over the map\'s values', insertText: 'values()' }
                ],
                // File methods
                'File': [
                    { label: 'read_to_string', detail: 'Read the entire contents of a file into a string', insertText: 'read_to_string(&mut ${1:String::new()})?' },
                    { label: 'read_to_end', detail: 'Read the entire contents of a file into a bytes vector', insertText: 'read_to_end(&mut ${1:Vec::new()})?' },
                    { label: 'write_all', detail: 'Write a slice as the entire contents of a file', insertText: 'write_all(${1:bytes})?' },
                    { label: 'flush', detail: 'Flush this output stream', insertText: 'flush()?' },
                    { label: 'seek', detail: 'Seek to an offset, in bytes, in a stream', insertText: 'seek(${1:SeekFrom::Start(0)})?' }
                ],
                // str methods
                'str': [
                    { label: 'len', detail: 'Returns the length of the str in bytes', insertText: 'len()' },
                    { label: 'is_empty', detail: 'Returns true if the str has a length of zero bytes', insertText: 'is_empty()' },
                    { label: 'chars', detail: 'Returns an iterator over the chars of a string slice', insertText: 'chars()' },
                    { label: 'split', detail: 'Returns an iterator over substrings of this string slice, separated by a pattern', insertText: 'split(${1:pattern})' },
                    { label: 'trim', detail: 'Returns a string slice with leading and trailing whitespace removed', insertText: 'trim()' },
                    { label: 'to_string', detail: 'Converts the str to an owned String', insertText: 'to_string()' },
                    { label: 'parse', detail: 'Parses this string slice into another type', insertText: 'parse::<${1:i32}>()?' },
                    { label: 'contains', detail: 'Returns true if the pattern matches a substring of this string slice', insertText: 'contains(${1:pattern})' },
                    { label: 'starts_with', detail: 'Returns true if the string slice starts with the pattern', insertText: 'starts_with(${1:pattern})' },
                    { label: 'ends_with', detail: 'Returns true if the string slice ends with the pattern', insertText: 'ends_with(${1:pattern})' }
                ]
            };

            // Add keyword suggestions
            keywords.forEach(keyword => {
                suggestions.push({
                    label: keyword,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: keyword,
                    range: range
                });
            });

            // Add type suggestions if appropriate
            if (isAfterType || isAfterImpl) {
                types.forEach(type => {
                    suggestions.push({
                        label: type,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: type,
                        range: range
                    });
                });

                stdTypes.forEach(type => {
                    suggestions.push({
                        label: type,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: type,
                        range: range
                    });
                });
            }

            // Add module suggestions if after 'use'
            if (isAfterUse) {
                stdModules.forEach(module => {
                    suggestions.push({
                        label: module,
                        kind: monaco.languages.CompletionItemKind.Module,
                        insertText: module,
                        range: range
                    });
                });
            }

            // Add trait suggestions if after 'impl' or in derive attribute
            if (isAfterImpl || isAfterDeriveOpen) {
                traits.forEach(trait => {
                    suggestions.push({
                        label: trait,
                        kind: monaco.languages.CompletionItemKind.Interface,
                        insertText: trait,
                        range: range
                    });
                });
            }

            // Add macro suggestions
            macros.forEach(macro => {
                suggestions.push({
                    label: macro,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: macro.endsWith('!') ? 
                        macro.replace('!', '!(${1})') : 
                        macro,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: range
                });
            });

            // Add attribute suggestions if after #
            if (isAfterHash) {
                attributes.forEach(attr => {
                    suggestions.push({
                        label: attr,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: attr.endsWith('(') ? 
                            attr + '${1})' : 
                            attr,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: range
                    });
                });
            }

            // Add common code snippets
            const snippets = [
                {
                    label: 'fn',
                    detail: 'Function definition',
                    insertText: 'fn ${1:name}(${2:params}) ${3:-> ${4:ReturnType} }{\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'struct',
                    detail: 'Struct definition',
                    insertText: 'struct ${1:Name} {\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'enum',
                    detail: 'Enum definition',
                    insertText: 'enum ${1:Name} {\n\t${2:Variant1},\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'impl',
                    detail: 'Implementation block',
                    insertText: 'impl ${1:Type} {\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'trait',
                    detail: 'Trait definition',
                    insertText: 'trait ${1:Name} {\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'match',
                    detail: 'Match expression',
                    insertText: 'match ${1:expression} {\n\t${2:pattern} => ${3:expression},\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'if let',
                    detail: 'If let expression',
                    insertText: 'if let ${1:pattern} = ${2:expression} {\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'while let',
                    detail: 'While let loop',
                    insertText: 'while let ${1:pattern} = ${2:expression} {\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'for',
                    detail: 'For loop',
                    insertText: 'for ${1:item} in ${2:collection} {\n\t${0}\n}',
                    kind: monaco.languages.CompletionItemKind.Snippet
                },
                {
                    label: 'derive',
                    detail: 'Derive attribute',
                    insertText: '#[derive(${1:Debug})]',
                    kind: monaco.languages.CompletionItemKind.Snippet
                }
            ];

            // Add snippets with proper insert text rules
            snippets.forEach(snippet => {
                suggestions.push({
                    label: snippet.label,
                    kind: snippet.kind,
                    detail: snippet.detail,
                    insertText: snippet.insertText,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: range
                });
            });

            // Add method suggestions if after a dot
            if (isAfterDot) {
                // Try to determine the type of the object before the dot
                let objectType = objectBeforeDot;
                
                // Check if the object is a common variable name that suggests its type
                if (objectBeforeDot.endsWith('_str') || objectBeforeDot === 's') {
                    objectType = 'str';
                } else if (objectBeforeDot.endsWith('_string') || objectBeforeDot === 'string') {
                    objectType = 'String';
                } else if (objectBeforeDot.endsWith('_vec') || objectBeforeDot === 'vec') {
                    objectType = 'Vec';
                } else if (objectBeforeDot.endsWith('_opt') || objectBeforeDot === 'opt') {
                    objectType = 'Option';
                } else if (objectBeforeDot.endsWith('_res') || objectBeforeDot === 'res') {
                    objectType = 'Result';
                } else if (objectBeforeDot.endsWith('_iter') || objectBeforeDot === 'iter') {
                    objectType = 'iter';
                } else if (objectBeforeDot.endsWith('_map') || objectBeforeDot === 'map') {
                    objectType = 'HashMap';
                } else if (objectBeforeDot.endsWith('_file') || objectBeforeDot === 'file') {
                    objectType = 'File';
                }
                
                // Add method suggestions for the determined type
                const methods = methodSuggestions[objectType];
                if (methods) {
                    methods.forEach(method => {
                        suggestions.push({
                            label: method.label,
                            kind: monaco.languages.CompletionItemKind.Method,
                            detail: method.detail,
                            insertText: method.insertText,
                            insertTextRules: method.insertTextRules || monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: range
                        });
                    });
                }
                
                // Add standard methods available on most types
                const commonMethods = [
                    { label: 'to_string', detail: 'Converts the value to a String', insertText: 'to_string()' },
                    { label: 'clone', detail: 'Creates a copy of the value', insertText: 'clone()' },
                    { label: 'into', detail: 'Converts the value into another type', insertText: 'into()' }
                ];
                
                commonMethods.forEach(method => {
                    suggestions.push({
                        label: method.label,
                        kind: monaco.languages.CompletionItemKind.Method,
                        detail: method.detail,
                        insertText: method.insertText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: range
                    });
                });
            }

            return {
                suggestions: suggestions
            };
        },
        triggerCharacters: ['.', ':', '#', '[', '(']
    });

    // Register Rust hover provider
    monaco.languages.registerHoverProvider('rust', {
        provideHover: function(model, position) {
            const word = model.getWordAtPosition(position);
            if (!word) return null;
            
            const token = word.word;
            
            // Documentation for keywords
            const keywordDocs = {
                'fn': 'Defines a function.\n\n```rust\nfn function_name(param1: Type1, param2: Type2) -> ReturnType {\n    // function body\n}\n```',
                'let': 'Binds a value to a variable.\n\n```rust\nlet x = 5; // immutable binding\nlet mut y = 10; // mutable binding\n```',
                'mut': 'Indicates that a binding is mutable.\n\n```rust\nlet mut x = 5;\nx = 10; // OK because x is mutable\n```',
                'if': 'Conditional expression.\n\n```rust\nif condition {\n    // code\n} else if another_condition {\n    // code\n} else {\n    // code\n}\n```',
                'else': 'Alternative branch in an if expression.',
                'match': 'Pattern matching expression.\n\n```rust\nmatch value {\n    pattern1 => expression1,\n    pattern2 => {\n        expression2\n    },\n    _ => default_expression,\n}\n```',
                'for': 'Loop over items from an iterator.\n\n```rust\nfor item in collection {\n    // code using item\n}\n```',
                'while': 'Loop while a condition is true.\n\n```rust\nwhile condition {\n    // code\n}\n```',
                'loop': 'Infinite loop.\n\n```rust\nloop {\n    // code\n    if should_break {\n        break;\n    }\n}\n```',
                'break': 'Exit a loop immediately.',
                'continue': 'Skip to the next iteration of a loop.',
                'return': 'Return a value from a function.',
                'struct': 'Define a structure.\n\n```rust\nstruct Point {\n    x: f64,\n    y: f64,\n}\n```',
                'enum': 'Define an enumeration.\n\n```rust\nenum Result<T, E> {\n    Ok(T),\n    Err(E),\n}\n```',
                'trait': 'Define a trait interface.\n\n```rust\ntrait HasArea {\n    fn area(&self) -> f64;\n}\n```',
                'impl': 'Implement methods for a type.\n\n```rust\nimpl Point {\n    fn new(x: f64, y: f64) -> Point {\n        Point { x, y }\n    }\n}\n```',
                'pub': 'Make an item public, visible outside its module.',
                'use': 'Import items from modules.\n\n```rust\nuse std::collections::HashMap;\n```',
                'mod': 'Define or import a module.\n\n```rust\nmod graphics {\n    pub mod shapes {\n        // module contents\n    }\n}\n```',
                'async': 'Define an asynchronous function or block.\n\n```rust\nasync fn fetch_data() -> Result<Data, Error> {\n    // async code\n}\n```',
                'await': 'Wait for an async operation to complete.\n\n```rust\nlet result = future.await;\n```',
                'dyn': 'Used for dynamic dispatch of trait objects.\n\n```rust\nfn process(item: &dyn Drawable) {\n    item.draw();\n}\n```',
                'static': 'Define a static item that lasts for the entire program.\n\n```rust\nstatic GLOBAL: i32 = 42;\n```',
                'const': 'Define a constant value.\n\n```rust\nconst PI: f64 = 3.14159265359;\n```',
                'type': 'Create a type alias.\n\n```rust\ntype Result<T> = std::result::Result<T, Error>;\n```',
                'where': 'Add constraints to generic types.\n\n```rust\nfn process<T>(item: T) where T: Display + Clone {\n    // code\n}\n```',
                'move': 'Force closure to take ownership of captured variables.\n\n```rust\nlet closure = move || {\n    // captured variables are moved into the closure\n};\n```',
                'ref': 'Create a reference in a pattern.\n\n```rust\nlet ref r = 5; // r is &i32\n```',
                'unsafe': 'Mark a block or function as unsafe.\n\n```rust\nunsafe {\n    // code that requires unsafe\n}\n```',
                'as': 'Cast between types or rename imports.\n\n```rust\nlet num = 10 as f64;\nuse std::io::Error as IoError;\n```',
                'in': 'Used in for loops and in trait bounds.',
                'self': 'The receiver of a method or the current module.',
                'Self': 'The type of the implementing type in a trait or impl.',
                'super': 'The parent module.',
                'crate': 'The root of the current crate.',
                'extern': 'Link to external functions or crates.\n\n```rust\nextern crate serde;\nextern "C" {\n    fn c_function();\n}\n```'
            };
            
            // Documentation for types
            const typeDocs = {
                'i8': 'Signed 8-bit integer (-128 to 127)',
                'i16': 'Signed 16-bit integer (-32,768 to 32,767)',
                'i32': 'Signed 32-bit integer (-2,147,483,648 to 2,147,483,647)',
                'i64': 'Signed 64-bit integer (-9,223,372,036,854,775,808 to 9,223,372,036,854,775,807)',
                'i128': 'Signed 128-bit integer (very large range)',
                'isize': 'Signed integer, size depends on target architecture (32 or 64 bits)',
                'u8': 'Unsigned 8-bit integer (0 to 255)',
                'u16': 'Unsigned 16-bit integer (0 to 65,535)',
                'u32': 'Unsigned 32-bit integer (0 to 4,294,967,295)',
                'u64': 'Unsigned 64-bit integer (0 to 18,446,744,073,709,551,615)',
                'u128': 'Unsigned 128-bit integer (very large range)',
                'usize': 'Unsigned integer, size depends on target architecture (32 or 64 bits)',
                'f32': 'Single-precision floating point (IEEE 754)',
                'f64': 'Double-precision floating point (IEEE 754)',
                'bool': 'Boolean type (true or false)',
                'char': 'Unicode scalar value (4 bytes)',
                'str': 'String slice, a reference to UTF-8 encoded string data',
                'String': 'Owned, growable UTF-8 encoded string',
                'Vec': 'Growable array type',
                'Option': 'Type that represents optional values\n\n```rust\nenum Option<T> {\n    Some(T),\n    None,\n}\n```',
                'Result': 'Type for operations that may fail\n\n```rust\nenum Result<T, E> {\n    Ok(T),\n    Err(E),\n}\n```',
                'Box': 'Pointer type for heap allocation',
                'Rc': 'Single-threaded reference-counting pointer',
                'Arc': 'Thread-safe reference-counting pointer',
                'HashMap': 'Hash map collection',
                'BTreeMap': 'Ordered map based on a B-Tree',
                'HashSet': 'Hash set collection',
                'BTreeSet': 'Ordered set based on a B-Tree',
                'VecDeque': 'Double-ended queue implemented with a growable ring buffer',
                'LinkedList': 'Doubly-linked list',
                'Mutex': 'Mutual exclusion primitive for thread synchronization',
                'RwLock': 'Reader-writer lock for thread synchronization'
            };
            
            // Documentation for macros
            const macroDocs = {
                'println!': 'Prints to the standard output, with a newline.\n\n```rust\nprintln!("Hello, {}!", "world");\n```',
                'print!': 'Prints to the standard output, without a newline.\n\n```rust\nprint!("Hello, ");\nprint!("world!");\n```',
                'format!': 'Creates a String using formatting rules.\n\n```rust\nlet s = format!("Hello, {}!", "world");\n```',
                'vec!': 'Creates a Vec containing the arguments.\n\n```rust\nlet v = vec![1, 2, 3];\n```',
                'assert!': 'Ensures that a boolean expression is true.\n\n```rust\nassert!(2 + 2 == 4);\n```',
                'assert_eq!': 'Asserts that two expressions are equal.\n\n```rust\nassert_eq!(2 + 2, 4);\n```',
                'assert_ne!': 'Asserts that two expressions are not equal.\n\n```rust\nassert_ne!(2 + 2, 5);\n```',
                'panic!': 'Causes the current thread to panic.\n\n```rust\npanic!("This is a terrible mistake!");\n```',
                'dbg!': 'Prints and returns the value of a given expression for debugging.\n\n```rust\nlet a = 2;\nlet b = dbg!(a * 2) + 1;\n// prints: [src/main.rs:2] a * 2 = 4\n```',
                'include_str!': 'Includes a UTF-8 encoded file as a string.\n\n```rust\nconst HTML: &str = include_str!("index.html");\n```',
                'include_bytes!': 'Includes a file as a byte array.\n\n```rust\nconst ICON: &[u8] = include_bytes!("icon.png");\n```',
                'todo!': 'Indicates unfinished code.\n\n```rust\nfn unimplemented_function() {\n    todo!("Implement this function");\n}\n```',
                'unimplemented!': 'Indicates unimplemented code.\n\n```rust\nfn unimplemented_function() {\n    unimplemented!();\n}\n```',
                'unreachable!': 'Indicates unreachable code.\n\n```rust\nmatch value {\n    0 => handle_zero(),\n    1 => handle_one(),\n    _ => unreachable!("This should never happen"),\n}\n```'
            };
            
            // Check if the token is a keyword, type, or macro
            let contents = null;
            
            if (keywordDocs[token]) {
                contents = [
                    { value: `**${token}** - Rust keyword` },
                    { value: keywordDocs[token] }
                ];
            } else if (typeDocs[token]) {
                contents = [
                    { value: `**${token}** - Rust type` },
                    { value: typeDocs[token] }
                ];
            } else if (macroDocs[token]) {
                contents = [
                    { value: `**${token}** - Rust macro` },
                    { value: macroDocs[token] }
                ];
            }
            
            if (contents) {
                return {
                    range: new monaco.Range(
                        position.lineNumber,
                        word.startColumn,
                        position.lineNumber,
                        word.endColumn
                    ),
                    contents: contents
                };
            }
            
            return null;
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
    
    // Дополнительные паттерны для более мелких конструкций
    const modPattern = /^\s*(pub\s+)?(mod)\s+([a-zA-Z0-9_]+)/;
    const usePattern = /^\s*(pub\s+)?(use)\s+(.*?);/;
    const typePattern = /^\s*(pub\s+)?(type)\s+([a-zA-Z0-9_]+)/;
    const constPattern = /^\s*(pub\s+)?(const)\s+([A-Z_][A-Z0-9_]*)/;
    const staticPattern = /^\s*(pub\s+)?(static)\s+([A-Z_][A-Z0-9_]*)/;
    const letPattern = /^\s*let\s+([a-zA-Z0-9_]+)\s*(?::\s*([a-zA-Z0-9_<>]+))?/;
    
    // Проверяем текущую строку на мелкие определения (без блоков)
    const currentLine = model.getLineContent(lineNumber);
    
    // Проверка на mod, use, type, const, static
    const modMatch = currentLine.match(modPattern);
    if (modMatch) {
        let modDef = '';
        if (modMatch[1]) modDef += modMatch[1].trim() + ' '; // pub
        modDef += 'mod ' + modMatch[3];
        contextHierarchy.push(modDef);
    }
    
    const useMatch = currentLine.match(usePattern);
    if (useMatch) {
        let useDef = 'use';
        if (useMatch[3]) {
            const path = useMatch[3].trim();
            if (path.includes(' as ')) {
                const parts = path.split(' as ');
                useDef += ' ' + parts[0] + ' as ' + parts[1];
            } else {
                useDef += ' ' + path;
            }
        }
        contextHierarchy.push(useDef);
    }
    
    const typeMatch = currentLine.match(typePattern);
    if (typeMatch) {
        let typeDef = '';
        if (typeMatch[1]) typeDef += typeMatch[1].trim() + ' '; // pub
        typeDef += 'type ' + typeMatch[3];
        contextHierarchy.push(typeDef);
    }
    
    const constMatch = currentLine.match(constPattern);
    if (constMatch) {
        let constDef = '';
        if (constMatch[1]) constDef += constMatch[1].trim() + ' '; // pub
        constDef += 'const ' + constMatch[3];
        contextHierarchy.push(constDef);
    }
    
    const staticMatch = currentLine.match(staticPattern);
    if (staticMatch) {
        let staticDef = '';
        if (staticMatch[1]) staticDef += staticMatch[1].trim() + ' '; // pub
        staticDef += 'static ' + staticMatch[3];
        contextHierarchy.push(staticDef);
    }
    
    const letMatch = currentLine.match(letPattern);
    if (letMatch) {
        let letDef = 'let ' + letMatch[1];
        if (letMatch[2]) letDef += ': ' + letMatch[2];
        contextHierarchy.push(letDef);
    }
    
    // Если нашли мелкую конструкцию, возвращаем её
    if (contextHierarchy.length > 0) {
        return contextHierarchy;
    }
    
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
                            blockPattern.test(potentialContextLine) ||
                            modPattern.test(potentialContextLine) ||  // Добавляем проверку на мелкие конструкции
                            typePattern.test(potentialContextLine) ||
                            constPattern.test(potentialContextLine) ||
                            staticPattern.test(potentialContextLine)) {
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
                            } else {
                                // Проверяем мелкие определения
                                const modMatch = contextLine.match(modPattern);
                                if (modMatch) {
                                    let modDef = '';
                                    if (modMatch[1]) modDef += modMatch[1].trim() + ' '; // pub
                                    modDef += 'mod ' + modMatch[3];
                                    context = modDef;
                                }
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

/**
 * Настройка отслеживания позиции курсора
 */
function setupCursorPositionTracking() {
    // Находим элементы для отображения позиции курсора

    const cursorLnElement = document.querySelector('.cursor-ln');
    
    if (!cursorLnElement) {
        console.error('Cursor position not found');
        return;
    }
    
    // Начальное значение
    updateCursorPosition(1, 1);
    
    // Подписываемся на изменение позиции курсора
    editor.onDidChangeCursorPosition(e => {
        const position = e.position;
        updateCursorPosition(position.column, position.lineNumber);
    });
    
    /**
     * Обновляет отображение позиции курсора
     * @param {number} column - Номер столбца (начиная с 1)
     * @param {number} lineNumber - Номер строки (начиная с 1)
     */
    function updateCursorPosition(column, lineNumber) {
        cursorLnElement.textContent = `${lineNumber},${column}`;

    }
}

// Export the initialization function
window.initMonaco = initMonaco;
// Export the dispose function
window.disposeEditor = disposeEditor; 