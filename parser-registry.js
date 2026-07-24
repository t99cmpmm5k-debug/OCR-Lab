(function(root){
  "use strict";

  function available(parser){
    return parser && typeof parser.parse==="function";
  }

  function get(type){
    const requested={
      summary:root.GarminSummaryParser,
      statistics:root.GarminStatisticsParser,
      training_effect:root.GarminTrainingEffectParser,
      splits:root.GarminSplitsParser
    }[type];

    if(available(requested))return requested;

    // Never stop the whole OCR because an optional parser file is missing.
    if(available(root.GarminStatisticsParser))return root.GarminStatisticsParser;
    if(available(root.GarminSummaryParser))return root.GarminSummaryParser;

    return null;
  }

  function registered(){
    return [
      ["summary",root.GarminSummaryParser],
      ["statistics",root.GarminStatisticsParser],
      ["training_effect",root.GarminTrainingEffectParser],
      ["splits",root.GarminSplitsParser]
    ].filter(([,parser])=>available(parser)).map(([name])=>name);
  }

  root.GarminParserRegistry={get,registered};
})(window);