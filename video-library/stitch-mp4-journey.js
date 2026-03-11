#!/usr/bin/env node
/**
 * Stitch all MP4 clips in video-library/mp4/ into one video in order (01, 02, … 38).
 * Requires: run npm run video:webm-to-mp4 first so mp4/ has the named clips.
 * Requires ffmpeg on PATH: https://ffmpeg.org/download.html
 *
 * Output: video-library/echo-room-full-journey.mp4
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname);
const MP4_DIR = path.join(ROOT, 'mp4');
const OUTPUT_FILE = path.join(ROOT, 'echo-room-full-journey.mp4');
const CONCAT_LIST = path.join(ROOT, '.concat-list.txt');

function getMp4Files() {
  if (!fs.existsSync(MP4_DIR)) return [];
  const files = fs.readdirSync(MP4_DIR)
    .filter((n) => n.toLowerCase().endsWith('.mp4'))
    .map((n) => ({ name: n, path: path.join(MP4_DIR, n) }));
  // Sort by leading number (01-, 02-, …) then by name
  const numPrefix = (name) => {
    const m = name.match(/^(\d+)-/);
    return m ? parseInt(m[1], 10) : 999;
  };
  files.sort((a, b) => numPrefix(a.name) - numPrefix(b.name) || a.name.localeCompare(b.name));
  return files;
}

function main() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch {
    console.error('ffmpeg not found. Install it and add to PATH: https://ffmpeg.org/download.html');
    process.exit(1);
  }

  const files = getMp4Files();
  if (files.length === 0) {
    console.error('No MP4 files found in', path.relative(ROOT, MP4_DIR) || 'mp4/');
    console.error('Run: npm run video:webm-to-mp4');
    process.exit(1);
  }

  // Concat list: one line per file. Use path relative to list file so ffmpeg finds them.
  const listLines = files.map((f) => {
    const rel = path.relative(ROOT, f.path);
    const safe = rel.replace(/\\/g, '/');
    return `file '${safe}'`;
  });
  fs.writeFileSync(CONCAT_LIST, listLines.join('\n'), 'utf8');

  console.log('Stitching', files.length, 'clips in order...\n');
  files.forEach((f, i) => console.log(`  ${String(i + 1).padStart(2)} ${f.name}`));
  console.log('\n→', path.basename(OUTPUT_FILE));

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', path.basename(CONCAT_LIST),
      '-c', 'copy',
      path.basename(OUTPUT_FILE),
    ],
    { encoding: 'utf8', stdio: 'inherit', windowsHide: true, cwd: ROOT }
  );

  try {
    fs.unlinkSync(CONCAT_LIST);
  } catch (_) {}

  if (result.status !== 0) {
    console.error('Stitch failed.');
    process.exit(1);
  }

  if (fs.existsSync(OUTPUT_FILE)) {
    const stat = fs.statSync(OUTPUT_FILE);
    const mb = (stat.size / (1024 * 1024)).toFixed(1);
    console.log('\nDone.', path.basename(OUTPUT_FILE), mb, 'MB');
  }
}

main();
