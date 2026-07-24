(function(root){
  "use strict";
  const U=root.GarminUtils;

  function detect(text){
    const n=U.normalize(text);

    if(/\bresumen\b/.test(n) && /anadir notas|añadir notas/.test(n)){
      return {type:"summary",confidence:.99};
    }

    if(/\bvueltas\b/.test(n) && !/\bestadisticas\b/.test(n)){
      return {type:"splits",confidence:.97};
    }

    if(/training effect|efecto aerobico|efecto anaerobico|carga de ejercicio|stamina/.test(n)){
      return {type:"training_effect",confidence:.97};
    }

    if(/\bestadisticas\b/.test(n)){
      return {type:"statistics",confidence:.98};
    }

    return {type:"statistics",confidence:.55};
  }

  root.GarminScreenDetector={detect};
})(window);