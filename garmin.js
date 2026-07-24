(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.GarminParser=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const MONTHS="ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic";
  const FIELD_KEYS=[
    "source","screen_type","title","location","activity","date","time",
    "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
    "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
    "temperature_c","elevation_gain_m"
  ];

  const UI_NOISE=/(?:deteccion de carrera|carrera\/caminar|caminar ayuda|ayuda|configuracion|dispositivo|editar|compartir|guardar|eliminar|mapa|graficos|equipo|vueltas|estadisticas|resumen|anadir notas|frecuencia respiratoria|altura minima|altura maxima)/i;

  const cleanText=input=>String(input||"")
    .replace(/\r/g,"\n")
    .replace(/[‐‑‒–—]/g,"-")
    .replace(/[“”]/g,'"')
    .replace(/[’]/g,"'")
    .replace(/\u00a0/g," ")
    .replace(/[ \t]+/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .trim();

  const normalize=input=>cleanText(input).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  const linesOf=text=>cleanText(text).split("\n").map(s=>s.trim()).filter(Boolean);

  const num=value=>{
    if(value==null)return null;
    const n=Number(String(value).replace(",",".").replace(/[^0-9.\-]/g,""));
    return Number.isFinite(n)?n:null;
  };

  const pace=value=>{
    const m=String(value||"").match(/\b([0-9]{1,2})\s*[:.]\s*([0-5][0-9])\b/);
    return m?`${Number(m[1])}:${m[2]}`:null;
  };

  const duration=value=>{
    const s=String(value||"");
    const h=s.match(/\b([0-9]{1,2})\s*:\s*([0-5][0-9])\s*:\s*([0-5][0-9])\b/);
    if(h)return `${Number(h[1])}:${h[2]}:${h[3]}`;
    const m=s.match(/\b([0-9]{1,3})\s*:\s*([0-5][0-9])\b/);
    return m?`${Number(m[1])}:${m[2]}`:null;
  };

  const field=(value,source,confidence,zone=null)=>value==null
    ? {value:null,source:null,confidence:0,zone:null}
    : {value,source,confidence,zone};

  const first=(text,regex)=>{
    const m=cleanText(text).match(regex);
    return m?{match:m,source:m[0]}:null;
  };

  function around(lines,labelRegex,valueRegex,radius=2){
    for(let i=0;i<lines.length;i++){
      if(!labelRegex.test(normalize(lines[i])))continue;
      const candidates=[lines[i]];
      for(let d=1;d<=radius;d++){
        if(i-d>=0)candidates.push(lines[i-d]);
        if(i+d<lines.length)candidates.push(lines[i+d]);
      }
      for(const source of candidates){
        const match=source.match(valueRegex);
        if(match)return{match,source,label:lines[i]};
      }
    }
    return null;
  }

  function classify(zones){
    const body=normalize(zones.body||zones.full||"");
    const header=normalize(zones.header||"");
    const rules=[
      ["heart_rate",["frecuencia cardiaca","fc media","fc maxima","zonas de frecuencia"]],
      ["running_dynamics",["cadencia","longitud de zancada","oscilacion vertical","tiempo de contacto"]],
      ["elevation",["desnivel","ascenso total","descenso total","elevacion","altura minima","altura maxima"]],
      ["training_effect",["training effect","efecto aerobico","efecto anaerobico","carga de ejercicio"]],
      ["stamina",["stamina","reserva de energia"]],
      ["statistics",["estadisticas","ritmo medio","velocidad media","tiempo en movimiento","calorias"]],
      ["summary",["resumen","distancia","tiempo total","ritmo medio"]]
    ];
    const ranked=rules.map(([type,words])=>({
      type,
      score:words.reduce((s,w)=>s+(body.includes(w)?1:0),0)
    })).sort((a,b)=>b.score-a.score);

    let best=ranked[0];
    if(best.score===0 && /carrera|running|rodaje|trail/.test(header)){
      best={type:"summary",score:1};
    }
    return {
      type:best.score?best.type:"unknown",
      confidence:best.score?Math.min(.99,.58+best.score*.09):.25,
      scores:Object.fromEntries(ranked.map(x=>[x.type,x.score]))
    };
  }

  function detectTitle(headerText,screenType){
    if(screenType!=="summary")return null;
    const lines=linesOf(headerText);
    const blocked=/^(?:<\s*)?(carrera|running|actividad|resumen|estadisticas|garmin|atras|volver)\s*[:>]?$/i;

    const candidates=lines
      .map(x=>x.replace(/^[<‹«]\s*/,"").replace(/\s*[>›»]$/,"").trim())
      .filter(x=>x.length>=5 && x.length<=65)
      .filter(x=>!blocked.test(normalize(x)))
      .filter(x=>!UI_NOISE.test(normalize(x)))
      .filter(x=>!/\b\d{1,2}:\d{2}\b/.test(x))
      .filter(x=>!/\b\d+(?:[,.]\d+)?\s*(?:km|ppm|kcal|m)\b/i.test(x));

    const withSeparator=candidates.find(x=>/\s[-–—]\s/.test(x));
    const sports=candidates.find(x=>/\b(rodaje|carrera|running|trail|tempo|series|intervalos|recuperacion|entrenamiento)\b/i.test(normalize(x)));

    // A navigation label such as "< Carrera :" must never be accepted.
    const picked=withSeparator||sports||null;
    if(!picked)return null;
    const n=normalize(picked);
    if(n==="carrera"||n.startsWith("carrera :")||n.startsWith("< carrera"))return null;
    return picked;
  }

  function parseZones(zones){
    const full=cleanText(zones.full||"");
    const header=cleanText(zones.header||"");
    const body=cleanText(zones.body||full);
    const metrics=cleanText(zones.metrics||body);
    const combined=[header,body,metrics,full].filter(Boolean).join("\n");
    const normalized=normalize(combined);
    const lines=linesOf(metrics);
    const screen=classify({header,body,full});

    const dist=around(lines,/\bdistancia\b/,/\b([0-9]{1,3}(?:[,.][0-9]{1,2})?)\s*(?:km)?\b/i,3)
      || first(metrics,/\b([0-9]{1,3}[,.][0-9]{1,2})\s*km\b/i);

    const avg=around(lines,/frecuencia cardiaca media|fc media|pulso medio/,/\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,3);
    const max=around(lines,/frecuencia cardiaca maxima|fc maxima|pulso maximo/,/\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,3);

    const paceCtx=around(lines,/ritmo medio|ritmo promedio/,/\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)?\b/i,3);
    const timeCtx=around(lines,/tiempo total|duracion|tiempo transcurrido|tiempo en movimiento/,/\b(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]\b/,3);
    const cal=around(lines,/calorias totales|calorias/,/\b([0-9]{2,5})\s*(?:kcal|cal)?\b/i,3);
    const cad=around(lines,/cadencia media|cadencia promedio|cadencia/,/\b([1-2]?[0-9]{2})\s*(?:ppm|spm|pasos\/min)?\b/i,3);
    const temp=around(lines,/temperatura media|temperatura/,/\b(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c\b/i,3);
    const elev=around(lines,/desnivel positivo|ascenso total|ganancia de altura|elevacion/,/\b([0-9]{1,5})\s*m\b/i,3);

    const date=first(header||body,new RegExp(`\\b([0-3]?[0-9])\\s+(${MONTHS})(?:\\s+(20[0-9]{2}))?\\b`,"i"));

    // Time is accepted only from the content header and only if a date is also present.
    const timeMatches=[...(header||"").matchAll(/\b([0-2]?[0-9]):([0-5][0-9])\b/g)]
      .map(m=>({value:`${Number(m[1])}:${m[2]}`,source:m[0]}));
    const activityTime=date&&timeMatches.length?timeMatches.at(-1):null;

    const title=detectTitle(header,screen.type);
    let location=null,activity=null;
    if(title){
      const parts=title.split(/\s+-\s+/).map(s=>s.trim()).filter(Boolean);
      if(parts.length>=2){location=parts[0];activity=parts.slice(1).join(" - ");}
      else activity=title;
    }

    const distance=dist?num(dist.match[1]):null;
    const avgPace=paceCtx?pace(paceCtx.match[1]):null;
    let totalTime=timeCtx?duration(timeCtx.match[0]):null;
    if(totalTime===avgPace)totalTime=null;

    let calories=cal?num(cal.match[1]):null;
    let calConfidence=cal?.85||0;
    if(calories!=null && distance!=null && calories<distance*25){
      calConfidence=.45; // keep it visible but clearly suspicious
    }

    const fields={
      source:field("Garmin","Plantilla Garmin",.95,"global"),
      screen_type:field(screen.type,JSON.stringify(screen.scores),screen.confidence,"body"),
      title:field(title,title,title?.92:0,"header"),
      location:field(location,title,location?.9:0,"header"),
      activity:field(activity,title,activity?.9:0,"header"),
      date:field(date?`${Number(date.match[1])} ${date.match[2].toLowerCase()}${date.match[3]?" "+date.match[3]:""}`:null,date?.source,date?.96:0,"header"),
      time:field(activityTime?.value||null,activityTime?.source||null,activityTime?.9:0,"header"),
      distance_km:field(distance,dist?.source,distance!=null?.97:0,"metrics"),
      avg_heart_rate_bpm:field(avg?num(avg.match[1]):null,avg?.source,avg?.98:0,"metrics"),
      max_heart_rate_bpm:field(max?num(max.match[1]):null,max?.source,max?.98:0,"metrics"),
      avg_pace_min_km:field(avgPace,paceCtx?.source,avgPace?.98:0,"metrics"),
      total_time:field(totalTime,timeCtx?.source,totalTime?.94:0,"metrics"),
      calories_kcal:field(calories,cal?.source,calConfidence,"metrics"),
      cadence_spm:field(cad?num(cad.match[1]):null,cad?.source,cad?.94:0,"metrics"),
      temperature_c:field(temp?num(temp.match[1]):null,temp?.source,temp?.94:0,"metrics"),
      elevation_gain_m:field(elev?num(elev.match[1]):null,elev?.source,elev?.94:0,"metrics")
    };

    const data=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));
    return{
      parser:"garmin-v3.0.0-template",
      screen,
      found:Object.values(data).filter(v=>v!=null).length,
      data,fields,
      zones:{header,body,metrics,full}
    };
  }

  function merge(results){
    const mergedFields={};
    results.forEach((parsed,index)=>{
      Object.entries(parsed.fields).forEach(([key,item])=>{
        if(item.value==null)return;
        const candidate={...item,capture:index+1};
        const current=mergedFields[key];
        if(!current||candidate.confidence>current.confidence){
          mergedFields[key]=candidate;
        }
      });
    });

    FIELD_KEYS.forEach(k=>{
      if(!mergedFields[k])mergedFields[k]=field(null,null,0);
    });

    const data=Object.fromEntries(FIELD_KEYS.map(k=>[k,mergedFields[k].value]));
    const warnings=[];

    if(data.time&&!data.date)warnings.push("Se ha descartado o debe revisarse una hora sin fecha.");
    if(data.calories_kcal!=null&&data.distance_km!=null&&data.calories_kcal<data.distance_km*25){
      warnings.push("Las calorías parecen demasiado bajas para la distancia.");
    }
    if(data.title&&UI_NOISE.test(normalize(data.title))){
      warnings.push("El título parece texto de la interfaz y debe revisarse.");
    }

    return{
      parser:"garmin-v3.0.0-template-merge",
      found:Object.values(data).filter(v=>v!=null).length,
      data,fields:mergedFields,warnings
    };
  }

  return{parseZones,merge,classify,cleanText,normalize};
});