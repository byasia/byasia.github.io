import fs from 'node:fs/promises';
import path from 'node:path';
import {webcrypto,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const source=process.env.STORY_SOURCE;
const target=process.env.STORY_OUTPUT||'wanfeng';
const password=process.env.WANFENG_READING_PASSWORD;
if(!source||!password)throw Error('The private source directory and encryption password are required');
const files=[];
for(const name of await fs.readdir(source)){
 const bytes=await fs.readFile(path.join(source,name));
 files.push({name,data:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')});
}
const salt=webcrypto.getRandomValues(new Uint8Array(32)),iv=webcrypto.getRandomValues(new Uint8Array(12));
const iterations=600000;
const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt']);
const compressed=gzipSync(Buffer.from(JSON.stringify({version:1,entry:'index.html',files})),{level:9});
const ciphertext=Buffer.from(await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,compressed));
await fs.mkdir(target,{recursive:true});
const parts=[];
for(let offset=0;offset<ciphertext.length;offset+=2*1024*1024){
 const name='sealed-'+String(parts.length+1).padStart(3,'0')+'.bin';
 const bytes=ciphertext.subarray(offset,offset+2*1024*1024);
 await fs.writeFile(path.join(target,name),bytes);parts.push({name,size:bytes.length});
}
await fs.writeFile(path.join(target,'vault.json'),JSON.stringify({version:1,cipher:'AES-GCM',kdf:'PBKDF2',hash:'SHA-256',iterations,salt:Buffer.from(salt).toString('base64'),iv:Buffer.from(iv).toString('base64'),compression:'gzip',size:ciphertext.length,parts},null,2)+'\n');
console.log(`Encrypted ${files.length} private files into ${parts.length} authenticated ciphertext parts.`);
