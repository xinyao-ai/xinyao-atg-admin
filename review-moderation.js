/* 賽特神諭玩家評價審核：使用既有 ATG 管理員登入 session，不儲存 ADMIN_TOKEN */
(function(){
"use strict";
const API="https://seth-review-service.love06130430.workers.dev";
const $=id=>document.getElementById(id);
let photoObjectURLs=[];
function status(message){const el=$("reviewManagerStatus");if(el)el.textContent=message;}
function clearPhotos(){photoObjectURLs.forEach(url=>URL.revokeObjectURL(url));photoObjectURLs=[];}
function token(){return sessionStorage.getItem("atg_admin_token")||"";}
async function request(path,method="GET"){
  if(!token())throw new Error("請先登入 ATG 後台");
  const response=await fetch(API+path,{method,cache:"no-store",headers:{"Authorization":"Bearer "+token(),"Accept":"application/json"}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||("服務錯誤："+response.status));
  return result;
}
async function loadPhoto(url,container){
  try{
    const res=await fetch(API+url,{headers:{"Authorization":"Bearer "+token()},cache:"no-store"});
    if(!res.ok)return;
    const objectURL=URL.createObjectURL(await res.blob());photoObjectURLs.push(objectURL);
    const img=document.createElement("img");img.src=objectURL;img.alt="玩家投稿照片";
    img.style.cssText="height:150px;max-width:220px;object-fit:contain;border:1px solid #83652c;border-radius:9px;cursor:pointer";
    img.title="點擊查看照片";img.addEventListener("click",()=>window.open(objectURL,"_blank","noopener"));
    container.appendChild(img);
  }catch(e){console.warn("無法讀取投稿照片",e);}
}
function card(item){
  const card=document.createElement("article");card.className="card";card.style.margin="12px 0";
  const top=document.createElement("div");top.style.cssText="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap";
  const heading=document.createElement("strong");heading.textContent=item.nickname+"　"+'★'.repeat(Math.max(1,Math.min(5,Number(item.rating))))+"　"+({pending:"待審核",approved:"已公開",rejected:"未通過"}[item.status]||"");
  const meta=document.createElement("small");meta.className="muted";meta.textContent=item.submitted_at||"";
  top.append(heading,meta);
  const detail=document.createElement("p");detail.style.whiteSpace="pre-wrap";detail.style.overflowWrap="anywhere";detail.textContent=item.content||"";
  const gallery=document.createElement("div");gallery.style.cssText="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0";
  for(const path of (item.photos||[]))loadPhoto(path,gallery);
  const actions=document.createElement("div");actions.className="row";
  for(const [operation,label,klass] of [["approve","✅ 核准公開","primary"],["reject","✕ 拒絕公開","danger"],["pending","↩ 改待審核","soft"]]){
    const btn=document.createElement("button");btn.type="button";btn.className="btn "+klass;btn.textContent=label;
    btn.addEventListener("click",async()=>{
      if(!confirm("確定要將「"+item.nickname+"」設為「"+label+"」嗎？"))return;
      btn.disabled=true;
      try{await request("/api/admin/"+encodeURIComponent(item.id)+"/"+operation,"POST");await window.loadATGReviewSubmissions();}
      catch(e){status("操作失敗："+e.message);btn.disabled=false;}
    });
    actions.appendChild(btn);
  }
  card.append(top,detail,gallery,actions);return card;
}
window.loadATGReviewSubmissions=async function(){
  const list=$("reviewManagerList");if(!list)return;
  clearPhotos();list.replaceChildren();status("正在讀取玩家投稿…");
  try{
    const response=await request("/api/admin/submissions");
    const rows=response.reviews||[];
    const filter=$("reviewManagerFilter")?.value||"all";
    const shown=rows.filter(x=>filter==="all"||x.status===filter);
    for(const item of shown)list.appendChild(card(item));
    status("全部 "+rows.length+" 筆／目前顯示 "+shown.length+" 筆（待審核："+rows.filter(x=>x.status==="pending").length+" 筆）");
    if(!shown.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="目前沒有符合條件的投稿";list.appendChild(empty);}
  }catch(e){
    status("⚠️ "+e.message+"。若剛完成整合，請先把新版 review-service Worker 部署上線。");
  }
};
document.addEventListener("DOMContentLoaded",()=>{
  $("reviewManagerRefresh")?.addEventListener("click",window.loadATGReviewSubmissions);
  $("reviewManagerFilter")?.addEventListener("change",window.loadATGReviewSubmissions);
});
})();