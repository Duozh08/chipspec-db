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

function stripBrands(tok: string): string {
  let s = tok;
  for (const b of BRANDS_CN) s = s.replace(b, '');
  return s;
}

/** 把文本按标点/空格切成 token（保留中文，如 拯救者Y9000P） */
function tokenize(text: string): string[] {
  return text
    .split(/[\s,，。;；:：|/\\()[\]{}<>《》'"“”·•、]+/)
    .map((t) => normModel(t))
    .filter((t) => t.length >= 3);
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

export function matchLaptopsInText(text: string): MatchResult<Laptop>[] {
  const tokens = tokenize(text).map((t) => ({ tok: t, stripped: stripBrands(t) }));
  const results: MatchResult<Laptop>[] = [];
  for (const laptop of allLaptops) {
    const d = normModel(laptop.displayName);
    if (d.length < 4) continue;
    for (const { tok, stripped } of tokens) {
      // 型号特征：含数字或中文（排除 "ultra"/"radeon" 等泛词）
      if (stripped.length < 3) continue;
      if (!(/\d/.test(stripped) || /[\u4e00-\u9fff]/.test(stripped))) continue;
      // 去掉品牌前缀后的 token 是中文名子串（如 "暗影精灵10" ⊂ "暗影精灵10omen16wf1000"）
      if (d.includes(stripped)) {
        results.push({ item: laptop, matchedText: tok });
        break;
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
  matchChipsInText(text).forEach((r) => known.add(r.matchedText));
  matchLaptopsInText(text).forEach((r) => known.add(r.matchedText));
  const cands: UnknownCandidate[] = [];
  for (const tok of tokens) {
    if (known.has(tok)) continue;
    // 型号特征：含数字 + 含字母或中文（排除纯数字年份/功耗） + 长度 4~20
    if (/\d/.test(tok) && /[a-z\u4e00-\u9fff]/.test(tok) && tok.length >= 4 && tok.length <= 20) {
      if (!cands.some((c) => c.name === tok)) cands.push({ name: tok, type: guessCandidateType(tok) });
    }
  }
  return cands.slice(0, limit);
}
