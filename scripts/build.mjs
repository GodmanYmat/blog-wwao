import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { format } from 'prettier';
import config from '../site.config.mjs';
import { renderHomeReel } from './home-reel.mjs';

const out = path.resolve('dist');
fs.mkdirSync(out, {recursive:true});
fs.cpSync('public', out, {recursive:true});
const communityEnabled = Boolean(config.waline?.serverURL);
if (communityEnabled) {
  // Copy the full, browser-ready client; no CDN or bundler is required.
  const vendor = path.join(out, 'vendor/waline');
  fs.mkdirSync(vendor, {recursive:true});
  const client = new URL('../node_modules/@waline/client/dist/', import.meta.url);
  for (const file of ['waline.js', 'waline.css', 'pageview.js']) {
    fs.copyFileSync(new URL(file, client), path.join(vendor, file));
    fs.copyFileSync(new URL(file + '.map', client), path.join(vendor, file + '.map'));
  }
}
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  github:'<path fill="currentColor" stroke="none" d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.93 0-1.31.465-2.381 1.235-3.221-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.404c1.02.005 2.045.138 3 .404 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.911 1.23 3.221 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.373 18.627 0 12 0Z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  down:'<path d="m7 10 5 5 5-5"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20 13.3A8 8 0 0 1 10.7 4 8 8 0 1 0 20 13.3Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  leaf:'<path d="M5 19c-3-11 4-14 14-14 0 10-3 17-14 14Zm0 0L15 9"/>',
  code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  mountain:'<path d="m2 20 8-15 6 10 3-5 4 10H2Zm5-9 3 2 3-2"/>',
  feather:'<path d="M5 20 16 9M8 17c-3-10 6-15 11-12 4 6-2 14-11 12Zm4-4h6"/>',
  rss:'<circle cx="5" cy="19" r="1"/><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  link:'<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)"/>',
  up:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
  book:'<path d="M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H3V4Zm18 0h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h5V4Z"/>'
};
const icon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.leaf}</svg>`;
const categoryIcon = cat => cat==='技术手记'?'code':cat==='沿途风景'?'mountain':'leaf';
const categoryEnglish = cat => cat==='技术手记'?'CODE & IDEAS':cat==='沿途风景'?'ON THE ROAD':'LITTLE MOMENTS';
const posts = fs.readdirSync('content/posts').filter(f=>f.endsWith('.md')).map(file=>{
  const source = fs.readFileSync(path.join('content/posts',file),'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`文章缺少元数据: ${file}`);
  const meta = Object.fromEntries(match[1].split('\n').filter(Boolean).map(line=>{const i=line.indexOf(':');return [line.slice(0,i),line.slice(i+1).trim()]}));
  const content=match[2].trim();
  const slug = file.replace(/\.md$/,'');
  const headings=[];
  const renderer=new marked.Renderer();
  renderer.heading = ({tokens,depth})=>{
    const text=marked.Parser.parseInline(tokens);
    const id=`section-${headings.length+1}`;
    if (depth===2) headings.push({text,id});
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  return {...meta,slug,url:`/posts/${slug}/`,tags:meta.tags.split(',').map(t=>t.trim()),body:marked.parse(content,{renderer}),content,headings,minutes:Math.max(1,Math.ceil(content.replace(/\s/g,'').length/400))};
}).sort((a,b)=>b.date.localeCompare(a.date));
const tags=[...new Set(posts.flatMap(p=>p.tags))];
const htmlFiles = [];
const write = (name, value) => {
  const file = path.join(out, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
  if (name.endsWith('.html')) htmlFiles.push(file);
};
const logo=`<span class="brand-mark" aria-hidden="true">${icon('feather')}</span><span>${esc(config.title)}<small>STILL A STORY TO TELL</small></span>`;
const header = (active='home',overlay=false)=>`<header class="site-header ${overlay?'over-hero':''}" id="site-header"><div class="nav-wrap"><a class="brand" href="/" aria-label="${esc(config.title)}首页">${logo}</a><nav class="desktop-nav" aria-label="主导航">${[['home','/','首页'],['archives','/archives/','归档'],['tags','/tags/','标签'],['about','/about/','关于']].map(([id,url,label])=>`<a href="${url}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="nav-tools"><button class="icon-button search-trigger" aria-label="搜索文章" title="搜索文章">${icon('search')}</button><span class="tool-divider"></span><button class="icon-button theme-toggle" aria-label="切换深色模式" title="切换深色模式"><span class="sun-icon">${icon('sun')}</span><span class="moon-icon">${icon('moon')}</span></button><button class="icon-button menu-toggle" aria-label="展开导航" aria-expanded="false" aria-controls="mobile-nav">${icon('menu')}</button></div></div><nav class="mobile-nav" id="mobile-nav" aria-label="手机导航" hidden><a href="/">首页</a><a href="/archives/">归档</a><a href="/tags/">标签</a><a href="/about/">关于</a></nav></header>`;
const footer=()=>`<footer class="site-footer"><div class="footer-inner"><a href="/" class="footer-brand">${icon('feather')} ${esc(config.title)}</a><p>慢慢记录，慢慢生长。</p><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(config.title)}<span class="footer-dot">·</span>用文字留住时间</span><div><a href="/about/">关于本站</a><a href="/feed.xml">${icon('rss')} RSS 订阅</a></div></div></div></footer><button class="back-top icon-button" aria-label="返回顶部" title="返回顶部" hidden>${icon('up')}</button>`;
const search=()=>`<dialog class="search-dialog" aria-labelledby="search-heading"><div class="search-top"><div><span class="eyebrow">FIND A LITTLE SOMETHING</span><h2 id="search-heading">找一篇记录</h2></div><button class="icon-button search-close" aria-label="关闭搜索">${icon('close')}</button></div><label class="search-input-wrap">${icon('search')}<input type="search" id="search-input" placeholder="搜索标题、标签或正文…" autocomplete="off" aria-label="搜索关键词"><kbd>ESC</kbd></label><p class="search-count" aria-live="polite"></p><div class="search-results"></div><p class="search-hint">按 Esc 关闭</p></dialog><div class="toast" role="status" aria-live="polite"></div>`;
const layout=({title,description,body,active='home',overlay=false,image='/assets/hero.jpg',noindex=false,styles=[],community=false,article=false})=>`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#36594b"><meta name="author" content="${esc(config.author || config.title)}"><title>${esc(title?title+' · '+config.title:config.title+' · '+config.subtitle)}</title><meta name="description" content="${esc(description||config.description)}"><meta name="robots" content="${config.demo||noindex?'noindex, nofollow':'index, follow'}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title||config.title)}"><meta property="og:description" content="${esc(description||config.description)}"><meta property="og:image" content="${config.origin}${image}"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><link rel="alternate" type="application/rss+xml" title="${esc(config.title)}" href="/feed.xml"><link rel="stylesheet" href="/style.css">${communityEnabled && community?`<meta name="waline-server-url" content="${esc(config.waline.serverURL)}">${article?'<link rel="stylesheet" href="/vendor/waline/waline.css">':''}<script type="module" src="/community.js"></script>`:''}${community?'<link rel="stylesheet" href="/community.css">':''}${styles.map(href=>`<link rel="stylesheet" href="${esc(href)}">`).join('')}<script>try{const t=localStorage.getItem('blog-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}</script><script src="/motion.js" defer></script><script src="/app.js" defer></script></head><body><a class="skip-link" href="#main">跳转至正文</a>${header(active,overlay)}${body}${footer()}${search()}</body></html>`;
const views = p => communityEnabled && config.waline.pageview !== false
  ? `<span class="view-count">${icon('eye')}<span class="waline-pageview-count" data-path="${esc(p.url)}">—</span> 次浏览</span>`
  : '';
const commentSection = p => communityEnabled ? `<section class="article-comments" id="comments" data-comment-path="${esc(p.url)}" aria-labelledby="comments-heading"><div class="comments-heading"><span class="eyebrow">LEAVE A LITTLE THOUGHT</span><h2 id="comments-heading">留言<span class="heading-dot">.</span></h2><p>无需注册或邮箱，写下想法就好。</p></div><p class="comments-preview" data-preview-note hidden>本地预览不会增加浏览量；这里连接的是线上评论，提交后会真实保存。</p><p class="comments-status" data-comment-status role="status">评论将在滚动到这里时加载。</p><button class="comments-retry" type="button" data-comment-retry hidden>重新加载评论</button><div id="waline"></div><noscript><p class="comments-status">开启 JavaScript 后即可查看评论和留言。</p></noscript></section>` : '';
const card=(p,i)=>`<article class="post-card" data-category="${esc(p.category)}"><a class="card-cover" href="${p.url}" aria-label="阅读：${esc(p.title)}"><img src="${p.cover}" alt="${esc(p.category)}文章配图" width="800" height="480" loading="lazy"><span class="cover-label">${categoryEnglish(p.category)}</span>${p.featured?`<span class="featured-badge">${icon('feather')} 置顶</span>`:''}<span class="cover-arrow">${icon('arrow')}</span></a><div class="card-body"><div class="card-meta"><span class="category">${icon(categoryIcon(p.category))}${esc(p.category)}</span><span>${p.date.replaceAll('-','.')}</span></div><h3><a href="${p.url}">${esc(p.title)}</a></h3><p class="card-summary">${esc(p.summary)}</p><div class="card-bottom"><div class="card-tags">${p.tags.slice(0,2).map(t=>`<a href="/tags/?tag=${encodeURIComponent(t)}"># ${esc(t)}</a>`).join('')}</div><div class="card-stats"><span>${p.minutes} 分钟阅读</span>${views(p)}</div></div></div></article>`;
const sidebar=()=>`<aside class="sidebar" aria-label="博客介绍"><section class="profile-card"><div class="profile-art"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><div class="profile-monogram">未<span>完</span></div><span class="tiny-star">✳</span></div><span class="eyebrow">A LITTLE ABOUT HERE</span><h2>你好，欢迎来坐坐。</h2><p>${esc(config.intro)}</p><a class="text-link" href="/about/">关于这个角落 ${icon('arrow')}</a><div class="profile-stats"><a href="/archives/"><strong>${posts.length.toString().padStart(2,'0')}</strong><span>篇记录</span></a><a href="/tags/"><strong>${config.categories.length.toString().padStart(2,'0')}</strong><span>个分类</span></a><a href="/tags/#tag-list"><strong>${tags.length.toString().padStart(2,'0')}</strong><span>个标签</span></a></div></section><section class="sidebar-section"><h3><span>探索分类</span><span class="small-label">EXPLORE</span></h3><div class="category-list">${config.categories.map(c=>`<a href="/?category=${encodeURIComponent(c)}#articles"><span>${icon(categoryIcon(c))}${c}</span><span>${String(posts.filter(p=>p.category===c).length).padStart(2,'0')}</span></a>`).join('')}</div></section><section class="quote-card">${icon('leaf')}<p>不必等一切准备好，<br>就从今天的一点点开始。</p><span>A NOTE TO MYSELF</span></section><a href="/feed.xml" class="rss-link">${icon('rss')} 订阅新的记录 ${icon('arrow')}</a></aside>`;

write('index.html',layout({overlay:true,community:true,styles:['/home-reel.css'],body:`<main id="main">${renderHomeReel({posts,config,icon,esc})}<div class="main-wrap"><div class="journal-intro"><div class="intro-icon">${icon('feather')}</div><p>生活不止眼前，也在每一个被记下的瞬间里。</p><span>THE LITTLE THINGS MATTER.</span></div><div class="blog-layout"><section class="posts-section" id="articles" aria-labelledby="posts-heading"><div class="section-heading"><div><span class="eyebrow">THE JOURNAL</span><h2 id="posts-heading">最近的记录<span class="heading-dot">.</span></h2></div></div><div class="filter-row" role="group" aria-label="按分类筛选"><button class="filter-chip active" data-filter="all" aria-pressed="true">全部记录 <span>${posts.length}</span></button>${config.categories.map(c=>`<button class="filter-chip" data-filter="${c}" aria-pressed="false">${c}</button>`).join('')}</div><div class="posts-grid">${posts.map(card).join('')}</div><div class="end-note"><span></span>${icon('leaf')}<p>写到这里，故事还在继续</p><span></span></div></section>${sidebar()}</div></div></main>`}));

const pageHero=(eyebrow,title,description)=>`<section class="page-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}<span class="heading-dot">.</span></h1><p>${description}</p></section>`;
write('archives/index.html',layout({title:'时光归档',active:'archives',community:true,body:`<main id="main" class="inner-main">${pageHero('EVERY STORY HAS A DATE','时光归档','把零散的日子，串成一条慢慢向前的线。')}<div class="archive-wrap"><div class="archive-year"><span>2026</span><small>${posts.length} 篇记录</small></div><div class="timeline">${posts.map(p=>`<article class="timeline-item"><time datetime="${p.date}">${p.date.slice(5).replace('-',' / ')}</time><span class="timeline-dot"></span><a class="timeline-content" href="${p.url}"><span class="category">${p.category}</span><h2>${esc(p.title)}</h2><p>${esc(p.summary)}</p><span class="timeline-read">${p.minutes} 分钟阅读 ${views(p)} ${icon('arrow')}</span></a></article>`).join('')}</div><p class="archive-end">每一篇，都是时间留下的小小坐标。</p></div></main>`}));
write('tags/index.html',layout({title:'分类与标签',active:'tags',community:true,body:`<main id="main" class="inner-main">${pageHero('FOLLOW YOUR CURIOSITY','分类与标签','跟着一个词语，找到另一段故事。')}<section class="tags-wrap"><div class="category-tiles">${config.categories.map(c=>`<a class="category-tile" href="/?category=${encodeURIComponent(c)}#articles">${icon(categoryIcon(c))}<span>${categoryEnglish(c)}</span><h2>${c}</h2><p>${posts.filter(p=>p.category===c).length} 篇记录 ${icon('arrow')}</p></a>`).join('')}</div><div class="tag-section" id="tag-list"><div class="section-heading"><h2>所有标签</h2><span class="small-label">LITTLE CONNECTIONS</span></div><div class="tag-cloud" role="group" aria-label="标签筛选"><button data-tag="all" class="tag-button active" aria-pressed="true">全部 <span>${posts.length}</span></button>${tags.map(t=>`<button class="tag-button" data-tag="${esc(t)}" aria-pressed="false"># ${esc(t)} <span>${posts.filter(p=>p.tags.includes(t)).length}</span></button>`).join('')}</div><p class="tag-result-label" aria-live="polite">全部记录 · ${posts.length} 篇</p><div class="tag-results">${posts.map(p=>`<a class="tag-post" href="${p.url}" data-tags="${esc(JSON.stringify(p.tags))}"><time>${p.date.replaceAll('-','.')}</time><h3>${esc(p.title)}</h3>${views(p)}${icon('arrow')}</a>`).join('')}</div></div></section></main>`}));
write('about/index.html',layout({title:'关于这里',active:'about',body:`<main id="main" class="inner-main">${pageHero('A SMALL CORNER OF THE INTERNET','关于这里','一处可以慢下来，也可以重新出发的地方。')}<div class="about-wrap"><div class="about-picture"><img src="/assets/trail.jpg" alt="阳光穿过绿色树叶，照亮安静的林间" width="1000" height="1200"><span>KEEP A LITTLE ROOM<br>FOR THE UNEXPECTED.</span></div><article class="about-copy"><span class="eyebrow">HELLO, WORLD</span><h2>你好，<br>很高兴在这里遇见你。</h2><p>这是「${esc(config.title)}」，一个用来收藏文字的小小角落。生活里的片段，学习中的发现，还有那些尚未想明白的事情，都可以慢慢写在这里。</p><p>比起一个完整的答案，更想留下思考的过程。比起赶着抵达，更愿意记得沿途的风景。</p><blockquote>保持好奇，保持记录。<br>让普通的日子，也有被看见的时刻。</blockquote><h3>你会在这里看到</h3><div class="about-categories">${config.categories.map(c=>`<a href="/?category=${encodeURIComponent(c)}#articles">${icon(categoryIcon(c))}${c}</a>`).join('')}</div>${config.github || config.email ? `<div class="about-links" aria-label="联系与社交">${config.github?`<a class="text-link about-social-link" href="${esc(config.github)}" rel="me noopener" target="_blank">${icon('github')}<span>GitHub</span>${icon('arrow')}</a>`:''}${config.email?`<a class="text-link about-social-link" href="mailto:${esc(config.email)}">${icon('mail')}<span>联系我</span>${icon('arrow')}</a>`:''}</div>`:''}</article></div></main>`}));

for (let i=0;i<posts.length;i++) {
  const p=posts[i];const next=posts[(i+1)%posts.length];
  write(`posts/${p.slug}/index.html`,layout({title:p.title,description:p.summary,image:p.cover,community:true,article:true,body:`<main id="main" class="article-main"><div class="article-cover"><img src="${p.cover}" alt="${esc(p.category)}文章配图" width="1800" height="900" fetchpriority="high"><div class="article-cover-shade"></div><div class="article-title"><a class="article-back" href="/#articles">← 返回全部记录</a><span class="eyebrow">${categoryEnglish(p.category)}</span><h1>${esc(p.title)}</h1><div class="article-meta"><time datetime="${p.date}">${p.date.replaceAll('-','.')}</time><span>·</span><span>${icon('clock')}${p.minutes} 分钟阅读</span><span>·</span><a href="/?category=${encodeURIComponent(p.category)}#articles">${p.category}</a>${views(p)?`<span>·</span>${views(p)}`:''}${communityEnabled?'<span>·</span><a href="#comments">留言</a>':''}</div></div></div><div class="article-layout"><article class="article-content"><p class="article-lead">${esc(p.summary)}</p><div class="prose">${p.body}</div><div class="article-end">${icon('leaf')}<span>谢谢你读到这里。</span></div><div class="article-tools"><div class="card-tags">${p.tags.map(t=>`<a href="/tags/?tag=${encodeURIComponent(t)}"># ${t}</a>`).join('')}</div><button class="copy-link">${icon('link')} 复制文章链接</button></div>${commentSection(p)}<a class="next-article" href="${next.url}"><span class="eyebrow">ANOTHER LITTLE STORY</span><h2>${esc(next.title)}</h2><span>继续阅读 ${icon('arrow')}</span></a></article><aside class="article-sidebar"><div class="toc"><h2>这篇文章里</h2><nav aria-label="文章目录">${p.headings.map(h=>`<a href="#${h.id}">${h.text}</a>`).join('')}</nav><a href="/#articles" class="toc-back">← 所有记录</a></div></aside></div><div class="reading-progress" aria-hidden="true"></div></main>`}));
}
write('404.html',layout({title:'迷路了',noindex:true,body:`<main id="main" class="not-found"><span class="eyebrow">A LITTLE DETOUR</span><div class="error-number">404</div><h1>这条小路，暂时还没写到。</h1><p>也许链接有误，或故事搬了个位置。</p><a href="/" class="button button-green">回到首页 ${icon('arrow')}</a></main>`}));
write('search.json',JSON.stringify(posts.map(({title,url,category,tags,summary,content,date})=>({title,url,category,tags,summary,content,date}))));
write('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(config.title)}</title><link>${config.origin}/</link><description>${esc(config.description)}</description><language>zh-CN</language>${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${config.origin}${p.url}</link><guid>${config.origin}${p.url}</guid><description>${esc(p.summary)}</description><pubDate>${new Date(p.date+'T00:00:00+08:00').toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/archives/','/tags/','/about/',...posts.map(p=>p.url)].map(u=>`<url><loc>${config.origin}${u}</loc></url>`).join('')}</urlset>`);
write('robots.txt',config.demo?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`);
write('_headers',`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n`);
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, await format(html, { filepath: file, parser: 'html', printWidth: 100, tabWidth: 2 }));
}
console.log(`Built ${posts.length} posts, home, archive, tags, about, RSS and sitemap into dist/.`);
