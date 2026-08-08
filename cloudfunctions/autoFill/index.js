/**
 * CloudBase 云函数：autoFill
 * 用 DeepSeek 模型补全芯片/游戏本规格，输出符合站内 Chip/Laptop 数据结构的 JSON，
 * 写回云数据库 catalog 集合。缺失字段一律 null（站内显示"暂无数据"，遵守数据诚信）。
 *
 * 环境变量（CloudBase 云函数配置）：DEEPSEEK_API_KEY = sk-xxx
 */
const cloud = require('@cloudbase/node-sdk');
const https = require('https');

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const MAX_TRY = 3;

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const _ = db.command;

  const id = event.id;
  const name = String(event.name || '').trim();
  const category = event.category === 'laptop' ? 'laptop' : 'chip';
  const brand = String(event.brand || '').trim();
  if (!id || !name) return { ok: false, error: 'id/name required' };

  const spec = await fillWithDeepSeek(name, category);
  if (!spec) {
    // 补全失败：保留 pending，供后续重试
    return { ok: false, error: 'deepseek call failed', id };
  }

  // 补全质量验证：关键硬件参数缺失视为补全失败（保留 pending，前端继续显示"补全中"并可重试）
  const missing = specCompleteness(spec, category);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `补全结果缺少关键参数: ${missing.join(', ')}`,
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
    note: '截图识别自动收录',
    createdAt,
    filledAt: Date.now(),
  });
  return { ok: true, id, spec };
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

async function fillWithDeepSeek(name, category) {
  const prompt = buildPrompt(name, category);
  for (let i = 0; i < MAX_TRY; i++) {
    try {
      const body = await chat(prompt);
      const json = extractJson(body);
      if (json && typeof json === 'object') return json;
    } catch (err) {
      console.error(`deepseek try ${i + 1} failed`, err.message);
    }
  }
  return null;
}

function chat(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: '你是芯片与笔记本硬件规格专家。严格按要求输出 JSON，不要输出多余文字。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const req = https.request(
      DEEPSEEK_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
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
            reject(new Error(`bad deepseek response: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('deepseek timeout')));
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
  "tdp": "TDP 瓦数（数字）或 null",
  "loadTempRange": "满载温度范围或 null",
  "dataQuality": "official|estimated",
  "sources": [{"label":"来源名","url":"来源链接"}]
}`;
}
