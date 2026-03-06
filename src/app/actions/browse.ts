"use server";

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Folder Picker ────────────────────────────────────────────────────────────

interface BrowseResult {
  path: string | null;
  cancelled: boolean;
}

/**
 * Opens the native OS folder picker and returns the selected path.
 * Windows: modern OpenFolderDialog via pwsh (.NET 8+)
 * macOS: osascript choose folder
 * Linux: zenity / kdialog
 */
export async function openFolderPicker(): Promise<BrowseResult> {
  const platform = os.platform();

  try {
    let selectedPath = "";

    if (platform === "win32") {
      selectedPath = openWindowsModernDialog();
    } else if (platform === "darwin") {
      selectedPath = execSync(
        `osascript -e 'POSIX path of (choose folder with prompt "Select project folder")'`,
        { encoding: "utf-8", timeout: 120000 },
      ).trim();
    } else {
      selectedPath = execSync(
        "zenity --file-selection --directory --title='Select project folder' 2>/dev/null || kdialog --getexistingdirectory ~ 2>/dev/null",
        { encoding: "utf-8", timeout: 120000 },
      ).trim();
    }

    if (!selectedPath) {
      return { path: null, cancelled: true };
    }

    return { path: selectedPath, cancelled: false };
  } catch {
    return { path: null, cancelled: true };
  }
}

/**
 * Opens the Windows 11 modern folder dialog via pwsh + OpenFolderDialog.
 * Falls back to legacy FolderBrowserDialog if pwsh is unavailable.
 */
function openWindowsModernDialog(): string {
  // Write a temp .ps1 script to avoid quote-escaping issues with child_process
  const script = `
Add-Type -AssemblyName PresentationFramework
$d = [Microsoft.Win32.OpenFolderDialog]::new()
$d.Title = "Select project folder"
$d.Multiselect = $false
if ($d.ShowDialog()) { Write-Output $d.FolderName }
`.trim();

  const tmpScript = path.join(os.tmpdir(), `agentic-browse-${Date.now()}.ps1`);

  try {
    fs.writeFileSync(tmpScript, script, "utf-8");

    // Try pwsh (PowerShell 7 / .NET 8+) for the modern Windows 11 dialog
    try {
      return execSync(`pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmpScript}"`, {
        encoding: "utf-8",
        timeout: 120000,
      }).trim();
    } catch {
      // pwsh unavailable — fall back to Windows PowerShell + legacy dialog
    }

    const legacyScript = `
Add-Type -AssemblyName System.Windows.Forms
$d = [System.Windows.Forms.FolderBrowserDialog]::new()
$d.Description = "Select project folder"
if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }
`.trim();

    fs.writeFileSync(tmpScript, legacyScript, "utf-8");
    return execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`, {
      encoding: "utf-8",
      timeout: 120000,
    }).trim();
  } finally {
    try { fs.unlinkSync(tmpScript); } catch { /* ignore cleanup errors */ }
  }
}

// ─── Path Validation ──────────────────────────────────────────────────────────

interface PathValidation {
  exists: boolean;
  isDirectory: boolean;
  projectType: string | null;
  isEmpty: boolean;
  detectedFiles: string[];
}

const PROJECT_MARKERS: Record<string, string> = {
  "package.json": "Node.js",
  "tsconfig.json": "TypeScript",
  "next.config.ts": "Next.js",
  "next.config.js": "Next.js",
  "next.config.mjs": "Next.js",
  "angular.json": "Angular",
  "vue.config.js": "Vue",
  "nuxt.config.ts": "Nuxt",
  "svelte.config.js": "SvelteKit",
  "astro.config.mjs": "Astro",
  "vite.config.ts": "Vite",
  "*.csproj": ".NET",
  "*.sln": ".NET Solution",
  "requirements.txt": "Python",
  "pyproject.toml": "Python",
  "setup.py": "Python",
  "go.mod": "Go",
  "Cargo.toml": "Rust",
  "pom.xml": "Java (Maven)",
  "build.gradle": "Java (Gradle)",
  "build.gradle.kts": "Kotlin (Gradle)",
  "Gemfile": "Ruby",
  "composer.json": "PHP",
  "mix.exs": "Elixir",
  "Package.swift": "Swift",
};

/**
 * Validates a path and detects the project type.
 * Called in real-time as the user types.
 */
export async function validatePath(dirPath: string): Promise<PathValidation> {
  const trimmed = dirPath.trim();

  if (!trimmed) {
    return { exists: false, isDirectory: false, projectType: null, isEmpty: true, detectedFiles: [] };
  }

  try {
    const stat = fs.statSync(trimmed);
    if (!stat.isDirectory()) {
      return { exists: true, isDirectory: false, projectType: null, isEmpty: false, detectedFiles: [] };
    }

    const entries = fs.readdirSync(trimmed);
    const isEmpty = entries.length === 0;

    // Detect project type from marker files
    let projectType: string | null = null;
    const detectedFiles: string[] = [];

    for (const [marker, type] of Object.entries(PROJECT_MARKERS)) {
      if (marker.startsWith("*")) {
        // Glob pattern: check extension
        const ext = marker.slice(1);
        const match = entries.find((e) => e.endsWith(ext));
        if (match) {
          projectType = type;
          detectedFiles.push(match);
        }
      } else if (entries.includes(marker)) {
        // Override with more specific type (Next.js over Node.js, etc.)
        if (!projectType || type.length > projectType.length) {
          projectType = type;
        }
        detectedFiles.push(marker);
      }
    }

    return { exists: true, isDirectory: true, projectType, isEmpty, detectedFiles };
  } catch {
    return { exists: false, isDirectory: false, projectType: null, isEmpty: false, detectedFiles: [] };
  }
}
