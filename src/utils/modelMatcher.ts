/** 型号匹配工具：从识别文本中匹配芯片库 / 游戏本库中的型号 */
import { allChips } from '../data';
import { allLaptops } from '../data/laptops';
import type { Chip } from '../data/types';
import type { Laptop } from '../data/types';

export function normModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

export interface MatchResult<T> {
  item: T;
  /** 命中的匹配文本 */
  matchedText: string;
}

/** 中文品牌前缀（laptop 匹配时剥离，如"惠普暗影精灵10" → "暗影精灵10"） */
const BRANDS_CN = [
  '联想', '华硕', '惠普', '戴尔', '微星', '宏碁', '神舟', '雷神', '机械师',
  '机械革命', '七彩虹', '外星人', '雷蛇', '华为', '小米', '荣耀', '技嘉', '玩家国度',
];

/** 英文品牌前缀（laptop 匹配时剥离，如 "ASUS天选6" → "天选6"） */
const BRANDS_EN = ['asus', 'lenovo', 'hp', 'dell', 'acer', 'msi', 'razer', 'colorful', 'mechrevo', 'hasee', 'xiaomi', 'honor', 'gigabyte', 'huawei', 'machenike', 'thunderobot'];

function stripBrands(tok: string): string {
  let s = tok;
  for (const b of BRANDS_CN) s = s.replace(b, '');
  for (const b of BRANDS_EN) {
    if (s.startsWith(b)) s = s.slice(b.length);
  }
  return s;
}

/** 把文本按标点/空格切成 token（保留中文，如 拯救者Y9000P）。
 * 注意：只过滤空串，不按长度丢弃——「天选 6」会被切成 ["天选","6"]，
 * 短 token（如 2 字中文）保留给后续相邻合并/匹配使用。
 * OCR 字符级切分兜底：当所有 token 都是单字符（"天 选 6 选 哪 一 个 套 餐"），
 * 视为 OCR 在每个字符间插入了空格，去掉所有空格后整体作为一个 token 保留。 */
function tokenize(text: string): string[] {
  const tokens = text
    .split(/[\s,，。;；:：|/\\()[\]{}<>《》'"“”·•、]+/)
    .map((t) => normModel(t))
    .filter((t) => t.length > 0);
  const allSingle = tokens.length >= 3 && tokens.every((t) => t.length === 1);
  if (allSingle) {
    const compact = normModel(text.replace(/\s+/g, ''));
    if (compact.length >= 3) return [compact, ...tokens];
  }
  return tokens;
}

/** 相邻 token 合并候选：中文/字母段 + 数字段（"天选"+"6"→"天选6"、"rtx"+"5060"→"rtx5060"）
 * 或 数字段 + 字母段（"5060"+"laptop"→"5060laptop"）。要求合并结果含中文，避免英文噪音。 */
function mergedTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    const comb = a + b;
    const goodPair =
      (/[\u4e00-\u9fff a-z]$/.test(a) && /^\d/.test(b)) || // 天选+6 / rtx+5060
      (/\d$/.test(a) && /^[a-z\u4e00-\u9fff]/.test(b)); // 5060+laptop / 幻16+Air
    if (goodPair && /[\u4e00-\u9fff]/.test(comb)) out.push(comb);
  }
  return out;
}

export function matchChipsInText(text: string): MatchResult<Chip>[] {
  const tokens = tokenize(text);
  const whole = normModel(text);
  const results: MatchResult<Chip>[] = [];
  for (const chip of allChips) {
    const m = normModel(chip.model);
    if (m.length < 5) continue;
    let hitTok = '';
    // 1) 型号子串：token 含数字且含字母（排除纯数字"4060"），且是 model 子串
    for (const tok of tokens) {
      if (
        tok.length >= 4 &&
        /\d/.test(tok) &&
        /[a-z\u4e00-\u9fff]/.test(tok) &&
        m.includes(tok) &&
        !tok.includes('处理器')
      ) {
        hitTok = tok;
        break;
      }
    }
    // 2) GPU 核心编号：整段文本（去空格）包含 rtx/gtx/rx + 数字
    if (!hitTok && chip.category === 'gpu') {
      const key = m.match(/(rtx|gtx|rx)\d{3,5}/)?.[0];
      if (key && whole.includes(key)) hitTok = key;
    }
    // 3) token 等于完整型号
    if (!hitTok && tokens.some((tok) => tok === m)) hitTok = m;
    if (hitTok) results.push({ item: chip, matchedText: hitTok });
  }
  return results;
}

/** 判断 a 是否可通过在 target 中跳过不超过 maxSkip 个连续字符得到，
 * 覆盖 OCR 把「天选6」拆成「天 6 选...」导致 token 为 "天6" 时仍能命中 "天选6"。 */
