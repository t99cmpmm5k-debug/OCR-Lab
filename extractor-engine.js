(function(root){
  "use strict";
  const U=root.GarminUtils;
  const V=root.GarminValidators;

  function compact(text){
    return U.cleanText(text).replace(/[ \t]+/g," ").trim();
  }

  function normalizeLabel(label){
    return U.normalize(label)
      .replace(/[.:]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function findAnchored(raw,labelPatterns,valuePatterns,parser,validator){
    const text=compact(raw);

    for(const label of labelPatterns){
      for(const value of valuePatterns){
        const after=new RegExp(`(?:${label})[\\s\\S]{0,45}?(${value})`,"i");
        const before=new RegExp(`(${value})[\\s\\S]{0,45}?(?:${label})`,"i");

        for(const regex of [after,before]){
          const m=text.match(regex);
          if(!m)continue;
          const parsed=parser(m[1]);
          if(parsed!=null && validator(parsed)){
            return {value:parsed,source:m[0],confidence:.98};
          }
        }
      }
    }
    return null;
  }

  function numberParser(value){ return U.num(value); }
  function paceParser(value){ return U.pace(value); }
  function durationParser(value){ return U.duration(value); }

  function distance(raw){
    return findAnchored(
      raw,
      ["distancia(?: recorrida| real)?"],
      ["[0-9]{1,3}[,.][0-9]{1,2}\\s*km"],
      numberParser,
      V.distance
    );
  }

  function avgHeartRate(raw){
    return findAnchored(
      raw,
      ["frecuencia cardiaca media","fc media"],
      ["(?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\\s*(?:ppm|bpm)"],
      numberParser,
      V.heartRate
    );
  }

  function maxHeartRate(raw){
    return findAnchored(
      raw,
      ["frecuencia cardiaca maxima","frec\\.?\\s*cardiaca\\s*max\\.?","fc maxima"],
      ["(?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\\s*(?:ppm|bpm)"],
      numberParser,
      V.heartRate
    );
  }

  function avgPace(raw){
    return findAnchored(
      raw,
      ["ritmo medio(?: en movimiento)?","ritmo del recorrido"],
      ["[0-9]{1,2}\\s*[:.]\\s*[0-5][0-9]\\s*\\/\\s*km"],
      paceParser,
      V.pace
    );
  }

  function totalTime(raw){
    return findAnchored(
      raw,
      ["tiempo total"],
      ["(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]"],
      durationParser,
      V.duration
    );
  }

  function calories(raw){
    const total=findAnchored(
      raw,
      ["total de calorias quemadas","calorias totales"],
      ["[0-9]{2,5}(?:\\s*kcal)?"],
      numberParser,
      V.calories
    );
    if(total)return total;

    return findAnchored(
      raw,
      ["calorias activas"],
      ["[0-9]{2,5}(?:\\s*kcal)?"],
      numberParser,
      V.calories
    );
  }

  function cadence(raw){
    return findAnchored(
      raw,
      ["cadencia media de carrera","cadencia media"],
      ["[0-9]{2,3}\\s*(?:ppm|spm)"],
      numberParser,
      V.cadence
    );
  }

  function temperature(raw){
    return findAnchored(
      raw,
      ["temperatura media","temperatura"],
      ["-?[0-9]{1,2}(?:[,.][0-9])?\\s*°?\\s*c"],
      numberParser,
      V.temperature
    );
  }

  function elevation(raw){
    return findAnchored(
      raw,
      ["ascenso total","desnivel positivo","ganancia de altura"],
      ["[0-9]{1,5}\\s*m"],
      numberParser,
      V.elevation
    );
  }

  root.GarminExtractor={
    distance,avgHeartRate,maxHeartRate,avgPace,totalTime,
    calories,cadence,temperature,elevation
  };
})(window);