/*!
 * test/helper.js — 测试辅助
 * 提供 fresh JSDOM + 加载 novajs.js 到 VM context（避免模块状态污染）
 */
'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('node:vm')
const { JSDOM } = require('jsdom')

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'novajs.js'),
  'utf8'
)

/**
 * 创建一个全新的测试环境（DOM + nova）
 * @param {string} html - 初始 HTML
 * @returns {object} { dom, window, document, nova, setFetch }
 */
function setup (html) {
  const fullHtml = '<!DOCTYPE html><html><head></head><body>' + (html || '') + '</body></html>'
  const dom = new JSDOM(fullHtml, { runScripts: 'outside-only' })
  const w = dom.window

  // Mock fetch
  w.fetch = () => Promise.reject(new Error('fetch not mocked'))

  // 关键：不在 ctx 里放 'window'，让 novajs.js 的 IIFE 用 globalThis
  // globalThis 在 VM 中 === ctx
  const ctx = {
    document: w.document,
    AbortController: w.AbortController,
    HTMLElement: w.HTMLElement,
    Node: w.Node,
    NodeFilter: w.NodeFilter,
    Comment: w.Comment,
    DocumentFragment: w.DocumentFragment,
    Text: w.Text,
    Element: w.Element,
    Event: w.Event,
    console,
    Promise, Map, Set, WeakMap,
    setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: w.fetch
  }
  ctx.fetch = w.fetch
  vm.createContext(ctx)
  vm.runInContext(SOURCE, ctx)

  return {
    dom,
    window: w,
    document: w.document,
    nova: ctx.nova,
    _vm: ctx,  // exposed for debug
    setFetch: (fn) => {
      ctx.fetch = fn
      w.fetch = fn
    },
    /**
     * 等待 microtask flush（effect 调度通过 Promise.resolve().then）
     */
    tick: () => new Promise(r => setTimeout(r, 0))
  }
}

/**
 * 自定义断言：近似 assert.equal 但打印友好
 */
function eq (actual, expected, msg) {
  if (actual !== expected) {
    throw new Error('expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + (msg ? ' (' + msg + ')' : ''))
  }
}

function ok (cond, msg) {
  if (!cond) throw new Error('assertion failed' + (msg ? ': ' + msg : ''))
}

/**
 * 简化版的 describe/it 框架
 */
const suites = []
let currentSuite = null

function describe (name, fn) {
  const suite = { name, tests: [], children: [] }
  suites.push(suite)
  const prev = currentSuite
  currentSuite = suite
  try { fn() } finally { currentSuite = prev }
}

function it (name, fn) {
  if (!currentSuite) throw new Error('it() must be inside describe()')
  currentSuite.tests.push({ name, fn })
}

module.exports = { setup, describe, it, eq, ok, suites }