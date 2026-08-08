import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { saveFile, getFile, getFileUsage, deleteFile, extractFileIds, formatBytes } from '../utils/fileStore';

const STORAGE_KEY = 'chipspec-repair-posts';
const LIKES_KEY = 'chipspec-repair-likes';

/** 单文件大小限制（视频 / 普通附件）与总空间上限（IndexedDB 长期积累的自我管理） */
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200MB

interface Post {
  id: string;
  title: string;
  author: string;
  category: string;
  content: string; // HTML content
  createdAt: string;
  views: number;
  replies: Reply[];
  /** 置顶标记 */
  pinned?: boolean;
  /** 精华帖标记 */
  essence?: boolean;
  /** 已解决标记（求助类帖子） */
  solved?: boolean;
  /** 点赞数 */
  likes?: number;
}

interface Reply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  likes?: number;
}

const CATEGORIES = ['维修经验', '故障排查', '工具推荐', '求助提问', '技术交流', '配件交易'];

const TABLE_STYLE =
  '[&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle [&_tr]:bg-white [&_tr:nth-child(odd)]:bg-slate-50/50';

function loadPosts(): Post[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePosts(posts: Post[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    /* ignore */
  }
}

function loadLikedIds(): Record<string, true> {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLikedIds(ids: Record<string, true>) {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return d.toLocaleDateString('zh-CN');
}

const SEED_POSTS: Post[] = [
  {
    id: 'seed-1',
    title: '【维修经验】RTX 3060 显卡花屏维修全过程分享',
    author: '维修老张',
    category: '维修经验',
    content: '<p>分享一块 RTX 3060 花屏的维修过程。</p><p><strong>故障现象：</strong>开机花屏，进入系统后满屏彩色条纹。</p><p><strong>排查过程：</strong></p><ol><li>先测显存供电，1.35V 正常</li><li>用热风枪加热显存区域，花屏有变化 → 判定显存虚焊</li><li>重新植锡焊接显存后恢复正常</li></ol><p><strong>总结：</strong>RTX 30 系列显存虚焊是常见故障，加热法可以快速定位。</p>',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    views: 1280,
    essence: true,
    likes: 45,
    replies: [
      { id: 'r1', author: '小白学维修', content: '感谢分享！正好遇到一样的问题', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), likes: 3 },
      { id: 'r2', author: '芯片级维修', content: '补充一点：加热法定位时温度控制在 220℃ 左右比较安全，避免吹爆周边的贴片电容。', createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), likes: 12 },
    ],
  },
  {
    id: 'seed-2',
    title: '【故障排查】笔记本 CPU 供电短路维修思路（已解决）',
    author: '芯片级维修',
    category: '故障排查',
    content: '<p>笔记本 CPU 供电短路是比较常见的故障，分享一下排查思路：</p><ol><li>先测 CPU 供电电感对地阻值，正常应在 20Ω 以上</li><li>如果阻值偏低，断开 CPU 供电 MOS 管逐个排查</li><li>常见原因是供电 MOS 管击穿或 CPU 本身短路</li><li>更换 MOS 管后一定要测阻值正常再上电</li></ol><p><strong>本例最终结论：</strong>上管击穿，更换后阻值恢复正常，机器点亮。</p>',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    views: 856,
    solved: true,
    likes: 28,
    replies: [
      { id: 'r3', author: '笔记本维修工', content: '很有用的思路，收藏了', createdAt: new Date(Date.now() - 86400000 * 6).toISOString(), likes: 5 },
    ],
  },
  {
    id: 'seed-3',
    title: '【求助提问】拯救者 Y9000P 2024 蓝屏重启，怀疑内存问题',
    author: '阿凯不是凯',
    category: '求助提问',
    content: '<p>机器配置：i9-14900HX + RTX 4060，原装 16G 单条内存。</p><p><strong>故障现象：</strong>开机或游戏中偶发蓝屏（MEMORY_MANAGEMENT），重启后正常。</p><p><strong>已做的排查：</strong></p><ul><li>MemTest86 跑了 2 圈无报错</li><li>更新了 BIOS 到最新版</li><li>关掉 XMP 后故障频率降低但仍有</li></ul><p>怀疑是单通道内存带宽问题或内存插槽虚焊，求各位大佬指点排查方向。</p>',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    views: 342,
    likes: 9,
    replies: [
      { id: 'r4', author: '维修老张', content: 'MEMORY_MANAGEMENT 蓝屏优先怀疑内存。建议换一条内存测试，如果手上没有，把原装内存换到另一个插槽试试——插槽接触不良也会偶发。', createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), likes: 8 },
    ],
  },
  {
    id: 'seed-4',
    title: '【工具推荐】风枪焊台怎么选？300-800 元档位对比',
    author: '工具控老李',
    category: '工具推荐',
    content: '<p>给刚入行的朋友整理一下常用维修工具的选择，避免踩坑。</p><p><strong>风枪：</strong></p><table><tbody><tr><th>价位</th><th>推荐型号</th><th>特点</th></tr><tr><td>200-300</td><td>快克 857DW+</td><td>入门够用，温度波动 ±10℃</td></tr><tr><td>400-600</td><td>快克 2008</td><td>曲线控温，焊 CPU 更稳</td></tr><tr><td>800+</td><td>奥科 AT850</td><td>专业级，气流稳定</td></tr></tbody></table><p><strong>焊台：</strong>白菜白光 936 就够练手；进阶建议 T12 高频焊台（升温快、回温好）。</p><p><strong>其他必备：</strong>恒温烙铁头、助焊剂、吸锡带、植锡网、放大镜台灯。</p>',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    views: 2105,
    essence: true,
    likes: 67,
    replies: [
      { id: 'r5', author: '新手小王', content: '收藏了，正打算入坑，非常有帮助！', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), likes: 2 },
      { id: 'r6', author: '工具控老李', content: '补充：新手不建议一上来买热风枪拆 BGA，先用旧显卡练手再说。', createdAt: new Date(Date.now() - 86400000 * 9).toISOString(), likes: 15 },
    ],
  },
  {
    id: 'seed-5',
    title: '【技术交流】BGA 植球温度曲线参考（锡球 0.5mm）',
    author: '老冯修板',
    category: '技术交流',
    content: '<p>分享一套常用的 BGA 植球回流温度曲线，供大家参考调整：</p><table><tbody><tr><th>阶段</th><th>温度</th><th>时间</th></tr><tr><td>预热</td><td>120-150℃</td><td>60-90s</td></tr><tr><td>均热</td><td>150-180℃</td><td>60s</td></tr><tr><td>助焊剂活化</td><td>180-217℃</td><td>30s</td></tr><tr><td>回流峰值</td><td>235-245℃</td><td>10-20s</td></tr><tr><td>冷却</td><td>自然降温</td><td>—</td></tr></tbody></table><p><strong>注意事项：</strong>峰值温度不宜超过 250℃，否则芯片可能内部损伤；无铅锡球（SAC305）峰值建议 240-245℃。</p>',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    views: 1876,
    essence: true,
    likes: 54,
    replies: [
      { id: 'r7', author: '小白学维修', content: '正好在学植球，这条曲线帮大忙了', createdAt: new Date(Date.now() - 86400000 * 18).toISOString(), likes: 6 },
    ],
  },
  {
    id: 'seed-6',
    title: '【维修经验】联想拯救者 Y9000P 风扇异响更换教程',
    author: '笔记本维修工',
    category: '维修经验',
    content: '<p>拯救者 Y9000P 用一年后风扇异响（哒哒声）比较常见，多半是轴承磨损。</p><p><strong>更换步骤：</strong></p><ol><li>关机断电，拆下 D 面全部螺丝（注意脚垫下有隐藏螺丝）</li><li>断开电池排线</li><li>取下风扇固定螺丝，拔下风扇供电线</li><li>清洁出风口积灰，换上新风扇（左右风扇型号不同，注意区分）</li><li>装回后先不盖后盖，开机测试风扇是否正常</li></ol><p><strong>注意事项：</strong>原装风扇型号可在拆下后看标签；副厂风扇便宜但噪音可能更大，建议优先原装。</p>',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    views: 654,
    likes: 21,
    replies: [],
  },
  {
    id: 'seed-7',
    title: '【配件交易】出两块料板 + 一套植锡工具（上海同城优先）',
    author: '阿凯不是凯',
    category: '配件交易',
    content: '<p>清理工作室，出一些不用的配件：</p><ul><li>联想拯救者 Y7000 2021 料板一块（供电正常，显存虚焊拆过）</li><li>华硕天选 3 料板一块（不通电，练手用）</li><li>植锡网套装（0.3/0.5mm 各 5 张）+ 锡膏一管</li></ul><p>价格私聊，上海同城可自提，外地顺丰到付。有意的朋友评论区留言。</p>',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    views: 128,
    likes: 2,
    replies: [],
  },
];

