(function(root){
  "use strict";

  function parse(text){
    const detector=root.GarminScreenDetector;
    const registry=root.GarminParserRegistry;

    if(!detector||typeof detector.detect!=="function"){
      throw new Error("El detector de pantallas Garmin no se ha cargado.");
    }
    if(!registry||typeof registry.get!=="function"){
      throw new Error("El registro de parsers Garmin no se ha cargado.");
    }

    const screen=detector.detect(text);
    const parser=registry.get(screen.type);

    if(!parser||typeof parser.parse!=="function"){
      throw new Error(`No hay un parser Garmin disponible para la pantalla "${screen.type}".`);
    }

    const parsed=parser.parse(text);
    const fields=parsed.fields||{};
    const data=Object.fromEntries(
      Object.entries(fields).map(([key,item])=>[key,item?.value??null])
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
    if(!root.GarminFusion||typeof root.GarminFusion.merge!=="function"){
      throw new Error("El fusionador Garmin no se ha cargado.");
    }

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
      version:"4.3.1",
      registered_parsers:root.GarminParserRegistry?.registered?.()||[]
    };
    return merged;
  }

  root.GarminParser={parse,merge};
})(window);