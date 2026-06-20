/*!
 * test/04-integration.test.js — 集成测试（端到端场景）
 */
'use strict'

const { describe, it, eq, setup } = require('./helper')

describe('IoT device control scenarios', function () {
  it('toggle switch: click flips state and calls API', function () {
    const html = '<div><button id="btn" @click="toggle()">{{ on ? "ON" : "OFF" }}</button></div>'
    const ctx = setup(html)

    let posted = null
    ctx.setFetch(function (url, init) {
      if (init.method === 'POST') posted = { url: url, body: JSON.parse(init.body) }
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ on: true })
      })
    })

    const data = ctx.nova({
      data:  { on: false },
      funcs: {
        async toggle () {
          const r = await ctx.nova.http.post('/api/device/1/toggle', { on: !this.on })
          this.on = r.on
        }
      }
    })

    eq(ctx.document.getElementById('btn').textContent, 'OFF')
    ctx.document.getElementById('btn').click()
    return ctx.tick().then(function () { return ctx.tick() }).then(function () {
      eq(posted.url, '/api/device/1/toggle')
      eq(posted.body.on, true)
      eq(data.on, true)
      eq(ctx.document.getElementById('btn').textContent, 'ON')
    })
  })

  it('slider: typing updates data, debounced save fires API', function () {
    const html = '<div><input id="slider" name="brightness" type="range" min="0" max="100"></div>'
    const ctx = setup(html)

    let puts = []
    ctx.setFetch(function (url, init) {
      if (init.method === 'PUT') puts.push({ url: url, body: JSON.parse(init.body) })
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ ok: true })
      })
    })

    const data = ctx.nova({
      data:  { brightness: 50 },
      funcs: {
        save: ctx.nova.debounce(function () {
          ctx.nova.http.put('/api/dim/1', { value: this.brightness })
        }, 50)
      }
    })
    data.$watch('brightness', function () { data.save() })

    const slider = ctx.document.getElementById('slider')
    slider.value = '30'
    slider.dispatchEvent(new ctx.window.Event('input'))
    slider.value = '20'
    slider.dispatchEvent(new ctx.window.Event('input'))
    slider.value = '10'
    slider.dispatchEvent(new ctx.window.Event('input'))

    return new Promise(function (r) { setTimeout(r, 100) }).then(function () {
      eq(puts.length, 1)
      eq(+puts[0].body.value, 10)
    })
  })

  it('sensor polling: refresh updates 4 cards', function () {
    const html = '<div>'
      + '<span id="t1">{{ temp }}</span>'
      + '<span id="t2">{{ humid }}</span>'
      + '<span id="t3">{{ lux }}</span>'
      + '<span id="t4">{{ volt }}</span>'
      + '</div>'
    const ctx = setup(html)

    let n = 0
    ctx.setFetch(function () {
      n++
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ temp: 20 + n, humid: 50 + n, lux: 100 + n, volt: 3 + n * 0.1 })
      })
    })

    const data = ctx.nova({
      data:  { temp: 0, humid: 0, lux: 0, volt: 0 },
      funcs: {
        async poll () {
          const r = await ctx.nova.http.get('/api/sensors')
          this.temp = r.temp
          this.humid = r.humid
          this.lux = r.lux
          this.volt = r.volt
        }
      }
    })

    return data.poll().then(function () { return ctx.tick() }).then(function () {
      eq(ctx.document.getElementById('t1').textContent, '21')
      eq(ctx.document.getElementById('t2').textContent, '51')
      eq(ctx.document.getElementById('t3').textContent, '101')
      eq(ctx.document.getElementById('t4').textContent, '3.1')
      return data.poll()
    }).then(function () { return ctx.tick() }).then(function () {
      eq(ctx.document.getElementById('t1').textContent, '22')
    })
  })

  it('grid: loop renders multiple devices, toggle one of them', function () {
    const html = '<div><div loop="d in devices" class="card" :data-id="d.id">'
      + '<span class="name">{{ d.name }}</span>'
      + '<button class="toggle" @click="flip(d)">{{ d.on ? "ON" : "OFF" }}</button>'
      + '</div></div>'
    const ctx = setup(html)

    let lastPost = null
    ctx.setFetch(function (url, init) {
      if (init.method === 'POST') lastPost = { url: url, body: JSON.parse(init.body) }
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ ok: true })
      })
    })

    const data = ctx.nova({
      data: {
        devices: [
          { id: 1, name: '客厅灯', on: false },
          { id: 2, name: '卧室灯', on: true }
        ]
      },
      funcs: {
        async flip (d) {
          await ctx.nova.http.post('/api/device/' + d.id, { on: !d.on })
          d.on = !d.on
        }
      }
    })

    const cards = ctx.document.querySelectorAll('.card')
    eq(cards.length, 2)
    eq(cards[0].querySelector('.name').textContent, '客厅灯')
    eq(cards[0].querySelector('.toggle').textContent, 'OFF')

    cards[1].querySelector('.toggle').click()
    return ctx.tick().then(function () { return ctx.tick() }).then(function () {
      eq(lastPost.url, '/api/device/2')
      eq(lastPost.body.on, false)
      eq(data.devices[1].on, false)
      eq(ctx.document.querySelectorAll('.card')[1].querySelector('.toggle').textContent, 'OFF')
    })
  })

  it('if toggles loading indicator', function () {
    const html = '<div>'
      + '<button id="btn" @click="load()">load</button>'
      + '<span if="busy" id="spinner">loading…</span>'
      + '<span if="!busy && loaded" id="done">done</span>'
      + '</div>'
    const ctx = setup(html)

    ctx.setFetch(function () {
      return new Promise(function (r) { setTimeout(r, 30) }).then(function () {
        return {
          ok: true, status: 200, statusText: 'OK',
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ items: [1, 2, 3] })
        }
      })
    })

    const data = ctx.nova({
      data:  { busy: false, loaded: false },
      funcs: {
        async load () {
          this.busy = true
          await ctx.nova.http.get('/api/items')
          this.busy = false
          this.loaded = true
        }
      }
    })

    eq(ctx.document.getElementById('spinner'), null)
    ctx.document.getElementById('btn').click()
    return ctx.tick().then(function () {
      ok(ctx.document.getElementById('spinner') !== null, 'spinner should appear')
      ok(ctx.document.getElementById('done') === null, 'done should not appear')
      return new Promise(function (r) { setTimeout(r, 50) })
    }).then(function () { return ctx.tick() }).then(function () {
      ok(ctx.document.getElementById('spinner') === null, 'spinner should disappear')
      ok(ctx.document.getElementById('done') !== null, 'done should appear')
    })
  })
})

function ok (cond, msg) {
  if (!cond) throw new Error('assertion failed: ' + (msg || ''))
}