/**
 * CloudBase 云函数：list
 * 查询 catalog 集合：GET https://<envId>.service.tcloudbase.com/list
 * 可选参数：status = pending | filled（默认全部）、limit（默认 100）
 */
const cloud = require('@cloudbase/node-sdk');

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const coll = db.collection('catalog');

  const status = event.status;
  const limit = Math.min(Number(event.limit) || 100, 500);

  let query = coll;
  if (status === 'pending' || status === 'filled') {
    query = query.where({ status });
  }
  const res = await query.orderBy('createdAt', 'desc').limit(limit).get();

  return { ok: true, total: res.data.length, items: res.data };
};
