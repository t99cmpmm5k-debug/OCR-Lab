(function(root){
  "use strict";

  function parse(text){
    const screen=root.GarminScreenDetector.detect(text);
    let parsed;

    if(screen.type==="summary"){
      parsed=root.GarminSummaryParser.parse(text);
    }else{
      parsed=root.GarminStatisticsParser.parse(text);
    }

    const data=Object.fromEntries(
      Object.entries(parsed.fields).map(([k,v])=>[k,v.value])
    );

    return{
      parser:parsed.parser,
      screen,
      found:Object.values(data).filter(v=>v!=null).length,
      data,
      fields:parsed.fields,
      raw_text:text
    };
  }

  function merge(results){
    return root.GarminFusion.merge(results);
  }

  root.GarminParser={parse,merge};
})(window);