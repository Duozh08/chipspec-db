/**
 * CloudBase 云函数：collect
 * 接收前端"立即收录"请求 → 写入云数据库 catalog 集合 → 异步触发 autoFill 补全
 *
 * 调用：POST https://<envId>.service.tcloudbase.com/collect
 * body: { name: string, category: 'chip' | 'laptop', brand: string }
 */
const cloud = require('@cloudbase/node-sdk');

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const coll = db.collection('catalog');

  const name = String(event.name || '').trim();
  const category = event.category === 'laptop' ? 'laptop' : 'chip';
  const brand = String(event.brand || '').trim();

  if (!name) return { ok: false, error: 'name required' };

  // 按名称去重（忽略大小写）
  const dup = await coll.where({ name: db.RegExp({ regexp: `^${escapeReg(name)}$`, options: 'i' }) }).limit(1).get();
  if (dup.data.length > 0) {
    return { ok: true, dup: true, id: dup.data[0]._id };
  }

  const addRes = await coll.add({
    name,
    category,
    brand,
    status: 'pending',
    spec: null,
    note: '截图识别自动收录',
    createdAt: Date.now(),
  });

  // 异步触发 AI 补全（不阻塞响应）
  try {
    await app.callFunction({
      name: 'autoFill',
      data: { id: addRes.id, name, category, brand },
    });
  } catch (err) {
    console.error('trigger autoFill failed', err);
  }

  return { ok: true, id: addRes.id };
};

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
