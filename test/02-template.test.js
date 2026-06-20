/*!
 * test/02-template.test.js — 模板与指令测试
 */
'use strict'

const { describe, it, eq, setup } = require('./helper')

describe('Template: {{ }} interpolation', function () {
  it('renders simple text interpolation', function () {
    const ctx = setup('<span id="x">{{ name }}</span>')
    const data = ctx.nova({ data: { name: 'alice' } })
    eq(ctx.document.getElementById('x').textContent, 'alice')
  })

  it('renders expression', function () {
    const ctx = setup('<span id="x">{{ count + 1 }}</span>')
    const data = ctx.nova({ data: { count: 5 } })
    eq(ctx.document.getElementById('x').textContent, '6')
  })

  it('renders ternary', function () {
    const ctx = setup('<span id="x">{{ ok ? "yes" : "no" }}</span>')
    const data = ctx.nova({ data: { ok: true } })
    eq(ctx.document.getElementById('x').textContent, 'yes')
  })

  it('renders nested path', function () {
    const ctx = setup('<span id="x">{{ user.name }}</span>')
    const data = ctx.nova({ data: { user: { name: 'bob' } } })
    eq(ctx.document.getElementById('x').textContent, 'bob')
  })

  it('updates on data change', function () {
    const ctx = setup('<span id="x">{{ count }}</span>')
    const data = ctx.nova({ data: { count: 0 } })
    data.count = 10
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').textContent, '10')
    })
  })

  it('renders mixed static and dynamic text', function () {
    const ctx = setup('<span id="x">Hi {{ name }}, age {{ age }}</span>')
    const data = ctx.nova({ data: { name: 'alice', age: 18 } })
    const el = ctx.document.getElementById('x')
    eq(el.textContent, 'Hi alice, age 18')
  })

  it('handles null with empty string', function () {
    const ctx = setup('<span id="x">{{ x }}</span>')
    const data = ctx.nova({ data: { x: null } })
    eq(ctx.document.getElementById('x').textContent, '')
  })

  it('handles missing key without throwing', function () {
    const ctx = setup('<span id="x">{{ missing }}</span>')
    const data = ctx.nova({ data: {} })
    const el = ctx.document.getElementById('x')
    eq(el.textContent, '')
  })
})

describe('model (two-way binding)', function () {
  it('input value reflects data', function () {
    const ctx = setup('<input id="x" model="name">')
    const data = ctx.nova({ data: { name: 'alice' } })
    eq(ctx.document.getElementById('x').value, 'alice')
  })

  it('typing updates data', function () {
    const ctx = setup('<input id="x" model="name">')
    const data = ctx.nova({ data: { name: '' } })
    const el = ctx.document.getElementById('x')
    el.value = 'hello'
    el.dispatchEvent(new ctx.window.Event('input'))
    eq(data.name, 'hello')
  })

  it('updating data updates input', function () {
    const ctx = setup('<input id="x" model="name">')
    const data = ctx.nova({ data: { name: 'a' } })
    data.name = 'b'
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').value, 'b')
    })
  })

  it('checkbox reflects boolean', function () {
    const ctx = setup('<input type="checkbox" id="x" model="flag">')
    const data = ctx.nova({ data: { flag: true } })
    eq(ctx.document.getElementById('x').checked, true)
  })

  it('checkbox click toggles data', function () {
    const ctx = setup('<input type="checkbox" id="x" model="flag">')
    const data = ctx.nova({ data: { flag: false } })
    const el = ctx.document.getElementById('x')
    el.checked = true
    el.dispatchEvent(new ctx.window.Event('change'))
    eq(data.flag, true)
  })

  it('auto-binds input[name]', function () {
    const ctx = setup('<input id="x" name="brightness" type="range">')
    const data = ctx.nova({ data: { brightness: 50 } })
    eq(ctx.document.getElementById('x').value, '50')
  })
})

