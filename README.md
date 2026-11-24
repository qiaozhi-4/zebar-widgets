# zebar-widgets

Zebar **v3.3.1** 的 widget pack，React 19 + Vite 8 + TypeScript。
两个桌面卡片，不占用任务栏区域：

| 组件 | 尺寸 | 位置 | 内容 |
| --- | --- | --- | --- |
| `clock` | 300×150 | 右上 `(2236, 24)` | 时间 / 秒 / 日期 |
| `sysmon` | 300×170 | 右上 `(2236, 188)` | 主机名、CPU、内存、C 盘 |

## 结构

```
zpack.json            ← pack 定义（Zebar 只认这个文件，一层深度）
clock.html            ← Vite 入口，产物进 dist/clock.html
sysmon.html
src/
  lib/useZebar.ts     ← 订阅 provider 的 hook（含浏览器降级）
  lib/format.ts       ← 时间/百分比/天气文案
  styles/base.css     ← 设计变量（配色、字体、圆角）在这里改
  clock/              ← 时钟
  sysmon/             ← 系统监控
dist/                 ← 构建产物，zpack.json 的 htmlPath 指向这里
```

## 首次接线

1. 装 Zebar（未装的话）：

   ```
   winget install --id glzr-io.zebar -e
   ```

   装到 `C:\Program Files\glzr.io\Zebar\`（MSI，机器级，需要 UAC）。

2. 把它接到 Zebar 的扫描目录。Zebar 只扫 `~/.glzr/zebar` 下一层带 `zpack.json` 的文件夹：

   ```
   cmd /c mklink /J "%USERPROFILE%\.glzr\zebar\zebar-widgets" "D:\zebar-widgets"
   ```

   不用联接的话，每次改完跑 `npm run deploy` 复制过去。两种别混用。

3. 托盘 Zebar 图标 → My widgets → 启动 `clock` 和 `sysmon`。

## 改完怎么生效

| 场景 | 命令 | 之后 |
| --- | --- | --- |
| 调样式，想快点看 | `npm run dev` | 浏览器开终端里打印的地址 + `/clock.html` 或 `/sysmon.html`（无宿主，provider 走内置假数据） |
| 要在桌面上看真效果 | `npm run watch` | 增量构建进 `dist/`，再点托盘里的 **Empty cache & reload configs** |
| 正式构建 | `npm run build` | 类型检查 + 打包 |

Zebar 退出后用开始菜单重开即可。想在终端里看它的实时日志（排查窗口定位、provider 报错最有用），
直接 `cd "C:\Program Files\glzr.io\Zebar" && .\zebar.exe`，日志打到 stdout。
`~/.glzr/zebar/errors.log` 只在 pack 配置层面出错时才写。

## 位置与尺寸

`zpack.json` 的 `presets` 控制。坐标用 `anchor` + `offsetX/offsetY`：

- `anchor` 可选 `top_left/top_center/top_right/center_left/center/center_right/bottom_left/bottom_center/bottom_right`
- **`offset` 的正负是反的**：`right` / `bottom` 锚点上，正数是**往外推**（出屏）。
  要在右下角留 24px 边距，得写 `-24px`；`top` / `left` 锚点上正数才是往内。
- `width` / `height` 支持 `px` 和 `%`，是**物理像素**，跟 DPI 缩放无关。

**DPI**：窗口高度是物理 px，但页面里的 CSS px 会被系统缩放放大。150% 缩放下想把
150px 高的卡片保持原样，得把 `height` 改成 225px（150 × 1.5），CSS 里不用动。

## 常见改动位置

- **配色 / 字体 / 圆角**：`src/styles/base.css` 的 `:root`
- **卡片排版**：`src/clock/clock.css`、`src/sysmon/sysmon.css`
- **数据源与刷新率**：对应 `App.tsx` 顶部的 `providers`，`refreshInterval` 单位毫秒。
  时钟 1000，CPU 2000，内存 3000，磁盘 30000，主机名 60000。
- **再加一张卡片**：根目录建 `panel.html` → `vite.config.ts` 的 `input` 加一项 →
  `zpack.json` 的 `widgets` 加一项，`htmlPath` 指向 `./dist/panel.html`。

## 磁盘行是动态的，窗口也跟着长

`sysmon` 里磁盘不写死，`out.disk.disks` 有几块就渲染几行（卷标见 hover 提示）。
但 Zebar 的窗口高度写在 preset 里，所以 `src/sysmon/App.tsx` 里用 `ResizeObserver`
量卡片实际高度，再调 `currentWidget().tauriWindow.setSize()` 把窗口改到同样高。

- 只改高度，宽度取 `window.innerWidth`（CSS px 等于逻辑 px），避免 DPI 缩放下宽度漂移。
- 如果宿主没给 `allow-set-size` 权限，`setSize` 会被拒绝，代码里 catch 后保持 preset 高度
  （190px，正好装 3 块盘），多出来的盘会被裁掉 —— 这时候改 `zpack.json` 的 `height` 即可。

## 三个坑

- **`network` provider 会 panic**。`netdev-0.33.0` 在 Windows 上解析某些虚拟网卡时触发
  `interface/windows.rs:44` 的 panic（tokio worker 里，进程不退出但那个 provider 死掉，
  数据永远是空）。所以这里用 `disk` 代替网速。要用网速得换别的路子。
- **`backdrop-filter` 在 Win11 上失焦后会掉成纯色**。现在卡片用「半透明底色 + 细边框」
  打底，不依赖毛玻璃也成立；想要更重的玻璃感可配 Mica For Everyone。
- **不要加 StrictMode**：provider 组在挂载时创建，双挂载会重复订阅同一份系统数据。

## 数据从哪来

`zebar` 包暴露 provider：`audio battery cpu date disk glazewm host ip keyboard komorebi media memory network systray weather`。
完整字段见 `node_modules/zebar/dist/index.d.ts`。