/** 社区公告（可编辑、支持多条；存储在 localStorage） */
const ANNOUNCEMENTS_KEY = 'chipspec-repair-announcements';
const DEFAULT_ANNOUNCEMENTS = [
  '📢 社区规范：发帖请选择正确分类；求助帖请尽量描述故障现象、测量数据和已做排查，方便他人快速定位；求助得到解决后请回帖反馈并标记「已解决」，帮助后来的朋友。',
  '📌 欢迎来到刘大师兄笔记本维修社区：每天分享芯片级维修案例，交流拆机、植球、BGA、电路维修经验。关注抖音/B站同名账号获取更多视频教程。',
];

function loadAnnouncements(): string[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((a) => typeof a === 'string' && a.trim());
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ANNOUNCEMENTS;
}

function saveAnnouncements(items: string[]) {
  try {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** 从帖子 HTML 中提取第一张图片的文件 ID（社区列表缩略图用） */
function firstImageFileId(html: string): string | null {
  const m = html.match(/<img[^>]*data-file-id="([^"]+)"/);
  return m ? m[1] : null;
}

/** 帖子列表缩略图：从 IndexedDB 加载首图（无图返回 null） */
function PostThumb({ post }: { post: Post }) {
  const [url, setUrl] = useState<string | null>(null);
  const fileId = firstImageFileId(post.content);

  useEffect(() => {
    if (!fileId) return;
    let alive = true;
    getFile(fileId)
      .then((rec) => {
        if (alive && rec) setUrl(URL.createObjectURL(rec.blob));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  if (!fileId || !url) return null;
  return (
    <img
      src={url}
      alt="帖子配图"
      className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
      loading="lazy"
    />
  );
}

export default function RepairPage() {
  const [posts, setPosts] = useState<Post[]>(loadPosts);
  const [announcements, setAnnouncements] = useState<string[]>(loadAnnouncements);
  const [editingNotice, setEditingNotice] = useState(false);
  const [view, setView] = useState<'list' | 'detail' | 'editor'>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [sortKey, setSortKey] = useState<'latest' | 'hot' | 'replies' | 'likes'>('latest');
  const [query, setQuery] = useState('');
  const [likedIds, setLikedIds] = useState<Record<string, true>>(loadLikedIds);

  const handleSaveAnnouncements = (items: string[]) => {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    setAnnouncements(cleaned.length > 0 ? cleaned : DEFAULT_ANNOUNCEMENTS);
    saveAnnouncements(cleaned.length > 0 ? cleaned : DEFAULT_ANNOUNCEMENTS);
    setEditingNotice(false);
  };

  useEffect(() => {
    if (posts.length === 0) {
      setPosts(SEED_POSTS);
      savePosts(SEED_POSTS);
    }
  }, []);

  // 更新 posts 并持久化（同时同步 selectedPost）
  const updatePosts = useCallback((updater: (prev: Post[]) => Post[]) => {
    setPosts((prev) => {
      const next = updater(prev);
      savePosts(next);
      setSelectedPost((sel) => (sel ? next.find((p) => p.id === sel.id) ?? null : sel));
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = filterCategory ? posts.filter((p) => p.category === filterCategory) : posts;
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.category.includes(q)
      );
    }
    const lastReply = (p: Post) => p.replies[p.replies.length - 1]?.createdAt ?? p.createdAt;
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortKey) {
        case 'hot':
          return b.views * 2 + b.replies.length * 5 + (b.likes ?? 0) * 3 - (a.views * 2 + a.replies.length * 5 + (a.likes ?? 0) * 3);
        case 'replies':
          return b.replies.length - a.replies.length;
        case 'likes':
          return (b.likes ?? 0) - (a.likes ?? 0);
        default:
          return new Date(lastReply(b)).getTime() - new Date(lastReply(a)).getTime();
      }
    });
  }, [posts, filterCategory, sortKey, query]);

  // 社区统计
  const stats = useMemo(() => {
    const replies = posts.reduce((s, p) => s + p.replies.length, 0);
    const views = posts.reduce((s, p) => s + p.views, 0);
    const likes = posts.reduce((s, p) => s + (p.likes ?? 0), 0);
    return { posts: posts.length, replies, views, likes };
  }, [posts]);

  const handleViewPost = (post: Post) => {
    const updated = posts.map((p) => (p.id === post.id ? { ...p, views: p.views + 1 } : p));
    setPosts(updated);
    savePosts(updated);
    setSelectedPost(updated.find((p) => p.id === post.id) ?? post);
    setView('detail');
  };

  const handleSubmitPost = (post: Post) => {
    const updated = [post, ...posts];
    setPosts(updated);
    savePosts(updated);
    setView('list');
  };

  const handleReply = (postId: string, reply: Reply) => {
    updatePosts((prev) => prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, reply] } : p)));
  };

  const handleDeletePost = (postId: string) => {
    updatePosts((prev) => {
      const target = prev.find((p) => p.id === postId);
      if (target) {
        // 清理该帖子引用的附件（异步，不阻塞）
        extractFileIds(target.content).forEach((fid) => {
          deleteFile(fid).catch(() => undefined);
        });
      }
      return prev.filter((p) => p.id !== postId);
    });
    setView('list');
  };

  const handleTogglePin = (postId: string) => {
    updatePosts((prev) => prev.map((p) => (p.id === postId ? { ...p, pinned: !p.pinned } : p)));
  };

  const handleToggleSolved = (postId: string) => {
    updatePosts((prev) => prev.map((p) => (p.id === postId ? { ...p, solved: !p.solved } : p)));
  };

  /** 点赞（帖子或回复），同一用户同一对象只能点一次（本地记录） */
  const handleLike = (targetId: string, updater: (p: Post) => Post) => {
    if (likedIds[targetId]) return;
    const next: Record<string, true> = { ...likedIds, [targetId]: true };
    setLikedIds(next);
    saveLikedIds(next);
    updatePosts((prev) => prev.map((p) => (p.id === targetId || p.replies.some((r) => r.id === targetId) ? updater(p) : p)));
  };

  const isLiked = (id: string) => !!likedIds[id];

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-block text-sm text-slate-500 hover:text-blue-600">
        ← 返回首页
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">维修社区</h1>
          <p className="mt-1 text-sm text-slate-500">芯片级维修经验分享、故障排查、技术交流社区</p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('editor')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ✎ 发新帖
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* 社区统计条 */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: '主题帖', value: stats.posts },
              { label: '回复总数', value: stats.replies },
              { label: '累计浏览', value: stats.views },
              { label: '累计点赞', value: stats.likes },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                <div className="text-lg font-bold text-slate-800">{formatNumber(s.value)}</div>
                <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 公告（可编辑，多条自动轮播） */}
          {editingNotice ? (
            <NoticeEditor
              items={announcements}
              onSave={handleSaveAnnouncements}
              onCancel={() => setEditingNotice(false)}
            />
          ) : (
            <NoticeBoard items={announcements} onEdit={() => setEditingNotice(true)} />
          )}

          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('')}
              className={`rounded-full px-3 py-1 text-sm transition ${
                !filterCategory ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              全部
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  filterCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 搜索 + 排序 */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <input
              type="search"
              placeholder="搜索标题 / 内容 / 作者…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 [&::-webkit-search-cancel-button]:hidden"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="latest">按最新回复</option>
              <option value="hot">按最热</option>
              <option value="replies">按回复最多</option>
              <option value="likes">按点赞最多</option>
            </select>
            <span className="text-sm text-slate-400">共 {filtered.length} 帖</span>
          </div>

          {/* 帖子列表 */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
                没有符合条件的帖子，点击右上角发新帖
              </div>
            ) : (
              filtered.map((post) => {
                const lastReply = post.replies[post.replies.length - 1];
                return (
                  <div
                    key={post.id}
                    onClick={() => handleViewPost(post)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <PostThumb post={post} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                              {post.category}
                            </span>
                            {post.pinned && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                📌 置顶
                              </span>
                            )}
                            {post.essence && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                                ✦ 精华
                              </span>
                            )}
                            {post.solved && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                ✓ 已解决
                              </span>
                            )}
                            <h3 className="font-semibold text-slate-800 hover:text-blue-600">{post.title}</h3>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>👤 {post.author}</span>
                            <span>🕐 {formatTime(lastReply?.createdAt ?? post.createdAt)}</span>
                            {post.replies.length > 0 && <span className="text-slate-500">最后回复：{lastReply?.author}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-400">
                        <span>💬 {post.replies.length}</span>
                        <span>👁 {formatNumber(post.views)}</span>
                        <span>👍 {post.likes ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {view === 'detail' && selectedPost && (
        <PostDetail
          post={selectedPost}
          onBack={() => setView('list')}
          onReply={(reply) => handleReply(selectedPost.id, reply)}
          onDelete={() => handleDeletePost(selectedPost.id)}
          onTogglePin={() => handleTogglePin(selectedPost.id)}
          onToggleSolved={() => handleToggleSolved(selectedPost.id)}
          onLike={(targetId, updater) => handleLike(targetId, updater)}
          isLiked={isLiked}
        />
      )}

      {view === 'editor' && (
        <PostEditor onSubmit={handleSubmitPost} onCancel={() => setView('list')} />
      )}
    </div>
  );
}

// ============================================================
// 帖子详情
// ============================================================
function PostDetail({
  post,
  onBack,
  onReply,
  onDelete,
  onTogglePin,
  onToggleSolved,
  onLike,
  isLiked,
}: {
  post: Post;
  onBack: () => void;
  onReply: (reply: Reply) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleSolved: () => void;
  onLike: (targetId: string, updater: (p: Post) => Post) => void;
  isLiked: (id: string) => boolean;
}) {
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // 渲染内容后，把 [data-file-id] 的附件/视频从 IndexedDB 加载为 ObjectURL 显示
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const urls: string[] = [];
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-file-id]'));
    els.forEach((el) => {
      const fid = el.getAttribute('data-file-id');
      if (!fid) return;
      getFile(fid)
        .then((rec) => {
          if (!rec) {
            el.textContent = '（附件已失效）';
            return;
          }
          const url = URL.createObjectURL(rec.blob);
          urls.push(url);
          if (el.tagName === 'VIDEO') {
            el.setAttribute('src', url);
          } else if (el.tagName === 'A') {
            el.setAttribute('href', url);
            el.setAttribute('download', rec.name);
          } else if (el.tagName === 'IMG') {
            el.setAttribute('src', url);
          }
        })
        .catch(() => {
          el.textContent = '（附件加载失败）';
        });
    });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [post.content]);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply({
      id: `r-${Date.now()}`,
      author: replyAuthor.trim() || '匿名用户',
      content: replyText.trim(),
      createdAt: new Date().toISOString(),
    });
    setReplyText('');
  };

  const likeReply = (reply: Reply) => {
    onLike(reply.id, (p) => ({
      ...p,
      replies: p.replies.map((r) => (r.id === reply.id ? { ...r, likes: (r.likes ?? 0) + 1 } : r)),
    }));
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-block text-sm text-slate-500 hover:text-blue-600">
        ← 返回列表
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{post.category}</span>
          {post.pinned && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">📌 置顶</span>
          )}
          {post.essence && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">✦ 精华</span>
          )}
          {post.solved && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">✓ 已解决</span>
          )}
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">{post.title}</h1>
          <div className="flex shrink-0 items-center gap-3">
            {post.category === '求助提问' && (
              <button
                onClick={onToggleSolved}
                title={post.solved ? '重新打开' : '标记为已解决'}
                className={`text-xs transition ${
                  post.solved ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-emerald-600'
                }`}
              >
                {post.solved ? '✓ 已解决（点击重开）' : '✓ 标记已解决'}
              </button>
            )}
            <button
              onClick={onTogglePin}
              title={post.pinned ? '取消置顶' : '置顶帖子'}
              className={`text-xs transition ${
                post.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-amber-500'
              }`}
            >
              {post.pinned ? '📌 取消置顶' : '📌 置顶'}
            </button>
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">
              🗑 删除
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>👤 {post.author}</span>
          <span>🕐 {formatTime(post.createdAt)}</span>
          <span>👁 {post.views} 次浏览</span>
          <button
            type="button"
            onClick={() => onLike(post.id, (p) => ({ ...p, likes: (p.likes ?? 0) + 1 }))}
            disabled={isLiked(post.id)}
            className={`rounded-full border px-2 py-0.5 text-xs font-medium transition disabled:cursor-not-allowed ${
              isLiked(post.id)
                ? 'border-orange-300 bg-orange-50 text-orange-500'
                : 'border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            👍 {post.likes ?? 0} {isLiked(post.id) ? '已赞' : '点赞'}
          </button>
        </div>
        <div
          ref={contentRef}
          className={`mt-4 max-w-none text-sm leading-6 text-slate-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_video]:max-w-full [&_video]:rounded-lg [&_video]:my-2 ${TABLE_STYLE}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* 回复列表 */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-700">回复（{post.replies.length}）</div>
        {post.replies.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
            暂无回复，快来抢沙发～
          </div>
        )}
        {post.replies.map((reply) => (
          <div key={reply.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-600">👤 {reply.author}</span>
              {reply.author === post.author && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">楼主</span>
              )}
              <span>🕐 {formatTime(reply.createdAt)}</span>
              <button
                type="button"
                onClick={() => likeReply(reply)}
                disabled={isLiked(reply.id)}
                className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium transition disabled:cursor-not-allowed ${
                  isLiked(reply.id)
                    ? 'border-orange-300 bg-orange-50 text-orange-500'
                    : 'border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                👍 {reply.likes ?? 0}
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{reply.content}</p>
          </div>
        ))}
      </div>

      {/* 回复框 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="text"
          placeholder="昵称（可选）"
          value={replyAuthor}
          onChange={(e) => setReplyAuthor(e.target.value)}
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <textarea
          placeholder="写下你的回复…"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            回复
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 发帖编辑器
// ============================================================
function PostEditor({ onSubmit, onCancel }: { onSubmit: (post: Post) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [usage, setUsage] = useState<{ count: number; totalBytes: number }>({ count: 0, totalBytes: 0 });
  const [uploadMsg, setUploadMsg] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化附件用量统计
  useEffect(() => {
    getFileUsage().then(setUsage).catch(() => undefined);
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleLink = () => {
    const url = prompt('输入链接地址（含 https://）:');
    if (url) exec('createLink', url);
  };

  const handleImage = () => {
    fileRef.current?.click();
  };

  /** 上传视频：存入 IndexedDB 后插入 <video data-file-id> 标记 */
  const handleVideoFile = async (file: File) => {
    if (file.size > MAX_VIDEO_SIZE) {
      setUploadMsg(`视频不能超过 ${formatBytes(MAX_VIDEO_SIZE)}`);
      return;
    }
    if (usage.totalBytes + file.size > MAX_TOTAL_BYTES) {
      setUploadMsg('附件总空间已满（200MB），请删除旧帖附件或清理浏览器存储');
      return;
    }
    setUploadMsg('视频上传中…');
    try {
      const rec = await saveFile(file);
      exec(
        'insertHTML',
        `<video data-file-id="${rec.id}" controls preload="metadata" style="max-width:100%;border-radius:8px;margin:4px 0;">（视频加载中…）</video>`
      );
      setUsage(await getFileUsage());
      setUploadMsg(`✓ 视频已上传（${formatBytes(rec.size)}）`);
    } catch {
      setUploadMsg('视频上传失败，请重试');
    }
  };

  /** 上传附件：存入 IndexedDB 后插入下载链接标记 */
  const handleAttachmentFile = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadMsg(`「${file.name}」超过 ${formatBytes(MAX_FILE_SIZE)}，已跳过`);
        continue;
      }
      if (usage.totalBytes + file.size > MAX_TOTAL_BYTES) {
        setUploadMsg('附件总空间已满（200MB），请删除旧帖附件或清理浏览器存储');
        break;
      }
      setUploadMsg(`「${file.name}」上传中…`);
      try {
        const rec = await saveFile(file);
        const safeName = rec.name.replace(/"/g, '');
        exec(
          'insertHTML',
          `<p><a data-file-id="${rec.id}" data-file-name="${safeName}" contenteditable="false">📎 ${safeName}</a> <span style="color:#94a3b8;font-size:12px;">(${formatBytes(rec.size)})</span></p>`
        );
      } catch {
        setUploadMsg(`「${file.name}」上传失败`);
      }
    }
    setUsage(await getFileUsage().catch(() => usage));
    setUploadMsg('✓ 附件已上传');
  };

  /** 插入表格：弹出输入行×列，生成带边框的 table */
  const handleTable = () => {
    const input = prompt('输入表格行列数（格式：行x列，如 3x4，第一行将作为表头）：', '3x4');
    if (!input) return;
    const m = input.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (!m) {
      alert('格式不正确，请输入如 3x4');
      return;
    }
    const rows = Math.min(20, Math.max(1, parseInt(m[1], 10)));
    const cols = Math.min(10, Math.max(1, parseInt(m[2], 10)));
    let html = '<table><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += r === 0 ? '<th>&nbsp;</th>' : '<td>&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    exec('insertHTML', html);
  };

  /** 粘贴处理：剪贴板含表格时保留 HTML 结构插入，否则走默认 */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (html && html.toLowerCase().includes('<table')) {
      e.preventDefault();
      document.execCommand('insertHTML', false, html);
    }
  };

  /** 上传图片：同样存入 IndexedDB（避免 base64 撑爆 localStorage），插入 <img data-file-id> 标记 */
  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadMsg('图片不能超过 10MB');
      return;
    }
    if (usage.totalBytes + file.size > MAX_TOTAL_BYTES) {
      setUploadMsg('附件总空间已满（200MB），请删除旧帖附件或清理浏览器存储');
      return;
    }
    setUploadMsg('图片上传中…');
    try {
      const rec = await saveFile(file);
      exec('insertHTML', `<img data-file-id="${rec.id}" alt="${rec.name.replace(/"/g, '')}" style="max-width:100%;border-radius:8px;">`);
      setUsage(await getFileUsage());
      setUploadMsg(`✓ 图片已上传（${formatBytes(rec.size)}）`);
    } catch {
      setUploadMsg('图片上传失败，请重试');
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('请输入标题');
      return;
    }
    const content = editorRef.current?.innerHTML ?? '';
    if (!content.replace(/<[^>]*>/g, '').trim()) {
      alert('请输入内容');
      return;
    }
    onSubmit({
      id: `post-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || '匿名用户',
      category,
      content,
      createdAt: new Date().toISOString(),
      views: 0,
      replies: [],
    });
  };

  const btnCls = 'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition border border-transparent hover:border-slate-200';

  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="inline-block text-sm text-slate-500 hover:text-blue-600">
        ← 返回列表
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">发新帖</h2>

        {/* 标题 */}
        <input
          type="text"
          placeholder="帖子标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />

        <div className="mb-3 flex gap-3">
          {/* 分类 */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {/* 昵称 */}
          <input
            type="text"
            placeholder="昵称（可选）"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* 富文本工具栏 */}
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
          <button className={btnCls} onClick={() => exec('bold')} title="加粗"><b>B</b></button>
          <button className={btnCls} onClick={() => exec('italic')} title="斜体"><i>I</i></button>
          <button className={btnCls} onClick={() => exec('underline')} title="下划线"><u>U</u></button>
          <button className={btnCls} onClick={() => exec('strikeThrough')} title="删除线"><s>S</s></button>
          <div className="mx-1 h-4 w-px bg-slate-300" />
          <select
            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
            onChange={(e) => exec('fontSize', e.target.value)}
            defaultValue="3"
          >
            <option value="2">小字</option>
            <option value="3">正常</option>
            <option value="5">大字</option>
            <option value="6">标题</option>
          </select>
          <select
            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
            onChange={(e) => exec('fontName', e.target.value)}
            defaultValue=""
          >
            <option value="">默认字体</option>
            <option value="SimSun, serif">宋体</option>
            <option value="Microsoft YaHei, sans-serif">微软雅黑</option>
            <option value="KaiTi, serif">楷体</option>
            <option value="SimHei, sans-serif">黑体</option>
            <option value="Arial, sans-serif">Arial</option>
          </select>
          <div className="mx-1 h-4 w-px bg-slate-300" />
          <button className={btnCls} onClick={() => exec('foreColor', '#e53e3e')} title="红色文字">
            <span className="text-red-500">A</span>
          </button>
          <button className={btnCls} onClick={() => exec('foreColor', '#3182ce')} title="蓝色文字">
            <span className="text-blue-500">A</span>
          </button>
          <button className={btnCls} onClick={() => exec('foreColor', '#38a169')} title="绿色文字">
            <span className="text-green-500">A</span>
          </button>
          <button className={btnCls} onClick={() => exec('foreColor', '#000000')} title="黑色文字">
            <span className="text-slate-700">A</span>
          </button>
          <div className="mx-1 h-4 w-px bg-slate-300" />
          <button className={btnCls} onClick={() => exec('insertUnorderedList')} title="无序列表">• 列表</button>
          <button className={btnCls} onClick={() => exec('insertOrderedList')} title="有序列表">1. 列表</button>
          <button className={btnCls} onClick={() => exec('justifyLeft')} title="左对齐">⬅</button>
          <button className={btnCls} onClick={() => exec('justifyCenter')} title="居中">↔</button>
          <button className={btnCls} onClick={() => exec('justifyRight')} title="右对齐">➡</button>
          <div className="mx-1 h-4 w-px bg-slate-300" />
          <button className={btnCls} onClick={handleLink} title="插入链接">🔗 链接</button>
          <button className={btnCls} onClick={handleImage} title="插入图片">📷 图片</button>
          <button className={btnCls} onClick={handleTable} title="插入表格">⊞ 表格</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="mx-1 h-4 w-px bg-slate-300" />
          <button className={btnCls} onClick={() => videoRef.current?.click()} title="上传视频（≤50MB）">🎬 视频</button>
          <button className={btnCls} onClick={() => fileInputRef.current?.click()} title="上传附件（≤20MB，可多选）">📎 附件</button>
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleVideoFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleAttachmentFile(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="mx-1 h-4 w-px bg-slate-300" />
          <button className={btnCls} onClick={() => exec('removeFormat')} title="清除格式">清除</button>
        </div>

        {/* 附件用量提示 */}
        <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
          <span>
            附件存储：已用 {formatBytes(usage.totalBytes)}（{usage.count} 个文件）/ 上限 {formatBytes(MAX_TOTAL_BYTES)}
          </span>
          {uploadMsg && <span className={uploadMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}>{uploadMsg}</span>}
        </div>

        {/* 编辑区 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePaste}
          className={`min-h-[300px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-400 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_video]:max-w-full [&_video]:rounded-lg [&_video]:my-2 ${TABLE_STYLE}`}
          data-placeholder="在此输入帖子内容…支持文字、图片、链接、表格等…（可直接从 Excel / 网页复制表格粘贴）"
        />

        {/* 提交 */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            发布帖子
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          提示：支持图片（≤10MB）、视频（≤50MB）、附件（≤20MB，可多选），附件存储在浏览器本地数据库（IndexedDB，上限 200MB），删除帖子时附件自动清理。也可点击「⊞ 表格」或从 Excel / 网页复制表格粘贴。
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 公告栏（单条静态显示；多条自动轮播 + 可编辑）
// ============================================================
function NoticeBoard({ items, onEdit }: { items: string[]; onEdit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const count = items.length;

  // 多条公告时每 4 秒轮播一条（淡入淡出切换）
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % count);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const current = items[idx] ?? items[0];

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="shrink-0 text-base leading-5">📢</span>
      <div className="min-w-0 flex-1">
        <div className={`leading-6 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`} key={idx}>
          {current}
        </div>
        {count > 1 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[10px] text-amber-500">
              {idx + 1} / {count}
            </span>
            <span className="flex gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setFade(false);
                    setTimeout(() => {
                      setIdx(i);
                      setFade(true);
                    }, 200);
                  }}
                  aria-label={`查看第 ${i + 1} 条公告`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-amber-500' : 'w-1.5 bg-amber-300 hover:bg-amber-400'}`}
                />
              ))}
            </span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        title="编辑公告"
        className="shrink-0 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-700 transition hover:bg-amber-200"
      >
        ✎ 编辑
      </button>
    </div>
  );
}

/** 公告编辑器：多条文本框，支持增删改 */
function NoticeEditor({
  items,
  onSave,
  onCancel,
}: {
  items: string[];
  onSave: (items: string[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(items.length > 0 ? items : ['']);

  const update = (i: number, value: string) => {
    setDraft((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };
  const add = () => setDraft((prev) => [...prev, '']);
  const remove = (i: number) => {
    setDraft((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-amber-800">📢 编辑公告（多条将自动轮播显示）</span>
        <button type="button" onClick={add} className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200">
          ＋ 添加公告
        </button>
      </div>
      <div className="space-y-2">
        {draft.map((text, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2 shrink-0 text-xs font-medium text-amber-600">{i + 1}</span>
            <textarea
              value={text}
              onChange={(e) => update(i, e.target.value)}
              rows={2}
              placeholder={`请输入第 ${i + 1} 条公告内容…`}
              className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={draft.length <= 1}
              title="删除该条公告"
              className="mt-1.5 shrink-0 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-700 hover:bg-amber-200 disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          保存公告
        </button>
      </div>
    </div>
  );
}
