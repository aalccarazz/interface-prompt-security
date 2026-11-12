const vscode = require('vscode');
const { randomBytes } = require('node:crypto');
const { analyzePrompt } = require('./analyzer.cjs');
const { panelHtml } = require('./view.cjs');
const { registerClaudeCommands } = require('./claude-integration.cjs');
function activate(context) {
  registerClaudeCommands(vscode, context);
  context.subscriptions.push(vscode.commands.registerCommand('secnudge.review', () => {
    const panel = vscode.window.createWebviewPanel('secnudge','SecNudge',vscode.ViewColumn.Beside,{
      enableScripts:true, localResourceRoots:[context.extensionUri]
    });
    const scriptUri = name => panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,name));
    panel.webview.html = panelHtml(randomBytes(24).toString('hex'),scriptUri('revision.js'),scriptUri('panel.js'));
    let disposed = false;
    let latestReview = -1;
    const subscription = panel.webview.onDidReceiveMessage(async message => {
      if (disposed || !message || typeof message !== 'object') return;
      const claudeCommands = {enable:'secnudge.enableClaudeHook',check:'secnudge.checkClaudeHook',disable:'secnudge.disableClaudeHook'};
      if (message.type === 'claude-action' && Object.hasOwn(claudeCommands,message.action)) {
        const text = await vscode.commands.executeCommand(claudeCommands[message.action]);
        if (!disposed) await panel.webview.postMessage({type:'claude-status',text});
        return;
      }
      if (!Number.isSafeInteger(message.id) || message.id < 0) return;
      if (message.type === 'review' && typeof message.prompt === 'string' && message.prompt.trim()) {
        latestReview = message.id;
        try {
          const result = await analyzePrompt(message.prompt);
          if (!disposed && latestReview === message.id) await panel.webview.postMessage({type:'result',id:message.id,result});
        } catch {
          if (!disposed && latestReview === message.id) await panel.webview.postMessage({type:'review-error',id:message.id});
        }
      }
      if (message.type === 'copy' && typeof message.text === 'string' && message.reviewId === latestReview) {
        try {
          await vscode.env.clipboard.writeText(message.text);
          if (!disposed) await panel.webview.postMessage({type:'copied',id:message.id,reviewId:message.reviewId});
        } catch {
          if (!disposed) await panel.webview.postMessage({type:'copy-error',id:message.id,reviewId:message.reviewId});
        }
      }
    });
    panel.onDidDispose(() => { disposed = true; subscription.dispose(); });
  }));
}
module.exports = { activate };
