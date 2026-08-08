/**
 * CloudBase 云函数：favorites
 * 收藏云端同步（按设备 ID 维度，无登录体系；换浏览器即视为新设备）。
 * POST https://<env>.service.tcloudbase.com/favorites
 * 请求：
 *   { action: 'get', deviceId }            → { ok, ids: string[] }
 *   { action: 'set', deviceId, ids }       → { ok }
 */
const cloud = require('@cloudbase/node-sdk');

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const coll = db.collection('favorites');

  const params = parseParams(event);
  const action = params.action;
  const deviceId = typeof params.deviceId === 'string' ? params.deviceId.trim().slice(0, 64) : '';
  if (!deviceId) return { ok: false, error: 'deviceId required' };

  try {
    if (action === 'get') {
      const res = await coll.where({ deviceId }).limit(1).get();
      const doc = res.data[0];
      return { ok: true, ids: Array.isArray(doc && doc.ids) ? doc.ids.filter((x) => typeof x === 'string') : [] };
    }

    if (action === 'set') {
      const ids = Array.isArray(params.ids)
        ? params.ids.filter((x) => typeof x === 'string' && x.length <= 120).slice(0, 500)
        : [];
      const res = await coll.where({ deviceId }).limit(1).get();
      const doc = res.data[0];
      if (doc) {
        // doc.set 全量替换，避免 update 嵌套字段报错
        await coll.doc(doc._id).set({ deviceId, ids, updatedAt: Date.now() });
      } else {
        await coll.add({ deviceId, ids, updatedAt: Date.now() });
      }
      return { ok: true };
    }

    return { ok: false, error: 'unknown action' };
  } catch (err) {
    console.error('[favorites] 失败:', err && err.message ? err.message : err);
    return { ok: false, error: err && err.message ? err.message : 'favorites failed' };
  }
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
