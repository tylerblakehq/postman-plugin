#!/usr/bin/env node
/**
 * Checks this repo is internally consistent: the generated manifest matches
 * the skill files, plugin manifests parse, and every skill has the
 * frontmatter Claude Code loads.
 *
 * GitHub Actions and Cursor Origin both invoke this as `node scripts/ci.js`.
 * Origin's `test_script` is a program plus args, not a shell, so the
 * glob-and-pipe checks that used to live in the workflow belong here.
 */
'use strict';

const fs = require('fs'),
    path = require('path'),
    { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..'),
    MANIFESTS = [
        '.claude-plugin/marketplace.json',
        '.claude-plugin/plugin.json',
        '.cursor-plugin/plugin.json',
        '.kimi-plugin/plugin.json',
        'manifest.json'
    ];

/**
 * @param {string} message - Error to print.
 */
function fail (message) {
    console.error(message);
    process.exitCode = 1;
}

const check = spawnSync(
    process.execPath,
    [path.join(__dirname, 'build-manifest.js'), '--check'],
    { cwd: ROOT, stdio: 'inherit' }
);

if (check.status !== 0) {
    process.exit(check.status === null ? 1 : check.status);
}

for (const file of MANIFESTS) {
    JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    console.log(`ok ${file}`);
}

const skillsDir = path.join(ROOT, 'skills');

for (const skill of fs.readdirSync(skillsDir).sort()) {
    if (skill.startsWith('.')) {
        continue;
    }

    const dir = path.join(skillsDir, skill);

    if (!fs.statSync(dir).isDirectory()) {
        continue;
    }

    const entry = path.join(dir, 'SKILL.md'),
        rel = path.relative(ROOT, entry);

    if (!fs.existsSync(entry)) {
        fail(`${rel}: missing SKILL.md`);
        continue;
    }

    const text = fs.readFileSync(entry, 'utf8'),
        firstLine = text.split(/\r?\n/, 1)[0];

    if (firstLine !== '---') {
        fail(`${rel}: missing YAML frontmatter`);
    }

    if (!/^name:/m.test(text)) {
        fail(`${rel}: frontmatter has no name`);
    }

    if (!/^description:/m.test(text)) {
        fail(`${rel}: frontmatter has no description`);
    }
}

if (process.exitCode) {
    process.exit(process.exitCode);
}

console.log('ci checks passed.');
