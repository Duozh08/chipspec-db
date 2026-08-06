import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Chip } from '../data/types';
import { BRAND_LABELS, fmtArea, totalDieArea } from '../data/types';
import ChipPhoto, { ChipPhotoUpload, readPhoto } from './ChipPhoto';
import { useCompare } from '../context/CompareContext';
import { useFavorites } from '../hooks/useFavorites';

const BRAND_STYLES: Record<Chip['brand'], string> = {
  intel: 'bg-blue-50 text-blue-700 border-blue-200',
  amd: 'bg-red-50 text-red-700 border-red-200',
  nvidia: 'bg-lime-50 text-lime-800 border-lime-200',
};

export default function ChipCard({ chip }: { chip: Chip }) {
  const { add, remove, has, isFull } = useCompare();
  const { has: hasFav } = useFavorites();
  const inCompare = has(chip.id);
  const inFav = hasFav(chip.id);
  const area = totalDieArea(chip);

  // 上传图片后刷新显示
  const [photoVersion, setPhotoVersion] = useState(0);
  const photo = useMemo(() => readPhoto(chip.id), [chip.id, photoVersion]);

  // 阻止对比按钮/上传按钮触发整卡跳转
  const stopNav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      to={`/chip/${chip.id}`}
      className="group relative flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      {inFav && (
        <span
          className="pointer-events-none absolute right-2 top-2 z-10 text-lg leading-none text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
          title="已关注"
          aria-label="已关注"
        >
          ★
        </span>
      )}

      {/* 左侧：芯片图片（固定高度与游戏本卡片一致，上传按钮在图片右下角） */}
      <div className="relative h-40 w-32 shrink-0">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-2">
          <ChipPhoto chip={chip} photo={photo} className="h-28 w-auto max-w-full" />
        </div>
        <div className="absolute bottom-1 right-1 z-20">
          <ChipPhotoUpload chip={chip} onChanged={() => setPhotoVersion((v) => v + 1)} />
        </div>
      </div>

      {/* 右侧：信息区 */}
      <div className="flex min-w-0 flex-1 flex-col p-3">
        {/* 顶部：品牌 + 形态 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${BRAND_STYLES[chip.brand]}`}>
            {BRAND_LABELS[chip.brand]}
          </span>
          <span className="text-[10px] text-slate-400">
            {chip.formFactor === 'desktop' ? '桌面' : '移动'}
          </span>
          <span className="truncate text-[10px] text-slate-400">{chip.generation}</span>
        </div>

        {/* 名称 */}
        <div className="mt-1 truncate text-sm font-semibold leading-5 text-slate-800 group-hover:text-blue-600">
          {chip.model}
        </div>
        <div className="truncate text-[11px] text-slate-500">{chip.codename}</div>

        {/* 底部：Die 信息 + 对比 */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="truncate text-[11px] text-slate-500">
            Die {chip.dies.length} 个 · {fmtArea(area)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              stopNav(e);
              if (inCompare) remove(chip.id);
              else add(chip.id);
            }}
            disabled={!inCompare && isFull}
            className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${
              inCompare
                ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
            }`}
            title={!inCompare && isFull ? '最多对比 4 颗' : undefined}
          >
            {inCompare ? '✓ 已加入' : '+ 对比'}
          </button>
        </div>
      </div>
    </Link>
  );
}
