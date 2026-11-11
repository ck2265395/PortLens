# PortLens

PortLens 是一款面向开发者和本机运维人员的 Windows 端口工作台。它展示本机 TCP 监听端口与 UDP 绑定端口，支持按端口、进程、PID、命令行和服务名称搜索，并通过确认、身份复核和保护策略安全地停止进程。

## 功能

- TCP 监听与 UDP 绑定端口实时列表
- 端口、协议、进程、PID、路径、命令行、用户和 Windows 服务详情
- 不区分大小写的多关键词模糊搜索与协议筛选
- 默认 3 秒刷新，可暂停或选择 1/3/5/10 秒
- 所有停止操作强制确认，先尝试温和关闭，失败后单独确认强制结束
- PID 0/4、PortLens 自身、Windows 核心进程和共享服务宿主硬性保护
- 7 天本地操作日志，可在应用内查看、清空并导出 CSV/JSON
- 同进程关联端口与停止影响范围展示
- 默认普通权限运行，关闭窗口直接退出，可选最小化到托盘与开机启动

## 支持范围

- Windows 10 22H2、Windows 11
- Windows Server 2019、2022、2025
- x64

不支持远程主机、抓包、带宽统计、防火墙编辑和普通活动连接监控。

## 开发

```powershell
npm install
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
npm run smoke:win
```

生成 Windows 安装包：

```powershell
npm run package:win
```

产物位于 `release/PortLens-0.1.0-Setup-x64.exe`，免安装目录位于 `release/win-unpacked/`。

当前安装包带 PortLens 品牌图标，但未进行 Authenticode 代码签名；正式公开分发前建议配置企业代码签名证书。

## 安全说明

渲染进程启用上下文隔离和沙箱，不暴露 Node.js；所有系统操作经白名单 IPC、结构校验和主进程安全策略执行。结束进程前会重新核验 PID、路径与启动时间，降低 PID 复用导致误操作的风险。
