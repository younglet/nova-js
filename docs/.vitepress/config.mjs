import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'novajs',
  description: 'IoT 反应式内核。9KB min · 零依赖 · 烧 MicroPython 的 ESP32 当 server 时的前端三件套之一（配套 nova-style + nova-ui）',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#10b981' }]
  ],

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'novajs' },
    siteTitle: 'novajs',

    nav: [
      { text: '指南', link: '/guide/', activeMatch: '/guide/' },
      { text: '指令', link: '/guide/directives/text', activeMatch: '/guide/directives/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: '案例', link: '/examples/', activeMatch: '/examples/' },
      { text: 'GitHub', link: 'https://github.com/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '5 分钟上手', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/concepts' }
          ]
        },
        {
          text: '指令',
          items: [
            { text: '文本插值 {{ }}', link: '/guide/directives/text' },
            { text: '双向绑定 model', link: '/guide/directives/model' },
            { text: '条件 if / show', link: '/guide/directives/if-show' },
            { text: '列表 loop', link: '/guide/directives/loop' },
            { text: '属性绑定 :', link: '/guide/directives/bind' },
            { text: '事件 @', link: '/guide/directives/event' }
          ]
        },
        {
          text: '实战',
          items: [
            { text: '常用模式', link: '/guide/patterns' },
            { text: 'FAQ', link: '/guide/faq' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'JS API',
          items: [
            { text: '总览', link: '/api/' },
            { text: 'nova()', link: '/api/nova' },
            { text: 'data.$watch', link: '/api/watch' },
            { text: 'nova.http', link: '/api/http' },
            { text: 'nova.debounce / nextTick / bind', link: '/api/utils' }
          ]
        }
      ],
      '/examples/': [
        {
          text: '5 个跑得通的例子',
          items: [
            { text: '总览', link: '/examples/' },
            { text: '01 单设备开关', link: '/examples/01-toggle' },
            { text: '02 滑块调光', link: '/examples/02-slider' },
            { text: '03 实时传感器', link: '/examples/03-sensors' },
            { text: '04 设备网格', link: '/examples/04-grid' },
            { text: '05 动态 class / style', link: '/examples/05-class-style' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present novajs'
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/yourname/novajs/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    }
  },

  // 让 iframe 能跨域加载 examples
  server: {
    fs: { strict: false }
  }
})