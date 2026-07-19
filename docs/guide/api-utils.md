# 工具函数

## nova.debounce

防抖包装。

```js
nova.debounce(fn, ms) → Function
```

连续调用只触发最后一次：

```js
const save = nova.debounce(async function () {
  await nova.http.put('/api/save', this)
}, 400)

save(); save(); save()  // 只发一次请求
```

---

## nova.interval / nova.timeout

托管定时器，返回控制器：

```js
// 定时器
const timer = nova.interval(function () {
  console.log('每 3 秒执行')
}, 3000)
timer.start()   // 开始
timer.stop()    // 停止

// 超时
const to = nova.timeout(function () {
  console.log('3 秒后执行')
}, 3000)
to.start()      // 开始倒计时
to.cancel()     // 取消
```

---

## nova.nextTick

下一个 microtask 执行：

```js
data.count = 99
await nova.nextTick()
// DOM 已更新
```

---

## nova.bind

程序化绑定：

```js
nova.bind(path, selector, options?)
```

```js
nova.bind('user.name', '#display')
nova.bind('username', 'input[name=username]')
nova.bind('rawHtml', '#content', { html: true })
```

---

## nova.fmt

日期时间格式化，默认 `YYYY-MM-DD HH:mm:ss`：

```js
nova.fmt.date(ts)              // "2026-06-20"
nova.fmt.time(ts)              // "14:30:45"
nova.fmt.datetime(ts)          // "2026-06-20 14:30:45"
nova.fmt.time(ts, 'HH:mm')     // "14:30"
nova.fmt.time(ts, 'YYYY/MM')   // "2026/06"
```

---

## nova.dom

元素查询：

```js
nova.dom('#myCanvas').getContext('2d')
nova.dom('#myInput').focus()
```

---

## nova.poll / nova.api

数据同步。自动开始，字段平铺到命名空间。

```js
// 轮询（每 3 秒拉一次）
nova.poll('/api/sensors', 3000, 'sensors')
// → nova.data.sensors.temp, .humid, ._loading, ._error

// 单值 API（GET/POST/PUT/DELETE）
nova.api('/api/msg', 'msg')
// → nova.data.msg.value, .get(), .post(), .put(), .delete()

// 模板
{{ sensors.temp }}°C
{{ msg.value }}

// 方法
msg.get()
msg.post({ text: '新值' })
msg.put({ text: '修改' })
msg.delete()
```

**内部字段**（`_` 前缀）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `value` | Any | GET 获取的数据 |
| `_loading` | Boolean | 请求中 |
| `_error` | String | 错误信息 |

---

## nova.update

手动刷新命名空间：

```js
nova.update('sensors')   // 调 sensors.get()
nova.update()            // 调根级 get()
```
