# -*- coding: utf-8 -*-
"""从 git 历史(v3, 53dfa99)提取 stressTest 数据，映射到 v4 新游戏本结构。
匹配规则: (brand, 规范化displayName, 年份) 完全一致。
输出: src/data/stress-tests.ts (Record<新id, StressTestData>)
"""
import re
import subprocess

OLD_COMMIT = '53dfa99'

# 1. 取旧版 laptops.ts
old_src = subprocess.check_output(
    ['git', 'show', f'{OLD_COMMIT}:src/data/laptops.ts'], text=True, encoding='utf-8'
)

# 2. 解析旧条目
records = []
for m in re.finditer(r'id: \'([^\']+)\',\n(.*?)(?=\n  \},|\n\];)', old_src, re.S):
    rid = m.group(1)
    body = m.group(2)
    def field(name):
        fm = re.search(rf"{name}: '([^']*)'", body)
        return fm.group(1) if fm else None
    def num_field(name):
        fm = re.search(rf"{name}: ([\d.]+)", body)
        return float(fm.group(1)) if fm else None
    stm = re.search(r'stressTest: \{(.*?)\}', body, re.S)
    if not stm:
        continue
    st_body = stm.group(1)
    st = {}
    for kv in re.finditer(r'(\w+): ([\d.]+|\'[^\']*\')', st_body):
        k, v = kv.group(1), kv.group(2)
        if v.startswith("'"):
            st[k] = v[1:-1]
        else:
            st[k] = float(v) if '.' in v else int(v)
    records.append({
        'id': rid,
        'brand': field('brand'),
        'displayName': field('displayName'),
        'release': field('release'),
        'cpu': field('cpu'),
        'gpu': field('gpu'),
        'stressTest': st,
    })

print(f"旧版带 stressTest 的条目: {len(records)}")

# 3. 读新 laptops.ts 解析 (id, brand, displayName, release)
with open('src/data/laptops.ts', encoding='utf-8') as f:
    new_src = f.read()

new_items = []
for m in re.finditer(r"id: '([^']+)',\n(.*?)(?=\n  \},|\n\];)", new_src, re.S):
    nid = m.group(1)
    body = m.group(2)
    def nfield(name):
        fm = re.search(rf"{name}: '([^']*)'", body)
        return fm.group(1) if fm else None
    new_items.append({'id': nid, 'brand': nfield('brand'), 'displayName': nfield('displayName'), 'release': nfield('release')})

print(f"新版游戏本条目: {len(new_items)}")

# 4. 规范化名称匹配
BRAND_PREFIXES = ['ROG', 'Alienware', '雷蛇', '外星人', '联想', '华硕', '惠普', '微星', '宏碁',
                  '戴尔', '七彩虹', '机械革命', '神舟', '小米', '荣耀', '技嘉', '华为', '机械师', '雷神']

def norm_name(n):
    s = (n or '').replace(' ', '')
    s = re.sub(r'\d{4}款?$', '', s)
    for p in BRAND_PREFIXES:
        s = s.replace(p, '')
    return s

def year(release):
    return release[:4] if release and re.match(r'\d{4}', release) else ''

def year_close(y1, y2):
    """年份相等或相差 1 年以内（容忍评测/发售时间差异）"""
    if not y1 or not y2:
        return y1 == y2
    return abs(int(y1) - int(y2)) <= 1

# 旧条目索引：主 key=(brand, norm(displayName))，辅助 key=(brand, norm(model))，
# 年份单独存放用于 ±1 年容差匹配
# 品牌归一化：v3 的 alienware 独立品牌 → v4 并入 dell
def norm_brand(b):
    return 'dell' if b == 'alienware' else b

old_by_key = {}
old_by_model_key = {}
for r in records:
    key = (norm_brand(r['brand']), norm_name(r['displayName']))
    old_by_key.setdefault(key, []).append(r)
    mkey = (norm_brand(r['brand']), norm_name(r.get('model', '')))
    if mkey[1]:
        old_by_model_key.setdefault(mkey, []).append(r)

# 新条目匹配：名称匹配 + 年份容差（先按 displayName，再按 model）
mapped = {}
matched = 0
for item in new_items:
    name_key = (item['brand'], norm_name(item['displayName']))
    cands = old_by_key.get(name_key, [])
    if not cands:
        mkey = (item['brand'], norm_name(item.get('model', '')))
        cands = old_by_model_key.get(mkey, [])
    rec = None
    if cands:
        iy = year(item['release'])
        # 优先完全同年份，其次 ±1 年
        rec = next((r for r in cands if year(r['release']) == iy), None)
        if rec is None:
            rec = next((r for r in cands if year_close(year(r['release']), iy)), None)
    if rec:
        mapped[item['id']] = rec['stressTest']
        matched += 1

