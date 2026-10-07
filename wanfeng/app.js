(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reader = $('#reader');
  const loadingState = $('#loading-state');
  const errorState = $('#error-state');
  const searchInput = $('#search-input');
  const searchResults = $('#search-results');
  const searchResultsList = $('#search-results-list');
  const sidebar = $('#sidebar');
  let currentChapter = -1;

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  const numberLabel = (index) => String(index + 1).padStart(2, '0');
  const chapterHash = (index) => `chapter-${index + 1}`;
  const readingMinutes = (text) => Math.max(1, Math.round(text.length / 420));
  const STORY_PHASES = {
    blush: { id: 'blush', label: '晚风微甜' },
    ache: { id: 'ache', label: '雨季失重' },
    dawn: { id: 'dawn', label: '天光渐亮' }
  };
  const CHAPTER_ILLUSTRATIONS = {
    0: [{ src: 'chapter-01.jpg', after: '我一下子慌了', alt: '教室里，男生拿着背诵检查名单，女生站在课桌旁', caption: '名单上的对勾迟了一点，也让这段记忆停得更久。' }],
    1: [{ src: 'chapter-02.jpg', after: '程明夏站在那里', alt: '女生站在高中教室门口，男生从座位上望向她', caption: '她站在新教室门口，把他重新算进“我们几个”里面。' }],
    2: [{ src: 'chapter-03.jpg', after: '我忽然觉得，这里很浪漫', alt: '县城披萨店里，少年望向靠窗的一张空桌', caption: '那张没有等到她的桌子，陪他走过了整个高中。' }],
    3: [{ src: 'chapter-04.jpg', after: '暗恋许宁', alt: '模考教室里，男生望着墙上写有暗恋字样的红纸', caption: '三行红纸上的字，让一个人的兵荒马乱忽然有了名字。' }],
    4: [{ src: 'chapter-05.jpg', after: '她穿了一条白色长裙', alt: '毕业季，穿白裙的女生和白衬衫男生并肩站在校园里', caption: '快门只响了一次，白裙和没说出口的话都留在了那天。' }],
    5: [{ src: 'chapter-06.jpg', after: '程明夏遇到一道不会的数学题', alt: '高考前，女生和男生坐在桌边一起复习', caption: '最后一周，他们离答案很近，离那句话仍然很远。' }],
    7: [{ src: 'chapter-08.jpg', after: '我舍不得停下每天的早安晚安', alt: '熄灯后的大学宿舍里，男生躺在床上看手机', caption: '九月的屏幕微光，把普通问候照得像某种靠近。' }],
    8: [
      { src: 'chapter-09-night.jpg', after: '手机屏幕朝着脸', alt: '深夜宿舍里，男生独自坐在床沿，手机放在一旁', caption: '话终于发送出去，等待却比漫长的暗恋更安静。' },
      { src: 'chapter-09-road.jpg', after: '她坐我的车', alt: '秋日校园外，男生骑电动车载着女生经过旧学校', caption: '答案没有改变，晚风却仍把那段路吹得很温柔。' }
    ],
    11: [{ src: 'chapter-12.jpg', after: '我点开链接', alt: '窗边书桌前，男生认真用手机填写课程问卷', caption: '许多年后，他终于懂得：认真回应，也可以不再借机挽留。' }]
  };

  function phaseForChapter(index) {
    if (index <= 2) return STORY_PHASES.blush;
    if (index <= 8) return STORY_PHASES.ache;
    return STORY_PHASES.dawn;
  }

  function setStoryPhase(index) {
    document.body.dataset.storyPhase = index < 0 ? 'blush' : phaseForChapter(index).id;
  }

  function illustrationMarkup(illustration) {
    return `<figure class="story-figure">
      <div class="image-frame">
        <img src="${escapeHtml(illustration.src)}" alt="${escapeHtml(illustration.alt)}" loading="lazy" decoding="async">
        <span class="illustration-fallback">原书插图暂时无法显示</span>
      </div>
      <figcaption>${escapeHtml(illustration.caption)}</figcaption>
    </figure>`;
  }

  function renderParagraphs(chapter, index) {
    const illustrations = CHAPTER_ILLUSTRATIONS[index] || [];
    const inserted = new Set();
    const parts = [];
    chapter.paragraphs.forEach((paragraph) => {
      parts.push(`<p>${escapeHtml(paragraph)}</p>`);
      illustrations.forEach((illustration, illustrationIndex) => {
        if (!inserted.has(illustrationIndex) && paragraph.includes(illustration.after)) {
          parts.push(illustrationMarkup(illustration));
          inserted.add(illustrationIndex);
        }
      });
    });
    illustrations.forEach((illustration, illustrationIndex) => {
      if (!inserted.has(illustrationIndex)) parts.push(illustrationMarkup(illustration));
    });
    return parts.join('');
  }

  function bindIllustrationStates() {
    $$('.story-figure img').forEach((image) => {
      const markLoaded = () => image.classList.add('loaded');
      const markFailed = () => image.closest('.story-figure').classList.add('image-failed');
      if (image.complete) image.naturalWidth ? markLoaded() : markFailed();
      else {
        image.addEventListener('load', markLoaded, { once: true });
        image.addEventListener('error', markFailed, { once: true });
      }
    });
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    $('#menu-button').setAttribute('aria-expanded', 'false');
  }

  function buildToc() {
    $('#chapter-list').innerHTML = window.BOOK_CHAPTERS.map((chapter, index) => `
      <a href="#${chapterHash(index)}" class="toc-link" data-chapter="${index}">
        <span class="toc-index">${numberLabel(index)}</span><span>${escapeHtml(chapter.title)}</span>
      </a>
    `).join('');
  }

  function renderCover() {
    currentChapter = -1;
    setStoryPhase(-1);
    const totalChars = window.BOOK_CHAPTERS.reduce((sum, item) => sum + item.text.length, 0);
    reader.innerHTML = `
      <div class="cover-page">
        <div class="cover-grid">
          <div class="book-cover" aria-label="《晚风替我记得》书封">
            <p class="cover-kicker">青春暗恋小说</p>
            <h1>晚风<br>替我记得</h1>
            <span class="cover-rule"></span>
            <p class="cover-subtitle">一部关于靠近、克制与长大的青春暗恋小说</p>
            <p class="cover-author">ChatGPT · 著</p>
          </div>
          <div class="cover-copy">
            <p class="eyebrow">Online edition · 2026</p>
            <h2>有些话没有说出口，<br>风却替我们记了很多年。</h2>
            <p class="lede">从初二名单上迟到的对勾，到多年后屏幕里终于抵达的那句话。这是一个关于暗恋、错过与长大的故事。</p>
            <p class="dedication">谨以此书，纪念那些明明没有发生什么，却在心里停留了很久的时刻。</p>
            <div class="cover-actions">
              <a class="primary" href="#chapter-1">开始阅读</a>
              <a href="晚风替我记得.pdf" download>下载 PDF</a>
            </div>
            <div class="book-stats" aria-label="书籍信息">
              <span><strong>12</strong>章节</span>
              <span><strong>${Math.round(totalChars / 1000)}k</strong>字</span>
              <span><strong>青春</strong>暗恋 · 成长</span>
            </div>
          </div>
        </div>
      </div>
    `;
    updateLocation('封面与导读');
    updateActiveRoute('cover');
    updateBookProgress(0);
    document.title = '晚风替我记得 · The Evening Wind Remembers for Me｜在线电子书';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderChapter(index) {
    const chapter = window.BOOK_CHAPTERS[index];
    if (!chapter) return renderCover();
    currentChapter = index;
    setStoryPhase(index);
    const phase = phaseForChapter(index);
    const paragraphs = renderParagraphs(chapter, index);
    const previous = index > 0
      ? `<a href="#${chapterHash(index - 1)}"><small>上一章</small><strong>${escapeHtml(window.BOOK_CHAPTERS[index - 1].title)}</strong></a>`
      : `<a class="disabled" aria-disabled="true"><small>上一章</small><strong>已经是第一章</strong></a>`;
    const next = index < window.BOOK_CHAPTERS.length - 1
      ? `<a href="#${chapterHash(index + 1)}"><small>下一章</small><strong>${escapeHtml(window.BOOK_CHAPTERS[index + 1].title)}</strong></a>`
      : `<a class="disabled" aria-disabled="true"><small>下一章</small><strong>故事到这里结束</strong></a>`;
    const closingNote = index === window.BOOK_CHAPTERS.length - 1
      ? `<aside class="closing-note" aria-label="书末说明">本故事纯属虚构，除了真实的部分。</aside>`
      : '';

    reader.innerHTML = `
      <div class="chapter">
        <p class="eyebrow">Chapter ${numberLabel(index)}</p>
        <h1>${escapeHtml(chapter.title)}</h1>
        <div class="chapter-meta"><span>第 ${index + 1} / ${window.BOOK_CHAPTERS.length} 章</span><span>约 ${readingMinutes(chapter.text)} 分钟</span><span>${chapter.text.length.toLocaleString('zh-CN')} 字</span><span>${phase.label}</span></div>
        <div class="chapter-body">${paragraphs}</div>
        ${closingNote}
      </div>
      <nav class="chapter-nav" aria-label="章节翻页">${previous}${next}</nav>
    `;
    updateLocation(chapter.title);
    updateActiveRoute(chapterHash(index));
    updateBookProgress(index / window.BOOK_CHAPTERS.length * 100);
    localStorage.setItem('wind-remembers-last-chapter', String(index));
    document.title = `${chapter.title}｜晚风替我记得 · The Evening Wind Remembers for Me`;
    bindIllustrationStates();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function updateLocation(label) { $('#current-location').textContent = label; }

  function updateActiveRoute(route) {
    $$('.toc-link').forEach((link) => link.classList.toggle('active',
      route === 'cover' ? link.dataset.route === 'cover' : link.getAttribute('href') === `#${route}`));
  }

  function updateBookProgress(percent) {
    const rounded = Math.min(100, Math.max(0, Math.round(percent)));
    $('#sidebar-progress-bar').style.width = `${rounded}%`;
    $('#sidebar-progress-label').textContent = `${rounded}%`;
  }

  function route() {
    closeSidebar();
    closeSearch();
    const hash = location.hash.replace('#', '');
    const match = hash.match(/^chapter-(\d+)$/);
    if (match) renderChapter(Number(match[1]) - 1);
    else renderCover();
  }

  function performSearch(query) {
    const clean = query.trim();
    if (!clean) return closeSearch();
    const lowered = clean.toLocaleLowerCase('zh-CN');
    const matches = [];
    window.BOOK_CHAPTERS.forEach((chapter, index) => {
      const source = chapter.text.toLocaleLowerCase('zh-CN');
      let cursor = 0;
      while ((cursor = source.indexOf(lowered, cursor)) !== -1 && matches.length < 40) {
        const start = Math.max(0, cursor - 42);
        const end = Math.min(chapter.text.length, cursor + clean.length + 72);
        matches.push({ index, excerpt: chapter.text.slice(start, end), localIndex: cursor - start });
        cursor += clean.length;
      }
    });
    $('#search-results-title').textContent = `“${clean}” · ${matches.length} 处`;
    if (!matches.length) {
      searchResultsList.innerHTML = `<div class="empty-search"><strong>没有找到相关文字</strong><span>换一个关键词试试，例如“晚风”或“程明夏”。</span></div>`;
    } else {
      searchResultsList.innerHTML = matches.map((match) => {
        const excerpt = escapeHtml(match.excerpt);
        const escapedQuery = escapeHtml(clean);
        const highlighted = excerpt.replace(new RegExp(escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '<mark>$&</mark>');
        return `<a class="search-result" href="#${chapterHash(match.index)}"><h3>${numberLabel(match.index)} · ${escapeHtml(window.BOOK_CHAPTERS[match.index].title)}</h3><p>…${highlighted}…</p></a>`;
      }).join('');
    }
    reader.hidden = true;
    searchResults.hidden = false;
    searchResults.scrollIntoView({ block: 'start' });
  }

  function closeSearch() {
    searchResults.hidden = true;
    if (reader) reader.hidden = false;
  }

  function setFontSize(size) {
    document.documentElement.style.setProperty('--font-size', `${size}px`);
    $$('[data-font]').forEach((button) => button.classList.toggle('selected', button.dataset.font === String(size)));
    localStorage.setItem('wind-remembers-font-size', String(size));
  }

  function setTheme(theme) {
    document.body.classList.toggle('story', theme === 'story');
    document.body.classList.toggle('night', theme === 'night');
    $$('[data-theme]').forEach((button) => button.classList.toggle('selected', button.dataset.theme === theme));
    localStorage.setItem('wind-remembers-theme-v2', theme);
  }

  function setReadingFont(font) {
    const selected = font === 'wenkai' ? 'wenkai' : 'song';
    document.body.classList.toggle('reading-font-wenkai', selected === 'wenkai');
    $$('[data-reading-font]').forEach((button) => button.classList.toggle('selected', button.dataset.readingFont === selected));
    localStorage.setItem('wind-remembers-reading-font', selected);
  }

  function bindEvents() {
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', () => {
      const available = document.documentElement.scrollHeight - innerHeight;
      const pagePercent = available > 0 ? scrollY / available * 100 : 0;
      $('#reading-progress-bar').style.width = `${pagePercent}%`;
      if (currentChapter >= 0) updateBookProgress((currentChapter + pagePercent / 100) / window.BOOK_CHAPTERS.length * 100);
    }, { passive: true });

    $('#menu-button').addEventListener('click', () => {
      document.body.classList.add('sidebar-open');
      $('#menu-button').setAttribute('aria-expanded', 'true');
    });
    $('#sidebar-close').addEventListener('click', closeSidebar);
    $('#sidebar-scrim').addEventListener('click', closeSidebar);

    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => performSearch(searchInput.value), 180);
    });
    $('#search-close').addEventListener('click', () => { searchInput.value = ''; closeSearch(); });
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (innerWidth <= 900) document.body.classList.add('sidebar-open');
        searchInput.focus();
      }
      if (event.key === 'Escape') {
        closeSidebar(); closeSearch();
        $('#settings-panel').hidden = true;
        $('#settings-button').setAttribute('aria-expanded', 'false');
      }
    });

    $('#settings-button').addEventListener('click', (event) => {
      event.stopPropagation();
      const panel = $('#settings-panel');
      panel.hidden = !panel.hidden;
      $('#settings-button').setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.settings-anchor')) {
        $('#settings-panel').hidden = true;
        $('#settings-button').setAttribute('aria-expanded', 'false');
      }
    });
    $$('[data-font]').forEach((button) => button.addEventListener('click', () => setFontSize(button.dataset.font)));
    $$('[data-reading-font]').forEach((button) => button.addEventListener('click', () => setReadingFont(button.dataset.readingFont)));
    $$('[data-theme]').forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.theme)));
    $('#focus-button').addEventListener('click', () => {
      const enabled = document.body.classList.toggle('focus-mode');
      $('#focus-button').setAttribute('aria-pressed', String(enabled));
      $('#focus-button').textContent = enabled ? '退出专注' : '专注阅读';
    });
  }

  function init() {
    try {
      if (!Array.isArray(window.BOOK_CHAPTERS) || !window.BOOK_CHAPTERS.length) throw new Error('No chapter data');
      buildToc();
      setFontSize(localStorage.getItem('wind-remembers-font-size') || 19);
      setReadingFont(localStorage.getItem('wind-remembers-reading-font') || 'song');
      setTheme(localStorage.getItem('wind-remembers-theme-v2') || 'story');
      bindEvents();
      loadingState.hidden = true;
      reader.hidden = false;
      route();
    } catch (error) {
      console.error(error);
      loadingState.hidden = true;
      reader.hidden = true;
      errorState.hidden = false;
    }
  }

  init();
})();

