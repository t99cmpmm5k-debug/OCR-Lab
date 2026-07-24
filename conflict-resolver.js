(function(root){
  "use strict";
  const U=root.GarminUtils;

  const IDENTITY_FIELDS=["title","location","activity","date","time"];
  const ALL_FIELDS=[
    "source","screen_type","title","location","activity","date","time",
    "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
    "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
    "temperature_c","elevation_gain_m"
  ];

  function score(candidate){
    return (candidate.priority||0)+(candidate.confidence||0)*100;
  }

  function choose(candidates){
    if(!candidates.length)return null;

    const grouped=new Map();
    for(const c of candidates){
      const key=String(c.value);
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(c);
    }

    let winner=null;
    for(const group of grouped.values()){
      const best=[...group].sort((a,b)=>score(b)-score(a))[0];
      const consensusBonus=(group.length-1)*12;
      const total=score(best)+consensusBonus;

      if(!winner||total>winner.total){
        winner={candidate:best,total,consensus:group.length};
      }
    }

    return winner;
  }

  function resolve(parseResults){
    const fields={};
    const candidateLog={};

    for(const result of parseResults){
      for(const [key,item] of Object.entries(result.fields||{})){
        if(item?.value==null)continue;

        if(IDENTITY_FIELDS.includes(key)){
          if(result.screen?.type==="summary"){
            const current=fields[key];
            if(!current||item.confidence>current.confidence){
              fields[key]={...item,capture:result.capture};
            }
          }
          continue;
        }

        if(key==="source"||key==="screen_type")continue;
      }
    }

    const candidateFields=[
      "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
      "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
      "temperature_c","elevation_gain_m"
    ];

    for(const field of candidateFields){
      const candidates=[];
      for(const result of parseResults){
        for(const c of result.candidates||[]){
          if(c.field!==field)continue;
          candidates.push({...c,capture:result.capture});
        }
      }

      candidateLog[field]=candidates;
      const winner=choose(candidates);
      if(winner){
        fields[field]={
          value:winner.candidate.value,
          source:winner.candidate.source,
          confidence:Math.min(.99,winner.candidate.confidence+(winner.consensus-1)*.01),
          capture:winner.candidate.capture,
          consensus:winner.consensus
        };
      }
    }

    fields.source={value:"Garmin",source:"Detector Garmin",confidence:.99,capture:1};
    const summaryResult=parseResults.find(r=>r.screen?.type==="summary");
    fields.screen_type={
      value:summaryResult?"summary":"statistics",
      source:"Screen detector",
      confidence:summaryResult?.screen?.confidence||.98,
      capture:summaryResult?.capture||1
    };

    ALL_FIELDS.forEach(key=>{
      if(!fields[key])fields[key]=U.field(null,null,0);
    });

    const data=Object.fromEntries(ALL_FIELDS.map(key=>[key,fields[key].value]));
    const warnings=[];

    if(!data.title)warnings.push("Falta una captura de Resumen con el título visible.");
    if(!data.date)warnings.push("Falta la fecha del entrenamiento.");
    if(data.avg_heart_rate_bpm!=null&&data.max_heart_rate_bpm!=null&&data.avg_heart_rate_bpm>data.max_heart_rate_bpm){
      warnings.push("La FC media no puede superar la FC máxima.");
    }
    if(data.calories_kcal!=null&&data.distance_km!=null&&data.calories_kcal<data.distance_km*25){
      warnings.push("Las calorías parecen demasiado bajas para la distancia.");
    }

    return{
      parser:"garmin-v5-conflict-resolver",
      found:Object.values(data).filter(v=>v!=null).length,
      data,fields,warnings,candidate_log:candidateLog
    };
  }

  root.GarminConflictResolver={resolve};
})(window);