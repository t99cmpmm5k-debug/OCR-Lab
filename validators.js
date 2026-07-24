(function(root){
  "use strict";

  function inRange(value,min,max){
    return Number.isFinite(value) && value>=min && value<=max;
  }

  function distance(value){ return inRange(value,0.05,500); }
  function heartRate(value){ return inRange(value,35,240); }
  function calories(value){ return inRange(value,1,10000); }
  function cadence(value){ return inRange(value,80,260); }
  function temperature(value){ return inRange(value,-40,65); }
  function elevation(value){ return inRange(value,0,20000); }

  function pace(value){
    if(!/^\d{1,2}:\d{2}$/.test(String(value||"")))return false;
    const [m,s]=String(value).split(":").map(Number);
    return m>=1 && m<=30 && s>=0 && s<60;
  }

  function duration(value){
    const s=String(value||"");
    if(!/^(?:\d{1,2}:)?\d{1,3}:\d{2}$/.test(s))return false;
    const parts=s.split(":").map(Number);
    return parts.every(Number.isFinite) && parts.at(-1)<60;
  }

  root.GarminValidators={
    distance,heartRate,calories,cadence,temperature,elevation,pace,duration
  };
})(window);