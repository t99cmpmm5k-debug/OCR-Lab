(function(root){
  "use strict";
  const U=root.GarminUtils;
  const E=root.GarminExtractor;

  function findTitle(lines){
    const noteIndex=lines.findIndex(x=>/anadir notas|añadir notas/.test(U.normalize(x)));
    const blocked=/^(carrera|running|actividad|resumen|estadisticas|vueltas|graficos|equipo)$/i;

    const pool=noteIndex>0
      ? lines.slice(Math.max(0,noteIndex-5),noteIndex).reverse()
      : lines;

    for(const line of pool){
      let candidate=U.cleanText(line)
        .replace(/^[<‹«>›»:\s-]+|[<‹«>›»:\s-]+$/g,"")
        .replace(/\s+(?:za|2a|z4|24|ia)$/i,"")
        .trim();

      if(!candidate)continue;
      const n=U.normalize(candidate);
      if(blocked.test(n))continue;
      if(/\b\d{1,2}:\d{2}\b/.test(candidate))continue;
      if(/\b\d+(?:[,.]\d+)?\s*(?:km|ppm|kcal|m)\b/i.test(candidate))continue;
      if(/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/.test(n)){
        return candidate;
      }
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
      const m=n.match(/\b(carrera|rodaje|running|trail|tempo|series|entrenamiento)\b/);
      if(m){
        activity=title.match(new RegExp(`\\b${m[1]}\\b`,"i"))?.[0]||m[1];
        location=title.replace(new RegExp(`\\b${m[1]}\\b`,"i"),"").trim()||null;
      }else location=title;
    }

    const distance=E.distance(raw);
    const avgHr=E.avgHeartRate(raw);
    const pace=E.avgPace(raw);
    const total=E.totalTime(raw);
    const calories=E.calories(raw);

    fields.source=U.field("Garmin","Pantalla Resumen",.99);
    fields.screen_type=U.field("summary","Resumen",.99);
    fields.title=U.field(title,title,title?.96:0);
    fields.location=U.field(location,title,location?.94:0);
    fields.activity=U.field(activity,title,activity?.94:0);
    fields.date=U.field(date?`${Number(date.match[1])} ${date.match[2].toLowerCase()}${date.match[3]?" "+date.match[3]:""}`:null,date?.source,date?.97:0);
    fields.time=U.field(time?`${Number(time.match[1])}:${time.match[2]}`:null,time?.source,time?.9:0);
    fields.distance_km=U.field(distance?.value??null,distance?.source,distance?.confidence||0);
    fields.avg_heart_rate_bpm=U.field(avgHr?.value??null,avgHr?.source,avgHr?.confidence||0);
    fields.avg_pace_min_km=U.field(pace?.value??null,pace?.source,pace?.confidence||0);
    fields.total_time=U.field(total?.value??null,total?.source,total?.confidence||0);
    fields.calories_kcal=U.field(calories?.value??null,calories?.source,calories?.confidence||0);

    return {parser:"summary-v4-engine",fields};
  }

  root.GarminSummaryParser={parse};
})(window);