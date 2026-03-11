#!/usr/bin/env node
/**
 * Convert all .webm files under video-library (e.g. Playwright recordings) to .mp4.
 * MP4s are written to video-library/mp4/ with names derived from the test/step title.
 * Requires ffmpeg on PATH: https://ffmpeg.org/download.html
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname);
const OUT_DIR = path.join(ROOT, 'mp4');
const EXT = '.webm';

// Test titles in spec order (participant, organiser, admin) – used to name output files
const TEST_TITLES = [
  'landing page shows Echo Room and event code form',
  'participant can enter event code and enable Continue',
  'participant submits event code and reaches profile or world',
  'profile page shows create or edit profile form',
  'participant can fill and save profile then reach world',
  'world map shows regions and welcome',
  'district page shows quest list',
  'participant can join a quest and see room lobby',
  'participant can open room play page (voting or waiting state)',
  'room lobby shows room code and team section',
  'participant me page shows rooms or empty state',
  'participant people page loads',
  'participant badges page loads',
  'organiser login page shows form',
  'back to participant link on organiser page',
  'organiser login page has email and password',
  'organiser can log in and reach dashboard',
  'dashboard shows insights and create event links',
  'create event page has form fields',
  'event detail page loads for first event',
  'insights page loads and shows event picker',
  'insights scroll through participants and rooms sections',
  'insights artifacts section and filter tabs',
  'organiser can view an artifact from insights',
  'quest edit page loads and shows quest content',
  'organiser can edit quest text (decision title)',
  'archived artifact page loads',
  'admin login page shows password field',
  'admin can log in with email and password',
  'admin dashboard shows stats and section links',
  'admin config page loads',
  'admin organisers page loads',
  'admin events page loads',
  'admin rooms page loads',
  'admin participants page loads',
  'admin retention page loads',
  'admin audit log page loads',
  'unauthenticated admin dashboard redirects to login',
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function findWebm(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findWebm(full, list);
    else if (e.name.toLowerCase().endsWith(EXT)) list.push(full);
  }
  return list;
}

// Match Playwright output folder name to a test title (folder contains a shortened slug of the title)
function matchTestTitle(folderName) {
  const folderClean = folderName.toLowerCase().replace(/[-_\s.]/g, '');
  let best = null;
  let bestLen = 0;
  for (let i = 0; i < TEST_TITLES.length; i++) {
    const slug = slugify(TEST_TITLES[i]);
    const slugClean = slug.replace(/-/g, '');
    if (slugClean.length < 6) continue;
    const contained = folderClean.includes(slugClean) || slugClean.includes(folderClean);
    const partial = slugClean.length >= 10 && folderClean.includes(slugClean.slice(0, 15));
    if ((contained || partial) && slugClean.length > bestLen) {
      best = { index: i + 1, title: TEST_TITLES[i] };
      bestLen = slugClean.length;
    }
  }
  if (best) return best;
  for (let i = 0; i < TEST_TITLES.length; i++) {
    const slug = slugify(TEST_TITLES[i]);
    const parts = slug.split('-').filter((p) => p.length > 3);
    const matchCount = parts.filter((p) => folderClean.includes(p)).length;
    if (matchCount >= Math.min(3, parts.length) && parts.length > bestLen) {
      best = { index: i + 1, title: TEST_TITLES[i] };
      bestLen = parts.length;
    }
  }
  return best;
}

function getOutputBasename(webmPath) {
  const folderName = path.basename(path.dirname(webmPath));
  const matched = matchTestTitle(folderName);
  if (matched) {
    const num = String(matched.index).padStart(2, '0');
    return `${num}-${slugify(matched.title)}`;
  }
  return slugify(folderName) || 'video';
}

function convertToMp4(webmPath) {
  const base = getOutputBasename(webmPath);
  const mp4FileName = base + '.mp4';
  const mp4Path = path.join(OUT_DIR, mp4FileName);
  if (fs.existsSync(mp4Path)) {
    console.log('Skip (MP4 exists):', mp4FileName);
    return true;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const args = [
    '-y', '-i', webmPath,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-movflags', '+faststart',
    '-an',
    mp4Path,
  ];
  const result = spawnSync('ffmpeg', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    console.error('FAIL:', path.relative(ROOT, webmPath));
    if (result.stderr) console.error(result.stderr.trim());
    if (result.stdout) console.error(result.stdout.trim());
    return false;
  }
  if (!fs.existsSync(mp4Path)) {
    console.error('FAIL: MP4 was not created:', mp4FileName);
    return false;
  }
  console.log('OK:', mp4FileName);
  return true;
}

// Check ffmpeg
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch {
  console.error('ffmpeg not found. Install it and add to PATH: https://ffmpeg.org/download.html');
  process.exit(1);
}

const files = findWebm(ROOT);
if (files.length === 0) {
  console.log('No .webm files found under', ROOT);
  process.exit(0);
}

console.log('Converting', files.length, 'file(s) ->', path.relative(ROOT, OUT_DIR) || 'mp4/', '\n');
let ok = 0;
files.forEach((f) => {
  if (convertToMp4(f)) ok++;
});
console.log('\nDone.', ok, 'MP4 file(s) in', path.relative(ROOT, OUT_DIR) || 'mp4/');
