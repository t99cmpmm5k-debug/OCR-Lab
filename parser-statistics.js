(function(root){
  "use strict";
  const U=root.GarminUtils;
  const E=root.GarminExtractor;

  function parse(text){
    const raw=U.cleanText(text);
    const fields={};

    const distance=E.distance(raw);
    const avgHr=E.avgHeartRate(raw);
    const maxHr=E.maxHeartRate(raw);
    const pace=E.avgPace(raw);
    const total=E.totalTime(raw);
    const calories=E.calories(raw);
    const cadence=E.cadence(raw);
    const temp=E.temperature(raw);
    const elevation=E.elevation(raw);

    fields.source=U.field("Garmin","Pantalla Estadísticas",.99);
    fields.screen_type=U.field("statistics","Estadísticas",.98);
    fields.distance_km=U.field(distance?.value??null,distance?.source,distance?.confidence||0);
    fields.avg_heart_rate_bpm=U.field(avgHr?.value??null,avgHr?.source,avgHr?.confidence||0);
    fields.max_heart_rate_bpm=U.field(maxHr?.value??null,maxHr?.source,maxHr?.confidence||0);
    fields.avg_pace_min_km=U.field(pace?.value??null,pace?.source,pace?.confidence||0);
    fields.total_time=U.field(total?.value??null,total?.source,total?.confidence||0);
    fields.calories_kcal=U.field(calories?.value??null,calories?.source,calories?.confidence||0);
    fields.cadence_spm=U.field(cadence?.value??null,cadence?.source,cadence?.confidence||0);
    fields.temperature_c=U.field(temp?.value??null,temp?.source,temp?.confidence||0);
    fields.elevation_gain_m=U.field(elevation?.value??null,elevation?.source,elevation?.confidence||0);

    return {parser:"statistics-v4-engine",fields};
  }

  root.GarminStatisticsParser={parse};
})(window);