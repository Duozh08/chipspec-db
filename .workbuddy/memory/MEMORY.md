# 项目长期记忆 — ChipSpec DB 芯片规格数据库

## 项目概况
- 纯前端 SPA（无后端）：React 19 + Vite + TypeScript + Tailwind v4 + react-router（HashRouter）
- 工作目录即项目根目录；Node 用托管运行时 `C:\Users\Duozh08\.workbuddy\binaries\node\versions\22.22.2`
- 常用命令：`npm run dev`（预览）、`npm run validate`（数据校验，tsx 跑 scripts/validate-data.ts）、`npm run build`（tsc -b && vite build）

## 架构约定
- 数据即代码：芯片数据在 `src/data/chips/*.ts`（`satisfies Chip[]` 编译期检查）；游戏本在 `src/data/laptops.ts`；新增型号改数据文件即可，必须跑 `npm run validate`
- 数据生成：`scripts/gen-data.py` 从 `D:/Desktop/芯片.xlsx` + `游戏本.xlsx` 自动生成 mobile-chips.ts / laptops.ts（Excel 数据优先，手动收录补充）
- 数据诚信原则：不确定的字段一律 null（UI 显示"暂无数据"），禁止编造精确数字；每条数据带 sources[] 与 dataQuality（official/measured/estimated）
- GPU 封装物理尺寸无公开数据 → package.lengthMm/widthMm 留 null，ChipDiagram 自动走"估算封装"虚线模式
- Die 长宽普遍缺失 → 留 null，示意图按面积折算正方形并标注 ~
- 多 Die 拓扑用 `dies[].layout` 相对坐标（0~1，Die 中心位置）；无 layout 时自动流式排列
- **Laptop 数据结构（v4 起）**：`cpuOptions[]/gpuOptions[]` 支持一型号多 CPU/GPU 方案；无 `priceCny`；品牌含 dell/hasee/xiaomi/honor/gigabyte/huawei/machenike/thunderobot；`cpuPlatform()` 判定 Intel/AMD
- **游戏本分组规则（2026-08-06 起）**：gen-data.py 按 **(品牌, 规范化名称, 型号)** 分组；规范化 = 去空格/去末尾年份/去 AI元启/酷睿版/锐龙版。当前 345 款。注意同型号可能对应多个不同产品（联想 16IRX9 = Y7000P+Y9000P+Y9000K），必须按规范名分开，不能按 (品牌,型号) 一刀切
- **注意**：规范化后游戏本 id 不含年份（如 `lenovo-y9000p-16irx9`）；首页 FEATURED_LAPTOPS 等硬编码 id 引用，数据重生成后需核对
- **本地持久化**：收藏 `chipspec-favorites`、芯片上传图 `chipspec-chip-photos`、论坛帖子 `chipspec-repair-posts`（均 localStorage）
- **注意**：v4 游戏本数据源自 Excel，不含烤机 stressTest 数据（Excel 无该列），详情页烤机区块自动隐藏

## 用户偏好（本项目）
- 中文界面；中国用户习惯
- 实例图用 SVG 比例示意图，不用真实照片（版权规避）
