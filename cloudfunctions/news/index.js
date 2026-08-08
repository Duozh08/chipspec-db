/**
 * CloudBase 云函数：news
 * 抓取硬件/芯片行业 RSS 并返回新闻列表（供首页 Hero 卡片轮播展示）。
 * POST https://<env>.service.tcloudbase.com/news
 * 返回：{ ok: true, items: [{ title, link, source, pubDate }], fetchedAt }
 *
 * 说明：
 * - 源：IT之家（综合科技）+ 超能网（硬件向），均无需 API Key；
 * - 按硬件关键词加权排序，取前 12 条；
 * - 内存缓存 30 分钟（冷启动后首次调用会实时抓取，可接受）；
 * - 抓取失败时返回 ok:false，前端自动降级为站内信息轮播。
 */

const https = require('https');

const SOURCES = [
  { name: 'IT之家', url: 'https://www.ithome.com/rss/' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed' },
  { name: '雷峰网', url: 'https://www.leiphone.com/feed' },
];

/** 硬件/芯片行业关键词（命中越多排越前） */
const KEYWORDS = [
  '显卡', '芯片', '处理器', '游戏本', '笔记本', 'cpu', 'gpu', 'rtx', 'ryzen',
  'core', '酷睿', '锐龙', 'geforce', 'radeon', 'intel', 'amd', 'nvidia',
  '英伟达', '半导体', '晶圆', '台积电', '存储', '内存', 'ssd', '主板', '散热',
];

const CACHE_MS = 30 * 60 * 1000;
let cache = { at: 0, items: [] };

/** 抓取 URL 文本（https，超时 8s） */
function fetchText(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ctrl = { done: false };
    const timer = setTimeout(() => {
      if (!ctrl.done) {
        ctrl.done = true;
        req.destroy();
        reject(new Error('timeout'));
      }
    }, timeoutMs);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChipSpecDB/1.0)' } }, (res) => {
      if (res.statusCode !== 200) {
        if (!ctrl.done) { ctrl.done = true; clearTimeout(timer); reject(new Error('http ' + res.statusCode)); }
        res.resume();
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; if (data.length > 2 * 1024 * 1024) { req.destroy(); } });
      res.on('end', () => {
        if (!ctrl.done) { ctrl.done = true; clearTimeout(timer); resolve(data); }
      });
      res.on('error', (err) => {
        if (!ctrl.done) { ctrl.done = true; clearTimeout(timer); reject(err); }
      });
    });
    req.on('error', (err) => {
      if (!ctrl.done) { ctrl.done = true; clearTimeout(timer); reject(err); }
    });
  });
}

/** 从 RSS XML 文本中提取 <item> 列表（正则轻量解析，不引入依赖） */
function parseRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 30) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    if (title && link) {
      items.push({
        title: decodeEntities(title).trim(),
        link: link.trim(),
        pubDate: pubDate.trim(),
      });
    }
  }
  return items;
}

/** HTML 实体解码（常用实体 + 数字实体） */
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function keywordScore(title) {
  const t = title.toLowerCase();
  let score = 0;
  for (const kw of KEYWORDS) {
    if (t.includes(kw)) score++;
  }
  return score;
}

async function fetchNews() {
  const results = [];
  for (const src of SOURCES) {
    try {
      const xml = await fetchText(src.url);
      const items = parseRss(xml);
      for (const it of items) {
        it.source = src.name;
        it.score = keywordScore(it.title);
        results.push(it);
      }
    } catch (err) {
      console.warn(`[news] ${src.name} 抓取失败:`, err.message);
    }
  }
  // 去重（按标题）+ 硬件关键词优先 + 最新在前
  const seen = new Set();
  const dedup = results.filter((it) => {
    const key = it.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  dedup.sort((a, b) => (b.score - a.score) || (Date.parse(b.pubDate) - Date.parse(a.pubDate)));
  const top = dedup.slice(0, 12);
  // 命中硬件关键词的条目足够时，只保留相关新闻（避免 MPV/生物等无关内容混入轮播）
  const relevant = top.filter((it) => it.score >= 1);
  const pool = relevant.length >= 4 ? relevant : top.slice(0, 8);
  return pool.map(({ title, link, source, pubDate }) => ({ title, link, source, pubDate }));
}

exports.main = async (event) => {
  // 参数兼容 HTTP 网关（event.body JSON 串）与内部调用
  let params = {};
  if (event && typeof event === 'object') {
    if (typeof event.body === 'string') {
      try { params = { ...JSON.parse(event.body) }; } catch { /* ignore */ }
    } else if (event.body && typeof event.body === 'object') {
      params = event.body;
    }
  }
  const force = params.force === true;

  // 缓存命中（30 分钟内）直接返回
  if (!force && cache.items.length > 0 && Date.now() - cache.at < CACHE_MS) {
    return { ok: true, cached: true, fetchedAt: cache.at, items: cache.items };
  }

  try {
    const items = await fetchNews();
    if (items.length === 0) throw new Error('no items');
    cache = { at: Date.now(), items };
    return { ok: true, cached: false, fetchedAt: cache.at, items };
  } catch (err) {
    // 抓取失败但有旧缓存 → 返回旧缓存（带 stale 标记）
    if (cache.items.length > 0) {
      return { ok: true, cached: true, stale: true, fetchedAt: cache.at, items: cache.items };
    }
    console.error('[news] 抓取失败:', err.message);
    return { ok: false, error: 'news fetch failed' };
  }
};
