angular
	.module('downloadsApp', ['ngSanitize','ngCsv'])
	.directive('doubleDutchHeader', doubleDutchHeader)
	.directive('doubleDutchFooter', doubleDutchFooter)
	.directive('gridLibrary', gridLibrary)
	.directive('tableLibrary', tableLibrary)
	.controller('downloadsCtrl', downloadsCtrl);