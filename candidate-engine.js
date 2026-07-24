(function(root){
  "use strict";
  const U=root.GarminUtils;
  const V=root.GarminValidators;

  function candidate(field,value,source,confidence,screen,priority){
    return {field,value,source,confidence,screen,priority};
  }

  function allMatches(text,patterns,parser,validator,field,screen,priority,confidence=.96){
    const raw=U.cleanText(text);
    const found=[];

    for(const regex of patterns){
      for(const match of raw.matchAll(regex)){
        const value=parser(match[1]);
        if(value==null || !validator(value))continue;
        found.push(candidate(field,value,match[0],confidence,screen,priority));
      }
    }

    return found;
  }

  function number(value){ return U.num(value); }
  function pace(value){ return U.pace(value); }
  function duration(value){ return U.duration(value); }

  function extractSummary(text){
    const out=[];
    const screen="summary";

    out.push(...allMatches(text,[
      /(?:distancia)[\s\S]{0,35}?([0-9]{1,3}[,.][0-9]{1,2})\s*km/gi,
      /([0-9]{1,3}[,.][0-9]{1,2})\s*km[\s\S]{0,35}?(?:distancia)/gi
    ],number,V.distance,"distance_km",screen,100,.99));

    out.push(...allMatches(text,[
      /(?:frecuencia cardiaca media|fc media)[\s\S]{0,35}?((?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9]))\s*(?:ppm|bpm)/gi,
      /((?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9]))\s*(?:ppm|bpm)[\s\S]{0,35}?(?:frecuencia cardiaca media|fc media)/gi
    ],number,V.heartRate,"avg_heart_rate_bpm",screen,100,.99));

    out.push(...allMatches(text,[
      /(?:ritmo medio|ritmo promedio)[\s\S]{0,35}?([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*\/\s*km/gi,
      /([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*\/\s*km[\s\S]{0,35}?(?:ritmo medio|ritmo promedio)/gi
    ],pace,V.pace,"avg_pace_min_km",screen,100,.99));

    out.push(...allMatches(text,[
      /(?:tiempo total|duracion total)[\s\S]{0,35}?((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9])/gi,
      /((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9])[\s\S]{0,35}?(?:tiempo total|duracion total)/gi
    ],duration,V.duration,"total_time",screen,100,.99));

    out.push(...allMatches(text,[
      /(?:calorias totales|total de calorias quemadas|total de calorias|total calorias)[\s\S]{0,35}?([0-9]{2,5})/gi,
      /([0-9]{2,5})[\s\S]{0,35}?(?:calorias totales|total de calorias quemadas|total de calorias|total calorias)/gi
    ],number,V.calories,"calories_kcal",screen,110,.99));

    return out;
  }

  function extractStatistics(text){
    const out=[];
    const screen="statistics";

    out.push(...allMatches(text,[
      /(?:distancia recorrida|distancia real|distancia)[\s\S]{0,35}?([0-9]{1,3}[,.][0-9]{1,2})\s*km/gi,
      /([0-9]{1,3}[,.][0-9]{1,2})\s*km[\s\S]{0,35}?(?:distancia recorrida|distancia real|distancia)/gi
    ],number,V.distance,"distance_km",screen,90,.98));

    out.push(...allMatches(text,[
      /(?:frecuencia cardiaca media|fc media)[\s\S]{0,40}?((?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9]))\s*(?:ppm|bpm)/gi,
      /((?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9]))\s*(?:ppm|bpm)[\s\S]{0,40}?(?:frecuencia cardiaca media|fc media)/gi
    ],number,V.heartRate,"avg_heart_rate_bpm",screen,105,.99));

    out.push(...allMatches(text,[
      /(?:frecuencia cardiaca maxima|frec\.?\s*cardiaca\s*max\.?|fc maxima)[\s\S]{0,40}?((?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9]))\s*(?:ppm|bpm)/gi,
      /((?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9]))\s*(?:ppm|bpm)[\s\S]{0,40}?(?:frecuencia cardiaca maxima|frec\.?\s*cardiaca\s*max\.?|fc maxima)/gi
    ],number,V.heartRate,"max_heart_rate_bpm",screen,110,.99));

    out.push(...allMatches(text,[
      /(?:ritmo medio|ritmo del recorrido|ritmo promedio)[\s\S]{0,35}?([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*\/\s*km/gi,
      /([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*\/\s*km[\s\S]{0,35}?(?:ritmo medio|ritmo del recorrido|ritmo promedio)/gi
    ],pace,V.pace,"avg_pace_min_km",screen,95,.98));

    out.push(...allMatches(text,[
      /(?:tiempo total)[\s\S]{0,35}?((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9])/gi,
      /((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9])[\s\S]{0,35}?(?:tiempo total)/gi
    ],duration,V.duration,"total_time",screen,105,.99));

    out.push(...allMatches(text,[
      /(?:total de calorias quemadas|calorias totales|total de calorias|total calorias)[\s\S]{0,35}?([0-9]{2,5})/gi,
      /([0-9]{2,5})[\s\S]{0,35}?(?:total de calorias quemadas|calorias totales|total de calorias|total calorias)/gi
    ],number,V.calories,"calories_kcal",screen,120,.99));

    out.push(...allMatches(text,[
      /(?:calorias activas)[\s\S]{0,30}?([0-9]{2,5})/gi,
      /([0-9]{2,5})[\s\S]{0,30}?(?:calorias activas)/gi
    ],number,V.calories,"calories_kcal",screen,80,.95));

    out.push(...allMatches(text,[
      /(?:cadencia media de carrera|cadencia media)[\s\S]{0,35}?([0-9]{2,3})\s*(?:ppm|spm)/gi,
      /([0-9]{2,3})\s*(?:ppm|spm)[\s\S]{0,35}?(?:cadencia media de carrera|cadencia media)/gi
    ],number,V.cadence,"cadence_spm",screen,105,.99));

    out.push(...allMatches(text,[
      /(?:ascenso total|desnivel positivo|ganancia de altura)[\s\S]{0,30}?([0-9]{1,5})\s*m/gi,
      /([0-9]{1,5})\s*m[\s\S]{0,30}?(?:ascenso total|desnivel positivo|ganancia de altura)/gi
    ],number,V.elevation,"elevation_gain_m",screen,105,.99));

    out.push(...allMatches(text,[
      /(?:temperatura media|temperatura)[\s\S]{0,30}?(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c/gi,
      /(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c[\s\S]{0,30}?(?:temperatura media|temperatura)/gi
    ],number,V.temperature,"temperature_c",screen,100,.98));

    return out;
  }

  function extract(text,screen){
    if(screen==="summary")return extractSummary(text);
    return extractStatistics(text);
  }

  root.GarminCandidateEngine={extract};
})(window);