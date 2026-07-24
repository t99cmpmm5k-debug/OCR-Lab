(function(root){
  "use strict";

  function parse(text){
    const screen=root.GarminScreenDetector.detect(text);
    const base=screen.type==="summary"
      ? root.GarminSummaryParser.parse(text)
      : root.GarminStatisticsParser.parse(text);

    const candidates=root.GarminCandidateEngine.extract(text,screen.type);

    const data=Object.fromEntries(
      Object.entries(base.fields||{}).map(([k,v])=>[k,v.value])
    );

    return{
      parser:base.parser,
      screen,
      found:Object.values(data).filter(v=>v!=null).length,
      data,
      fields:base.fields,
      candidates,
      raw_text:text
    };
  }

  function merge(results){
    const withCapture=results.map((r,index)=>({...r,capture:index+1}));
    return root.GarminConflictResolver.resolve(withCapture);
  }

  root.GarminParser={parse,merge};
})(window);