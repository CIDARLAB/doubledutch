app.controller("doubleDutchCtrl", function($scope, $modal, $log) {
	seqType = {DNA: "DNA", schema: "org.clothocad.model.SequenceType"};
	featRole = {PROMOTER: "promoter", RBS: "ribosome binding site", UTR: "untranslated region", CDS: "coding sequence", TERMINATOR: "terminator", 
			SPACER: "spacer", SCAR: "scar", VECTOR: "vector", schema: "org.clothocad.model.FeatureRole"};
	modRole = {TRANSCRIPTION: "transcription", TRANSLATION: "translation", EXPRESSION: "expression", INSULATION: "insulation", 
			REPLICATION: "replication", schema: "org.clothocad.model.ModuleRole"};
	
	function variable(name) {
		this.name = name;
		this.schema = "org.clothocad.model.Variable";
	}

	transcStrength = new variable("Transcription Strength");
	translStrength = new variable("Translation Strength");
	expressStrength = new variable("Expression Strength");
	termStrength = new variable("Termination Strength");
	dummyVariable = new variable("");

	function units(name) {
		this.name = name;
		this.schema = "org.clothocad.model.Units";
	}

	reu = new units("REU");
	dummyUnits = new units("");

	function module(feats, subMods, role, schema) {
		this.schema = schema;
		if (schema === "org.clothocad.model.BasicModule") {
			this.features = feats;
		} else if (schema === "org.clothocad.model.CompositeModule") {
			this.subModules = subMods;
		}
		this.role = role;
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
		};
		this.constructName = function() {
			var feats = this.getFeatures();
			var name = "";
			var i;
			for (i = 0; i < feats.length; i++) {
				name = name + " + " + feats[i].name;
			}
			return this.role.substring(0, 1).toUpperCase() + this.role.substring(1) + " " + name.substring(3);
		};
		this.name = this.constructName();
	}

	function design(mod, params, grammar) {
		if (mod != null) {
			this.module = mod;
		}
		this.constructName = function() {
			if ('module' in this) {
				return this.module.constructName().substring(this.module.role.length + 1);
			} else {
				return "";
			}
		};
		this.name = this.constructName();
		if (params != null && params.length > 0) {
			this.parameters = params;
		}
		if (grammar != null) {
			this.grammar = grammar;
		}
		this.schema = "org.clothocad.model.Design";
	}

	function parameter(value, varia, units) {
		this.value = value;
		this.variable = varia;
		this.units = units;
		this.schema = "org.clothocad.model.Parameter";
	}

	function sequence(seq) {
		this.sequence = seq;
		this.type = seqType.DNA;
		this.schema = "org.clothocad.model.Sequence";
	}

	function feature(name, role, seq) {
		this.name = name;
		this.role = role
		this.sequence = seq;
		this.schema = "org.clothocad.model.Feature";
	}

	function level(param, design) {
		this.parameter = param;
		this.design = design;
		this.schema = "org.clothocad.model.Level";
	}

	function factor(variable, design) {
		this.variable = variable;
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
			this.variable = fl.variable;
			this.parameter = new parameter(0, fl.variable, dummyUnits);
		} else if (fl.schema === "org.clothocad.model.Level") {
			this.depth = 2;
			this.rootable = false;
			this.valueDisplay = "";
			this.toggleDisplay = "display:none";
			this.labelColor = "";
			this.backgroundColor = ""
			this.variable = fl.parameter.variable;
			this.parameter = fl.parameter;
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
			if (data != null) {
				var i;
				var j;
				var minI;
				var minJ = -1;
				var maxJ = -1;
				for (i = 0; i < data.length; i++) {
					j = 0;
					while (j < data[i].length && minJ < 0) {
						if (j > 0 && !isNaN(data[i][j]) && data[i][j] !== ""
								&& !isNaN(data[i][j - 1]) && data[i][j - 1] !== "") {
							minJ = j;
							minI = i;
						}
						j++;
					}
					while (j < data[i].length && maxJ < 0) {
						if (!isNaN(data[i][j]) && data[i][j] !== ""
								&& (j + 1 == data[i].length || isNaN(data[i][j + 1]) || data[i][j + 1] === "")) {
							maxJ = j;
						}
						j++;
					}
					if (minJ >= 0 && maxJ >= 0) {
						j = minJ;
						doeTemplate.grid.push([]);
						while (!isNaN(data[i][j]) && data[i][j] !== "" && j <= maxJ) {
							doeTemplate.grid[i - minI].push(data[i][j]);
							if (doeTemplate.range.indexOf(data[i][j]) < 0) {
								doeTemplate.range.push(data[i][j]);
							}
							j++;
						}
						if (j <= maxJ) {
							doeTemplate.grid.splice(i, 1);
							i = data.length;
						}
					} else if (minJ >= 0) {
						return null;
					}
				}
				doeTemplate.range.sort(function(a, b){return a - b});
			}
			return doeTemplate;
		}
	};

	var expressGrammar = {
		name: "Expression Grammar",
		inferModule: function(feats) {
			var transcFeats = [];
			var translFeats = [];
			var expressFeats = [];
			var insulationFeats = [];
			var replicationFeats = [];
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
				} else if (feats[i].role === featRole.SPACER || feats[i].role === featRole.SCAR) {
					insulationFeats.push(feats[i]);
				} else if (feats[i].role === featRole.VECTOR) {
					replicationFeats.push(feats[i]);
				}
			}
			if (replicationFeats.length > 0) {
				return new module(replicationFeats, [], modRole.REPLICATION, "org.clothocad.model.BasicModule");
			} else if (insulationFeats.length > 0) {
				return new module(insulationFeats, [], modRole.INSULATION, "org.clothocad.model.BasicModule");
			}
			var transcMod;
			if (hasPromoter || hasTerminator) {
				transcMod = new module(transcFeats, [], modRole.TRANSCRIPTION, "org.clothocad.model.BasicModule");
			} else {
				transcMod = null;
			}
			var translMod;
			if (hasRBS) {
				translMod = new module(translFeats, [], modRole.TRANSLATION, "org.clothocad.model.BasicModule");
			} else {
				translMod = null;
			}
			var expressMod;
			if (hasCDS) {
				expressMod = new module(expressFeats, [], modRole.EXPRESSION, "org.clothocad.model.BasicModule");
			} else {
				expressMod = null;
			}
			if ((hasCDS && (hasPromoter || hasTerminator || hasRBS)) || ((hasPromoter || hasTerminator) && hasRBS)) {
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
				return new module([], subMods, modRole.EXPRESSION, "org.clothocad.model.CompositeModule");
			} else if (hasCDS) {
				return expressMod;
			} else if (hasPromoter || hasTerminator) {
				return transcMod;
			} else if (hasRBS) {
				return translMod;
			} else {
				return null;
			}
		}, schema: "org.clothocad.model.FunctionalGrammar"
	};

	var gridParser = {
		grammar: expressGrammar,
		parseDesigns: function(data) {
			var designs = [];
			if (data != null) {
				var parsedMod;
				var rowFeats = [];
				var i;
				for (i = 0; i < data.length; i++) {
					if (data[i].length > 0) {
						rowFeats[i] = this.parseFeature(data[i][0]);
						if (rowFeats[i] != null) {
							parsedMod = this.grammar.inferModule([rowFeats[i]]);
							if (parsedMod != null) {
								designs.push(new design(parsedMod, [], this.grammar));
							}
						}
					}
				}
				var colFeats = [];
				var j;
				for (j = 1; data.length > 0 && j < data[0].length; j++) {
					colFeats[j] = this.parseFeature(data[0][j]);
					if (colFeats[j] != null) {
						parsedMod = this.grammar.inferModule([colFeats[j]]);
						if (parsedMod != null) {
							designs.push(new design(parsedMod, [], this.grammar));
						}
					}
				}
				var parsedParam;
				var parsedDesign;
				for (i = 1; i < data.length; i++) {
					for (j = 1; j < data[i].length; j++) {
						if (rowFeats[i] != null && colFeats[j] != null) {
							parsedMod = this.grammar.inferModule([rowFeats[i], colFeats[j]]);
							if (parsedMod != null) {
								parsedParam = this.parseParameter(data[i][j], parsedMod.role);
								designs.push(new design(parsedMod, parsedParam, this.grammar));
							}
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
				if (parsedRole === featRole.CDS) {
					return new feature(data.substring(0, data.length - 1), parsedRole, new sequence("."));
				} else {
					return new feature(data, parsedRole, new sequence("."));
				}
			} else {
				return null;
			}
		}, parseParameter: function(data, role) {
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
				return [new parameter(data, varia, reu)];
			} else {
				return null;
			}
		}
	};

	var tableParser = {
		grammar: expressGrammar,
		parseDesigns: function(data) {
			var designs = [];
			if (data != null && data.length > 1 && data[0].length >= 7
					&& data[0][0] === "Part" && data[0][1] === "Part Type" && data[0][2] === "Strength" 
					&& data[0][3] === "Strength_SD" && data[0][4] === "REU" && data[0][5] === "REU_SD"
					&& data[0][6] === "Part Sequence") {
				var i;
				var parsedFeat;
				var parsedMod;
				var parsedParam;
				for (i = 1; i < data.length; i++) {
					if (data[i].length > 1 && isNaN(data[i][0]) && data[i][0].length > 0
							&& isNaN(data[i][1]) && data[i][1].length > 0) {
						parsedFeat = this.parseFeature(data[i]);
						if (parsedFeat != null) {
							parsedMod = this.grammar.inferModule([parsedFeat]);
							if (parsedMod != null) {
								parsedParam = this.parseParameter(data[i], parsedMod.role);
								designs.push(new design(parsedMod, parsedParam, this.grammar));
							}
						}
					}
				}
			}
			return designs;
		}, parseFeature: function(data) {
			if (data.length >= 2 && isNaN(data[0]) && data[0].length > 0
					&& isNaN(data[1]) && data[1].length > 0) {
				var parsedRole;
				if (data[1] === "Promoter") {
					parsedRole = featRole.PROMOTER;
				} else if (data[1] === "RBS") {
					parsedRole = featRole.RBS;
				} else if (data[1] === "CDS") {
					parsedRole = featRole.CDS;
				} else if (data[1] === "Terminator") {
					parsedRole =  featRole.TERMINATOR;
				} else if (data[1] === "Spacer") {
					parsedRole = featRole.SPACER;
				} else if (data[1] === "Scar") {
					parsedRole = featRole.SCAR;
				} else if (data[1] === "Vector") {
					parsedRole = featRole.VECTOR;
				} else {
					return null;
				}
				if (data.length >= 7 && isNaN(data[6]) && data[6].length > 0) {
					seq = new sequence(data[6]);
				} else {
					seq = new sequence(".");
				}
				return new feature(data[0], parsedRole, seq);
			} else {
				return null;
			}
		}, parseParameter: function(data, role) {
			if (!isNaN(data[2]) && data[2] !== "") {
				return [new parameter(data[2], termStrength, reu)];
			} else if (!isNaN(data[4]) && data[4] !== "") {
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
				return [new parameter(data[4], varia, reu)];
			} else {
				return null;
			}
		}
	};

	$scope.selectedFL;
	$scope.levels = [];
	$scope.targetLevels = [{value: 100}, {value: 1000}, {value: 10000}];
	$scope.factors = [];
	$scope.experimentalDesign = [];
	$scope.designParsers = [gridParser, tableParser];
	// $scope.currentParser = $scope.parsers[0];
	$scope.spareFeatures = [];
	$scope.doeParser = doeTemplateParser;
	$scope.doeTemplate;
	$scope.assignmentPenalty = "N/A";
	$scope.uploadSelector = "0";

	$scope.addFeatures = function(size, fl) {
		$scope.selectedFL = fl;
	    var modalInstance = $modal.open({
	    	templateUrl: 'featureWindow.html',
	    	controller: 'featureWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	        		var addUniqueFeatures = function(feats, targetFeats) {
	        			var i;
	        			for (i = 0; i < targetFeats.length; i++) {
	        				if (feats.indexOf(targetFeats[i]) < 0) {
	        					feats.push(targetFeats[i]);
	        				}
	        			}
	        			return feats;
	        		};
	        		var feats = [];
	        		var i;
	        		for (i = 0; i < $scope.factors.length; i++) {
	        			feats = addUniqueFeatures(feats, $scope.factors[i].fl.design.module.getFeatures());
	        		}
	        		for (i = 0; i < $scope.levels.length; i++) {
	        			feats = addUniqueFeatures(feats, $scope.levels[i].fl.design.module.getFeatures());
	        		}
	        		var j;
	        		for (i = 0; i < $scope.experimentalDesign.length; i++) {
	        			feats = addUniqueFeatures(feats, $scope.experimentalDesign[i].fl.design.module.getFeatures());
	        			for (j = 0; j < $scope.experimentalDesign[i].nodes.length; j++) {
	        				feats = addUniqueFeatures(feats, $scope.experimentalDesign[i].nodes[j].fl.design.module.getFeatures());
	        			}
	        		}
	        		feats = addUniqueFeatures(feats, $scope.spareFeatures);
	          		return {selectedFeatures: $scope.selectedFL.design.module.getFeatures(), features: feats};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(selectedItem) {
	    	$scope.selectedFL.design.module = $scope.selectedFL.design.grammar.inferModule(selectedItem);
	    	$scope.selectedFL.design.constructName();
	    });
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
    			var fl = event.source.nodeScope.$modelValue.fl;
    			var copy;
    			if (fl.schema === "org.clothocad.model.Level") {
    				copy = new flNode(new level(fl.parameter, fl.design));
    			} else {
    				copy = new flNode(new factor(dummyVariable, fl.design));
    			}
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, copy);
    		}
    	}
  	};

  	$scope.generateDesigns = function(experimentalDesign, doeTemplate) {
  		if (experimentalDesign.length == doeTemplate.grid[0].length 
  				&& experimentalDesign[0].nodes.length == doeTemplate.range.length) {
  			var outputData = [[]];
  			var i;
  			for (i = 0; i < experimentalDesign.length; i++) {
  				experimentalDesign[i].nodes.sort(function(a, b){return a.parameter.value - b.parameter.value})
  				outputData[0].push(experimentalDesign[i].fl.design.name);
  			}
  			var j;
  			var k;
  			for (i = 0; i < doeTemplate.grid.length; i++) {
  				outputData.push([]);
  				for (j = 0; j < doeTemplate.grid[i].length; j++) {
  					k = doeTemplate.range.indexOf(doeTemplate.grid[i][j]);
  					outputData[i + 1].push(experimentalDesign[j].nodes[k].fl.design.name);
  				}
  			}
  			return outputData;
  		}
  	}

  	$scope.uploadTemplate = function(files, templateParser, experimentalDesign) {
		Papa.parse(files[0], {dynamicTyping: true, templateParser: templateParser, experimentalDesign: experimentalDesign,
			complete: function(results) {
				$scope.doeTemplate = templateParser.parseTemplate(results.data);
				// if (this.experimentalDesign.length == $scope.doeTemplate.grid[0].length 
	  	// 				&& this.experimentalDesign[0].nodes.length == $scope.doeTemplate.range.length) {
		  // 			$scope.outputData = [];
		  // 			var i;
		  // 			for (i = 0; i < this.experimentalDesign.length; i++) {
		  // 				this.experimentalDesign[i].nodes.sort(function(a, b){return a.parameter.value - b.parameter.value})
		  // 			}
		  // 			var j;
		  // 			var k;
		  // 			for (i = 0; i < $scope.doeTemplate.grid.length; i++) {
		  // 				$scope.outputData.push([]);
		  // 				for (j = 0; j < $scope.doeTemplate.grid[i].length; j++) {
		  // 					k = $scope.doeTemplate.range.indexOf($scope.doeTemplate.grid[i][j]);
		  // 					$scope.outputData[i].push(this.experimentalDesign[j].nodes[k].fl.design.name);
		  // 				}
		  // 			}
	  	// 		}
			}
		});
  	}

	$scope.uploadDesigns = function(files, designParser) {
		var i;
		if (files != null) {
	    	for (i = 0; i < files.length; i++) {
	    		Papa.parse(files[i], {dynamicTyping: true, designParser: designParser,
					complete: function(results) {
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
						var designs = this.designParser.parseDesigns(results.data);
						var i;
						var j;
						var spareFeats;
						for (i = 0; i < designs.length; i++) {
							if (isCodedExpression(designs[i])) {
								$scope.factors.push(new flNode(new factor(dummyVariable, designs[i])));
							} else {
								j = isParameterizedExpression(designs[i]);
								if (j >= 0) {
									$scope.levels.push(new flNode(new level(designs[i].parameters[j], designs[i])));
								} else {
									spareFeats = designs[i].module.getFeatures();
									for (j = 0; j < spareFeats.length; j++) {
										$scope.spareFeatures.push(spareFeats[j]);
									}
									
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
						$scope.levels.sort(function(a, b){return a.parameter.value - b.parameter.value});
						$scope.$apply();
					}
				});
	    	}
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

    $scope.clusterLevels = function() {
    	if ($scope.levels.length >= $scope.targetLevels.length) {
	    	var i;
	    	var j;
	    	var usedValues = [];
	    	var clusters = [];
	    	var prevClusters = [];
	    	for (i = 0; i < $scope.targetLevels.length; i++) {
	    		do {
		    		j = Math.floor(Math.random()*$scope.levels.length);
	    		} while(usedValues.indexOf($scope.levels[j].parameter.value) >= 0);
	    		$scope.targetLevels[i].value = Number($scope.levels[j].parameter.value.toFixed(2));
	    		clusters.push([]);
	    		prevClusters.push([]);
	    	}
	    	$scope.targetLevels.sort(function(a, b){return a.value - b.value});
	    	var k;
	    	var levelScore;
	    	var bestScore;
	    	var clusterTotal;
	    	var repeatClustering;
	    	do {
	    		repeatClustering = false;
	    		for (i = 0; i < clusters.length; i++) {
	    			clusters.splice(i, 1, []);
	    		}	
		    	for (i = 0; i < $scope.levels.length; i++) {
		    		bestScore = -1;
		    		for (j = 0; j < $scope.targetLevels.length; j++) {
		    			levelScore = Math.pow(($scope.levels[i].parameter.value - $scope.targetLevels[j].value), 2);
		    			if (bestScore < 0 || levelScore < bestScore) {
		    				k = j;
		    				bestScore = levelScore;
		    			}
		    		}
		    		clusters[k].push($scope.levels[i]);
		    		if (prevClusters[k].length < clusters[k].length 
		    				|| prevClusters[k][clusters[k].length - 1] != $scope.levels[i]) {
		    			repeatClustering = true;
		    		}
		    	}
		    	if (repeatClustering) {
			    	for (i = 0; i < $scope.targetLevels.length; i++) {
			    		clusterTotal = 0;
			    		for (j = 0; j < clusters[i].length; j++) {
			    			clusterTotal += clusters[i][j].parameter.value;
			    		}
			    		$scope.targetLevels[i].value = Number((clusterTotal/clusters[i].length).toFixed(2));
			    	}
			    	for (i = 0; i < prevClusters.length; i++) {
		    			prevClusters.splice(i, 1, clusters[i]);
		    		}	
		    	}
	    	} while (repeatClustering);
    	}
    };

	$scope.assignLevels = function() {
		if ($scope.experimentalDesign.length >= 2 && $scope.levels.length >= 2) {
			$scope.targetLevels.sort(function(a, b){return a.value - b.value});
			$scope.levels.sort(function(a, b){return a.parameter.value - b.parameter.value});
			var midPoints = [];
			var i;
			for (i = 0; i < $scope.targetLevels.length - 1; i++) {
				midPoints.push(($scope.targetLevels[i].value + $scope.targetLevels[i + 1].value)/2);
			}
			var levelScorings = [[]];
			var j = 0;
			for (i = 0; i < $scope.levels.length; i++) {
				while (j < midPoints.length && $scope.levels[i].parameter.value > midPoints[j]) {
					levelScorings.push([]);
					j++;
				} 
				levelScorings[j].push({level: $scope.levels[i], score: Math.abs($scope.levels[i].parameter.value - $scope.targetLevels[j].value)});
			}
			var solver = {
				greedySolve: function(targetLevelCount, factorCount, levelScorings) {
					for (i = 0; i < levelScorings.length; i++) {
						levelScorings[i].sort(function(a, b){return a.score - b.score});
					}
					return this.simpleSolve(targetLevelCount, factorCount, levelScorings);
				},
				simpleSolve: function(targetLevelCount, factorCount, levelScorings) {
					var soln = new solution(targetLevelCount, factorCount, 0);
		    		var backtrack;
		    		var i;
		    		var j;
					var k;
					for (i = 0; i < soln.levelSelections.length; i++) {
						for (j = 0; j < soln.levelSelections[i].length; j++) {
							k = soln.levelSelections[i][j];
							while (k < levelScorings[i].length && soln.isHomologyRisk(levelScorings, i, j, k, i)) {
								k++;
							} 
							if (k == levelScorings[i].length) {
								backtrack = true;
							} else {
								backtrack = false;
								soln.score = soln.score + levelScorings[i][k].score;
								soln.levelSelections[i][j] = k;
							}
							if (backtrack) {
								soln.levelSelections[i][j] = 0;
								j--;
								if (j < 0) {
									i--;
									if (i < 0) {
										return null;
									}
									j = soln.levelSelections[i].length - 1;
								}
								k = soln.levelSelections[i][j];
								soln.score = soln.score - levelScorings[i][k].score;
								soln.levelSelections[i][j]++;
								j--;
							}
						}
					}
					return soln;
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
					return bestSoln;
		    	},
		    	monteCarlo: function(initialTemp, solutionCap, targetLevelCount, factorCount, levelScorings) {
					// var shuffle = function(array) {
					//   var currentIndex = array.length;
					//   var temporaryValue;
					//   var randomIndex;
					//   while (currentIndex != 0) {
					//     randomIndex = Math.floor(Math.random() * currentIndex);
					//     currentIndex -= 1;
					//     temporaryValue = array[currentIndex];
					//     array[currentIndex] = array[randomIndex];
					//     array[randomIndex] = temporaryValue;
					//   }
					//   return array;
					// };
					// levelScorings = shuffle(levelScorings);
					var bestSoln = this.greedySolve(targetLevelCount, factorCount, levelScorings);
					if (bestSoln == null) {
						return null;
					}
					var soln = new solution(0, 0, 0);
					soln.copySolution(bestSoln);
					var temp;
					var i;
					var j;
					var k;
					var mutantK;
					var mutantScore;
					var mutationAttempts;
					var solutionCount = 0;
					do {
						temp = initialTemp;
						while (temp >= 0) {
							mutationAttempts = 0;
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
								mutationAttempts++;
							} while (mutationAttempts < 10 && (mutantK < 0 || mutantK >= levelScorings[i].length));
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
						if (soln.score < bestSoln.score) {
							bestSoln.copySolution(soln);
						}
						solutionCount++;
					} while (solutionCount < solutionCap);
					return bestSoln;
		    	} 
			};
			// var bestSoln = solver.branchAndBound($scope.targetLevels.length, $scope.experimentalDesign.length, 1, levelScorings);
			var bestSoln = solver.monteCarlo(1000, 50, $scope.targetLevels.length, $scope.experimentalDesign.length, levelScorings);
			// var bestSoln = solver.greedySolve($scope.targetLevels.length, $scope.experimentalDesign.length, levelScorings);
			// var bestSoln = solver.simpleSolve($scope.targetLevels.length, $scope.experimentalDesign.length, levelScorings);
			if (bestSoln != null) {
				$scope.assignmentPenalty = Math.floor(bestSoln.score);
				for (i = 0; i < $scope.experimentalDesign.length; i++) {
					$scope.experimentalDesign[i].nodes = [];
				}
				for (i = 0; i < bestSoln.levelSelections.length; i++) {
					for (j = 0; j < bestSoln.levelSelections[i].length; j++) {
						k = bestSoln.levelSelections[i][j];
						$scope.experimentalDesign[j].nodes.push(levelScorings[i][k].level);
					}
				}
			}
		}
	};
});