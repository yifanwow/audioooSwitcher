using AudioSwitcher.AudioApi.CoreAudio;
using System.IO.Pipes;
using System.Text.Json;

namespace AudioSwitcher.Backend
{
    public class BackendPipeServer
    {
        // Named Pipe 名称，必须与前端客户端匹配
        private const string PipeName = "AudioSwitcherPipe";
        private readonly CoreAudioController _audioController = new CoreAudioController();

        public async Task StartListening()
        {
            Console.WriteLine(
                "C# Audio Backend Server started. Waiting for Electron connection..."
            );
            // 【新日志】发出就绪信号，便于 Electron 确认启动成功
            Console.WriteLine($"Pipe '{PipeName}' is ready.");

            // 持续循环，接受新的客户端连接
            while (true)
            {
                // 创建命名管道服务器
                using (
                    var pipeServer = new NamedPipeServerStream(
                        PipeName,
                        PipeDirection.InOut,
                        1, // 最大实例数
                        PipeTransmissionMode.Message,
                        PipeOptions.Asynchronous
                    )
                )
                {
                    try
                    {
                        // 等待客户端连接
                        await pipeServer.WaitForConnectionAsync();
                        Console.WriteLine("Client connected.");

                        using (var reader = new StreamReader(pipeServer))
                        using (var writer = new StreamWriter(pipeServer) { AutoFlush = true })
                        {
                            string message;
                            // 持续读取客户端发送的消息
                            while ((message = await reader.ReadLineAsync()) != null)
                            {
                                Console.WriteLine($"Received: {message}");
                                string response = await ProcessMessageAsync(message);

                                // 【新日志】打印响应摘要
                                Console.WriteLine(
                                    $"Sending response: {response.Length} bytes, content summary: {response.Substring(0, Math.Min(response.Length, 80))}..."
                                );

                                await writer.WriteLineAsync(response);
                                // 必须关闭管道以完成事务，允许前端读取数据并断开连接
                                pipeServer.Close();
                                break; // 处理完一次请求后退出内部循环，等待下一个连接
                            }
                        }
                    }
                    catch (IOException)
                    {
                        Console.WriteLine("Client disconnected or pipe closed.");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error in pipe communication: {ex.Message}");
                    }
                }
            }
        }

        // --- 核心业务逻辑：处理前端发来的请求 ---
        private async Task<string> ProcessMessageAsync(string message)
        {
            // 简单 JSON 格式的响应结构
            var response = new
            {
                success = false,
                data = (object)null,
                error = (string)null
            };

            try
            {
                var command = JsonDocument.Parse(message).RootElement;
                string action = command.GetProperty("action").GetString();

                // 【新日志】打印正在处理的 action
                Console.WriteLine($"Processing action: {action}");

                if (action == "getDevices")
                {
                    // 1. 获取设备列表
                    // 【新日志】标记异步操作开始
                    Console.WriteLine("Starting GetDevicesAsync...");

                    var devices = (
                        await _audioController.GetDevicesAsync(
                            AudioSwitcher.AudioApi.DeviceState.Active
                        )
                    )
                        .Where(d => d.DeviceType == AudioSwitcher.AudioApi.DeviceType.Playback)
                        .Select(d => new { id = d.Id.ToString(), name = d.FullName })
                        .ToList();

                    // 【新日志】标记异步操作完成，并打印找到的设备数量
                    Console.WriteLine($"GetDevicesAsync completed. Found {devices.Count} devices.");

                    response = new
                    {
                        success = true,
                        data = (object)devices,
                        error = (string)null
                    };
                }
                else
                {
                    response = new
                    {
                        success = false,
                        data = (object)null,
                        error = $"Unknown action: {action}"
                    };
                }
            }
            catch (Exception ex)
            {
                // 【新日志】打印处理业务逻辑时的异常
                Console.WriteLine($"Error processing message: {ex.Message}");
                response = new
                {
                    success = false,
                    data = (object)null,
                    error = ex.Message
                };
            }

            return JsonSerializer.Serialize(response);
        }
    }
}

// 主入口点
class Program
{
    static async Task Main(string[] args)
    {
        await new AudioSwitcher.Backend.BackendPipeServer().StartListening();
    }
}
