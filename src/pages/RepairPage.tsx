import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'chipspec-repair-posts';

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
}

interface Reply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

const CATEGORIES = ['维修经验', '故障排查', '工具推荐', '求助提问', '技术交流', '配件交易'];

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

// Sample seed posts
const SEED_POSTS: Post[] = [
  {
    id: 'seed-1',
    title: '【维修经验】RTX 3060 显卡花屏维修全过程分享',
    author: '维修老张',
    category: '维修经验',
    content: '<p>分享一块 RTX 3060 花屏的维修过程。</p><p><strong>故障现象：</strong>开机花屏，进入系统后满屏彩色条纹。</p><p><strong>排查过程：</strong></p><ol><li>先检查显存供电，1.35V 正常</li><li>用热风枪加热显存区域，花屏有变化 → 判定显存虚焊</li><li>重新植锡焊接显存后恢复正常</li></ol><p><strong>总结：</strong>RTX 30 系列显存虚焊是常见故障，加热法可以快速定位。</p>',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    views: 1280,
    replies: [
      { id: 'r1', author: '小白学维修', content: '感谢分享！正好遇到一样的问题', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    ],
  },
  {
    id: 'seed-2',
    title: '【故障排查】笔记本 CPU 供电短路维修思路',
    author: '芯片级维修',
    category: '故障排查',
    content: '<p>笔记本 CPU 供电短路是比较常见的故障，分享一下排查思路：</p><p>1. 先测 CPU 供电电感对地阻值，正常应在 20Ω 以上</p><p>2. 如果阻值偏低，断开 CPU 供电 MOS 管逐个排查</p><p>3. 常见原因是供电 MOS 管击穿或 CPU 本身短路</p><p>4. 更换 MOS 管后一定要测阻值正常再上电</p>',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    views: 856,
    replies: [],
  },
];

export default function RepairPage() {
  const [posts, setPosts] = useState<Post[]>(loadPosts);
  const [view, setView] = useState<'list' | 'detail' | 'editor'>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    // Seed initial posts if empty
    if (posts.length === 0) {
      setPosts(SEED_POSTS);
      savePosts(SEED_POSTS);
    }
  }, []);

  const filteredPosts = (filterCategory
    ? posts.filter((p) => p.category === filterCategory)
    : posts
  ).slice().sort((a, b) => {
    // 置顶优先，其次按时间倒序
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleViewPost = (post: Post) => {
    const updated = posts.map((p) => p.id === post.id ? { ...p, views: p.views + 1 } : p);
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
    const updated = posts.map((p) =>
      p.id === postId ? { ...p, replies: [...p.replies, reply] } : p
    );
    setPosts(updated);
    savePosts(updated);
    setSelectedPost(updated.find((p) => p.id === postId) ?? null);
  };

  const handleDeletePost = (postId: string) => {
    const updated = posts.filter((p) => p.id !== postId);
    setPosts(updated);
    savePosts(updated);
    setView('list');
  };

  const handleTogglePin = (postId: string) => {
    const updated = posts.map((p) =>
      p.id === postId ? { ...p, pinned: !p.pinned } : p
    );
    setPosts(updated);
    savePosts(updated);
    setSelectedPost(updated.find((p) => p.id === postId) ?? null);
  };

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

          {/* 帖子列表 */}
          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
                暂无帖子，点击右上角发新帖
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handleViewPost(post)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          {post.category}
                        </span>
                        {post.pinned && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            📌 置顶
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-800 hover:text-blue-600">{post.title}</h3>
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-400">
                        <span>👤 {post.author}</span>
                        <span>🕐 {formatTime(post.createdAt)}</span>
                        <span>👁 {post.views}</span>
                        <span>💬 {post.replies.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
}: {
  post: Post;
  onBack: () => void;
  onReply: (reply: Reply) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');

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
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">{post.title}</h1>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={onTogglePin}
              title={post.pinned ? '取消置顶' : '置顶帖子'}
              className={`text-xs transition ${
                post.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-amber-500'
              }`}
            >
              {post.pinned ? '📌 取消置顶' : '📌 置顶'}
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600"
            >
              🗑 删除
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
          <span>👤 {post.author}</span>
          <span>🕐 {formatTime(post.createdAt)}</span>
          <span>👁 {post.views} 次浏览</span>
        </div>
        <div
          className="mt-4 max-w-none text-sm leading-6 text-slate-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle [&_tr]:bg-white [&_tr:nth-child(odd)]:bg-slate-50/50"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* 回复列表 */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-700">回复（{post.replies.length}）</div>
        {post.replies.map((reply) => (
          <div key={reply.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-600">👤 {reply.author}</span>
              <span>🕐 {formatTime(reply.createdAt)}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-700">{reply.content}</p>
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
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      exec('insertImage', reader.result as string);
    };
    reader.readAsDataURL(file);
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
          <button className={btnCls} onClick={() => exec('removeFormat')} title="清除格式">清除</button>
        </div>

        {/* 编辑区 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePaste}
          className="min-h-[300px] rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-400 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle [&_tr]:bg-white [&_tr:nth-child(odd)]:bg-slate-50/50"
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
          提示：支持 JPG/PNG/WebP/GIF 图片（≤2MB）；可点击「⊞ 表格」插入表格，也可直接从 Excel / 网页复制表格后粘贴（格式自动保留）。帖子数据保存在本地浏览器中。
        </p>
      </div>
    </div>
  );
}
