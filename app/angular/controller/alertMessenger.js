function alertMessenger($scope, $modalInstance, items) {
  
  $scope.alertType = items.alertType;
  $scope.alertMessage = items.alertMessage;

  $scope.ok = function () {
    $modalInstance.close();
  };

}