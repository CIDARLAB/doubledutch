app.controller('targetWindowCtrl', function ($scope, $modalInstance, items) {
  $scope.autoTarget = items.autoTarget;
  $scope.minTarget = items.minTarget;
  $scope.maxTarget = items.maxTarget;
  $scope.targetStep = 0.01;

  $scope.initialLevelTargets;
  $scope.levelTargets;
  if (items.levelTargets.length == 0) {
    $scope.initialLevelTargets = [$scope.minTarget, $scope.minTarget];
    $scope.levelTargets = [{value: $scope.minTarget}, {value: $scope.minTarget}];
  } else {
    $scope.initialLevelTargets = items.levelTargets;
    $scope.levelTargets = [];
    var i;
    for (i = 0; i < items.levelTargets.length; i++ ) {
      $scope.levelTargets.push({value: items.levelTargets[i]});
    }
  }

  $scope.ok = function() {
    var levelTargets = [];
    var i;
    for (i = 0; i < $scope.levelTargets.length; i++) {
      var defaultLevelTarget;
      if (i < $scope.initialLevelTargets.length) {
        defaultLevelTarget = $scope.initialLevelTargets[i];
      } else {
        defaultLevelTarget = $scope.minTarget;
      }
      levelTargets.push(validateNumericInput($scope.levelTargets[i].value, $scope.minTarget, $scope.maxTarget, 
          $scope.targetStep, defaultLevelTarget));
    }
    $modalInstance.close(levelTargets);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.addTarget = function() {
    $scope.levelTargets.push({value: $scope.minTarget});
  }

  $scope.removeTarget = function() {
    if ($scope.levelTargets.length > 2) {
      $scope.levelTargets.pop();
    }
  }

});