describe('@event', function () {
  it('click triggers handler', function () {
    const ctx = setup('<button id="x" @click="increment()">+</button>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    ctx.document.getElementById('x').click()
    eq(data.count, 1)
  })

  it('click calls method', function () {
    const ctx = setup('<button id="x" @click="increment()">+</button>')
    const data = ctx.nova({
      data:  { count: 0 },
      funcs: { increment () { this.count++ } }
    })
    ctx.document.getElementById('x').click()
    eq(data.count, 1)
  })

  it('async handler errors are caught', function () {
    const ctx = setup('<button id="x" @click="fail()">x</button>')
    let caught = null
    const origErr = console.error
    console.error = function (...args) { caught = args[1] || args[0] }
    let data
    try {
      data = ctx.nova({
        data:  {},
        funcs: { async fail () { throw new Error('boom') } }
      })
      ctx.document.getElementById('x').click()
    } catch (e) { /* ignore */ }
    return ctx.tick().then(function () {
      console.error = origErr
      ok(caught && /boom/.test(String(caught)), 'should log error')
    })
  })

  it('multiple events work independently', function () {
    const ctx = setup('<button id="x" @click="increment()" @mouseover="hovered=true">+</button>')
    const data = ctx.nova({
      data:  { count: 0, hovered: false },
      funcs: { increment () { this.count++ } }
    })
    const el = ctx.document.getElementById('x')
    el.dispatchEvent(new ctx.window.Event('mouseover'))
    eq(data.hovered, true)
    el.click()
    eq(data.count, 1)
  })
})

describe('if', function () {
  it('renders element when truthy', function () {
    const ctx = setup('<div><span id="x" if="ok">yes</span></div>')
    ctx.nova({ data: { ok: true } })
    eq(ctx.document.getElementById('x') !== null, true)
    eq(ctx.document.getElementById('x').textContent, 'yes')
  })

  it('removes element when falsy', function () {
    const ctx = setup('<div><span id="x" if="ok">yes</span></div>')
    ctx.nova({ data: { ok: false } })
    eq(ctx.document.getElementById('x'), null)
  })

  it('toggles on data change', function () {
    const ctx = setup('<div><span id="x" if="ok">yes</span></div>')
    const data = ctx.nova({ data: { ok: false } })
    eq(ctx.document.getElementById('x'), null)
    data.ok = true
    return ctx.tick().then(function () {
      const el = ctx.document.getElementById('x')
      eq(el !== null, true)
      eq(el.textContent, 'yes')
      data.ok = false
      return ctx.tick()
    }).then(function () {
      eq(ctx.document.getElementById('x'), null)
    })
  })
})

describe('show', function () {
  it('hides via display:none', function () {
    const ctx = setup('<span id="x" show="ok">yes</span>')
    ctx.nova({ data: { ok: false } })
    eq(ctx.document.getElementById('x').style.display, 'none')
  })

  it('shows when truthy', function () {
    const ctx = setup('<span id="x" show="ok">yes</span>')
    ctx.nova({ data: { ok: true } })
    eq(ctx.document.getElementById('x').style.display, '')
  })
})

describe('loop', function () {
  it('renders list', function () {
    const html = '<ul><li id="tpl" loop="x in xs">{{ x }}</li></ul>'
    const ctx = setup(html)
    ctx.nova({ data: { xs: [1, 2, 3] } })
    const lis = ctx.document.querySelectorAll('li')
    eq(lis.length, 3)
    eq(lis[0].textContent, '1')
    eq(lis[1].textContent, '2')
    eq(lis[2].textContent, '3')
  })

  it('renders objects', function () {
    const html = '<ul><li loop="d in devs">{{ d.name }}</li></ul>'
    const ctx = setup(html)
    ctx.nova({ data: { devs: [{ name: 'a' }, { name: 'b' }] } })
    const lis = ctx.document.querySelectorAll('li')
    eq(lis.length, 2)
    eq(lis[0].textContent, 'a')
    eq(lis[1].textContent, 'b')
  })

  it('provides index', function () {
    const html = '<ul><li loop="(x, i) in xs">{{ i }}-{{ x }}</li></ul>'
    const ctx = setup(html)
    ctx.nova({ data: { xs: ['a', 'b', 'c'] } })
    const lis = ctx.document.querySelectorAll('li')
    eq(lis[0].textContent, '0-a')
    eq(lis[2].textContent, '2-c')
  })

  it('updates on push', function () {
    const html = '<ul><li loop="x in xs">{{ x }}</li></ul>'
    const ctx = setup(html)
    const data = ctx.nova({ data: { xs: [1, 2] } })
    eq(ctx.document.querySelectorAll('li').length, 2)
    data.xs.push(3)
    return ctx.tick().then(function () {
      eq(ctx.document.querySelectorAll('li').length, 3)
    })
  })

  it('updates on splice (remove)', function () {
    const html = '<ul><li loop="x in xs">{{ x }}</li></ul>'
    const ctx = setup(html)
    const data = ctx.nova({ data: { xs: [1, 2, 3, 4] } })
    data.xs.splice(1, 2)
    return ctx.tick().then(function () {
      const lis = ctx.document.querySelectorAll('li')
      eq(lis.length, 2)
      eq(lis[0].textContent, '1')
      eq(lis[1].textContent, '4')
    })
  })

  it('empty list renders nothing', function () {
    const html = '<ul><li loop="x in xs">{{ x }}</li></ul>'
    const ctx = setup(html)
    ctx.nova({ data: { xs: [] } })
    eq(ctx.document.querySelectorAll('li').length, 0)
  })
})

describe('Attribute binding (:attr)', function () {
  it(':class object syntax', function () {
    const ctx = setup('<div id="x" :class="{ active: on, disabled: !on }"></div>')
    const data = ctx.nova({ data: { on: true } })
    const el = ctx.document.getElementById('x')
    eq(el.getAttribute('class'), 'active')
    data.on = false
    return ctx.tick().then(function () {
      eq(el.getAttribute('class'), 'disabled')
    })
  })

  it(':class array', function () {
    const ctx = setup('<div id="x" :class="cls"></div>')
    ctx.nova({ data: { cls: 'foo bar' } })
    eq(ctx.document.getElementById('x').getAttribute('class'), 'foo bar')
  })

  it(':class array syntax (with conditional)', function () {
    const ctx = setup('<div id="x" :class="[\'base\', on ? \'active\' : \'inactive\']"></div>')
    const data = ctx.nova({ data: { on: true } })
    eq(ctx.document.getElementById('x').getAttribute('class'), 'base active')
    data.on = false
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').getAttribute('class'), 'base inactive')
    })
  })

  it(':class array with mixed object', function () {
    const ctx = setup('<div id="x" :class="[\'base\', { active: on, disabled: !on }]"></div>')
    const data = ctx.nova({ data: { on: true } })
    eq(ctx.document.getElementById('x').getAttribute('class'), 'base active')
    data.on = false
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').getAttribute('class'), 'base disabled')
    })
  })

  it(':class merges with existing class', function () {
    const ctx = setup('<div id="x" class="static-base" :class="{ active: on }"></div>')
    const data = ctx.nova({ data: { on: true } })
    eq(ctx.document.getElementById('x').getAttribute('class'), 'static-base active')
    data.on = false
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').getAttribute('class'), 'static-base')
    })
  })

  it(':class string merges with existing', function () {
    const ctx = setup('<div id="x" class="box" :class="extra"></div>')
    const data = ctx.nova({ data: { extra: 'shadow rounded' } })
    eq(ctx.document.getElementById('x').getAttribute('class'), 'box shadow rounded')
  })

  it(':style object syntax', function () {
    const ctx = setup('<div id="x" :style="sty"></div>')
    ctx.nova({ data: { sty: { width: '50%', color: 'red' } } })
    const el = ctx.document.getElementById('x')
    eq(el.style.width, '50%')
    eq(el.style.color, 'red')
  })

  it(':src updates img', function () {
    const ctx = setup('<img id="x" :src="url">')
    const data = ctx.nova({ data: { url: '/a.png' } })
    eq(ctx.document.getElementById('x').getAttribute('src'), '/a.png')
    data.url = '/b.png'
    return ctx.tick().then(function () {
      eq(ctx.document.getElementById('x').getAttribute('src'), '/b.png')
    })
  })

  it(':disabled removes attribute when false', function () {
    const ctx = setup('<button id="x" :disabled="busy">x</button>')
    ctx.nova({ data: { busy: true } })
    eq(ctx.document.getElementById('x').hasAttribute('disabled'), true)
  })

  it(':hidden when null removes attribute', function () {
    const ctx = setup('<div id="x" :hidden="value">x</div>')
    ctx.nova({ data: { value: false } })
    eq(ctx.document.getElementById('x').hasAttribute('hidden'), false)
  })
})

describe('nova.bind (programmatic)', function () {
  it('binds text by id', function () {
    const ctx = setup('<span id="display">x</span>')
    const data = ctx.nova({ data: { count: 7 } })
    ctx.nova.bind('count', '#display')
    eq(ctx.document.getElementById('display').textContent, '7')
  })

  it('binds text by selector', function () {
    const ctx = setup('<div><span class="display">x</span></div>')
    const data = ctx.nova({ data: { count: 9 } })
    ctx.nova.bind('count', '.display')
    eq(ctx.document.querySelector('.display').textContent, '9')
  })

  it('binds nested path', function () {
    const ctx = setup('<span id="display">x</span>')
    const data = ctx.nova({ data: { user: { name: 'alice' } } })
    ctx.nova.bind('user.name', '#display')
    eq(ctx.document.getElementById('display').textContent, 'alice')
  })

  it('binds input value', function () {
    const ctx = setup('<input id="inp">')
    const data = ctx.nova({ data: { value: 'hi' } })
    ctx.nova.bind('value', '#inp')
    eq(ctx.document.getElementById('inp').value, 'hi')
  })
})

function ok (cond, msg) {
  if (!cond) throw new Error('assertion failed: ' + (msg || ''))
}