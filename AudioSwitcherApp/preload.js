const { contextBridge, ipcRenderer } = require('electron');

// 暴露一个安全的 API 接口给渲染进程
contextBridge.exposeInMainWorld('api', {
    // 1. 请求 C# 后端
    invokeBackend: (payload) => ipcRenderer.send('invoke-backend', payload),
    
    // 2. 监听 C# 后端响应
    onBackendResponse: (callback) => ipcRenderer.on('backend-response', (event, args) => callback(args)),

    // 3. 请求脚本生成
    generateScript: (selectedNames) => ipcRenderer.send('generate-script', selectedNames),
    
    // 4. 监听脚本生成结果
    onScriptGenerated: (callback) => ipcRenderer.on('script-generated-response', (event, args) => callback(args))
});