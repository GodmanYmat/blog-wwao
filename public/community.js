const serverURL = document.querySelector('meta[name="waline-server-url"]')?.content;
const comments = document.querySelector('[data-comment-path]');
// Use the generated article URL, including its trailing slash, for every alias.
// A new domain, query string or /index.html must not create a new discussion.
const articlePath = comments?.dataset.commentPath;
const isLocalPreview = /^(localhost|127(?:\.\d+){3}|\[?::1\]?)$/.test(location.hostname)
  || location.hostname.endsWith('.localhost');

// Names are a friendly label, not an account or a unique visitor identifier.
const createGuestNickname = () => {
  const moods = ['散步的', '听风的', '看云的', '路过的', '慢悠悠的', '晒太阳的', '读书的', '追月的'];
  const friends = ['云雀', '山雀', '松鼠', '小鹿', '白鹭', '海獭', '小熊', '刺猬'];
  const pick = values => values[Math.floor(Math.random() * values.length)];
  return `${pick(moods)}${pick(friends)}${Math.floor(1000 + Math.random() * 9000)}`;
};

const prepareGuestProfile = () => {
  const defaultNickname = createGuestNickname();
  let nickname = defaultNickname;
  // Waline 3.16.1 reads these keys when its module is first imported.
  // Clear hidden contact fields and the old frontend session so guest comments
  // cannot silently reuse an email or account from the previous form.
  try {
    let previous;
    try { previous = JSON.parse(localStorage.getItem('WALINE_USER_META') || '{}'); } catch {}
    if (typeof previous?.nick === 'string' && previous.nick.trim()) {
      nickname = previous.nick.trim();
    }
    localStorage.removeItem('WALINE_USER');
    localStorage.setItem('WALINE_USER_META', JSON.stringify({nick: nickname, mail: '', link: ''}));
  } catch {
    // With storage blocked, Waline still uses locale.anonymous for a blank name.
  }
  return defaultNickname;
};

if (serverURL) {
  if (document.querySelector('.waline-pageview-count')) {
    import('/vendor/waline/pageview.js').then(({ pageviewCount }) => {
      pageviewCount({
        serverURL,
        path: articlePath || location.pathname,
        lang: 'zh-CN',
        // Listing pages only read counts. Local previews never add visits.
        update: Boolean(articlePath) && !isLocalPreview,
      });
    }).catch(() => {
      // Keep the em dash on failure; an unavailable counter is not zero.
      document.querySelectorAll('.waline-pageview-count').forEach(el => {
        el.title = '浏览量暂时无法加载';
      });
    });
  }

  if (comments) {
    const status = comments.querySelector('[data-comment-status]');
    const retry = comments.querySelector('[data-comment-retry]');
    const previewNote = comments.querySelector('[data-preview-note]');
    previewNote.hidden = !isLocalPreview;
    let loading = false;
    let instance;

    const loadComments = async () => {
      if (loading || instance) return;
      loading = true;
      retry.hidden = true;
      status.hidden = false;
      status.textContent = '正在加载评论…';
      try {
        const guestNickname = prepareGuestProfile();
        const { init } = await import('/vendor/waline/waline.js');
        instance = init({
          el: '#waline',
          serverURL,
          path: articlePath,
          lang: 'zh-CN',
          dark: 'html[data-theme="dark"]',
          meta: ['nick'],
          requiredMeta: [],
          login: 'disable',
          pageSize: 10,
          // Counting happens once above, independently of lazy loading.
          pageview: false,
          comment: false,
          imageUploader: false,
          search: false,
          emoji: false,
          locale: {
            nick: '昵称（可选）',
            anonymous: guestNickname,
            placeholder: '想说些什么？直接留言就好。',
          },
        });
        status.hidden = true;
      } catch {
        status.textContent = '评论暂时没有加载成功，请稍后重试。';
        retry.hidden = false;
      } finally {
        loading = false;
      }
    };

    retry.addEventListener('click', loadComments);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          loadComments();
        }
      }, { rootMargin: '400px' });
      observer.observe(comments);
    } else {
      loadComments();
    }
  }
}
