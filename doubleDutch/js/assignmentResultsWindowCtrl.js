app.controller('assignmentResultsWindowCtrl', function ($scope, $modal, $modalInstance, items) {
  $scope.fldNodes = items.bestSoln.makeNodeDesign(items.fldNodes);
  $scope.bestSoln = items.bestSoln;
  $scope.bestSolnCost = items.bestSoln.calculateCost(items.weights);
  $scope.solver = items.solver;
  $scope.annealingOptions = items.annealingOptions;
  $scope.defaultAnnealingOptions = items.defaultAnnealingOptions;
  $scope.weights = items.weights;
 
  $scope.assignLevels = function() {
    var soln = $scope.solver.annealSolve($scope.bestSoln.clusterGrid, $scope.annealingOptions, $scope.weights);
    var solnCost = soln.calculateCost($scope.weights);
    if (solnCost.total < $scope.bestSolnCost.total) {
      $scope.fldNodes = soln.makeNodeDesign($scope.fldNodes);
      $scope.bestSoln = soln;
      $scope.bestSolnCost = solnCost;
    }
  };

  $scope.editAssignmentOptions = function(size, onRepeat) {
    var modalInstance = $modal.open({
      templateUrl: 'assignmentWindow.html',
      controller: 'assignmentWindowCtrl',
      size: size,
      resolve: {
          items: function() {
              return {onRepeat: onRepeat, annealingOptions: $scope.annealingOptions, defaultAnnealingOptions: $scope.defaultAnnealingOptions};
          }
        }
    });
    modalInstance.result.then(function(items) {
      $scope.annealingOptions = items.annealingOptions;
    });
  };

  $scope.downloadAssignment = function() {
    var outputData = [];
    var i, j;
    var k = 0;
    for (i = 0; i < $scope.fldNodes.length; i++) {
      outputData.push([]);
      outputData[k].push($scope.fldNodes[i].bioDesign.name);
      $scope.fldNodes[i].children.sort(function(a, b){return a.parameter.value - b.parameter.value});
      for (j = 0; j < $scope.fldNodes[i].children.length; j++) {
        outputData.push([]);
        outputData[k + j + 1].push($scope.fldNodes[i].children[j].bioDesign.name);
        outputData[k + j + 1].push($scope.fldNodes[i].children[j].parameter.value);
      }
      k += (1 + $scope.fldNodes[i].children.length);
    }
    return outputData;
  };

  $scope.quit = function() {
    $modalInstance.close({bestSoln: $scope.bestSoln, annealingOptions: $scope.annealingOptions});
  };

});