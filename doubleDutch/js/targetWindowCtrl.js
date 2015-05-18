app.controller('targetWindowCtrl', function ($scope, $modalInstance, items) {
  $scope.levelTargets = [];
  if (items.levelTargets.length == 0) {
    $scope.levelTargets.push({value: 0});
    $scope.levelTargets.push({value: 0});
  } else {
    var i;
    for (i = 0; i < items.levelTargets.length; i++ ) {
      $scope.levelTargets.push({value: items.levelTargets[i]});
    }
  }
 
  $scope.areTargetsDisabled = !items.chooseTargets;

  $scope.ok = function () {
    var levelTargets = [];
    var i;
    for (i = 0; i < $scope.levelTargets.length; i++ ) {
      if ($scope.levelTargets[i].value != null 
          && !isNaN($scope.levelTargets[i].value) && $scope.levelTargets[i].value !== "") {
        levelTargets.push($scope.levelTargets[i].value);
      } 
    }
    $modalInstance.close(levelTargets);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.addTarget = function() {
    $scope.levelTargets.push({value: 0});
  }

  $scope.removeTarget = function() {
    if ($scope.levelTargets.length > 2) {
      $scope.levelTargets.pop();
    }
  }

});