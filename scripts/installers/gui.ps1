# Vencord Fork GUI Installer for Windows
# Uses standard Windows Forms (built into Windows 7/8/10/11 PowerShell)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

# Determine root and binary directories
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $scriptDir "dist\patcher.js")) {
    $rootDir = $scriptDir
} elseif (Test-Path (Join-Path (Split-Path -Parent $scriptDir) "dist\patcher.js")) {
    $rootDir = Split-Path -Parent $scriptDir
} else {
    $rootDir = $scriptDir
}

$distDir = Join-Path $rootDir "dist"

# Find installer executable
$installerExe = $null
$candidatePaths = @(
    (Join-Path $scriptDir "VencordInstallerCli.exe"),
    (Join-Path $scriptDir "bin\VencordInstallerCli.exe"),
    (Join-Path $rootDir "bin\VencordInstallerCli.exe"),
    (Join-Path $rootDir "VencordInstallerCli.exe")
)
foreach ($cand in $candidatePaths) {
    if (Test-Path $cand) {
        $installerExe = $cand
        break
    }
}

# Create main form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Vencord Installer"
$form.Size = New-Object System.Drawing.Size(590, 640)
$form.MinimumSize = New-Object System.Drawing.Size(590, 640)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(49, 51, 56) # Discord Dark #313338
$form.ForeColor = [System.Drawing.Color]::FromArgb(242, 243, 245)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)

# Header Banner
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.Size = New-Object System.Drawing.Size(590, 75)
$headerPanel.BackColor = [System.Drawing.Color]::FromArgb(35, 36, 40)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "Vencord Installer"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::White
$lblTitle.Location = New-Object System.Drawing.Point(20, 10)
$lblTitle.AutoSize = $true
$headerPanel.Controls.Add($lblTitle)

$lblSubtitle = New-Object System.Windows.Forms.Label
$lblSubtitle.Text = "Custom Vencord fork with extended plugins and enhancements"
$lblSubtitle.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblSubtitle.ForeColor = [System.Drawing.Color]::FromArgb(181, 186, 193)
$lblSubtitle.Location = New-Object System.Drawing.Point(22, 44)
$lblSubtitle.AutoSize = $true
$headerPanel.Controls.Add($lblSubtitle)
$form.Controls.Add($headerPanel)

# Discord Branch Section
$gbBranch = New-Object System.Windows.Forms.GroupBox
$gbBranch.Text = "  Discord Installation  "
$gbBranch.Location = New-Object System.Drawing.Point(20, 85)
$gbBranch.Size = New-Object System.Drawing.Size(535, 118)
$gbBranch.ForeColor = [System.Drawing.Color]::FromArgb(181, 186, 193)
$gbBranch.BackColor = [System.Drawing.Color]::FromArgb(43, 45, 49)

$rbStable = New-Object System.Windows.Forms.RadioButton
$rbStable.Text = "Discord (Stable)"
$rbStable.Location = New-Object System.Drawing.Point(20, 25)
$rbStable.AutoSize = $true
$rbStable.ForeColor = [System.Drawing.Color]::FromArgb(242, 243, 245)
$rbStable.Checked = $true

$rbPtb = New-Object System.Windows.Forms.RadioButton
$rbPtb.Text = "Discord PTB"
$rbPtb.Location = New-Object System.Drawing.Point(175, 25)
$rbPtb.AutoSize = $true
$rbPtb.ForeColor = [System.Drawing.Color]::FromArgb(242, 243, 245)

$rbCanary = New-Object System.Windows.Forms.RadioButton
$rbCanary.Text = "Discord Canary"
$rbCanary.Location = New-Object System.Drawing.Point(315, 25)
$rbCanary.AutoSize = $true
$rbCanary.ForeColor = [System.Drawing.Color]::FromArgb(242, 243, 245)

$rbCustom = New-Object System.Windows.Forms.RadioButton
$rbCustom.Text = "Custom Directory:"
$rbCustom.Location = New-Object System.Drawing.Point(20, 56)
$rbCustom.AutoSize = $true
$rbCustom.ForeColor = [System.Drawing.Color]::FromArgb(242, 243, 245)

