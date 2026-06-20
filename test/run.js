/*!
 * test/run.js — 测试运行器
 * 用法: node test/run.js [pattern]
 *   例如: node test/run.js         # 跑全部
 *         node test/run.js v-model # 只跑名字含 v-model 的
 */
'use strict'

const path = require('path')
const fs = require('fs')

const helper = require('./helper')

// 收集所有 test 文件
const testDir = __dirname
const files = fs.readdirSync(testDir)
  .filter(function (f) { return /^\d.*\.test\.js$/.test(f) })
  .sort()

// 注册 describe/it 到全局，这样 test 文件可以直接调用
global.describe = helper.describe
global.it = helper.it

const filter = process.argv[2] ? new RegExp(process.argv[2], 'i') : null

let totalSuites = 0
let totalTests = 0
let passed = 0
let failed = 0
const failures = []
const startTime = Date.now()

// 加载每个 test 文件
for (const f of files) {
  if (filter && !f.match(filter)) continue
  const fullPath = path.join(testDir, f)
  require(fullPath)
}

const suites = require('./helper').suites
totalSuites = suites.length

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
}

async function run () {
  for (const suite of suites) {
    const filtered = suite.tests.filter(function (t) {
      return !filter || suite.name.match(filter) || t.name.match(filter)
    })
    if (filtered.length === 0) continue

    console.log('\n' + colors.bold + suite.name + colors.reset)
    for (const test of filtered) {
      totalTests++
      const start = Date.now()
      try {
        await test.fn()
        const ms = Date.now() - start
        passed++
        console.log('  ' + colors.green + '✓' + colors.reset + ' ' + test.name + colors.gray + ' (' + ms + 'ms)' + colors.reset)
      } catch (e) {
        failed++
        const ms = Date.now() - start
        console.log('  ' + colors.red + '✗' + colors.reset + ' ' + test.name + colors.gray + ' (' + ms + 'ms)' + colors.reset)
        failures.push({ suite: suite.name, test: test.name, error: e })
      }
    }
  }

  const totalMs = Date.now() - startTime
  console.log('\n' + colors.bold + '─────────────────────────────────────────' + colors.reset)
  if (failed === 0) {
    console.log(colors.green + colors.bold + '  ✓ All ' + passed + ' tests passed' + colors.reset + colors.gray + ' (' + totalMs + 'ms)' + colors.reset)
  } else {
    console.log(colors.red + colors.bold + '  ✗ ' + failed + ' of ' + (passed + failed) + ' tests failed' + colors.reset + colors.gray + ' (' + totalMs + 'ms)' + colors.reset)
  }
  console.log(colors.gray + '  Suites: ' + totalSuites + ' · Tests: ' + totalTests + colors.reset)

  if (failures.length > 0) {
    console.log('\n' + colors.red + colors.bold + 'Failures:' + colors.reset)
    for (const f of failures) {
      console.log('  ' + colors.red + '● ' + f.suite + ' > ' + f.test + colors.reset)
      console.log('    ' + colors.gray + f.error.message + colors.reset)
      if (f.error.stack) {
        const stack = f.error.stack.split('\n').slice(1, 4).join('\n')
        console.log(colors.gray + stack + colors.reset)
      }
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(function (e) {
  console.error(colors.red + 'Runner error: ' + e.message + colors.reset)
  console.error(e.stack)
  process.exit(2)
})