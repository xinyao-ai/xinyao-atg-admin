(()=>{
"use strict";
const fmt=x=>Number(x).toLocaleString("zh-TW",{maximumFractionDigits:2});
const $=id=>document.getElementById(id);
const storeKey="seth_custom_freegame_returns_v1";
let manual={buy:"",spin:""};
try{const x=JSON.parse(localStorage.getItem(storeKey)||"null");if(x&&typeof x==="object")manual={...manual,...x};}catch(e){}
function num(v){if(v===null||v===undefined||v==="")return null;const n=Number(String(v).replace(/,/g,""));return Number.isFinite(n)&&n>=0?n:null;}
function identify(x){
 const source=String(x.freeEntrySource||"").trim().toLowerCase();
 const type=String(x.type||"").trim().toLowerCase();
 if(["free_buy","buy_free","purchased_bonus","bonus_buy","feature_buy","bonus_purchase","buy"].includes(type)||["buy","purchase","purchased","free_buy","bonus_buy","feature_buy"].includes(source))return "buy";
 if(["free_trigger","spin_free_entry","natural_bonus","spin_bonus","bonus_trigger","base_spin_bonus","natural","spin_trigger"].includes(type)||["spin","natural","base_spin","trigger","free_trigger","regular_spin"].includes(source))return "spin";
 return null;
}
function real(){
 if(typeof tmRecords!=="function")return;
 const a=tmRecords();const out={buy:{sum:0,count:0},spin:{sum:0,count:0},unknown:0};
 for(const x of a){const kind=identify(x);if(!kind){if(x.type==="spin"||x.type==="free_buy")out.unknown++;continue;}
 const amount=num(x.freeReturnPayout??x.payout);
 if(amount===null){out.unknown++;continue;}
 out[kind].sum+=amount;out[kind].count++;
 }
 $("fgRealBuy").textContent=out.buy.count?fmt(out.buy.sum):"—";
 $("fgRealSpin").textContent=out.spin.count?fmt(out.spin.sum):"—";
 $("fgRealDiff").textContent=out.buy.count&&out.spin.count?fmt(out.buy.sum-out.spin.sum):"—";
 $("fgRealBuyCount").textContent=out.buy.count+" 筆可辨識紀錄";
 $("fgRealSpinCount").textContent=out.spin.count+" 筆可辨識紀錄";
 $("fgRealNote").textContent="依照目前篩選條件計算。未能確認免費遊戲進入方式或回報金額的紀錄不計入（待確認："+out.unknown+" 筆）。沒有完整免費遊戲結算資料時，顯示的可能只是單筆派彩，不代表整場免費遊戲總回報。";
}
function updateManual(){
 const a=num(manual.buy),b=num(manual.spin);
 $("fgPreviewBuy").textContent=a!==null?fmt(a):"—";
 $("fgPreviewSpin").textContent=b!==null?fmt(b):"—";
 $("fgCustomDiff").textContent=a!==null&&b!==null?fmt(a-b):"—";
 $("fgCustomRatio").textContent=a!==null&&b!==null&&b>0?(a/b).toFixed(2)+" 倍":"—";
}
function load(){
 $("fgCustomBuy").value=manual.buy;
 $("fgCustomSpin").value=manual.spin;
 updateManual();
 document.querySelectorAll("#customTelemetry .fg-input").forEach(el=>el.addEventListener("input",()=>{
  manual[el.dataset.fg]=el.value;updateManual();
  $("fgCustomStatus").textContent="尚未儲存回報比較";
 }));
 function saveManual(){try{localStorage.setItem(storeKey,JSON.stringify(manual));$("fgCustomStatus").textContent="✅ 已儲存自訂回報金額";}catch(e){$("fgCustomStatus").textContent="儲存失敗："+e.message;}}
 $("fgSave").addEventListener("click",saveManual);
 $("cmSave").addEventListener("click",saveManual);
 $("fgClear").addEventListener("click",()=>{if(!confirm("確定清空自訂免費遊戲回報金額？"))return;manual={buy:"",spin:""};$("fgCustomBuy").value="";$("fgCustomSpin").value="";updateManual();localStorage.removeItem(storeKey);$("fgCustomStatus").textContent="已清空";});
 if(typeof tmRender==="function"){const old=tmRender;tmRender=function(){const result=old.apply(this,arguments);real();return result;};real();}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();