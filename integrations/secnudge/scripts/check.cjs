const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
let count = 0;
function check(dir) {
  for (const entry of readdirSync(dir,{withFileTypes:true})) {
    const path = join(dir,entry.name);
    if (entry.isDirectory() && !['dist','node_modules'].includes(entry.name)) check(path);
    else if (/\.(cjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath,['--check',path],{stdio:'inherit'});
      if (result.status !== 0) process.exit(result.status || 1);
      count++;
    }
  }
}
check(join(__dirname,'..'));
console.log(`Syntax checks passed for ${count} scripts.`);
