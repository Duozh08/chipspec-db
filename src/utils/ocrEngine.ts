/**
 * OCR 识别引擎管理：模块级单例 + 预热 + 复用。
 *
 * 之前每次识别都 createWorker + terminate → 每次重新下载 ~8MB 核心
 * （importScripts 同步加载、无 IndexedDB 缓存）+ 检查 31MB 语言包，导致"总是卡加载"。
 *
 * 现在：
 * 1. worker 全局复用：核心/语言包只加载一次，之后识别秒级响应；
 * 2. 弹窗打开即后台预热（warmup），用户粘贴图片期间引擎已就绪；
 * 3. local 优先，失败自动 fallback CDN；
 * 4. 引擎级错误（加载/网络）自动重建，识别级错误不影响复用。
 */

export interface OcrEngineHandle {
  /** tesseract.js worker（可多次 recognize，勿 terminate） */
  worker: unknown;
  source: 'local' | 'cdn';
}

/** 引擎状态回调（首次加载时触发，供 UI 显示进度） */
export type EngineStatusFn = (status: string, progress?: number, phase?: string) => void;

const TESS_BASE = `${import.meta.env.BASE_URL}tessdata/`;
const CDN_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js';
const CDN_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0';
const CDN_LANG = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/';

let enginePromise: Promise<OcrEngineHandle> | null = null;
let statusCb: EngineStatusFn | null = null;

/** 设置状态回调（谁发起加载谁设置；模块级变量供 worker logger 使用） */
export function setEngineStatusCb(cb: EngineStatusFn | null) {
  statusCb = cb;
}

function emit(status: string, progress?: number, phase?: string) {
  try {
    statusCb?.(status, progress, phase);
  } catch {
    /* ignore */
  }
}

/** 创建 worker（source 决定本地/CDN） */
async function buildWorker(useCdn: boolean): Promise<OcrEngineHandle> {
  const Tesseract = (await import('tesseract.js')).default;
  const worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
    workerPath: useCdn ? CDN_WORKER : `${TESS_BASE}worker.min.js`,
    corePath: useCdn ? CDN_CORE : TESS_BASE,
    langPath: useCdn ? CDN_LANG : TESS_BASE,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading tesseract core') {
        emit(`加载识别引擎核心… ${Math.round(m.progress * 100)}%（约 8MB）`, m.progress, 'loading');
      } else if (m.status === 'initializing tesseract') {
        emit('初始化识别引擎…', undefined, 'loading');
      } else if (m.status === 'loading language traineddata') {
        emit(`加载中文/英文语言模型… ${Math.round(m.progress * 100)}%（首次约 30MB，之后自动缓存）`, m.progress, 'downloading');
      }
    },
  });
  return { worker, source: useCdn ? 'cdn' : 'local' };
}

/** 获取引擎（单例）：本地优先，失败自动降级 CDN；已创建则直接返回 */
export function ensureEngine(): Promise<OcrEngineHandle> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    try {
      return await buildWorker(false);
    } catch (localErr) {
      console.warn('[ocrEngine] 本地引擎加载失败，切换 CDN 重试', localErr);
      emit('本地引擎加载失败/超时，正在切换 CDN…', undefined, 'loading');
      try {
        return await buildWorker(true);
      } catch (cdnErr) {
        // 全部失败：允许下次重试
        enginePromise = null;
        throw cdnErr;
      }
    }
  })();
  return enginePromise;
}

/** 后台预热（弹窗打开即调用；幂等，可重复调用） */
export function warmup() {
  ensureEngine().catch((err) => console.warn('[ocrEngine] 预热失败（用户仍可手动重试）', err));
}

/** 销毁引擎并置空（引擎级错误恢复；下次调用 ensureEngine 会重建） */
export function resetEngine() {
  const p = enginePromise;
  enginePromise = null;
  if (p) {
    p.then((h) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (h.worker as any).terminate?.();
      } catch {
        /* ignore */
      }
    }).catch(() => {
      /* ignore */
    });
  }
}
