# CloudBase 后端部署指南（AI 自动补全）

本目录包含 3 个云函数，实现「点击收录 → 后端 DeepSeek 自动搜索补全 → 云数据库存储」的全自动闭环。

## ✅ 当前部署状态（2026-08-07 已上线）

**环境**：`duozhu08-tengfei-d1eqlp0bae59452`（个人版，ap-shanghai，到期 2026-09-07）

| 资源 | 状态 | 说明 |
|------|------|------|
| `catalog` 集合 | ✅ 已创建 | 权限 ADMINONLY（仅云函数可读写） |
| `collect` 云函数 | ✅ 已部署 | Event 型，网关路由 `/collect` |
| `autoFill` 云函数 | ✅ 已部署 | Event 型，含 `DEEPSEEK_API_KEY` 环境变量 |
| `list` 云函数 | ✅ 已部署 | Event 型，网关路由 `/list` |
| HTTP 网关 | ✅ 已开启 | 匿名访问已放开（函数权限 CUSTOM invoke:true） |

**访问地址**（前端 apiClient.ts 使用）：
```
https://duozhu08-tengfei-d1eqlp0bae59452.service.tcloudbase.com/collect
https://duozhu08-tengfei-d1eqlp0bae59452.service.tcloudbase.com/list
```
（`*.service.tcloudbase.com` 会自动路由到网关，测试已验证 HTTP 200）

**前端配置**：`src/utils/apiClient.ts` → `CLOUDBASE_ENV_ID = 'duozhu08-tengfei-d1eqlp0bae59452'`

## 架构

```
前端（GitHub Pages）               腾讯云 CloudBase
  点击"立即收录"  ──POST──▶  collect（写库 + 异步触发 autoFill）
                                │
                                ▼
                          autoFill（DeepSeek 补全 → 写回）
                                │
                                ▼
                               云数据库 catalog 集合
                                │
  网站/管理端  ──GET──▶   list（查询收录与补全结果）
```

## 部署步骤（MCP 方式，控制台亦可）

### 1. 创建数据库集合
- 云开发控制台 → 数据库 → 新建集合 `catalog`
- 权限：**ADMINONLY（无权限）**—— 前端不直接读写库，只调云函数；云函数有管理员权限自动绕过

### 2. 部署云函数（Nodejs18.15，Event 型）
对每个函数（collect / autoFill / list）：
1. 控制台 → 云函数 → 新建函数，上传本目录对应子文件夹（或粘贴 index.js + package.json）
2. 运行环境 Nodejs18.15，入口 `index.main`，超时建议：collect/list 30s，autoFill 300s
3. autoFill 函数 → 配置 → 环境变量：`DEEPSEEK_API_KEY` = 你的 DeepSeek Key
4. **不要用 HTTP 类型创建**（会要求 scf_bootstrap，我们的函数是标准 exports.main 格式）—— 创建为 Event 型，然后用 HTTP 网关路由暴露：
   - 控制台 → HTTP 访问服务 → 添加路由 `/collect` → 上游类型 SCF → 函数 collect
   - 同样添加 `/list` → SCF → list
5. 函数权限放开匿名访问：云函数 → 权限 → 自定义安全规则 `{"invoke": true}`

### 3. 前端接入
编辑 `src/utils/apiClient.ts`，把 `CLOUDBASE_ENV_ID` 改为你的环境 ID（已配置）。

### 4. 验收（已通过）
- 收录 RTX 5060 Laptop → autoFill 自动补全 → status=filled，spec 含完整规格 JSON ✅
- 收录 拯救者Y7000P 2025 / ROG 幻16 Air 2025 → 自动补全 ✅
- DeepSeek 缺失字段一律 null（遵守数据诚信）✅

## 数据库字段（catalog 集合）

| 字段 | 说明 |
|------|------|
| name | 型号名称 |
| category | chip / laptop |
| brand | 品牌猜测 |
| status | pending（补全中）/ filled（已补全） |
| spec | DeepSeek 输出的结构化规格 JSON（符合站内 Chip/Laptop 格式，缺失为 null） |
| createdAt / filledAt | 收录 / 补全时间戳 |

## 已知坑（部署时注意）

1. **嵌套 update 报错**：原 spec 字段为 null 时，`update({spec: {...}})` 会被展开成 `spec.brand` 导致 `Cannot create field 'brand' in element {spec: null}`。解决：改用 `doc(id).set({...})` 全量替换（保留 createdAt）。
2. **HTTP 类型函数**：MCP createFunction 传 `type=HTTP` 会走 SCF WebServer 模式要求 `scf_bootstrap` 文件。标准 CloudBase 函数应创建 Event 型 + 网关路由（upstreamResourceType=SCF）。
3. **网关调用参数**：通过网关调用 Event 函数时，请求体在 `event.body`（JSON 字符串），需 parseParams 兼容内部 callFunction 平铺参数。
4. **云函数代码更新后**：invoke 可能短暂命中旧实例，等几秒重试或确认 getFunctionDetail 的 CodeInfo。

## 数据回流正式库（可选）
`list` 函数可导出补全结果 → 核对后合并进 `src/data/` → `npm run validate` → 发布，收录条目即成为站内正式数据。
