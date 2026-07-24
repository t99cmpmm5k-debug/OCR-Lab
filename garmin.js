(function(root){
  "use strict";

  function parse(text){
    const screen=root.GarminScreenDetector.detect(text);
    const parser=root.GarminParserRegistry.get(screen.type);
    const parsed=parser.parse(text);

    const fields=parsed.fields||{};
    const data=Object.fromEntries(
      Object.entries(fields).map(([key,item])=>[key,item.value])
    );

    return {
      parser:parsed.parser,
      screen,
      found:Object.values(data).filter(value=>value!=null).length,
      data,
      fields,
      extras:parsed.extras||{},
      raw_text:text
    };
  }

  function merge(results){
    const merged=root.GarminFusion.merge(results);
    merged.extras={
      training_effect:results
        .filter(result=>result.screen?.type==="training_effect")
        .map(result=>result.extras),
      splits:results
        .filter(result=>result.screen?.type==="splits")
        .flatMap(result=>result.extras?.laps||[])
    };
    merged.architecture={
      version:"4.3.0",
      registered_parsers:root.GarminParserRegistry.registered()
    };
    return merged;
  }

  root.GarminParser={parse,merge};
})(window);