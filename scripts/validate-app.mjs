import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'src/main.js', 'src/styles.css'];

await Promise.all(requiredFiles.map((file) => access(file)));

const html = await readFile('index.html', 'utf8');
const js = await readFile('src/main.js', 'utf8');
const css = await readFile('src/styles.css', 'utf8');

const checks = [
  ['BuddyBill title', html.includes('<title>BuddyBill</title>')],
  ['App root', html.includes('id="root"')],
  ['Main script', html.includes('src/main.js')],
  ['Group creation', js.includes('function addGroup')],
  ['Expense creation', js.includes('function addExpense')],
  ['Receipt attachment', js.includes('receiptUpload')],
  ['Responsive styles', css.includes('@media (max-width: 680px)')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error(`Validation failed: ${failures.map(([name]) => name).join(', ')}`);
  process.exit(1);
}

console.log('BuddyBill static app validation passed.');
