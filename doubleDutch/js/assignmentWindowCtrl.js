app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {

  $scope.onRepeat = items.onRepeat;

  $scope.numAnnealings = items.numAnnealings;
  $scope.iterPerAnnealing = items.iterPerAnnealing;
  $scope.initialTemp = items.initialTemp;

  if (!$scope.onRepeat) {
    $scope.weights = {levelMatch: items.weights.levelMatch, homology: items.weights.homology, reuse: items.weights.reuse};
    
    $scope.numClusterings = items.numClusterings;
    $scope.autoTarget = items.autoTarget;
  }

  $scope.ok = function () {
    if ($scope.onRepeat) {
      $modalInstance.close({numAnnealings: $scope.numAnnealings, iterPerAnnealing: $scope.iterPerAnnealing, initialTemp: $scope.initialTemp});
    } else {
      $modalInstance.close({numAnnealings: $scope.numAnnealings, iterPerAnnealing: $scope.iterPerAnnealing, initialTemp: $scope.initialTemp,
          weights: $scope.weights, autoTarget: $scope.autoTarget, numClusterings: $scope.numClusterings});
    }
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

});