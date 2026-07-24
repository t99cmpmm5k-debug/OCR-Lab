(() => {
  'use strict';

  const imageInput = document.getElementById('imageInput');
  const fileInfo = document.getElementById('fileInfo');
  const preview = document.getElementById('preview');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const resultCard = document.getElementById('resultCard');
  const ocrOutput = document.getElementById('ocrOutput');
  const errorCard = document.getElementById('errorCard');
  const errorOutput = document.getElementById('errorOutput');
  const copyButton = document.getElementById('copyButton');

  let previewUrl = null;

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

  function formatError(error) {
    const lines = [];
    if (error && error.name) lines.push(`Nombre: ${error.name}`);
    if (error && error.message) lines.push(`Mensaje: ${error.message}`);
    if (error && error.stack) lines.push(`\nStack:\n${error.stack}`);
    if (!lines.length) lines.push(String(error));
    lines.push(`\nURL: ${window.location.href}`);
    lines.push(`Navegador: ${navigator.userAgent}`);
    lines.push(`Tesseract disponible: ${typeof window.Tesseract !== 'undefined'}`);
    return lines.join('\n');
  }

  async function runOCR(file) {
    resultCard.hidden = true;
    errorCard.hidden = true;
    ocrOutput.textContent = '';
    errorOutput.textContent = '';
    setProgress(0);

    if (!window.Tesseract || typeof window.Tesseract.recognize !== 'function') {
      throw new Error('Tesseract.js no se ha cargado. Revisa la conexión o el acceso al CDN.');
    }

    setStatus('Procesando', 'Preparando el motor OCR…', 'working');

    const result = await window.Tesseract.recognize(file, 'spa+eng', {
      logger(message) {
        const progress = typeof message.progress === 'number' ? message.progress : 0;
        setProgress(progress);
        const readableStatus = message.status || 'Procesando';
        setStatus('Procesando', readableStatus, 'working');
      }
    });

    const text = result?.data?.text ?? '';
    setProgress(1);
    setStatus('Completado', 'OCR terminado correctamente.', 'success');
    ocrOutput.textContent = text.trim() || '[El OCR terminó, pero no reconoció texto.]';
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus('Error', 'El archivo seleccionado no es una imagen.', 'error');
      return;
    }

    fileInfo.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB · ${file.type || 'tipo desconocido'}`;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;

    try {
      await runOCR(file);
    } catch (error) {
      console.error('OCR Lab V2.2:', error);
      setStatus('Error', 'El OCR no pudo completarse.', 'error');
      errorOutput.textContent = formatError(error);
      errorCard.hidden = false;
      errorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ocrOutput.textContent || '');
      copyButton.textContent = 'Copiado';
      setTimeout(() => { copyButton.textContent = 'Copiar'; }, 1400);
    } catch {
      copyButton.textContent = 'No se pudo copiar';
      setTimeout(() => { copyButton.textContent = 'Copiar'; }, 1800);
    }
  });
})();
