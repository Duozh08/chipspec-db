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
- **烤机数据（2026-08-06 恢复）**：Excel 无 stressTest 列 → 独立文件 `src/data/stress-tests.ts`（Record<新id, StressTestData>，92 条），由 `scripts/restore-stress-tests.py` 从 git v3(53dfa99) 按 (品牌 alienware→dell, 规范化名称/型号, 年份) 匹配生成；**每次重跑 gen-data.py 后需重跑 restore 脚本**；详情页烤机区块只在该表有数据时显示，GPU 方案卡解析型号字符串功耗 "(140W)"
- **芯片详情页尺寸图**：ChipDiagram `unified` prop 固定 viewBox 476×498（9850HX 口径），封装居中；对比页不启用

## 用户偏好（本项目）
- 中文界面；中国用户习惯
- 实例图用 SVG 比例示意图，不用真实照片（版权规避）

## CloudBase 后端（2026-08-07 上线）
- 环境：`duozhu08-tengfei-d1eqlp0bae59452`（个人版 ap-shanghai，到期 2026-09-07 需续费）；前端 apiClient.ts 的 `CLOUDBASE_ENV_ID` 指向它
- 三个 Event 云函数：collect（写库+触发）、autoFill（DeepSeek 补全，环境变量 DEEPSEEK_API_KEY）、list（查询）；经 HTTP 网关路由 /collect、/list 暴露，匿名已放开；域名 `https://duozhu08-tengfei-d1eqlp0bae59452.service.tcloudbase.com/{collect|list}`
- catalog 集合权限 ADMINONLY（仅云函数读写）；云端函数代码=cloudfunctions/ 目录，改后需重新部署（updateFunctionCode）
- **必坑**：① HTTP 网关调 Event 函数参数在 event.body（JSON 串），需 parseParams 兼容；② spec 字段为 null 时 update 嵌套对象报错，必须 doc.set 全量替换；③ MCP 建函数勿用 type=HTTP（要求 scf_bootstrap），用 Event+网关路由
- 部署可用 WorkBuddy CloudBase 连接器（MCP mcp__cloudbase__*）直接操作，无需控制台

## OCR tessdata 托管（2026-08-08 起）
- **tessdata 主源 = CloudBase 静态托管**（`https://duozhu08-tengfei-d1eqlp0bae59452-1452185409.tcloudbaseapp.com/tessdata/`，腾讯云国内 CDN ~7.5MB/s），GitHub Pages 同域副本兜底（22KB/s 太慢，仅兜底）
- 原因：GitHub Pages 在用户网络下 22KB/s，11MB tessdata 下 8 分钟 → 识别永远加载不完
- 更新流程：改 public/tessdata → MCP `mcp__cloudbase__manageHosting` action=upload（localPath=public/tessdata, cloudPath=tessdata）→ git push 同步 GitHub Pages 副本
- ocrEngine.ts：`ensureEngine` 顺序 cloudbase→github；缓存命名空间 `tess-fast-v4`；tesseract.js-core 的 wasm.js 为 SINGLE_FILE（base64 内嵌 wasm，外部 .wasm 用不到）
- CORS：CloudBase 静态托管回显 Origin + credentials，跨域 worker/importScripts/fetch 全通
