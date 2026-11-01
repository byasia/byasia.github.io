(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('unlock-form'), password=$('password'), button=$('unlock'), status=$('status'), label=$('unlock-label');
  let busy=false, urls=[], ciphertext, metadata;
  const decode=value=>{const text=atob(value),bytes=new Uint8Array(text.length);for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);return bytes;};
  const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
  const clearUrls=()=>{for(const url of urls)URL.revokeObjectURL(url);urls=[];};
  const checkedFetch=async name=>{const response=await fetch(name,{cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error('network');return response;};
  const getCiphertext=async()=>{
    if(ciphertext)return ciphertext;
    metadata=await (await checkedFetch('vault.json')).json();
    if(metadata.version!==1||metadata.cipher!=='AES-GCM'||metadata.kdf!=='PBKDF2'||metadata.parts.length>64)throw new Error('format');
    const buffers=new Array(metadata.parts.length);let finished=0,next=0;
    await Promise.all(Array.from({length:Math.min(3,buffers.length)},async()=>{
      while(next<metadata.parts.length){const at=next++,part=metadata.parts[at];if(!/^sealed-\d{3}\.bin$/.test(part.name))throw new Error('format');const bytes=new Uint8Array(await(await checkedFetch(part.name)).arrayBuffer());if(bytes.length!==part.size)throw new Error('network');buffers[at]=bytes;finished++;message(`正在取出加密书页… ${Math.round(finished/buffers.length*100)}%`);}
    }));
    const bytes=new Uint8Array(buffers.reduce((size,item)=>size+item.length,0));let offset=0;
    for(const buffer of buffers){bytes.set(buffer,offset);offset+=buffer.length;}
    if(bytes.length!==metadata.size)throw new Error('format');ciphertext=bytes;return bytes;
  };
  const mime=name=>({html:'text/html;charset=utf-8',js:'text/javascript;charset=utf-8',css:'text/css;charset=utf-8',svg:'image/svg+xml',jpg:'image/jpeg',pdf:'application/pdf',ttf:'font/ttf',txt:'text/plain;charset=utf-8'}[name.split('.').pop()]||'application/octet-stream');
  const openBook=book=>{
    clearUrls();const map=new Map();
    const add=(file,bytes)=>{const url=URL.createObjectURL(new Blob([bytes],{type:mime(file.name)}));map.set(file.name,url);urls.push(url);};
    const rewrite=text=>{let result=text.replaceAll('download>','download="晚风替我记得.pdf">');for(const [name,url] of [...map].sort((a,b)=>b[0].length-a[0].length))result=result.split(name).join(url);return result;};
    for(const file of book.files.filter(f=>! /\.(?:html|css|js)$/.test(f.name)))add(file,decode(file.data));
    for(const file of book.files.filter(f=>/\.(?:css|js)$/.test(f.name)))add(file,rewrite(new TextDecoder().decode(decode(file.data))));
    const entry=book.files.find(file=>file.name===book.entry);if(!entry)throw new Error('format');
    const bar='<div id="private-reader-bar"><a href="../">← 宝藏盒</a><button id="private-reader-lock" type="button">重新上锁 ↗</button></div>';
    const style='<meta name="robots" content="noindex,nofollow,noarchive"><style>body{padding-top:52px!important}#private-reader-bar{position:fixed;z-index:9999;top:0;left:0;right:0;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:#f4eee3;color:#253a37;border-bottom:1px solid #cfc9b8;font:12px system-ui,sans-serif}#private-reader-bar a{color:inherit}#private-reader-lock{border:1px solid #a4b09d;background:#fffdf7;color:#36594c;padding:8px 12px;border-radius:4px;cursor:pointer;font:inherit}#private-reader-lock:focus-visible{outline:3px solid #d6a655;outline-offset:3px}.toolbar{top:52px!important}.reading-progress{top:52px!important}.sidebar{top:52px!important;height:calc(100dvh - 52px)!important}</style>';
    const html=rewrite(new TextDecoder().decode(decode(entry.data))).replace('<head>','<head>'+style).replace(/<body\b[^>]*>/i,tag=>tag+bar);
    document.open();document.write(html);document.close();
    document.getElementById('private-reader-lock').addEventListener('click',()=>location.reload());
  };
  $('reveal').addEventListener('click',()=>{const show=password.type==='password';password.type=show?'text':'password';$('reveal').textContent=show?'隐藏':'显示';$('reveal').setAttribute('aria-label',show?'隐藏密码':'显示密码');$('reveal').setAttribute('aria-pressed',String(show));password.focus();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!password.value)return;
    busy=true;button.disabled=true;password.disabled=true;label.textContent='正在打开…';message('正在取出加密书页…');
    const entered=password.value;password.value='';
    try{
      if(!crypto.subtle)throw new Error('crypto');
      const bytes=await getCiphertext();message('正在核对暗号…');
      const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(entered),'PBKDF2',false,['deriveKey']);
      const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(metadata.salt),iterations:metadata.iterations},material,{name:'AES-GCM',length:256},false,['decrypt']);
      let plaintext;
      try{plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(metadata.iv)},key,bytes);}catch{throw new Error('password');}
      const stream=new Blob([plaintext]).stream().pipeThrough(new DecompressionStream('gzip'));
      const book=await new Response(stream).json();openBook(book);message('正文、插图与 PDF 均需解锁后查看。');
    }catch(error){clearUrls();message(error.message==='password'?'密码不正确，再试一次。':error.message==='crypto'?'当前浏览器无法解密，请使用更新的浏览器打开此页面。':'暂时无法打开书页，请检查网络后重试。',true);password.focus();}
    finally{busy=false;button.disabled=false;password.disabled=false;label.textContent='翻开私藏故事';if(document.getElementById('gate'))password.focus();}
  });
  $('lock-again').addEventListener('click',()=>{$('reader-host').replaceChildren();clearUrls();$('reader').hidden=true;$('gate').hidden=false;document.body.classList.remove('reading');form.reset();password.type='password';$('reveal').textContent='显示';$('reveal').setAttribute('aria-label','显示密码');$('reveal').setAttribute('aria-pressed','false');message('已经重新上锁。下次阅读，请再次输入密码。');password.focus();});
  window.addEventListener('pagehide',clearUrls);
})();
