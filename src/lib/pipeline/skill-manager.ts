import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import type { AgentRole, SkillDefinition, SkillSource } from "@/lib/types";
import { SKILL_SOURCES } from "@/lib/types";

// ─── Frontmatter parser ───────────────────────────────────────────────────────

interface SkillFrontmatter {
  name?: string;
  description?: string;
}

function parseFrontmatter(content: string): SkillFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: SkillFrontmatter = {};

  for (const line of yaml.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "name") result.name = value;
    if (key === "description") result.description = value;
  }

  return result;
}

// ─── Skill file scanner ───────────────────────────────────────────────────────

function buildSkillDefinition(
  filePath: string,
  source: SkillSource
): SkillDefinition {
  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatter = parseFrontmatter(content);
  const basename = path.basename(filePath, path.extname(filePath));

  return {
    id: basename,
    name: frontmatter.name ?? basename,
    description: frontmatter.description ?? "",
    filePath,
    enabled: true,
    assignedAgents: [],
    source,
  };
}

export function scanSkillDirectory(dirPath: string): SkillDefinition[] {
  if (!fs.existsSync(dirPath)) return [];

  const results: SkillDefinition[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(buildSkillDefinition(fullPath, SKILL_SOURCES.LOCAL));
    } else if (entry.isDirectory()) {
      // Check for SKILL.md inside subdirectory (standard layout)
      const skillMd = path.join(fullPath, "SKILL.md");
      if (fs.existsSync(skillMd)) {
        results.push(buildSkillDefinition(skillMd, SKILL_SOURCES.LOCAL));
      }
    }
  }

  return results;
}

// ─── .skill ZIP import ────────────────────────────────────────────────────────

export async function importSkillFile(
  buffer: Buffer,
  targetDir: string
): Promise<SkillDefinition[]> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const zip = new AdmZip(buffer);
  const imported: SkillDefinition[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (!entry.entryName.endsWith(".md")) continue;

    const destPath = path.join(targetDir, path.basename(entry.entryName));
    fs.writeFileSync(destPath, entry.getData());
    imported.push(buildSkillDefinition(destPath, SKILL_SOURCES.IMPORTED));
  }

  return imported;
}

// ─── Project skill detection ──────────────────────────────────────────────────

const SKILL_SEARCH_DIRS = [
  ".github/skills",
  ".copilot/skills",
  ".agents/skills",
] as const;

export function detectProjectSkills(projectPath: string): SkillDefinition[] {
  const skills: SkillDefinition[] = [];
  const seen = new Set<string>();

  for (const relDir of SKILL_SEARCH_DIRS) {
    const absDir = path.join(projectPath, relDir);
    for (const skill of scanSkillDirectory(absDir)) {
      if (!seen.has(skill.filePath)) {
        seen.add(skill.filePath);
        skills.push(skill);
      }
    }
  }

  return skills;
}

// ─── Get skill directories for an agent ───────────────────────────────────────

export function getSkillDirectoriesForAgent(
  role: AgentRole,
  skills: SkillDefinition[]
): string[] {
  const dirs = new Set<string>();

  for (const skill of skills) {
    if (!skill.enabled) continue;
    if (skill.assignedAgents.length > 0 && !skill.assignedAgents.includes(role))
      continue;

    // The skill directory is the parent of the skill file
    dirs.add(path.dirname(skill.filePath));
  }

  return [...dirs];
}
