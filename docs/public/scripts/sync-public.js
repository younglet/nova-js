// scripts/sync-public.js
// 把 src/ 和 examples/ 下的文件同步到 docs/public/，让 VitePress 能引用
// 用法：node scripts/sync-public.js
// 在 docs:dev / docs:build 前自动调用（见 package.json scripts.prepublish）

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function copyFile (src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`  ✓ ${path.relative(root, src)} → ${path.relative(root, dest)}`)
}

function copyDir (srcDir, destDir, exts) {
  if (!fs.existsSync(srcDir)) return
  for (const name of fs.readdirSync(srcDir)) {
    const src  = path.join(srcDir, name)
    const dest = path.join(destDir, name)
    if (fs.statSync(src).isDirectory()) {
      copyDir(src, dest, exts)
    } else if (!exts || exts.some(e => name.endsWith(e))) {
      copyFile(src, dest)
    }
  }
}

console.log('[sync-public] nova-js')

// src/*.min.js → docs/public/
const srcDir = path.join(root, 'src')
if (fs.existsSync(srcDir)) {
  for (const name of fs.readdirSync(srcDir)) {
    if (name.endsWith('.min.js') || name.endsWith('.min.css')) {
      copyFile(path.join(srcDir, name), path.join(root, 'docs/public', name))
    }
  }
}

// src/ 整个目录（不经 min 过滤）→ docs/public/src/
// 原因：iframe 里的 HTML 可能用 `../src/...` 相对路径
copyDir(srcDir, path.join(root, 'docs/public/src'), null)

// examples/*.html → docs/public/examples/
copyDir(path.join(root, 'examples'), path.join(root, 'docs/public/examples'), ['.html'])

// docs/examples/ → docs/public/examples/
copyDir(path.join(root, 'docs/examples'), path.join(root, 'docs/public/examples'), ['.html'])

// index.<name>.html → docs/public/
const indexHtml = path.join(root, 'index.novajs.html')
if (fs.existsSync(indexHtml)) {
  copyFile(indexHtml, path.join(root, 'docs/public', 'index.novajs.html'))
}

// scripts/esp32-serial.js → docs/public/scripts/
// 原因：flasher.html 里用 <script src="../../../scripts/esp32-serial.js">，
// VitePress 只服务 docs/，所以根目录的 scripts/ 同步到 docs/public/scripts/
const scriptsDir = path.join(root, 'scripts')
if (fs.existsSync(scriptsDir)) {
  copyDir(scriptsDir, path.join(root, 'docs/public/scripts'), null)
}

console.log('[sync-public] done')
