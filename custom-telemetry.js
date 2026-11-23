(()=>{
"use strict";
const KEY="seth_custom_telemetry_v1";
const initial=()=>({cards:[["觀測／事件筆數","0"],["有紀錄會員","0"],["投注金額合計（點）","0"],["派彩金額合計（點）","0"],["淨收益（派彩－投注）","0"],["明確標記免遊購買","0"],["高額派彩事件（≥50,000）","0"]],hours:Array(24).fill(0),top:[],members:[]});
let state=initial();
let editing=false;
const formatValue=v=>{const s=String(v??"").trim();const n=Number(s.replace(/,/g,""));return s!==""&&Number.isFinite(n)?n.toLocaleString("zh-TW",{maximumFractionDigits:2}):s||"—";};
const asText=v=>String(v??"").trim()||"—";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const topKeys=["time","member","game","room","bet","payout","net"];
const memberKeys=["member","time","game","count","bet","payout","net"];
function restore(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&Array.isArray(v.cards)&&Array.isArray(v.hours)&&Array.isArray(v.top)&&Array.isArray(v.members)){state=v;state.cards=state.cards.slice(0,7);while(state.cards.length<7)state.cards.push(initial().cards[state.cards.length]);}}catch(e){}}
function inputs(keys,row,section,index){return keys.map(k=>'<td><input class="cm-cell" aria-label="'+esc(k)+'" data-section="'+section+'" data-index="'+index+'" data-key="'+k+'" value="'+esc(row[k])+'"></td>').join("");}
function table(section,keys){
 const arr=state[section],dest=$(section==="top"?"cmTop":"cmMembers");
 const headings=keys.map((k,i)=>i>=4?i:0);
 dest.innerHTML=arr.map((row,i)=>{
   const view='<tr class="cm-view-row">'+keys.map(k=>'<td>'+esc(asText(row[k]))+'</td>').join("")+'<td>—</td></tr>';
   const edit='<tr class="cm-edit-row">'+inputs(keys,row,section,i)+'<td><button class="cm-delete" type="button" data-remove="'+section+'" data-index="'+i+'">刪除</button></td></tr>';
   return view+edit;
 }).join("")||'<tr><td colspan="'+(keys.length+1)+'">尚無自訂資料，點「編輯資料」即可新增</td></tr>';
}
function setMode(value){
 editing=value;
 $("customTelemetry").classList.toggle("cm-editing",editing);
 $("cmToggle").textContent=editing?"👁️ 預覽儀表板":"✏️ 編輯資料";
 $("cmToggle").setAttribute("aria-pressed",String(editing));
}

function drawChart(){const counts=state.hours.map(n=>Math.max(0,Number(n)||0));const max=Math.max(1,...counts);$("cmBars").innerHTML=counts.map((v,i)=>'<div class="tm-bar" title="'+i+':00：'+v+' 筆" style="height:'+Math.max(2,v/max*145)+'px"></div>').join("");$("cmBarLabels").innerHTML=counts.map((_,i)=>'<span>'+String(i).padStart(2,"0")+'</span>').join("");}
function render(){
 $("cmCards").innerHTML=state.cards.slice(0,7).filter(a=>Array.isArray(a)).map((a,i)=>'<div class="tm-card"><small class="cm-preview-only">'+esc(asText(a[0]))+'</small><strong class="cm-preview-only">'+esc(formatValue(a[1]))+'</strong><input class="cm-label cm-edit-only" aria-label="指標名稱" data-card="'+i+'" data-part="0" value="'+esc(a[0])+'"><input class="cm-value cm-edit-only" aria-label="指標數值" data-card="'+i+'" data-part="1" value="'+esc(a[1])+'"></div>').join("");
 $("cmHours").innerHTML=state.hours.map((n,i)=>'<label class="cm-hour">'+String(i).padStart(2,"0")+':00<input type="number" min="0" step="1" data-hour="'+i+'" value="'+esc(n)+'"></label>').join("");
 table("top",topKeys);table("members",memberKeys);drawChart();
}
function status(t){$("cmStatus").textContent=t;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));render();setMode(false);status("✅ 已儲存，正在顯示儀表板預覽（自訂資料，非實測）");}catch(e){status("儲存失敗：瀏覽器儲存空間不足或已停用");}}
function download(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download="seth-custom-telemetry.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
document.addEventListener("input",e=>{
 const x=e.target;if(!x.closest("#customTelemetry"))return;
 if(x.hasAttribute("data-card"))state.cards[Number(x.dataset.card)][Number(x.dataset.part)]=x.value;
 if(x.hasAttribute("data-hour")){state.hours[Number(x.dataset.hour)]=Math.max(0,Number(x.value)||0);drawChart();}
 if(x.hasAttribute("data-section")){state[x.dataset.section][Number(x.dataset.index)][x.dataset.key]=x.value;}
 status("尚未儲存變更");
});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b||!b.closest("#customTelemetry"))return;
 if(b.id==="cmToggle"){setMode(!editing);if(!editing)render();return;}
 if(b.id==="cmSave"){save();return;}
 if(b.id==="cmExport"){download();return;}
 if(b.id==="cmReset"){if(confirm("確定清空全部自訂數據？原本實測資料不受影響。")){state=initial();render();save();}return;}
 if(b.dataset.add){const sec=b.dataset.add;const keys=sec==="top"?topKeys:memberKeys;state[sec].push(Object.fromEntries(keys.map(k=>[k,""])));table(sec,keys);status("尚未儲存變更");return;}
 if(b.dataset.remove){const sec=b.dataset.remove;state[sec].splice(Number(b.dataset.index),1);table(sec,sec==="top"?topKeys:memberKeys);status("尚未儲存變更");}
});
$("cmImport").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1024*1024)throw Error("檔案不能超過 1MB");const v=JSON.parse(await f.text());if(!Array.isArray(v.cards)||v.cards.length!==7||!Array.isArray(v.hours)||v.hours.length!==24||!Array.isArray(v.top)||!Array.isArray(v.members))throw Error("格式不正確");state=v;render();save();}catch(err){status("匯入失敗："+err.message);}e.target.value="";});
restore();render();setMode(false);
})();