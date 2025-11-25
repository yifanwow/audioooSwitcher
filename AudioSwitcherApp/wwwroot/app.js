let selectedIds = [];

// ====================================================================
// ** 1. 接收 C# 后端消息 **
// ====================================================================
window.external.receiveMessage(json => {
    
    // *** 关键确认点：在解析 JSON 之前，立即发送回执给 C# 终端 ***
    window.external.sendMessage(JSON.stringify({
        action: 'debug_log',
        message: 'JS_RECEIVED_MESSAGE_ENTRY_POINT_HIT.'
    }));
    // ***************************************************************
    
    console.log("JS LOG: 1. Received raw JSON from backend."); 

    try {
        const data = JSON.parse(json);
        
        if (data.type === 'list') {
            console.log("JS LOG: 2. Parsed LIST data. Devices found:", data.payload ? data.payload.length : 0); 
            renderList(data.payload);
        } else if (data.type === 'done') {
            document.getElementById('status-msg').innerText = "✅ 脚本生成成功！";
            alert(`成功生成脚本于: ${data.payload}\n\n现在你可以把生成的exe文件固定到任务栏或设为快捷键。`);
        } else if (data.type === 'err') {
            document.getElementById('status-msg').innerText = `❌ 错误: ${data.payload}`;
            console.error("JS ERROR:", data.payload);
            alert("发生错误: " + data.payload);
        }
    } catch (e) {
        // 将 JSON 解析错误回传给 C# 终端
        window.external.sendMessage(JSON.stringify({
            action: 'debug_log',
            message: 'JS_FATAL_ERROR_IN_HANDLER: ' + e.message + '. Raw Data: ' + json.substring(0, 50) + '...'
        }));
        
        console.error("JS LOG: JSON Parsing Error:", e, "Raw Data:", json); 
        document.getElementById('status-msg').innerText = '❌ 数据解析失败。';
    }
});

// ====================================================================
// ** 2. 刷新设备列表函数 (手动或自动触发) **
// ====================================================================
function refreshDevices() {
    console.log("JS LOG: Manual refresh triggered. Sending 'get_list' message.");
    // 清空选中和列表，并显示加载状态
    selectedIds = [];
    updateButtonState();
    const container = document.getElementById('list-container');
    container.innerHTML = '<div style="text-align: center; padding: 10px; color: #8e8e93;">正在扫描设备...</div>';

    // 发送消息给 C# 后端
    window.external.sendMessage(JSON.stringify({ action: 'get_list' }));
}

// ====================================================================
// ** 3. 渲染列表 **
// ====================================================================
function renderList(devices) {
    const container = document.getElementById('list-container');
    container.innerHTML = '';
    
    if (!devices || devices.length === 0) {
         container.innerHTML = '<div style="text-align: center; padding: 10px; color: #8e8e93;">未找到任何活跃的音频输出设备。</div>';
         return;
    }

    devices.forEach(d => {
        const div = document.createElement('div');
        div.className = 'device-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = d.id;
        checkbox.onchange = () => toggle(d.id, checkbox.checked);

        const label = document.createElement('label');
        label.htmlFor = d.id;
        label.innerText = d.name;

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// ====================================================================
// ** 4. 勾选和按钮逻辑 **
// ====================================================================
function toggle(id, isChecked) {
    if (isChecked) {
        selectedIds.push(id);
    } else {
        selectedIds = selectedIds.filter(item => item !== id);
    }
    updateButtonState();
}

function updateButtonState() {
    const btn = document.getElementById('btn-gen');
    if (selectedIds.length >= 2) {
        btn.classList.add('active');
        btn.disabled = false;
        btn.innerText = `生成切换脚本 (${selectedIds.length} 个设备)`;
    } else {
        btn.classList.remove('active');
        btn.disabled = true;
        btn.innerText = `生成切换脚本 (请至少选2个)`;
    }
}

// ** 按钮点击事件 **
document.getElementById('btn-gen').onclick = () => {
    document.getElementById('status-msg').innerText = '正在生成文件...';
    // 发送选中的 ID 给 C#
    window.external.sendMessage(JSON.stringify({
        action: 'generate',
        ids: selectedIds
    }));
};


// ====================================================================
// ** 5. 页面启动点 **
// ====================================================================

// 使用 setTimeout 延迟调用 refreshDevices，确保 window.external.receiveMessage 监听器已经完全注册。
setTimeout(refreshDevices, 100); 

// 首次加载时更新按钮状态
updateButtonState();