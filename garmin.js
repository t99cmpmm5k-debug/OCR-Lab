(function(root){
  "use strict";

  function parse(text){
    const capture=root.GarminCaptureParser.parse(text);

    const fields={
      source:{value:capture.source,source:"Captura",confidence:.99},
      screen_type:{value:capture.screen_type,source:"Detector",confidence:.99},
      title:{value:capture.identity.title,source:"Resumen",confidence:capture.identity.title?.97:0},
      location:{value:capture.identity.location,source:"Resumen",confidence:capture.identity.location?.97:0},
      activity:{value:capture.identity.activity,source:"Resumen",confidence:capture.identity.activity?.97:0},
      date:{value:capture.identity.date,source:"Resumen",confidence:capture.identity.date?.97:0},
      time:{value:capture.identity.time,source:"Resumen",confidence:capture.identity.time?.9:0}
    };

    Object.entries(capture.metrics).forEach(([key,value])=>{
      const evidence=capture.evidence[key];
      fields[key]={
        value,
        source:evidence?.source||null,
        confidence:value==null?0:(evidence?.confidence||.95)
      };
    });

    const data=Object.fromEntries(
      Object.entries(fields).map(([k,v])=>[k,v.value])
    );

    return{
      parser:"capture-v6-structured-json",
      screen:{type:capture.screen_type,confidence:.99},
      found:Object.values(data).filter(v=>v!=null).length,
      data,
      fields,
      structured_capture:capture,
      raw_text:text
    };
  }

  function merge(results){
    const captures=results.map(r=>r.structured_capture);
    return root.GarminStructuredFusion.merge(captures);
  }

  root.GarminParser={parse,merge};
})(window);