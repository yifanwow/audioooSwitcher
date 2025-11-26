# audioooSwitcher  
音频切换生成器  
---
audioooSwitcher 是一款轻量级的 Windows 工具，用于快速在多个音频输出设备之间切换。  
audioooSwitcher is a lightweight Windows utility that allows users to quickly switch between multiple audio output devices.

该工具包含用于设备枚举和脚本生成的 C# 后端，以及用于设备选择和脚本导出的 JavaScript 前端界面。  
It includes a C# backend for device enumeration and script generation, along with a JavaScript-based frontend for device selection and script exporting.

适用于经常在音箱、耳机、蓝牙或显示器音频之间切换的用户，并希望实现自动化操作流程。  
It is suitable for users who frequently switch between speakers, headphones, Bluetooth devices, or monitor audio and want an automated workflow.

---

## 功能 Features
- 自动扫描系统可用音频输出设备  
  Automatically detects available audio output devices

- 支持选择一个或多个设备  
  Allows selecting one or multiple devices

- 至少选择两个设备时可生成切换脚本  
  Script generation becomes available when two or more devices are selected

- 可导出可执行文件，每次运行依次切换设备  
  Exports an executable that switches devices sequentially every time it runs

- 简洁易用的图形界面  
  Simple and clean user interface

---

## 工作原理 How It Works
示例切换顺序：  
Example switching sequence:

运行 1 → 切换到扬声器  
Run 1 → Speaker

运行 2 → 切换到耳机  
Run 2 → Headphones

运行 3 → 切换回扬声器  
Run 3 → Speaker

循环往复  
Repeats continuously

---

## 技术栈 Tech Stack

### 后端 Backend (C# / .NET)
- 枚举 Windows 音频设备  
  Enumerates Windows audio output devices
- 生成可执行脚本文件  
  Generates executable switching scripts
- 使用 Windows CoreAudio (MMDevice API)  
  Uses Windows CoreAudio (MMDevice API)
- 处理设备持久化逻辑  
  Handles device persistence logic

### 前端 Frontend (JavaScript)
- 渲染 UI 和设备列表  
  Renders UI and device list
- 管理用户选择  
  Manages user selections
- 调用脚本生成  
  Triggers script generation
- 通过 IPC 与后端通信  
  Communicates with backend via IPC

### 运行环境 Platform
- Windows 10 或 Windows 11  
  Windows 10 or Windows 11
- 推荐使用 Visual Studio Code  
  Visual Studio Code recommended

---

## 启动与使用 Setup and Launch

### 1. 编译后端  
### 1. Build backend
进入 `AudioSwitcher.Backend` 文件夹并编译生成可执行文件。  
Open the `AudioSwitcher.Backend` folder and build the project to generate the executable.

### 2. 启动前端  
### 2. Start frontend

在 `AudioSwitcherApp` 目录执行：  
Run inside `AudioSwitcherApp`:

```sh
npm install
npm start
