# `data.$watch(key, cb)`

> 监听 data 字段变化，触发回调。

## 签名

```js
data.$watch(key, callback)
```

- **`key`**：字符串，支持嵌套路径（`user.name`、`devices.length`）
- **`callback`**：`(newValue, oldValue) => void`

## 基础用法

```js
const data = nova({
  data:  { count: 0, brightness: 50 },
  funcs: { onChange (newValue, oldValue) { /* ... */ } }
})

data.$watch('count', data.onChange)

data.count = 1
// onChange 被调用，newValue=1, oldValue=0
```

## 嵌套路径

```js
nova({
  data:  { user: { name: 'alice', profile: { age: 30 } } },
  funcs: { watchHandler (newValue) { /* ... */ } }
})

data.$watch('user.name', data.watchHandler)
data.$watch('user.profile.age', data.watchHandler)
```

## 数组 length

```js
nova({
  data:  { devices: [] },
  funcs: { onSizeChange (newValue) { /* ... */ } }
})

data.$watch('devices.length', data.onSizeChange)

data.devices.push(x)        // ✅ 触发
data.devices.splice(0, 1)   // ✅ 触发
data.devices[0].name = 'x'  // ❌ 不触发（length 没变）
```

## 多个监听

```js
data.$watch('a', function () { /* a 变了 */ })
data.$watch('b', function () { /* b 变了 */ })
```

互不干扰。

## `this` 不指向 data

```js
data.$watch('count', function (newValue, oldValue) {
  console.log(this)   // undefined（严格模式）或 global（非严格）
})
```

**用闭包变量访问 data**：

```js
const data = nova({ data: { count: 0 } })

data.$watch('count', function (newValue) {
  data.someOtherMethod(newValue)   // ✅ 通过闭包
})
```

## 不触发的情况

```js
data.$watch('count', data.handler)
data.count = 5         // ✅ 触发
data.count = 5         // ❌ 新旧值相同，不触发（用 Object.is 比较）
delete data.count      // ❌ watch 不监听删除（只监听赋值）
```

## 典型场景

### 监听变化触发副作用（防抖上报）

```js
const data = nova({
  data:  { brightness: 50 },
  funcs: {
    save: nova.debounce(async function () {
      await nova.http.put('/api/dim', { value: this.brightness })
    }, 400)
  }
})

data.$watch('brightness', function () { data.save() })
```

完整示例见 [examples/02-slider.html](../examples/02-slider.html)。

### 监听多个字段做一件事

```js
funcs: {
  recompute () { /* ... */ }
}

data.$watch('a', function () { data.recompute() })
data.$watch('b', function () { data.recompute() })
data.$watch('c', function () { data.recompute() })
```

### 跨字段联动

```js
nova({
  data:  { firstName: '张', lastName: '三' },
  funcs: {
    syncFullName (fullName) {
      const parts = fullName.split(' ')
      this.firstName = parts[0]
      this.lastName = parts[1]
    }
  }
})

data.$watch('firstName + " " + lastName', function (fullName) {
  // ❌ 不支持表达式，只能 watch 单个字段
})

// ✅ 改成：
data.$watch('firstName', function (newFirst) {
  document.title = newFirst + ' ' + data.lastName
})
data.$watch('lastName', function (newLast) {
  document.title = data.firstName + ' ' + newLast
})
```

## 接下来

- [`nova()`](./nova)
- [`nova.http`](./http)
- [工具函数](./utils)