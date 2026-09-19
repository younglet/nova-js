# nova-js TODO

> 库内部的待办与已定位的坑。**这些不该出现在教案或学生材料里** —— 教案只写老师和学生需要知道的东西。

---

## 🐛 `loop` 作用域里的方法丢了 `this`（已定位，未修）

### 症状

`@click="doSomething()"` 写在 `loop` 里时，`doSomething` 里的 `this.xxx` 是 `undefined`。

**点下去什么都不发生，控制台也不报错**（表达式外面套了 `catch`，错误被吞掉了）。
从表象看很像"事件没绑上"，其实事件是绑上了、函数也进去了，是 `this` 不对。

### 最小复现

```html
<div loop="(item, i) in list">
  <button @click="pick(i)">点我</button>
</div>
```

```js
nova({
  data: { list: [1, 2, 3] },
  funcs: {
    pick: function (i) { this.list[i] = 9 }     // this.list → undefined ✗
  }
})
```

### 病根

`src/novajs.js` 的 `bindFor()` 里：

```js
var childScope = Object.create(null)            // ← 普通对象，不是 proxy
...
for (var mi = 0; mi < methodKeys.length; mi++) {
  childScope[methodKeys[mi]] = srcMethods[methodKeys[mi]]   // ← 裸拷，没绑 this
}
```

而 proxy 的 `get` 里本来有一层专门绑 `this` 的：

```js
if (methods && methods[k]) {
  return bindMethod(methods[k], proxy)          // ← 被 loop 绕过了
}
```

所以**只有在 `loop` 里**，方法会丢掉 `this`。别处（外层、`if` 里）都正常。

### 为什么现有页面大多没暴露

它们点的是 `nova.http.put(...)`、`config.put(...)`、`msg.post(...)` 这类**外部对象**，
不碰 `this`。用 `this.xxx` 的只有画板那类页面。

### 修的方向

1. **给 `childScope` 里的方法也包一层**
   ```js
   childScope[mk] = bindMethod(srcMethods[mk], <根 proxy>)
   ```
   注意 `_data` 是在 `nova()` 里**先 walk、后赋值**的，当场取会拿到旧值 →
   要**延迟到调用时**再取：`fn.apply(nova.data || _data, arguments)`

2. **让 `childScope` 能写穿到根数据**
   `childScope` 现在是普通对象，所以 `@click="c = color"` 这种**直接赋值**
   只写进副本，根数据不动、界面也不刷新。做成 Proxy 转发 `set` 可以一起解决。

3. 两条都做完，`loop` 里的 `this` 和直接赋值才和 `loop` 外**行为一致**。

### 临时绕法

需要交互的复杂界面（比如 8×8 点阵画板）**走自建 DOM 的组件**，别用 `loop` 铺格子 ——
库里 `matrix-board.js` 就是这么做的：纯 JS 建 DOM，点击靠 `data-*` 取坐标，不依赖 `loop` 的作用域。

---

## 待办

- [ ] 修 `bindFor` 的 `this` 问题（见上）
- [ ] 补一条回归测试：`loop` 里的 `@click` 调方法，断言 `this` 是数据对象
- [ ] 考虑给 `loop` 铺大量节点时加个上限或提示（64 格 × 多次重渲染会明显卡）
