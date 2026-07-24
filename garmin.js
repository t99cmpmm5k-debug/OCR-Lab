(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GarminParser = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MONTHS = 'ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic';

  function cleanText(input) {
    return String(input || '')
      .replace(/\r/g, '\n')
      .replace(/[‐‑‒–—]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function normalize(input) {
    return cleanText(input)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function linesOf(text) {
    return cleanText(text).split('\n').map(s => s.trim()).filter(Boolean);
  }

  function number(value) {
    if (value == null) return null;
    const n = Number(String(value).replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function pace(value) {
    const m = String(value || '').match(/\b([0-9]{1,2})\s*[:.]\s*([0-5][0-9])\b/);
    return m ? `${Number(m[1])}:${m[2]}` : null;
  }

  function duration(value) {
    const s = String(value || '');
    const hms = s.match(/\b([0-9]{1,2})\s*:\s*([0-5][0-9])\s*:\s*([0-5][0-9])\b/);
    if (hms) return `${Number(hms[1])}:${hms[2]}:${hms[3]}`;
    const ms = s.match(/\b([0-9]{1,3})\s*:\s*([0-5][0-9])\b/);
    return ms ? `${Number(ms[1])}:${ms[2]}` : null;
  }

  function findAround(lines, labelRegex, valueRegex, radius = 2) {
    for (let i = 0; i < lines.length; i++) {
      if (!labelRegex.test(normalize(lines[i]))) continue;
      const candidates = [];
      for (let d = 1; d <= radius; d++) {
        if (i - d >= 0) candidates.push(lines[i - d]);
        if (i + d < lines.length) candidates.push(lines[i + d]);
      }
      candidates.unshift(lines[i]);
      for (const candidate of candidates) {
        const match = candidate.match(valueRegex);
        if (match) return { match, source: candidate, label: lines[i] };
      }
    }
    return null;
  }

  function firstMatch(text, regex) {
    const m = cleanText(text).match(regex);
    return m ? { match: m, source: m[0] } : null;
  }

  function result(value, source, confidence) {
    return value == null ? { value: null, source: null, confidence: 0 } : { value, source, confidence };
  }

  function detectTitle(lines) {
    const blocked = /^(<?\s*carrera\s*:?>?|resumen|estadisticas|vueltas|graficos|equipo|anadir notas|distancia|ritmo medio|tiempo total|calorias totales)$/i;
    const candidates = lines.filter(line => !blocked.test(normalize(line)) && /\b(rodaje|carrera|running|trail|tempo|series|intervalos|recuperacion)\b/i.test(normalize(line)));
    const preferred = candidates.find(line => /\s[-–—]\s/.test(line));
    return (preferred || candidates[0] || null)?.replace(/\s+(yd|y d)$/i, '').trim() || null;
  }

  function parse(text) {
    const raw = cleanText(text);
    const normalized = normalize(raw);
    const lines = linesOf(raw);

    const distCtx = findAround(lines, /\bdistancia\b/, /\b([0-9]{1,3}(?:[,.][0-9]{1,2})?)\s*(?:km|m)?\b/i, 2);
    let distance = distCtx ? number(distCtx.match[1]) : null;
    let distanceSource = distCtx?.source || null;
    if (distance == null) {
      const m = firstMatch(raw, /\b([0-9]{1,3}[,.][0-9]{1,2})\s*(?:km|m)?\s*\n\s*distancia\b/i);
      if (m) { distance = number(m.match[1]); distanceSource = m.source; }
    }

    const hrCtx = findAround(lines, /frecuencia cardiaca media|fc media|pulso medio/, /\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i, 2);
    const avgHr = hrCtx ? number(hrCtx.match[1]) : null;

    const maxHrCtx = findAround(lines, /frecuencia cardiaca maxima|fc maxima|pulso maximo/, /\b([3-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:ppm|bpm)?\b/i, 2);
    const maxHr = maxHrCtx ? number(maxHrCtx.match[1]) : null;

    const paceCtx = findAround(lines, /ritmo medio|ritmo promedio/, /\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)?\b/i, 2);
    let avgPace = paceCtx ? pace(paceCtx.match[1]) : null;
    let paceSource = paceCtx?.source || null;
    if (!avgPace) {
      const inline = firstMatch(raw, /\b([0-9]{1,2}\s*[:.]\s*[0-5][0-9])\s*(?:\/\s*km|km)\b/i);
      if (inline) { avgPace = pace(inline.match[1]); paceSource = inline.source; }
    }

    const timeCtx = findAround(lines, /tiempo total|duracion|tiempo transcurrido/, /\b(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]\b/, 1);
    let totalTime = timeCtx ? duration(timeCtx.match[0]) : null;
    if (totalTime && totalTime === avgPace) totalTime = null;

    const calCtx = findAround(lines, /calorias totales|calorias/, /\b([0-9]{2,5})\s*(?:kcal|cal)\b/i, 1);
    const calories = calCtx ? number(calCtx.match[1]) : null;

    const cadenceCtx = findAround(lines, /cadencia media|cadencia promedio/, /\b([1-2]?[0-9]{2})\s*(?:ppm|spm|pasos\/min)?\b/i, 2);
    const cadence = cadenceCtx ? number(cadenceCtx.match[1]) : null;

    const tempCtx = findAround(lines, /temperatura media|temperatura/, /\b(-?[0-9]{1,2}(?:[,.][0-9])?)\s*°?\s*c\b/i, 2);
    const temperature = tempCtx ? number(tempCtx.match[1]) : null;

    const elevCtx = findAround(lines, /desnivel positivo|ascenso total|ganancia de altura/, /\b([0-9]{1,5})\s*m\b/i, 2);
    const elevationGain = elevCtx ? number(elevCtx.match[1]) : null;

    const dateMatch = firstMatch(raw, new RegExp(`\\b([0-3]?[0-9])\\s+(${MONTHS})(?:\\s+(20[0-9]{2}))?\\b`, 'i'));
    const clockMatches = [...raw.matchAll(/\b([0-2]?[0-9]):([0-5][0-9])\b/g)]
      .map(m => ({ value: `${Number(m[1])}:${m[2]}`, index: m.index, source: m[0] }))
      .filter(x => !avgPace || x.value !== avgPace);
    const activityTime = clockMatches.length ? clockMatches[clockMatches.length - 1] : null;

    const title = detectTitle(lines);
    let location = null;
    let activity = null;
    if (title) {
      const parts = title.split(/\s+-\s+/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        location = parts[0];
        activity = parts.slice(1).join(' - ');
      } else {
        activity = title;
      }
    }

    const fields = {
      source: result(/garmin|garmin connect|resumen\s+estadisticas\s+vueltas/i.test(normalized) ? 'Garmin' : 'Garmin probable', 'Diseño/texto detectado', 0.75),
      title: result(title, title, title ? 0.9 : 0),
      location: result(location, title, location ? 0.85 : 0),
      activity: result(activity, title, activity ? 0.85 : 0),
      date: result(dateMatch ? `${Number(dateMatch.match[1])} ${dateMatch.match[2].toLowerCase()}${dateMatch.match[3] ? ' ' + dateMatch.match[3] : ''}` : null, dateMatch?.source, dateMatch ? 0.95 : 0),
      time: result(activityTime?.value || null, activityTime?.source || null, activityTime ? 0.65 : 0),
      distance_km: result(distance, distanceSource, distance != null ? 0.95 : 0),
      avg_heart_rate_bpm: result(avgHr, hrCtx?.source, avgHr != null ? 0.98 : 0),
      max_heart_rate_bpm: result(maxHr, maxHrCtx?.source, maxHr != null ? 0.98 : 0),
      avg_pace_min_km: result(avgPace, paceSource, avgPace ? 0.98 : 0),
      total_time: result(totalTime, timeCtx?.source, totalTime ? 0.9 : 0),
      calories_kcal: result(calories, calCtx?.source, calories != null ? 0.85 : 0),
      cadence_spm: result(cadence, cadenceCtx?.source, cadence != null ? 0.9 : 0),
      temperature_c: result(temperature, tempCtx?.source, temperature != null ? 0.9 : 0),
      elevation_gain_m: result(elevationGain, elevCtx?.source, elevationGain != null ? 0.9 : 0)
    };

    const data = Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, item.value]));
    const found = Object.values(fields).filter(item => item.value != null).length;
    return { parser: 'garmin-v2.3.0', found, data, fields, raw_text: raw };
  }

  return { parse, cleanText, normalize };
});
