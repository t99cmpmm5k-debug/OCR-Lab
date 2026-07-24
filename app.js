(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const elements={fileInput:$('fileInput'),uploadButton:$('uploadButton'),preview:$('preview'),statusText:$('statusText'),progressBar:$('progressBar'),progressText:$('progressText'),brandText:$('brandText'),confidenceText:$('confidenceText'),timeText:$('timeText'),metrics:$('metrics'),warnings:$('warnings'),rawText:$('rawText'),jsonOutput:$('jsonOutput'),characterCount:$('characterCount'),copyTextButton:$('copyTextButton'),copyJsonButton:$('copyJsonButton'),parserBadge:$('parserBadge')};
  let lastText=''; let lastJson={};

  function renderEmpty(){
    const defs=window.GarminParser.FIELD_DEFS;
    elements.metrics.innerHTML=Object.entries(defs).map(([,d])=>`<div class="metric"><span class="metric-label">${escapeHtml(d.label)}</span><span class="metric-value missing">No encontrado</span></div>`).join('');
    elements.parserBadge.textContent=`Garmin parser ${window.GarminParser.VERSION}`;
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function setProgress(value){elements.progressBar.value=value;elements.progressText.textContent=`${value} %`;}
  function normalizedJson(parsed){
    const metrics={};
    for(const [key,field] of Object.entries(parsed.fields)) metrics[key]=field.value;
    return {platform:parsed.platform,parser_version:parsed.parserVersion,brand_score:parsed.brandDetection.score,metrics,summary:parsed.summary,warnings:parsed.warnings};
  }
  function renderResult(parsed,ocr){
    elements.brandText.textContent=parsed.brandDetection.brand;
    elements.confidenceText.textContent=`${ocr.confidence} %`;
    elements.timeText.textContent=`${(ocr.milliseconds/1000).toFixed(1)} s`;
    elements.characterCount.textContent=`${parsed.summary.characters} caracteres`;
    elements.metrics.innerHTML=Object.entries(parsed.fields).map(([,field])=>{
      const found=field.value!==null;
      const meta=found?`<small class="metric-meta">${Math.round(field.confidence*100)} % · ${escapeHtml(field.method)}</small>`:'';
      return `<div class="metric"><span class="metric-label">${escapeHtml(field.label)}</span><span class="metric-value${found?'':' missing'}">${found?escapeHtml(field.value):'No encontrado'}${meta}</span></div>`;
    }).join('');
    if(parsed.warnings.length){elements.warnings.hidden=false;elements.warnings.innerHTML=parsed.warnings.map(x=>`<div>• ${escapeHtml(x)}</div>`).join('');}else elements.warnings.hidden=true;
    lastText=parsed.rawText; lastJson=normalizedJson(parsed);
    elements.rawText.textContent=lastText||'(El OCR no devolvió texto)';
    elements.jsonOutput.textContent=JSON.stringify(lastJson,null,2);
    elements.copyTextButton.disabled=!lastText; elements.copyJsonButton.disabled=false;
  }
  async function processFile(file){
    if(!file||!file.type.startsWith('image/')){elements.statusText.textContent='Selecciona un archivo de imagen válido';return;}
    elements.preview.src=URL.createObjectURL(file);elements.preview.hidden=false;
    elements.uploadButton.disabled=true;elements.fileInput.disabled=true;elements.statusText.textContent='Preparando OCR…';
    elements.brandText.textContent='Analizando';elements.confidenceText.textContent='—';elements.timeText.textContent='—';setProgress(0);
    elements.rawText.textContent='Procesando…';elements.jsonOutput.textContent='{}';elements.warnings.hidden=true;
    try{
      const ocr=await window.OCRWorker.recognize(file,(progress)=>{setProgress(progress);elements.statusText.textContent=`Reconociendo texto… ${progress} %`;});
      setProgress(100);elements.statusText.textContent='Lectura terminada';
      const parsed=window.GarminParser.parse(ocr.text);renderResult(parsed,ocr);
    }catch(error){console.error(error);elements.statusText.textContent='Error durante la lectura';elements.brandText.textContent='—';elements.rawText.textContent=error?.message||String(error);elements.warnings.hidden=false;elements.warnings.textContent='No se ha guardado ningún dato.';}
    finally{elements.uploadButton.disabled=false;elements.fileInput.disabled=false;elements.fileInput.value='';}
  }
  async function copy(value,button){try{await navigator.clipboard.writeText(value);const old=button.textContent;button.textContent='Copiado';setTimeout(()=>button.textContent=old,1200);}catch{alert('No se pudo copiar automáticamente.');}}
  elements.uploadButton.addEventListener('click',()=>elements.fileInput.click());
  elements.fileInput.addEventListener('change',event=>processFile(event.target.files?.[0]));
  elements.copyTextButton.addEventListener('click',()=>copy(lastText,elements.copyTextButton));
  elements.copyJsonButton.addEventListener('click',()=>copy(JSON.stringify(lastJson,null,2),elements.copyJsonButton));
  renderEmpty();
  const test=window.GarminParser.selfTest();if(!test.ok){elements.statusText.textContent='Error interno del parser';console.error('Garmin parser self-test failed',test);}
})();
