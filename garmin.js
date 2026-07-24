(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.GarminParser=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const MONTHS="ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic";
  const cleanText=input=>String(input||"").replace(/\r/g,"\n").replace(/[‐‑‒–—]/g,"-").replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
  const normalize=input=>cleanText(input).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const linesOf=text=>cleanText(text).split("\n").map(s=>s.trim()).filter(Boolean);
  const num=value=>{if(value==null)return null;const n=Number(String(value).replace(",",".").replace(/[^0-9.\-]/g,""));return Number.isFinite(n)?n:null};
  const pace=value=>{const m=String(value||"").match(/\b([0-9]{1,2})\s*[:.]\s*([0-5][0-9])\b/);return m?`${Number(m[1])}:${m[2]}`:null};
  const duration=value=>{const s=String(value||"");const h=s.match(/\b([0-9]{1,2})\s*:\s*([0-5][0-9])\s*:\s*([0-5][0-9])\b/);if(h)return `${Number(h[1])}:${h[2]}:${h[3]}`;const m=s.match(/\b([0-9]{1,3})\s*:\s*([0-5][0-9])\b/);return m?`${Number(m[1])}:${m[2]}`:null};
  function around(lines,labelRegex,valueRegex,radius=2){
    for(let i=0;i<lines.length;i++){
      if(!labelRegex.test(normalize(lines[i])))continue;
      const candidates=[lines[i]];
      for(let d=1;d<=radius;d++){if(i-d>=0)candidates.push(lines[i-d]);if(i+d<lines.length)candidates.push(lines[i+d])}
      for(const source of candidates){const match=source.match(valueRegex);if(match)return{match,source,label:lines[i]}}
    }
    return null;
  }
  const first=(text,regex)=>{const m=cleanText(text).match(regex);return m?{match:m,source:m[0]}:null};
  const field=(value,source,confidence)=>value==null?{value:null,source:null,confidence:0}:{value,source,confidence};
  const UI_NOISE = /(?:deteccion de carrera|carrera\/caminar|caminar ayuda|ayuda|configuracion|dispositivo|editar|compartir|guardar|eliminar|mapa|graficos|equipo|vueltas|estadisticas|resumen|anadir notas)/i;

  function summaryEvidence(text){
    const raw=cleanText(text);
    const n=normalize(raw);
    const lines=linesOf(raw);

    const hasAddNotes=/anadir notas|añadir notas/.test(n);
    const hasDate=new RegExp(`\\b[0-3]?[0-9]\\s+(${MONTHS})(?:\\s+20[0-9]{2})?\\b`,"i").test(raw);
    const hasActivityTitle=lines.some(line=>{
      const safe=normalize(line);
      return /\s[-–—]\s/.test(line)
        && /\b(rodaje|carrera|running|trail|tempo|series|intervalos|recuperacion|entrenamiento)\b/.test(safe)
        && !UI_NOISE.test(safe);
    });
    const hasSummaryTabs=/resumen/.test(n)&&/estadisticas/.test(n)&&/vueltas/.test(n);
    const hasLocationTitle=lines.some(line=>/\s[-–—]\s/.test(line)&&line.length>=8&&line.length<=75&&!UI_NOISE.test(normalize(line)));

    let score=0;
    if(hasAddNotes)score+=5;
    if(hasDate)score+=4;
    if(hasActivityTitle)score+=5;
    if(hasSummaryTabs)score+=1;
    if(hasLocationTitle)score+=2;

    return {score,hasAddNotes,hasDate,hasActivityTitle,hasSummaryTabs,hasLocationTitle};
  }

  function classify(text){
    const n=normalize(text);
    const summary=summaryEvidence(text);

    // Todas las capturas aportadas desde la pestaña "Estadísticas"
    // pertenecen a la misma pantalla, aunque muestren secciones diferentes.
    if(/\bestadisticas\b/.test(n) && !summary.hasAddNotes && !summary.hasDate && !summary.hasActivityTitle){
      return {
        type:"statistics",
        confidence:.98,
        scores:{summary:summary.score,statistics:10},
        summary
      };
    }

    const rules=[
      ["statistics", ["estadisticas","velocidad media","tiempo en movimiento","ritmo medio","calorias"]],
      ["heart_rate", ["frecuencia cardiaca","fc media","fc maxima","zonas de frecuencia"]],
      ["running_dynamics", ["cadencia","longitud de zancada","oscilacion vertical","tiempo de contacto"]],
      ["elevation", ["desnivel","ascenso total","descenso total","elevacion"]],
      ["training_effect", ["training effect","efecto aerobico","efecto anaerobico","carga de ejercicio"]],
      ["stamina", ["stamina","reserva de energia"]]
    ];
    const ranked=rules.map(([type,words])=>({
      type,
      score:words.reduce((sum,w)=>sum+(n.includes(w)?1:0),0)
    })).sort((a,b)=>b.score-a.score);

    // Garmin summary is identified by its own structure, not by generic metric labels.
    if(summary.score>=5){
      return {
        type:"summary",
        confidence:Math.min(.99,.62+summary.score*.035),
        scores:{summary:summary.score,...Object.fromEntries(ranked.map(x=>[x.type,x.score]))},
        summary
      };
    }

    const best=ranked[0];
    return {
      type:best.score ? best.type : "unknown",
      confidence:best.score ? Math.min(.99,.55+best.score*.1) : .25,
      scores:{summary:summary.score,...Object.fromEntries(ranked.map(x=>[x.type,x.score]))},
      summary
    };
  }

  function detectTitle(lines,screenType){
    if(screenType!=="summary") return null;
    const blocked=/^(resumen|estadisticas|vueltas|graficos|equipo|anadir notas|distancia|ritmo medio|tiempo total|calorias totales|deteccion de carrera.*|.*caminar ayuda.*)$/i;
    const candidates=lines
      .map(line=>line.replace(/\s+/g," ").trim())
      .filter(line=>line.length>=4 && line.length<=70)
      .filter(line=>!blocked.test(normalize(line)))
      .filter(line=>!UI_NOISE.test(normalize(line)))
      .filter(line=>/\b(rodaje|carrera|running|trail|tempo|series|intervalos|recuperacion|entrenamiento)\b/i.test(normalize(line)));
    const preferred=candidates.find(line=>/\s[-–—]\s/.test(line));
    const selected=(preferred||candidates[0]||null)?.replace(/\s+(yd|y d)$/i,"").trim()||null;
    if(!selected)return null;

    const safe=normalize(selected)
      .replace(/^[<‹«>›»:\s-]+/g,"")
      .replace(/[<‹«>›»:\s-]+$/g,"")
      .trim();

    // Never accept Garmin navigation labels as activity title.
    if(!safe)return null;
    if(/^(carrera|running|actividad|resumen|estadisticas|volver|atras)$/.test(safe))return null;
    if(/^carrera\s*[:>-]/.test(safe))return null;
    if(/^<\s*carrera/.test(normalize(selected)))return null;
    if(UI_NOISE.test(safe))return null;

    return selected
      .replace(/^[<‹«>›»:\s]+/g,"")
      .replace(/[<‹«>›»:\s]+$/g,"")
      .trim() || null;
  }
  function parse(text){
    const raw=cleanText(text), normalized=normalize(raw), lines=linesOf(raw), screen=classify(raw);
    const dist=around(lines,/\bdistancia\b/,/\b([0-9]{1,3}(?:[,.][0-9]{1,2})?)\s*(?:km)?\b/i,3);
    let distance=dist?num(dist.match[1]):null, distanceSource=dist?.source||null;
    if(distance==null){const m=first(raw,/\b([0-9]{1,3}[,.][0-9]{1,2})\s*(?:km)?\s*\n\s*distancia\b/i);if(m){distance=num(m.match[1]);distanceSource=m.source}}
    const avg=around(lines,/frecuencia cardiaca media|fc media|pulso medio/,/\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,3);
    const max=around(
      lines,
      /frecuencia cardiaca maxima|frec\.?\s*cardiaca\s*max\.?|fc maxima|pulso maximo/,
      /\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,
      3
    );
    const paceCtx=around(lines,/ritmo medio|ritmo promedio/,/\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)?\b/i,3);
    let avgPace=paceCtx?pace(paceCtx.match[1]):null, paceSource=paceCtx?.source||null;
    if(!avgPace){const m=first(raw,/\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)\b/i);if(m){avgPace=pace(m.match[1]);paceSource=m.source}}
    const timeCtx=around(lines,/tiempo total|duracion|tiempo transcurrido|tiempo/,/\b(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]\b/,2);
    let totalTime=timeCtx?duration(timeCtx.match[0]):null;if(totalTime===avgPace)totalTime=null;
    const calTotal=around(
      lines,
      /total de calorias quemadas|calorias totales|total calorias/,
      /\b([0-9]{2,5})\s*(?:kcal|cal)?\b/i,
      2
    );
    const calActive=around(
      lines,
      /calorias activas/,
      /\b([0-9]{2,5})\s*(?:kcal|cal)?\b/i,
      2
    );
    const calGeneric=around(
      lines,
      /calorias/,
      /\b([0-9]{2,5})\s*(?:kcal|cal)?\b/i,
      2
    );
    const cal=(calTotal||calActive||(
      calGeneric && !/reposo/.test(normalize(calGeneric.label||"")) ? calGeneric : null
    ));
    const cad=around(lines,/cadencia media|cadencia promedio|cadencia/,/\b([1-2]?[0-9]{2})\s*(?:ppm|spm|pasos\/min)?\b/i,3);
    const temp=around(lines,/temperatura media|temperatura/,/\b(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c\b/i,3);
    const elev=around(lines,/desnivel positivo|ascenso total|ganancia de altura|elevacion/,/\b([0-9]{1,5})\s*m\b/i,3);
    const date=screen.type==="summary"
      ? first(raw,new RegExp(`\\b([0-3]?[0-9])\\s+(${MONTHS})(?:\\s+(20[0-9]{2}))?\\b`,"i"))
      : null;
    const clocks=[...raw.matchAll(/\b([0-2]?[0-9]):([0-5][0-9])\b/g)]
      .map(m=>({value:`${Number(m[1])}:${m[2]}`,source:m[0],index:m.index||0}))
      .filter(x=>!avgPace||x.value!==avgPace)
      .filter(x=>screen.type==="summary" && Boolean(date));
    const title=detectTitle(lines,screen.type);let location=null,activity=null;
    if(title){
      const safeTitle=normalize(title).replace(/^[<‹«>›»:\s-]+|[<‹«>›»:\s-]+$/g,"").trim();
      if(safeTitle && !/^(carrera|running|actividad|resumen|estadisticas)$/.test(safeTitle)){
        const p=title.split(/\s+-\s+/).map(s=>s.trim()).filter(Boolean);
        if(p.length>=2){location=p[0];activity=p.slice(1).join(" - ")}
        else activity=title;
      }
    }
    const fields={
      source:field(/garmin|garmin connect|resumen\s+estadisticas\s+vueltas/i.test(normalized)?"Garmin":"Garmin probable","Diseño/texto detectado",.82),
      screen_type:field(screen.type,JSON.stringify(screen.scores),screen.confidence),
      title:field(title,title,title?.includes("-")?.92:.8),
      location:field(location,title,location?.88:0),
      activity:field(activity,title,activity?.88:0),
      date:field(date?`${Number(date.match[1])} ${date.match[2].toLowerCase()}${date.match[3]?" "+date.match[3]:""}`:null,date?.source,date?.95:0),
      time:field(clocks.at(-1)?.value||null,clocks.at(-1)?.source||null,clocks.length?.65:0),
      distance_km:field(distance,distanceSource,distance!=null?.96:0),
      avg_heart_rate_bpm:field(avg?num(avg.match[1]):null,avg?.source,avg?.98:0),
      max_heart_rate_bpm:field(max?num(max.match[1]):null,max?.source,max?.98:0),
      avg_pace_min_km:field(avgPace,paceSource,avgPace?.98:0),
      total_time:field(totalTime,timeCtx?.source,totalTime?.9:0),
      calories_kcal:field(cal?num(cal.match[1]):null,cal?.source,cal?.85:0),
      cadence_spm:field(cad?num(cad.match[1]):null,cad?.source,cad?.9:0),
      temperature_c:field(temp?num(temp.match[1]):null,temp?.source,temp?.9:0),
      elevation_gain_m:field(elev?num(elev.match[1]):null,elev?.source,elev?.9:0)
    };
    const data=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));
    return{parser:"garmin-v2.8.0",screen,found:Object.values(fields).filter(x=>x.value!=null).length,data,fields,raw_text:raw};
  }
  function merge(results){
    const mergedFields={};
    results.forEach((parsed,index)=>{
      Object.entries(parsed.fields).forEach(([key,item])=>{
        if(item.value==null)return;
        const candidate={...item,capture:index+1};
        const current=mergedFields[key];
        if(!current||candidate.confidence>current.confidence) mergedFields[key]=candidate;
      });
    });
    const allKeys=["source","screen_type","title","location","activity","date","time","distance_km","avg_heart_rate_bpm","max_heart_rate_bpm","avg_pace_min_km","total_time","calories_kcal","cadence_spm","temperature_c","elevation_gain_m"];
    allKeys.forEach(k=>{if(!mergedFields[k])mergedFields[k]=field(null,null,0)});
    const data=Object.fromEntries(allKeys.map(k=>[k,mergedFields[k].value]));
    return{parser:"garmin-v2.8.0-merge",found:Object.values(data).filter(v=>v!=null).length,data,fields:mergedFields};
  }
  return{parse,merge,classify,summaryEvidence,cleanText,normalize};
});