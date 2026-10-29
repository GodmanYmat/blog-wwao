(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const header = $('#site-header');
  const backTop = $('.back-top');
  const progress = $('.reading-progress');
  const homeReel = $('[data-reel]');
  const onScroll = () => {
    // Keep non-overlay headers in flow to avoid a layout jump on inner pages.
    if (header.classList.contains('over-hero')) {
      const overReel = homeReel && homeReel.getBoundingClientRect().bottom > header.offsetHeight;
      header.classList.toggle('scrolled', homeReel ? !overReel : scrollY > 90);
      header.classList.toggle('reel-header', Boolean(overReel && scrollY > 0));
    }
    backTop.hidden = scrollY < 500;
    if (progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
    }
  };
  addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  backTop.addEventListener('click', () => scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  $('.theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {localStorage.setItem('blog-theme', next)} catch {}
    $('.theme-toggle').setAttribute('aria-label', next === 'dark' ? '切换浅色模式' : '切换深色模式');
  });
  const menu = $('.menu-toggle');
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '收起导航' : '展开导航');
    $('#mobile-nav').hidden = !open;
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#mobile-nav').hidden) {
      $('#mobile-nav').hidden = true;
      menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label','展开导航');
      menu.focus();
    }
  });

  const filterPosts = value => {
    const available = $$('.filter-chip').map(b=>b.dataset.filter);
    value = available.includes(value) ? value : 'all';
    $$('.post-card').forEach(card => card.hidden = value !== 'all' && card.dataset.category !== value);
    $$('.filter-chip').forEach(b => {
      const active = b.dataset.filter === value;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
  };
  $$('.filter-chip').forEach(b => b.addEventListener('click',()=>{
    filterPosts(b.dataset.filter);
    const url = new URL(location.href);
    if (b.dataset.filter === 'all') url.searchParams.delete('category'); else url.searchParams.set('category',b.dataset.filter);
    history.replaceState(null,'',url);
  }));
  if ($('.posts-grid')) filterPosts(new URL(location.href).searchParams.get('category') || 'all');

  const filterTags = value => {
    const available = $$('.tag-button').map(b=>b.dataset.tag);
    value = available.includes(value) ? value : 'all';
    $$('.tag-button').forEach(b=>{
      const active = b.dataset.tag===value;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    $$('.tag-post').forEach(p=>p.hidden = value !== 'all' && !JSON.parse(p.dataset.tags).includes(value));
    if ($('.tag-result-label')) $('.tag-result-label').textContent = `${value==='all'?'全部记录':'# '+value} · ${$$('.tag-post').filter(p=>!p.hidden).length} 篇`;
  };
  $$('.tag-button').forEach(b=>b.addEventListener('click',()=>{
    filterTags(b.dataset.tag);
    const url=new URL(location.href);
    if(b.dataset.tag==='all') url.searchParams.delete('tag'); else url.searchParams.set('tag',b.dataset.tag);
    history.replaceState(null,'',url);
  }));
  if ($('.tag-cloud')) filterTags(new URL(location.href).searchParams.get('tag') || 'all');

  const dialog=$('.search-dialog');
  const input=$('#search-input');
  const results=$('.search-results');
  let index=null;
  let loading=null;
  const loadSearch = async () => {
    if (index) return index;
    if (!loading) loading = fetch('/search.json').then(r=>{if(!r.ok) throw new Error('search');return r.json()}).then(data=>index=data).finally(()=>loading=null);
    return loading;
  };
  const renderSearch = async () => {
    const query=input.value.trim().toLocaleLowerCase();
    try {
      const posts=await loadSearch();
      if(query!==input.value.trim().toLocaleLowerCase()) return;
      const matches=posts.filter(p=>!query || [p.title,p.summary,p.category,p.tags.join(' '),p.content].join(' ').toLocaleLowerCase().includes(query));
      results.replaceChildren();
      $('.search-count').textContent=query?`找到 ${matches.length} 篇记录`:`全部 ${posts.length} 篇记录`;
      if(!matches.length){const p=document.createElement('p');p.className='search-empty';p.textContent='暂时没有找到，换个关键词试试。';results.append(p);return}
      for(const p of matches){
        const a=document.createElement('a');a.className='search-result';a.href=p.url;
        const label=document.createElement('span');label.textContent=`${p.category} / ${p.date.replaceAll('-','.')}`;
        const h=document.createElement('h3');h.textContent=p.title;
        const summary=document.createElement('p');summary.textContent=p.summary;
        a.append(label,h,summary);results.append(a);
      }
    } catch {
      $('.search-count').textContent='搜索暂时没有加载成功';
      results.replaceChildren();
      const p=document.createElement('p');p.className='search-empty';p.textContent='请检查网络后重新打开搜索。也可以前往归档浏览全部文章。';results.append(p);
    }
  };
  $$('.search-trigger').forEach(button=>button.addEventListener('click',()=>{
    dialog.showModal();input.value='';input.focus();renderSearch();
  }));
  $('.search-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
  input.addEventListener('input',renderSearch);
  let toastTimeout;
  const toast = text => {
    $('.toast').textContent=text;$('.toast').classList.add('visible');
    clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('.toast').classList.remove('visible'),2600);
  };
  const copy=$('.copy-link');
  if(copy) copy.addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(location.origin+location.pathname);toast('文章链接已复制。')}
    catch {toast('复制失败，请从浏览器地址栏复制链接。')}
  });
  if($('.toc') && 'IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting) $$('.toc nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));
      });
    },{rootMargin:'-15% 0px -65% 0px'});
    $$('.prose h2').forEach(h=>observer.observe(h));
  }
})();
