import { defineConfig } from 'vitepress'

function sidebarMain() {
  return [
    {
      text: '入门',
      items: [
        { text: '介绍', link: '/guide/' },
        { text: '5 分钟上手', link: '/guide/getting-started' },
        { text: '核心概念', link: '/guide/concepts' }
      ]
    },
    {
      text: '基础指令',
      collapsed: false,
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
      text: '核心 API',
      items: [
        { text: 'nova() 入口', link: '/guide/api-nova' },
        { text: 'data.$watch', link: '/guide/api-watch' },
        { text: 'nova.http', link: '/guide/api-http' }
      ]
    },
    {
      text: '高级功能',
      items: [
        { text: '轮询 & CRUD', link: '/guide/api-sync' },
        { text: '时间 / DOM 工具', link: '/guide/api-utils' }
      ]
    },
    {
      text: '实战',
      items: [
        { text: '常用模式', link: '/guide/patterns' },
        { text: 'FAQ', link: '/guide/faq' }
      ]
    }
  ]
}

function examplesSidebar() {
  return [
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
}

export default defineConfig({
  title: 'novajs',
  description: 'IoT 反应式内核。12KB min · 零依赖',
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
      { text: '指令 & API', link: '/guide/directives/text', activeMatch: '/guide/' },
      { text: '案例', link: '/examples/', activeMatch: '/examples/' }
    ],

    sidebar: {
      '/guide/': sidebarMain(),
      '/examples/': examplesSidebar()
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
    }
  },

  server: {
    fs: { strict: false }
  }
})