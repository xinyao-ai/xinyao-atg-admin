(() => {
'use strict';
const $=id=>document.getElementById(id);
const API='https://oracle-carousel-publisher.love06130430.workers.dev/publish';
const HOST='https://xinyao-ai.github.io/xinyao-ai/';
const CONFIG='carousel-config.json';
const enc=s=>btoa(Array.from(new TextEncoder().encode(s),x=>String.fromCharCode(x)).join(''));
const dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
let dealers={}, busy=false;
const status=msg=>{$('dealerStatus').textContent=msg};
const validUrl=(value,hostCheck)=>{try{const u=new URL(value);return u.protocol==='https:'&&(!hostCheck||hostCheck(u.hostname))}catch{return false}};
const dealerUrl=id=>HOST+'dealer-preview.html?dealer='+encodeURIComponent(id);
async function api(path,method='GET',body){
 const token=sessionStorage.getItem('atg_admin_token');
 if(!token)throw Error('請先登入管理後台');
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({path,method,body})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!j.ok)throw Error(j.error||'管理接口失敗');
 return j.data;
}
const edit=(id)=>{
 const d=dealers[id];
 if(!d)return;
 $('dealerCode').value=id;$('dealerCode').readOnly=true;
 $('dealerName').value=d.name||'';$('dealerRegister').value=d.register||'';
 $('dealerLine').value=d.line||'';$('dealerEnabled').checked=d.enabled!==false;
 status('正在編輯 '+id+'；按「儲存經銷商」才會發布。');
 window.scrollTo({top:0,behavior:'smooth'});
};
const clear=()=>{
 $('dealerCode').value='';$('dealerCode').readOnly=false;
 $('dealerName').value='';$('dealerRegister').value='';$('dealerLine').value='';$('dealerEnabled').checked=true;
};
function render(){
 const tbody=$('dealerRows');tbody.replaceChildren();
 for(const [id,d] of Object.entries(dealers).sort(([a],[b])=>a.localeCompare(b))){
   const tr=document.createElement('tr');
   const add=(text)=>{const td=document.createElement('td');td.textContent=text;tr.appendChild(td);return td};
   add(id);add(d.name||'未命名');add(d.enabled===false?'已停用':'啟用');
   const linkTd=document.createElement('td');
   const a=document.createElement('a');a.href=dealerUrl(id);a.target='_blank';a.rel='noopener noreferrer';a.textContent='開啟專屬版';
   linkTd.appendChild(a);tr.appendChild(linkTd);
   const td=document.createElement('td');
   const b=document.createElement('button');b.type='button';b.textContent='編輯';b.className='btn soft';b.onclick=()=>edit(id);
   const toggle=document.createElement('button');toggle.type='button';toggle.className='btn soft';toggle.style.marginLeft='6px';
   toggle.textContent=d.enabled===false?'啟用':'停用';
   toggle.onclick=()=>setEnabled(id,d.enabled===false);
   td.append(b,toggle);tr.appendChild(td);tbody.appendChild(tr);
 }
 $('dealerCount').textContent=Object.keys(dealers).length+' 位經銷商';
}
async function load(){
 status('讀取 GitHub 經銷商設定中…');
 try{
  const file=await api(CONFIG+'?ref=main');
  const cfg=JSON.parse(dec(file.content));
  dealers=cfg.dealerRegistry&&typeof cfg.dealerRegistry==='object'?cfg.dealerRegistry:{};
  render();status('✅ 已載入，修改後按「儲存經銷商」才會發布。');
 }catch(e){status('❌ '+e.message)}
}
async function save(id,d){
 if(busy)return;
 busy=true;$('dealerSave').disabled=true;
 try{
  status('正在儲存到 GitHub…');
  const file=await api(CONFIG+'?ref=main');
  const cfg=JSON.parse(dec(file.content));
  const current=cfg.dealerRegistry&&typeof cfg.dealerRegistry==='object'?cfg.dealerRegistry:{};
  cfg.dealerRegistry={...current,[id]:d};
  await api(CONFIG,'PUT',{message:'Manage Seth Oracle dealer '+id,branch:'main',sha:file.sha,content:enc(JSON.stringify(cfg,null,2)+'\n')});
  dealers=cfg.dealerRegistry;render();status('✅ '+id+' 已發布。網站部署後專屬入口會同步更新。');clear();
 }catch(e){status('❌ 儲存失敗：'+e.message)}
 finally{busy=false;$('dealerSave').disabled=false}
}
async function setEnabled(id,enabled){
 const d=dealers[id];if(!d)return;
 if(!confirm('確定'+(enabled?'啟用':'停用')+' '+id+' 的專屬入口？'))return;
 await save(id,{...d,enabled});
}
function init(){
 const panel=$('dealers');if(!panel)return;
 const frame=panel.querySelector('.dealer-frame');if(!frame)return;
 frame.innerHTML='';
 const header=document.createElement('h3');header.textContent='👑 經銷商管理';frame.appendChild(header);
 const note=document.createElement('p');note.className='dealer-note';note.textContent='經銷商的註冊網址與 LINE 獨立設定；原版不受影響。會員資料分流尚未開通。';frame.appendChild(note);
 const form=document.createElement('div');form.className='dealer-editor';
 form.innerHTML='<div class="dealer-fields">'+
 '<label>經銷商編號<input id="dealerCode" maxlength="24" placeholder="A002" autocomplete="off"></label>'+
 '<label>經銷商名稱<input id="dealerName" maxlength="50" placeholder="例如：王先生"></label>'+
 '<label>皇鼎註冊網址<input id="dealerRegister" type="url" placeholder="https://hd5957.com/?aff=..."></label>'+
 '<label>官方 LINE 網址<input id="dealerLine" type="url" placeholder="https://lin.ee/..."></label>'+
 '</div><label class="dealer-switch"><input type="checkbox" id="dealerEnabled" checked> 啟用此經銷商</label>'+
 '<div class="dealer-actions"><button type="button" id="dealerSave">儲存經銷商</button><button type="button" id="dealerReset">新增／清空表單</button><button type="button" id="dealerReload">重新讀取</button></div>'+
 '<p class="dealer-note" role="status" id="dealerStatus">尚未載入</p>';
 frame.appendChild(form);
 const list=document.createElement('div');list.className='dealer-list';
 list.innerHTML='<h3>現有經銷商 <small id="dealerCount"></small></h3><div class="table"><table><thead><tr><th>編號</th><th>名稱</th><th>狀態</th><th>專屬網址</th><th>操作</th></tr></thead><tbody id="dealerRows"></tbody></table></div>';
 frame.appendChild(list);
 $('dealerSave').onclick=async()=>{
  const id=$('dealerCode').value.trim().toUpperCase(),name=$('dealerName').value.trim();
  const register=$('dealerRegister').value.trim(),line=$('dealerLine').value.trim();
  if(!/^[A-Z0-9_-]{2,24}$/.test(id)){status('⚠️ 編號請使用 2～24 位英數字、- 或 _');return}
  if(!name){status('⚠️ 請填寫經銷商名稱');return}
  if(!validUrl(register,host=>host==='hd5957.com'||host.endsWith('.hd5957.com'))){status('⚠️ 註冊連結需為 hd5957.com 的 HTTPS 網址');return}
  if(!validUrl(line,host=>host==='lin.ee')){status('⚠️ LINE 請填入 https://lin.ee/...');return}
  await save(id,{name,register,line,enabled:$('dealerEnabled').checked});
 };
 $('dealerReset').onclick=()=>{clear();status('請輸入新經銷商資料。')};
 $('dealerReload').onclick=load;
 const nav=document.querySelector('[data-tab="dealers"]');nav?.addEventListener('click',load);
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();