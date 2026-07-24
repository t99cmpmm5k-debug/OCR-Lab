(function(root){
  "use strict";

  const parsers={
    summary:()=>root.GarminSummaryParser,
    statistics:()=>root.GarminStatisticsParser,
    training_effect:()=>root.GarminTrainingEffectParser,
    splits:()=>root.GarminSplitsParser
  };

  function get(type){
    const factory=parsers[type];
    return factory?factory():root.GarminStatisticsParser;
  }

  function registered(){
    return Object.keys(parsers);
  }

  root.GarminParserRegistry={get,registered};
})(window);