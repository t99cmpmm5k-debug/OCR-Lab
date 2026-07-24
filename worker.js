(function(global){
  'use strict';
  const VERSION='2.0.0';
  async function recognize(file,onProgress){
    if(!global.Tesseract) throw new Error('No se pudo cargar Tesseract.js. Comprueba la conexión a Internet.');
    const started=performance.now();
    const result=await global.Tesseract.recognize(file,'spa+eng',{logger(message){
      if(message.status==='recognizing text'&&typeof onProgress==='function') onProgress(Math.round((message.progress||0)*100),message.status);
    }});
    return {text:result?.data?.text||'',confidence:Math.round(result?.data?.confidence||0),milliseconds:Math.round(performance.now()-started)};
  }
  global.OCRWorker={VERSION,recognize};
})(window);
