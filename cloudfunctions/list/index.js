/**
 * CloudBase 云函数：list
 * 查询 catalog 集合：POST https://<domain>.app.tcloudbase.com/list
 * 可选参数：status = pending | filled（默认全部）、limit（默认 100）
 */
const cloud = require('@cloudbase/node-sdk');

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const coll = db.collection('catalog');

  const params = parseParams(event);
  const status = params.status;
  const limit = Math.min(Number(params.limit) || 100, 500);

  let query = coll;
  if (status === 'pending' || status === 'filled') {
    query = query.where({ status });
  }
  const res = await query.orderBy('createdAt', 'desc').limit(limit).get();

  return { ok: true, total: res.data.length, items: res.data };
};

/** 兼容 HTTP 网关（event.body 为 JSON 字符串）与内部 callFunction（参数平铺） */
function parseParams(event) {
  if (!event) return {};
  if (typeof event === 'string') {
    try { return JSON.parse(event); } catch { return {}; }
  }
  if (typeof event.body === 'string') {
    try { return { ...JSON.parse(event.body) }; } catch { return {}; }
  }
  if (event.body && typeof event.body === 'object') return event.body;
  return event;
}
