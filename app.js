(()=>{
"use strict";
const $=id=>document.getElementById(id);
const els={
 input:$("imageInput"),fileInfo:$("fileInfo"),preview:$("previewGrid"),badge:$("statusBadge"),status:$("statusText"),
 bar:$("progressBar"),progress:$("progressText"),metricsCard:$("metricsCard"),metrics:$("metricsGrid"),
 found:$("foundBadge"),jsonCard:$("jsonCard"),json:$("jsonOutput"),resultCard:$("resultCard"),ocr:$("ocrOutput"),
 errorCard:$("errorCard"),error:$("errorOutput"),debugCard:$("debugCard"),debug:$("debugGrid"),toggle:$("toggleDebugButton"),
 reviewCard:$("reviewCard"),reviewList:$("reviewList"),reviewBadge:$("reviewBadge")
};
const labels={
 source:["Fuente",""],screen_type:["Tipo de pantalla",""],title:["Título",""],location:["Lugar",""],activity:["Actividad",""],date:["Fecha",""],time:["Hora",""],
 distance_km:["Distancia"," km"],avg_heart_rate_bpm:["FC media"," ppm"],max_heart_rate_bpm:["FC máxima"," ppm"],
 avg_pace_min_km:["Ritmo medio"," /km"],total_time:["Tiempo total",""],calories_kcal:["Calorías"," kcal"],
 cadence_spm:["Cadencia"," ppm"],temperature_c:["Temperatura"," °C"],elevation_gain_m:["Desnivel +"," m"]
};
let urls=[];

function setStatus(label,message,type="idle"){els.badge.textContent=label;els.badge.className=`badge ${type}`;els.status.textContent=message}
function setProgress(done,total,sub=0){const p=total?Math.min(1,(done+sub)/total):0;els.bar.style.width=`${Math.round(p*100)}%`;els.progress.textContent=`${Math.round(p*100)} %`}
function reset(){
 ["metricsCard","jsonCard","resultCard","errorCard","debugCard","reviewCard"].forEach(k=>els[k].hidden=true);
 els.metrics.innerHTML=els.debug.innerHTML=els.reviewList.innerHTML="";
 els.json.textContent=els.ocr.textContent=els.error.textContent="";
 setProgress(0,1)
}
function errorText(e){return [`Nombre: ${e?.name||"Error"}`,`Mensaje: ${e?.message||String(e)}`,e?.stack?`\nStack:\n${e.stack}`:"",`\nURL: ${location.href}`,`Navegador: ${navigator.userAgent}`].filter(Boolean).join("\n")}

function imageFromFile(file){
 return new Promise((resolve,reject)=>{
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(`No se pudo abrir ${file.name}`))};
  img.src=url;
 })
}

function cropCanvas(img,region){
 const maxWidth=1800;
 const scale=Math.min(2,maxWidth/img.width);
 const sx=Math.round(img.width*region.x),sy=Math.round(img.height*region.y);
 const sw=Math.round(img.width*region.w),sh=Math.round(img.height*region.h);
 const c=document.createElement("canvas");
 c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
 c.getContext("2d",{willReadFrequently:true}).drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
 return c
}

function enhance(source,mode="gray"){
 const c=document.createElement("canvas");c.width=source.width;c.height=source.height;
 const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(source,0,0);
 const im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
 let sum=0;for(let i=0;i<d.length;i+=4)sum+=(d[i]+d[i+1]+d[i+2])/3;
 const avg=sum/(d.length/4),invert=avg<105;
 for(let i=0;i<d.length;i+=4){
  let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
  if(invert)g=255-g;
  g=(g-128)*1.5+128;g=Math.max(0,Math.min(255,g));
  if(mode==="binary")g=g>150?255:0;
  d[i]=d[i+1]=d[i+2]=g
 }
 ctx.putImageData(im,0,0);return c
}

async function recognize(image,onProgress){
 return window.Tesseract.recognize(image,"spa+eng",{logger:m=>{if(typeof m.progress==="number")onProgress(m.progress,m.status)}})
}

async function readZone(img,region,name,baseProgress,weight,onProgress){
 const raw=cropCanvas(img,region),gray=enhance(raw,"gray");
 let first=await recognize(gray,(p,s)=>onProgress(baseProgress+p*weight*.72,`${name}: ${s||"OCR"}`));
 let best=first;
 const t1=first?.data?.text?.trim()||"",c1=first?.data?.confidence||0;
 if(c1<55||t1.length<45){
  const binary=enhance(raw,"binary");
  const second=await recognize(binary,(p)=>onProgress(baseProgress+weight*.72+p*weight*.28,`${name}: segunda lectura`));
  const t2=second?.data?.text?.trim()||"",c2=second?.data?.confidence||0;
  if(c2>c1||t2.length>t1.length*1.2)best=second;
 }
 return{text:best?.data?.text?.trim()||"",confidence:Math.round(best?.data?.confidence||0)}
}

async function readOne(file,index,total){
 const img=await imageFromFile(file);
 // Relative Garmin templates. The status bar is excluded.
 const regions={
  header:{x:.03,y:.07,w:.94,h:.22},
  body:{x:.03,y:.20,w:.94,h:.74},
  metrics:{x:.03,y:.28,w:.94,h:.66},
  full:{x:.02,y:.06,w:.96,h:.90}
 };
 const names=["header","body","metrics","full"];
 const zones={},conf={};
 for(let z=0;z<names.length;z++){
  const name=names[z],base=z/names.length,weight=1/names.length;
  const r=await readZone(img,regions[name],name,base,weight,(local,msg)=>{
    setProgress(index,total,local);
    setStatus("Procesando",`Captura ${index+1}/${total} · ${msg}`,"working")
  });
  zones[name]=r.text;conf[name]=r.confidence;
 }
 return{file:file.name,zones,zone_confidence:conf,parsed:window.GarminParser.parseZones(zones)}
}

