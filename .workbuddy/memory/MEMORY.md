# 项目长期记忆 — ChipSpec DB 芯片规格数据库

## 项目概况
- 纯前端 SPA（无后端）：React 19 + Vite + TypeScript + Tailwind v4 + react-router（HashRouter）
- 工作目录即项目根目录；Node 用托管运行时 `C:\Users\Duozh08\.workbuddy\binaries\node\versions\22.22.2`
- 常用命令：`npm run dev`（预览）、`npm run validate`（数据校验，tsx 跑 scripts/validate-data.ts）、`npm run build`（tsc -b && vite build）

## 架构约定
- 数据即代码：芯片数据在 `src/data/chips/*.ts`，`satisfies Chip[]` 编译期检查；新增型号改数据文件即可，必须跑 `npm run validate`
- 数据诚信原则：不确定的字段一律 null（UI 显示"暂无数据"），禁止编造精确数字；每条数据带 sources[] 与 dataQuality（official/measured/estimated）
- GPU 封装物理尺寸无公开数据 → package.lengthMm/widthMm 留 null，ChipDiagram 自动走"估算封装"虚线模式
- Die 长宽普遍缺失 → 留 null，示意图按面积折算正方形并标注 ~
- 多 Die 拓扑用 `dies[].layout` 相对坐标（0~1，Die 中心位置）；无 layout 时自动流式排列

## 用户偏好（本项目）
- 中文界面；中国用户习惯
- 实例图用 SVG 比例示意图，不用真实照片（版权规避）
