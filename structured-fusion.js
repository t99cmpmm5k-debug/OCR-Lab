(function(root){
  "use strict";
  const U=root.GarminUtils;

  const FIELD_KEYS=[
    "source","screen_type","title","location","activity","date","time",
    "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
    "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
    "temperature_c","elevation_gain_m"
  ];

  function resolveMetric(captures,field){
    const values=[];

    captures.forEach((capture,index)=>{
      const value=capture.metrics?.[field];
      if(value==null)return;

      const evidence=capture.evidence?.[field]||{};
      values.push({
        value,
        capture:index+1,
        confidence:evidence.confidence||.95,
        source:evidence.source||"JSON por captura",
        screen:capture.screen_type
      });
    });

    if(!values.length)return null;

    const groups=new Map();
    values.forEach(item=>{
      const key=String(item.value);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    });

    let best=null;
    for(const group of groups.values()){
      const representative=[...group].sort((a,b)=>b.confidence-a.confidence)[0];
      let score=representative.confidence*100+(group.length-1)*15;

      if(field==="calories_kcal" && /total/i.test(representative.source))score+=20;
      if(field==="max_heart_rate_bpm" && /max/i.test(U.normalize(representative.source)))score+=20;
      if(field==="avg_heart_rate_bpm" && /media/i.test(U.normalize(representative.source)))score+=20;
      if(representative.screen==="summary" && ["distance_km","avg_pace_min_km","total_time","calories_kcal"].includes(field))score+=5;

      if(!best||score>best.score){
        best={...representative,score,consensus:group.length};
      }
    }

    return best;
  }

  function merge(captures){
    const fields={};

    const summaryIndex=captures.findIndex(c=>c.screen_type==="summary");
    const summary=summaryIndex>=0?captures[summaryIndex]:null;

    fields.source={value:"Garmin",source:"JSON estructurado",confidence:.99,capture:1};
    fields.screen_type={
      value:summary?"summary":"statistics",
      source:"JSON estructurado",
      confidence:.99,
      capture:summaryIndex>=0?summaryIndex+1:1
    };

    for(const key of ["title","location","activity","date","time"]){
      const value=summary?.identity?.[key]??null;
      fields[key]=value==null
        ? U.field(null,null,0)
        : {value,source:"Captura Resumen",confidence:.97,capture:summaryIndex+1};
    }

    for(const key of [
      "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
      "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
      "temperature_c","elevation_gain_m"
    ]){
      const winner=resolveMetric(captures,key);
      fields[key]=winner
        ? {
            value:winner.value,
            source:winner.source,
            confidence:Math.min(.99,winner.confidence+(winner.consensus-1)*.01),
            capture:winner.capture,
            consensus:winner.consensus
          }
        : U.field(null,null,0);
    }

    FIELD_KEYS.forEach(key=>{
      if(!fields[key])fields[key]=U.field(null,null,0);
    });

    const data=Object.fromEntries(FIELD_KEYS.map(key=>[key,fields[key].value]));
    const warnings=[];

    if(!summary)warnings.push("Falta una captura de la pestaña Resumen.");
    if(data.avg_heart_rate_bpm!=null&&data.max_heart_rate_bpm!=null&&data.avg_heart_rate_bpm>data.max_heart_rate_bpm){
      warnings.push("La FC media supera la FC máxima; revisa las capturas.");
    }
    if(data.calories_kcal!=null&&data.distance_km!=null&&data.calories_kcal<data.distance_km*25){
      warnings.push("Las calorías parecen demasiado bajas para la distancia.");
    }

    return{
      parser:"garmin-v6-structured-json",
      found:Object.values(data).filter(v=>v!=null).length,
      data,
      fields,
      warnings,
      captures
    };
  }

  root.GarminStructuredFusion={merge};
})(window);