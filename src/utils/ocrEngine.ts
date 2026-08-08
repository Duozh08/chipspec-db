/**
 * OCR 识别引擎管理：模块级单例 + 预热 + 复用。
 *
 * 之前每次识别都 createWorker + terminate → 每次重新下载核心与语言包，导致"总是卡加载"。
 * 且本地 tessdata 之前只部署了非 LSTM core 变体，而 oem=1(LSTM_ONLY) 实际请求
 * tesseract-core-*-lstm.wasm.js → 本地 404 → 全部走 CDN，多设备首次加载必卡。
 *
 * 现状（多设备友好 + 国内网络快）：
 * 1. tessdata 全变体本地化：simd / relaxedsimd / 普通 × LSTM，全设备本地直载，不依赖 CDN；
 * 2. 语言包用 LSTM best_int 模型（1.7+3.0MB），替代完整版（20+11MB），首次加载 40MB → ~11MB；
 * 3. worker 全局复用 + 弹窗预热：核心/语言包只下载一次，之后识别秒级响应；
 * 4. 识别前图片缩放（≤2400px）：移动端省内存、加快识别；
 * 5. 引擎级错误（加载/网络）自动重建，识别级错误不影响复用。
 *
 * 2026-08-08 修复"换包后无法识别"：
 *   - 根因：GitHub Pages 静态托管在用户网络下仅 ~22KB/s，11MB tessdata 需下 8 分钟，
 *     用户等不到完成 → 表现为"无法识别"。jsdelivr 在用户网络下也不通。
 *   - 方案：tessdata 主源切到 CloudBase 静态托管（腾讯云国内 CDN，实测 ~7.5MB/s），
 *     GitHub Pages 同域副本做兜底。缓存命名空间升到 v4，避开旧坏缓存。
 */

export interface OcrEngineHandle {
  /** tesseract.js worker（可多次 recognize，勿 terminate） */
  worker: unknown;
  source: 'cloudbase' | 'github';
}

/** 引擎状态回调（首次加载时触发，供 UI 显示进度） */
export type EngineStatusFn = (status: string, progress?: number, phase?: string) => void;

/** CloudBase 静态托管（腾讯云国内 CDN，快）：主源 */
const CLOUDBASE_TESS = 'https://duozhu08-tengfei-d1eqlp0bae59452-1452185409.tcloudbaseapp.com/tessdata/';
/** GitHub Pages 同域副本（慢但可达）：兜底 */
const GH_TESS = `${import.meta.env.BASE_URL}tessdata/`;
/** 缓存命名空间：v4 = best_int 语言包 + CloudBase 主源（隔离旧版本可能损坏的缓存） */
const CACHE_NS = 'tess-fast-v4';
/** 识别前图片最长边（px）上限：超出则缩放，移动端省内存/加快识别 */
const MAX_IMAGE_DIM = 2400;

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

/** 创建 worker（source 决定 tessdata 源；oem=1 为 LSTM_ONLY，加载 -lstm core 变体） */
async function buildWorker(source: 'cloudbase' | 'github'): Promise<OcrEngineHandle> {
  const Tesseract = (await import('tesseract.js')).default;
  const tessBase = source === 'cloudbase' ? CLOUDBASE_TESS : GH_TESS;
  const worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
    workerPath: `${tessBase}worker.min.js`,
    corePath: tessBase,
    langPath: tessBase,
    cachePath: CACHE_NS,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading tesseract core') {
        emit(`加载识别引擎核心… ${Math.round(m.progress * 100)}%（约 7MB）`, m.progress, 'loading');
      } else if (m.status === 'initializing tesseract') {
        emit('初始化识别引擎…', undefined, 'loading');
      } else if (m.status === 'loading language traineddata') {
        emit(`加载中文/英文语言模型… ${Math.round(m.progress * 100)}%（首次约 5MB，之后自动缓存）`, m.progress, 'downloading');
      }
    },
  });
  return { worker, source };
}

/**
 * 识别前预处理：图片最长边超过 MAX_IMAGE_DIM 时用 canvas 等比缩小，
 * 显著降低移动端内存占用与识别耗时；小图原样返回。
 */
export async function prepareImage(file: File, maxDim = MAX_IMAGE_DIM): Promise<File | Blob> {
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('图片解码失败'));
        el.src = url;
      });
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale >= 1) return file;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片压缩失败'))), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return file;
  }
}

/** 获取引擎（单例）：CloudBase（快）优先，失败降级 GitHub Pages；已创建则直接返回 */
export function ensureEngine(): Promise<OcrEngineHandle> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const sources: ('cloudbase' | 'github')[] = ['cloudbase', 'github'];
    let lastErr: unknown = null;
    for (const src of sources) {
      try {
        return await buildWorker(src);
      } catch (err) {
        lastErr = err;
        console.warn(`[ocrEngine] ${src} 源引擎加载失败，切换下一源`, err);
        emit(`引擎加载失败，正在切换备用源…`, undefined, 'loading');
      }
    }
    // 全部失败：允许下次重试
    enginePromise = null;
    throw lastErr;
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
