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

	function level(param, design) {
		this.parameter = param;
		this.design = design;
		this.schema = "org.clothocad.model.Level";
	}

	function factor(design) {
		this.design = design;
		this.schema = "org.clothocad.model.Factor";
	}

	function flNode(fl) {
		this.fl = fl;
		if (fl.schema === "org.clothocad.model.Factor") {
			this.depth = 1;
			this.rootable = true;
			this.valueDisplay = "display:none";
			this.toggleDisplay = "";
			this.labelColor = "color:#ffffff";
			this.backgroundColor = "background-color:#787878"
			this.variableName = "";
			this.parameterValue = 0;

		} else if (fl.schema === "org.clothocad.model.Level") {
			this.depth = 2;
			this.rootable = false;
			this.valueDisplay = "";
			this.toggleDisplay = "display:none";
			this.labelColor = "";
			this.backgroundColor = ""
			this.variableName = fl.parameter.variable.name;
			this.parameterValue = fl.parameter.value;
		}
		this.nodes = [];
	}

	function solution(targetLevelCount, factorCount, score) {
		this.levelSelections = [];
		for (i = 0; i < targetLevelCount; i++) {
			this.levelSelections.push([]);
			for (j = 0; j < factorCount; j++) {
				this.levelSelections[i].push(0);
			}
		}
		this.score = score;
		this.isHomologyRisk = function(levelScorings, i, j, k, maxI) {
			var feats = levelScorings[i][k].level.fl.design.module.getFeatures();
			var b;
			var c;
			var usedFeats;
			var d;
			if (i == maxI) {
				for (b = 0; b < j; b++) {
					c = this.levelSelections[i][b];
					usedFeats = levelScorings[i][c].level.fl.design.module.getFeatures();
					for (d = 0; d < feats.length; d++) {
						if (usedFeats.indexOf(feats[d]) >= 0) {
							return true;
						}
					}
				}
			}
			var a;
			for (a = 0; a < maxI; a++) {
				for (b = 0; b < this.levelSelections[a].length; b++) {
					if (b != j) {
						c = this.levelSelections[a][b];
						usedFeats = levelScorings[a][c].level.fl.design.module.getFeatures();
						for (d = 0; d < feats.length; d++) {
							if (usedFeats.indexOf(feats[d]) >= 0) {
								return true;
							}
						}
					}
				}
			}
			return false;	
		};
		this.isFactorHomologous = function(levelScorings, i, j) {
			var feats;
			var usedFeats;
			var k;
			var a;
			var b;
			var c;
			var d;
			for (b = 0; b < j; b++) {
				k = this.levelSelections[i][b];
				feats = levelScorings[i][k].level.fl.design.module.getFeatures();
				for (a = 0; a < i; a++) {
					c = this.levelSelections[a][b];
					usedFeats = levelScorings[a][c].level.fl.design.module.getFeatures();
					for (d = 0; d < feats.length; d++) {
						if (usedFeats.indexOf(feats[d]) >= 0) {
							return true;
						}
					}
				}
			}
			return false;	
		};
		this.isSubOptimal = function(levelScorings, i, j, k, targetSolution) {
			if (targetSolution.score < 0) {
				return false;
			} else {
				var lowerBound = 0;
				var a;
				for (a = i + 1; a < this.levelSelections.length; a++) {
					lowerBound = lowerBound + this.levelSelections[a].length*levelScorings[a][0].score;
				}
				var b = this.levelSelections[i].length - j - 1;
				if (b > 0) {
					lowerBound = lowerBound + b*levelScorings[i][0].score;
				}
				return this.score + levelScorings[i][k].score + lowerBound >= targetSolution.score;
			}
		};
		this.copySolution = function(targetSolution) {
			while (this.levelSelections.length > 0) {
				this.levelSelections.pop();
			}
			var i;
			var j;
			for (i = 0; i < targetSolution.levelSelections.length; i++) {
				this.levelSelections.push([]);
				for (j = 0; j < targetSolution.levelSelections[i].length; j++) {
					this.levelSelections[i].push(targetSolution.levelSelections[i][j]);
				}
			}
			this.score = targetSolution.score;
		};
	}

	var doeTemplateParser = {
		parseTemplate: function(data) {
			var doeTemplate = {grid: [], range: []};
			var i;
			var j;
			var maxJ = data[1].length;
			for (i = 1; i < data.length; i++) {
				j = 1;
				doeTemplate.grid.push([]);
				while (!isNaN(data[i][j]) && data[i][j] !== "" && j < data[i].length && j < maxJ) {
					doeTemplate.grid[i - 1].push(data[i][j]);
					if (doeTemplate.range.indexOf(data[i][j]) < 0) {
						doeTemplate.range.push(data[i][j]);
					}
					j++;
				}
				if (i == 1) {
					maxJ = j;
				}
			}
			doeTemplate.range.sort(function(a, b){return a - b});
			return doeTemplate;
		}
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
	
	// $scope.variables = [0, 1];
	// $scope.currentVariable = $scope.variables[0];
	$scope.designs = [];
	$scope.levels = [];
	$scope.targetLevels = [{value: 2500}, {value: 6000}, {value: 200}];
	$scope.factors = [];
	$scope.experimentalDesign = [];
	$scope.parsers = [gridParser];
	$scope.currentParser = $scope.parsers[0];
	$scope.doeParser = doeTemplateParser;
	$scope.doeTemplate;

	$scope.customRemove = function(scope) {
		scope.remove();
		var target = $scope.designs.indexOf(scope.$nodeScope.$modelValue.fl.design);
		if (target >= 0) {
			$scope.designs.splice(target, 1);
		}
    };

    $scope.edTreeOptions = {
    	accept: function(sourceNodeScope, destNodesScope, destIndex) {
    		if (sourceNodeScope.$modelValue.rootable) {
    			return destNodesScope.maxDepth == 0;
      		} else {
      			return destNodesScope.maxDepth == 1;
      		}
    	}
  	};

  	$scope.flTreeOptions = {
    	accept: function(sourceNodeScope, destNodesScope, destIndex) {
    		return destNodesScope.$id === sourceNodeScope.$parentNodesScope.$id;
    	},
    	beforeDrop: function(event) {
    		if (event.dest.nodesScope.$id !== event.source.nodesScope.$id) {
    			var copy = new flNode(event.source.nodeScope.$modelValue.fl);
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, copy);
    		}
    	}
  	};

  	$scope.generateDesigns = function(experimentalDesign, doeTemplate) {
  		if (experimentalDesign.length == doeTemplate.grid[0].length 
  				&& experimentalDesign[0].nodes.length == doeTemplate.range.length) {
  			var outputData = [];
  			var i;
  			for (i = 0; i < experimentalDesign.length; i++) {
  				experimentalDesign[i].nodes.sort(function(a, b){return a.parameterValue - b.parameterValue})
  			}
  			var j;
  			var k;
  			for (i = 0; i < doeTemplate.grid.length; i++) {
  				outputData.push([]);
  				for (j = 0; j < doeTemplate.grid[i].length; j++) {
  					k = doeTemplate.range.indexOf(doeTemplate.grid[i][j]);
  					outputData[i].push(experimentalDesign[j].nodes[k].fl.design.name);
  				}
  			}
  			console.log(Papa.unparse(outputData));
  		}
  	}

  	$scope.uploadTemplate = function(files, templateParser) {
		Papa.parse(files[0], {dynamicTyping: true, templateParser: templateParser,
			complete: function(results) {
				$scope.doeTemplate = templateParser.parseTemplate(results.data);
			}
		});
  	}

	$scope.uploadDesigns = function(files, designParser) {
		var i;
    	for (i = 0; i < files.length; i++) {
    		Papa.parse(files[i], {dynamicTyping: true, designParser: designParser,
				complete: function(results) {
					var designNames = [];
					var designs = this.designParser.parseDesigns(results.data);
					var i;
					for (i = 0; i < $scope.designs.length; i++) {
						designNames.push($scope.designs[i].name);
					}
					for (i = 0; i < designs.length; i++) {
						if (designNames.indexOf(designs[i].name) < 0) {
							designNames.push(designs[i].name);
							$scope.designs.push(designs[i]);
						}
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
					$scope.factors = [];
					$scope.levels = [];
					var j;
					for (i = 0; i < $scope.designs.length; i++) {
						if (isCodedExpression($scope.designs[i])) {
							$scope.factors.push(new flNode(new factor($scope.designs[i])));
						} else {
							j = isParameterizedExpression($scope.designs[i]);
							if (j >= 0) {
								$scope.levels.push(new flNode(new level($scope.designs[i].parameters[j], $scope.designs[i])));
							}	
						}
					}
					$scope.factors.sort(function(a, b) {
						var nameA = a.fl.design.module.name;
						var nameB = b.fl.design.module.name;
						if (nameA < nameB) {
							return -1;
						} else if (nameA > nameB) {
							return 1;
						} else {
							return 0;
						}
					});
					$scope.levels.sort(function(a, b){return a.parameterValue - b.parameterValue});
					$scope.$apply();
				}
			});
    	}
    };

	$scope.addTarget = function() {
		if (!isNaN($scope.newTarget) && $scope.newTarget !== "") {
	    	$scope.targetLevels.push({value: $scope.newTarget});
	    	$scope.newTarget = "";
    	} else {
    		$scope.targetLevels.push({value: 0});
    	}
    };

    $scope.removeTarget = function() {
        if ($scope.targetLevels.length > 2) {
	        $scope.targetLevels.pop();
    	}
    };

	$scope.assignLevels = function() {
		$scope.targetLevels.sort(function(a, b){return a.value - b.value});
		$scope.levels.sort(function(a, b){return a.parameterValue - b.parameterValue});
		var midPoints = [];
		var i;
		for (i = 0; i < $scope.targetLevels.length - 1; i++) {
			midPoints.push(($scope.targetLevels[i].value + $scope.targetLevels[i + 1].value)/2);
		}
		var levelScorings = [[]];
		var j = 0;
		for (i = 0; i < $scope.levels.length; i++) {
			while (j < midPoints.length && $scope.levels[i].parameterValue > midPoints[j]) {
				levelScorings.push([]);
				j++;
			} 
			levelScorings[j].push({level: $scope.levels[i], score: Math.abs($scope.levels[i].parameterValue - $scope.targetLevels[j].value)});
		}
		for (i = 0; i < levelScorings.length; i++) {
			levelScorings[i].sort(function(a, b){return a.score - b.score});
		}

		var solver = {
			randomSolve: function(targetLevelCount, factorCount, levelScorings) {
				var i;
				var j;
				var k;
				var randomSoln = new solution(targetLevelCount, factorCount, 0);
				for (i = 0; i < randomSoln.levelSelections.length; i++) {
					for (j = 0; j < randomSoln.levelSelections[i].length; j++) {
						do {
							k = Math.floor(Math.random()*levelScorings[i].length);
						} while (randomSoln.isHomologyRisk(levelScorings, i, j, k, i));
						randomSoln.levelSelections[i][j] = k;
						randomSoln.score = randomSoln.score + levelScorings[i][k].score;
					}
				}
				return randomSoln;
			},
			branchAndBound: function(targetLevelCount, factorCount, solutionCap, levelScorings) {
	    		var soln = new solution(targetLevelCount, factorCount, 0);
	    		var bestSoln = new solution(0, 0, -1);
	    		var solutionCount = 0;
	    		var backtrack;
	    		var factorHomology = [];
	    		var i;
	    		for (i = 0; i < targetLevelCount; i++) {
	    			factorHomology.push(false);
	    		}
	    		var j;
				var k;
				for (i = 0; i < soln.levelSelections.length; i++) {
					for (j = 0; j < soln.levelSelections[i].length; j++) {
						factorHomology[i] = soln.isFactorHomologous(levelScorings, i, j);
						if (j > 0 && !factorHomology[i]) {
							k = soln.levelSelections[i][j - 1] + 1;
						} else {
							k = soln.levelSelections[i][j];
						}
						while (k < levelScorings[i].length && soln.isHomologyRisk(levelScorings, i, j, k, i)) {
							k++;
						} 
						backtrack = false;
						if (k == levelScorings[i].length || soln.isSubOptimal(levelScorings, i, j, k, bestSoln)) {
							backtrack = true;
						} else {
							soln.score = soln.score + levelScorings[i][k].score;
							soln.levelSelections[i][j] = k;
							if (i == soln.levelSelections.length - 1 && j == soln.levelSelections[i].length - 1) {
								bestSoln.copySolution(soln);
								soln.score = soln.score - levelScorings[i][k].score;
								solutionCount++;
								if (solutionCap < 0 || solutionCount < solutionCap) {
									backtrack = true;
								}
							}
						}
						if (backtrack) {
							do {
								soln.levelSelections[i][j] = 0;
								j--;
								if (j < 0) {
									i--;
									if (i < 0) {
										i = soln.levelSelections.length - 1;
										backtrack = false;
									}
									j = soln.levelSelections[i].length - 1;
								}
								if (backtrack) {
									k = soln.levelSelections[i][j];
									soln.score = soln.score - levelScorings[i][k].score;
									soln.levelSelections[i][j]++;
								}
							} while (soln.levelSelections[i][j] == levelScorings[i].length);
							if (backtrack) {
								j--;
							}
						}
					}
				}
				// console.log("branch and bound");
				// console.log(bestSoln.score);
				return bestSoln;
	    	},
	    	monteCarlo: function(initialTemp, targetLevelCount, factorCount, solutionCap, levelScorings) {
				var i;
				var j;
				var k;
				var soln;
				var bestSoln = new solution(0, 0, -1);
				var temp;
				var mutantScore;
				var mutationCap;
				var solutionCount = 0;
				var mutantK;
				do {
					temp = initialTemp;
					soln = this.randomSolve(targetLevelCount, factorCount, levelScorings);
					while (temp >= 0) {
						mutationCap = 0;
						do {
							i = Math.floor(Math.random()*soln.levelSelections.length);
							j = Math.floor(Math.random()*soln.levelSelections[i].length);
							mutantK = soln.levelSelections[i][j];
							if (mutantK == 0 || Math.random() > 0.5) {
								do {
									mutantK++;
								} while (mutantK < levelScorings[i].length && soln.isHomologyRisk(levelScorings, i, j, mutantK, soln.levelSelections.length));
							} else {
								do {
									mutantK--;
								} while (mutantK >= 0 && soln.isHomologyRisk(levelScorings, i, j, mutantK, soln.levelSelections.length));
							} 
							mutationCap++;
						} while (mutationCap < 3 && (mutantK < 0 || mutantK >= levelScorings[i].length));
						if (mutantK >= 0 && mutantK < levelScorings[i].length) {
							k = soln.levelSelections[i][j];
							mutantScore = soln.score - levelScorings[i][k].score + levelScorings[i][mutantK].score;
							if (mutantScore < soln.score || Math.random() <= Math.exp((soln.score - mutantScore)/temp)) {
								soln.levelSelections[i][j] = mutantK;
								soln.score = mutantScore;
							}
						}
						temp--;
					}
					if (bestSoln.score < 0 || soln.score < bestSoln.score) {
						bestSoln.copySolution(soln);
					}
					solutionCount++;
				} while (solutionCount < solutionCap);
				// console.log("monte carlo");
				// console.log(bestSoln.score);
				return bestSoln;
	    	} 
		}

		// var bestSoln = solver.branchAndBound($scope.targetLevels.length, $scope.experimentalDesign.length, 1, levelScorings);
		var bestSoln = solver.monteCarlo(1000, $scope.targetLevels.length, $scope.experimentalDesign.length, 50, levelScorings);

		// console.log(bestBnB.score);

		for (i = 0; i < $scope.experimentalDesign.length; i++) {
			$scope.experimentalDesign[i].nodes = [];
		}

		for (i = 0; i < bestSoln.levelSelections.length; i++) {
			for (j = 0; j < bestSoln.levelSelections[i].length; j++) {
				k = bestSoln.levelSelections[i][j];
				$scope.experimentalDesign[j].nodes.push(levelScorings[i][k].level);
			}
		}
	};
});