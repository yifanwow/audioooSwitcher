# audioooSwitcher

audioooSwitcher is a lightweight Windows utility designed to help users seamlessly switch between multiple audio output devices. It provides a C# backend for device enumeration and script generation, paired with a JavaScript-based UI for easy device selection and script export.

This tool is ideal for users who frequently switch between speakers, headphones, Bluetooth devices, or other Windows audio outputs, and want a quick and automated workflow.

---

## ✨ Features

- **Automatic Device Detection**  
  Scans and lists all available audio output devices (Windows sound output).

- **Multi-Device Selection**  
  Select one or multiple output devices (1 to n).

- **Script Generation**  
  When two or more devices are selected, the **Generate Script** button becomes available.

- **Export Executable Script (.exe)**  
  Users can choose the save directory and filename.  
  The generated script cycles through selected audio outputs in order each time it is executed.

  Example:  
  Run 1 → Speaker  
  Run 2 → Headset  
  Run 3 → Speaker → …

- **Clean UI**  
  Simple and intuitive UI built with JavaScript + your preferred frontend framework.

---

## 🖼️ Screenshots (placeholder)

---

## 🧱 Tech Stack

### Backend (C# / .NET)

- Enumerates audio endpoint devices
- Generates the executable switching script
- Handles device-persistence logic
- Uses Windows CoreAudio (MMDevice API)

### Frontend (JavaScript)

- UI rendering
- Device list display
- User selections
- Triggering file save dialogs
- Communicates with backend via HTTP, IPC, or embedded process

### Platform

- Windows 10/11
- Visual Studio Code development environment
