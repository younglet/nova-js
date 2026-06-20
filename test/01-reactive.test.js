/*!
 * test/01-reactive.test.js — 响应式 Proxy 测试
 */
'use strict'

const { describe, it, eq, setup } = require('./helper')

describe('Reactive Proxy', function () {
  it('proxy has __nv flag', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { a: 1 } })
    eq(data.__nv, true)
  })

  it('reads basic value', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { name: 'alice' } })
    eq(data.name, 'alice')
  })

  it('reads nested object as proxy', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { user: { name: 'alice' } } })
    eq(data.user.name, 'alice')
    eq(data.user.__nv, true)
  })

  it('sets value and reads back', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { count: 0 } })
    data.count = 5
    eq(data.count, 5)
  })

  it('updates nested object', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { user: { name: 'alice' } } })
    data.user.name = 'bob'
    eq(data.user.name, 'bob')
  })

  it('arrays are reactive (push)', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { items: [1, 2, 3] } })
    eq(data.items.length, 3)
    data.items.push(4)
    eq(data.items.length, 4)
  })

  it('arrays are reactive (splice)', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { items: [1, 2, 3, 4] } })
    data.items.splice(1, 2)
    eq(data.items.length, 2)
    eq(data.items[0], 1)
    eq(data.items[1], 4)
  })

  it('returns same proxy on re-access (cached)', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { user: { name: 'a' } } })
    const user1 = data.user
    const user2 = data.user
    eq(user1 === user2, true)
  })

  it('methods are auto-bound to proxy', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    data.increment()
    eq(data.count, 1)
  })

  it('methods called as data.method() also have correct this', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    const fn = data.increment
    fn()
    eq(data.count, 1)
  })

  it('handles null and undefined values', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { x: null, y: undefined, z: 0 } })
    eq(data.x, null)
    eq(data.y, undefined)
    eq(data.z, 0)
  })

  it('delete triggers reactivity', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({ data: { a: 1, b: 2 } })
    eq('b' in data, true)
    delete data.b
    eq('b' in data, false)
  })

  it('nested array of objects is reactive', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data: { devices: [{ id: 1, on: false }] }
    })
    data.devices[0].on = true
    eq(data.devices[0].on, true)
  })
})

describe('methods cannot be overwritten', function () {
  it('cannot overwrite a func via assignment', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    let threw = false
    try { data.increment = function () { return 'hacked' } } catch (e) { threw = true }
    eq(threw, true)
    eq(typeof data.increment, 'function')
    data.increment()  // 还是原来的 +1，不是 hacked
    eq(data.count, 1)
  })

  it('cannot delete a func', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    let threw = false
    try { delete data.increment } catch (e) { threw = true }
    eq(threw, true)
    eq(typeof data.increment, 'function')
  })

  it('funcs are not enumerable on data', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    const keys = Object.keys(data)
    eq(keys.includes('count'), true)
    eq(keys.includes('increment'), false)
  })

  it('JSON.stringify ignores funcs', function () {
    const ctx = setup('<span id="x"></span>')
    const data = ctx.nova({
      data:  { count: 0, name: 'a' },
      funcs: { increment () {} }
    })
    const json = JSON.stringify(data)
    eq(json.indexOf('increment'), -1)
    eq(json.indexOf('count') >= 0, true)
  })
})