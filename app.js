(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const imageInput = $('imageInput');
  const fileInfo = $('fileInfo');
  const preview = $('preview');
  const statusBadge = $('statusBadge');
  const statusText = $('statusText');
  const progressBar = $('progressBar');
  const progressText = $('progressText');
  const metricsCard = $('metricsCard');
  const metricsGrid = $('metricsGrid');
  const foundBadge = $('foundBadge');
  const jsonCard = $('jsonCard');
  const jsonOutput = $('jsonOutput');
  const resultCard = $('resultCard');
  const ocrOutput = $('ocrOutput');
  const errorCard = $('errorCard');
  const errorOutput = $('errorOutput');
  let previewUrl = null;

  const labels = {
    source: ['Fuente', ''], title: ['Título', ''], location: ['Lugar', ''], activity: ['Actividad', ''],
    date: ['Fecha', ''], time: ['Hora', ''], distance_km: ['Distancia', ' km'],
    avg_heart_rate_bpm: ['FC media', ' ppm'], max_heart_rate_bpm: ['FC máxima', ' ppm'],
    avg_pace_min_km: ['Ritmo medio', ' /km'], total_time: ['Tiempo total', ''],
    calories_kcal: ['Calorías', ' kcal'], cadence_spm: ['Cadencia', ' ppm'],
    temperature_c: ['Temperatura', ' °C'], elevation_gain_m: ['Desnivel +', ' m']
  };

  function setStatus(label, message, type = 'idle') {
    statusBadge.textContent = label;
    statusBadge.className = `badge ${type}`;
    statusText.textContent = message;
  }
  function setProgress(value) {
    const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent} %`;
  }
  function resetResults() {
    metricsCard.hidden = jsonCard.hidden = resultCard.hidden = errorCard.hidden = true;
    metricsGrid.innerHTML = '';
    jsonOutput.textContent = ocrOutput.textContent = errorOutput.textContent = '';
    setProgress(0);
  }
  function formatError(error) {
    return [`Nombre: ${error?.name || 'Error'}`, `Mensaje: ${error?.message || String(error)}`, error?.stack ? `\nStack:\n${error.stack}` : '', `\nURL: ${location.href}`, `Navegador: ${navigator.userAgent}`].filter(Boolean).join('\n');
  }
  function renderParsed(parsed) {
    const entries = Object.entries(parsed.data);
    metricsGrid.innerHTML = entries.map(([key, value]) => {
      const [label, suffix] = labels[key] || [key, ''];
      const shown = value == null || value === '' ? 'No encontrado' : `${value}${suffix}`;
      return `<div class="metric ${value == null || value === '' ? 'missing' : ''}"><span class="metric-label">${label}</span><strong class="metric-value">${shown}</strong></div>`;
    }).join('');
    foundBadge.textContent = `${parsed.found} campos`;
    jsonOutput.textContent = JSON.stringify(parsed.data, null, 2);
    metricsCard.hidden = false;
    jsonCard.hidden = false;
  }
  async function copyText(button, text) {
    try {
      await navigator.clipboard.writeText(text || '');
      const old = button.textContent; button.textContent = 'Copiado';
      setTimeout(() => { button.textContent = old; }, 1400);
    } catch { button.textContent = 'No se pudo copiar'; }
  }
  async function runOCR(file) {
    resetResults();
    if (!window.Tesseract?.recognize) throw new Error('Tesseract.js no se ha cargado.');
    if (!window.GarminParser?.parse) throw new Error('El parser Garmin no se ha cargado.');
    setStatus('Procesando', 'Leyendo la captura…', 'working');
    const result = await window.Tesseract.recognize(file, 'spa+eng', {
      logger(message) {
        setProgress(typeof message.progress === 'number' ? message.progress : 0);
        setStatus('Procesando', message.status || 'Procesando', 'working');
      }
    });
    const text = result?.data?.text?.trim() || '';
    const parsed = window.GarminParser.parse(text);
    ocrOutput.textContent = text || '[El OCR terminó, pero no reconoció texto.]';
    renderParsed(parsed);
    resultCard.hidden = false;
    setProgress(1);
    setStatus('Completado', `OCR y parser terminados. ${parsed.found} campos detectados.`, 'success');
    metricsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setStatus('Error', 'El archivo no es una imagen.', 'error'); return; }
    fileInfo.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB · ${file.type || 'tipo desconocido'}`;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file); preview.src = previewUrl; preview.hidden = false;
    try { await runOCR(file); }
    catch (error) {
      console.error('OCR Lab V2.3:', error);
      setStatus('Error', 'No se pudo completar el proceso.', 'error');
      errorOutput.textContent = formatError(error); errorCard.hidden = false;
      errorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  $('copyButton').addEventListener('click', e => copyText(e.currentTarget, ocrOutput.textContent));
  $('copyJsonButton').addEventListener('click', e => copyText(e.currentTarget, jsonOutput.textContent));
})();
