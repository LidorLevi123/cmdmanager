# Command Dispatcher Client Setup Guide

## 🚀 Portable Installation for Student PCs (Hidden Mode)

This is a complete portable solution that can be run from desktop, USB drive, or any location to set up hidden client polling.

## 📁 Files Needed (Portable Package)

- `start-hidden-client.vbs` - Complete hidden client (no visible windows)
- `install-startup-service.bat` - One-click portable installer
- `client-config.txt` - Configuration file
- `test-connection.bat` - Connection tester (optional)

## 🔧 Simple Installation Process

### Step 1: Configure Your Server Settings
Edit `client-config.txt` with your server details:
```
SERVER_URL=http://your-server-ip:5000
CLASS_ID=58.0.6
```

### Step 2: Run the Portable Installer
1. Place all files in any location (desktop, USB drive, etc.)
2. **Right-click** on `install-startup-service.bat`
3. Select **"Run as administrator"**
4. The installer automatically:
   - Creates `C:\CommandDispatcher\` directory
   - Copies all files from current location
   - Sets up automatic Windows startup
   - Starts the client immediately
   - Creates uninstaller and logs directory

### Step 3: Verify Installation
- Installer shows "SUCCESS: Client started and running in background"
- Check Task Manager for `wscript.exe` process
- View logs in `C:\CommandDispatcher\Logs\`

### Step 3: Verify Installation
- Check logs in: `C:\CommandDispatcher\Logs\`
- No visible windows should appear
- Client will auto-start on every boot

## 📊 What Happens

1. **On Startup**: Client automatically connects to your server
2. **Hidden Operation**: No visible command prompt windows
3. **Automatic Reconnection**: Handles network drops gracefully
4. **Detailed Logging**: All activity logged to files
5. **System Information**: Sends hostname, IP, and system specs to server

## 🔍 Monitoring

### Check if Client is Running
- Look for `wscript.exe` process in Task Manager
- Check latest log file in `C:\CommandDispatcher\Logs\`
- View connected clients in your web dashboard

### Log Files Location
```
C:\CommandDispatcher\Logs\
├── client_YYYYMMDD_HHMMSS.log  (connection logs)
└── startup.log                  (startup events)
```

## 🛠️ Troubleshooting

### Client Not Connecting
1. Check `client-config.txt` has correct server URL
2. Verify server is accessible from client PC
3. Check firewall settings
4. Review log files for error messages

### Remove Installation
Run: `C:\CommandDispatcher\uninstall.bat`

## 🔒 Security Notes

- Runs with current user privileges (not as system service)
- Only connects to your specified server
- All communication logged for audit
- No administrative rights required for operation

## 📋 Class ID Reference

Use these class IDs based on your lab setup:
- `58.0.6` - Lab A computers
- `58.1.1` - Lab B computers  
- `58.-1.23` - Office computers
- `58.0.8` - Training room
- `58.1.3` - Conference room
- `58.-1.25` - Admin workstations

## 🔄 Updates

To update client configuration:
1. Edit `C:\CommandDispatcher\client-config.txt`
2. Restart the PC or manually run:
   ```
   wscript.exe "C:\CommandDispatcher\start-hidden-client.vbs"
   ```

---

## Technical Details

### Files Created
- `C:\CommandDispatcher\` - Installation directory
- `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CommandDispatcher.vbs` - Startup link
- Registry entry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\CommandDispatcher`

### Network Requirements
- Outbound HTTP access to your server
- Default port: 5000 (configurable)
- Long-polling connections (5-minute timeout)

### System Information Sent
- Hostname (e.g., INTEL-73, INTEL-172)
- IP Address
- Current Windows user
- Class ID assignment
- Connection timestamps