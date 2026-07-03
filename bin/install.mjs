#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = 'fableplan';
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(pkgRoot, 'skills', SKILL);

if (!existsSync(join(src, 'SKILL.md'))) {
	console.error(`fableplan: could not find skills/${SKILL}/SKILL.md in the package.`);
	process.exit(1);
}

const project = process.argv.includes('--project');
const skillsDir = project
	? join(process.cwd(), '.claude', 'skills')
	: join(homedir(), '.claude', 'skills');
const dest = join(skillsDir, SKILL);

mkdirSync(skillsDir, { recursive: true });
cpSync(src, dest, { recursive: true });

const scope = project ? 'this project' : 'your personal skills';
console.log(`fableplan installed into ${scope}:\n  ${dest}`);
console.log('\nRestart Claude Code (or start a new session), then run:\n  /fableplan <task to plan>');
