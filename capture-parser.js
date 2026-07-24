(function(root){
  "use strict";
  const U=root.GarminUtils;
  const V=root.GarminValidators;

  function number(v){ return U.num(v); }
  function pace(v){ return U.pace(v); }
  function duration(v){ return U.duration(v); }

  function lines(text){
    return U.linesOf(text);
  }

  function isValueLine(line, regex){
    return regex.test(String(line||"").trim());
  }

  function exactLabelValue(text,labelRegex,valueRegex,parser,validator,maxDistance=2){
    const ls=lines(text);

    for(let i=0;i<ls.length;i++){
      const label=U.normalize(ls[i]);
      if(!labelRegex.test(label))continue;

      // Prefer value after the exact label.
      for(let d=0;d<=maxDistance;d++){
        const idx=i+d;
        if(idx>=ls.length)break;
        const source=ls[idx];
        const m=source.match(valueRegex);
        if(!m)continue;
        const value=parser(m[1]||m[0]);
        if(value!=null&&validator(value)){
          return {value,source:`${ls[i]} | ${source}`,confidence:.99};
        }
      }

      // Then allow a value immediately before the label.
      for(let d=1;d<=maxDistance;d++){
        const idx=i-d;
        if(idx<0)break;
        const source=ls[idx];
        const m=source.match(valueRegex);
        if(!m)continue;
        const value=parser(m[1]||m[0]);
        if(value!=null&&validator(value)){
          return {value,source:`${source} | ${ls[i]}`,confidence:.97};
        }
      }
    }
    return null;
  }

  function titleData(text){
    const ls=lines(text);
    const noteIndex=ls.findIndex(x=>/anadir notas|añadir notas/.test(U.normalize(x)));
    if(noteIndex<1)return {title:null,location:null,activity:null};

    const blocked=/^(carrera|running|actividad|resumen|estadisticas|vueltas|graficos|equipo)$/i;
    const pool=ls.slice(Math.max(0,noteIndex-5),noteIndex).reverse();

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
    const raw=U.cleanText(text);
    const identity=screen.type==="summary"
      ? titleData(raw)
      : {title:null,location:null,activity:null};

    const date=screen.type==="summary"
      ? U.first(raw,new RegExp(`\\b([0-3]?[0-9])\\s+(${U.MONTHS})(?:\\s+(20[0-9]{2}))?\\b`,"i"))
      : null;

    const time=date ? U.first(raw,/\b([0-2]?[0-9]):([0-5][0-9])\b/) : null;

    const distance=exactLabelValue(
      raw,
      /^(distancia|distancia recorrida|distancia real)$/,
      /\b([0-9]{1,3}[,.][0-9]{1,2})\s*km\b/i,
      number,V.distance,2
    );

    const avgHr=exactLabelValue(
      raw,
      /^(frecuencia cardiaca media|fc media)$/,
      /\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)\b/i,
      number,V.heartRate,2
    );

    const maxHr=exactLabelValue(
      raw,
      /^(frecuencia cardiaca maxima|frec\.?\s*cardiaca\s*max\.?|fc maxima)$/,
      /\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)\b/i,
      number,V.heartRate,2
    );

    const avgPace=exactLabelValue(
      raw,
      /^(ritmo medio|ritmo promedio|ritmo del recorrido)$/,
      /\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*\/\s*km\b/i,
      pace,V.pace,2
    );

    const totalTime=exactLabelValue(
      raw,
      /^(tiempo total|duracion total)$/,
      /\b((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9])\b/,
      duration,V.duration,2
    );

    const totalCalories=exactLabelValue(
      raw,
      /^(calorias totales|total de calorias quemadas|total de calorias|total calorias)$/,
      /\b([0-9]{2,5})\s*(?:kcal)?\b/i,
      number,V.calories,2
    );

    const activeCalories=exactLabelValue(
      raw,
      /^calorias activas$/,
      /\b([0-9]{2,5})\s*(?:kcal)?\b/i,
      number,V.calories,2
    );

    const cadence=exactLabelValue(
      raw,
      /^(cadencia media de carrera|cadencia media)$/,
      /\b([0-9]{2,3})\s*(?:ppm|spm)\b/i,
      number,V.cadence,2
    );

    const elevation=exactLabelValue(
      raw,
      /^(ascenso total|desnivel positivo|ganancia de altura)$/,
      /\b([0-9]{1,5})\s*m\b/i,
      number,V.elevation,2
    );

    const temperature=exactLabelValue(
      raw,
      /^(temperatura media|temperatura)$/,
      /\b(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c\b/i,
      number,V.temperature,2
    );

    return {
      source:"Garmin",
      screen_type:screen.type,
      identity:{
        title:identity.title,
        location:identity.location,
        activity:identity.activity,
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