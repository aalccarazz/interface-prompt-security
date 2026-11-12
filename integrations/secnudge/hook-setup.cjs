const fs = require('node:fs');
const path = require('node:path');
const {createHash,randomBytes} = require('node:crypto');
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const digest = data => createHash('sha256').update(data).digest('hex');
function command(project, nodePath = process.execPath) {
  return `${quote(nodePath)} ${quote(path.resolve(project,'.claude/secnudge/hook.cjs'))}`;
}
function readSettings(project) {
  const folder = path.resolve(project);
  if (!fs.statSync(folder).isDirectory()) throw new Error('Choose an existing project folder.');
  const file = path.join(folder,'.claude/settings.local.json');
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error('Hook setup does not modify symlinked settings. Configure this project manually.');
  const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : {};
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Expected a settings object. Nothing changed.');
  if (settings.hooks !== undefined && (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks))) throw new Error('Expected a hooks object. Nothing changed.');
  const hooks = settings.hooks || {};
  const entries = hooks.UserPromptSubmit === undefined ? [] : hooks.UserPromptSubmit;
  if (!Array.isArray(entries) || entries.some(e=>!e || !Array.isArray(e.hooks) || e.hooks.some(h=>!h || typeof h !== 'object'))) throw new Error('Unexpected UserPromptSubmit settings. Nothing changed.');
  return {folder,file,settings,hooks,entries};
}
function metadata(folder) {
  const runtime = path.join(folder,'.claude/secnudge');
  if (!fs.existsSync(runtime)) return null;
  if (fs.lstatSync(runtime).isSymbolicLink()) throw new Error('SecNudge runtime folder is a symlink. Nothing changed.');
  let info;
  try { info=JSON.parse(fs.readFileSync(path.join(runtime,'installed.json'),'utf8')); } catch { throw new Error('The .claude/secnudge folder is not managed by this installer. Nothing changed.'); }
  if (info.owner !== 'secnudge-demo' || info.format !== 1 || typeof info.command !== 'string' || !info.hashes) throw new Error('Unrecognized SecNudge installation. Nothing changed.');
  return {runtime,info};
}
function status(project) {
  const state = readSettings(project), saved = metadata(state.folder);
  const configured = Boolean(saved && state.entries.some(e=>e.hooks.some(h=>h.command===saved.info.command)));
  return {configured, disabledAllHooks:state.settings.disableAllHooks===true, runtime:saved?.runtime || null, nodePath:saved?.info.nodePath || null};
}
function configure(action, project, {nodePath=process.execPath,sourceDir=__dirname}={}) {
  if (!['enable','disable'].includes(action)) throw new Error('Choose enable or disable.');
  if (process.platform === 'win32') throw new Error('Automatic hook setup currently supports macOS and Linux.');
  const {folder,file,settings,hooks,entries}=readSettings(project);
  if (fs.existsSync(path.join(folder,'.claude')) && fs.lstatSync(path.join(folder,'.claude')).isSymbolicLink()) throw new Error('Hook setup does not modify a symlinked .claude directory.');
  const saved=metadata(folder), oldCommand=saved?.info.command;
  const ownCommand=command(folder,nodePath);
  // Also recognize the previous manual installer when upgrading this same source copy.
  const legacyCommand=`${quote(nodePath)} ${quote(path.join(sourceDir,'hook.cjs'))}`;
  const owned=h=>Boolean(oldCommand && h.command===oldCommand) || h.command===legacyCommand;
  const already=entries.some(e=>e.hooks.some(owned));
  if (action==='disable' && !already) return false;
  if (action==='enable' && settings.disableAllHooks===true) throw new Error('This project has disableAllHooks enabled. Review that setting before enabling SecNudge.');
  let runtimeChanged=false;
  if (action==='enable') {
    const runtime=path.join(folder,'.claude/secnudge');
    const files=['hook.cjs','analyzer.cjs'];
    if (saved) for (const name of files) {
      const target=path.join(runtime,name);
      if (!fs.existsSync(target) || fs.lstatSync(target).isSymbolicLink() || digest(fs.readFileSync(target))!==saved.info.hashes[name]) throw new Error('Managed SecNudge files were edited or are missing. Preserve your edits and configure this project manually.');
    }
    const contents=files.map(name=>[name,fs.readFileSync(path.join(sourceDir,name))]);
    const hashes=Object.fromEntries(contents.map(([name,data])=>[name,digest(data)]));
    runtimeChanged=!saved || saved.info.command!==ownCommand || files.some(name=>hashes[name]!==saved.info.hashes[name]);
    if (runtimeChanged) {
      fs.mkdirSync(runtime,{recursive:true});
      for (const [name,data] of contents) fs.writeFileSync(path.join(runtime,name),data,{mode:0o600});
      fs.writeFileSync(path.join(runtime,'installed.json'),JSON.stringify({owner:'secnudge-demo',format:1,command:ownCommand,nodePath,hashes},null,2)+'\n',{mode:0o600});
    }
    if (already && oldCommand===ownCommand && entries.flatMap(e=>e.hooks).filter(owned).length===1) return runtimeChanged;
  }
  const retained=entries.flatMap(e=>{
    if(!e.hooks.some(owned)) return [e];
    const remaining=e.hooks.filter(h=>!owned(h));
    return remaining.length?[{...e,hooks:remaining}]:[];
  });
  if (action==='enable') retained.push({hooks:[{type:'command',command:ownCommand,timeout:5}]});
  if (retained.length) hooks.UserPromptSubmit=retained; else delete hooks.UserPromptSubmit;
  settings.hooks=hooks;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if (fs.existsSync(file)) fs.copyFileSync(file,file+'.secnudge-backup');
  const temporary=file+'.secnudge-'+randomBytes(6).toString('hex');
  try {fs.writeFileSync(temporary,JSON.stringify(settings,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temporary,file);}
  finally {if(fs.existsSync(temporary)) fs.unlinkSync(temporary);}
  return true;
}
module.exports={configure,status,command};
