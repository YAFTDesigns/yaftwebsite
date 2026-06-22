// One-off script: uploads public/assets/images/** into the Supabase
// `site-images` bucket, preserving relative paths. Run with:
//   node scripts/upload-images.mjs
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const ROOT = join(process.cwd(), 'public', 'assets', 'images');
const CONTENT_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

async function main() {
  const files = walk(ROOT);
  for (const filePath of files) {
    const objectPath = relative(ROOT, filePath).replace(/\\/g, '/');
    const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    const body = await readFile(filePath);

    const { error } = await supabase.storage
      .from('site-images')
      .upload(objectPath, body, { contentType, upsert: true });

    if (error) {
      console.error(`✗ ${objectPath}: ${error.message}`);
    } else {
      console.log(`✓ ${objectPath}`);
    }
  }
}

main();
