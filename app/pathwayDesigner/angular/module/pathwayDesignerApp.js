angular
	.module('pathwayDesignerApp', ['ui.tree','ngSanitize', 'ngCsv', 'ui.bootstrap.tpls', 'ui.bootstrap.modal'])
	.directive('fileInput', fileInput)
	.controller('assignmentOptions', assignmentOptions)
	.controller('moduleEditor', moduleEditor)
	.controller('levelTargets', levelTargets)
	.controller('alertMessenger', alertMessenger)
	.controller('pathwayDesigner', pathwayDesigner);