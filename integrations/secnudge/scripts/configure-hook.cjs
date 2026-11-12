const {configure,status,command}=require('../hook-setup.cjs');
if (require.main===module) {
  try {
    const [action,project]=process.argv.slice(2);
    if (!project) throw new Error('Usage: node scripts/configure-hook.cjs enable|disable|status /path/to/project');
    if(action==='status') {
      const state=status(project); console.log(state.configured?'SecNudge hook is configured. Restart Claude Code and confirm with /hooks.':'SecNudge hook is not configured.');
      if(state.disabledAllHooks) console.log('This project has all hooks disabled.');
    } else console.log(configure(action,project)?'Local hook settings updated. Restart Claude Code and review /hooks.':'No change needed.');
  } catch { console.error('SecNudge could not update settings. Check the project path and valid settings JSON; existing files were preserved where possible. Use the VS Code setup controls for details.');process.exitCode=1; }
}
module.exports={configure,status,command};
