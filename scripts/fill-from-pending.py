"""
AI 数据补全管道：读取用户从网站导出的待补全清单（chipspec-pending-requests.json），
为每条生成符合网站 Chip/Laptop 格式的数据骨架，供 AI 全网搜索规格后填充入库。

用法：
  1. 用户在网站识别弹框点击「⬇ 导出待补全清单」下载 chipspec-pending-requests.json
  2. 将文件放到本目录（scripts/）
  3. 运行：python fill-from-pending.py [清单路径]
  4. 脚本输出：
     - 待搜索词列表（按条目打印，便于 AI 逐个 WebSearch）
     - scripts/pending-templates.ts（生成的 Chip/Laptop 数据骨架，AI 填充后并入 src/data）

数据诚信：骨架中不确定字段一律 null（站内显示"暂无数据"），AI 填充时须有公开来源佐证。
"""
import json
import sys
from pathlib import Path

DEFAULT_INPUT = Path(__file__).parent / "chipspec-pending-requests.json"
OUTPUT = Path(__file__).parent / "pending-templates.ts"


def chip_template(name: str, brand: str) -> list[str]:
    brand_map = {"intel": "intel", "amd": "amd", "nvidia": "nvidia"}
    b = brand_map.get(brand, "intel")
    id_part = name.lower().replace(" ", "-").replace("/", "-")
    return [
        "  {",
        f"    id: '{b}-{id_part}',",
        f"    brand: '{b}', category: 'cpu', formFactor: 'desktop',",
        f"    model: '{name}',",
        "    codename: null,",
        "    generation: null,",
        "    process: null,",
        "    release: null,",
        "    package: { type: 'LGA', style: 'lga', lengthMm: null, widthMm: null },",
        "    dies: [],",
        "    transistorsMillions: null,",
        "    tdp: null,",
        "    loadTempRange: null,",
        "    notes: '用户收录待补全（AI 生成骨架，规格待全网搜索确认）',",
        "    dataQuality: 'estimated',",
        "    sources: [],",
        "  },",
    ]


def laptop_template(name: str) -> list[str]:
    return [
        "  {",
        f"    id: 'pending-{name.lower().replace(' ', '-')}',",
        "    brand: 'unknown',",
        f"    displayName: '{name}',",
        "    series: '待确认',",
        "    model: '待确认',",
        "    release: null,",
        "    cpuOptions: [],",
        "    gpuOptions: [],",
        "    ram: null,",
        "    storage: null,",
        "    display: null,",
        "    notes: '用户收录待补全（AI 生成骨架，规格待全网搜索确认）',",
        "    dataQuality: 'estimated',",
        "    sources: [],",
        "  },",
    ]


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if not path.exists():
        print(f"[!] 未找到清单文件：{path}")
        print("    请先在网站识别弹框点击「⬇ 导出待补全清单」，再把下载的 JSON 放到 scripts/ 目录。")
        sys.exit(1)

    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])
    if not items:
        print("[i] 清单为空，无需补全。")
        sys.exit(0)

    print(f"=== 待补全条目：{len(items)} 条 ===")
    chips, laptops = [], []
    for it in items:
        name = it.get("name", "").strip()
        cat = it.get("category", "unknown")
        brand = it.get("brand", "")
        print(f"  [{cat:6}] {name}  (brand={brand or '未知'})")
        print(f"          搜索词：{name} 规格 参数 评测")
        if cat == "laptop":
            laptops.append(laptop_template(name))
        else:
            chips.append(chip_template(name, brand))

    lines = [
        "// 由 scripts/fill-from-pending.py 从用户待补全清单自动生成的数据骨架",
        "// AI 全网搜索规格后填充此文件，再并入 src/data/chips / src/data/laptops",
        "import type { Chip } from '../src/data/types';",
        "import type { Laptop } from '../src/data/types';",
        "",
        "export const pendingChips: Chip[] = [",
    ]
    for t in chips:
        lines.extend(t)
    lines.append("];")
    lines.append("")
    lines.append("export const pendingLaptops: Laptop[] = [")
    for t in laptops:
        lines.extend(t)
    lines.append("];")
    lines.append("")

    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[✓] 已生成骨架文件：{OUTPUT}")
    print("    下一步：AI 逐条全网搜索 → 填充规格字段 → 合并进 src/data → npm run validate → 部署")


if __name__ == "__main__":
    main()
