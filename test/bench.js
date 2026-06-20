/*!
 * test/bench.js — novajs 性能基准测试 (clean)
 * 用法: node test/bench.js
 */

'use strict'

const { setup } = require('./helper')
const fs = require('fs')
const path = require('path')
const os = require('os')

// 压制 console.warn / console.error (novajs 的 catch block 输出)
const _warn = console.warn
const _error = console.error
function silence() { console.warn = function(){}; console.error = function(){} }
function restore()  { console.warn = _warn; console.error = _error }

// ─── 工具 ────────────────────────────────────────────

function bench(name, fn, iters) {
  iters = iters || 1
  silence()
  if (typeof gc === 'function') gc()
  const t0 = process.hrtime.bigint()
  for (let i = 0; i < iters; i++) fn()
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  restore()
  const perOp = ms / iters
  const label = name.padEnd(48)
  console.log(`  ${label} ${ms.toFixed(3)}ms  (${iters} ops, ${perOp.toFixed(3)}ms/op)`)
  return { name, total_ms: Math.round(ms * 1000) / 1000, iterations: iters, per_op_us: +(perOp * 1000).toFixed(2) }
}

async function tick() { return new Promise(r => setTimeout(r, 0)) }

// ─── 主测试 ──────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║           novajs Performance Benchmarks             ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
  const all = {}

  // ═══════════════════════════════════════════════════════
  // 1. Proxy 创建
  // ═══════════════════════════════════════════════════════
  console.log('── 1. Reactive Proxy ──')
  const r1 = []

  // 1a nova() 轻量初始化
  r1.push(bench('nova() init (5 fields)', () => {
    const c = setup('<span>{{ a }}</span>')
    c.nova({ data: { a: 1, b: 2, c: 3, d: 4, e: 5 } })
  }, 200))

  // 1b nova() 100 data 字段
  const f100 = {}; for (let i = 0; i < 100; i++) f100['f'+i] = i
  r1.push(bench('nova() init (100 fields)', () => {
    const c = setup('<span></span>')
    c.nova({ data: Object.assign({}, f100) })
  }, 50))

  // 1c 深层嵌套 (4 层, 每层 4 字段 = 256 叶子)
  function deep(b, d) {
    if (d === 0) return 0
    const o = {}; for (let i = 0; i < b; i++) o['k'+i] = deep(b, d-1)
    return o
  }
  const deepObj = deep(4, 4)
  r1.push(bench('nova() init (deep 4-level)', () => {
    const c = setup('<span></span>')
    c.nova({ data: { tree: deepObj } })
  }, 10))

  // 1d Proxy 读 (10 万次)
  const c1d = setup('<span></span>')
  const d1d = c1d.nova({ data: { count: 1, name: 'x', flag: true } })
  r1.push(bench('proxy read (100k)', () => {
    let s = 0
    for (let i = 0; i < 100000; i++) { s += d1d.count; if (d1d.flag) s++ }
  }, 1))

  // 1e Proxy 写 (1 万次)
  r1.push(bench('proxy write (10k)', () => {
    for (let i = 0; i < 10000; i++) d1d.count = i
  }, 1))

  all.proxy = r1

  // ═══════════════════════════════════════════════════════
  // 2. walk() DOM 遍历
  // ═══════════════════════════════════════════════════════
  console.log('\n── 2. walk() DOM traversal ──')
  const r2 = []

  // 2a 小模板 (50 nodes)
  const smallHtml = '<div id="app"><span>{{ a }}</span><input model="a"><div if="b"><span :class="c">{{ d }}</span></div><button @click="inc()">+</button></div>'
  r2.push(bench('walk ~15 nodes (mixed directives)', () => {
    const c = setup(smallHtml)
    c.nova({ data: { a: 0, b: true, c: 'on', d: 'hi' }, funcs: { inc() { this.a++ } } })
  }, 200))

  // 2b 大文档，稀疏指令 (1000 div)
  let bigDom = '<div id="root">'
  for (let i = 0; i < 500; i++) bigDom += `<div class="row"><span>${i}</span></div>`
  bigDom += '</div>'
  r2.push(bench('walk ~1000 nodes (sparse directives)', () => {
    const c = setup(bigDom)
    c.nova({ data: {} })
  }, 50))

  // 2c 密集指令 (150 div × 4 指令)
  let dense = '<div id="root">'
  for (let i = 0; i < 150; i++) {
    dense += `<div if="b${i}"><span :class="c${i}">{{ t${i} }}</span><input model="m${i}" @change="f${i}()"></div>`
  }
  dense += '</div>'
  const denseData = {}; for (let i = 0; i < 150; i++) { denseData['b'+i]=true; denseData['c'+i]='cls'; denseData['t'+i]='txt'; denseData['m'+i]=''; }
  const denseFuncs = {}; for (let i = 0; i < 150; i++) denseFuncs['f'+i] = function(){}
  r2.push(bench('walk ~600 nodes (dense directives)', () => {
    const c = setup(dense)
    c.nova({ data: Object.assign({}, denseData), funcs: denseFuncs })
  }, 20))

  all.walk = r2

  // ═══════════════════════════════════════════════════════
  // 3. 表达式编译 & 缓存
  // ═══════════════════════════════════════════════════════
  console.log('\n── 3. Expression compilation ──')
  const r3 = []

  // 3a 100 个不同 {{ expr }} (触发编译缓存)
  let texprs = ''
  for (let i = 0; i < 100; i++) texprs += `<span>{{ f${i} }}</span>`
  const tdata = {}; for (let i = 0; i < 100; i++) tdata['f'+i] = i
  r3.push(bench('walk compile 100 {{ expr }}', () => {
    const c = setup(`<div>${texprs}</div>`)
    c.nova({ data: Object.assign({}, tdata) })
  }, 50))

  // 3b 相同表达式重复 (缓存命中)
  let sameExpr = ''
  for (let i = 0; i < 100; i++) sameExpr += `<span>{{ count + ${i} }}</span>`
  r3.push(bench('walk compile 100 SAME expr (cache hit)', () => {
    const c = setup(`<div>${sameExpr}</div>`)
    c.nova({ data: { count: 0 } })
  }, 50))

  // 3c with() 表达式执行开销
  const c3c = setup('<span id="s">{{ count + items.length }}</span>')
  const d3c = c3c.nova({ data: { count: 0, items: [1,2,3] } })
  await tick()
  r3.push(bench('with() expr eval (10k writes)', () => {
    for (let i = 0; i < 10000; i++) d3c.count = i
  }, 1))

  all.compilation = r3

  // ═══════════════════════════════════════════════════════
  // 4. Effect 调度 & flush
  // ═══════════════════════════════════════════════════════
  console.log('\n── 4. Effect scheduler ──')
  const r4 = []

  // 4a 500 $watch 注册
  const c4a = setup('<div></div>')
  const d4a = c4a.nova({ data: { a0: 0 } })
  for (let i = 1; i < 500; i++) d4a['a'+i] = i
  const watches = []
  r4.push(bench('register 500 $watch effects', () => {
    for (let i = 0; i < 500; i++) watches.push(d4a.$watch('a'+i, function(){}))
  }, 1))

  // 4b flush 500 个脏 effect
  r4.push(bench('flush 500 dirty effects', () => {
    for (let i = 0; i < 500; i++) d4a['a'+i] = i + 1
  }, 10))

  // 4c 同 key 去重 (1000 写 = 1 flush)
  const c4c = setup('<span>{{ val }}</span>')
  const d4c = c4c.nova({ data: { val: 0 } })
  await tick()
  r4.push(bench('same-key 1000 writes → 1 flush', () => {
    for (let i = 0; i < 1000; i++) d4c.val = i
  }, 200))

  all.scheduler = r4

  // ═══════════════════════════════════════════════════════
  // 5. model 双向绑定
  // ═══════════════════════════════════════════════════════
  console.log('\n── 5. model bindings ──')
  const r5 = []

  let modelHtml = ''
  const modelData = {}
  for (let i = 0; i < 100; i++) { modelHtml += `<input model="v${i}">`; modelData['v'+i] = 'val'+i }
  r5.push(bench('100 model bindings setup', () => {
    const c = setup(`<div>${modelHtml}</div>`)
    c.nova({ data: Object.assign({}, modelData) })
  }, 30))

  const c5b = setup(`<div>${modelHtml}</div>`)
  const d5b = c5b.nova({ data: Object.assign({}, modelData) })
  await tick()
  r5.push(bench('100 model writes + DOM flush', () => {
    for (let i = 0; i < 100; i++) d5b['v'+i] = 'upd'+i
  }, 50))

  // auto-bind by name (form elements without model attr)
  let formHtml = ''
  for (let i = 0; i < 50; i++) formHtml += `<input name="n${i}">`
  const formData = {}; for (let i = 0; i < 50; i++) formData['n'+i] = ''
  r5.push(bench('50 auto-bind by name', () => {
    const c = setup(`<form>${formHtml}</form>`)
    c.nova({ data: Object.assign({}, formData) })
  }, 30))

  all.model = r5

  // ═══════════════════════════════════════════════════════
  // 6. loop 列表渲染
  // ═══════════════════════════════════════════════════════
  console.log('\n── 6. loop rendering ──')
  const r6 = []

  // 6a 100 items × 3 bindings
  let loop100 = '<ul><li loop="item in items"><span>{{ item.id }}</span><span :class="item.on?\'on\':\'off\'"></span><input model="item.name"></li></ul>'
  const items100 = [] 
  for (let i = 0; i < 100; i++) items100.push({ id: i, name: 'n'+i, on: !!(i%2) })
  r6.push(bench('loop setup 100 items × 3 bindings', () => {
    const c = setup(loop100)
    c.nova({ data: { items: JSON.parse(JSON.stringify(items100)) } })
  }, 30))

  // 6b 500 items × 1 binding
  let loop500 = '<ul><li loop="item in items"><span>{{ item.id }}</span></li></ul>'
  const items500 = []; for (let i = 0; i < 500; i++) items500.push({ id: i })
  r6.push(bench('loop setup 500 items × 1 binding', () => {
    const c = setup(loop500)
    c.nova({ data: { items: JSON.parse(JSON.stringify(items500)) } })
  }, 20))

  // 6c loop 重新渲染 (替换整个数组)
  const c6c = setup(loop100)
  const d6c = c6c.nova({ data: { items: JSON.parse(JSON.stringify(items100)) } })
  await tick()
  const snapshot = JSON.parse(JSON.stringify(items100))
  r6.push(bench('loop re-render 100 items (replace array)', () => {
    d6c.items = JSON.parse(JSON.stringify(snapshot))
  }, 50))

  // 6d loop push 单条 (增量触发全部重建)
  const c6d = setup(loop100)
  const baseItems = [{ id: 1, name: 'a', on: true }]
  const d6d = c6d.nova({ data: { items: JSON.parse(JSON.stringify(baseItems)) } })
  await tick()
  r6.push(bench('loop push 1 item → full rebuild', () => {
    d6d.items.push({ id: d6d.items.length + 1, name: 'x', on: false })
  }, 200))

  all.loop = r6

  // ═══════════════════════════════════════════════════════
  // 7. 综合场景 (IoT typical)
  // ═══════════════════════════════════════════════════════
  console.log('\n── 7. IoT scenarios ──')
  const r7 = []

  // 7a 滑块防抖 (高频写入 + model)
  const c7a = setup('<input model="brightness"><span>{{ brightness }}</span>')
  const d7a = c7a.nova({ data: { brightness: 50 } })
  await tick()
  r7.push(bench('slider: 1000 rapid writes', () => {
    for (let i = 0; i < 1000; i++) d7a.brightness = i % 100
  }, 20))

  // 7b 20 设备网格初始化
  let grid = '<div>'
  for (let i = 0; i < 20; i++) {
    grid += `<div if="d${i}.online"><span :class="d${i}.on?\'on\':\'off\'">{{ d${i}.name }}</span><input model="d${i}.on" type="checkbox"></div>`
  }
  grid += '</div>'
  const gData = {}; for (let i = 0; i < 20; i++) gData['d'+i] = { online: true, on: false, name: 'Dev '+i }
  r7.push(bench('20-device grid setup', () => {
    const c = setup(grid)
    c.nova({ data: JSON.parse(JSON.stringify(gData)) })
  }, 30))

  // 7c 批量 toggle 20 设备
  const c7c = setup(grid)
  const d7c = c7c.nova({ data: JSON.parse(JSON.stringify(gData)) })
  await tick()
  r7.push(bench('20 devices toggle (40 writes)', () => {
    for (let i = 0; i < 20; i++) {
      d7c['d'+i].online = !d7c['d'+i].online
      d7c['d'+i].on = !d7c['d'+i].on
    }
  }, 50))

  r7.push(bench('HTTP fetch response → 20 writes', () => {
    for (let i = 0; i < 20; i++) {
      d7c['d'+i].online = true
      d7c['d'+i].on = i < 10
    }
  }, 100))

  all.integration = r7

  // ═══════════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║                   Summary                           ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  for (const [cat, results] of Object.entries(all)) {
    const total = results.reduce((s, r) => s + r.total_ms, 0)
    console.log(`  ${cat.padEnd(18)} ${results.length} tests, ${total.toFixed(1)}ms total`)
  }

  const desktop = path.join(os.homedir(), 'Desktop', 'novajs-bench-results.json')
  fs.writeFileSync(desktop, JSON.stringify(all, null, 2))

  // 同时输出人类可读报告
  const report = []
  report.push('# novajs Performance Benchmarks')
  report.push(`\nDate: ${new Date().toISOString()}\n`)

  for (const [cat, results] of Object.entries(all)) {
    report.push(`## ${cat}`)
    report.push('| Benchmark | Total (ms) | Iters | Per-op (μs) |')
    report.push('|---|---|---|---|')
    for (const r of results) {
      report.push(`| ${r.name} | ${r.total_ms} | ${r.iterations} | ${r.per_op_us} |`)
    }
    report.push('')
  }

  const reportPath = path.join(os.homedir(), 'Desktop', 'novajs-bench-report.md')
  fs.writeFileSync(reportPath, report.join('\n'))
  console.log(`\n  JSON: ${desktop}`)
  console.log(`  Report: ${reportPath}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
