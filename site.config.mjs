// 修改这里即可替换站名、介绍和个人资料。文章在 content/posts/。
export default {
  title: '歪歪爱哦的博客',
  subtitle: '未完待续。',
  description: '我双手烤着生命之火取暖。',
  author: 'godymat97',
  origin: 'https://blog-wwao.godymat97.workers.dev',
  intro: '记录生活的酸甜苦辣，留下时间的雪泥鸿爪。',
  email: 'godymat97@outlook.com',
  github: 'https://github.com/GodmanYmat',
  demo: true,
  waline: {
    // 公开的评论服务地址；数据库密码只保存在 Netlify，不要写入网站代码。
    serverURL: 'https://review-setting.netlify.app/.netlify/functions/comment',
    pageview: true
  },
  categories: ['日常随笔', '技术手记', '沿途风景']
};
