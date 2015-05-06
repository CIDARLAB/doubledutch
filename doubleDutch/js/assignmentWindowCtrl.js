app.controller('assignmentWindowCtrl', function ($scope, $modalInstance, items) {
  
  $scope.numClusterings = items.numClusterings;
  $scope.initialTemp = items.initialTemp;
  $scope.numAnnealings = items.numAnnealings;
  $scope.toleranceModifier = items.toleranceModifier;
  
  $scope.ok = function () {
    $modalInstance.close({numClusterings: $scope.numClusterings, initialTemp: $scope.initialTemp, numAnnealings: $scope.numAnnealings, 
                    toleranceModifier: $scope.toleranceModifier});
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

});