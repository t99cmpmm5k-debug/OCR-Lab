(()=>{
"use strict";
const $=id=>document.getElementById(id);
const els={
 input:$("imageInput"),fileInfo:$("fileInfo"),preview:$("previewGrid"),badge:$("statusBadge"),status:$("statusText"),
 bar:$("progressBar"),progress:$("progressText"),metricsCard:$("metricsCard"),metrics:$("metricsGrid"),
 found:$("foundBadge"),jsonCard:$("jsonCard"),json:$("jsonOutput"),resultCard:$("resultCard"),ocr:$("ocrOutput"),
 errorCard:$("errorCard"),error:$("errorOutput"),debugCard:$("debugCard"),debug:$("debugGrid"),toggle:$("toggleDebugButton")
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
function reset(){["metricsCard","jsonCard","resultCard","errorCard","debugCard"].forEach(k=>els[k].hidden=true);els.metrics.innerHTML=els.debug.innerHTML="";els.json.textContent=els.ocr.textContent=els.error.textContent="";setProgress(0,1)}
function errorText(e){return [`Nombre: ${e?.name||"Error"}`,`Mensaje: ${e?.message||String(e)}`,e?.stack?`\nStack:\n${e.stack}`:"",`\nURL: ${location.href}`,`Navegador: ${navigator.userAgent}`].filter(Boolean).join("\n")}
function canvasFromFile(file){
 return new Promise((resolve,reject)=>{
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{
   const maxWidth=1800,scale=Math.min(2,maxWidth/img.width);
   const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
   const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c)
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(`No se pudo abrir ${file.name}`))};img.src=url;
 })
}
function enhance(source,mode="gray"){
 const c=document.createElement("canvas");c.width=source.width;c.height=source.height;const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(source,0,0);
 const im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
 let sum=0;for(let i=0;i<d.length;i+=4)sum+=(d[i]+d[i+1]+d[i+2])/3;const avg=sum/(d.length/4),invert=avg<110;
 for(let i=0;i<d.length;i+=4){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(invert)g=255-g;g=(g-128)*1.55+128;g=Math.max(0,Math.min(255,g));if(mode==="binary")g=g>155?255:0;d[i]=d[i+1]=d[i+2]=g}
 ctx.putImageData(im,0,0);return c
}
async function recognize(image,onProgress){
 return window.Tesseract.recognize(image,"spa+eng",{logger:m=>{if(typeof m.progress==="number")onProgress(m.progress,m.status)}})
}
async function readOne(file,index,total){
 const base=await canvasFromFile(file),gray=enhance(base,"gray");
 let first=await recognize(gray,(p,s)=>{setProgress(index,total,p*.7);setStatus("Procesando",`Captura ${index+1}/${total}: ${s||"OCR"}`,"working")});
 let best=first;
 const text1=first?.data?.text?.trim()||"",conf1=first?.data?.confidence||0;
 if(conf1<58||text1.length<90){
  const binary=enhance(base,"binary");
  const second=await recognize(binary,(p,s)=>{setProgress(index,total,.7+p*.3);setStatus("Procesando",`Captura ${index+1}/${total}: segunda lectura`,"working")});
  const text2=second?.data?.text?.trim()||"",conf2=second?.data?.confidence||0;
  if(conf2>conf1||text2.length>text1.length*1.25)best=second;
 }
 const text=best?.data?.text?.trim()||"";
 return{file:file.name,ocr_confidence:Math.round(best?.data?.confidence||0),text,parsed:window.GarminParser.parse(text)}
}
function renderMerged(merged){
 els.metrics.innerHTML=Object.entries(merged.data).map(([key,value])=>{
  const [label,suffix]=labels[key]||[key,""],f=merged.fields[key],missing=value==null||value==="";
  return `<article class="metric"><div class="metric-label">${label}</div><div class="metric-value ${missing?"missing":""}">${missing?"No encontrado":`${value}${suffix}`}</div>${!missing?`<div class="confidence">${Math.round((f.confidence||0)*100)} % · captura ${f.capture||"-"}</div>`:""}</article>`
 }).join("");
 els.found.textContent=`${merged.found} campos`;els.metricsCard.hidden=false;
 els.json.textContent=JSON.stringify(merged,null,2);els.jsonCard.hidden=false;
}
function renderDebug(results){
 els.debug.innerHTML=results.map((r,i)=>{
  const found=Object.entries(r.parsed.data).filter(([,v])=>v!=null).map(([k,v])=>`<span class="debug-chip">${labels[k]?.[0]||k}: ${v}</span>`).join("");
  return `<article class="debug-item"><h3>Captura ${i+1}</h3><div class="debug-meta">${r.file} · ${r.parsed.screen?.type||"unknown"} · confianza OCR ${r.ocr_confidence}% · ${r.parsed.found} campos</div><div class="debug-fields">${found||'<span class="debug-chip">Sin campos detectados</span>'}</div></article>`
 }).join("");els.debugCard.hidden=false;
}
async function run(files){
 reset();
 if(!window.Tesseract?.recognize)throw new Error("Tesseract.js no se ha cargado.");
 if(!window.GarminParser?.parse||!window.GarminParser?.merge)throw new Error("El parser Garmin V3.1 no se ha cargado.");
 setStatus("Procesando",`Preparando ${files.length} capturas…`,"working");
 const results=[];
 for(let i=0;i<files.length;i++){results.push(await readOne(files[i],i,files.length));setProgress(i+1,files.length)}
 const merged=window.GarminParser.merge(results.map(r=>r.parsed));
 renderMerged(merged);renderDebug(results);
 els.ocr.textContent=results.map((r,i)=>`===== CAPTURA ${i+1}: ${r.file} =====\n${r.text||"[Sin texto]"}`).join("\n\n");
 els.resultCard.hidden=false;setProgress(1,1);setStatus("Completado",`${files.length} capturas procesadas. ${merged.found} campos fusionados.`,"success");
 els.metricsCard.scrollIntoView({behavior:"smooth",block:"start"});
}
els.input.addEventListener("change",async()=>{
 const files=[...(els.input.files||[])].filter(f=>f.type.startsWith("image/"));
 if(!files.length)return;
 urls.forEach(URL.revokeObjectURL);urls=[];els.preview.innerHTML="";
 files.forEach(f=>{const u=URL.createObjectURL(f);urls.push(u);els.preview.insertAdjacentHTML("beforeend",`<div class="preview-item"><img src="${u}" alt=""><small>${f.name}</small></div>`)});
 els.fileInfo.textContent=`${files.length} captura${files.length===1?"":"s"} seleccionada${files.length===1?"":"s"}.`;
 try{await run(files)}catch(e){console.error(e);setStatus("Error","No se pudo completar el proceso.","error");els.error.textContent=errorText(e);els.errorCard.hidden=false;els.errorCard.scrollIntoView({behavior:"smooth"})}
});
async function copy(button,text){try{await navigator.clipboard.writeText(text||"");const old=button.textContent;button.textContent="Copiado";setTimeout(()=>button.textContent=old,1400)}catch{button.textContent="No se pudo copiar"}}
$("copyButton").addEventListener("click",e=>copy(e.currentTarget,els.ocr.textContent));
$("copyJsonButton").addEventListener("click",e=>copy(e.currentTarget,els.json.textContent));
els.toggle.addEventListener("click",()=>{const hidden=els.debug.hidden;els.debug.hidden=!hidden;els.toggle.textContent=hidden?"Ocultar":"Mostrar"});
})();