/**
 * 帖子附件存储：基于 IndexedDB（localStorage 容量只有 5-10MB，
 * 视频/文件会很快写满；IndexedDB 可用空间通常为数 GB，适合长期积累）。
 *
 * 存储结构：`chipspec-files` 库 / `files` 表，key = 随机 id。
 * 帖子内容中通过 `data-file-id` 属性引用附件，渲染时再异步加载为 ObjectURL。
 */

const DB_NAME = 'chipspec-files';
const STORE = 'files';
const DB_VERSION = 1;

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 保存文件到 IndexedDB，返回元信息（含生成的 id） */
export async function saveFile(file: File | Blob, name?: string, type?: string): Promise<StoredFile> {
  const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const record: StoredFile = {
    id,
    name: name ?? (file instanceof File ? file.name : '附件'),
    type: type ?? file.type ?? 'application/octet-stream',
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    await txDone(tx);
  } finally {
    db.close();
  }
  return record;
}

/** 按 id 读取文件 */
export async function getFile(id: string): Promise<StoredFile | undefined> {
  const db = await openDb();
  try {
    return await new Promise<StoredFile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as StoredFile | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** 删除文件 */
export async function deleteFile(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** 文件用量统计（用于发帖时展示已用空间） */
export async function getFileUsage(): Promise<{ count: number; totalBytes: number }> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const idsReq = store.getAllKeys();
      idsReq.onsuccess = () => {
        const keys = idsReq.result as IDBValidKey[];
        let total = 0;
        let done = 0;
        if (keys.length === 0) {
          resolve({ count: 0, totalBytes: 0 });
          return;
        }
        keys.forEach((k) => {
          const getReq = store.get(k);
          getReq.onsuccess = () => {
            const rec = getReq.result as StoredFile | undefined;
            if (rec) total += rec.size;
            done += 1;
            if (done === keys.length) resolve({ count: keys.length, totalBytes: total });
          };
          getReq.onerror = () => {
            done += 1;
            if (done === keys.length) resolve({ count: keys.length, totalBytes: total });
          };
        });
      };
      idsReq.onerror = () => reject(idsReq.error);
    });
  } finally {
    db.close();
  }
}

/** 从帖子 HTML 内容中提取所有引用的文件 id（用于删除帖子时清理附件） */
export function extractFileIds(html: string): string[] {
  const ids: string[] = [];
  const re = /data-file-id="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/** 格式化字节数为可读文本 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
