// Dependency-free, uncompressed ZIP/VSIX writer. Only the explicit source list is packaged.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const pkg = require('../package.json');
const files = ['package.json','README.md','extension.cjs','view.cjs','panel.js','revision.js','analyzer.cjs','hook.cjs','hook-setup.cjs','claude-integration.cjs'];
function crc32(data) {
  let crc = 0xffffffff;
  for (const value of data) { crc ^= value; for(let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const locals = [], centrals = []; let offset = 0;
  for (const [name,content] of entries) {
    const filename = Buffer.from(name), data = Buffer.from(content), crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt16LE(33,12); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(filename.length,26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(33,14); central.writeUInt32LE(crc,16); central.writeUInt32LE(data.length,20); central.writeUInt32LE(data.length,24); central.writeUInt16LE(filename.length,28); central.writeUInt32LE(offset,42);
    locals.push(local,filename,data); centrals.push(central,filename); offset += local.length+filename.length+data.length;
  }
  const directory = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,directory,end]);
}
const manifest = `<?xml version="1.0" encoding="utf-8"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="en-US" Id="${pkg.name}" Version="${pkg.version}" Publisher="${pkg.publisher}"/><DisplayName>${pkg.displayName}</DisplayName><Description xml:space="preserve">${pkg.description}</Description><Tags>security,research</Tags><Categories>Other</Categories><GalleryFlags>Preview</GalleryFlags><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="${pkg.engines.vscode}"/><Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/><Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/></Properties></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets></PackageManifest>`;
const types = '<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="cjs" ContentType="application/javascript"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="md" ContentType="text/markdown"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>';
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
const output = path.join(root,'dist',`${pkg.name}-${pkg.version}.vsix`);
fs.writeFileSync(output,zip([['extension.vsixmanifest',manifest],['[Content_Types].xml',types],...files.map(f=>['extension/'+f,fs.readFileSync(path.join(root,f))])]));
console.log(`Created ${output}. Install locally; this does not publish to a marketplace.`);
