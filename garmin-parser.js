(function(global){
  'use strict';

  const FIELD_DEFS = {
    distance: { label:'Distancia' },
    duration: { label:'Tiempo' },
    pace: { label:'Ritmo medio' },
    avgHeartRate: { label:'FC media' },
    maxHeartRate: { label:'FC máxima' },
    cadence: { label:'Cadencia media' },
    calories: { label:'Calorías' },
    temperature: { label:'Temperatura' },
    avgPower: { label:'Potencia media' },
    totalAscent: { label:'Ascenso total' },
    trainingEffectAerobic: { label:'Training Effect aeróbico' },
    trainingEffectAnaerobic: { label:'Training Effect anaeróbico' },
    staminaStart: { label:'Stamina inicial' },
    staminaEnd: { label:'Stamina final' },
    strideLength: { label:'Longitud de zancada' },
    verticalOscillation: { label:'Oscilación vertical' },
    groundContactTime: { label:'Tiempo de contacto con el suelo' }
  };

  function normalizeText(text){
    return String(text || '')
      .replace(/\r/g,'\n')
      .replace(/[‐‑–—]/g,'-')
      .replace(/\u00a0/g,' ')
      .replace(/[ \t]+/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }

  function fold(text){
    return normalizeText(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function numeric(v){
    const n=parseFloat(String(v).replace(',','.').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : NaN;
  }
  function between(v,min,max){ const n=numeric(v); return Number.isFinite(n)&&n>=min&&n<=max; }
  function dec(v){ return String(v).replace(',','.'); }
  function validPace(v){
    const m=String(v).match(/(\d{1,2}):(\d{2})/);
    return !!m && +m[1]>=1 && +m[1]<=30 && +m[2]<60;
  }
  function result(value,raw,confidence,method){ return {value,raw,confidence,method}; }
  function empty(label){ return {value:null,raw:null,confidence:0,method:null,label}; }

  function firstValid(text,patterns,validator,formatter,confidence,method){
    for(const p of patterns){
      const m=text.match(p);
      if(!m) continue;
      const raw=String(m[1]||'').trim();
      if(!raw || !validator(raw)) continue;
      return result(formatter(raw),raw,confidence,method);
    }
    return null;
  }

  function scoreBrand(text){
    const t=fold(text);
    let score=0;
    const strong=['garmin','training effect','stamina','beneficio principal','dinamica de carrera','body battery'];
    const medium=['ritmo medio','frecuencia cardiaca media','cadencia media','potencia media','ascenso total','tiempo de contacto'];
    strong.forEach(x=>{if(t.includes(x)) score+=3;});
    medium.forEach(x=>{if(t.includes(x)) score+=1;});
    // Firma visual típica de Garmin Connect incluso cuando el logotipo no aparece en OCR.
    if(t.includes('resumen')&&t.includes('estadisticas')&&t.includes('vueltas')&&t.includes('graficos')&&t.includes('equipo')) score+=4;
    if(t.includes('carrera')&&t.includes('anadir notas')) score+=2;
    return {brand:score>=3?'Garmin':'No identificada',score};
  }

  function parseDistance(t){
    return firstValid(t,[
      /(?:distancia|distance)\s*[:\-]?\s*([0-9]{1,3}(?:[.,][0-9]{1,3})?)\s*(?:km|m)?\b/i,
      /\b([0-9]{1,3}(?:[.,][0-9]{1,3})?)\s*(?:km|m)?\s*[\n ]{0,8}(?:distancia|distance)\b/i,
      /\b([0-9]{1,3}[.,][0-9]{1,3})\s*(?:km|m)\b/i
    ],v=>between(v,0.01,500),v=>dec(v)+' km',0.92,'contexto_etiqueta');
  }

  function parsePace(t){
    return firstValid(t,[
      /(?:ritmo medio|ritmo del recorrido|average pace|avg pace)\s*[:\-]?\s*([0-9]{1,2}:[0-9]{2})\s*(?:\/?\s*km|min\/?km)?/i,
      /\b([0-9]{1,2}:[0-9]{2})\s*(?:\/?\s*km)?[^\n]{0,20}\n?[^\n]{0,30}(?:ritmo\s*medio|ritmo del recorrido|average pace)/i,
      /\b([0-9]{1,2}:[0-9]{2})\s*(?:\/\s*km|km)\b/i
    ],validPace,v=>v.replace(/\s+/g,'')+'/km',0.9,'contexto_etiqueta');
  }

  function parseAvgHr(t){
    return firstValid(t,[
      /(?:frecuencia card[ií]aca media|fc media|frec\.?\s*card[ií]aca media|average heart rate|avg hr)\s*[:\-]?\s*([0-9]{2,3})\s*(?:ppm|bpm)?/i,
      /\b([0-9]{2,3})\s*(?:ppm|bpm)\b[^\n]{0,40}\n?[^\n]{0,50}(?:frecuencia card[ií]aca media|fc media|average heart rate)/i
    ],v=>between(v,30,240),v=>parseInt(v,10)+' ppm',0.93,'contexto_etiqueta');
  }

  function parseMaxHr(t){
    return firstValid(t,[
      /(?:frecuencia card[ií]aca m[aá]x(?:ima)?\.?|fc m[aá]xima|max hr|maximum heart rate)\s*[:\-]?\s*([0-9]{2,3})\s*(?:ppm|bpm)?/i,
      /\b([0-9]{2,3})\s*(?:ppm|bpm)\b[^\n]{0,40}\n?[^\n]{0,50}(?:frecuencia card[ií]aca m[aá]x|fc m[aá]xima)/i
    ],v=>between(v,30,250),v=>parseInt(v,10)+' ppm',0.93,'contexto_etiqueta');
  }

  function parseDuration(t){
    return firstValid(t,[
      /(?:tiempo de carrera|tiempo total|tiempo transcurrido|duraci[oó]n|elapsed time|duration)\s*[:\-]?\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i,
      /\b([0-9]{1,2}:[0-9]{2}:[0-9]{2})\b[^\n]{0,40}\n?[^\n]{0,40}(?:tiempo total|tiempo de carrera|duration)/i
    ],v=>/^\d{1,2}:\d{2}(?::\d{2})?$/.test(v),v=>v,0.92,'contexto_etiqueta');
  }

  function parseCadence(t){
    return firstValid(t,[
      /(?:cadencia media(?: de carrera)?|average cadence|avg cadence)\s*[:\-]?\s*([0-9]{2,3})\s*(?:ppm|spm)?/i,
      /\b([0-9]{2,3})\s*(?:ppm|spm)\b[^\n]{0,35}\n?[^\n]{0,45}(?:cadencia media)/i
    ],v=>between(v,50,250),v=>parseInt(v,10)+' ppm',0.92,'contexto_etiqueta');
  }

  function parseCalories(t){
    return firstValid(t,[
      /(?:calor[ií]as activas|calor[ií]as totales|calories)\s*[:\-]?\s*([0-9]{1,5})\s*(?:kcal)?/i,
      /\b([0-9]{1,5})\s*(?:kcal)?\b[^\n]{0,30}\n?[^\n]{0,40}(?:calor[ií]as activas|calor[ií]as totales)/i
    ],v=>between(v,1,20000),v=>parseInt(v,10)+' kcal',0.88,'contexto_etiqueta');
  }

  function parseGeneric(t,patterns,min,max,unit,decimals){
    return firstValid(t,patterns,v=>between(v,min,max),v=>{
      const n=decimals?dec(v):String(parseInt(v,10)); return n+(unit?' '+unit:'');
    },0.91,'regex_etiqueta');
  }

  function parse(text){
    const cleaned=normalizeText(text);
    const brand=scoreBrand(cleaned);
    const fields={};

    fields.distance=parseDistance(cleaned);
    fields.duration=parseDuration(cleaned);
    fields.pace=parsePace(cleaned);
    fields.avgHeartRate=parseAvgHr(cleaned);
    fields.maxHeartRate=parseMaxHr(cleaned);
    fields.cadence=parseCadence(cleaned);
    fields.calories=parseCalories(cleaned);
    fields.temperature=parseGeneric(cleaned,[/(?:temperatura|temperature)\s*[:\-]?\s*(-?[0-9]{1,2}(?:[.,][0-9])?)\s*°?\s*c/i],-40,70,'°C',true);
    fields.avgPower=parseGeneric(cleaned,[/(?:potencia media|average power|avg power)\s*[:\-]?\s*([0-9]{2,4})\s*w/i],20,2500,'W',false);
    fields.totalAscent=parseGeneric(cleaned,[/(?:ascenso total|desnivel positivo|total ascent|elevation gain)\s*[:\-]?\s*([0-9]{1,5})\s*m/i],0,20000,'m',false);
    fields.trainingEffectAerobic=parseGeneric(cleaned,[/(?:training effect\s*)?(?:aer[oó]bico)\s*[:\-]?\s*([0-5](?:[.,][0-9])?)/i],0,5,'',true);
    fields.trainingEffectAnaerobic=parseGeneric(cleaned,[/(?:training effect\s*)?(?:anaer[oó]bico)\s*[:\-]?\s*([0-5](?:[.,][0-9])?)/i],0,5,'',true);
    fields.staminaStart=parseGeneric(cleaned,[/(?:stamina inicial|potencial inicial|starting stamina)\s*[:\-]?\s*([0-9]{1,3})\s*%/i],0,100,'%',false);
    fields.staminaEnd=parseGeneric(cleaned,[/(?:stamina final|potencial final|ending stamina)\s*[:\-]?\s*([0-9]{1,3})\s*%/i],0,100,'%',false);
    fields.strideLength=parseGeneric(cleaned,[/(?:longitud(?: media)? de zancada|stride length)\s*[:\-]?\s*([0-9](?:[.,][0-9]{1,2})?)\s*m/i],0.2,3.5,'m',true);
    fields.verticalOscillation=parseGeneric(cleaned,[/(?:oscilaci[oó]n vertical(?: media)?|vertical oscillation)\s*[:\-]?\s*([0-9]{1,2}(?:[.,][0-9])?)\s*cm/i],1,30,'cm',true);
    fields.groundContactTime=parseGeneric(cleaned,[/(?:tiempo(?: medio)? de cont\.?\s*suelo|tiempo de contacto con el suelo|ground contact time)\s*[:\-]?\s*([0-9]{2,4})\s*ms/i],80,700,'ms',false);

    for(const [key,def] of Object.entries(FIELD_DEFS)){
      if(!fields[key]) fields[key]=empty(def.label);
      else fields[key].label=def.label;
    }

    const foundCount=Object.values(fields).filter(x=>x.value!==null).length;
    const warnings=[];
    if(cleaned.length<20) warnings.push('La captura contiene muy poco texto legible.');
    if(foundCount===0) warnings.push('No se ha encontrado ninguna métrica. El parser no inventa datos.');
    if(brand.brand!=='Garmin') warnings.push('La marca no puede confirmarse con el texto disponible.');
    if(foundCount>0 && brand.brand==='Garmin') warnings.push('Lectura contextual activa: el parser admite valores situados antes o después de la etiqueta.');

    return {
      platform:brand.brand==='Garmin'?'garmin':null,
      brandDetection:brand,
      rawText:cleaned,
      fields,
      summary:{found:foundCount,total:Object.keys(fields).length,characters:cleaned.length},
      warnings
    };
  }

  global.GarminParser={parse,FIELD_DEFS,normalizeText};
})(window);
