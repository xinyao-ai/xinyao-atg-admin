(()=>{'use strict';
const $=id=>document.getElementById(id);
const endpoint='https://oracle-carousel-publisher.love06130430.workers.dev/publish';
const base='https://xinyao-ai.github.io/xinyao-ai/';
let pending=null,localUrl=null,busy=false,current=null;
const message=s=>{$('spStatus').textContent=s};
const b64=t=>{let b='',a=new TextEncoder().encode(t);for(let i=0;i<a.length;i+=8192)b+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(b)};
const un64=t=>new TextDecoder().decode(Uint8Array.from(atob(String(t).replace(/\s/g,'')),c=>c.charCodeAt(0)));
async function api(path,method='GET',body=null){
 const token=sessionStorage.getItem('atg_admin_token');
 if(!token)throw Error('請先登入後台');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({path,method,body})});
 const res=await response.json().catch(()=>({}));
 if(!response.ok||!res.ok)throw Error(res.error||'後台發布服務無法處理這次操作');
 return res.data;
}
function preview(url){
 const host=$('spPreview');host.replaceChildren();
 if(!url){host.textContent='尚未設定圖片';return}
 const img=document.createElement('img');img.src=url;img.alt='活動海報預覽';host.appendChild(img);
}
async function load(){
 message('正在讀取設定…');
 try{
  const file=await api('carousel-config.json?ref=main');
  const settings=JSON.parse(un64(file.content));
  current=settings.popup||{enabled:true,imageOnly:true,title:'歡迎使用賽特神諭',description:'最新活動與功能資訊，請留意官方公告。',image:'',link:'',buttonText:'查看詳情'};
  $('spEnabled').checked=current.enabled!==false;
  $('spImageOnly').checked=current.imageOnly!==false;
  $('spLink').value=current.link||'';$('spButtonText').value=current.buttonText||'查看詳情';
  $('spTitle').value=current.title||'';$('spDescription').value=current.description||'';
  $('spRemove').checked=false;
  if(!pending)preview(current.image?new URL(current.image,base).href:'');
  message('✅ 已讀取目前彈窗設定');
 }catch(e){message('❌ '+e.message)}
}
async function optimize(file){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('只接受 PNG、JPG、WebP 圖片');
 if(file.size>20*1024*1024)throw Error('圖片超過 20MB');
 const bit=await createImageBitmap(file);
 // Always generate a genuine 1080 x 1080 image, even for portrait originals.
 // Keep the entire poster visible: center it on the same black background as the modal.
 const canvas=document.createElement('canvas');
 canvas.width=1080;canvas.height=1080;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#0a1014';ctx.fillRect(0,0,1080,1080);
 const scale=Math.min(1080/bit.width,1080/bit.height);
 const width=Math.round(bit.width*scale),height=Math.round(bit.height*scale);
 ctx.drawImage(bit,Math.round((1080-width)/2),Math.round((1080-height)/2),width,height);
 bit.close?.();
 const encode=quality=>new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('圖片壓縮失敗')),'image/webp',quality));
 let blob=await encode(.8);
 for(const quality of [.72,.64,.56]){if(blob.size<=300*1024)break;blob=await encode(quality)}
 return blob;
}
const file64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('圖片讀取失敗'));r.readAsDataURL(blob)});
async function publish(){
 if(busy)return;busy=true;$('spSave').disabled=true;
 try{
  const latest=await api('carousel-config.json?ref=main');
  const master=JSON.parse(un64(latest.content));
  const cfg={...(master.popup||{})},link=$('spLink').value.trim();
  if(link&&!/^https:\/\//i.test(link))throw Error('活動連結請使用 https:// 網址');
  cfg.enabled=$('spEnabled').checked;cfg.imageOnly=$('spImageOnly').checked;
  cfg.link=link;cfg.buttonText=$('spButtonText').value.trim()||'查看詳情';
  cfg.title=$('spTitle').value.trim()||'歡迎使用賽特神諭';cfg.description=$('spDescription').value.trim();
  if($('spRemove').checked){cfg.image=''}
  else if(pending){
   if(pending.size>6*1024*1024)throw Error('圖片壓縮後仍超過 6MB');
   message('上傳圖片中…');
   const filename='assets/carousel/popup-'+Date.now()+'.webp';
   await api(filename,'PUT',{branch:'main',message:'Upload popup announcement poster',content:await file64(pending)});
   cfg.image='./'+filename;
  }
  message('發布設定中…');
  master.popup=cfg;
  await api('carousel-config.json','PUT',{branch:'main',sha:latest.sha,message:'Publish SethOracle popup via approved carousel configuration',content:b64(JSON.stringify(master,null,2)+'\n')});
  pending=null;$('spFile').value='';current=cfg;
  message('✅ 已發布！GitHub Pages 部署完成後重新開啟 APP 可看到新彈窗。');
 }catch(e){message('❌ '+e.message)}finally{busy=false;$('spSave').disabled=false}
}
function init(){
 const nav=document.querySelector('nav.nav'),main=document.querySelector('main.main');
 if(!nav||!main||$('oraclePopup'))return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='oraclePopup';tab.textContent='📢 彈窗管理';
 const carousel=nav.querySelector('[data-tab="oracleSimpleCarousel"]');
 if(carousel)carousel.insertAdjacentElement('afterend',tab);else nav.appendChild(tab);
 const section=document.createElement('section');section.className='panel';section.id='oraclePopup';
 section.innerHTML=`<div class="sp-wrap"><h3>📢 賽特神諭｜彈窗管理</h3>
 <p>會員每次重新開啟程式就會看到公告。彈窗採 1:1 正方形；上傳後自動轉成 1080 × 1080，原圖完整保留、不裁切。</p>
 <p>建議圖片尺寸：<b>1080 × 1080</b>（JPG / PNG / WebP，會自動壓縮）。</p>
 <label class="sp-check"><input id="spEnabled" type="checkbox" checked> 啟用彈窗</label>
 <label class="sp-check"><input id="spImageOnly" type="checkbox" checked> 正方形圖片模式（隱藏額外標題文字）</label>
 <label>上傳活動海報<input id="spFile" type="file" accept="image/png,image/jpeg,image/webp"></label>
 <div id="spPreview" class="sp-preview">尚未設定圖片</div>
 <label class="sp-check"><input id="spRemove" type="checkbox"> 移除圖片</label>
 <div class="sp-grid">
 <label>活動連結（選填）<input id="spLink" type="url" placeholder="https://..."></label>
 <label>按鈕文字<input id="spButtonText" type="text" value="查看詳情"></label>
 <label>備用標題<input id="spTitle" type="text" value="歡迎使用賽特神諭"></label>
 <label>備用說明<input id="spDescription" type="text" value="最新活動與功能資訊，請留意官方公告。"></label>
 </div>
 <div class="sp-actions"><button id="spRefresh" type="button">↻ 重新讀取</button><button id="spConvert" type="button">⬜ 將目前圖片轉成 1080 × 1080</button><button id="spSave" type="button">💾 發布彈窗</button></div>
 <p id="spStatus" role="status" aria-live="polite">尚未讀取</p>
 </div>`;
 main.appendChild(section);
 $('spRefresh').addEventListener('click',load);
 $('spSave').addEventListener('click',publish);
 $('spConvert').addEventListener('click',async()=>{
  try{
   if(!current?.image)await load();
   if(!current?.image)throw Error('目前沒有已發布的活動圖片');
   const url=new URL(current.image,base);
   if(url.origin!==location.origin)throw Error('只支援轉換本網站上的活動圖片');
   message('⏳ 正在讀取舊圖片並轉成 1080 × 1080…');
   const response=await fetch(url.href,{cache:'force-cache'});
   if(!response.ok)throw Error('舊圖片無法讀取：'+response.status);
   const source=await response.blob();
   const input=new File([source],'existing-popup.webp',{type:source.type||'image/webp'});
   pending=await optimize(input);
   if(localUrl)URL.revokeObjectURL(localUrl);
   localUrl=URL.createObjectURL(pending);
   preview(localUrl);
   $('spRemove').checked=false;
   message('✅ 已將舊圖片轉成 1080 × 1080（'+Math.round(pending.size/1024)+' KB），點「發布彈窗」即可套用。');
  }catch(err){message('❌ '+err.message)}
 });

 $('spFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{pending=await optimize(file);if(localUrl)URL.revokeObjectURL(localUrl);localUrl=URL.createObjectURL(pending);
   preview(localUrl);$('spRemove').checked=false;message('✅ 已預覽並壓縮：'+Math.round(pending.size/1024)+' KB。按發布才正式更新。');
  }catch(err){pending=null;message('❌ '+err.message)}
 });
 $('spRemove').addEventListener('change',e=>{if(e.target.checked){pending=null;preview('')}else preview(pending?localUrl:current?.image?new URL(current.image,base).href:'')});
 tab.addEventListener('click',()=>{$('title').textContent='彈窗管理';load()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();