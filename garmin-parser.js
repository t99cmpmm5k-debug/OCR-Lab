(function(global){
  'use strict';

  const VERSION = '4.0.0';
  const FIELD_DEFS = {
    distance:{label:'Distancia'}, duration:{label:'Tiempo'}, pace:{label:'Ritmo medio'},
    avgHeartRate:{label:'FC media'}, maxHeartRate:{label:'FC máxima'}, cadence:{label:'Cadencia media'},
    calories:{label:'Calorías'}, temperature:{label:'Temperatura'}, avgPower:{label:'Potencia media'},
    totalAscent:{label:'Ascenso total'}, trainingEffectAerobic:{label:'Training Effect aeróbico'},
    trainingEffectAnaerobic:{label:'Training Effect anaeróbico'}, staminaStart:{label:'Stamina inicial'},
    staminaEnd:{label:'Stamina final'}, strideLength:{label:'Longitud de zancada'},
    verticalOscillation:{label:'Oscilación vertical'}, groundContactTime:{label:'Tiempo de contacto con el suelo'}
  };

  function normalizeText(text){
    return String(text||'').replace(/\r/g,'\n').replace(/[‐‑–—]/g,'-').replace(/\u00a0/g,' ')
      .replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  }
  function fold(text){return normalizeText(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function linesOf(text){return normalizeText(text).split('\n').map(x=>x.trim()).filter(Boolean);}
  function n(v){const x=parseFloat(String(v).replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:NaN;}
  function inRange(v,a,b){const x=n(v);return Number.isFinite(x)&&x>=a&&x<=b;}
  function out(value,raw,confidence,method){return {value,raw,confidence,method};}
  function empty(label){return {value:null,raw:null,confidence:0,method:null,label};}
  function closeWindow(lines,index,radius=2){return lines.slice(Math.max(0,index-radius),Math.min(lines.length,index+radius+1)).join(' | ');}
  function findLabelIndexes(lines,aliases){
    const a=aliases.map(fold); const hits=[];
    lines.forEach((line,i)=>{const f=fold(line); if(a.some(x=>f.includes(x))) hits.push(i);});
    return hits;
  }
  function candidatesAround(lines,index,regex,radius=2){
    const result=[];
    for(let i=Math.max(0,index-radius);i<=Math.min(lines.length-1,index+radius);i++){
      let m; const re=new RegExp(regex.source,regex.flags.includes('g')?regex.flags:regex.flags+'g');
      while((m=re.exec(lines[i]))){result.push({raw:m[1]||m[0],line:i,distance:Math.abs(i-index),context:closeWindow(lines,index,radius)});if(m[0]==='')re.lastIndex++;}
    }
    return result.sort((a,b)=>a.distance-b.distance);
  }
  function contextual(lines,aliases,regex,validator,formatter,unitHint){
    for(const idx of findLabelIndexes(lines,aliases)){
      const cand=candidatesAround(lines,idx,regex,2).find(c=>validator(c.raw));
      if(cand){
        const confidence=cand.distance===0?0.97:cand.distance===1?0.94:0.88;
        return out(formatter(cand.raw),cand.raw,confidence,'contexto_bidireccional');
      }
    }
    return null;
  }
  function direct(text,patterns,validator,formatter,confidence=0.85){
    for(const re of patterns){const m=text.match(re); if(m&&validator(m[1])) return out(formatter(m[1]),m[1],confidence,'patron_directo');}
    return null;
  }
  function scoreBrand(text){
    const t=fold(text); let score=0;
    ['garmin','training effect','stamina','beneficio principal','dinamica de carrera','body battery'].forEach(x=>{if(t.includes(x))score+=3;});
    ['ritmo medio','frecuencia cardiaca media','cadencia media','potencia media','ascenso total','tiempo de contacto'].forEach(x=>{if(t.includes(x))score+=1;});
    if(t.includes('resumen')&&t.includes('estadisticas')&&t.includes('vueltas')&&t.includes('graficos')&&t.includes('equipo'))score+=5;
    if(t.includes('carrera')&&t.includes('anadir notas'))score+=2;
    return {brand:score>=3?'Garmin':'No identificada',score};
  }

  function parseDistance(text,lines){
    const c=contextual(lines,['distancia','distance'],/\b(\d{1,3}[.,]\d{1,3}|\d{1,3})\s*(?:km|m)?\b/i,
      v=>inRange(v,0.01,500),v=>n(v).toFixed(String(v).includes(',')||String(v).includes('.')?2:0).replace('.',',')+' km');
    return c||direct(text,[/\b(\d{1,3}[.,]\d{1,3})\s*(?:km|m)\b/i],v=>inRange(v,.01,500),v=>String(v).replace('.',',')+' km',0.78);
  }
  function parsePace(text,lines){
    const valid=v=>{const m=String(v).match(/(\d{1,2}):(\d{2})/);return !!m&&+m[1]>=1&&+m[1]<=30&&+m[2]<60;};
    const fmt=v=>String(v).match(/\d{1,2}:\d{2}/)[0]+'/km';
    return contextual(lines,['ritmo medio','ritmo del recorrido','average pace','avg pace'],/\b(\d{1,2}:\d{2})\s*(?:\/?\s*km)?\b/i,valid,fmt)
      ||direct(text,[/\b(\d{1,2}:\d{2})\s*(?:\/\s*km|km)\b/i],valid,fmt,0.8);
  }
  function parseHr(text,lines,max){
    const aliases=max?['frecuencia cardiaca max','frecuencia cardíaca máx','fc maxima','maximum heart rate','max hr']:
      ['frecuencia cardiaca media','frecuencia cardíaca media','fc media','average heart rate','avg hr'];
    return contextual(lines,aliases,/\b(\d{2,3})\s*(?:ppm|bpm)\b/i,v=>inRange(v,30,max?250:240),v=>parseInt(v,10)+' ppm');
  }
  function parseDuration(text,lines){
    const valid=v=>/^\d{1,2}:\d{2}(?::\d{2})?$/.test(v);
    return contextual(lines,['tiempo total','tiempo de carrera','tiempo transcurrido','duracion','duration','elapsed time'],/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/i,valid,v=>v);
  }
  function parseSimple(lines,aliases,regex,min,max,unit,decimals=false){
    return contextual(lines,aliases,regex,v=>inRange(v,min,max),v=>{
      const x=n(v); return (decimals?String(x).replace('.',','):String(Math.round(x)))+(unit?' '+unit:'');
    });
  }

  function parse(text){
    const cleaned=normalizeText(text), lines=linesOf(cleaned), brand=scoreBrand(cleaned), fields={};
    fields.distance=parseDistance(cleaned,lines);
    fields.duration=parseDuration(cleaned,lines);
    fields.pace=parsePace(cleaned,lines);
    fields.avgHeartRate=parseHr(cleaned,lines,false);
    fields.maxHeartRate=parseHr(cleaned,lines,true);
    fields.cadence=parseSimple(lines,['cadencia media','cadencia media de carrera','average cadence'],/\b(\d{2,3})\s*(?:ppm|spm)\b/i,50,250,'ppm');
    fields.calories=parseSimple(lines,['calorias activas','calorías activas','calorias totales','calorías totales','calories'],/\b(\d{1,5})\s*(?:kcal)?\b/i,1,20000,'kcal');
    fields.temperature=parseSimple(lines,['temperatura','temperature'],/(-?\d{1,2}(?:[.,]\d)?)\s*°?\s*c\b/i,-40,70,'°C',true);
    fields.avgPower=parseSimple(lines,['potencia media','average power','avg power'],/\b(\d{2,4})\s*w\b/i,20,2500,'W');
    fields.totalAscent=parseSimple(lines,['ascenso total','desnivel positivo','total ascent','elevation gain'],/\b(\d{1,5})\s*m\b/i,0,20000,'m');
    fields.trainingEffectAerobic=parseSimple(lines,['aerobico','aeróbico'],/\b([0-5](?:[.,]\d)?)\b/i,0,5,'',true);
    fields.trainingEffectAnaerobic=parseSimple(lines,['anaerobico','anaeróbico'],/\b([0-5](?:[.,]\d)?)\b/i,0,5,'',true);
    fields.staminaStart=parseSimple(lines,['stamina inicial','potencial inicial','starting stamina'],/\b(\d{1,3})\s*%\b/i,0,100,'%');
    fields.staminaEnd=parseSimple(lines,['stamina final','potencial final','ending stamina'],/\b(\d{1,3})\s*%\b/i,0,100,'%');
    fields.strideLength=parseSimple(lines,['longitud media de zancada','longitud de zancada','stride length'],/\b([0-9](?:[.,]\d{1,2})?)\s*m\b/i,.2,3.5,'m',true);
    fields.verticalOscillation=parseSimple(lines,['oscilacion vertical','oscilación vertical'],/\b(\d{1,2}(?:[.,]\d)?)\s*cm\b/i,1,30,'cm',true);
    fields.groundContactTime=parseSimple(lines,['tiempo medio de cont. suelo','tiempo de contacto con el suelo','ground contact time'],/\b(\d{2,4})\s*ms\b/i,80,700,'ms');

    for(const [k,d] of Object.entries(FIELD_DEFS)){if(!fields[k])fields[k]=empty(d.label);else fields[k].label=d.label;}
    const found=Object.values(fields).filter(x=>x.value!==null).length;
    const warnings=[];
    if(cleaned.length<20)warnings.push('La captura contiene muy poco texto legible.');
    if(found===0)warnings.push('No se ha encontrado ninguna métrica. El parser no inventa datos.');
    if(brand.brand!=='Garmin')warnings.push('La marca no puede confirmarse con el texto disponible.');
    if(found>0)warnings.push('Parser V4: búsqueda contextual antes y después de cada etiqueta.');
    return {parserVersion:VERSION,platform:brand.brand==='Garmin'?'garmin':null,brandDetection:brand,rawText:cleaned,fields,
      summary:{found,total:Object.keys(fields).length,characters:cleaned.length},warnings};
  }

  function selfTest(){
    const sample=`Resumen Estadísticas Vueltas\nGráficos Equipo\nPuerto Lumbreras - Rodaje\nAñadir notas...\n7,02 m\nDistancia\n147 ppm € 5:42 km €)\nFrecuencia cardiaca media Ritmo\nmedio\nTiempo total Calorías totales`;
    const r=parse(sample);
    return {ok:r.brandDetection.brand==='Garmin'&&r.fields.distance.value==='7,02 km'&&r.fields.pace.value==='5:42/km'&&r.fields.avgHeartRate.value==='147 ppm',result:r};
  }

  global.GarminParser={VERSION,parse,selfTest,FIELD_DEFS,normalizeText};
})(window);
