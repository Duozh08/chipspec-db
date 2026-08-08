/**
 * CloudBase 云函数：autoFill
 * 用 AI 模型补全芯片/游戏本规格，输出符合站内 Chip/Laptop 数据结构的 JSON，
 * 写回云数据库 catalog 集合。缺失字段一律 null（站内显示"暂无数据"，遵守数据诚信）。
 *
 * 多 AI 提供方支持（统一 OpenAI chat/completions 兼容接口）：
 *   - AI_PROVIDER 环境变量指定主提供方（默认 deepseek），如 qwen / glm / kimi / openai
 *   - 各提供方 API Key 通过环境变量配置：DEEPSEEK_API_KEY / QWEN_API_KEY / GLM_API_KEY / MOONSHOT_API_KEY / OPENAI_API_KEY
 *   - 主提供方失败或未配置 key 时，自动降级到其他已配置 key 的提供方
 * 游戏本补全成功后，会联动检查 spec 中的处理器/显卡芯片是否已入库，缺失则自动创建补录。
 */
const cloud = require('@cloudbase/node-sdk');
const https = require('https');

const MAX_TRY = 2;

/** 各 AI 提供方（OpenAI 兼容接口） */
const PROVIDERS = {
  deepseek: { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', keyEnv: 'DEEPSEEK_API_KEY', label: 'DeepSeek' },
  qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus', keyEnv: 'QWEN_API_KEY', label: '通义千问' },
  glm: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash', keyEnv: 'GLM_API_KEY', label: '智谱GLM' },
  kimi: { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-32k', keyEnv: 'MOONSHOT_API_KEY', label: 'Kimi' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', keyEnv: 'OPENAI_API_KEY', label: 'OpenAI' },
};

/** 按 AI_PROVIDER 指定的主提供方 + 其他已配置 key 的提供方，返回可用列表 */
function availableProviders() {
  const main = String(process.env.AI_PROVIDER || 'deepseek').toLowerCase();
  const list = [];
  if (PROVIDERS[main] && process.env[PROVIDERS[main].keyEnv]) list.push(main);
  for (const name of Object.keys(PROVIDERS)) {
    if (name === main) continue;
    if (process.env[PROVIDERS[name].keyEnv]) list.push(name);
  }
  return list;
}

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();

  const id = event.id;
  const name = String(event.name || '').trim();
  const category = event.category === 'laptop' ? 'laptop' : 'chip';
  const brand = String(event.brand || '').trim();
  if (!id || !name) return { ok: false, error: 'id/name required' };

  const result = await fillWithAI(name, category);
  if (!result) {
    // 所有可用 AI 均失败：保留 pending，供后续重试
    return { ok: false, error: 'ai fill failed (no provider available or all failed)', id };
  }
  const spec = result.spec;

  // 补全质量验证：关键硬件参数缺失视为补全失败（保留 pending，前端继续显示"补全中"并可重试）
  const missing = specCompleteness(spec, category);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `补全结果缺少关键参数: ${missing.join(', ')}（AI: ${result.provider}）`,
      id,
      incomplete: true,
      spec,
    };
  }

  // 原 spec 字段为 null，嵌套 update 会被展开成 spec.brand 导致报错；
  // 改用 set 全量替换文档，保留 createdAt。
  const cur = await db.collection('catalog').doc(id).get();
  const createdAt = cur.data[0]?.createdAt || Date.now();
  await db.collection('catalog').doc(id).set({
    name,
    category,
    brand,
    status: 'filled',
    spec,
    note: `截图识别自动收录（AI: ${result.provider}）`,
    createdAt,
    filledAt: Date.now(),
  });

  // 游戏本补全成功后：联动检查 spec 中的 CPU/GPU 芯片是否已入库，缺失则自动创建补录
  if (category === 'laptop') {
    await ensureChipsCollected(app, db, spec);
  }

  return { ok: true, id, spec, provider: result.provider };
};