function isApproxSubsequence(a: string, target: string, maxSkip = 1): boolean {
  if (target.includes(a)) return true;
  let i = 0,
    j = 0,
    skip = 0;
  while (i < a.length && j < target.length) {
    if (a[i] === target[j]) {
      i++;
      j++;
      skip = 0;
    } else {
      j++;
      skip++;
      if (skip > maxSkip) return false;
    }
  }
  return i === a.length;
}

/** 把 a 在 target 中按顺序出现的字符位置收集成"窗口"；若 a 的全部字符都出现，
 * 返回 [start, end]（含两端）；否则返回 null。覆盖 OCR 字符级切分下，
 * d 的字符以一定间隔散布在文本中也能匹配。 */
function subsequenceWindow(a: string, target: string): [number, number] | null {
  let i = 0,
    j = 0,
    start = -1,
    end = -1;
  while (i < a.length && j < target.length) {
    if (a[i] === target[j]) {
      if (start === -1) start = j;
      end = j;
      i++;
    }
    j++;
  }
  return i === a.length ? [start, end] : null;
}

/** 从 token 中提取"型号核心"（品牌剥离后的 中文/字母+数字 段）：
 * 「华硕天选6游戏本」→ 去品牌 "天选6游戏本" → 提取 "天选6"；
 * 「ASUS天选6」→ 去品牌 "天选6" → 提取 "天选6"。
 * 用于 OCR 无空格连写（品牌+型号+泛词）时仍能命中站内名。 */
function extractModelCore(stripped: string): string {
  // 中文/字母段 + 数字段（数字前最多 6 个中文或字母，数字后跟字母）
  const m = stripped.match(/^([\u4e00-\u9fff a-z]{1,6}\d+[a-z]*)/);
  if (m && /\d/.test(m[1]) && /[\u4e00-\u9fff]/.test(m[1])) return m[1];
  // 兜底：数字前至少 1 个中文，避免纯数字/纯字母
  const m2 = stripped.match(/([\u4e00-\u9fff]{1,6}\d+[a-z]*)/);
  return m2 && /\d/.test(m2[1]) ? m2[1] : '';
}

export function matchLaptopsInText(text: string): MatchResult<Laptop>[] {
  const tokens = tokenize(text).map((t) => ({ tok: t, stripped: stripBrands(t) }));
  // 合并 token（"天选"+"6"）也参与匹配，解决 OCR 中文数字带空格问题
  const merged = mergedTokens(tokenize(text)).map((t) => ({ tok: t, stripped: stripBrands(t) }));
  const all = [...tokens, ...merged];
  // 全文子序列匹配：把 OCR 输出文本去掉所有空白与标点后，
  // 对每个站内名 d 检查"d 的字符是否按顺序出现在干净文本中且窗口不太大"，
  // 覆盖 "天选6选哪一个套餐" / "天 选 6 选 哪 一 个 套 餐" 等大量无关字符混在型号里的场景。
  const cleanText = normModel(text);
  const results: MatchResult<Laptop>[] = [];
  const matchedIds = new Set<string>();
  for (const laptop of allLaptops) {
    const d = normModel(laptop.displayName);
    if (d.length < 3) continue;
    let pushed = false;
    for (const { tok, stripped } of all) {
      // 型号特征：含数字或中文（排除 "ultra"/"radeon" 等泛词）
      if (stripped.length < 3) continue;
      if (!(/\d/.test(stripped) || /[\u4e00-\u9fff]/.test(stripped))) continue;
      // 排除纯数字 token（年份/功耗如 "2025"/"140w"，会误匹配所有同年款）
      if (/^\d+$/.test(stripped)) continue;
      // 双向包含：站内名包含 token（"暗影精灵10" ⊂ 站内名），
      // 或 token 包含站内名（OCR 输出完整型号串 "rog幻16air2025" 时也能命中）
      if (d.includes(stripped) || stripped.includes(d)) {
        results.push({ item: laptop, matchedText: tok });
        matchedIds.add(laptop.id);
        pushed = true;
        break;
      }
      // 型号核心兜底：连写 token（"华硕天选6游戏本"）提取 "天选6" 后命中站内名；
      // 用近似子序列覆盖 OCR 字符级切分导致 "天6" 对应 "天选6" 的场景。
      const core = extractModelCore(stripped);
      if (core && core.length >= 2 && core !== stripped && isApproxSubsequence(core, d)) {
        results.push({ item: laptop, matchedText: tok });
        matchedIds.add(laptop.id);
        pushed = true;
        break;
      }
    }
    if (pushed) continue;
    // 全文子序列兜底：d 的所有字符按顺序出现在 cleanText 中，且窗口长度 ≤ d.length * 2 + 2
    // 覆盖 "天选6选哪一个套餐"、"天 选 6 选 哪 一 个 套 餐" 等
    if (cleanText.length >= d.length) {
      const win = subsequenceWindow(d, cleanText);
      if (win) {
        const winLen = win[1] - win[0] + 1;
        // 窗口容忍度：d 长度内允许 d.length 大小的 gap（覆盖 OCR 字符级切分与无关字符干扰）
        if (winLen <= d.length * 2 + 2) {
          results.push({ item: laptop, matchedText: cleanText.slice(win[0], win[1] + 1) });
          matchedIds.add(laptop.id);
        }
      }
    }
  }
  return results;
}

