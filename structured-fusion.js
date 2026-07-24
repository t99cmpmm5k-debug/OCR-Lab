(function(root){
  "use strict";
  const U=root.GarminUtils;

  const FIELD_KEYS=[
    "source","screen_type","title","location","activity","date","time",
    "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
    "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
    "temperature_c","elevation_gain_m"
  ];

  function firstValid(captures,key){
    for(let i=0;i<captures.length;i++){
      const value=captures[i].metrics?.[key];
      if(value==null)continue;
      const evidence=captures[i].evidence?.[key];
      return {
        value,
        source:evidence?.source||"JSON por captura",
        confidence:evidence?.confidence||.95,
        capture:i+1
      };
    }
    return null;
  }

  function exactConsensus(captures,key){
    const items=[];
    captures.forEach((capture,index)=>{
      const value=capture.metrics?.[key];
      if(value==null)return;
      const evidence=capture.evidence?.[key];
      items.push({
        value,
        capture:index+1,
        source:evidence?.source||"JSON por captura",
        confidence:evidence?.confidence||.95
      });
    });

    if(!items.length)return null;

    const groups=new Map();
    for(const item of items){
      const k=String(item.value);
      if(!groups.has(k))groups.set(k,[]);
      groups.get(k).push(item);
    }

    const ordered=[...groups.values()].sort((a,b)=>{
      if(b.length!==a.length)return b.length-a.length;
      const bestA=Math.max(...a.map(x=>x.confidence));
      const bestB=Math.max(...b.map(x=>x.confidence));
      return bestB-bestA;
    });

    const group=ordered[0];
    const best=[...group].sort((a,b)=>b.confidence-a.confidence)[0];

    return {
      value:best.value,
      source:best.source,
      confidence:Math.min(.99,best.confidence+(group.length-1)*.01),
      capture:best.capture,
      consensus:group.length
    };
  }

  function merge(captures){
    const fields={};
    const summaryIndex=captures.findIndex(c=>c.screen_type==="summary");
    const summary=summaryIndex>=0?captures[summaryIndex]:null;

    fields.source={value:"Garmin",source:"JSON exacto",confidence:.99,capture:1};
    fields.screen_type={
      value:summary?"summary":"statistics",
      source:"Detector de pantalla",
      confidence:.99,
      capture:summaryIndex>=0?summaryIndex+1:1
    };

    for(const key of ["title","location","activity","date","time"]){
      const value=summary?.identity?.[key]??null;
      fields[key]=value==null
        ? U.field(null,null,0)
        : {value,source:"Captura Resumen",confidence:.97,capture:summaryIndex+1};
    }

    // No heuristics and no cross-field inference:
    // each final field reads only the same key from per-capture JSON.
    for(const key of [
      "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
      "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
      "temperature_c","elevation_gain_m"
    ]){
      fields[key]=exactConsensus(captures,key)||U.field(null,null,0);
    }

    FIELD_KEYS.forEach(key=>{
      if(!fields[key])fields[key]=U.field(null,null,0);
    });

    const data=Object.fromEntries(FIELD_KEYS.map(key=>[key,fields[key].value]));
    const warnings=[];

    if(!summary)warnings.push("Falta una captura de la pestaña Resumen.");
    if(data.avg_heart_rate_bpm!=null&&data.max_heart_rate_bpm!=null&&data.avg_heart_rate_bpm>data.max_heart_rate_bpm){
      warnings.push("La FC media supera la FC máxima.");
    }
    if(data.calories_kcal!=null&&data.distance_km!=null&&data.calories_kcal<data.distance_km*25){
      warnings.push("Las calorías parecen demasiado bajas para la distancia.");
    }

    return{
      parser:"garmin-v7-exact-key-fusion",
      found:Object.values(data).filter(v=>v!=null).length,
      data,
      fields,
      warnings,
      captures
    };
  }

  root.GarminStructuredFusion={merge};
})(window);