$txtCustom = New-Object System.Windows.Forms.TextBox
$txtCustom.Location = New-Object System.Drawing.Point(20, 81)
$txtCustom.Size = New-Object System.Drawing.Size(405, 24)
$txtCustom.BackColor = [System.Drawing.Color]::FromArgb(30, 31, 34)
$txtCustom.ForeColor = [System.Drawing.Color]::FromArgb(219, 222, 225)
$txtCustom.BorderStyle = "FixedSingle"
$txtCustom.Enabled = $false

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = "Browse..."
$btnBrowse.Location = New-Object System.Drawing.Point(435, 80)
$btnBrowse.Size = New-Object System.Drawing.Size(85, 26)
$btnBrowse.BackColor = [System.Drawing.Color]::FromArgb(78, 80, 88)
$btnBrowse.ForeColor = [System.Drawing.Color]::White
$btnBrowse.FlatStyle = "Flat"
$btnBrowse.FlatAppearance.BorderSize = 0
$btnBrowse.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnBrowse.Enabled = $false

$rbCustom.Add_CheckedChanged({
    $txtCustom.Enabled = $rbCustom.Checked
    $btnBrowse.Enabled = $rbCustom.Checked
})

$btnBrowse.Add_Click({
    $fbd = New-Object System.Windows.Forms.FolderBrowserDialog
    $fbd.Description = "Select Discord Directory"
    if ($fbd.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $txtCustom.Text = $fbd.SelectedPath
    }
})

$gbBranch.Controls.AddRange(@($rbStable, $rbPtb, $rbCanary, $rbCustom, $txtCustom, $btnBrowse))
$form.Controls.Add($gbBranch)

# Options Section
$chkRestart = New-Object System.Windows.Forms.CheckBox
$chkRestart.Text = "Automatically close and restart Discord"
$chkRestart.Location = New-Object System.Drawing.Point(25, 212)
$chkRestart.AutoSize = $true
$chkRestart.Checked = $true
$chkRestart.ForeColor = [System.Drawing.Color]::FromArgb(219, 222, 225)
$form.Controls.Add($chkRestart)

$chkOpenAsar = New-Object System.Windows.Forms.CheckBox
$chkOpenAsar.Text = "Install OpenAsar"
$chkOpenAsar.Location = New-Object System.Drawing.Point(340, 212)
$chkOpenAsar.AutoSize = $true
$chkOpenAsar.Checked = $false
$chkOpenAsar.ForeColor = [System.Drawing.Color]::FromArgb(219, 222, 225)
$form.Controls.Add($chkOpenAsar)

# Action Buttons
$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "Install"
$btnInstall.Location = New-Object System.Drawing.Point(20, 246)
$btnInstall.Size = New-Object System.Drawing.Size(165, 38)
$btnInstall.BackColor = [System.Drawing.Color]::FromArgb(88, 101, 242) # Blurple #5865F2
$btnInstall.ForeColor = [System.Drawing.Color]::White
$btnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$btnInstall.FlatStyle = "Flat"
$btnInstall.FlatAppearance.BorderSize = 0
$btnInstall.Cursor = [System.Windows.Forms.Cursors]::Hand

$btnRepair = New-Object System.Windows.Forms.Button
$btnRepair.Text = "Reinstall / Repair"
$btnRepair.Location = New-Object System.Drawing.Point(205, 246)
$btnRepair.Size = New-Object System.Drawing.Size(165, 38)
$btnRepair.BackColor = [System.Drawing.Color]::FromArgb(78, 80, 88)
$btnRepair.ForeColor = [System.Drawing.Color]::White
$btnRepair.Font = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$btnRepair.FlatStyle = "Flat"
$btnRepair.FlatAppearance.BorderSize = 0
$btnRepair.Cursor = [System.Windows.Forms.Cursors]::Hand

$btnUninstall = New-Object System.Windows.Forms.Button
$btnUninstall.Text = "Uninstall"
$btnUninstall.Location = New-Object System.Drawing.Point(390, 246)
$btnUninstall.Size = New-Object System.Drawing.Size(165, 38)
$btnUninstall.BackColor = [System.Drawing.Color]::FromArgb(218, 55, 60) # Red #DA373C
$btnUninstall.ForeColor = [System.Drawing.Color]::White
$btnUninstall.Font = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$btnUninstall.FlatStyle = "Flat"
$btnUninstall.FlatAppearance.BorderSize = 0
$btnUninstall.Cursor = [System.Windows.Forms.Cursors]::Hand

