const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron')
const { tr } = require('framer-motion/client')
const path = require('path')

let win
let tray

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    win = new BrowserWindow({
        width: 380,
        height: 130,
        x: width - 400,
        y: height - 150,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    if (isDev) {
        win.loadURL('http://localhost:5174')
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // Keep always on top when focus changes
    win.on('blur', () => {
        win.setAlwaysOnTop(true, 'screen-saver')
    })
}

function createTray() {
    // Create a 16x16 green circle icon programmatically
    const iconPath = path.join(__dirname, 'tray-icon.png')
    let trayIcon

    try {
        trayIcon = nativeImage.createFromPath(iconPath)
    } catch {
        // fallback: create empty image
        trayIcon = nativeImage.createEmpty()
    }

    tray = new Tray(trayIcon)

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Mini Player',
            click: () => {
                if (win) {
                    win.show()
                    win.focus()
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit()
            },
        },
    ])

    tray.setToolTip('Spotify Mini Player')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
        if (win) {
            if (win.isVisible()) {
                win.hide()
            } else {
                win.show()
                win.focus()
            }
        }
    })
}

// IPC handlers
ipcMain.handle('open-spotify', async () => {
    await shell.openExternal('https://open.spotify.com')
})

ipcMain.handle('minimize-window', () => {
    if (win) win.hide()
})

ipcMain.handle('show-window', () => {
    if (win) {
        win.show()
        win.focus()
    }
})

ipcMain.handle('open-login', async () => {
    await shell.openExternal('http://localhost:8888/login')
})

// Drag support: update window position
ipcMain.on('window-drag', (event, { deltaX, deltaY }) => {
    if (!win) return
    const [x, y] = win.getPosition()
    win.setPosition(x + deltaX, y + deltaY)
})

app.whenReady().then(() => {
    createWindow()
    createTray()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// Prevent quitting when window is hidden
app.on('before-quit', () => {
    if (tray) tray.destroy()
})
