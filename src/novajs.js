/*!
 * novajs — Tiny Reactive Kernel
 * 专为 NovaMP 2.0 设计 · powered by stemstar
 *
 * 用法:
 *   <script src="nova-js.js"></script>
 *   <script>
 *     const data = nova({
 *       data:  { count: 0 },
 *       funcs: { increment() { this.count++ } }
 *     })
 *   </script>
 *   <button @click="increment()">+</button>
 *   <span>{{ count }}</span>
 */
(function (global) {
  'use strict'

  /* ============== 1. Reactive Proxy ============== */
  var subs = new WeakMap()
  var proxyCache = new WeakMap()
  var activeEffect = null
  var boundFns = new WeakMap()

  function track(target, key) {
    if (!activeEffect) return
    var m = subs.get(target)
    if (!m) { m = new Map(); subs.set(target, m) }
    var s = m.get(key)
    if (!s) { s = new Set(); m.set(key, s) }
    s.add(activeEffect)
  }

  function trigger(target, key) {
    var m = subs.get(target)
    if (!m) return
    var s = m.get(key)
    if (s) s.forEach(function (e) { e._sched() })
  }

  function bindMethod(fn, ctx) {
    if (typeof fn !== 'function') return fn
    var bound = boundFns.get(fn)
    if (bound) return bound
    bound = fn.bind(ctx)
    boundFns.set(fn, bound)
    return bound
  }

  function reactive(obj, methods) {
    if (obj == null || typeof obj !== 'object') return obj
    if (obj.__nv) return obj
    var cached = proxyCache.get(obj)
    if (cached) return cached
    var proxy = new Proxy(obj, {
      has: function (t, k) {
        // with(proxy) 需要 has trap 才能找到 funcs
        if (methods && methods[k]) return true
        if (Reflect.has(t, k)) return true
        // 不存在的 key 也建立追踪，后续挂载可触发重渲染
        track(t, k)
        return false
      },
      get: function (t, k) {
        if (k === '__nv') return true
        if (k === '__methods__') return methods || null  // 内部接口：bindFor 拷方法
        // funcs 优先于 data（同名时 funcs 胜出）
        if (methods && methods[k]) {
          return bindMethod(methods[k], proxy)
        }
        var v = Reflect.get(t, k)
        track(t, k)
        if (typeof v === 'function') return bindMethod(v, proxy)
        return typeof v === 'object' && v !== null ? reactive(v) : v
      },
      set: function (t, k, v) {
        // funcs 不允许被覆盖
        if (methods && methods[k]) {
          console.warn('[novajs] cannot overwrite method:', k)
          return false
        }
        var old = t[k]
        var ok = Reflect.set(t, k, v)
        if (old !== v) trigger(t, k)
        // 数组设下标时同时触发 length（让 loop 能响应 push/splice）
        if (Array.isArray(t) && k === String(k >>> 0)) trigger(t, 'length')
        return ok
      },
      deleteProperty: function (t, k) {
        // funcs 不允许被删除
        if (methods && methods[k]) {
          console.warn('[novajs] cannot delete method:', k)
          return false
        }
        var had = k in t
        var ok = Reflect.deleteProperty(t, k)
        if (had) trigger(t, k)
        return ok
      }
    })
    proxyCache.set(obj, proxy)
    return proxy
  }

  /* ============== 2. Effects / Scheduler ============== */
  var queue = new Set()
  var scheduled = false

  function makeEff(fn) {
    return {
      _fn: fn,
      _sched: function () {
        if (queue.has(this)) return
        queue.add(this)
        if (!scheduled) {
          scheduled = true
          Promise.resolve().then(flush)
        }
      }
    }
  }

  function flush() {
    var arr = Array.from(queue)
    queue.clear()
    scheduled = false
    for (var i = 0; i < arr.length; i++) {
      activeEffect = arr[i]
      try { arr[i]._fn() } catch (e) { console.error('[novajs]', e) }
    }
    activeEffect = null
  }

  function effect(fn) {
    var eff = makeEff(fn)
    activeEffect = eff
    try { fn() } catch (e) { console.error('[novajs]', e) }
    activeEffect = null
    return eff
  }

  /* ============== 3. Expression Compiler ============== */
  var exprCache = new Map()
  function compile(expr, mode) {
    // mode: 'expr' (return value) | 'stmt' (no return, may set $v)
    var key = mode + '\x00' + expr
    if (exprCache.has(key)) return exprCache.get(key)
    var fn
    try {
      if (mode === 'stmt') {
        // 语句模式：try/catch 兜底，未挂载字段不抛错，with(data) 的 has trap 已追踪依赖
        fn = new Function('data', '$event', '$v', 'try { with(data){ return ' + expr + ' } } catch(e) { return undefined }')
      } else {
        fn = new Function('data', 'try { with(data){ return (' + expr + ') } } catch(e) { return undefined }')
      }
    } catch (e) {
      console.warn('[novajs] bad expression:', expr, e)
      fn = function () { return undefined }
    }
    exprCache.set(key, fn)
    return fn
  }

  /* ============== 4. Bindings ============== */
  var _data = null

  function bindText(el, expr, scope) {
    var fn = compile(expr, 'expr')
    effect(function () {
      try {
        var v = fn(scope || _data)
        el.textContent = v == null ? '' : String(v)
      } catch (e) {
        el.textContent = ''
      }
    })
  }

  function bindHTML(el, expr, scope) {
    var fn = compile(expr, 'expr')
    effect(function () {
      el.innerHTML = fn(scope || _data) || ''
    })
  }

  function bindModel(el, expr, scope) {
    var fnGet = compile(expr, 'expr')
    var fnSet = compile(expr + ' = $v', 'stmt')
    var data = scope || _data
    effect(function () {
      var v = fnGet(data)
      var newVal = v == null ? '' : v
      if (el.type === 'checkbox') {
        if (el.checked !== !!v) el.checked = !!v
      } else {
        if (String(el.value) !== String(newVal)) el.value = newVal
      }
    })
    var evt = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input'
    el.addEventListener(evt, function () {
      var v = (el.type === 'checkbox') ? el.checked : el.value
      fnSet(data, null, v)
    })
  }

  function bindAttr(el, attr, expr, scope) {
    var fn = compile(expr, 'expr')
    // 记住原始 class / style（第一次调用时锁住）
    if (attr === 'class' && el.__nv_baseClass === undefined) {
      el.__nv_baseClass = el.getAttribute('class') || ''
    }
    effect(function () {
      var v = fn(scope || _data)

      // :class 支持三种写法：字符串 / 对象 / 数组。与原有 class 合并。
      if (attr === 'class') {
        var baseCls = el.__nv_baseClass
        var computed = computeClass(v)
        var merged = (baseCls + ' ' + computed).trim()
        if (merged) el.setAttribute('class', merged)
        else el.removeAttribute('class')
        return
      }

      // :style 支持：对象 / 字符串
      if (attr === 'style' && v && typeof v === 'object') {
        for (var k in v) {
          if (v[k] == null) el.style.removeProperty(k)
          else el.style.setProperty(k, v[k])
        }
        return
      }

      if (v === false || v == null) {
        el.removeAttribute(attr)
      } else {
        el.setAttribute(attr, v === true ? '' : String(v))
      }
    })
  }

  function computeClass(v) {
    if (v == null || v === false) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) {
      // ['base', active ? 'on' : 'off', { disabled: x }]
      var out = []
      for (var i = 0; i < v.length; i++) {
        var item = v[i]
        if (!item) continue
        if (typeof item === 'string') out.push(item)
        else if (typeof item === 'object') {
          for (var k in item) if (item[k]) out.push(k)
        }
      }
      return out.join(' ')
    }
    if (typeof v === 'object') {
      // { active: x.on, disabled: !x.on }
      var out2 = []
      for (var k2 in v) if (v[k2]) out2.push(k2)
      return out2.join(' ')
    }
    return ''
  }

  function bindEvent(el, event, expr, scope) {
    el.addEventListener(event, function (ev) {
      var fn = compile(expr, 'stmt')
      try {
        var r = fn(scope || _data, ev, undefined)
        if (r && typeof r.then === 'function') r.catch(function (e) { console.error('[novajs]', e) })
      } catch (e) { console.error('[novajs]', e) }
    })
  }

  function bindIf(el, expr, scope) {
    var anchor = document.createComment('if')
    var parent = el.parentNode
    parent.insertBefore(anchor, el)
    parent.removeChild(el)
    var fn = compile(expr, 'expr')
    var mounted = false
    effect(function () {
      var v = !!fn(scope || _data)
      if (v && !mounted) {
        anchor.parentNode.insertBefore(el, anchor.nextSibling)
        mounted = true
      } else if (!v && mounted) {
        el.parentNode.removeChild(el)
        mounted = false
      }
    })
  }

  function bindShow(el, expr, scope) {
    var fn = compile(expr, 'expr')
    effect(function () {
      el.style.display = fn(scope || _data) ? '' : 'none'
    })
  }

  function bindFor(el, iterExpr, scope) {
    var parent = el.parentNode
    var anchor = document.createComment('loop')
    parent.insertBefore(anchor, el)
    parent.removeChild(el)

    var m = iterExpr.match(/^\s*(?:\(([^)]+)\)|(\w+))\s+(?:in|of)\s+(.+)$/)
    if (!m) { console.warn('[novajs] bad loop:', iterExpr); return }
    var firstVar = m[1] || m[2]
    var parts = firstVar.split(',').map(function (s) { return s.trim() })
    var itemName = parts[0]
    var indexName = parts[1] || null
    var listExpr = m[3].trim()

    var fn = compile(listExpr, 'expr')
    var instances = []

    // 预计算 scope keys（避免每 item 都 for-in over Proxy）
    var src = scope || _data
    var scopeKeys = Object.keys(src)
    var srcMethods = src.__methods__ || {}
    var methodKeys = Object.keys(srcMethods)

    effect(function () {
      var list = fn(scope || _data) || []
      // 读 length 跟踪长度变化（push / splice 都会改 length）
      var n = list.length
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].el.parentNode) instances[i].el.parentNode.removeChild(instances[i].el)
      }
      instances.length = 0
      list.forEach(function (item, idx) {
        var clone = el.cloneNode(true)
        var childScope = Object.create(null)
        // 用预计算 keys 拷贝，避免 for-in over Proxy + hasOwnProperty.call 开销
        for (var ki = 0; ki < scopeKeys.length; ki++) {
          childScope[scopeKeys[ki]] = src[scopeKeys[ki]]
        }
        for (var mi = 0; mi < methodKeys.length; mi++) {
          childScope[methodKeys[mi]] = srcMethods[methodKeys[mi]]
        }
        childScope[itemName] = item
        if (indexName) childScope[indexName] = idx
        walk(clone, childScope, true)
        anchor.parentNode.appendChild(clone)
        instances.push({ el: clone })
      })
    })
  }

  /* ============== 5. Walker ============== */
  function walk(root, scope, inFor) {
    inFor = !!inFor
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          var tag = n.tagName
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    })
    var nodes = []
    var n
    while ((n = tw.nextNode())) nodes.push(n)

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i]
      if (node.__nv_done) continue
      // 祖先节点被 loop 吃掉 — 跳过整个子树
      var p = node.parentNode
      while (p) { if (p.__nv_done_for) break; p = p.parentNode }
      if (p && p.__nv_done_for) {
        node.__nv_done = true  // 标记已访问，避免后续重复处理
        continue
      }
      node.__nv_done = true
      // 自定义元素（含连字符）— 不当作普通元素处理，让 customElements 内部处理
      if (node.nodeType === 1 && node.tagName.indexOf('-') !== -1) continue
      if (node.nodeType === 1) processElement(node, scope, inFor)
      else if (node.nodeType === 3) processText(node, scope)
    }
  }

  function processElement(el, scope, inFor) {
    // loop first (consumes the element)
    if (el.hasAttribute('loop')) {
      var vf = el.getAttribute('loop')
      el.removeAttribute('loop')
      el.__nv_done_for = true  // 标记为被 loop 吃掉了
      bindFor(el, vf, scope)
      return
    }

    // if
    if (el.hasAttribute('if')) {
      var vif = el.getAttribute('if')
      el.removeAttribute('if')
      bindIf(el, vif, scope)
      return
    }

    // :attr
    var attrs = Array.from(el.attributes)
    for (var i = 0; i < attrs.length; i++) {
      var a = attrs[i]
      var n = a.name
      var v = a.value
      if (n.charAt(0) === ':' && n.length > 1) {
        var attr = n.slice(1)
        el.removeAttribute(n)
        bindAttr(el, attr, v, scope)
      }
    }

    // show
    if (el.hasAttribute('show')) {
      var vs = el.getAttribute('show')
      el.removeAttribute('show')
      bindShow(el, vs, scope)
    }

    // model
    if (el.hasAttribute('model')) {
      var vm = el.getAttribute('model')
      el.removeAttribute('model')
      bindModel(el, vm, scope)
    }

    // @event
    var attrs2 = Array.from(el.attributes)
    for (var j = 0; j < attrs2.length; j++) {
      var a2 = attrs2[j]
      if (a2.name.charAt(0) === '@' && a2.name.length > 1) {
        var ev = a2.name.slice(1)
        var ex = a2.value
        el.removeAttribute(a2.name)
        bindEvent(el, ev, ex, scope)
      }
    }

    // auto-bind by name (only form elements, not inside loop)
    if (!inFor && el.name && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
      var key = el.name
      if (key in (scope || _data) && !el.hasAttribute('model')) {
        bindModel(el, key, scope)
      }
    }
  }

  function processText(node, scope) {
    var text = node.textContent
    if (text.indexOf('{{') === -1) return

    var parts = []
    var re = /\{\{([^}]+)\}\}/g
    var last = 0
    var m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
      parts.push({ type: 'expr', value: m[1].trim() })
      last = m.index + m[0].length
    }
    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
    if (parts.every(function (p) { return p.type === 'text' })) return

    var parent = node.parentNode
    var frag = document.createDocumentFragment()
    var exprNodes = []
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]
      if (p.type === 'text') {
        frag.appendChild(document.createTextNode(p.value))
      } else {
        var tn = document.createTextNode('')
        frag.appendChild(tn)
        exprNodes.push({ node: tn, expr: p.value })
      }
    }
    parent.replaceChild(frag, node)

    for (var k = 0; k < exprNodes.length; k++) {
      (function (entry) {
        var fn = compile(entry.expr, 'expr')
        effect(function () {
          try {
            var v = fn(scope || _data)
            entry.node.textContent = v == null ? '' : String(v)
          } catch (e) {
            entry.node.textContent = ''
          }
        })
      })(exprNodes[k])
    }
  }

  /* ============== 6. nova() Entry ============== */
  function nova(config, ns) {
    config = config || {}

    // 合并模式：nova.data 已存在时，将新 data/funcs 并入已有实例（可选命名空间）
    if (nova.data) {
      var scope = nova.data
      var target = scope
      // 命名空间：创建/复用嵌套对象
      if (ns) {
        if (!(ns in scope)) scope[ns] = {}
        target = scope[ns]
      }
      var dataSpec = config.data || {}
      var funcsSpec = config.funcs || {}
      for (var dk in dataSpec) {
        if (Object.prototype.hasOwnProperty.call(dataSpec, dk) && !(dk in target)) {
          target[dk] = dataSpec[dk]
        }
      }
      for (var fk in funcsSpec) {
        if (Object.prototype.hasOwnProperty.call(funcsSpec, fk) && !(fk in target)) {
          Object.defineProperty(target, fk, { value: funcsSpec[fk], writable: true, enumerable: false, configurable: true })
        }
      }
      if (config.root) {
        var newRoot = document.querySelector(config.root)
        if (newRoot) walk(newRoot, scope)
      }
      return scope
    }

    // 首次创建
    var dataSpec = config.data || {}
    var funcsSpec = config.funcs || {}
    var scope = reactive(dataSpec, funcsSpec)

    // $watch: data field change listener (per-instance via closure)
    scope.$watch = function (key, cb) {
      var fn = compile(key, 'expr')
      var oldVal, firstCall = true
      return effect(function () {
        var newVal = fn(scope)
        if (firstCall) { oldVal = newVal; firstCall = false; return }
        if (!Object.is(newVal, oldVal)) {
          var old = oldVal
          oldVal = newVal
          cb(newVal, old)
        }
      })
    }

    // Auto-scan: 支持 config.root 限定 DOM 范围
    var root = config.root ? document.querySelector(config.root) : (document.body || document.documentElement)
    var started = false
    var start = function () {
      if (started) return
      started = true
      walk(root, scope)
    }
    start()
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start)
    }

    // 保有向后兼容：_data / nova.data 指向最后创建的实例
    _data = scope
    nova._data = scope
    nova.data = scope

    // 派发 nova-ready 事件给自定义元素
    setTimeout(function () {
      var evt = (typeof CustomEvent === 'function') ? new CustomEvent('nova-ready', { detail: { data: scope } }) : null
      if (evt && document) document.dispatchEvent(evt)
    }, 0)

    return scope
  }

  /* ============== 7. nova.bind (programmatic) ============== */
  function bind(path, selector, options) {
    options = options || {}
    var el = (typeof selector === 'string') ? document.querySelector(selector) : selector
    if (!el) { console.warn('[novajs] bind: element not found:', selector); return }

    if (options.if) { bindIf(el, options.if); return }
    if (options.html) { bindHTML(el, path); return }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      bindModel(el, path)
    } else {
      bindText(el, path)
    }
  }

  /* ============== 8. HTTP ============== */
  function httpReq(method, url, body, opts) {
    opts = opts || {}
    var fullUrl = (opts.baseURL || '') + url
    var init = {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {})
    }
    if (body !== undefined) init.body = JSON.stringify(body)
    var ctrl = new AbortController()
    init.signal = ctrl.signal
    var timer = opts.timeout ? setTimeout(function () { ctrl.abort() }, opts.timeout) : null
    return fetch(fullUrl, init)
      .then(function (res) {
        if (timer) clearTimeout(timer)
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText)
        var ct = res.headers.get('content-type') || ''
        return ct.indexOf('application/json') !== -1 ? res.json() : res.text()
      })
      .catch(function (e) {
        if (timer) clearTimeout(timer)
        throw e
      })
  }

  nova.http = {
    get:   function (u, o)      { return httpReq('GET',    u, undefined, o) },
    post:  function (u, b, o)   { return httpReq('POST',   u, b, o) },
    put:   function (u, b, o)   { return httpReq('PUT',    u, b, o) },
    patch: function (u, b, o)   { return httpReq('PATCH',  u, b, o) },
    del:   function (u, o)      { return httpReq('DELETE', u, undefined, o) }
  }

  /* ============== 9. Utilities ============== */
  nova.nextTick = function (fn) { return Promise.resolve().then(fn) }

  nova.debounce = function (fn, ms) {
    var t = null
    return function () {
      var args = arguments, ctx = this
      clearTimeout(t)
      t = setTimeout(function () { fn.apply(ctx, args) }, ms)
    }
  }

  nova.dom = function (sel) { return document.querySelector(sel) }

  nova.interval = function (fn, ms) {
    var id = null
    return {
      start: function () { if (id === null) id = setInterval(fn, ms) },
      stop:  function () { if (id !== null) { clearInterval(id); id = null } }
    }
  }

  nova.timeout = function (fn, ms) {
    var id = null
    return {
      start:  function () { if (id !== null) clearTimeout(id); id = setTimeout(fn, ms) },
      cancel: function () { if (id !== null) { clearTimeout(id); id = null } }
    }
  }

  /* ============== 9b. Data Sync ============== */
  // 注入数据同步到 nova.data，可选命名空间（_前缀内部字段）

  nova.poll = function (url, interval, ns) {
    var proxy = nova.data
    if (!proxy) return
    interval = interval || 5000
    var target = ns ? {} : proxy

    target._loading = false
    target._error = null

    target._fetch = function () {
      this._loading = true
      return nova.http.get(url).then(function (res) {
        for (var k in res) {
          if (Object.prototype.hasOwnProperty.call(res, k) && k.charAt(0) !== '_') {
            this[k] = res[k]
          }
        }
        this._error = null
      }.bind(this)).catch(function (e) {
        this._error = e.message
      }.bind(this)).then(function () {
        this._loading = false
      }.bind(this))
    }

    target._start = function () {
      this._fetch()
      this.__pollTimer = setInterval(this._fetch.bind(this), interval)
    }

    target._stop = function () {
      clearInterval(this.__pollTimer)
    }

    if (ns) {
      proxy[ns] = target
      proxy[ns]._fetch()
      proxy[ns]._start()
    } else {
      target._fetch()
      target._start()
    }
  }

  nova.resource = function (url, ns) {
    var proxy = nova.data
    if (!proxy) return
    var target = ns ? {} : proxy

    target.list = []
    target._loading = false
    target._error = null

    target._fetch = function () {
      this._loading = true
      return nova.http.get(url).then(function (res) {
        this.list = res
      }.bind(this)).catch(function (e) {
        this._error = e.message
      }.bind(this)).then(function () {
        this._loading = false
      }.bind(this))
    }

    target._create = function (body) {
      var temp = {}
      for (var k in body) temp[k] = body[k]
      temp.id = '_' + Date.now()
      temp._pending = true
      this.list.push(temp)
      return nova.http.post(url, body).then(function (created) {
        for (var i = 0; i < this.list.length; i++) {
          if (this.list[i].id === temp.id) { this.list[i] = created; break }
        }
        return created
      }.bind(this)).catch(function (e) {
        this.list = this.list.filter(function (item) { return item.id !== temp.id })
        this._error = e.message
      }.bind(this))
    }

    target._update = function (id, body) {
      var idx = -1
      for (var i = 0; i < this.list.length; i++) { if (this.list[i].id === id) { idx = i; break } }
      if (idx < 0) return Promise.resolve()
      var prev = {}
      for (var k2 in this.list[idx]) prev[k2] = this.list[idx][k2]
      for (var k3 in body) this.list[idx][k3] = body[k3]
      this.list[idx]._pending = true
      return nova.http.put(url + '/' + id, body).then(function (updated) {
        this.list[idx] = updated
        return updated
      }.bind(this)).catch(function (e) {
        this.list[idx] = prev
        this._error = e.message
      }.bind(this))
    }

    target._delete = function (id) {
      var idx = -1
      for (var i = 0; i < this.list.length; i++) { if (this.list[i].id === id) { idx = i; break } }
      if (idx < 0) return Promise.resolve()
      var removed = this.list[idx]
      this.list.splice(idx, 1)
      return nova.http.del(url + '/' + id).catch(function (e) {
        this.list.splice(idx, 0, removed)
        this._error = e.message
      }.bind(this))
    }

    if (ns) {
      proxy[ns] = target
      proxy[ns]._fetch()
    } else {
      target._fetch()
    }
  }

  // 统一刷新
  nova.update = function (ns) {
    var proxy = nova.data
    if (!proxy) return
    var target = ns ? proxy[ns] : proxy
    if (target && typeof target._fetch === 'function') target._fetch()
  }

  var fmtPad = function (n) { return n < 10 ? '0' + n : String(n) }

  nova.fmt = {
    time: function (ts, pattern) {
      var d = new Date(ts)
      if (isNaN(d.getTime())) return ''
      pattern = pattern || 'HH:mm:ss'
      var map = { YYYY: d.getFullYear(), MM: fmtPad(d.getMonth() + 1), DD: fmtPad(d.getDate()), HH: fmtPad(d.getHours()), mm: fmtPad(d.getMinutes()), ss: fmtPad(d.getSeconds()) }
      var out = pattern
      for (var k in map) { out = out.replace(k, map[k]) }
      return out
    },
    date: function (ts) {
      var d = new Date(ts)
      if (isNaN(d.getTime())) return ''
      return d.getFullYear() + '-' + fmtPad(d.getMonth() + 1) + '-' + fmtPad(d.getDate())
    },
    datetime: function (ts) {
      var d = new Date(ts)
      if (isNaN(d.getTime())) return ''
      return d.getFullYear() + '-' + fmtPad(d.getMonth() + 1) + '-' + fmtPad(d.getDate()) + ' ' + fmtPad(d.getHours()) + ':' + fmtPad(d.getMinutes()) + ':' + fmtPad(d.getSeconds())
    },
    // 数值格式化（百分比 / 千分位 / 定点）
    number: function (v, decimals) {
      var n = Number(v)
      if (isNaN(n)) return ''
      var d = typeof decimals === 'number' ? decimals : 0
      return n.toFixed(d)
    },
    percent: function (v, decimals) {
      var n = Number(v)
      if (isNaN(n)) return ''
      var d = typeof decimals === 'number' ? decimals : 0
      return (n * 100).toFixed(d) + '%'
    },
    bytes: function (n) {
      n = Number(n)
      if (isNaN(n) || n < 0) return ''
      if (n < 1024) return n + ' B'
      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'
      if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB'
      return (n / 1073741824).toFixed(2) + ' GB'
    }
  }

  nova.bind = bind

  /* ============== Export ============== */
  if (typeof module !== 'undefined' && module.exports) module.exports = nova
  global.nova = nova
})(typeof window !== 'undefined' ? window : globalThis)