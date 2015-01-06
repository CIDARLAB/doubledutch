app.controller("doubleDutchCtrl", function($scope) {
	seqType = {DNA: "DNA", schema: "org.clothocad.model.SequenceType"};
	featRole = {PROMOTER: "promoter", RBS: "ribosome binding site", UTR: "untranslated region", CDS: "coding sequence", TERMINATOR: "terminator", schema: "org.clothocad.model.FeatureRole"};
	modRole = {TRANSCRIPTION: "transcription", TRANSLATION: "translation", EXPRESSION: "expression", schema: "org.clothocad.model.ModuleRole"};
	transcStrength = {name: "Transcription Strength", schema: "org.clothocad.model.Variable"};
	translStrength = {name: "Translation Strength", schema: "org.clothocad.model.Variable"};
	expressStrength = {name: "Expression Strength", schema: "org.clothocad.model.Variable"};
	reu = {name: "REU", schema: "org.clothocad.model.Units"};

	function module(name, feats, subMods, role, schema) {
		this.name = name;
		this.role = role;
		if (schema === "org.clothocad.model.BasicModule") {
			this.features = feats;
		} else if (schema === "org.clothocad.model.CompositeModule") {
			this.subModules = subMods;
		}
		this.schema = schema;
		this.getFeatures = function() {
			var feats = [];
			var mods = [];
			mods.push(this);
			var i;
			do {
				var mod = mods.pop();
				if (mod.schema === "org.clothocad.model.BasicModule") {
					for (i = 0; i < mod.features.length; i++) {
						feats.push(mod.features[i]);
					}
				} else {
					for (i = 0; i < mod.subModules.length; i++) {
						mods.push(mod.subModules[i]);
					}
				}
			} while (mods.length > 0);
			return feats;
		}
	}

	function design(name, mod, params) {
		this.name = name;
		if (mod != null) {
			this.module = mod;
		}
		if (params != null && params.length > 0) {
			this.parameters = params;
		}
		this.schema = "org.clothocad.model.Design";
	}

	function parameter(name, value, varia, units) {
		this.name = name;
		this.value = value;
		this.variable = varia;
		this.units = units;
		this.schema = "org.clothocad.model.Parameter";
	}

	function sequence() {
		this.sequence = ".";
		this.type = seqType.DNA;
		this.schema = "org.clothocad.model.Sequence";
	}

	function feature(name, role) {
		this.name = name;
		this.sequence = new sequence();
		this.role = role
		this.schema = "org.clothocad.model.Feature";
	}

	var gridParser = {
		parseDesigns: function(data) {
			var designs = [];
			var mod;
			var constructName = function(feats) {
				var designName = "";
				var i;
				for (i = 0; i < feats.length; i++) {
					designName = designName + " + " + feats[i].name;
				}
				return designName.substring(3);
			};
			var rowFeats = [];
			var i;
			for (i = 0; i < data.length; i++) {
				if (data[i].length > 0) {
					rowFeats[i] = this.parseFeature(data[i][0]);
					if (rowFeats[i] != null) {
						mod = this.grammar.inferModule([rowFeats[i]]);
						if (mod != null) {
							designs.push(new design(constructName([rowFeats[i]]), mod, []));
						}
					}
				}
			}
			var colFeats = [];
			var j;
			for (j = 0; j < data[0].length; j++) {
				colFeats[j] = this.parseFeature(data[0][j]);
				if (colFeats[j] != null) {
					mod = this.grammar.inferModule([colFeats[j]]);
					if (mod != null) {
						designs.push(new design(constructName([colFeats[j]]), mod, []));
					}
				}
			}
			var designName;
			var param;
			for (i = 1; i < data.length; i++) {
				for (j = 1; j < data[i].length; j++) {
					if (rowFeats[i] != null && colFeats[j] != null) {
						mod = this.grammar.inferModule([rowFeats[i], colFeats[j]]);
						if (mod != null) {
							designName = constructName([rowFeats[i], colFeats[j]]);
							param = this.parseParameter(data[i][j], designName, mod.role);
							designs.push(new design(designName, mod, param));
						}
					}
				}
			}
			return designs;
		}, parseFeature: function(data) {
			if (data.length > 0) {
				var roleChar = data.charAt(data.length - 1);
				var parsedRole;
				if (roleChar === 'p') {
					parsedRole = featRole.PROMOTER;
				} else if (roleChar === 'r') {
					parsedRole = featRole.RBS;
				} else if (roleChar === 'u') {
					parsedRole = featRole.UTR;
				} else if (roleChar === 'c') {
					parsedRole =  featRole.CDS;
				} else if (roleChar === 't') {
					parsedRole = featRole.TERMINATOR;
				} else {
					return null;
				}
				return new feature(data.substring(0, data.length - 1), parsedRole);
			} else {
				return null;
			}
		}, parseParameter: function(data, designName, role) {
			if (!isNaN(data) && data !== "") {
				var varia;
				if (role === modRole.EXPRESSION) {
					varia = expressStrength;
				} else if (role === modRole.TRANSCRIPTION) {
					varia = transcStrength;
				} else if (role === modRole.TRANSLATION) {
					varia = translStrength;
				} else {
					return null;
				}
				return [new parameter(designName + " " + varia.name, data, varia, reu)];
			} else {
				return null;
			}
		}, grammar: {name: "Expression Grammar",
			inferModule: function(feats) {
				var transcFeats = [];
				var translFeats = [];
				var expressFeats = [];
				var hasPromoter = false;
				var hasRBS = false;
				var hasCDS = false;
				var hasTerminator = false;
				var i;
				for (i = 0; i < feats.length; i++) {
					if (feats[i].role === featRole.PROMOTER || feats[i].role === featRole.TERMINATOR) {
						transcFeats.push(feats[i]);
						if (feats[i].role === featRole.PROMOTER) {
							hasPromoter = true;
						} else {
							hasTerminator = true;
						}
					} else if (feats[i].role === featRole.RBS || feats[i].role === featRole.UTR) {
						translFeats.push(feats[i]);
						hasRBS = true;
					} else if (feats[i].role === featRole.CDS) {
						expressFeats.push(feats[i]);
						hasCDS = true;
					}
				}
				var transcMod;
				if (hasPromoter || hasTerminator) {
					var transcName = modRole.TRANSCRIPTION.substring(0, 1).toUpperCase() + modRole.TRANSCRIPTION.substring(1) + " ";
					for (i = 0; i < transcFeats.length; i++) {
						transcName = transcName + transcFeats[i].name + " + ";
					}
					transcName = transcName.substring(0, transcName.length - 3);
					transcMod = new module(transcName, transcFeats, [], modRole.TRANSCRIPTION, "org.clothocad.model.BasicModule");
				} else {
					transcMod = null;
				}
				var translMod;
				if (hasRBS) {
					var translName = modRole.TRANSLATION.substring(0, 1).toUpperCase() + modRole.TRANSLATION.substring(1) + " ";
					for (i = 0; i < translFeats.length; i++) {
						translName = translName + translFeats[i].name + " + ";
					}
					translName = translName.substring(0, translName.length - 3);
					translMod = new module(translName, translFeats, [], modRole.TRANSLATION, "org.clothocad.model.BasicModule");
				} else {
					translMod = null;
				}
				var expressMod;
				if (hasCDS) {
					var expressName = modRole.EXPRESSION.substring(0, 1).toUpperCase() + modRole.EXPRESSION.substring(1) + " ";
					for (i = 0; i < expressFeats.length; i++) {
						expressName = expressName + expressFeats[i].name + " + ";
					}
					expressName = expressName.substring(0, expressName.length - 3);
					expressMod = new module(expressName, expressFeats, [], modRole.EXPRESSION, "org.clothocad.model.BasicModule");
				} else {
					expressMod = null;
				}
				if ((hasCDS && (hasPromoter || hasTerminator || hasRBS)) || ((hasPromoter || hasTerminator) && hasRBS)) {
					var compExpressName = modRole.EXPRESSION;
					for (i = 0; i < expressFeats.length; i++) {
						compExpressName = compExpressName + " + " + expressFeats[i].name;
					}
					for (i = 0; i < transcFeats.length; i++) {
						compExpressName = compExpressName + " + " + transcFeats[i].name;
					}
					for (i = 0; i < translFeats.length; i++) {
						compExpressName = compExpressName + " + " + translFeats[i].name;
					}
					var subMods = [];
					if (hasCDS) {
						subMods.push(expressMod);
					}
					if (hasPromoter || hasTerminator) {
						subMods.push(transcMod);
					}
					if (hasRBS) {
						subMods.push(translMod);
					}
					return new module(compExpressName, [], subMods, modRole.EXPRESSION, "org.clothocad.model.CompositeModule");
				} else if (hasCDS) {
					return expressMod;
				} else if (hasPromoter || hasTerminator) {
					return transcMod;
				} else if (hasRBS) {
					return translMod;
				} else {
					return null;
				}
			}, schema: "org.clothocad.model.FunctionalGrammar"}
	};

	// var seq1 = {sequence: "ttgacggctagctcagtcctaggtacagtgctagc", type: seqType.DNA, schema: "org.clothocad.model.Sequence"};
	// var seq2 = {sequence: "tttatggctagctcagtcctaggtacaatgctagc", type: seqType.DNA, schema: "org.clothocad.model.Sequence"};
	// var seq3 = {sequence: "ccggcttatcggtcagtttcacctgatttacgtaaaaacccgcttcggcgggtttttgcttttggaggggcagaaagatgaatgactgtccacgacgctatacccaaaagaaa", 
	// 			type: seqType.DNA, schema: "org.clothocad.model.Sequence"};
	// var seq4 = {sequence: "aaagaggagaaa", type: seqType.DNA, schema: "org.clothocad.model.Sequence"};
	// var seq5 = {sequence: "atgaaagctactaaactggtactgggcgcggtaatcctgggttctactctgctggcaggttgctccagcaacgctaaaatcgatcagggaattaacccgtatgttggctttgaaatgggttacgactggttaggtcgtatgccgtacaaaggcagcgttgaaaacggtgcatacaaagctcagggcgttcaactgaccgctaaactgggttacccaatcactgacgacctggacatctacactcgtctgggtggcatggtatggcgtgcagacactaaatccaacgtttatggtaaaaaccacgacaccggcgtttctccggtcttcgctggcggtgttgagtacgcgatcactcctgaaatcgctacccgtctggaataccagtggaccaacaacatcggtgacgcacacaccatcggcactcgtccggacaacggcggaggttctggaggagggagcatggctctctcacttttcactgtcggacaattgattttcttattttggacaatgagaatcactgaagccagccccgaccccgcagccaaagccgccccagcagcagttgccgcccctgccgcagccgccccagacaccgcctctgacgccgccgccgcagccgcccttaccgccgccaacgccaaagccgctgccgaactcactgccgccaacgccgccgccgccgcagcagccaccgccagaggttaatactagag", 
	// 			type: seqType.DNA, schema: "org.clothocad.model.Sequence"};
	// var feat1 = {name: "p_J23100", role: featRole.PROMOTER, sequence: seq1, schema: "org.clothocad.model.Feature"};
	// var feat2 = {name: "p_J23114", role: featRole.PROMOTER, sequence: seq2, schema: "org.clothocad.model.Feature"};
	// var feat3 = {name: "t_J61048", role: featRole.TERMINATOR, sequence: seq3, schema: "org.clothocad.model.Feature"};
	// var feat4 = {name: "r_B0034", role: featRole.RBS, sequence: seq4, schema: "org.clothocad.model.Feature"};
	// var feat5 = {name: "c_K584019", role: featRole.CDS, sequence: seq5, schema: "org.clothocad.model.Feature"};
	// var anno1 = {start: 1, end: 35, feature: feat1, schema: "org.clothocad.model.Annotation"};
	// var anno2 = {start: 1, end: 35, feature: feat2, schema: "org.clothocad.model.Annotation"};
	// var anno3 = {start: 1, end: 113, feature: feat3, schema: "org.clothocad.model.Annotation"};
	// var anno4 = {start: 1, end: 12, feature: feat4, schema: "org.clothocad.model.Annotation"};
	// var anno5 = {start: 1, end: 716, feature: feat5, schema: "org.clothocad.model.Annotation"};
	// seq1.annotations = [anno1];
	// seq2.annotations = [anno2];
	// seq3.annotations = [anno3];
	// seq4.annotations = [anno4];
	// seq5.annotations = [anno5];
	// var form1 = {checkPart: function(p) {return true;}, schema: "org.clothocad.model.FreeForm"};
	// var part1 = {name: "BBa_J23100", format: form1, sequence: seq1, schema: "org.clothocad.model.BasicPart"};
	// var part2 = {name: "BBa_J23114", format: form1, sequence: seq2, schema: "org.clothocad.model.BasicPart"};
	// var part3 = {name: "BBa_J61048", format: form1, sequence: seq3, schema: "org.clothocad.model.BasicPart"};
	// var part4 = {name: "BBa_B0034", format: form1, sequence: seq4, schema: "org.clothocad.model.BasicPart"};
	// var part5 = {name: "BBa_K584019", format: form1, sequence: seq5, schema: "org.clothocad.model.BasicPart"};
	// var mod1 = {name: "Transcription p_J23100 + t_J61048", features: [feat1, feat3], role: modRole.TRANSCRIPTION, schema: "org.clothocad.model.BasicModule"};
	// var mod2 = {name: "Transcription p_J23114 + t_J61048", features: [feat2, feat3], role: modRole.TRANSCRIPTION, schema: "org.clothocad.model.BasicModule"};
	// var mod3 = {name: "Translation r_B0034 + c_K584019", features: [feat4, feat5], role: modRole.TRANSLATION, schema: "org.clothocad.model.BasicModule"};
	// var unit1 = {name: "REU", schema: "org.clothocad.model.Units"};
	// var param1 = {name: "p_J23100 + t_J61048 Strength", value: 2547, variable: varia1, units: unit1, schema: "org.clothocad.model.Parameter"};
	// var param2 = {name: "p_J23114 + t_J61048", value: 256, variable: varia1, units: unit1, schema: "org.clothocad.model.Parameter"};
	// var design1 = {name: "p_J23100 + t_J61048", parameters: [param1], module: mod1, parts: [part1, part3], schema: "org.clothocad.model.Design"};
	// var design2 = {name: "p_J23114 + t_J61048", parameters: [param2], module: mod2, parts: [part2, part3], schema: "org.clothocad.model.Design"};
	// var design3 = {name: "r_B0034 + c_K584019", module: mod3, parts: [part4, part5], schema: "org.clothocad.model.Design"};
	
	// $scope.variables = [0, 1];
	// $scope.currentVariable = $scope.variables[0];
	$scope.designs = [];
	$scope.levels = [];
	$scope.factors = [];
	$scope.experimentalDesign = {factors: [], schema: "org.clothocad.model.ExperimentalDesign"};
	$scope.parsers = [gridParser];
	$scope.currentParser = $scope.parsers[0];

	$scope.uploadDesigns = function(files, designParser) {
		var i;
    	for (i = 0; i < files.length; i++) {
    		Papa.parse(files[i], {designParser: designParser,
				complete: function(results) {
					var designs = this.designParser.parseDesigns(results.data);
					var i;
					for (i = 0; i < designs.length; i++) {
						$scope.designs.push(designs[i]);
					}
					var isCodedExpression = function(design) {
						if ('module' in design) { 
							if (design.module.role === modRole.EXPRESSION) {
								var feats = design.module.getFeatures();
								var i;
								for (i = 0; i < feats.length; i++) {
									if (feats[i].role === featRole.CDS) {
										return true;
									}
								}
								return false;
							} else {
								return false;
							}
						} else {
							return false;
						}
					};
					var isParameterizedExpression = function(design) {
						if ('module' in design && 'parameters' in design) { 
							var varia;
							if (design.module.role === modRole.EXPRESSION) {
								varia = expressStrength;
							} else if (design.module.role === modRole.TRANSCRIPTION) {
								varia = transcStrength;
							} else if (design.module.role === modRole.TRANSLATION) {
								varia = translStrength;
							} else {
								return -1;
							}
							var i = 0;
							while (i < design.parameters.length) {
								if (design.parameters[i].variable.name === varia.name) {
									return i;
								} else {
									i++;
								}
							}
							return -1;
						} else {
							return -1;
						}
					};
					
					var j;
					for (i = 0; i < $scope.designs.length; i++) {
						if (isCodedExpression($scope.designs[i])) {
							$scope.factors.push({design: $scope.designs[i], schema: "org.clothocad.model.Factor"});
						} else {
							j = isParameterizedExpression($scope.designs[i]);
							if (j >= 0) {
								$scope.levels.push({parameter: $scope.designs[i].parameters[j], design: $scope.designs[i], schema: "org.clothocad.model.Level"});
							}	
						}
					}
					$scope.$apply();
				}
			});
    	}
    };

	$scope.targetLevels = [2500, 200, 100, 50];

	$scope.addTarget = function() {
    	$scope.targetLevels.push($scope.newTarget);
    	$scope.newTarget = "";
    };

    $scope.removeTarget = function() {
        if ($scope.targetLevels.length > 2) {
	        var oldTargets = $scope.targetLevels;
	        $scope.targetLevels = [];
	        for (i = 0; i < oldTargets.length - 1; i++) {
	        	$scope.targetLevels.push(oldTargets[i]);
	        }
    	}
    };

	// $scope.assignLevels = function() {
	// 	$scope.targetLevels.sort(function(a, b){return a - b});
	// 	$scope.levels.sort(function(a, b){return a.parameter.value - b.parameter.value});
	// 	var midPoints = [];
	// 	var i;
	// 	for (i = 0; i < $scope.targetLevels.length - 1; i++) {
	// 		midPoints.push(($scope.targetLevels[i] + $scope.targetLevels[i + 1])/2);
	// 	}
	// 	var levelScorings = [[]];
	// 	var j = 0;
	// 	for (i = 0; i < $scope.levels.length; i++) {
	// 		while (j < midPoints.length && $scope.levels[i].parameter.value > midPoints[j]) {
	// 			levelScorings.push([]);
	// 			j++;
	// 		} 
	// 		levelScorings[j].push({level: $scope.levels[i], score: Math.abs($scope.levels[i].parameter.value - $scope.targetLevels[j])});
	// 	}
	// 	for (i = 0; i < levelScorings.length; i++) {
	// 		levelScorings[i].sort(function(a, b){return a.score - b.score});
	// 	}
		
	// 	function solution(targetLevelCount, factorCount, score) {
	// 		this.levelSelections = [];
	// 		for (i = 0; i < targetLevelCount; i++) {
	// 			this.levelSelections.push([]);
	// 			for (j = 0; j < factorCount; j++) {
	// 				this.levelSelections[i].push(0);
	// 			}
	// 		}
	// 		this.score = score;
	// 		this.isHomologyRisk = function(levelScorings, i, j) {
	// 			var k = this.levelSelections[i][j];
	// 			var feats = levelScorings[i][k].level.design.module.getFeatures();
	// 			var b;
	// 			var c;
	// 			var usedFeats;
	// 			var d;
	// 			for (b = 0; b < j; b++) {
	// 				c = levelSelections[i][b];
	// 				usedFeats = levelScorings[i][c].level.design.module.getFeatures();
	// 				for (d = 0; d < feats.length; d++) {
	// 					if (usedFeats.indexOf(feats[d]) >= 0) {
	// 						return true;
	// 					}
	// 				}
	// 			}
	// 			var a;
	// 			for (a = 0; a < i; a++) {
	// 				for (b = 0; b < this.levelSelections[a].length; b++) {
	// 					if (b != j) {
	// 						c = levelSelections[a][b];
	// 						usedFeats = levelScorings[i][c].level.design.module.getFeatures();
	// 						for (d = 0; d < feats.length; d++) {
	// 							if (usedFeats.indexOf(feats[d]) >= 0) {
	// 								return true;
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 			return false;	
	// 		};
	// 		this.isSubOptimal = function(levelScorings, i, j, targetSolution) {
	// 			if (targetSolution.score < 0) {
	// 				return false;
	// 			} else {
	// 				var lowerBound = 0;
	// 				var a;
	// 				for (a = i + 1; a < this.levelSelections.length; a++) {
	// 					lowerBound = lowerBound + this.levelSelections[a].length*levelScorings[a][0].score;
	// 				}
	// 				var b = this.levelSelections[i].length - j;
	// 				if (b > 0) {
	// 					lowerBound = lowerBound + b*levelScorings[i][0].score;
	// 				}
	// 				var k = this.levelSelections[i][j];
	// 				return this.score + levelScorings[i][k].score + lowerBound >= targetSolution.score;
	// 			}
	// 		};
	// 		this.copySolution = function(targetSolution) {
	// 			while (this.levelSelections.length > 0) {
	// 				this.levelSelections.pop();
	// 			}
	// 			var i;
	// 			var j;
	// 			for (i = 0; i < targetSolution.levelSelections.length; i++) {
	// 				this.levelSelections.push([]);
	// 				for (j = 0; j < targetSolution.levelSelections[i].length; j++) {
	// 					this.levelSelections[i].push(targetSolution.levelSelections[i][j]);
	// 				}
	// 			}
	// 			this.score = targetSolution.score;
	// 		};
	// 	}

	// 	var currentSolution = new solution($scope.targetLevels.length, $scope.experimentalDesign.factors.length, 0);
	// 	var bestSolution = new solution(0, 0, -1);

	// 	for (i = 0; i < currentSolution.levelSelections.length; i++) {
	// 		for (j = 0; j < currentSolution.levelSelections[i].length; j++) {
	// 			while (currentSolution.levelSelections[i][j] < levelScorings[i].length 
	// 					&& currentSolution.isHomologyRisk(levelScorings, i, j, usedFeatures)) {
	// 				currentSolution.levelSelections[i][j]++;
	// 			} 
	// 			var backtrack = false;
	// 			if (currentSolution.levelSelections[i][j] == levelScorings[i].length 
	// 					|| currentSolution.isSubOptimal(levelScorings, i, j, bestSolution)) {
	// 				backtrack = true;
	// 			} else {
	// 				var k = currentSolution.levelSelections[i][j];
	// 				currentSolution.score = currentSolution.score + levelScorings[i][k];
	// 				if (i == currentSolution.levelSelections.length - 1 && j == currentSolution.levelSelections[i].length - 1) {
	// 					bestSolution.copySolution(currentSolution);
	// 					currentSolution.score = currentSolution.score - levelScorings[i][k];
	// 					backtrack = true;
	// 				} else {

	// 				} 
	// 			}
	// 			if (backtrack {
	// 				currentSolution.levelSelections[i][j] = 0;
	// 				j--;
	// 				if (j < 0) {
	// 					i--;
	// 					j = currentSolution.levelSelections[i].length - 1;
	// 				}
	// 				var k = currentSolution.levelSelections[i][j];
	// 				currentSolution.score = currentSolution.score - levelScorings[i][k].score;
	// 				currenSolution.levelSelections[i][j]++;
	// 			}
	// 		}
	// 	}
	// };
});