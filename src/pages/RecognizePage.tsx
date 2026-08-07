import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { allChips } from '../data';
import { allLaptops } from '../data/laptops';
import { BRAND_LABELS, LAPTOP_BRAND_LABELS } from '../data/types';
import {
  addPendingItem,
  guessBrand,
  loadPendingItems,
  removePendingItem,
} from '../utils/pendingStore';
import type { PendingItem } from '../utils/pendingStore';
import { matchChipsInText, matchLaptopsInText, extractUnknownCandidates } from '../utils/modelMatcher';

interface MatchChipHit {
  id: string;
  model: string;
  brand: string;
  category: string;
  matchedText: string;
}

interface MatchLaptopHit {
  id: string;
  name: string;
  model: string;
  brand: string;
  year: string;
  matchedText: string;
}

export default function RecognizePage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'downloading' | 'recognizing' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [text, setText] = useState('');
  const [chipHits, setChipHits] = useState<MatchChipHit[]>([]);
  const [laptopHits, setLaptopHits] = useState<MatchLaptopHit[]>([]);
  const [unknowns, setUnknowns] = useState<string[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>(loadPendingItems);
  const [showForm, setShowForm] = useState<string | null>(null); // 当前收录的候选名
  const [pendingName, setPendingName] = useState('');
  const [pendingCategory, setPendingCategory] = useState<'chip' | 'laptop'>('chip');
  const [pendingNote, setPendingNote] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const runMatch = useCallback((value: string) => {
    const chips = matchChipsInText(value).map((r) => ({
      id: r.item.id,
      model: r.item.model,
      brand: r.item.brand,
      category: r.item.category,
      matchedText: r.matchedText,
    }));
    const laps = matchLaptopsInText(value).map((r) => ({
      id: r.item.id,
      name: r.item.displayName,
      model: r.item.model,
      brand: r.item.brand,
      year: r.item.release?.slice(0, 4) ?? '',
      matchedText: r.matchedText,
    }));
    // 去重（同芯片/游戏本只留一条）
    setChipHits(chips.filter((c, i) => chips.findIndex((x) => x.id === c.id) === i).slice(0, 12));
    setLaptopHits(laps.filter((l, i) => laps.findIndex((x) => x.id === l.id) === i).slice(0, 12));
    setUnknowns(extractUnknownCandidates(value));
  }, []);

  // 选择/粘贴图片
  const handleImage = (f: File) => {
    if (!f.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
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

  // 剪贴板粘贴（截图后 Ctrl+V）
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

  // 拖拽上传
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleImage(f);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    el.addEventListener('drop', onDrop);
    el.addEventListener('dragover', onDragOver);
    return () => {
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragover', onDragOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecognize = async () => {
    if (!file) return;
    setRecognizing(true);
    setPhase('loading');
    setProgress(0);
    setStatusText('准备识别引擎…');
    setErrorMsg('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let worker: any = null;
    let timer: number | undefined;
    try {
      // 动态加载 Tesseract（避免主包膨胀）；语言包/core 从 CDN 获取
      const Tesseract = (await import('tesseract.js')).default;

      // 超时兜底：core/语言包下载慢或网络异常时给出明确提示（下载阶段无进度事件，不能无限等待）
      const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(
          () => reject(new Error('加载超时：识别引擎或中文语言包下载较慢（约 12MB），请检查网络后重试')),
          150000
        );
      });

      const runOcr = (async () => {
        worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'loading tesseract core') {
              setPhase('loading');
              setStatusText(`下载识别引擎… ${Math.round(m.progress * 100)}%`);
            } else if (m.status === 'initializing tesseract') {
              setPhase('loading');
              setStatusText('初始化识别引擎…');
            } else if (m.status === 'loading language traineddata') {
              // 语言包下载期间无进度事件，显示动画提示
              setPhase('downloading');
              setStatusText('下载中文语言包（约 12MB）… 首次使用需下载，之后自动缓存');
              setProgress(Math.round(m.progress * 100));
            } else if (m.status === 'recognizing text') {
              setPhase('recognizing');
              setStatusText('识别中…');
              setProgress(Math.round(m.progress * 100));
            }
          },
        });
        const { data } = await worker.recognize(file);
        return data.text || '';
      })();

      const ocrText = await Promise.race([runOcr, timeout]);
      setText(ocrText || '（未识别到文字，请重试或手动输入型号）');
      runMatch(ocrText || '');
      setPhase('idle');
    } catch (err) {
      console.error(err);
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setText('');
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

  // 手动重新匹配（文本编辑后）
  const handleRematch = () => {
    if (!text.trim()) return;
    runMatch(text);
  };

  const handleSubmitPending = () => {
    const name = pendingName.trim();
    if (!name) {
      alert('请输入型号名称');
      return;
    }
    addPendingItem({
      name,
      category: pendingCategory,
      brand: guessBrand(name),
      note: pendingNote.trim(),
    });
    setPendingItems(loadPendingItems());
    setShowForm(null);
    setPendingName('');
    setPendingCategory('chip');
    setPendingNote('');
    setSavedMsg(`已收录「${name}」到待补充清单，站长核对后即可上线`);
    setTimeout(() => setSavedMsg(''), 5000);
  };

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-block text-sm text-slate-500 hover:text-blue-600">
        ← 返回首页
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">📷 截图识别</h1>
        <p className="mt-1 text-sm text-slate-500">
          粘贴截图（Ctrl+V）或上传图片，自动识别芯片 / 游戏本型号并匹配站内数据；未收录的型号可一键提交补充。
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 左列：图片 + 识别 */}
        <div className="space-y-3">
          <div
            ref={dropRef}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
              imageUrl ? 'border-slate-200 bg-slate-50' : 'border-blue-300 bg-blue-50/40 hover:border-blue-400'
            }`}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="待识别截图" className="max-h-72 max-w-full rounded-lg shadow" />
            ) : (
              <>
                <div className="mb-2 text-4xl">🖼️</div>
                <div className="text-sm font-medium text-slate-600">点击选择截图，或直接 Ctrl+V 粘贴</div>
                <div className="mt-1 text-xs text-slate-400">支持 PNG / JPG / WebP；识别在本机浏览器完成，图片不会上传</div>
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

          {imageUrl && (
            <button
              onClick={handleRecognize}
              disabled={recognizing}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recognizing ? '识别中…' : '🔍 开始识别'}
            </button>
          )}

          {recognizing && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
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
              {/* 下载/加载阶段：不确定进度动画；识别阶段：真实进度条 */}
              {phase === 'recognizing' ? (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              ) : (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-400" />
                </div>
              )}
              <p className="mt-2 text-xs text-slate-400">
                首次使用需从 CDN 下载识别引擎与中文语言包（合计约 15MB），下载完成后自动缓存，后续识别无需重复下载；图片仅在本机处理，不会上传。
              </p>
            </div>
          )}

          {/* 识别失败提示 */}
          {phase === 'error' && !recognizing && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="text-sm font-medium text-red-700">⚠️ 识别失败</div>
              <p className="mt-1 text-xs leading-5 text-red-600">{errorMsg}</p>
              {file && (
                <button
                  onClick={handleRecognize}
                  className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  ↻ 重试识别
                </button>
              )}
            </div>
          )}

          {/* 识别文本（可编辑） */}
          {text && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">识别结果（可手动修正）</span>
                <button
                  onClick={handleRematch}
                  className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  ↻ 重新匹配
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
          )}
        </div>

        {/* 右列：匹配结果 */}
        <div className="space-y-4">
          {savedMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✅ {savedMsg}
            </div>
          )}

          {/* 芯片命中 */}
          {chipHits.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                匹配到芯片（{chipHits.length}）
              </div>
              <ul className="divide-y divide-slate-100">
                {chipHits.map((h) => (
                  <li key={h.id}>
                    <Link to={`/chip/${h.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition hover:bg-blue-50">
                      <span className="min-w-0 truncate font-medium text-slate-800 hover:text-blue-600">
                        {BRAND_LABELS[h.brand as keyof typeof BRAND_LABELS] ?? h.brand} · {h.model}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {h.category === 'cpu' ? 'CPU' : 'GPU'} · 匹配「{h.matchedText}」
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 游戏本命中 */}
          {laptopHits.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                匹配到游戏本（{laptopHits.length}）
              </div>
              <ul className="divide-y divide-slate-100">
                {laptopHits.map((h) => (
                  <li key={h.id}>
                    <Link to={`/laptop/${h.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition hover:bg-blue-50">
                      <span className="min-w-0 truncate font-medium text-slate-800 hover:text-blue-600">
                        {LAPTOP_BRAND_LABELS[h.brand as keyof typeof LAPTOP_BRAND_LABELS] ?? h.brand} · {h.name} {h.year}款
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">匹配「{h.matchedText}」</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 未收录候选 */}
          {unknowns.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
                未收录的型号（{unknowns.length}）— 点击「立即收录」
              </div>
              <ul className="divide-y divide-amber-100/60">
                {unknowns.map((u) => (
                  <li key={u} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <span className="min-w-0 truncate text-sm font-medium text-amber-900">{u}</span>
                    <button
                      onClick={() => {
                        setShowForm(u);
                        setPendingName(u);
                        setPendingCategory(u.toLowerCase().match(/rtx|gtx|rx|core|ryzen|i\d|锐龙/) ? 'chip' : 'laptop');
                      }}
                      className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                    >
                      立即收录
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 无结果提示 */}
          {text && !recognizing && chipHits.length === 0 && laptopHits.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-400">
              未在站内数据库匹配到结果，可修改识别文本后重新匹配，或提交下方候选型号进行收录。
            </div>
          )}

          {/* 收录表单 */}
          {showForm && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="mb-3 text-sm font-semibold text-blue-800">📋 收录「{showForm}」</div>
              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">型号名称</label>
                  <input
                    value={pendingName}
                    onChange={(e) => setPendingName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="radio" checked={pendingCategory === 'chip'} onChange={() => setPendingCategory('chip')} />
                    芯片
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="radio" checked={pendingCategory === 'laptop'} onChange={() => setPendingCategory('laptop')} />
                    游戏本
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">补充说明（可选，如型号全称/规格线索）</label>
                  <input
                    value={pendingNote}
                    onChange={(e) => setPendingNote(e.target.value)}
                    placeholder="例如：来自 XX 评测截图"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowForm(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                    取消
                  </button>
                  <button onClick={handleSubmitPending} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                    提交收录
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 待收录清单 */}
          {pendingItems.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                待收录清单（{pendingItems.length}）
              </div>
              <ul className="divide-y divide-slate-100">
                {pendingItems.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {p.category === 'chip' ? '芯片' : '游戏本'}
                        {p.brand ? ` · 疑似 ${p.brand}` : ''}
                      </span>
                      {p.note && <div className="truncate text-xs text-slate-400">{p.note}</div>}
                    </div>
                    <button
                      onClick={() => {
                        removePendingItem(p.id);
                        setPendingItems(loadPendingItems());
                      }}
                      className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                    >
                      ✕ 移除
                    </button>
                  </li>
                ))}
              </ul>
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                提交的型号保存在本地待收录清单，站长核对后会补充进数据库；本清单仅本浏览器可见。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 数据量提示 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500">
        当前数据库：<b>{allChips.length}</b> 颗芯片 · <b>{allLaptops.length}</b> 款游戏本。
        识别与匹配全部在本地浏览器完成，截图不会上传到任何服务器。
      </div>
    </div>
  );
}
