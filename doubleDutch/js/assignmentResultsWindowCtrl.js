app.controller('assignmentResultsWindowCtrl', function ($scope, $modal, $modalInstance, items) {
  $scope.bestSoln = items.soln;
  $scope.bestSolnCost = items.soln.calculateCost(items.weights);
  $scope.solver = items.solver;
  $scope.numAnnealings = items.numAnnealings;
  $scope.initialTemp = items.initialTemp;
  $scope.weights = items.weights;
 
  $scope.editAssignmentOptions = function(size, onRepeat) {
      var modalInstance = $modal.open({
        templateUrl: 'assignmentWindow.html',
        controller: 'assignmentWindowCtrl',
        size: size,
        resolve: {
            items: function() {
                return {onRepeat: onRepeat, numAnnealings: $scope.numAnnealings, initialTemp: $scope.initialTemp};
            }
          }
      });
      modalInstance.result.then(function(items) {
        $scope.numAnnealings = items.numAnnealings;
        $scope.initialTemp = items.initialTemp;
      });
  };

  $scope.ok = function () {
    var soln = $scope.solver.annealSolve($scope.bestSoln.clusterGrid, $scope.numAnnealings, $scope.initialTemp, $scope.weights);
    var solnCost = soln.calculateCost($scope.weights);
    if (solnCost.total < $scope.bestSolnCost.total) {
      $scope.bestSoln = soln;
      $scope.bestSolnCost = solnCost;
    }
  };

  $scope.cancel = function () {
    $modalInstance.close({bestSoln: $scope.bestSoln, numAnnealings: $scope.numAnnealings, initialTemp: $scope.initialTemp});
  };

});