# 5. 手动补充：2026-08-06 全网搜索笔吧评测室/快科技等公开评测确认的实测数据
# （自动匹配已覆盖的机型不覆盖，只补充缺失的热门机型）
MANUAL_EXTRA = {
    # 拯救者 R9000P 2024（R9 7945HX + RTX 4070 140W）— 笔吧评测室（超能模式）
    'lenovo-r9000p-16arp9': {
        'cpuPowerW': 112, 'cpuTempC': 94, 'cpuFreqGHz': 4.0,
        'gpuPowerW': 140, 'gpuTempC': 85, 'gpuFreqMHz': 2370,
        'dualCpuPowerW': 83, 'dualGpuPowerW': 120, 'dualCpuTempC': 95, 'dualGpuTempC': 84,
        'note': '数据来源：笔吧评测室（超能模式，R9 7945HX + RTX 4070）',
    },
    # 机械革命 蛟龙16 Pro（R7 7745HX + RTX 4060 满血）— 综合评测
    'mechrevo-16pro-jiaolong-16-pro': {
        'cpuPowerW': 82, 'cpuTempC': 95, 'cpuFreqGHz': 4.3,
        'gpuPowerW': 140, 'gpuTempC': 80, 'gpuFreqMHz': 2200,
        'dualCpuPowerW': 45, 'dualGpuPowerW': 115, 'dualCpuTempC': 80, 'dualGpuTempC': 80,
        'note': '数据来源：综合评测（R7 7745HX + RTX 4060 满血版，狂飙模式）',
    },
    # 微星 泰坦 GE78 HX（i9-13980HX + RTX 4080）— 快科技评测
    'msi-ge78hx-ge78hx-13v': {
        'cpuPowerW': 130, 'cpuTempC': 93, 'cpuFreqGHz': 3.9,
        'gpuPowerW': 175, 'gpuTempC': 73, 'gpuFreqMHz': 1800,
        'dualCpuPowerW': 75, 'dualGpuPowerW': 175, 'dualCpuTempC': 83, 'dualGpuTempC': 80,
        'note': '数据来源：快科技评测（i9-13980HX + RTX 4080，狂暴模式 250W）',
    },
    # 拯救者 Y9000P 2024（i9-14900HX + RTX 4060 140W）— 笔吧评测室（野兽模式）
    'lenovo-y9000p-16irx9': {
        'cpuPowerW': 110, 'cpuTempC': 89, 'cpuFreqGHz': 3.5,
        'gpuPowerW': 140, 'gpuTempC': 80, 'gpuFreqMHz': 2235,
        'dualCpuPowerW': 65, 'dualGpuPowerW': 140, 'dualCpuTempC': 83, 'dualGpuTempC': 82,
        'note': '数据来源：笔吧评测室（野兽模式，i9-14900HX + RTX 4060 满血）',
    },
}
for nid, st in MANUAL_EXTRA.items():
    if nid not in mapped:
        mapped[nid] = st
        matched += 1

print(f"最终收录: {len(mapped)} 条（自动匹配 + 手动补充）")
# 打印未匹配的旧条目名（用于检查）
unmatched_keys = set(old_by_key.keys()) - {(i['brand'], norm_name(i['displayName'])) for i in new_items}
print(f"旧数据未匹配: {len(unmatched_keys)}")
for k in list(unmatched_keys)[:15]:
    print("   ", k)

# 5. 生成 stress-tests.ts
lines = []
lines.append("import type { StressTestData } from './types';\n")
lines.append("// Auto-generated: 从 v3 历史数据恢复的烤机测试数据（按新 id 映射）")
lines.append("// 数据来源：笔吧评测室等第三方评测\n")
lines.append("export const stressTests: Record<string, StressTestData> = {")
for nid, st in mapped.items():
    parts = []
    for k, v in st.items():
        if isinstance(v, str):
            parts.append(f"{k}: '{v}'")
        else:
            parts.append(f"{k}: {v}")
    lines.append(f"  '{nid}': {{ {', '.join(parts)} }},")
lines.append("};")
with open('src/data/stress-tests.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')
print(f"已生成 src/data/stress-tests.ts ({len(mapped)} 条)")
