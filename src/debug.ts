import * as fs from 'fs';

const debugLog = fs.createWriteStream("/tmp/debug.txt");

export function debug(...args: any[]): void {
  const str = args.map(item => typeof item == 'string' ? item :
    JSON.stringify(item, null, 2)).join(' ') + '\n';
  debugLog.write(str);
}
