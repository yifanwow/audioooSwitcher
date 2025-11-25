const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

const PIPE_NAME = 'AudioSwitcherPipe';
let cSharpProcess = null;
let mainWindow = null;

// --- C# 后端启动和通信 ---

/**
 * 启动 C# 后端 EXE 进程 (自包含模式).
 * 路径现在指向：../AudioSwitcher.Backend/bin/Release/net8.0/win-x64/publish/AudioSwitcher.Backend.exe
 */
function startCSharpBackend() {
    // 确保只启动一个进程
    if (cSharpProcess) {
        console.log("C# process is already running.");
        if (mainWindow) {
            mainWindow.webContents.send('csharp-status', { status: 'running' });
        }
        return;
    }

    // 1. 定义 EXE 文件的绝对路径 (路径已修正，指向 C# 构建输出目录)
    // 假设 __dirname 是 a/AudioSwitcherApp/，所以 '..' 指向 a/
    const relativeBackendPath = path.join('..', 'AudioSwitcher.Backend', 'bin', 'Release', 'net8.0', 'win-x64', 'publish');
    const backendExePath = path.resolve(__dirname, relativeBackendPath, 'AudioSwitcher.Backend.exe');
    const cwdPath = path.resolve(__dirname, relativeBackendPath); // 工作目录设置为 publish 文件夹

    
    if (!fs.existsSync(backendExePath)) {
        const errorMessage = `C# Backend EXE not found at: ${backendExePath}`;
        console.error(errorMessage);
        if (mainWindow) {
            mainWindow.webContents.send('csharp-status', { status: 'error', message: `❌ 启动失败: 找不到 EXE 文件。请检查路径：${backendExePath}` });
        }
        return; 
    }
    
    // 报告尝试启动
    if (mainWindow) {
        mainWindow.webContents.send('csharp-status', { status: 'starting' });
    }
    console.log(`Attempting to spawn C# backend EXE: ${backendExePath}`);
    console.log(`Setting CWD to: ${cwdPath}`);

    // 2. 使用 spawn 执行 EXE 文件
    cSharpProcess = spawn(backendExePath, [], {
        stdio: 'pipe', 
        windowsHide: true,
        // CWD 必须设置为 EXE 所在的目录，以便它找到所有依赖 DLL
        cwd: cwdPath, 
    });

    cSharpProcess.stdout.on('data', (data) => {
        console.log(`C# STDOUT: ${data.toString().trim()}`);
        // 检查 C# 后端是否已启动 Named Pipe 服务器
        if (data.toString().includes("Pipe 'AudioSwitcherPipe' is ready.")) {
            if (mainWindow) {
                mainWindow.webContents.send('csharp-status', { status: 'ready' });
            }
        }
    });

    cSharpProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString().trim();
        console.error(`C# STDERR: ${errorMsg}`);
        if (mainWindow) {
             // 仅发送给前端日志，不改变主状态
             mainWindow.webContents.send('csharp-log', { type: 'error', message: errorMsg });
        }
    });

    cSharpProcess.on('error', (err) => {
        let errorMsg = `Failed to start C# process: ${err.message}`;
        console.error(errorMsg);
        if (mainWindow) {
            // 如果 spawn 失败，可能是权限或找不到命令
            mainWindow.webContents.send('csharp-status', { status: 'error', message: `❌ 启动失败: ${err.message}` });
        }
        cSharpProcess = null;
    });

    cSharpProcess.on('close', (code) => {
        console.log(`C# process exited with code ${code}`);
        if (mainWindow) {
            mainWindow.webContents.send('csharp-status', { status: 'exited', code });
        }
        cSharpProcess = null;
    });

    // 假设启动成功，报告运行中 (等待 STDOUT 确认 'ready')
    if (mainWindow) {
        mainWindow.webContents.send('csharp-status', { status: 'running' });
    }
}

/**
 * 通过 Named Pipe 与 C# 后端通信
 * @param {object} payload - 要发送给 C# 的 JSON 对象
 * @returns {Promise<object>} C# 返回的 JSON 对象
 */
function communicateWithCSharp(payload) {
    return new Promise((resolve, reject) => {
        const PIPE_NAME = 'AudioSwitcherPipe'; 
        const pipePath = `\\\\.\\pipe\\${PIPE_NAME}`; 
        
        const client = net.connect(pipePath, () => {
            client.write(JSON.stringify(payload) + '\n');
        });

        let data = '';
        client.on('data', (chunk) => {
            data += chunk.toString();
        });

        client.on('end', () => {
            try {
                const jsonResponse = JSON.parse(data.trim());
                resolve(jsonResponse);
            } catch (e) {
                reject(new Error(`Failed to parse C# response: ${e.message}. Raw data: ${data}`));
            }
        });

        client.on('error', (err) => {
            let errorMessage = `Named Pipe connection error: ${err.message}`;
            if (err.code === 'ENOENT') {
                 // ENOENT 意味着管道不存在，即 C# 服务器没有运行
                 errorMessage = `Named Pipe connection error. Is the C# backend running and ready? (${err.code})`;
            }
            reject(new Error(errorMessage));
        });

        // 将超时时间设置为 10 秒
        client.setTimeout(10000, () => { 
            client.destroy();
            reject(new Error('Named Pipe communication timed out.'));
        });
    });
}


// --- Electron 窗口和 IPC 设置 ---

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 670,
        height: 900,
        resizable: true,   // ✅ 允许缩放
        maximizable: false,
        webPreferences: {
            // 确保 preload.js 路径正确
            preload: path.join(__dirname, 'preload.js') 
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); 
    mainWindow.setMinimumSize(670, 900);
    mainWindow.setAspectRatio(670 / 900);
    // 在窗口创建后立即尝试启动 C# 进程
    startCSharpBackend();
}

// IPC Main 监听器: 监听来自渲染进程的请求 (与 C# 通信)
ipcMain.on('invoke-backend', async (event, payload) => {
    if (!cSharpProcess) {
        event.sender.send('backend-response', {
            success: false,
            error: "C# backend process is not running. Please check console for startup errors."
        });
        return;
    }

    try {
        // 在尝试连接前等待一小段时间，确保管道服务器有时间启动
        await new Promise(r => setTimeout(r, 500)); 

        const response = await communicateWithCSharp(payload);
        event.sender.send('backend-response', response);
    } catch (error) {
        event.sender.send('backend-response', {
            success: false,
            error: `通信错误: ${error.message}`
        });
    }
});

// [略去 generate-script 逻辑，与 Named Pipe 通信无关]
ipcMain.on('generate-script', (event, selectedDeviceNames) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `AudioSwitch_${timestamp}.ps1`; 
        const targetPath = path.join(app.getPath('desktop'), fileName);
        
        // 生成 PowerShell 脚本内容
        const psScript = `# PowerShell Script to Cycle Audio Devices
# Generated by AudioSwitcher Electron App
# ... Script content here ...
`;
        
        fs.writeFileSync(targetPath, psScript, 'utf8');

        event.sender.send('script-generated-response', {
            success: true,
            path: targetPath
        });

    } catch (e) {
        event.sender.send('script-generated-response', {
            success: false,
            error: e.message
        });
    }
});


app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 退出时终止 C# 进程
app.on('before-quit', () => {
    if (cSharpProcess) {
        cSharpProcess.kill();
    }
});