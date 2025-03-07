/**
 * Z Documentation - Main JavaScript
 * © 2024 Z Team
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const themeToggle = document.getElementById('theme-toggle');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const navLinks = document.querySelectorAll('.sidebar-nav-link');
  const contentElement = document.querySelector('.content');
  
  // Переменные для отслеживания скролла
  let lastScrollTop = 0;
  const header = document.querySelector('.header');
  
  // Проверка сохраненной темы
  const savedTheme = localStorage.getItem('z-docs-theme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  // Применение темы
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    updateThemeIcon(false);
  }
  
  // Функция переключения темы
  function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('z-docs-theme', isDarkMode ? 'dark' : 'light');
    updateThemeIcon(isDarkMode);
    
    // Применяем анимацию
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }
  
  // Обновление иконки темы
  function updateThemeIcon(isDarkMode) {
    if (!themeToggle) return;
    
    themeToggle.innerHTML = isDarkMode 
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  }
  
  // Переключение бокового меню на мобильных
  function toggleSidebar() {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
    
    // Анимация иконки гамбургера
    if (sidebarToggle) {
      sidebarToggle.classList.toggle('active');
    }
  }
  
  // Закрытие бокового меню при клике вне
  function handleDocumentClick(event) {
    if (window.innerWidth <= 768) {
      if (
        sidebar.classList.contains('active') && 
        !sidebar.contains(event.target) && 
        !sidebarToggle.contains(event.target)
      ) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        
        if (sidebarToggle) {
          sidebarToggle.classList.remove('active');
        }
      }
    }
  }
  
  // Устанавливаем активную ссылку на основе текущей страницы
  function setActiveLink() {
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      // Учитываем как полные, так и относительные пути
      if (
        currentPath.endsWith(linkPath) || 
        (linkPath === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('/Docs/')))
      ) {
        link.classList.add('active');
        
        // Автоматически раскрываем родительский раздел
        const parent = link.closest('.sidebar-section');
        if (parent) {
          parent.classList.add('active');
        }
      } else {
        link.classList.remove('active');
      }
    });
    
    // Добавляем заголовок текущей страницы в хлебные крошки
    updateBreadcrumbs();
  }
  
  // Обновление хлебных крошек
  function updateBreadcrumbs() {
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    if (!breadcrumbsContainer) return;
    
    const activeLink = document.querySelector('.sidebar-nav-link.active');
    if (!activeLink) return;
    
    // Получаем текст активной ссылки
    const pageTitle = activeLink.textContent.trim();
    
    // Получаем раздел меню
    const sectionHeading = activeLink.closest('ul').previousElementSibling;
    const sectionTitle = sectionHeading ? sectionHeading.textContent.trim() : '';
    
    // Создаем хлебные крошки
    breadcrumbsContainer.innerHTML = `
      <a href="index.html">Docs</a>
      ${sectionTitle ? `<span class="breadcrumb-separator">/</span><span>${sectionTitle}</span>` : ''}
      <span class="breadcrumb-separator">/</span>
      <span class="current-page">${pageTitle}</span>
    `;
  }
  
  // Функция для добавления нумерации заголовков и ссылок на них
  function addHeadingAnchors() {
    const headings = contentElement.querySelectorAll('h2, h3, h4');
    
    headings.forEach((heading, index) => {
      // Создаем уникальный id для заголовка, если его нет
      if (!heading.id) {
        const id = heading.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        heading.id = id;
      }
      
      // Добавляем ссылку-якорь к заголовку
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${heading.id}`;
      anchor.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>`;
      
      heading.appendChild(anchor);
    });
  }
  
  // Функция для создания содержания (Table of Contents)
  function createTableOfContents() {
    const tocContainer = document.getElementById('toc');
    if (!tocContainer) return;
    
    const h2s = contentElement.querySelectorAll('h2');
    
    if (h2s.length > 1) { // Создаем TOC только если есть хотя бы 2 заголовка h2
      let tocHTML = '<div class="toc-title">На этой странице</div><ul>';
      
      h2s.forEach(h2 => {
        const id = h2.id;
        const title = h2.textContent.replace(/¶$/, '').trim();
        
        tocHTML += `<li><a href="#${id}">${title}</a>`;
        
        // Поиск всех h3 до следующего h2
        let nextElement = h2.nextElementSibling;
        let h3s = [];
        
        while (nextElement && nextElement.tagName !== 'H2') {
          if (nextElement.tagName === 'H3') {
            h3s.push(nextElement);
          }
          nextElement = nextElement.nextElementSibling;
        }
        
        if (h3s.length > 0) {
          tocHTML += '<ul>';
          h3s.forEach(h3 => {
            const h3Id = h3.id;
            const h3Title = h3.textContent.replace(/¶$/, '').trim();
            tocHTML += `<li><a href="#${h3Id}">${h3Title}</a></li>`;
          });
          tocHTML += '</ul>';
        }
        
        tocHTML += '</li>';
      });
      
      tocHTML += '</ul>';
      tocContainer.innerHTML = tocHTML;
      tocContainer.style.display = 'block';
    } else {
      tocContainer.style.display = 'none';
    }
  }
  
  // Улучшенная функция для обработки кодовых блоков
  function processCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre');
    
    codeBlocks.forEach(block => {
      // Добавляем кнопку копирования
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.textContent = 'Копировать';
      
      // Добавляем возможность показывать тип языка
      const codeElement = block.querySelector('code');
      if (codeElement && codeElement.className) {
        const langMatch = codeElement.className.match(/language-(\w+)/);
        if (langMatch) {
          const langLabel = document.createElement('span');
          langLabel.className = 'code-lang';
          langLabel.textContent = langMatch[1];
          block.appendChild(langLabel);
        }
      }
      
      block.appendChild(copyButton);
      
      // Обработчик копирования
      copyButton.addEventListener('click', () => {
        const code = block.querySelector('code').textContent;
        navigator.clipboard.writeText(code)
          .then(() => {
            copyButton.textContent = 'Скопировано!';
            copyButton.classList.add('copied');
            
            setTimeout(() => {
              copyButton.textContent = 'Копировать';
              copyButton.classList.remove('copied');
            }, 2000);
          })
          .catch(err => {
            console.error('Ошибка копирования: ', err);
            copyButton.textContent = 'Ошибка';
            
            setTimeout(() => {
              copyButton.textContent = 'Копировать';
            }, 2000);
          });
      });
    });
  }
  
  // Функция для плавного скролла к якорям
  function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        if (href !== '#') {
          e.preventDefault();
          
          const targetId = this.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            const headerOffset = 80; // Учитываем высоту хедера + немного отступа
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            
            // Добавляем состояние в историю браузера
            history.pushState(null, null, `#${targetId}`);
          }
        }
      });
    });
    
    // Проверяем, есть ли якорь при загрузке страницы
    if (window.location.hash) {
      setTimeout(() => {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const headerOffset = 80;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }
  
  // Функция для обработки скролла и скрытия/показа хедера
  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Скрываем/показываем хедер при скролле
    if (scrollTop > 100) {
      if (scrollTop > lastScrollTop) {
        // Скролл вниз
        header.classList.add('header-hidden');
      } else {
        // Скролл вверх
        header.classList.remove('header-hidden');
      }
    } else {
      header.classList.remove('header-hidden');
    }
    
    lastScrollTop = scrollTop;
    
    // Подсвечиваем текущий раздел в оглавлении
    highlightTocOnScroll();
  }
  
  // Подсвечиваем текущий раздел в оглавлении при скролле
  function highlightTocOnScroll() {
    const headings = contentElement.querySelectorAll('h2, h3');
    const tocLinks = document.querySelectorAll('#toc a');
    if (!tocLinks.length) return;
    
    let current = '';
    
    headings.forEach(heading => {
      const sectionTop = heading.offsetTop;
      const sectionHeight = heading.offsetHeight;
      const scrollPosition = window.scrollY + 100; // Смещение для лучшего UX
      
      if (sectionTop <= scrollPosition && sectionTop + sectionHeight > scrollPosition) {
        current = heading.id;
      }
    });
    
    tocLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }
  
  // Добавление обработчиков событий
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', toggleSidebar);
    document.addEventListener('click', handleDocumentClick);
  }
  
  // Настройка скролла
  window.addEventListener('scroll', handleScroll);
  
  // Установка активной ссылки
  setActiveLink();
  
  // Добавление анимации к содержимому
  if (contentElement) {
    contentElement.classList.add('fade-in');
    
    // Добавляем якори к заголовкам
    addHeadingAnchors();
    
    // Создаем оглавление
    createTableOfContents();
    
    // Обрабатываем кодовые блоки
    processCodeBlocks();
    
    // Настраиваем плавный скролл
    setupSmoothScrolling();
  }
  
  // Обеспечиваем поддержку прокрутки на мобильных устройствах
  if (window.innerWidth <= 768) {
    document.body.addEventListener('touchstart', function(e) {
      if (e.target.closest('.sidebar') || e.target.closest('#sidebar-toggle')) {
        return;
      }
      
      if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        
        if (sidebarToggle) {
          sidebarToggle.classList.remove('active');
        }
      }
    });
  }
  
  // Добавляем класс, когда загрузка завершена
  document.body.classList.add('docs-loaded');
}); 