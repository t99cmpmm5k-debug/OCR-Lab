(function(root){
  "use strict";
  const U=root.GarminUtils;

  function findNumber(text,labelRegex,valueRegex){
    const lines=U.linesOf(text);
    return U.around(lines,labelRegex,valueRegex,3);
  }

  function parse(text){
    const raw=U.cleanText(text);
    const fields={
      source:U.field("Garmin","Pantalla Training Effect",.99),
      screen_type:U.field("training_effect","Training Effect",.98)
    };

    const aerobic=findNumber(
      raw,
      /aerobica|efecto aerobico/,
      /\b([0-5](?:[,.][0-9])?)\b/
    );
    const anaerobic=findNumber(
      raw,
      /anaerobico|efecto anaerobico/,
      /\b([0-5](?:[,.][0-9])?)\b/
    );
    const load=findNumber(
      raw,
      /carga de ejercicio/,
      /\b([0-9]{1,4})\b/
    );
    const avgPower=findNumber(
      raw,
      /potencia media/,
      /\b([0-9]{2,4})\s*w\b/i
    );
    const maxPower=findNumber(
      raw,
      /potencia maxima/,
      /\b([0-9]{2,4})\s*w\b/i
    );

    return {
      parser:"training-effect-v4.3",
      fields,
      extras:{
        aerobic_effect:aerobic?U.num(aerobic.match[1]):null,
        anaerobic_effect:anaerobic?U.num(anaerobic.match[1]):null,
        exercise_load:load?U.num(load.match[1]):null,
        avg_power_w:avgPower?U.num(avgPower.match[1]):null,
        max_power_w:maxPower?U.num(maxPower.match[1]):null
      }
    };
  }

  root.GarminTrainingEffectParser={parse};
})(window);