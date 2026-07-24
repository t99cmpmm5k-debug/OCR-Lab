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


  function semanticValue(lines,labelRegex,valueRegex,options={}){
    const {
      maxDistance=3,
      preferAfter=true,
      rejectLabelRegex=null
    }=options;

    for(let i=0;i<lines.length;i++){
      const label=lines[i];
      const normalizedLabel=normalize(label);
      if(!labelRegex.test(normalizedLabel))continue;
      if(rejectLabelRegex && rejectLabelRegex.test(normalizedLabel))continue;

      const order=[];
      if(preferAfter){
        for(let d=0;d<=maxDistance;d++)if(i+d<lines.length)order.push(i+d);
        for(let d=1;d<=maxDistance;d++)if(i-d>=0)order.push(i-d);
      }else{
        for(let d=0;d<=maxDistance;d++)if(i-d>=0)order.push(i-d);
        for(let d=1;d<=maxDistance;d++)if(i+d<lines.length)order.push(i+d);
      }

      for(const idx of order){
        const source=lines[idx];
        if(idx!==i && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .()/-]{3,}$/.test(source))continue;
        const match=source.match(valueRegex);
        if(match)return{match,source,label,index:idx,distance:Math.abs(idx-i)};
      }
    }
    return null;
  }

  function cleanActivityTitle(value){
    let text=cleanText(value)
      .replace(/^[<‹«>›»:\s-]+|[<‹«>›»:\s-]+$/g,"")
      .replace(/\s+/g," ")
      .trim();

    // Remove common trailing OCR fragments caused by map labels/icons.
    text=text.replace(/\s+(?:za|2a|z4|24|ia)$/i,"").trim();
    return text||null;
  }


  root.GarminUtils={MONTHS,cleanText,normalize,linesOf,num,pace,duration,first,around,semanticValue,cleanActivityTitle,field};
})(window);