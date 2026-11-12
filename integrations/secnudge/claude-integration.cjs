const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {configure,status}=require('./hook-setup.cjs');
const {example}=require('./analyzer.cjs');
const run=promisify(execFile);
async function findNode(execute=run) {
  // VS Code's process.execPath can be an Electron helper, not a standalone Node.
  for (const candidate of ['node','/opt/homebrew/bin/node','/usr/local/bin/node','/usr/bin/node']) {
    try {
      const {stdout}=await execute(candidate,['-p','JSON.stringify({path:process.execPath,major:Number(process.versions.node.split(".")[0])})'],{timeout:3000,maxBuffer:4096});
      const info=JSON.parse(stdout);
      if (info.major>=18 && typeof info.path==='string' && path.isAbsolute(info.path)) return info.path;
    } catch { /* Try the next normal installation location. */ }
  }
  throw new Error('Node.js 18 or newer is required for the Claude hook. Install Node.js, restart VS Code, then try again. The review panel works without it.');
}
async function localCheck(project,nodePath,execute=run) {
  const state=status(project);
  if (!state.configured) return 'SecNudge is not enabled in this project. Choose Enable Claude Code nudge first.';
  if (state.disabledAllHooks) return 'This project has disableAllHooks enabled. Claude Code will not run the nudge.';
  try {
    // Test the installed copy with known demo input, without calling Claude or sending a user prompt.
    const runner='const {spawnSync}=require("node:child_process");const r=spawnSync(process.execPath,[process.argv[1]],{input:JSON.stringify({prompt:process.argv[2]}),encoding:"utf8",timeout:4500});if(r.status!==0)process.exit(1);process.stdout.write(r.stdout);';
    const hook=path.join(state.runtime,'hook.cjs');
    if (!state.nodePath) throw Error('Re-enable the hook to refresh its Node path');
    nodePath=state.nodePath;
    const blocked=await execute(nodePath,['-e',runner,hook,example],{timeout:6000,maxBuffer:16384});
    const allowed=await execute(nodePath,['-e',runner,hook,example+' with a configurable maximum upload size.'],{timeout:6000,maxBuffer:16384});
    if(JSON.parse(blocked.stdout).decision!=='block' || allowed.stdout!=='') throw Error('Unexpected protocol');
    return 'Local hook test passed: the demo example blocks and the revised prompt passes. Restart Claude Code in this project, run /hooks to confirm UserPromptSubmit, then submit the example. Live Claude behavior has not been tested by this check.';
  } catch {throw new Error('The installed hook failed its local check. No prompt was sent to Claude. Check that the configured Node installation and hook files still exist.');}
}
function registerClaudeCommands(vscode,context) {
  const withProject=async action=>{
    try {
      if (vscode.workspace.isTrusted===false) throw new Error('Trust this workspace before configuring a local hook.');
      const selected=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,defaultUri:vscode.workspace.workspaceFolders?.[0]?.uri,openLabel:action==='enable'?'Enable in this project':action==='disable'?'Disable in this project':'Check this project',title:'Choose the project you will open in Claude Code'});
      if(!selected?.length) return 'Setup canceled. No settings changed.';
      if(selected[0].scheme!=='file') throw new Error('Choose a local folder on this VS Code host.');
      const project=selected[0].fsPath;
      let message;
      if(action==='enable') {
        const nodePath=await findNode();
        configure('enable',project,{nodePath});
        message='SecNudge demo enabled for this project. Restart Claude Code here and confirm UserPromptSubmit with /hooks. Submit “Build an endpoint to upload files” to see the nudge. Reworded prompts are outside this mock analysis.';
      } else if(action==='disable') {
        configure('disable',project);
        message='SecNudge hook disabled in this project. Restart Claude Code. Managed hook files remain on disk; unrelated hooks are preserved.';
      } else message=await localCheck(project,await findNode());
      vscode.window.showInformationMessage(message);return message;
    } catch(error) {
      const message=error instanceof SyntaxError?'Claude settings contain invalid JSON. Nothing changed. Repair the settings before retrying.':error.message;
      vscode.window.showErrorMessage(message);return message;
    }
  };
  for(const [action,id] of [['enable','secnudge.enableClaudeHook'],['disable','secnudge.disableClaudeHook'],['check','secnudge.checkClaudeHook']]) {
    context.subscriptions.push(vscode.commands.registerCommand(id,()=>withProject(action)));
  }
}
module.exports={registerClaudeCommands,findNode,localCheck};
