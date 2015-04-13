app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {
  
  $scope.clusteringLimit = items.clusteringLimit;
  $scope.initialTemp = items.initialTemp;
  $scope.trialLimit = items.trialLimit;
  $scope.toleranceModifier = items.toleranceModifier;
  
  $scope.ok = function () {
    $modalInstance.close({clusteringLimit: $scope.clusteringLimit, initialTemp: $scope.initialTemp, trialLimit: $scope.trialLimit, 
                    toleranceModifier: $scope.toleranceModifier});
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

});