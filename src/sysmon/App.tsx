import { useEffect, useRef, type RefObject } from 'react';
import { currentWidget } from 'zebar';
import { clamp, toneOf } from '../lib/format';
import { isHosted, useZebar } from '../lib/useZebar';
import './sysmon.css';

const providers = {
  cpu: { type: 'cpu', refreshInterval: 2000 },
  memory: { type: 'memory', refreshInterval: 3000 },
  disk: { type: 'disk', refreshInterval: 30000 },
  host: { type: 'host', refreshInterval: 60000 },
} as const;

const GB = 1024 ** 3;

export function App() {
  const out = useZebar(providers);
  const cardRef = useRef<HTMLDivElement>(null);

  const disks = out.disk?.disks ?? [];
  const cpu = clamp(out.cpu?.usage);
  const memory = clamp(out.memory?.usage);

  const usedRam = out.memory ? (out.memory.usedMemory / GB).toFixed(1) : '—';
  const totalRam = out.memory ? (out.memory.totalMemory / GB).toFixed(0) : '—';

  useFitToContent(cardRef, Boolean(out.disk));

  return (
    <div className="card" ref={cardRef}>
      <div className="head">
        <span className="host">{out.host?.hostname ?? 'SYSTEM'}</span>
        <span className="kind">系统</span>
      </div>

      <Row
        label="CPU"
        value={cpu}
        extra={out.cpu ? `${out.cpu.logicalCoreCount} 线程` : undefined}
      />
      <Row label="MEM" value={memory} extra={`${usedRam} / ${totalRam} GB`} />

      <div className="disks">
        {disks.map((disk) => {
          const total = disk.totalSpace.bytes;
          const used = total - disk.availableSpace.bytes;
          const percent = total > 0 ? clamp((used / total) * 100) : 0;
          const label = disk.mountPoint.replace(/[\\/]+$/, '');
          const detail = `${(used / GB).toFixed(1)} / ${(total / GB).toFixed(0)} GB`;

          return (
            <div
              className={`disk tone-${toneOf(percent)}`}
              key={disk.mountPoint}
              title={disk.name ? `${disk.name} · ${detail}` : detail}
            >
              <span className="disk-name">{label}</span>
              <span className="disk-track">
                <span className="disk-fill" style={{ width: `${percent}%` }} />
              </span>
              <span className="disk-pct num">
                {Math.round(percent)}
                <em>%</em>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  extra,
}: {
  label: string;
  value: number;
  extra?: string;
}) {
  return (
    <div className={`row tone-${toneOf(value)}`}>
      <div className="row-top">
        <span className="row-label">{label}</span>
        <span className="row-extra">{extra}</span>
        <span className="row-value num">
          {Math.round(value)}
          <em>%</em>
        </span>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

type LogicalSize = { type: 'Logical'; width: number; height: number };

/** 磁盘数量是变量，窗口高度得跟着内容走，否则多一块盘就被裁掉。 */
function useFitToContent(
  ref: RefObject<HTMLDivElement | null>,
  ready: boolean
) {
  useEffect(() => {
    if (!isHosted || !ready) return;
    const element = ref.current;
    if (!element) return;

    const widget = currentWidget();
    let applied = 0;

    const apply = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height < 40 || height === applied) return;
      applied = height;

      const size: LogicalSize = {
        type: 'Logical',
        width: window.innerWidth,
        height,
      };
      widget.tauriWindow
        .setSize(size as unknown as Parameters<typeof widget.tauriWindow.setSize>[0])
        .catch(() => {
          // 宿主没给 allow-set-size 权限时降级：窗口保持 preset 高度
        });
    };

    const observer = new ResizeObserver(apply);
    observer.observe(element);
    apply();

    return () => observer.disconnect();
  }, [ref, ready]);
}
