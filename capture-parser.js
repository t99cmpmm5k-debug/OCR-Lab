(function(root){
  "use strict";
  const U=root.GarminUtils;
  const V=root.GarminValidators;

  function clean(text){
    return U.cleanText(text);
  }

  function take(text, labelPatterns, valuePatterns, parser, validator){
    const raw=clean(text);

    for(const label of labelPatterns){
      for(const value of valuePatterns){
        const after=new RegExp(`(?:${label})[\\s\\S]{0,40}?(${value})`,"i");
        const before=new RegExp(`(${value})[\\s\\S]{0,40}?(?:${label})`,"i");

        for(const regex of [after,before]){
          const m=raw.match(regex);
          if(!m)continue;
          const parsed=parser(m[1]);
          if(parsed!=null && validator(parsed)){
            return {value:parsed,source:m[0],confidence:.99};
          }
        }
      }
    }
    return null;
  }

  function number(v){ return U.num(v); }
  function pace(v){ return U.pace(v); }
  function duration(v){ return U.duration(v); }

  function titleData(text){
    const lines=U.linesOf(text);
    const noteIndex=lines.findIndex(x=>/anadir notas|añadir notas/.test(U.normalize(x)));
    if(noteIndex<1)return {title:null,location:null,activity:null};

    const blocked=/^(carrera|running|actividad|resumen|estadisticas|vueltas|graficos|equipo)$/i;
    const pool=lines.slice(Math.max(0,noteIndex-5),noteIndex).reverse();

    for(const line of pool){
      let title=U.cleanText(line)
        .replace(/^[<‹«>›»:\s-]+|[<‹«>›»:\s-]+$/g,"")
        .replace(/\s+(?:za|2a|z4|24|ia)$/i,"")
        .trim();

      if(!title)continue;
      const n=U.normalize(title);
      if(blocked.test(n))continue;
      if(/\b\d{1,2}:\d{2}\b/.test(title))continue;
      if(/\b\d+(?:[,.]\d+)?\s*(?:km|ppm|kcal|m)\b/i.test(title))continue;

      const m=n.match(/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/);
      if(!m)continue;

      const activity=title.match(new RegExp(`\\b${m[1]}\\b`,"i"))?.[0]||m[1];
      const location=title.replace(new RegExp(`\\b${m[1]}\\b`,"i"),"").trim()||null;
      return {title,location,activity};
    }

    return {title:null,location:null,activity:null};
  }

  function parse(text){
    const screen=root.GarminScreenDetector.detect(text);
    const raw=clean(text);
    const title=screen.type==="summary" ? titleData(raw) : {title:null,location:null,activity:null};

    const date=screen.type==="summary"
      ? U.first(raw,new RegExp(`\\b([0-3]?[0-9])\\s+(${U.MONTHS})(?:\\s+(20[0-9]{2}))?\\b`,"i"))
      : null;

    const time=date ? U.first(raw,/\b([0-2]?[0-9]):([0-5][0-9])\b/) : null;

    const distance=take(raw,
      ["distancia(?: recorrida| real)?"],
      ["[0-9]{1,3}[,.][0-9]{1,2}\\s*km"],
      number,V.distance
    );

    const avgHr=take(raw,
      ["frecuencia cardiaca media","fc media"],
      ["(?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\\s*(?:ppm|bpm)"],
      number,V.heartRate
    );

    const maxHr=take(raw,
      ["frecuencia cardiaca maxima","frec\\.?\\s*cardiaca\\s*max\\.?","fc maxima"],
      ["(?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\\s*(?:ppm|bpm)"],
      number,V.heartRate
    );

    const avgPace=take(raw,
      ["ritmo medio(?: en movimiento)?","ritmo promedio","ritmo del recorrido"],
      ["[0-9]{1,2}\\s*[:.]\\s*[0-5][0-9]\\s*\\/\\s*km"],
      pace,V.pace
    );

    const totalTime=take(raw,
      ["tiempo total","duracion total"],
      ["(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]"],
      duration,V.duration
    );

    const totalCalories=take(raw,
      ["calorias totales","total de calorias quemadas","total de calorias","total calorias"],
      ["[0-9]{2,5}(?:\\s*kcal)?"],
      number,V.calories
    );

    const activeCalories=take(raw,
      ["calorias activas"],
      ["[0-9]{2,5}(?:\\s*kcal)?"],
      number,V.calories
    );

    const cadence=take(raw,
      ["cadencia media de carrera","cadencia media"],
      ["[0-9]{2,3}\\s*(?:ppm|spm)"],
      number,V.cadence
    );

    const elevation=take(raw,
      ["ascenso total","desnivel positivo","ganancia de altura"],
      ["[0-9]{1,5}\\s*m"],
      number,V.elevation
    );

    const temperature=take(raw,
      ["temperatura media","temperatura"],
      ["-?[0-9]{1,2}(?:[,.][0-9])?\\s*°?\\s*c"],
      number,V.temperature
    );

    return {
      source:"Garmin",
      screen_type:screen.type,
      identity:{
        title:title.title,
        location:title.location,
        activity:title.activity,
        date:date?`${Number(date.match[1])} ${date.match[2].toLowerCase()}${date.match[3]?" "+date.match[3]:""}`:null,
        time:time?`${Number(time.match[1])}:${time.match[2]}`:null
      },
      metrics:{
        distance_km:distance?.value??null,
        avg_heart_rate_bpm:avgHr?.value??null,
        max_heart_rate_bpm:maxHr?.value??null,
        avg_pace_min_km:avgPace?.value??null,
        total_time:totalTime?.value??null,
        calories_kcal:(totalCalories||activeCalories)?.value??null,
        cadence_spm:cadence?.value??null,
        temperature_c:temperature?.value??null,
        elevation_gain_m:elevation?.value??null
      },
      evidence:{
        distance_km:distance,
        avg_heart_rate_bpm:avgHr,
        max_heart_rate_bpm:maxHr,
        avg_pace_min_km:avgPace,
        total_time:totalTime,
        calories_kcal:totalCalories||activeCalories,
        cadence_spm:cadence,
        temperature_c:temperature,
        elevation_gain_m:elevation
      }
    };
  }

  root.GarminCaptureParser={parse};
})(window);