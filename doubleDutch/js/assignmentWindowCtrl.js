app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {

  $scope.isAssigning = items.isAssigning;

  $scope.isTemplateAssignment = items.isTemplateAssignment;
  $scope.defaultIsTemplateAssignment = items.defaultIsTemplateAssignment;

  $scope.isAssignmentExhaustive = items.isAssignmentExhaustive;
  $scope.defaultIsAssignmentExhaustive = items.defaultIsAssignmentExhaustive;

  $scope.isExhaustivelyAssigning = (items.isAssigning && items.isAssignmentExhaustive);

  $scope.timeout = items.timeout;
  $scope.defaultTimeout = items.defaultTimeout;

  $scope.initialAnnealingOptions = items.annealingOptions;
  $scope.annealingOptions = {numAnnealings: items.annealingOptions.numAnnealings, iterPerAnnealing: items.annealingOptions.iterPerAnnealing, 
      initialTemp: items.annealingOptions.initialTemp, reuseReward: items.annealingOptions.reuseReward};
  $scope.defaultAnnealingOptions = items.defaultAnnealingOptions;

  $scope.initialWeights = items.weights;
  $scope.weights = {levelMatch: items.weights.levelMatch, homology: items.weights.homology, reuse: items.weights.reuse};
  $scope.defaultWeights = items.defaultWeights;
  
  $scope.initialNumClusterings = items.clusteringOptions.numClusterings;
  $scope.clusteringOptions = {numClusterings: items.clusteringOptions.numClusterings, autoTarget: items.clusteringOptions.autoTarget};
  $scope.defaultClusteringOptions = items.defaultClusteringOptions;

  $scope.reuseOptions = items.reuseOptions;

  $scope.minInput = 1;
  $scope.maxInput = 1000000000;
  $scope.inputStep = 1;

  $scope.minInputZero = 0;

  $scope.restoreDefaults = function() {
    if (!$scope.isAssigning) {
      $scope.isTemplateAssignment = $scope.defaultIsTemplateAssignment;
      $scope.isAssignmentExhaustive = $scope.defaultIsAssignmentExhaustive;
      $scope.timeout = $scope.defaultTimeout;
      $scope.annealingOptions.numAnnealings = $scope.defaultAnnealingOptions.numAnnealings;
      $scope.annealingOptions.iterPerAnnealing = $scope.defaultAnnealingOptions.iterPerAnnealing;
      $scope.annealingOptions.initialTemp = $scope.defaultAnnealingOptions.initialTemp;
      $scope.annealingOptions.reuseReward = $scope.defaultAnnealingOptions.reuseReward;
      $scope.weights = {levelMatch: $scope.defaultWeights.levelMatch, homology: $scope.defaultWeights.homology, reuse: $scope.defaultWeights.reuse};
      $scope.clusteringOptions = {numClusterings: $scope.defaultClusteringOptions.numClusterings, autoTarget: $scope.defaultClusteringOptions.autoTarget};
    } else if (!$scope.isExhaustivelyAssigning) {
      $scope.annealingOptions.numAnnealings = $scope.defaultAnnealingOptions.numAnnealings;
    } else {
      $scope.timeout = $scope.defaultTimeout;
    }
  };

  $scope.ok = function() {
    $scope.annealingOptions.numAnnealings = validateNumericInput($scope.annealingOptions.numAnnealings, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialAnnealingOptions.numAnnealings);
    $scope.annealingOptions.iterPerAnnealing = validateNumericInput($scope.annealingOptions.iterPerAnnealing, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialAnnealingOptions.iterPerAnnealing);
    $scope.annealingOptions.initialTemp = validateNumericInput($scope.annealingOptions.initialTemp, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialAnnealingOptions.initialTemp);
    
    $scope.weights.levelMatch = validateNumericInput($scope.weights.levelMatch, $scope.minInputZero, $scope.maxInput, $scope.inputStep, 
        $scope.initialWeights.levelMatch); 
    $scope.weights.homology = validateNumericInput($scope.weights.homology, $scope.minInputZero, $scope.maxInput, $scope.inputStep, 
        $scope.initialWeights.homology);
    $scope.weights.reuse = validateNumericInput($scope.weights.reuse, $scope.minInputZero, $scope.maxInput, $scope.inputStep, 
        $scope.initialWeights.reuse);

    $scope.clusteringOptions.numClusterings = validateNumericInput($scope.clusteringOptions.numClusterings, $scope.minInput, $scope.maxInput, $scope.inputStep, 
        $scope.initialNumClusterings);
    
    $modalInstance.close({isTemplateAssignment: $scope.isTemplateAssignment, isAssignmentExhaustive: $scope.isAssignmentExhaustive, 
      timeout: $scope.timeout, annealingOptions: $scope.annealingOptions, weights: $scope.weights, clusteringOptions: $scope.clusteringOptions});
  };

  $scope.changeTemplateAssignment = function() {
    if ($scope.isTemplateAssignment) {
      $scope.clusteringOptions.autoTarget = true;
    }
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

});