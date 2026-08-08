import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND_LABELS, LAPTOP_BRAND_LABELS } from '../data/types';
import { addPendingItem, exportPendingItems, guessBrand, loadPendingItems, removePendingItem } from '../utils/pendingStore';
import type { PendingItem } from '../utils/pendingStore';
import { addLocalCatalogItem, loadLocalChips, loadLocalLaptops, saveLocalCatalogFilled } from '../utils/localCatalog';
import { apiCollect, apiList } from '../utils/apiClient';
import { matchChipsInText, matchLaptopsInText, extractUnknownCandidates } from '../utils/modelMatcher';
import type { UnknownCandidate } from '../utils/modelMatcher';
import { useCollectSync } from '../hooks/useCollectSync';

export default function RecognizeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'downloading' | 'recognizing' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [text, setText] = useState('');
  const [chipHits, setChipHits] = useState<{ id: string; model: string; brand: string; category: string; matchedText: string }[]>([]);
  const [laptopHits, setLaptopHits] = useState<{ id: string; name: string; model: string; brand: string; year: string; matchedText: string }[]>([]);
  const [unknowns, setUnknowns] = useState<UnknownCandidate[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>(loadPendingItems);
  /** 已收录的候选名（点击立即收录后显示收录状态） */
  const [collectedNames, setCollectedNames] = useState<Record<string, true>>({});
  const [savedMsg, setSavedMsg] = useState('');
  const [rematchMsg, setRematchMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const cancelledRef = useRef(false);

  // 轮询后端补全状态：发现已补全 → 刷新本地清单（显示 ✓ 已补全）
  const sync = useCollectSync(2500);
  useEffect(() => {
    setPendingItems(loadPendingItems());
    if (sync.changed) {
      setSavedMsg('检测到新的补全结果，已更新状态');
      setTimeout(() => setSavedMsg(''), 5000);
    }
  }, [sync.changed]);

  const runMatch = useCallback((value: string) => {
    const localChips = loadLocalChips();
    const localLaptops = loadLocalLaptops();
    const chips = matchChipsInText(value, localChips).map((r) => ({
      id: r.item.id, model: r.item.model, brand: r.item.brand,
      category: r.item.category, matchedText: r.matchedText,
    }));
    const laps = matchLaptopsInText(value, localLaptops).map((r) => ({
      id: r.item.id, name: r.item.displayName, model: r.item.model,
      brand: r.item.brand, year: r.item.release?.slice(0, 4) ?? '', matchedText: r.matchedText,
    }));
    setChipHits(chips.filter((c, i) => chips.findIndex((x) => x.id === c.id) === i).slice(0, 10));
    setLaptopHits(laps.filter((l, i) => laps.findIndex((x) => x.id === l.id) === i).slice(0, 10));
    setUnknowns(extractUnknownCandidates(value, localChips, localLaptops));
  }, []);

  /** 从 textarea 实时读取文本（避免闭包捕获旧值）并重新匹配 */
  const handleRematch = useCallback(() => {
    const v = textAreaRef.current?.value ?? text;
    setText(v);
    runMatch(v);
    setRematchMsg(`已按修改后的文本重新匹配：${v.slice(0, 40)}${v.length > 40 ? '…' : ''}`);
    setTimeout(() => setRematchMsg(''), 4000);
  }, [runMatch, text]);

  const handleImage = (f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setText('');
    setChipHits([]);
    setLaptopHits([]);
    setUnknowns([]);
    setPhase('idle');
    setProgress(0);
    setStatusText('');
    setErrorMsg('');
  };

  // 弹框打开时监听 Ctrl+V 直接粘贴
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const f = item?.getAsFile();
      if (f) handleImage(f);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleRecognize = async (useCdn = false) => {
    if (!file) return;
    cancelledRef.current = false;
    setRecognizing(true);
    setPhase('loading');
    setProgress(0);
    setStatusText(useCdn ? '正在通过 CDN 加载识别引擎…' : '准备识别引擎…');
    setErrorMsg('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let worker: any = null;
    let timer: number | undefined;

    const createTimeout = (ms: number) =>
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('加载超时')), ms);
      });

    const runOcr = async (cfg: {
      workerUrl: string;
      coreUrl: string;
      langUrl: string;
      source: 'local' | 'cdn';
    }) => {
      const Tesseract = (await import('tesseract.js')).default;
      worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
        workerPath: cfg.workerUrl,
        corePath: cfg.coreUrl,
        langPath: cfg.langUrl,
        logger: (m: { status: string; progress: number }) => {
          if (cancelledRef.current) return;
          if (m.status === 'loading tesseract core') {
            setPhase('loading');
            setStatusText(
              `加载识别引擎核心… ${Math.round(m.progress * 100)}%（首次约 5MB，请耐心等待）`
            );
          } else if (m.status === 'initializing tesseract') {
            setPhase('loading');
            setStatusText('初始化识别引擎…');
          } else if (m.status === 'loading language traineddata') {
            setPhase('downloading');
            setStatusText(
              `加载中文/英文语言模型… ${Math.round(m.progress * 100)}%（首次约 30MB，请耐心等待）`
            );
            setProgress(Math.round(m.progress * 100));
          } else if (m.status === 'recognizing text') {
            setPhase('recognizing');
            setStatusText('识别中…');
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      if (cancelledRef.current) return '';
      const { data } = await worker.recognize(file);
      return data.text || '';
    };

    try {
      const tessBase = `${import.meta.env.BASE_URL}tessdata/`;
      let ocrText = '';

      if (!useCdn) {
        try {
          const localPromise = runOcr({
            workerUrl: `${tessBase}worker.min.js`,
            // 目录形式：让 worker 根据设备 SIMD 支持自动选择 core 文件，
            // 避免硬编码 simd 版本在部分浏览器上加载失败
            coreUrl: tessBase,
            langUrl: tessBase,
            source: 'local',
          });
          ocrText = await Promise.race([localPromise, createTimeout(180000)]);
        } catch (localErr) {
          if (cancelledRef.current) throw new Error('已取消');
          // 本地失败，自动 fallback CDN
          setPhase('loading');
          setStatusText('本地引擎加载失败/超时，正在切换 CDN 重试…');
          const cdnPromise = runOcr({
            workerUrl: 'https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js',
            coreUrl: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0',
            langUrl: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/',
            source: 'cdn',
          });
          ocrText = await Promise.race([cdnPromise, createTimeout(180000)]);
        }
      } else {
        const cdnPromise = runOcr({
          workerUrl: 'https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js',
          coreUrl: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0',
          langUrl: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/',
          source: 'cdn',
        });
        ocrText = await Promise.race([cdnPromise, createTimeout(180000)]);
      }

      if (cancelledRef.current) {
        setPhase('idle');
        setText('');
        return;
      }
      setText(ocrText || '（未识别到文字，请重试或手动输入型号）');
      runMatch(ocrText || '');
      setPhase('idle');
    } catch (err) {
      console.error(err);
      setPhase('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        msg.includes('已取消')
          ? '已取消识别，您可以直接在下方输入型号文本进行匹配。'
          : `识别引擎加载失败：${msg}。请检查网络，或点击「切换 CDN 重试」。`
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          /* ignore */
        }
      }
      setRecognizing(false);
    }
  };

  /** 立即收录（全自动）：优先后端 API（DeepSeek 自动补全），未配置/失败降级本地 */
  const handleCollect = async (cand: UnknownCandidate) => {
    if (collectedNames[cand.name]) return;
    setCollectedNames((prev) => ({ ...prev, [cand.name]: true }));
    const brand = guessBrand(cand.name);
    let backend = false;
    try {
      await apiCollect(cand.name, cand.type, brand);
      backend = true;
    } catch {
      backend = false;
    }
    // 本地同步（保证 UI 即时可见：列表 New 标记、右上角徽章）
    await addLocalCatalogItem(cand.name, cand.type, brand);
    addPendingItem({
      name: cand.name,
      category: cand.type,
      brand,
      note: backend ? '已提交后端，AI 自动补全中' : '本地收录，AI 补全中',
    });
    setPendingItems(loadPendingItems());
    setSavedMsg(
      backend
        ? `已收录「${cand.name}」，后端 AI 已开始自动搜索补全，规格将按站内格式填充`
        : `已收录「${cand.name}」（本地模式），已自动获取信息并按站内格式生成，列表显示 New 标记（24 小时）`
    );
    setTimeout(() => setSavedMsg(''), 8000);

    // 主动快速跟踪补全（最快路径）：每 2s 查一次后端，命中已补全 + 完整规格后立即写回本地，
    // 列表/详情马上显示处理器/显卡等详细数据，无需等全局 2.5s 轮询（useCollectSync）
    if (backend) {
      const name = cand.name;
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const items = await apiList('filled');
          const hit = items.find((it) => it.name.toLowerCase() === name.toLowerCase());
          if (hit?.spec) {
            await saveLocalCatalogFilled(name, hit.spec, hit.filledAt);
            setPendingItems(loadPendingItems());
            break;
          }
        } catch {
          /* 后端瞬断时跳过，等下一轮 */
        }
      }
    }
  };

  const goTo = (to: string) => {
    onClose();
    navigate(to);
  };

  const hasResult = chipHits.length > 0 || laptopHits.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* 弹框 */}
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div>
              <div className="text-sm font-bold text-slate-900">截图识别</div>
              <div className="text-[11px] text-slate-400">识别芯片 / 游戏本型号，自动匹配站内数据</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="关闭">
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* 滚动内容 */}
        <div ref={bodyRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {/* 步骤1：粘贴/上传截图 */}
          <div
            ref={pasteRef}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition ${
              imageUrl ? 'border-slate-200 bg-slate-50' : 'border-blue-300 bg-blue-50/40 hover:border-blue-400'
            }`}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="待识别截图" className="max-h-56 max-w-full rounded-lg shadow" />
            ) : (
              <>
                <div className="mb-1.5 text-3xl">📋</div>
                <div className="text-sm font-medium text-slate-700">在这里粘贴截图（Ctrl+V）或点击选择图片</div>
                <div className="mt-1 text-xs text-slate-400">支持 PNG / JPG / WebP，识别在本机完成，图片不上传</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
              }}
            />
          </div>

          {/* 立即识别按钮 */}
          {imageUrl && !recognizing && phase !== 'error' && (
            <button
              onClick={() => handleRecognize(false)}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              🔍 立即识别
            </button>
          )}

          {/* 手动输入文本匹配（无需等待 OCR 引擎下载） */}
          {imageUrl && !recognizing && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2">
                <span className="text-xs font-semibold text-slate-600">📝 或直接输入型号文本匹配</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-b-xl p-3 text-sm outline-none"
                placeholder="例如：天选6选哪一个套餐；拯救者Y7000P 2025；RTX 5060…"
              />
              <button
                type="button"
                onClick={() => {
                  if (!text.trim()) return;
                  runMatch(text.trim());
                }}
                disabled={!text.trim()}
                className="m-3 mt-0 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                匹配文本
              </button>
            </div>
          )}

          {/* 识别中状态 */}
          {recognizing && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                <span className="flex min-w-0 items-center gap-2">
                  {phase !== 'recognizing' && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 animate-spin text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 3a9 9 0 1 0 9 9" />
                    </svg>
                  )}
                  <span className="truncate">{statusText}</span>
                </span>
                {phase === 'recognizing' && <span className="shrink-0">{progress}%</span>}
              </div>
              {phase === 'recognizing' ? (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              ) : (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-400" />
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-5 text-slate-400">
                  首次使用需下载识别引擎与语言包（约 35MB）。由于浏览器使用 importScripts 同步加载核心文件，进度条可能在 0% 停留较长时间，请耐心等待（通常 10-60 秒）。下载完成后会自动缓存，下次无需重复下载。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    cancelledRef.current = true;
                    setRecognizing(false);
                    setPhase('idle');
                    setStatusText('');
                  }}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  取消，手动输入
                </button>
              </div>
            </div>
          )}

          {/* 识别失败 */}
          {phase === 'error' && !recognizing && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="text-sm font-medium text-red-700">⚠️ 识别失败</div>
              <p className="mt-1 text-xs leading-5 text-red-600">{errorMsg}</p>
              {file && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => handleRecognize(false)} className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                    ↻ 本地重试
                  </button>
                  <button onClick={() => handleRecognize(true)} className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">
                    🌐 切换 CDN 重试
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 结果区 */}
          {text && !recognizing && phase !== 'error' && (
            <div className="space-y-4">
              {/* 统计条 */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: '匹配芯片', value: chipHits.length, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                  { label: '匹配游戏本', value: laptopHits.length, color: 'text-violet-600 bg-violet-50 border-violet-100' },
                  { label: '待收录型号', value: unknowns.length, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg border px-3 py-2 text-center ${s.color}`}>
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-[11px]">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 识别文本（可编辑） */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-600">识别文本（可修正后重新匹配）</span>
                  <button
                    type="button"
                    onClick={handleRematch}
                    className="shrink-0 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition hover:bg-blue-100 active:scale-95"
                  >
                    ↻ 重新匹配
                  </button>
                </div>
                <textarea
                  ref={textAreaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-b-xl p-3 text-sm outline-none"
                  placeholder="可在此手动修改识别文本，点击「重新匹配」按新文本查找"
                />
                {rematchMsg && <div className="border-t border-slate-100 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">✅ {rematchMsg}</div>}
              </div>

              {/* 匹配到的芯片 */}
              {chipHits.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">💻 匹配到的芯片</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600">{chipHits.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {chipHits.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => goTo(`/chip/${h.id}`)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-800">{h.model}</div>
                          <div className="text-[11px] text-slate-400">
                            {BRAND_LABELS[h.brand as keyof typeof BRAND_LABELS] ?? h.brand} · {h.category === 'cpu' ? 'CPU' : 'GPU'} · 匹配「{h.matchedText}」
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-blue-500">查看 →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 匹配到的游戏本 */}
              {laptopHits.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">🎮 匹配到的游戏本</span>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-600">{laptopHits.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {laptopHits.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => goTo(`/laptop/${h.id}`)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2 text-left transition hover:border-violet-300 hover:bg-violet-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-800">{h.name} {h.year}款</div>
                          <div className="text-[11px] text-slate-400">
                            {LAPTOP_BRAND_LABELS[h.brand as keyof typeof LAPTOP_BRAND_LABELS] ?? h.brand} · {h.model} · 匹配「{h.matchedText}」
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-violet-500">查看 →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 无结果 */}
              {!hasResult && unknowns.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
                  未在站内数据库匹配到结果，可修改识别文本后重新匹配
                </div>
              )}

              {/* 未收录候选（区分芯片/游戏本，点击直接收录） */}
              {unknowns.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">🆕 未收录的型号</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-600">{unknowns.length}</span>
                  </div>
                  <div className="space-y-2">
                    {unknowns.map((u) => (
                      <div key={u.name} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              u.type === 'chip'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-violet-100 text-violet-700'
                            }`}
                          >
                            {u.type === 'chip' ? '芯片' : '游戏本'}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-amber-900">{u.name}</div>
                            {u.hint && <div className="truncate text-[11px] text-amber-600/80">{u.hint}</div>}
                          </div>
                          {collectedNames[u.name] && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              ✓ 已收录
                            </span>
                          )}
                        </div>
                        {collectedNames[u.name] ? (
                          <span className="shrink-0 text-[11px] text-emerald-600">AI 自动补全中…</span>
                        ) : (
                          <button
                            onClick={() => handleCollect(u)}
                            className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-700"
                          >
                            立即收录
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 已收录提示 */}
              {savedMsg && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ {savedMsg}</div>
              )}
            </div>
          )}
        </div>

        {/* 底部：已收录清单 + 导出 */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          {pendingItems.length > 0 ? (
            <div className="mb-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  📌 已收录清单（{pendingItems.length} 条
                  {pendingItems.some((p) => p.status === 'filled') ? ` · ${pendingItems.filter((p) => p.status === 'filled').length} 条已补全` : ''}）
                </span>
                <button
                  type="button"
                  onClick={exportPendingItems}
                  className="rounded-md border border-blue-300 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50"
                  title="导出待补全清单，供 AI 数据管道读取后按站内格式生成数据"
                >
                  ⬇ 导出待补全清单
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pendingItems.map((p) => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                      p.status === 'filled'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                    title={
                      p.status === 'filled'
                        ? `已补全 ${p.filledAt ? new Date(p.filledAt).toLocaleString('zh-CN') : ''}`
                        : 'AI 自动补全中'
                    }
                  >
                    {p.status === 'filled' ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 3a9 9 0 1 0 9 9" />
                      </svg>
                    )}
                    {p.name}
                    <span className={p.status === 'filled' ? 'text-emerald-500' : 'text-slate-300'}>
                      {p.status === 'filled' ? '已补全' : '补全中'}
                    </span>
                    <button
                      onClick={() => {
                        removePendingItem(p.id);
                        setPendingItems(loadPendingItems());
                      }}
                      className="text-slate-300 hover:text-red-500"
                      aria-label="移除"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-[11px] leading-5 text-slate-400">
            识别在本机浏览器完成，图片不上传。点击收录后进入 AI 自动补全队列：AI 将全网搜索该型号规格，并按网站芯片 / 游戏本格式自动生成数据，随下次数据更新上线（导出清单可加速处理）。
          </p>
        </div>
      </div>
    </div>
  );
}
