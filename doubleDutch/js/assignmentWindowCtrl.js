app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {

  $scope.onRepeat = items.onRepeat;

  $scope.numAnnealings = items.numAnnealings;
  $scope.initialTemp = items.initialTemp;

  if (!$scope.onRepeat) {
    $scope.weights = {levelMatch: items.weights.levelMatch, homology: items.weights.homology, reuse: items.weights.reuse};
    
    $scope.numClusterings = items.numClusterings;
    $scope.autoTarget = items.autoTarget;
  }

  $scope.ok = function () {
    if ($scope.onRepeat) {
      $modalInstance.close({initialTemp: $scope.initialTemp, numAnnealings: $scope.numAnnealings});
    } else {
      $modalInstance.close({initialTemp: $scope.initialTemp, numAnnealings: $scope.numAnnealings,  
          weights: $scope.weights, autoTarget: $scope.autoTarget, numClusterings: $scope.numClusterings});
    }
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

});