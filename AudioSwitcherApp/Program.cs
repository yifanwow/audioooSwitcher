using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Linq;
using System.IO;
using PhotinoNET;
using AudioSwitcher.AudioApi;
using AudioSwitcher.AudioApi.CoreAudio;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        // ... (Main方法不变)
        new PhotinoWindow()
            .SetTitle("Audio Switcher Maker")
            .SetUseOsDefaultSize(false)
            .SetSize(500, 600)
            .Center()
            .Load("wwwroot/index.html")
            .RegisterWebMessageReceivedHandler(
                (object? sender, string msg) =>
                {
                    if (sender is PhotinoWindow window)
                    {
                        HandleMessage(window, msg);
                    }
                }
            )
            .WaitForClose();
    }

    static async void HandleMessage(PhotinoWindow window, string message)
    {
        try
        {
            var data = JsonSerializer.Deserialize<JsonElement>(message);
            if (!data.TryGetProperty("action", out var actionProp))
                return;
            var action = actionProp.GetString();

            if (action == "get_list")
            {
                // ** LOG 1: 确认消息到达 C# 后端 **
                Console.WriteLine("--- LOG: Message 'get_list' received by C#.");

                var controller = new CoreAudioController();

                // ** LOG 2: 确认 Audio Controller 实例化成功 **
                Console.WriteLine(
                    "--- LOG: Audio controller initialized. Attempting GetDevicesAsync..."
                );

                var devices = await controller.GetDevicesAsync(DeviceState.Active);

                // ** LOG 3: 确认设备列表获取成功 **
                Console.WriteLine(
                    $"--- LOG: GetDevicesAsync completed. Found {devices.Count()} devices."
                );

                var list = devices
                    .Where(d => d.DeviceType == DeviceType.Playback)
                    .Select(d => new { id = d.Id.ToString(), name = d.FullName })
                    .ToList();

                // ** LOG 4: 确认列表处理完成，准备回复前端 **
                Console.WriteLine("--- LOG: Device list processed. Replying to frontend.");

                Reply(window, "list", list);
            }
            else if (action == "generate")
            {
                // **【重要】** 暂时注释掉生成文件的代码，以确保编译通过。
                // 我们稍后再来修复并实现这个逻辑。
                Reply(window, "done", "生成脚本功能已暂停，请先测试设备列表。");

                // var ids = JsonSerializer.Deserialize<List<string>>(data.GetProperty("ids").GetRawText()) ?? new List<string>();

                // var paths = window.ShowSaveFile("保存脚本", "AudioSwitch.exe", new[] { ("Application", new[] { "exe" }) });

                // if (paths != null && paths.Length > 0)
                // {
                //     string savePath = paths.First();
                //     GenerateExe(savePath, ids);
                //     Reply(window, "done", savePath);
                // }
            }
            else if (action == "debug_log")
            {
                string errorMessage = data.GetProperty("message").GetString() ?? "Unknown JS Error";
                Console.WriteLine($"\n=======================================================");
                Console.WriteLine($"!!! DEBUG LOG (来自 JavaScript) !!!");
                Console.WriteLine($"!!! 错误内容: {errorMessage}");
                Console.WriteLine($"=======================================================\n");
            }
        }
        catch (Exception ex)
        {
            Reply(window, "err", ex.Message);
        }
    }

    // 保持不变，但不会被调用
    static void GenerateExe(string targetPath, List<string> ids)
    {
        // ...
    }

    static void Reply(PhotinoWindow w, string type, object payload)
    {
        // ...
    }
}
