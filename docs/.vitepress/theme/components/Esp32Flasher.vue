<template>
  <div class="esp32-flasher">
    <h1>📥 下载到 ESP32 · {{ project }}</h1>
    <p>{{ config.description }}</p>
    <div class="file-list">
      <code v-for="f in config.files" :key="f.path">{{ f.path }}</code>
    </div>
    <button :disabled="busy" @click="flash">
      {{ busy ? '写入中…' : '📥 下载到 ESP32' }}
    </button>
    <div class="progress">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
    <div class="status" :class="statusClass">{{ status }}</div>
  </div>
</template>

<script setup>
// 关键：把 esp32-serial.js（283 行 ~9.7KB）作为字符串打进 bundle
// 但 Vite 的 ?raw 转义了反引号（\`）和 $（\${），new Function 不能直接 eval
// 所以用原生 <script> 元素注入，浏览器解析器天然支持这些转义
import esp32SerialCode from '../../../../scripts/esp32-serial.js?raw'
import { ref } from 'vue'

// 执行 esp32SerialCode，返回 ESP32Serial 类
function loadESP32Serial () {
  if (window.ESP32Serial) return window.ESP32Serial
  // 创建 <script> 元素，文本是文件内容；浏览器解析器原生处理 \` 和 \${}
  const script = document.createElement('script')
  script.textContent = esp32SerialCode
  document.head.appendChild(script)
  document.head.removeChild(script)
  return window.ESP32Serial
}

const props = defineProps({
  project: { type: String, required: true }
})

// 4 个项目的写入清单
const PROJECTS = {
  'novajs': {
    description: '把 novajs.min.js + index.novajs.html 写到 /static/',
    files: [
      { path: '/static/novajs.min.js', url: '/novajs.min.js' },
      { path: '/static/index.novajs.html', url: '/index.novajs.html' }
    ]
  },
  'nova-style': {
    description: '把 nova-style.min.css + index.novastyle.html 写到 /static/',
    files: [
      { path: '/static/nova-style.min.css', url: '/nova-style.min.css' },
      { path: '/static/index.novastyle.html', url: '/index.novastyle.html' }
    ]
  },
  'nova-ui': {
    description: '把 novajs + nova-ui 三件套写到 /static/（5 个文件）',
    files: [
      { path: '/static/novajs.min.js', url: '/novajs.min.js' },
      { path: '/static/nova-ui-elements.min.js', url: '/nova-ui-elements.min.js' },
      { path: '/static/nova-style.min.css', url: '/nova-style.min.css' },
      { path: '/static/nova-ui.min.css', url: '/nova-ui.min.css' },
      { path: '/static/index.novaui.html', url: '/index.novaui.html' }
    ]
  },
  'nova-chart': {
    description: '把 nova-chart 三件套写到 /static/',
    files: [
      { path: '/static/nova-chart.min.js', url: '/nova-chart.min.js' },
      { path: '/static/nova-chart.min.css', url: '/nova-chart.min.css' },
      { path: '/static/index.novachart.html', url: '/index.novachart.html' }
    ]
  }
}

const config = PROJECTS[props.project] || { description: '', files: [] }
const busy = ref(false)
const progress = ref(0)
const status = ref('准备就绪')
const statusClass = ref('')

function setStatus (msg, cls = '') {
  status.value = msg
  statusClass.value = cls
}

async function fileToBytes (entry) {
  const r = await fetch(entry.url)
  if (!r.ok) throw new Error('下载 ' + entry.url + ' 失败：' + r.status)
  return new Uint8Array(await r.arrayBuffer())
}

async function flash () {
  if (!navigator.serial) {
    setStatus('浏览器不支持 Web Serial API，请用 Chrome / Edge / Opera。', 'error')
    return
  }
  busy.value = true
  setStatus('正在准备文件…')
  progress.value = 0
  let esp
  try {
    // 加载 ESP32Serial 类（用 <script> 元素注入，浏览器原生解析）
    const ESP32Serial = loadESP32Serial()
    if (!ESP32Serial) throw new Error('ESP32Serial 类加载失败')

    // 1. 拉所有文件
    const items = []
    for (const entry of config.files) {
      setStatus('准备 ' + entry.path + ' …')
      items.push({ path: entry.path, bytes: await fileToBytes(entry) })
    }
    // 2. 连接 ESP32
    setStatus('点击弹窗选择 ESP32 串口…')
    esp = new ESP32Serial()
    await esp.connect()
    // 3. 依次写
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      setStatus('写入 ' + it.path + ' (' + (i+1) + '/' + items.length + ')')
      const base = (i / items.length) * 100
      await esp.writeFile(it.path, it.bytes, pct => {
        progress.value = base + (pct / items.length)
      })
    }
    progress.value = 100
    setStatus('✅ 上传完成！文件已写到 ESP32 的 /static/ 目录。重启 ESP32 后按你的 main.py 配置访问（默认 AP 模式 http://192.168.4.1/，详细看 [ESP32 部署文档]）', 'ok')
  } catch (e) {
    setStatus('❌ ' + (e.message || e), 'error')
    console.error(e)
  } finally {
    if (esp) try { await esp.disconnect() } catch (_) {}
    busy.value = false
  }
}
</script>

<style scoped>
.esp32-flasher {
  background: var(--vp-c-bg-soft, #f9fafb);
  border: 1px solid var(--vp-c-divider, #e5e7eb);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.45;
  max-width: 720px;
}
.esp32-flasher h1 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1, #111827);
}
.esp32-flasher p {
  margin: 0 0 8px;
  color: var(--vp-c-text-2, #6b7280);
  font-size: 12px;
}
.file-list {
  margin: 0 0 8px;
  padding: 6px 10px;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, #e5e7eb);
  border-radius: 4px;
  font-size: 11px;
  max-height: 110px;
  overflow-y: auto;
}
.dark .file-list { background: var(--vp-c-bg, #1e293b); }
.file-list code {
  display: block;
  color: var(--vp-c-text-1, #111827);
  word-break: break-all;
  padding: 1px 0;
  font-family: ui-monospace, "SF Mono", Consolas, monospace;
}
button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: #10b981;
  color: #fff;
  border: 0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}
button:disabled { background: #9ca3af; cursor: not-allowed; }
button:hover:not(:disabled) { background: #059669; }
.progress {
  margin-top: 8px;
  height: 4px;
  background: var(--vp-c-divider, #e5e7eb);
  border-radius: 2px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: #10b981;
  width: 0;
  transition: width 0.2s;
}
.status {
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, #e5e7eb);
  border-radius: 4px;
  font-size: 11px;
  min-height: 20px;
  word-break: break-all;
  color: var(--vp-c-text-2, #6b7280);
}
.dark .status { background: var(--vp-c-bg, #1e293b); }
.status.error {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}
.dark .status.error { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
.status.ok {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}
.dark .status.ok { background: #052e16; color: #86efac; border-color: #14532d; }
</style>
