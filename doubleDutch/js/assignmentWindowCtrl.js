app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {

  $scope.isAssigning = items.isAssigning;

  $scope.isAnnealing = items.isAnnealing;
  $scope.defaultIsAnnealing = items.defaultIsAnnealing;

  $scope.initialAnnealingOptions = items.annealingOptions;
  $scope.annealingOptions = {numAnnealings: items.annealingOptions.numAnnealings, iterPerAnnealing: items.annealingOptions.iterPerAnnealing, 
      initialTemp: items.annealingOptions.initialTemp};
  $scope.defaultAnnealingOptions = items.defaultAnnealingOptions;

  $scope.initialWeights = items.weights;
  $scope.weights = {levelMatch: items.weights.levelMatch, homology: items.weights.homology, reuse: items.weights.reuse};
  $scope.defaultWeights = items.defaultWeights;
  
  $scope.initialNumClusterings = items.clusteringOptions.numClusterings;
  $scope.clusteringOptions = {numClusterings: items.clusteringOptions.numClusterings, autoTarget: items.clusteringOptions.autoTarget};
  $scope.defaultClusteringOptions = items.defaultClusteringOptions;

  $scope.minInput = 1;
  $scope.maxInput = 1000000;
  $scope.inputStep = 1;

  $scope.minWeight = 0;

  $scope.restoreDefaults = function() {
    $scope.annealingOptions.numAnnealings = $scope.defaultAnnealingOptions.numAnnealings;
    if (!$scope.isAssigning) {
      $scope.isAnnealing = $scope.defaultIsAnnealing;
      $scope.annealingOptions.iterPerAnnealing = $scope.defaultAnnealingOptions.iterPerAnnealing;
      $scope.annealingOptions.initialTemp = $scope.defaultAnnealingOptions.initialTemp;
      $scope.weights = {levelMatch: $scope.defaultWeights.levelMatch, homology: $scope.defaultWeights.homology, reuse: $scope.defaultWeights.reuse};
      $scope.clusteringOptions = {numClusterings: $scope.defaultClusteringOptions.numClusterings, autoTarget: $scope.defaultClusteringOptions.autoTarget};
    }
  };

  $scope.ok = function() {
    $scope.annealingOptions.numAnnealings = validateNumericInput($scope.annealingOptions.numAnnealings, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialAnnealingOptions.numAnnealings);
    $scope.annealingOptions.iterPerAnnealing = validateNumericInput($scope.annealingOptions.iterPerAnnealing, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialAnnealingOptions.iterPerAnnealing);
    $scope.annealingOptions.initialTemp = validateNumericInput($scope.annealingOptions.initialTemp, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialAnnealingOptions.initialTemp);
    
    $scope.weights.levelMatch = validateNumericInput($scope.weights.levelMatch, $scope.minWeight, $scope.maxInput, $scope.inputStep, 
        $scope.initialWeights.levelMatch); 
    $scope.weights.homology = validateNumericInput($scope.weights.homology, $scope.minWeight, $scope.maxInput, $scope.inputStep, 
        $scope.initialWeights.homology);
    $scope.weights.reuse = validateNumericInput($scope.weights.reuse, $scope.minWeight, $scope.maxInput, $scope.inputStep, 
        $scope.initialWeights.reuse);

    $scope.clusteringOptions.numClusterings = validateNumericInput($scope.clusteringOptions.numClusterings, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialNumClusterings);
    
    $modalInstance.close({isAnnealing: $scope.isAnnealing, annealingOptions: $scope.annealingOptions, weights: $scope.weights, 
        clusteringOptions: $scope.clusteringOptions});
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

});