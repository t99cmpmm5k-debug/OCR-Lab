(function(global){
  'use strict';

  const FIELD_DEFS = {
    distance: {
      label: 'Distancia',
      unit: 'km',
      aliases: ['distancia', 'distance'],
      patterns: [
        /(?:distancia|distance)\s*[:\-]?\s*([0-9]{1,3}(?:[.,][0-9]{1,3})?)\s*km\b/i,
        /\b([0-9]{1,3}(?:[.,][0-9]{1,3})?)\s*km\b/i
      ],
      normalize: v => normalizeDecimal(v) + ' km',
      validate: v => betweenNumber(v, 0.01, 500)
    },
    duration: {
      label: 'Tiempo',
      unit: '',
      aliases: ['tiempo', 'duracion', 'duration', 'time', 'tiempo de carrera', 'tiempo transcurrido'],
      patterns: [
        /(?:tiempo(?: de carrera| transcurrido)?|duraci[oó]n|duration|elapsed time|time)\s*[:\-]?\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i,
        /\b([0-9]{1,2}:[0-9]{2}:[0-9]{2})\b/
      ],
      normalize: v => v,
      validate: v => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(v)
    },
    pace: {
      label: 'Ritmo medio',
      unit: '/km',
      aliases: ['ritmo medio', 'ritmo', 'average pace', 'avg pace'],
      patterns: [
        /(?:ritmo medio|ritmo|average pace|avg pace)\s*[:\-]?\s*([0-9]{1,2}:[0-9]{2})\s*(?:\/\s*km|min\/?km)?/i,
        /\b([0-9]{1,2}:[0-9]{2})\s*\/\s*km\b/i
      ],
      normalize: v => v.replace(/\s+/g,'') + '/km',
      validate: v => validPace(v)
    },
    avgHeartRate: {
      label: 'FC media',
      unit: 'ppm',
      aliases: ['frecuencia cardiaca media', 'frecuencia cardíaca media', 'fc media', 'frec cardiaca media', 'average heart rate', 'avg hr'],
      patterns: [
        /(?:frecuencia card[ií]aca media|fc media|frec\.?\s*card[ií]aca media|average heart rate|avg hr)\s*[:\-]?\s*([0-9]{2,3})\s*(?:ppm|bpm)?/i
      ],
      normalize: v => String(parseInt(v,10)) + ' ppm',
      validate: v => betweenNumber(v, 30, 240)
    },
    maxHeartRate: {
      label: 'FC máxima',
      unit: 'ppm',
      aliases: ['frecuencia cardiaca maxima', 'frecuencia cardíaca máxima', 'fc maxima', 'fc máxima', 'frec cardiaca max', 'maximum heart rate', 'max hr'],
      patterns: [
        /(?:frecuencia card[ií]aca m[aá]xima|fc m[aá]xima|frec\.?\s*card[ií]aca max\.?|maximum heart rate|max hr)\s*[:\-]?\s*([0-9]{2,3})\s*(?:ppm|bpm)?/i
      ],
      normalize: v => String(parseInt(v,10)) + ' ppm',
      validate: v => betweenNumber(v, 30, 250)
    },
    cadence: {
      label: 'Cadencia media',
      unit: 'ppm',
      aliases: ['cadencia media', 'cadencia media de carrera', 'average cadence', 'avg cadence'],
      patterns: [
        /(?:cadencia media(?: de carrera)?|average cadence|avg cadence)\s*[:\-]?\s*([0-9]{2,3})\s*(?:ppm|spm)?/i
      ],
      normalize: v => String(parseInt(v,10)) + ' ppm',
      validate: v => betweenNumber(v, 50, 250)
    },
    calories: {
      label: 'Calorías',
      unit: 'kcal',
      aliases: ['calorias', 'calorías', 'calorias activas', 'calorías activas', 'calories'],
      patterns: [
        /(?:calor[ií]as(?: activas)?|calories)\s*[:\-]?\s*([0-9]{1,5})\s*(?:kcal)?/i
      ],
      normalize: v => String(parseInt(v,10)) + ' kcal',
      validate: v => betweenNumber(v, 1, 20000)
    },
    temperature: {
      label: 'Temperatura',
      unit: '°C',
      aliases: ['temperatura', 'temperature'],
      patterns: [
        /(?:temperatura|temperature)\s*[:\-]?\s*(-?[0-9]{1,2}(?:[.,][0-9])?)\s*°?\s*c\b/i
      ],
      normalize: v => normalizeDecimal(v) + ' °C',
      validate: v => betweenNumber(v, -40, 70)
    },
    avgPower: {
      label: 'Potencia media',
      unit: 'W',
      aliases: ['potencia media', 'average power', 'avg power'],
      patterns: [
        /(?:potencia media|average power|avg power)\s*[:\-]?\s*([0-9]{2,4})\s*w\b/i
      ],
      normalize: v => String(parseInt(v,10)) + ' W',
      validate: v => betweenNumber(v, 20, 2500)
    },
    totalAscent: {
      label: 'Ascenso total',
      unit: 'm',
      aliases: ['ascenso total', 'desnivel positivo', 'total ascent', 'elevation gain'],
      patterns: [
        /(?:ascenso total|desnivel positivo|total ascent|elevation gain)\s*[:\-]?\s*([0-9]{1,5})\s*m\b/i
      ],
      normalize: v => String(parseInt(v,10)) + ' m',
      validate: v => betweenNumber(v, 0, 20000)
    },
    trainingEffectAerobic: {
      label: 'Training Effect aeróbico',
      unit: '',
      aliases: ['training effect aerobico', 'training effect aeróbico', 'aerobico', 'aeróbico'],
      patterns: [
        /(?:training effect\s*)?(?:aer[oó]bico)\s*[:\-]?\s*([0-5](?:[.,][0-9])?)/i
      ],
      normalize: v => normalizeDecimal(v),
      validate: v => betweenNumber(v, 0, 5)
    },
    trainingEffectAnaerobic: {
      label: 'Training Effect anaeróbico',
      unit: '',
      aliases: ['training effect anaerobico', 'training effect anaeróbico', 'anaerobico', 'anaeróbico'],
      patterns: [
        /(?:training effect\s*)?(?:anaer[oó]bico)\s*[:\-]?\s*([0-5](?:[.,][0-9])?)/i
      ],
      normalize: v => normalizeDecimal(v),
      validate: v => betweenNumber(v, 0, 5)
    },
    staminaStart: {
      label: 'Stamina inicial',
      unit: '%',
      aliases: ['stamina inicial', 'potencial inicial', 'starting stamina'],
      patterns: [
        /(?:stamina inicial|potencial inicial|starting stamina)\s*[:\-]?\s*([0-9]{1,3})\s*%/i
      ],
      normalize: v => String(parseInt(v,10)) + ' %',
      validate: v => betweenNumber(v, 0, 100)
    },
    staminaEnd: {
      label: 'Stamina final',
      unit: '%',
      aliases: ['stamina final', 'potencial final', 'ending stamina'],
      patterns: [
        /(?:stamina final|potencial final|ending stamina)\s*[:\-]?\s*([0-9]{1,3})\s*%/i
      ],
      normalize: v => String(parseInt(v,10)) + ' %',
      validate: v => betweenNumber(v, 0, 100)
    },
    strideLength: {
      label: 'Longitud de zancada',
      unit: 'm',
      aliases: ['longitud de zancada', 'stride length'],
      patterns: [
        /(?:longitud de zancada|stride length)\s*[:\-]?\s*([0-9](?:[.,][0-9]{1,2})?)\s*m\b/i
      ],
      normalize: v => normalizeDecimal(v) + ' m',
      validate: v => betweenNumber(v, 0.2, 3.5)
    },
    verticalOscillation: {
      label: 'Oscilación vertical',
      unit: 'cm',
      aliases: ['oscilacion vertical', 'oscilación vertical', 'vertical oscillation'],
      patterns: [
        /(?:oscilaci[oó]n vertical|vertical oscillation)\s*[:\-]?\s*([0-9]{1,2}(?:[.,][0-9])?)\s*cm\b/i
      ],
      normalize: v => normalizeDecimal(v) + ' cm',
      validate: v => betweenNumber(v, 1, 30)
    },
    groundContactTime: {
      label: 'Tiempo de contacto con el suelo',
      unit: 'ms',
      aliases: ['tiempo de contacto con el suelo', 'ground contact time'],
      patterns: [
        /(?:tiempo de contacto con el suelo|ground contact time)\s*[:\-]?\s*([0-9]{2,4})\s*ms\b/i
      ],
      normalize: v => String(parseInt(v,10)) + ' ms',
      validate: v => betweenNumber(v, 80, 700)
    }
  };

  function normalizeText(text){
    return String(text || '')
      .replace(/\r/g, '\n')
      .replace(/[|]/g, 'I')
      .replace(/[‐‑–—]/g, '-')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function fold(text){
    return normalizeText(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function normalizeDecimal(v){ return String(v).replace(',', '.'); }
  function numeric(v){ const n = parseFloat(String(v).replace(',', '.').replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? n : NaN; }
  function betweenNumber(v,min,max){ const n=numeric(v); return Number.isFinite(n) && n>=min && n<=max; }
  function validPace(v){
    const m=String(v).match(/(\d{1,2}):(\d{2})/); if(!m) return false;
    const min=Number(m[1]), sec=Number(m[2]); return min>=1 && min<=30 && sec>=0 && sec<60;
  }

  function scoreBrand(text){
    const t=fold(text);
    const strong=['garmin','training effect','stamina','beneficio principal','dinamica de carrera','body battery'];
    const medium=['ritmo medio','cadencia media','potencia media','ascenso total','tiempo de contacto con el suelo'];
    const score=strong.reduce((s,x)=>s+(t.includes(x)?3:0),0)+medium.reduce((s,x)=>s+(t.includes(x)?1:0),0);
    return {brand: score>=3 ? 'Garmin' : 'No identificada', score};
  }

  function findMatch(text, def){
    for(const pattern of def.patterns){
      const m=text.match(pattern);
      if(!m) continue;
      const raw=(m[1]||'').trim();
      if(!raw || !def.validate(raw)) continue;
      return {value:def.normalize(raw), raw, confidence:0.96, method:'regex_etiqueta'};
    }
    return null;
  }

  function parse(text){
    const cleaned=normalizeText(text);
    const brand=scoreBrand(cleaned);
    const fields={};
    const warnings=[];
    for(const [key,def] of Object.entries(FIELD_DEFS)){
      const found=findMatch(cleaned,def);
      fields[key]=found ? {...found,label:def.label} : {value:null,raw:null,confidence:0,method:null,label:def.label};
    }

    const foundCount=Object.values(fields).filter(x=>x.value!==null).length;
    if(cleaned.length<20) warnings.push('La captura contiene muy poco texto legible.');
    if(foundCount===0) warnings.push('No se ha encontrado ninguna métrica. El parser no inventa datos.');
    if(brand.brand!=='Garmin') warnings.push('La marca no puede confirmarse con el texto disponible.');

    return {
      platform: brand.brand==='Garmin' ? 'garmin' : null,
      brandDetection: brand,
      rawText: cleaned,
      fields,
      summary:{found:foundCount,total:Object.keys(fields).length,characters:cleaned.length},
      warnings
    };
  }

  global.GarminParser={parse,FIELD_DEFS,normalizeText};
})(window);
