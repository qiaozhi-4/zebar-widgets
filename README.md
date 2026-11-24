# zebar-widgets

Zebar **v3.3.1** 的 widget pack，React 19 + Vite 8 + TypeScript。
一张桌面卡片 `panel`（300 宽），右上角竖排，不占用任务栏区域：

```
DESKTOP-XXXX                        系统
09:58                    36
11月24日 星期一
────────────────────────────────
CPU                    28 线程   26%
[====          ]
MEM              26.8 / 31.8 GB  84%
[========      ]
────────────────────────────────
C:   [███████░]  78%
D:   [█████░░░]  59%
E:   [██████░░]  67%
```

时钟和系统信息放在**同一个窗口**里，只占一个 WebView2 renderer
（两个窗口的方案实测多花 75 MB 内存，见下）。

## 结构

```
zpack.json            ← pack 定义（Zebar 只认这个文件，一层深度）
panel.html            ← Vite 入口，产物进 dist/panel.html
src/
  lib/useZebar.ts     ← 订阅 provider 的 hook（含浏览器降级）
  lib/format.ts       ← 时间/百分比格式化
  styles/base.css     ← 设计变量（配色、字体、圆角）在这里改
  panel/              ← 卡片本体：App.tsx + panel.css + main.tsx
dist/                 ← 构建产物，zpack.json 的 htmlPath 指向这里
```

## 首次接线

1. 装 Zebar（未装的话）：

   ```
   winget install --id glzr-io.zebar -e
   ```

   装到 `C:\Program Files\glzr.io\Zebar\`（MSI，机器级，需要 UAC）。

2. 接到 Zebar 的扫描目录。Zebar 只扫 `~/.glzr/zebar` 下一层带 `zpack.json` 的文件夹：

   ```
   cmd /c mklink /J "%USERPROFILE%\.glzr\zebar\zebar-widgets" "D:\zebar-widgets"
   ```

   不用联接的话，每次改完跑 `npm run deploy` 复制过去。两种别混用。

3. 托盘 Zebar 图标 → My widgets → 启动 `panel`。

## 改完怎么生效

| 场景 | 命令 | 之后 |
| --- | --- | --- |
| 调样式，想快点看 | `npm run dev` | 浏览器开终端里打印的地址 + `/panel.html`（无宿主，provider 走内置假数据） |
| 要在桌面上看真效果 | `npm run watch` | 增量构建进 `dist/`，再点托盘里的 **Empty cache & reload configs** |
| 正式构建 | `npm run build` | 类型检查 + 打包 |

想在终端里看 Zebar 的实时日志（排查窗口定位、provider 报错最有用）：

```
cd "C:\Program Files\glzr.io\Zebar"; .\zebar.exe
```

日志打到 stdout。`~/.glzr/zebar/errors.log` 只在 pack 配置层面出错时才写。

## 位置与尺寸

`zpack.json` 的 `presets` 控制。坐标用 `anchor` + `offsetX/offsetY`：

- `anchor` 可选 `top_left/top_center/top_right/center_left/center/center_right/bottom_left/bottom_center/bottom_right`
- **`offset` 的正负是反的**：`right` / `bottom` 锚点上，正数是**往外推**（出屏）。
  要在右上角留 24px 边距，`offsetX` 要写 `-24px`，`offsetY` 写 `24px`。
- `width` / `height` 是**物理像素**，跟 DPI 缩放无关。150% 缩放下想让
  290px 的卡片保持观感，得改成 435px（290 × 1.5），CSS 里不用动。

## 磁盘行是动态的，窗口也跟着长

磁盘不写死，`out.disk.disks` 有几块就渲染几行（卷标见 hover 提示）。
窗口高度因此用 `ResizeObserver` 量卡片实际高度，再调
`currentWidget().tauriWindow.setSize()` 跟着改。

- 只改高度，宽度取 `window.innerWidth`（CSS px 等于逻辑 px），避免 DPI 缩放下宽度漂移。
- 如果宿主没给 `allow-set-size` 权限，`setSize` 会被拒绝，catch 后保持 preset 高度
  （290px，正好装 3 块盘），多出来的盘会被裁掉 —— 这时改 `zpack.json` 的 `height` 即可。

## 已知问题

**`Win+D` / 任务栏"显示桌面"会把卡片一起最小化**，之后随便开个窗口才回来。
原因是 Win+D 最小化所有顶层窗口，而 Zebar 没有提供"桌面层"窗口类型
（Rainmeter 的 `On Desktop` 就是干这个的，把皮肤挂到 Progman/WorkerW 下）。
上游 issue tracker 里没有这条记录，pack 层面无法修复。

## 资源开销（实测）

| 方案 | 私有内存 | CPU（15s 采样） |
| --- | --- | --- |
| 两个独立窗口（clock + sysmon） | 263 MB | 16 ms（单核 0.10%） |
| 合并成一个窗口 | **188 MB** | **16 ms（单核 0.10%）** |

CPU 基本是测量精度下限：1Hz 的时钟重渲染一次约 1 ms，其余 provider 各自
2 s / 3 s / 30 s / 60 s 才刷新一次，可以忽略。

## 三个坑

- **`network` provider 会 panic**。`netdev-0.33.0` 在 Windows 上解析某些虚拟网卡时触发
  `interface/windows.rs:44` 的 panic（tokio worker 里，进程不退出但那个 provider 死掉，
  数据永远是空）。所以这里用 `disk` 代替网速。
- **`backdrop-filter` 在 Win11 上失焦后会掉成纯色**。现在卡片用「半透明底色 + 细边框」
  打底，不依赖毛玻璃也成立。
- **不要加 StrictMode**：provider 组在挂载时创建，双挂载会重复订阅同一份系统数据。

## 数据从哪来

`zebar` 包暴露 provider：`audio battery cpu date disk glazewm host ip keyboard komorebi media memory network systray weather`。
完整字段见 `node_modules/zebar/dist/index.d.ts`。
