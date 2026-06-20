/*!
 * test/03-http.test.js — HTTP / Utilities 测试
 */
'use strict'

const { describe, it, eq, setup } = require('./helper')

describe('nova.http', function () {
  it('GET sends request and returns JSON', function () {
    const ctx = setup()
    let called = null
    ctx.setFetch(function (url, init) {
      called = { url: url, init: init }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ hello: 'world' })
      })
    })
    return ctx.nova.http.get('/api/test').then(function (data) {
      eq(data.hello, 'world')
      eq(called.url, '/api/test')
      eq(called.init.method, 'GET')
    })
  })

  it('POST sends body as JSON', function () {
    const ctx = setup()
    let called = null
    ctx.setFetch(function (url, init) {
      called = { url: url, init: init }
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ ok: true })
      })
    })
    return ctx.nova.http.post('/api/dev', { name: 'x' }).then(function () {
      eq(called.url, '/api/dev')
      eq(called.init.method, 'POST')
      eq(called.init.body, '{"name":"x"}')
      eq(called.init.headers['Content-Type'], 'application/json')
    })
  })

  it('PUT works', function () {
    const ctx = setup()
    let method = null
    ctx.setFetch(function (url, init) {
      method = init.method
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    })
    return ctx.nova.http.put('/api/x/1', { v: 5 }).then(function () {
      eq(method, 'PUT')
    })
  })

  it('DELETE works', function () {
    const ctx = setup()
    let method = null
    ctx.setFetch(function (url, init) {
      method = init.method
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    })
    return ctx.nova.http.del('/api/x/1').then(function () {
      eq(method, 'DELETE')
    })
  })

  it('PATCH works', function () {
    const ctx = setup()
    let method = null
    ctx.setFetch(function (url, init) {
      method = init.method
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    })
    return ctx.nova.http.patch('/api/x/1', { v: 5 }).then(function () {
      eq(method, 'PATCH')
    })
  })

  it('throws on non-ok response', function () {
    const ctx = setup()
    ctx.setFetch(function () {
      return Promise.resolve({
        ok: false, status: 404, statusText: 'Not Found',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    })
    return ctx.nova.http.get('/api/missing').then(
      function () { throw new Error('should reject') },
      function (e) { ok(/404/.test(e.message), 'should mention 404') }
    )
  })

  it('uses baseURL option', function () {
    const ctx = setup()
    let url = null
    ctx.setFetch(function (u) {
      url = u
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    })
    return ctx.nova.http.get('/users', { baseURL: 'https://api.example.com' }).then(function () {
      eq(url, 'https://api.example.com/users')
    })
  })

  it('merges custom headers', function () {
    const ctx = setup()
    let init = null
    ctx.setFetch(function (u, i) {
      init = i
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    })
    return ctx.nova.http.get('/x', { headers: { 'X-Token': 'abc' } }).then(function () {
      eq(init.headers['X-Token'], 'abc')
      eq(init.headers['Content-Type'], 'application/json')
    })
  })

  it('returns text for non-JSON response', function () {
    const ctx = setup()
    ctx.setFetch(function () {
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('hello text')
      })
    })
    return ctx.nova.http.get('/plain').then(function (data) {
      eq(data, 'hello text')
    })
  })
})

describe('nova.debounce', function () {
  it('only fires after delay', function () {
    const ctx = setup()
    let calls = 0
    const fn = ctx.nova.debounce(function () { calls++ }, 50)
    fn(); fn(); fn()
    eq(calls, 0)
    return new Promise(function (r) { setTimeout(r, 80) }).then(function () {
      eq(calls, 1)
    })
  })

  it('uses last arguments', function () {
    const ctx = setup()
    let got = null
    const fn = ctx.nova.debounce(function (x) { got = x }, 30)
    fn(1); fn(2); fn(3)
    return new Promise(function (r) { setTimeout(r, 60) }).then(function () {
      eq(got, 3)
    })
  })

  it('preserves this via apply', function () {
    const ctx = setup()
    let self = null
    const obj = { name: 'x' }
    const fn = ctx.nova.debounce(function () { self = this }, 20)
    fn.call(obj)
    return new Promise(function (r) { setTimeout(r, 40) }).then(function () {
      eq(self, obj)
    })
  })
})

describe('data.$watch', function () {
  it('fires on change', function () {
    const ctx = setup()
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { watchHandler () { fired++ } }
    })
    let fired = 0
    data.$watch('count', data.watchHandler)
    data.count = 1
    return ctx.tick().then(function () {
      eq(fired, 1)
    })
  })

  it('passes new and old values', function () {
    const ctx = setup()
    let info = null
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { onChange (newValue, oldValue) { info = { n: newValue, o: oldValue } } }
    })
    data.$watch('count', data.onChange)
    data.count = 5
    return ctx.tick().then(function () {
      eq(info.n, 5)
      eq(info.o, 0)
    })
  })

  it('does not fire when value is identical', function () {
    const ctx = setup()
    const data = ctx.nova({
      data:  { count: 5 },
      funcs: { watchHandler () { fired++ } }
    })
    let fired = 0
    data.$watch('count', data.watchHandler)
    data.count = 5
    return ctx.tick().then(function () {
      eq(fired, 0)
    })
  })

  it('watches nested path', function () {
    const ctx = setup()
    let newName = null
    const data = ctx.nova({
      data:  { user: { name: 'a' } },
      funcs: { onChange (n) { newName = n } }
    })
    data.$watch('user.name', data.onChange)
    data.user.name = 'b'
    return ctx.tick().then(function () {
      eq(newName, 'b')
    })
  })

  it('multiple watchers work independently', function () {
    const ctx = setup()
    const data = ctx.nova({
      data:  { a: 0, b: 0 },
      funcs: {
        watchA () { aFired++ },
        watchB () { bFired++ }
      }
    })
    let aFired = 0, bFired = 0
    data.$watch('a', data.watchA)
    data.$watch('b', data.watchB)
    data.a = 1
    return ctx.tick().then(function () {
      eq(aFired, 1)
      eq(bFired, 0)
    })
  })
})

describe('nova.nextTick', function () {
  it('runs callback asynchronously', function () {
    const ctx = setup()
    let ran = false
    ctx.nova.nextTick(function () { ran = true })
    eq(ran, false)
    return ctx.tick().then(function () {
      eq(ran, true)
    })
  })
})

describe('Effect scheduling', function () {
  it('batches multiple changes in one tick', function () {
    const ctx = setup('<span id="x">{{ count }}</span>')
    const data = ctx.nova({ data: { count: 0 } })
    data.count = 1
    data.count = 2
    data.count = 3
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').textContent, '3')
    })
  })
})

function ok (cond, msg) {
  if (!cond) throw new Error('assertion failed: ' + (msg || ''))
}