/** 补全质量验证：返回缺失的关键字段名数组（空数组 = 补全完整）。
 *  游戏本必须有处理器/显卡方案；芯片必须有 TDP/制程等核心规格。 */
function specCompleteness(spec, category) {
  const missing = [];
  if (!spec || typeof spec !== 'object') return ['spec'];
  if (category === 'laptop') {
    if (!Array.isArray(spec.cpuOptions) || spec.cpuOptions.length === 0) missing.push('cpuOptions(处理器方案)');
    if (!Array.isArray(spec.gpuOptions) || spec.gpuOptions.length === 0) missing.push('gpuOptions(显卡方案)');
  } else {
    if (spec.tdp == null) missing.push('tdp');
    if (!spec.process) missing.push('process(制程)');
  }
  return missing;
}

/** 游戏本联动：spec 中的处理器/显卡芯片若不在 catalog 库，自动创建补录（写 pending + 触发 autoFill）。
 *  芯片名先规范化：去掉功耗标注（"RTX 5060 (115W)" → "RTX 5060"）。 */
async function ensureChipsCollected(app, db, spec) {
  const coll = db.collection('catalog');
  const chipNames = [
    ...(Array.isArray(spec.cpuOptions) ? spec.cpuOptions : []),
    ...(Array.isArray(spec.gpuOptions) ? spec.gpuOptions : []),
  ]
    .map(normalizeChipName)
    .filter(Boolean);
  for (const chipName of chipNames) {
    try {
      // 已在库（含 pending 中的补录）→ 跳过，避免重复
      const dup = await coll
        .where({ name: db.RegExp({ regexp: `^${escapeReg(chipName)}$`, options: 'i' }) })
        .limit(1)
        .get();
      if (dup.data.length > 0) continue;
      const chipBrand = guessChipBrand(chipName);
      const addRes = await coll.add({
        name: chipName,
        category: 'chip',
        brand: chipBrand,
        status: 'pending',
        spec: null,
        note: '游戏本收录联动补录',
        createdAt: Date.now(),
      });
      app
        .callFunction({ name: 'autoFill', data: { id: addRes.id, name: chipName, category: 'chip', brand: chipBrand } })
        .catch((e) => console.error(`auto chip fill failed: ${chipName}`, e.message));
    } catch (err) {
      console.error(`ensureChipsCollected failed for ${chipName}`, err.message);
    }
  }
}

/** 规范化芯片名：去功耗标注（"RTX 5060 (115W)" → "RTX 5060"） */
function normalizeChipName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s*\([\d.,]+\s*W\)\s*$/i, '')
    .trim();
}

/** 从芯片型号字符串猜测品牌（intel/amd/nvidia） */
function guessChipBrand(name) {
  const n = name.toLowerCase();
  if (/intel|酷睿|core|ultra|arc/i.test(n)) return 'intel';
  if (/amd|锐龙|ryzen|radeon/i.test(n)) return 'amd';
  if (/nvidia|geforce|rtx|gtx|rx\s?\d/i.test(n)) return 'nvidia';
  return '';
}

/** 依次尝试所有可用 AI 提供方（主提供方优先，失败自动降级） */
async function fillWithAI(name, category) {
  const prompt = buildPrompt(name, category);
  const providers = availableProviders();
  if (providers.length === 0) return null;
  for (const pname of providers) {
    const p = PROVIDERS[pname];
    for (let i = 0; i < MAX_TRY; i++) {
      try {
        const body = await chat(p, prompt);
        const json = extractJson(body);
        if (json && typeof json === 'object') return { spec: json, provider: p.label };
      } catch (err) {
        console.error(`ai ${pname} try ${i + 1} failed`, err.message);
      }
    }
  }
  return null;
}