$form.Controls.AddRange(@($btnInstall, $btnRepair, $btnUninstall))

# Log Box Section
$lblLog = New-Object System.Windows.Forms.Label
$lblLog.Text = "Log:"
$lblLog.Location = New-Object System.Drawing.Point(20, 296)
$lblLog.AutoSize = $true
$lblLog.ForeColor = [System.Drawing.Color]::FromArgb(181, 186, 193)
$form.Controls.Add($lblLog)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location = New-Object System.Drawing.Point(20, 318)
$txtLog.Size = New-Object System.Drawing.Size(535, 215)
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(30, 31, 34)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(219, 222, 225)
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$txtLog.BorderStyle = "FixedSingle"
$form.Controls.Add($txtLog)

# Bottom Status and Exit
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Ready"
$lblStatus.Location = New-Object System.Drawing.Point(20, 550)
$lblStatus.Size = New-Object System.Drawing.Size(420, 26)
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(35, 165, 90) # Green #23A55A
$lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblStatus)

$btnExit = New-Object System.Windows.Forms.Button
$btnExit.Text = "Exit"
$btnExit.Location = New-Object System.Drawing.Point(455, 546)
$btnExit.Size = New-Object System.Drawing.Size(100, 32)
$btnExit.BackColor = [System.Drawing.Color]::FromArgb(56, 58, 64)
$btnExit.ForeColor = [System.Drawing.Color]::White
$btnExit.FlatStyle = "Flat"
$btnExit.FlatAppearance.BorderSize = 0
$btnExit.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnExit.Add_Click({ $form.Close() })
$form.Controls.Add($btnExit)

