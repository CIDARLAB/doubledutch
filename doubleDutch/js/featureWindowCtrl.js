app.controller('featureWindowCtrl', function ($scope, $modalInstance, items) {
  
  $scope.features = items.features;
  $scope.selected = {
    features: items.selectedFeatures
  };

  $scope.ok = function () {
    $modalInstance.close($scope.selected.features);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.moveFeature = function(feat) {
    if ($scope.selected.features.length > 1) {
      var target = $scope.selected.features.indexOf(feat);
      $scope.selected.features.splice(target, 1);
      if (target > 0) {
        $scope.selected.features.splice(target - 1, 0, feat);
      }
    }
  }

});