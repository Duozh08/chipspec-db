# CloudBase 后端部署指南（AI 自动补全）

本目录包含 3 个云函数，实现「点击收录 → 后端 DeepSeek 自动搜索补全 → 云数据库存储」的全自动闭环。

## 架构

```
前端（GitHub Pages）               腾讯云 CloudBase
  点击"立即收录"  ──POST──▶  collect（写库 + 触发补全）
                                │
                                ▼
                          autoFill（DeepSeek 补全 → 写回）
                                │
                                ▼
                               云数据库 catalog 集合
                                │
  网站/管理端  ──GET──▶   list（查询收录与补全结果）
```

## 部署步骤（约 20 分钟）

### 1. 创建 CloudBase 环境
1. 打开 https://console.cloud.tencent.com/tcb 注册/登录腾讯云
2. 创建环境（如名称 `chipspec`），选择**按量计费**（免费额度够用）
3. 记下**环境 ID**（形如 `chipspec-xxxxxx`）

### 2. 创建数据库集合
- 云开发控制台 → 数据库 → 新建集合 `catalog`
- 权限建议：仅"云函数读写"（前端不直接读写库，只调云函数）

### 3. 部署云函数（控制台方式，最简单）
对每个函数（collect / autoFill / list）：
1. 控制台 → 云函数 → 新建函数，**上传本目录对应子文件夹的 zip**（或粘贴 index.js + package.json）
2. 运行环境选 Nodejs 18+
3. 部署完成后，在 autoFill 函数 → 配置 → 环境变量，添加：`DEEPSEEK_API_KEY` = 你的 DeepSeek Key（https://platform.deepseek.com 获取）
4. 给函数开通**公网访问**：云函数 → 触发管理 → 添加 HTTP 触发器（路径默认 `/<函数名>`），开启"公网访问"（建议加鉴权 Token，前端需带）
5. 测试：直接调用 collect，参数 `{"name":"RTX 5070","category":"chip","brand":"nvidia"}`，应返回 `{"ok":true,...}`

### 4. 前端接入
编辑 `src/utils/apiClient.ts`，把 `CLOUDBASE_ENV_ID` 改为你的环境 ID：
```ts
const CLOUDBASE_ENV_ID = 'chipspec-xxxxxx';
```
（若触发器加了鉴权 Token，在 apiClient.ts 的请求头里补 `X-Api-Key: <token>`）

重新构建部署前端即可。未配置时前端自动降级为本地收录，功能不受影响。

### 5. 验收
- 前端识别弹框收录一个型号 → 提示"后端 AI 已开始自动搜索补全"
- 云函数日志里看到 autoFill 被触发并写库
- 控制台数据库 catalog 中该记录 status 变为 `filled`、spec 为结构化规格 JSON

## 数据库字段（catalog 集合）

| 字段 | 说明 |
|------|------|
| name | 型号名称 |
| category | chip / laptop |
| brand | 品牌猜测 |
| status | pending（补全中）/ filled（已补全） |
| spec | DeepSeek 输出的结构化规格 JSON（符合站内 Chip/Laptop 格式，缺失为 null） |
| createdAt / filledAt | 收录 / 补全时间戳 |

## 数据回流正式库（可选）
`list` 函数可导出补全结果 → 核对后合并进 `src/data/` → `npm run validate` → 发布，收录条目即成为站内正式数据。
