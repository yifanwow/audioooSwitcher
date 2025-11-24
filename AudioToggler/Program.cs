using System.Text.Json;
using AudioSwitcher.AudioApi;
using AudioSwitcher.AudioApi.CoreAudio;

// 这是一个无界面的后台程序
class Program
{
    static async Task Main(string[] args)
    {
        // 1. 寻找同目录下的配置文件
        var configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "audio_config.json");

        // 如果没有配置文件，什么都不做直接退出
        if (!File.Exists(configPath))
            return;

        try
        {
            // 2. 读取用户之前保存的设备ID列表
            var jsonString = await File.ReadAllTextAsync(configPath);
            var targetDeviceIds = JsonSerializer.Deserialize<List<string>>(jsonString);

            if (targetDeviceIds == null || targetDeviceIds.Count < 2)
                return;

            // 3. 获取音频控制器
            var controller = new CoreAudioController();
            var devices = await controller.GetDevicesAsync(DeviceState.Active);

            // 4. 获取当前正在用的设备
            var currentDevice = controller.DefaultPlaybackDevice;

            // 5. 核心逻辑：查找当前设备是列表里的第几个？
            int currentIndex = targetDeviceIds.IndexOf(currentDevice.Id.ToString());

            // 6. 计算下一个设备的序号（如果已经是最后一个，就回到第一个）
            int nextIndex = (currentIndex + 1) % targetDeviceIds.Count;
            // 如果当前设备竟然不在列表里，默认切到第一个
            if (currentIndex == -1)
                nextIndex = 0;

            string nextDeviceId = targetDeviceIds[nextIndex];

            // 7. 执行切换
            var nextDevice = devices.FirstOrDefault(d => d.Id.ToString() == nextDeviceId);
            if (nextDevice != null)
            {
                await nextDevice.SetAsDefaultAsync(); // 设置为默认播放
                await nextDevice.SetAsDefaultCommunicationsAsync(); // 设置为默认通讯
            }
        }
        catch
        {
            // 发生错误保持静默，不要弹窗干扰用户
        }
    }
}
