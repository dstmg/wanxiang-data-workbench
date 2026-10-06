// Separate origin isolates browser drafts and preferences from port 5190.
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
console.log('全部为虚拟数据。打开 http://127.0.0.1:5191/wanxiang；正式工作台请使用不同端口。');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','5191'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,WANXIANG_DEMO:'1',WANXIANG_NEXT_DIST_DIR:'.next-demo',NEXT_TELEMETRY_DISABLED:'1'}});
child.on('error',e=>{console.error(e);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code||0});
