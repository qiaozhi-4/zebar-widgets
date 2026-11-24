import { useEffect, useReducer, useState } from 'react';
import {
  createProviderGroup,
  type ProviderGroup,
  type ProviderGroupConfig,
} from 'zebar';

export type ProviderOutputs<T extends ProviderGroupConfig> =
  ProviderGroup<T>['outputMap'];

type AnyConfig = Record<string, { type: string }>;

/** Zebar 会把 Tauri 运行时注入 webview；不在宿主里就没法真的订阅系统数据。 */
export const isHosted =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * 订阅一组 Zebar provider。
 *
 * provider 的输出对象由宿主原地更新、引用不变，所以不能塞进 state 做浅比较；
 * 这里只用一个计数器触发重渲染，渲染时读到的始终是宿主上的最新值。
 * 副作用是 provider 组只在挂载时创建一次，StrictMode 的双挂载会重复订阅。
 *
 * 在浏览器里（`npm run dev`）拿不到宿主，退化成一份静态假数据，方便先调版式。
 */
export function useZebar<T extends ProviderGroupConfig>(
  config: T
): ProviderOutputs<T> {
  const [group] = useState(() => {
    if (!isHosted) return null;
    try {
      return createProviderGroup(config);
    } catch (err) {
      // provider 初始化失败时退回假数据，至少让版式可见，不至于整页空白
      console.error('[zebar] provider init failed', err);
      return null;
    }
  });
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (group) {
      group.onOutput(() => bump());
      return;
    }
    const timer = setInterval(bump, 1000);
    return () => clearInterval(timer);
  }, [group]);

  return group ? group.outputMap : mockOutputs(config);
}

function mockOutputs<T extends ProviderGroupConfig>(config: T): ProviderOutputs<T> {
  const out: Record<string, unknown> = {};
  const entries = config as AnyConfig;

  for (const key of Object.keys(entries)) {
    switch (entries[key].type) {
      case 'date':
        out[key] = {
          get new() {
            return new Date();
          },
          get now() {
            return Date.now();
          },
        };
        break;
      case 'cpu':
        out[key] = { usage: 37, frequency: 3600, physicalCoreCount: 8 };
        break;
      case 'memory':
        out[key] = { usage: 61, usedMemory: 9.8e9, totalMemory: 1.6e10 };
        break;
      case 'battery':
        out[key] = { chargePercent: 78, isCharging: false, state: 'discharging' };
        break;
      case 'media':
        out[key] = { currentSession: null, togglePlayPause: () => {} };
        break;
      case 'weather':
        out[key] = { status: 'cloudy_day', celsiusTemp: 21, isDaytime: true };
        break;
      default:
        out[key] = {};
    }
  }

  return out as ProviderOutputs<T>;
}
