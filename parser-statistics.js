(function(root){
  "use strict";
  const U=root.GarminUtils;

  function parse(text){
    const raw=U.cleanText(text), lines=U.linesOf(raw);
    const fields={};

    const distance=U.around(lines,/distancia recorrida|distancia real|\bdistancia\b/,/\b([0-9]{1,3}(?:[,.][0-9]{1,2})?)\s*(?:km)?\b/i,2);
    const avgHr=U.around(lines,/frecuencia cardiaca media|fc media/,/\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,2);
    const maxHr=U.around(lines,/frecuencia cardiaca maxima|frec\.?\s*cardiaca\s*max\.?|fc maxima/,/\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i,2);
    const avgPace=U.around(lines,/ritmo medio|ritmo del recorrido/,/\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)?\b/i,2);
    const totalTime=U.around(lines,/tiempo total|tiempo de carrera/,/\b(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]\b/,2);

    const calTotal=U.around(lines,/total de calorias quemadas|calorias totales/,/\b([0-9]{2,5})\b/,2);
    const calActive=U.around(lines,/calorias activas/,/\b([0-9]{2,5})\b/,2);
    const calories=calTotal||calActive;

    const cadence=U.around(lines,/cadencia media de carrera|cadencia media|cadencia/,/\b([1-2]?[0-9]{2})\s*(?:ppm|spm)?\b/i,2);
    const elevation=U.around(lines,/ascenso total|desnivel positivo|ganancia de altura/,/\b([0-9]{1,5})\s*m\b/i,2);
    const temperature=U.around(lines,/temperatura media|temperatura/,/\b(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c\b/i,2);

    fields.source=U.field("Garmin","Pantalla Estadísticas",.99);
    fields.screen_type=U.field("statistics","Estadísticas",.98);
    fields.distance_km=U.field(distance?U.num(distance.match[1]):null,distance?.source,distance?.96:0);
    fields.avg_heart_rate_bpm=U.field(avgHr?U.num(avgHr.match[1]):null,avgHr?.source,avgHr?.98:0);
    fields.max_heart_rate_bpm=U.field(maxHr?U.num(maxHr.match[1]):null,maxHr?.source,maxHr?.98:0);
    fields.avg_pace_min_km=U.field(avgPace?U.pace(avgPace.match[1]):null,avgPace?.source,avgPace?.98:0);
    fields.total_time=U.field(totalTime?U.duration(totalTime.match[0]):null,totalTime?.source,totalTime?.95:0);
    fields.calories_kcal=U.field(calories?U.num(calories.match[1]):null,calories?.source,calories?.97:0);
    fields.cadence_spm=U.field(cadence?U.num(cadence.match[1]):null,cadence?.source,cadence?.95:0);
    fields.elevation_gain_m=U.field(elevation?U.num(elevation.match[1]):null,elevation?.source,elevation?.95:0);
    fields.temperature_c=U.field(temperature?U.num(temperature.match[1]):null,temperature?.source,temperature?.9:0);

    return {parser:"statistics-v3.1",fields};
  }

  root.GarminStatisticsParser={parse};
})(window);