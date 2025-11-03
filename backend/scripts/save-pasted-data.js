import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script will save the pasted TSV data
// Usage: node save-pasted-data.js < paste_data.txt > data/requests-data.tsv

const dataPath = path.join(__dirname, '../../data/requests-data.tsv');

// Read from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  fs.writeFileSync(dataPath, input, 'utf-8');
  const lines = input.split('\n').filter(l => l.trim());
  console.log(`✅ Saved ${lines.length} lines to ${dataPath}`);
  console.log(`   Expected ${lines.length - 1} data rows (plus header)`);
});

