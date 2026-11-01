import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(await fs.readFile('source/release-manifest.json','utf8'));
const directory='release-build';await fs.mkdir(directory,{recursive:true});
async function checksum(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function download(name,target,expected){
  for(let attempt=0;attempt<3;attempt++){
    try{const response=await fetch(`https://github.com/${manifest.repository}/releases/download/${manifest.tag}/${name}`);if(!response.ok){const error=new Error(`${name}: HTTP ${response.status}`);error.status=response.status;throw error;}await pipeline(Readable.fromWeb(response.body),createWriteStream(target));if(await checksum(target)!==expected)throw new Error(`Checksum mismatch: ${name}`);return;}
    catch(error){if(error.status===404||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,1500));}
  }
}
const selectedFiles=process.argv.includes('--web')?manifest.files.filter(file=>/-web-[\d.]+\.zip$/.test(file.name)):manifest.files;
for(const file of selectedFiles){
  const destination=directory+'/'+file.name;
  if(file.direct){await download(file.name,destination,file.sha256);continue;}
  // Once assembled, later deployments can reuse the verified full asset.
  try{await download(file.name,destination,file.sha256);console.log(`Verified existing ${file.name}`);continue;}catch{}
  const output=await fs.open(destination,'w');
  try{for(const part of file.parts){const temporary=directory+'/'+part.name;await download(part.name,temporary,part.sha256);const bytes=await fs.readFile(temporary);await output.write(bytes);await fs.unlink(temporary);}}finally{await output.close();}
  if((await fs.stat(destination)).size!==file.size||await checksum(destination)!==file.sha256)throw new Error(`Assembly validation failed: ${file.name}`);
  execFileSync('gh',['release','upload',manifest.tag,destination,'--repo',manifest.repository,'--clobber'],{stdio:'inherit'});
  console.log(`Published verified complete asset: ${file.name}`);
}
