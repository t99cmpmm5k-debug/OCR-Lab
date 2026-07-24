(function(root){
  "use strict";
  const U=root.GarminUtils;

  function detect(text){
    const n=U.normalize(text);

    if(/\bresumen\b/.test(n) && /anadir notas|añadir notas/.test(n)){
      return {type:"summary",confidence:.99};
    }

    if(/\bestadisticas\b/.test(n)){
      return {type:"statistics",confidence:.98};
    }

    return {type:"unknown",confidence:.35};
  }

  root.GarminScreenDetector={detect};
})(window);