function renderMerged(merged){
 els.metrics.innerHTML=Object.entries(merged.data).map(([key,value])=>{
  const [label,suffix]=labels[key]||[key,""],f=merged.fields[key],missing=value==null||value==="";
  return `<article class="metric"><div class="metric-label">${label}</div><div class="metric-value ${missing?"missing":""}">${missing?"No encontrado":`${value}${suffix}`}</div>${!missing?`<div class="confidence">${Math.round((f.confidence||0)*100)} % · captura ${f.capture||"-"} · ${f.zone||"zona"}</div>`:""}</article>`
 }).join("");
 els.found.textContent=`${merged.found} campos`;els.metricsCard.hidden=false;
 els.json.textContent=JSON.stringify(merged,null,2);els.jsonCard.hidden=false;
}

function renderReview(merged){
 const warnings=[...(merged.warnings||[])];
 Object.entries(merged.fields).forEach(([key,f])=>{
  if(f?.value!=null&&f.confidence<.6)warnings.push(`${labels[key]?.[0]||key} tiene confianza baja y conviene revisarlo.`);
 });
 const unique=[...new Set(warnings)];
 if(!unique.length){els.reviewCard.hidden=true;return}
 els.reviewBadge.textContent=`${unique.length} aviso${unique.length===1?"":"s"}`;
 els.reviewList.innerHTML=unique.map(x=>`<div class="warning">${x}</div>`).join("");
 els.reviewCard.hidden=false;
}

function renderDebug(results){
 els.debug.innerHTML=results.map((r,i)=>{
  const found=Object.entries(r.parsed.data).filter(([,v])=>v!=null).map(([k,v])=>`<span class="debug-chip">${labels[k]?.[0]||k}: ${v}</span>`).join("");
  const zones=Object.entries(r.zone_confidence).map(([k,v])=>`${k} ${v}%`).join(" · ");
  return `<article class="debug-item"><h3>Captura ${i+1}</h3><div class="debug-meta">${r.file} · plantilla ${r.parsed.screen?.type||"unknown"} · ${zones}</div><div class="debug-fields">${found||'<span class="debug-chip">Sin campos detectados</span>'}</div></article>`
 }).join("");
 els.debugCard.hidden=false;
}

async function run(files){
 reset();
 if(!window.Tesseract?.recognize)throw new Error("Tesseract.js no se ha cargado.");
 if(!window.GarminParser?.parseZones||!window.GarminParser?.merge)throw new Error("El motor Garmin V3 no se ha cargado.");
 setStatus("Procesando",`Preparando ${files.length} capturas…`,"working");
 const results=[];
 for(let i=0;i<files.length;i++){results.push(await readOne(files[i],i,files.length));setProgress(i+1,files.length)}
 const merged=window.GarminParser.merge(results.map(r=>r.parsed));
 renderMerged(merged);renderReview(merged);renderDebug(results);
 els.ocr.textContent=results.map((r,i)=>[
  `===== CAPTURA ${i+1}: ${r.file} =====`,
  `--- CABECERA ---\n${r.zones.header||"[Sin texto]"}`,
  `--- CUERPO ---\n${r.zones.body||"[Sin texto]"}`,
  `--- MÉTRICAS ---\n${r.zones.metrics||"[Sin texto]"}`
 ].join("\n")).join("\n\n");
 els.resultCard.hidden=false;
 setProgress(1,1);setStatus("Completado",`${files.length} capturas procesadas. ${merged.found} campos fusionados.`,"success");
 els.metricsCard.scrollIntoView({behavior:"smooth",block:"start"});
}

els.input.addEventListener("change",async()=>{
 const files=[...(els.input.files||[])].filter(f=>f.type.startsWith("image/"));
 if(!files.length)return;
 urls.forEach(URL.revokeObjectURL);urls=[];els.preview.innerHTML="";
 files.forEach(f=>{
  const u=URL.createObjectURL(f);urls.push(u);
  els.preview.insertAdjacentHTML("beforeend",`<div class="preview-item"><img src="${u}" alt=""><small>${f.name}</small></div>`)
 });
 els.fileInfo.textContent=`${files.length} captura${files.length===1?"":"s"} seleccionada${files.length===1?"":"s"}.`;
 try{await run(files)}catch(e){
  console.error(e);setStatus("Error","No se pudo completar el proceso.","error");
  els.error.textContent=errorText(e);els.errorCard.hidden=false;els.errorCard.scrollIntoView({behavior:"smooth"})
 }
});

async function copy(button,text){
 try{await navigator.clipboard.writeText(text||"");const old=button.textContent;button.textContent="Copiado";setTimeout(()=>button.textContent=old,1400)}
 catch{button.textContent="No se pudo copiar"}
}
$("copyButton").addEventListener("click",e=>copy(e.currentTarget,els.ocr.textContent));
$("copyJsonButton").addEventListener("click",e=>copy(e.currentTarget,els.json.textContent));
els.toggle.addEventListener("click",()=>{const hidden=els.debug.hidden;els.debug.hidden=!hidden;els.toggle.textContent=hidden?"Ocultar":"Mostrar"});
})();