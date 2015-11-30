function levelTargets($scope, $modalInstance, items) {
  $scope.fNodes = items.fNodes;
  $scope.autoTarget = items.autoTarget;
  $scope.isAssigning = items.isAssigning;
  $scope.minTarget = items.minTarget;
  $scope.maxTarget = items.maxTarget;
  $scope.targetStep = 0.01;
  $scope.hasCopied = false;

  $scope.initialLevelTargets;
  $scope.levelTargets;
  if (items.levelTargets.length == 0) {
    $scope.initialLevelTargets = [$scope.minTarget, $scope.maxTarget];
    $scope.levelTargets = [{value: $scope.minTarget}, {value: $scope.maxTarget}];
  } else {
    $scope.initialLevelTargets = items.levelTargets;
    $scope.levelTargets = [];
    var i;
    for (i = 0; i < items.levelTargets.length; i++ ) {
      $scope.levelTargets.push({value: items.levelTargets[i]});
    }
  }

  $scope.copyToAllTargets = function() {
    var defaultLevelTarget;
    var i, j;
    for (i = 0; i < $scope.fNodes.length; i++) {
      $scope.fNodes[i].levelTargets = [];
      for (j = 0; j < $scope.levelTargets.length; j++) {
        if (j < $scope.initialLevelTargets.length) {
          defaultLevelTarget = $scope.initialLevelTargets[j];
        } else {
          defaultLevelTarget = $scope.minTarget;
        }
        $scope.fNodes[i].levelTargets[j] = validateNumericInput($scope.levelTargets[j].value, $scope.minTarget, 
          $scope.maxTarget, $scope.targetStep, defaultLevelTarget);
      }
    }
    $scope.hasCopied = true;
  };

  $scope.ok = function() {
    var levelTargets = [];
    var defaultLevelTarget;
    var i;
    for (i = 0; i < $scope.levelTargets.length; i++) {
      if (i < $scope.initialLevelTargets.length) {
        defaultLevelTarget = $scope.initialLevelTargets[i];
      } else {
        defaultLevelTarget = $scope.minTarget;
      }
      levelTargets[i] = validateNumericInput($scope.levelTargets[i].value, $scope.minTarget, $scope.maxTarget, 
          $scope.targetStep, defaultLevelTarget);
    }
    levelTargets.sort(function(a, b) {return a - b});
    $modalInstance.close(levelTargets);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.addTarget = function() {
    $scope.levelTargets.push({value: $scope.minTarget});
  }

  $scope.removeTarget = function() {
    if ($scope.levelTargets.length > 1) {
      $scope.levelTargets.pop();
    }
  }

}