function chat(provider, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: '你是芯片与笔记本硬件规格专家。严格按要求输出 JSON，不要输出多余文字。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const req = https.request(
      provider.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env[provider.keyEnv] || ''}`,
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 60000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const obj = JSON.parse(data);
            resolve(obj?.choices?.[0]?.message?.content ?? '');
          } catch (e) {
            reject(new Error(`bad ai response (${provider.label}): ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`${provider.label} timeout`)));
    req.write(payload);
    req.end();
  });
}

function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPrompt(name, category) {
  const base = `型号名称：${name}
请补全该型号的规格。所有字段必须是真实公开信息；不确定或没有公开数据的字段一律填 null，严禁编造。`;

  if (category === 'laptop') {
    return `${base}
重要：cpuOptions / gpuOptions 是核心字段。绝大多数在售游戏本都有明确的处理器与显卡配置（如 "i9-14900HX"、"RTX 4060 (140W)"、"锐龙7 H 260"），请基于公开资料如实填写该机型实际可选用的型号，不要留空；仅当确认该型号不存在时才填 null/[]。
输出以下 JSON 结构（游戏本）：
{
  "brand": "lenovo|asus|hp|dell|msi|acer|mechrevo|hasee|razer|colorful|thunderobot|machenike|gigabyte|huawei|xiaomi|honor 等小写品牌名",
  "displayName": "中文商品名（如 拯救者Y9000P）",
  "series": "系列名（如 拯救者Y9000P）",
  "model": "厂方型号（如 16IRX9）",
  "release": "发布月份 YYYY-MM 或 null",
  "cpuOptions": ["该机型可选处理器型号数组，如 i9-14900HX，无则 []"],
  "gpuOptions": ["该机型可选显卡型号数组，可带功耗如 RTX 4060 (140W)，无则 []"],
  "ram": "内存规格（如 16GB DDR5 5600）或 null",
  "storage": "硬盘规格（如 1TB PCIe 4.0 SSD）或 null",
  "display": "屏幕规格（如 16英寸 2.5K 240Hz）或 null",
  "dataQuality": "official|estimated",
  "sources": [{"label":"来源名","url":"来源链接"}]
}`;
  }
  return `${base}
重要：tdp / process / codename 是核心字段。绝大多数已发布芯片都有公开的 TDP 与制程信息（如 TSMC 4N、Intel 7），请基于公开资料如实填写，不要留空；仅当确认该型号不存在时才用 null。
dies 数组也非常重要：请填写芯片的 Die 信息（至少包含 name、role、areaMm2）。单 Die 芯片填一个元素，多 Die 芯片（如 Chiplet 设计）填多个。role 取值：compute（计算 Die）/ graphics（图形 Die）/ io（I/O Die）/ cache（缓存 Die）/ soc（SoC 模块）/ other。面积不确定填 null。
输出以下 JSON 结构（芯片）：
{
  "brand": "intel|amd|nvidia 小写",
  "category": "cpu|gpu",
  "formFactor": "desktop|mobile",
  "model": "完整型号（如 GeForce RTX 5070 Laptop / Core i9-14900HX）",
  "codename": "代号（如 Blackwell / Raptor Lake）或 null",
  "generation": "代际（如 RTX 50 Laptop / 第14代酷睿）或 null",
  "process": "制程工艺（如 TSMC 4N）或 null",
  "release": "发布月份 YYYY-MM 或 null",
  "package": {"type":"封装类型 LGA/BGA","style":"lga|bga","lengthMm":null,"widthMm":null},
  "dies": [{"name":"Die 名称（如 GB206 Monolithic Die）","role":"compute|graphics|io|cache|soc|other","process":"Die 制程或 null","areaMm2":Die面积数字或null,"lengthMm":null,"widthMm":null,"transistorsMillions":晶体管百万数或null}],
  "tdp": "TDP 瓦数（数字）或 null",
  "loadTempRange": "满载温度范围或 null",
  "dataQuality": "official|estimated",
  "sources": [{"label":"来源名","url":"来源链接"}]
}`;
}
