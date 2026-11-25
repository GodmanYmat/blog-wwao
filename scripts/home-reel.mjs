export function renderHomeReel({ posts, config, icon, esc }) {
  const latest = posts.slice(0, 4);
  const titles = [config.subtitle, ...latest.map((post) => post.title)];

  return `
    <section class="home-reel" data-reel aria-roledescription="轮播" aria-label="首页与最新笔记">
      <div class="reel-stage">
        <div class="reel-viewport" tabindex="0" role="group" aria-label="横向浏览首页与最新笔记，可使用左右方向键切换">
          <div class="reel-track">
            <section class="hero reel-slide" data-reel-title="${esc(config.subtitle)}" aria-labelledby="hero-title">
              <img class="hero-image" src="/assets/hero.jpg" alt="绿色山谷层叠延伸，石砌教堂静立在左侧山脊上" fetchpriority="high" width="1920" height="1280">
              <div class="hero-shade"></div>
              <div class="hero-content">
                <span class="hero-eyebrow"><span></span> LIFE · CODE · WANDER <span></span></span>
                <h1 id="hero-title">${esc(config.subtitle)}</h1>
                <p>${esc(config.description)}</p>
                <div class="hero-actions">
                  <a class="button button-light" href="#articles">${icon('book')} 开始阅读 ${icon('down')}</a>
                  <a class="button button-ghost" href="/about/">关于这里 ${icon('arrow')}</a>
                </div>
              </div>
            </section>
            ${latest
              .map(
                (post, index) => `
              <article class="reel-slide reel-note" id="latest-note-${index + 1}" data-reel-title="${esc(post.title)}" aria-labelledby="reel-title-${post.slug}">
                <img class="reel-note-image" src="${esc(post.cover)}" alt="" width="1800" height="1200" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
                <div class="reel-note-shade"></div>
                <div class="reel-note-content">
                  <span class="reel-note-kicker">THE LATEST NOTES <span>/ ${String(index + 1).padStart(2, '0')}</span></span>
                  <div class="reel-note-meta"><span>${esc(post.category)}</span><span>·</span><time datetime="${post.date}">${post.date.replaceAll('-', '.')}</time><span>·</span><span>${post.minutes} 分钟阅读</span></div>
                  <h2 id="reel-title-${post.slug}"><a href="${post.url}">${esc(post.title)}</a></h2>
                  <p>${esc(post.summary)}</p>
                  <a class="button button-light" href="${post.url}">阅读这篇笔记 ${icon('arrow')}</a>
                </div>
                <span class="reel-note-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
              </article>
            `,
              )
              .join('')}
          </div>
        </div>
        <div class="reel-footer">
          <div class="reel-controls" role="group" aria-label="切换首页与最新笔记">
            <button class="reel-arrow reel-previous" type="button" aria-label="上一页"${latest.length ? '' : ' disabled'}>${icon('arrow')}</button>
            <div class="reel-dots">
              ${titles.map((title, index) => `<button class="reel-dot${index === 0 ? ' active' : ''}" type="button" data-reel-go="${index}" aria-label="${index === 0 ? '首页' : `笔记 ${index}`}：${esc(title)}"${index === 0 ? ' aria-current="true"' : ''}><span></span></button>`).join('')}
            </div>
            <span class="reel-counter"><span data-reel-current>01</span><span>/</span>${String(titles.length).padStart(2, '0')}</span>
            <button class="reel-arrow reel-next" type="button" aria-label="下一页"${latest.length ? '' : ' disabled'}>${icon('arrow')}</button>
          </div>
        </div>
        <div class="reel-progress" aria-hidden="true"><span></span></div>
        <p class="visually-hidden" data-reel-status role="status" aria-live="off" aria-atomic="true"></p>
      </div>
    </section>
    <script src="/home-reel.js" defer></script>
  `;
}
