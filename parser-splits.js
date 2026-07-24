(function(root){
  "use strict";
  const U=root.GarminUtils;

  function parse(text){
    const raw=U.cleanText(text);
    const lines=U.linesOf(raw);
    const laps=[];

    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      const match=line.match(/\b([0-9]{1,2})\s+([0-9]{1,3}[,.][0-9]{1,2})\s*(?:km)?\s+([0-9]{1,2}:[0-5][0-9])(?:\s*\/\s*km)?/i);
      if(!match)continue;
      laps.push({
        lap:Number(match[1]),
        distance_km:U.num(match[2]),
        pace_min_km:U.pace(match[3])
      });
    }

    return {
      parser:"splits-v4.3",
      fields:{
        source:U.field("Garmin","Pantalla Vueltas",.99),
        screen_type:U.field("splits","Vueltas",.98)
      },
      extras:{laps}
    };
  }

  root.GarminSplitsParser={parse};
})(window);