/** 从文本中提取"疑似未收录型号"的候选 token（含数字+字母/中文，排除纯数字年份等） */
export interface UnknownCandidate {
  name: string;
  /** 类型猜测：chip / laptop */
  type: 'chip' | 'laptop';
  /** 候选来源说明（如"站内仅收录 2024 款"） */
  hint?: string;
}

/** 候选类型猜测：芯片关键词优先，其次游戏本关键词，默认游戏本 */
export function guessCandidateType(name: string): 'chip' | 'laptop' {
  if (/rtx|gtx|rx\d|core|ryzen|i\d-\d|锐龙|酷睿|geforce|radeon|udna/i.test(name)) return 'chip';
  if (
    /拯救者|天选|枪神|魔霸|暗影|光影|蛟龙|极光|旷世|掠夺者|泰坦|战神|战斧|灵刃|外星人|联想|华硕|惠普|机械革命|神舟|雷神|机械师|荣耀|小米/i.test(
      name
    )
  )
    return 'laptop';
  return 'laptop';
}

export function extractUnknownCandidates(text: string, limit = 8): UnknownCandidate[] {
  const tokens = tokenize(text);
  const known = new Set<string>();
  const chipMatches = matchChipsInText(text);
  const laptopMatches = matchLaptopsInText(text);
  chipMatches.forEach((r) => known.add(r.matchedText));
  laptopMatches.forEach((r) => known.add(r.matchedText));

  const cands: UnknownCandidate[] = [];
  const push = (c: UnknownCandidate) => {
    if (!cands.some((x) => x.name === c.name)) cands.push(c);
  };

  // 1) 年份感知：文本含年份（如 2025）且站内同系列未收录该年份 → 生成「款名 + 年份」候选
  const yearMatch = text.match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : '';
  if (year && laptopMatches.length > 0) {
    // 系列 key：displayName 归一化并去掉末尾年份（"拯救者Y7000P2025" → "拯救者y7000p"）
    const seriesKey = (s: string) => normModel(s).replace(/20\d{2}$/, '');
    const bySeries = new Map<string, typeof laptopMatches>();
    for (const r of laptopMatches) {
      const key = seriesKey(r.item.displayName);
      if (!bySeries.has(key)) bySeries.set(key, []);
      bySeries.get(key)!.push(r);
    }
    for (const [, matches] of bySeries) {
      // 该系列已存在目标年份款 → 不提示未收录
      if (matches.some((r) => r.item.release?.slice(0, 4) === year)) continue;
      const first = matches[0].item;
      const relYear = first.release?.slice(0, 4);
      if (relYear) push({ name: `${first.displayName} ${year}`, type: 'laptop', hint: `站内已收录 ${relYear} 款，未收录 ${year} 款` });
    }
  }

  // 2) 常规 token 候选：含数字 + 含字母或中文 + 长度 3~20（排除纯数字年份/功耗）
  //    连写 token（"华硕天选6游戏本"）优先取型号核心（"天选6"）作为候选。
  //    同时跳过"已知匹配"的延伸变体（避免出现「天选6」匹配后还提示「天选6」待收录）。
  const knownArr = Array.from(known);
  const isKnownVariant = (name: string) =>
    known.has(name) || knownArr.some((k) => k.length >= 2 && (name.includes(k) || k.includes(name)));
  const candToks = [...tokens, ...mergedTokens(tokens)];
  for (const tok of candToks) {
    if (known.has(tok)) continue;
    if (/^20\d{2}$/.test(tok)) continue;
    // 排除「2025款」等年份+泛词形态
    if (/^(20\d{2}|[0-9]+)款$/.test(tok)) continue;
    if (/\d/.test(tok) && /[a-z\u4e00-\u9fff]/.test(tok) && tok.length >= 3 && tok.length <= 20) {
      const stripped = stripBrands(tok);
      const core = extractModelCore(stripped);
      // 长连写 token 有核心时用核心（"华硕天选6游戏本"→"天选6"），否则用原 token
      const name = core && core.length < tok.length && core.length >= 3 ? core : tok;
      if (isKnownVariant(name)) continue;
      push({ name, type: guessCandidateType(name) });
    }
  }
  return cands.slice(0, limit);
}
