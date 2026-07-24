(function(root){
  "use strict";
  const U=root.GarminUtils;

  function findTitle(lines){
    const blocked=/^(carrera|running|actividad|resumen|estadisticas|vueltas|graficos|equipo)$/i;
    const noteIndex=lines.findIndex(x=>/anadir notas|añadir notas/.test(U.normalize(x)));

    const pool=noteIndex>0
      ? lines.slice(Math.max(0,noteIndex-4),noteIndex).reverse()
      : lines;

    for(const line of pool){
      const candidate=U.cleanActivityTitle(line);
      if(!candidate)continue;
      const n=U.normalize(candidate);
      if(blocked.test(n))continue;
      if(/\b\d{1,2}:\d{2}\b/.test(candidate))continue;
      if(/\b\d+(?:[,.]\d+)?\s*(?:km|ppm|kcal|m)\b/i.test(candidate))continue;
      if(/anadir notas|añadir notas/.test(n))continue;
      if(/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/.test(n))return candidate;
    }

    return null;
  }

  function parse(text){
    const raw=U.cleanText(text), lines=U.linesOf(raw);
    const fields={};

    const date=U.first(raw,new RegExp(`\\b([0-3]?[0-9])\\s+(${U.MONTHS})(?:\\s+(20[0-9]{2}))?\\b`,"i"));
    const time=date ? U.first(raw,/\b([0-2]?[0-9]):([0-5][0-9])\b/) : null;

    const title=findTitle(lines);
    let location=null,activity=null;
    if(title){
      const n=U.normalize(title);
      const activityMatch=n.match(/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/);
      if(activityMatch){
        activity=title.match(new RegExp(`\\b${activityMatch[1]}\\b`,"i"))?.[0]||activityMatch[1];
        location=title.replace(new RegExp(`\\b${activityMatch[1]}\\b`,"i"),"").trim()||null;
      }else{
        location=title;
      }
    }

    const distance=U.semanticValue(
      lines,
      /\bdistancia\b/,
      /\b([0-9]{1,3}(?:[,.][0-9]{1,2})?)\s*(?:km)?\b/i,
      {maxDistance:2}
    );

    const avgHr=U.semanticValue(
      lines,
      /frecuencia cardiaca media|fc media/,
      /\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,
      {maxDistance:2}
    );

    const avgPace=U.semanticValue(
      lines,
      /^ritmo medio$/,
      /\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)?\b/i,
      {maxDistance:2}
    );

    const totalTime=U.semanticValue(
      lines,
      /^tiempo total$/,
      /\b(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]\b/,
      {maxDistance:2}
    );

    const calories=U.semanticValue(
      lines,
      /^calorias totales$|^total de calorias quemadas$/,
      /\b([0-9]{2,5})\b/,
      {maxDistance:2}
    );

    fields.source=U.field("Garmin","Pantalla Resumen",.99);
    fields.screen_type=U.field("summary","Resumen",.99);
    fields.title=U.field(title,title,title?.96:0);
    fields.location=U.field(location,title,location?.94:0);
    fields.activity=U.field(activity,title,activity?.94:0);
    fields.date=U.field(date?`${Number(date.match[1])} ${date.match[2].toLowerCase()}${date.match[3]?" "+date.match[3]:""}`:null,date?.source,date?.97:0);
    fields.time=U.field(time?`${Number(time.match[1])}:${time.match[2]}`:null,time?.source,time?.9:0);
    fields.distance_km=U.field(distance?U.num(distance.match[1]):null,distance?.source,distance?.98:0);
    fields.avg_heart_rate_bpm=U.field(avgHr?U.num(avgHr.match[1]):null,avgHr?.source,avgHr?.98:0);
    fields.avg_pace_min_km=U.field(avgPace?U.pace(avgPace.match[1]):null,avgPace?.source,avgPace?.98:0);
    fields.total_time=U.field(totalTime?U.duration(totalTime.match[0]):null,totalTime?.source,totalTime?.98:0);
    fields.calories_kcal=U.field(calories?U.num(calories.match[1]):null,calories?.source,calories?.98:0);

    return {parser:"summary-v3.2-semantic",fields};
  }

  root.GarminSummaryParser={parse};
})(window);