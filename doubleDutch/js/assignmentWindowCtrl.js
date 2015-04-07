app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {
  
  $scope.clusteringLimit = items.clusteringLimit;
  $scope.initialTemp = items.initialTemp;
  $scope.cycleLimit = items.cycleLimit;
  $scope.toleranceModifier = items.toleranceModifier;
  
  $scope.ok = function () {
    $modalInstance.close({clusteringLimit: $scope.clusteringLimit, initialTemp: $scope.initialTemp, cycleLimit: $scope.cycleLimit, 
                    toleranceModifier: $scope.toleranceModifier});
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

});