function Write-Log {
    param([string]$Message)
    $txtLog.AppendText($Message + [Environment]::NewLine)
    $txtLog.SelectionStart = $txtLog.Text.Length
    $txtLog.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

Write-Log "Bundled build: $distDir"
if (-not (Test-Path (Join-Path $distDir "patcher.js"))) {
    Write-Log "[WARNING] Could not verify dist folder. Make sure to extract the archive fully."
}
if (-not $installerExe) {
    Write-Log "[ERROR] VencordInstallerCli.exe was not found in bin folder."
} else {
    Write-Log "Installer engine: $installerExe"
}

function Execute-InstallerOperation {
    param(
        [string]$OperationName,
        [string]$ActionFlag
    )

    if (-not $installerExe -or -not (Test-Path $installerExe)) {
        [System.Windows.Forms.MessageBox]::Show(
            "VencordInstallerCli.exe could not be found. Please ensure all archive files are extracted.",
            "Installer Missing",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
        return
    }

    # Disable buttons
    $btnInstall.Enabled = $false
    $btnRepair.Enabled = $false
    $btnUninstall.Enabled = $false
    $gbBranch.Enabled = $false
    $chkRestart.Enabled = $false
    $chkOpenAsar.Enabled = $false

    $lblStatus.Text = "$OperationName in progress..."
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(254, 231, 92) # Yellow
    Write-Log "`n========================================"
    Write-Log "$OperationName started at $(Get-Date -Format 'HH:mm:ss')"

    # Determine branch and process details
    $branch = "stable"
    $discordProcess = "Discord"
    $discordFolder = "Discord"
    $customLocation = $null

    if ($rbPtb.Checked) {
        $branch = "ptb"
        $discordProcess = "DiscordPTB"
        $discordFolder = "DiscordPTB"
    } elseif ($rbCanary.Checked) {
        $branch = "canary"
        $discordProcess = "DiscordCanary"
        $discordFolder = "DiscordCanary"
    } elseif ($rbCustom.Checked) {
        $customLocation = $txtCustom.Text.Trim()
        if ([string]::IsNullOrWhiteSpace($customLocation)) {
            Write-Log "[ERROR] Custom location cannot be empty."
            $lblStatus.Text = "Custom location required"
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(218, 55, 60)
            $btnInstall.Enabled = $true
            $btnRepair.Enabled = $true
            $btnUninstall.Enabled = $true
            $gbBranch.Enabled = $true
            $chkRestart.Enabled = $true
            $chkOpenAsar.Enabled = $true
            return
        }
    }

    # Close Discord if running
    if (-not $customLocation) {
        $running = Get-Process -Name $discordProcess -ErrorAction SilentlyContinue
        if ($running) {
            Write-Log "Closing $discordProcess..."
            Stop-Process -Name $discordProcess -Force -ErrorAction SilentlyContinue
            $attempts = 0
            while ((Get-Process -Name $discordProcess -ErrorAction SilentlyContinue) -and ($attempts -lt 10)) {
                Start-Sleep -Seconds 1
                $attempts++
                [System.Windows.Forms.Application]::DoEvents()
            }
            if (Get-Process -Name $discordProcess -ErrorAction SilentlyContinue) {
                Write-Log "[WARNING] Could not terminate $discordProcess. Please quit Discord from the system tray and try again."
                $lblStatus.Text = "Discord still running"
                $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(218, 55, 60)
                $btnInstall.Enabled = $true
                $btnRepair.Enabled = $true
                $btnUninstall.Enabled = $true
                $gbBranch.Enabled = $true
                $chkRestart.Enabled = $true
                $chkOpenAsar.Enabled = $true
                return
            }
        }
    }

    # Prepare CLI arguments
    $argsList = New-Object System.Collections.Generic.List[string]
    $argsList.Add($ActionFlag)

    if ($customLocation) {
        $argsList.Add("-location")
        $argsList.Add("`"$customLocation`"")
    } else {
        $argsList.Add("-branch")
        $argsList.Add($branch)
    }

    if ($chkOpenAsar.Checked) {
        if ($ActionFlag -eq "-uninstall") {
            $argsList.Add("-uninstall-openasar")
        } else {
            $argsList.Add("-install-openasar")
        }
    }

    Write-Log "Executing: $installerExe $($argsList -join ' ')"

    # Set environment variables for bundled build
    $env:VENCORD_USER_DATA_DIR = $rootDir
    $env:VENCORD_DEV_INSTALL = "1"

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $installerExe
    $psi.Arguments = $argsList -join " "
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi

    try {
        $proc.Start() | Out-Null
        while (-not $proc.HasExited) {
            while (-not $proc.StandardOutput.EndOfStream) {
                $line = $proc.StandardOutput.ReadLine()
                Write-Log $line
            }
            while (-not $proc.StandardError.EndOfStream) {
                $line = $proc.StandardError.ReadLine()
                Write-Log $line
            }
            Start-Sleep -Milliseconds 50
            [System.Windows.Forms.Application]::DoEvents()
        }
        $remOut = $proc.StandardOutput.ReadToEnd()
        if ($remOut) { Write-Log $remOut }
        $remErr = $proc.StandardError.ReadToEnd()
        if ($remErr) { Write-Log $remErr }
        $exitCode = $proc.ExitCode
    } catch {
        Write-Log "[ERROR] Execution exception: $_"
        $exitCode = 1
    }

    if ($exitCode -eq 0) {
        Write-Log "----------------------------------------"
        Write-Log "$OperationName completed successfully!"
        $lblStatus.Text = "$OperationName succeeded!"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(35, 165, 90)

        # Restart Discord if requested
        if ($chkRestart.Checked -and ($ActionFlag -ne "-uninstall") -and (-not $customLocation)) {
            $updateExe = Join-Path $env:LOCALAPPDATA (Join-Path $discordFolder "Update.exe")
            if (Test-Path $updateExe) {
                Write-Log "Restarting $discordProcess..."
                Start-Process -FilePath $updateExe -ArgumentList "--processStart $($discordProcess).exe"
                Write-Log "Started $discordProcess."
            } else {
                Write-Log "Discord Update.exe not found at $updateExe. Please launch Discord from the Start menu."
            }
        }
    } else {
        Write-Log "----------------------------------------"
        Write-Log "$OperationName failed with exit code $exitCode."
        $lblStatus.Text = "$OperationName failed (Exit code $exitCode)"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(218, 55, 60)
    }

    # Re-enable controls
    $btnInstall.Enabled = $true
    $btnRepair.Enabled = $true
    $btnUninstall.Enabled = $true
    $gbBranch.Enabled = $true
    $chkRestart.Enabled = $true
    $chkOpenAsar.Enabled = $true
}

$btnInstall.Add_Click({ Execute-InstallerOperation "Install" "-install" })
$btnRepair.Add_Click({ Execute-InstallerOperation "Reinstall" "-install" })
$btnUninstall.Add_Click({ Execute-InstallerOperation "Uninstall" "-uninstall" })

[void]$form.ShowDialog()
