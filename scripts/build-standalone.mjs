import {build} from 'esbuild'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
const html=await readFile('standalone/index.html','utf8')
const result=await build({entryPoints:['standalone/engine.js'],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,legalComments:'inline',write:false})
const assets={demo:'vrm/Seed-san.vrm',idle:'vrma/idle.vrma',walk:'vrma/world-walk.vrma',talk:'vrma/idle-talking.vrma',wave:'vrma/rb-wave.vrma'}
const tags=await Promise.all(Object.entries(assets).map(async ([id,p])=>'<script type="application/octet-stream" id="asset-'+id+'">'+(await readFile(p)).toString('base64')+'</script>'))
const notice=await readFile('vrma/NOTICE.md','utf8')
const license=await readFile('vrm/Seed-san.LICENCE.txt','utf8')
const credits='<script type="text/plain" id="credits">'+('Hanami: https://github.com/Undi95/Hanami (AGPL-3.0). Standalone source: https://github.com/0xInsomnia/Hanami/tree/hanami-web-demo/standalone\n'+notice+'\n'+license).replace(/<\/script/gi,'&lt;/script')+'</script>'
const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')
const output=html.replace('<!--ASSETS-->',()=>tags.join('\n')+credits).replace('<!--ENGINE-->',()=>'<script>'+code+'</script>')
await mkdir('dist',{recursive:true})
await writeFile('dist/Hanami-Local-v02.html',output)
console.log('OFFLINE HTML READY:',Buffer.byteLength(output),'bytes')
