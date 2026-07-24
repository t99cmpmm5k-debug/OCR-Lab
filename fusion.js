(function(root){
  "use strict";
  const U=root.GarminUtils;
  const KEYS=[
    "source","screen_type","title","location","activity","date","time",
    "distance_km","avg_heart_rate_bpm","max_heart_rate_bpm",
    "avg_pace_min_km","total_time","calories_kcal","cadence_spm",
    "temperature_c","elevation_gain_m"
  ];

  function merge(results){
    const fields={};

    results.forEach((result,index)=>{
      Object.entries(result.fields||{}).forEach(([key,item])=>{
        if(item?.value==null)return;
        const candidate={...item,capture:index+1};
        const current=fields[key];

        // Summary owns identity fields.
        const identity=["title","location","activity","date","time"];
        if(identity.includes(key)){
          if(result.parser.startsWith("summary") && (!current || candidate.confidence>=current.confidence)){
            fields[key]=candidate;
          }
          return;
        }

        if(!current||candidate.confidence>current.confidence){
          fields[key]=candidate;
        }
      });
    });

    KEYS.forEach(k=>{if(!fields[k])fields[k]=U.field(null,null,0)});
    const data=Object.fromEntries(KEYS.map(k=>[k,fields[k].value]));
    const warnings=[];

    if(!data.title)warnings.push("Falta el título del entrenamiento.");
    if(!data.date)warnings.push("Falta la fecha del entrenamiento.");
    if(data.calories_kcal!=null&&data.distance_km!=null&&data.calories_kcal<data.distance_km*25){
      warnings.push("Las calorías parecen demasiado bajas para la distancia.");
    }
    if(data.cadence_spm!=null&&data.cadence_spm<80){
      warnings.push("La cadencia se ha descartado o debe revisarse por ser demasiado baja.");
    }
    if(data.distance_km!=null&&data.distance_km>100){
      warnings.push("La distancia parece demasiado alta y debe revisarse.");
    }

    return{
      parser:"garmin-v4.1-engine",
      found:Object.values(data).filter(v=>v!=null).length,
      data,fields,warnings
    };
  }

  root.GarminFusion={merge};
})(window);