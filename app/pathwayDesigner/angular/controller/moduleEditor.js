function moduleEditor($scope, $modalInstance, items) {
  
  $scope.features = items.features;
  $scope.selected = [];
  var selectedFeats = items.flNode.bioDesign.module.getFeatures();
  var i;
  for (i = 0; i < selectedFeats.length; i++ ) {
    $scope.selected.push({feature: selectedFeats[i]});
  }

  $scope.ok = function() {
    var feats = [];
    var i;
    for (i = 0; i < $scope.selected.length; i++ ) {
      feats.push($scope.selected[i].feature);
    }
    $modalInstance.close(feats);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.moveFeature = function(item) {
    if ($scope.selected.length > 1) {
      var target = $scope.selected.indexOf(item);
      $scope.selected.splice(target, 1);
      if (target > 0) {
        $scope.selected.splice(target - 1, 0, item);
      }
    }
  }

}