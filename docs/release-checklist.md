# PortLens 0.1.0 发布检查

验证日期：2026-11-11；平台：Windows x64。

## 产品要求与证据

- [x] 仅管理当前 Windows 电脑；无远程管理、抓包或防火墙编辑入口。
- [x] PowerShell/CIM 只采集 TCP `LISTENING` 与 UDP 绑定端点：`src/main/system/scripts/get-port-snapshot.ps1`。
- [x] 搜索覆盖端口、协议、进程、PID、服务、路径、命令行和用户；多关键词 AND：`src/shared/searchPorts.test.ts`。
- [x] 行身份包含协议、地址、端口、PID，PID 接管按移除/新增处理：`src/shared/diffSnapshots.test.ts`。
- [x] 均衡工作台显示 TCP/UDP、详情、同进程端口、服务和稳定的已结束快照：`src/renderer/App.test.tsx`、`e2e/portlens.spec.ts`。
- [x] 默认刷新 3 秒，可选 1/3/5/10 秒或暂停；查询 single-flight，隐藏窗口降频，失败保留最后成功数据。
- [x] 所有停止操作先确认；普通进程先温和关闭，失败后提供冻结目标的独立强制确认。
- [x] PID 0/4、自身进程树、关键/核心进程、共享服务宿主、身份不完整或已变化目标在主进程阻止。
- [x] 服务停止前重新核验服务名、宿主 PID 和可停止状态；服务计划不能升级为杀宿主进程。
- [x] 进程动作在同一个 PowerShell 进程对象上核验路径/启动时间后执行，降低 PID 复用竞态。
- [x] 默认普通权限；受限操作按需 UAC 重启，搜索/协议上下文保留且危险动作必须重新确认。
- [x] 操作日志本地保留 7 天，包含服务、方式和权限，可查看、清空并导出 JSON/CSV。
- [x] 关闭直接退出；可选托盘/开机启动；停止操作未决时支持继续等待或取消退出。
- [x] Electron 启用沙箱与上下文隔离、禁用 Node 集成，IPC 校验主 frame/发送者和结构化载荷。

## 最新验证结果

- [x] `npm test -- --run`：12 个文件、41 项测试通过。
- [x] `npm run typecheck`：通过。
- [x] `npm run test:e2e`：生产构建通过，3 项 Electron E2E 通过。
- [x] `npm run package:win`：生成 x64 unpacked 应用、NSIS 安装器和 blockmap。
- [x] `npm run smoke:win`：122 条真实记录（64 TCP、58 UDP），打包应用启动及正常退出通过。
- [x] 安装器：`release/PortLens-0.1.0-Setup-x64.exe`，90,718,488 字节。
- [x] 品牌图标：`build/icon.png`，打包日志不再出现默认 Electron 图标警告。
- [x] 生产依赖：首次审计发现的 Zod high 漏洞已升级到 4.6.7；GitHub 公告的修复版本为 4.6.6。升级后的测试、类型检查和构建通过。最终审计端点重试两次均网络超时，未伪报为一次完整的零漏洞扫描。

## 分发说明

- [ ] Authenticode 代码签名：需要外部企业证书；不影响本机功能，但公开分发时 Windows 会显示未知发布者。
- [ ] 多版本系统实机矩阵：当前机器已验证 Windows x64；Windows 10 22H2、Windows 11、Server 2019/2022/2025 的 API 兼容范围已按文档实现，正式广泛发布前仍建议在每个系统镜像执行 `npm run smoke:win`。

上述未勾选项是发布信任和跨系统认证工作，不是 PortLens 0.1.0 功能缺失。
