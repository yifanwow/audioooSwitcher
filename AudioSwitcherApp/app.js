// ---- 模拟 window.api（无 Electron 时使用） ----
if (typeof window.api === "undefined") {
  console.warn("Electron API 未找到，使用模拟模式");
  window.api = {
    invokeBackend: (msg) => console.log("Simulated invokeBackend:", msg),
    generateScript: (names) => console.log("Simulated generateScript:", names),
    onBackendResponse: (callback) =>
      setTimeout(
        () =>
          callback({
            success: true,
            data: [
              { id: "1", name: "扬声器 (Realtek Audio)" },
              { id: "2", name: "Headphones (Audeze Maxwell)" },
              { id: "3", name: "显示器音频 (NVIDIA)" },
            ],
          }),
        1500
      ),
    onScriptGenerated: () => {},
  };
}

// ---- 状态数据 ----
let allDevices = [];
let selectedDevices = [];
let isRefreshing = false;
let isGenerating = false;

// ---- DOM ----
const listContainer = document.getElementById("list-container");
const genButton = document.getElementById("btn-gen");
const refreshButton = document.getElementById("btn-refresh");
const refreshIcon = document.getElementById("refresh-icon");
const statusMessage = document.getElementById("status-msg");

// ---- UI ----
function updateButtonState() {
  const count = selectedDevices.length;
  genButton.disabled = !(count >= 2 && !isGenerating);
  genButton.textContent =
    isGenerating
      ? "生成中..."
      : count >= 2
      ? `生成切换脚本 (${count} 个设备)`
      : "生成切换脚本 (请至少选2个)";
}

function renderList(deviceList) {
  allDevices = deviceList || [];
  selectedDevices = selectedDevices.filter((d) =>
    allDevices.some((ad) => ad.id === d.id)
  );

  listContainer.innerHTML = "";

  if (allDevices.length === 0) {
    listContainer.innerHTML =
      '<div class="text-center text-gray-500 py-4">未找到任何活跃的音频输出设备。</div>';
    statusMessage.textContent = "未发现设备。";
    return;
  }

  allDevices.forEach((device) => {
    const isChecked = selectedDevices.some((d) => d.id === device.id);

    const row = document.createElement("label");
    row.className = "device-item-label";
    row.innerHTML = `
      <input type="checkbox"
        class="device-checkbox"
        data-id="${device.id}"
        data-name="${device.name}"
        ${isChecked ? "checked" : ""} />
      <span class="text-sm font-light truncate">${device.name}</span>
    `;

    row.querySelector("input").addEventListener("change", handleDeviceSelection);
    listContainer.appendChild(row);
  });

  statusMessage.textContent = `发现 ${allDevices.length} 个设备。`;
  updateButtonState();
}

function handleDeviceSelection(event) {
  const id = event.target.dataset.id;
  const name = event.target.dataset.name;
  event.target.checked
    ? selectedDevices.push({ id, name })
    : (selectedDevices = selectedDevices.filter((d) => d.id !== id));

  updateButtonState();
}

// ---- 动作 ----
function refreshDevices() {
  if (isRefreshing) return;
  isRefreshing = true;

  statusMessage.textContent = "正在请求 C# 后端扫描设备...";
  listContainer.innerHTML = `
    <div class="text-center text-gray-500 py-4">
      <svg class="w-5 h-5 inline mr-2 align-middle text-gray-500 spin-animation"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1 .8-5.34"></path>
      </svg>
      正在扫描设备...
    </div>
  `;

  refreshIcon.classList.add("spin-animation");
  refreshButton.disabled = true;

  window.api.invokeBackend({ action: "getDevices" });
}

function generateScript() {
  if (selectedDevices.length < 2) return;

  isGenerating = true;
  statusMessage.textContent = "正在生成脚本...";
  updateButtonState();

  window.api.generateScript(selectedDevices.map((d) => d.name));
}

// ---- 后端响应事件 ----
window.api.onBackendResponse((response) => {
  isRefreshing = false;
  refreshIcon.classList.remove("spin-animation");
  refreshButton.disabled = false;

  response.success
    ? renderList(response.data)
    : renderList([]);
});

// ---- 事件绑定 ----
refreshButton.addEventListener("click", refreshDevices);
genButton.addEventListener("click", generateScript);

// ---- 初始化 ----
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(refreshDevices, 3000);
});
