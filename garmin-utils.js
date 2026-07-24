(function(root){
  "use strict";

  const MONTHS="ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic";

  function cleanText(input){
    return String(input||"")
      .replace(/\r/g,"\n")
      .replace(/[‐‑‒–—]/g,"-")
      .replace(/[“”]/g,'"')
      .replace(/[’]/g,"'")
      .replace(/\u00a0/g," ")
      .replace(/[ \t]+/g," ")
      .replace(/\n{3,}/g,"\n\n")
      .trim();
  }

  function normalize(input){
    return cleanText(input).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function linesOf(text){
    return cleanText(text).split("\n").map(s=>s.trim()).filter(Boolean);
  }

  function num(value){
    if(value==null)return null;
    const n=Number(String(value).replace(",",".").replace(/[^0-9.\-]/g,""));
    return Number.isFinite(n)?n:null;
  }

  function pace(value){
    const m=String(value||"").match(/\b([0-9]{1,2})\s*[:.]\s*([0-5][0-9])\b/);
    return m?`${Number(m[1])}:${m[2]}`:null;
  }

  function duration(value){
    const s=String(value||"");
    const h=s.match(/\b([0-9]{1,2})\s*:\s*([0-5][0-9])\s*:\s*([0-5][0-9])\b/);
    if(h)return `${Number(h[1])}:${h[2]}:${h[3]}`;
    const m=s.match(/\b([0-9]{1,3})\s*:\s*([0-5][0-9])\b/);
    return m?`${Number(m[1])}:${m[2]}`:null;
  }

  function first(text,regex){
    const m=cleanText(text).match(regex);
    return m?{match:m,source:m[0]}:null;
  }

  function around(lines,labelRegex,valueRegex,radius=2){
    for(let i=0;i<lines.length;i++){
      if(!labelRegex.test(normalize(lines[i])))continue;
      const candidates=[lines[i]];
      for(let d=1;d<=radius;d++){
        if(i-d>=0)candidates.push(lines[i-d]);
        if(i+d<lines.length)candidates.push(lines[i+d]);
      }
      for(const source of candidates){
        const match=source.match(valueRegex);
        if(match)return{match,source,label:lines[i]};
      }
    }
    return null;
  }

  function field(value,source,confidence){
    return value==null
      ? {value:null,source:null,confidence:0}
      : {value,source,confidence};
  }

  root.GarminUtils={MONTHS,cleanText,normalize,linesOf,num,pace,duration,first,around,field};
})(window);