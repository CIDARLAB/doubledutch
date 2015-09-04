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

	dummyVaria = new variable("");

	function units(name) {
		this.name = name;
		this.schema = "org.clothocad.model.Units";
	}

	dummyUnits = new units("");

	function parameter(value, varia, units) {
		this.value = value;
		this.variable = varia;
		this.units = units;
		this.schema = "org.clothocad.model.Parameter";
		this.copy = function() {
			return new parameter(this.parameter.value, this.parameter.variable, this.parameter.units);
		}
	}

	function unitlessParameter(value, varia) {
		this.value = value;
		this.variable = varia;
		this.schema = "org.clothocad.model.Parameter";
		this.copy = function() {
			return new parameter(this.parameter.value, this.parameter.variable);
		}
	}

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
			while (mods.length > 0) {
				var mod = mods.pop();
				if (mod.schema === "org.clothocad.model.BasicModule") {
					for (i = 0; i < mod.features.length; i++) {
						feats.push(mod.features[i]);
					}
				} else if (mod.schema === "org.clothocad.model.CompositeModule") {
					for (i = 0; i < mod.subModules.length; i++) {
						mods.push(mod.subModules[i]);
					}
				}
			}
			return feats;
		};
		this.constructNameFromFeatures = function() {
			var feats = this.getFeatures();
			var name = "";
			var i;
			for (i = 0; i < feats.length; i++) {
				name = name + ", " + feats[i].name;
			}
			return name.substring(2);
		};
		this.name = this.role.substring(0, 1).toUpperCase() + this.role.substring(1) + " " + this.constructNameFromFeatures();
	}

	function bioDesign(mod, params) {
		this.module = mod;
		this.constructNameFromFeatures = function() {
			return this.module.constructNameFromFeatures();
		};
		if (arguments.length > 0) {
			this.name = this.constructNameFromFeatures();
		}
		this.parameters = params;
		this.schema = "org.clothocad.model.BioDesign";
		this.copy = function() {
			var bioDesignCopy = new bioDesign(this.module, []);
			var i;
			for (i = 0; i < this.parameters.length; i++) {
				bioDesignCopy.parameters.push(this.parameters[i].copy());
			}
			return bioDesignCopy;
		};
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

	function level(param, bioDesign) {
		this.parameter = param;
		this.bioDesign = bioDesign;
		this.schema = "org.clothocad.model.Level";
	}

	function factor(varia, bioDesign) {
		this.variable = varia;
		this.bioDesign = bioDesign;
		this.levels = [];
		this.schema = "org.clothocad.model.Factor";
	}

	function experimentalDesign(factors) {
		this.factors = factors;
		this.schema = "org.clothocad.model.ExperimentalDesign";
	}

	function fNode(bioDesign) {
		this.bioDesign = bioDesign;
		this.isFNode = true;
		this.depth = 1;
		this.labelColor = "color:#ffffff";
		this.backgroundColor = "background-color:#787878"
		this.parameter = new parameter(0, new variable(""), new units(""));
		this.levelTargets = [];
		this.isTargetShown = false;
		this.isToggleShown = false;
		this.isConstraintShown = false;
		this.isMoveTopShown = true;
		this.children = [];
		this.copy = function() {
			return new fNode(this.bioDesign);
		};
	}

	function lNode(bioDesign, pIndex) {
		this.bioDesign = bioDesign;
		this.isFNode = false;
		this.depth = 2;
		this.labelColor = "";
		this.backgroundColor = ""
		this.parameter = bioDesign.parameters[pIndex];
		this.pIndex = pIndex;
		this.isTargetShown = false;
		this.isToggleShown = false;
		this.isConstraintShown = false;
		this.isConstraint = false;
		this.isMoveTopShown = true;
		this.constraintIcon = "glyphicon glyphicon-star-empty";
		this.constraintColor = "pull-right btn btn-default btn-xs";
		this.children = [];
		this.copy = function() {
			// var nodeCopy = new lNode(this.bioDesign, this.pIndex);
			// nodeCopy.isConstraint = this.isConstraint;
			// return nodeCopy;
			return new lNode(this.bioDesign, this.pIndex);
		};
		this.cost = function(target) {
			return Math.abs(this.parameter.value - target);
		};
	}

	$scope.areFLDNodesValid = function() {
		if ($scope.fldNodes.length > 0) {
			return true;
		} else {
			alertUser("md", "Error", "Factorial design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column " 
					+ "to the center column.");
			return false;
		}
	};

	$scope.areFLNodesValid = function() {
		var i;
		for (i = 0; i < $scope.fldNodes.length; i++) {
			if ($scope.fldNodes[i].children.length == 0) {
				alertUser("md", "Error", "Factorial design does not have at least one level associated with each factor. "
						+ "Upload parameterized features and select 'Assign Levels' or drag levels from the rightmost column to the center column.");
				return false;
			}
		}
		return true;
	};

	$scope.reconcileFLNodes = function() {
		var designRecord = {};
		var j;
		for (j = 0; j < $scope.lNodes.length; j++) {
			designRecord[hash(this.lNodes[j].bioDesign)] = true;
		}
		var i;
		for (i = 0; i < $scope.fldNodes.length; i++) {
			for (j = 0; j < $scope.fldNodes[i].children.length; j++) {
				if (!$scope.fldNodes[i].children[j].isConstraint 
						&& !designRecord[hash($scope.fldNodes[i].children[j].bioDesign)]) {
					$scope.lNodes.push($scope.fldNodes[i].children[j].copy());
				}
			}
		}
	};

	$scope.areLNodesValid = function() {
		$scope.reconcileFLNodes();
		var levelRecord = {};
		var levelCount = 0;
		var j;
		for (j = 0; j < $scope.lNodes.length; j++) {
			if (!levelRecord[hash($scope.lNodes[j].parameter.value)]) {
				levelCount++;
				if (levelCount >= $scope.numLevelsPerFactor) {
					return true;
				}
				levelRecord[hash($scope.lNodes[j].parameter.value)] = true;
			}
		}
		var constraintCount;
		var i;
		for (i = 0; i < $scope.fldNodes.length; i++) {
			constraintCount = 0;
			for (j = 0; j < $scope.fldNodes[i].children.length; j++) {
				if ($scope.fldNodes[i].children[j].isConstraint && !levelRecord[hash($scope.fldNodes.children[j].parameter.value)]) {
					constraintCount++;
				}
			}
			if (constraintCount + levelCount < $scope.numLevelsPerFactor) {
				alertUser("md", "Error", "The number of available unique levels is not greater than or equal to the number of levels per factor that "
						+ "you've selected for your design. Select a lower number of levels per factor or upload additional uniquely parameterized features.");
				return false;
			}
		}
		return true;
	};

	function lCluster(lNodes, target) {
		this.lNodes = lNodes;
		this.target = target;
		this.levelCosts = [];
		this.isEqualTo = function(otherCluster) {
			if (this.lNodes.length != otherCluster.lNodes.length) {
				return false;
			} else {
				var i;
				for (i = 0; i < this.lNodes.length; i++) {
					if (this.lNodes[i] != otherCluster.lNodes[i]) {
						return false;
					}
				}
				return true;
			}
		};
		this.copy = function() {
			var clusterCopy = new lCluster([], this.target);
			var i;
			for (i = 0; i < this.lNodes.length; i++) {
				clusterCopy.lNodes.push(this.lNodes[i]);
			}
			for (i = 0; i < this.levelCosts.length; i++) {
				clusterCopy.levelCosts.push(this.levelCosts[i]);
			}
			return clusterCopy;
		};
		this.calculateLevelCosts = function() {
			this.levelCosts = [];
	    	var maxCost = -1;
	    	var minCost = -1;
	    	var i;
    		for (i = 0; i < this.lNodes.length; i++) {
    			this.levelCosts[i] = this.lNodes[i].cost(this.target);
    			if (maxCost < 0 || this.levelCosts[i] > maxCost) {
    				maxCost = this.levelCosts[i];
    			}
    			if (minCost < 0 || this.levelCosts[i] < minCost) {
    				minCost = this.levelCosts[i];
    			}
    		}
    		for (i = 0; i < this.levelCosts.length; i++) {
    			if (minCost == maxCost) {
    				this.levelCosts[i] = 0;
    			} else {
					this.levelCosts[i] = (this.levelCosts[i] - minCost)/(maxCost - minCost);
				}
			}
			return this.levelCosts;
		};
		this.calculateClusterCost = function() {
			var clusterCost = 0;
			this.calculateLevelCosts();
			for (i = 0; i < this.levelCosts.length; i++) {
				clusterCost += this.levelCosts[i];
			}
			return clusterCost;
		};
		this.isConstrained = function() {
			return this.lNodes.length > 0 && this.lNodes[0].isConstraint;
		};
		this.isBioDesignConstraint = function(bioDesign) {
			if (this.lNodes.length > 0) {
				var j = 0;
				while (j < this.lNodes.length && this.lNodes[j].isConstraint && this.lNodes[j].bioDesign !== bioDesign) {
					j++;
				}
				return j < this.lNodes.length && this.lNodes[j].isConstraint && this.lNodes[j].bioDesign === bioDesign;
			} else {
				return false;
			}
		};
		this.applyConstraint = function() {
			if (this.isConstrained()) {
				this.lNodes = this.lNodes.slice(0, 1);
		    	this.levelCosts = this.levelCosts.slice(0, 1);
			}
		};
		this.isEmpty = function() {
			return this.lNodes.length == 0;
		};
	}

	function flSolution(clusterGrid) {
		this.levelSelections = [];
	    var i, j;
		for (i = 0; i < clusterGrid.length; i++) {
			this.levelSelections[i] = [];
			for (j = 0; j < clusterGrid[i].length; j++) {
				this.levelSelections[i][j] = 0;
			}
		}
		this.clusterGrid = clusterGrid;
		this.calculateCost = function(weights, iBound, jBound) {
			if (arguments.length < 3) {
				if (arguments.length < 2) {
					iBound = this.levelSelections.length - 1;
					if (arguments.length < 1) {
						weights = {levelMatch: 1, homology: 1, reuse: 1};
					}
				}
				jBound = this.levelSelections[iBound].length - 1;
			}
			var levelMatchCost = this.calculateLevelMatchCost(iBound, jBound);
			var homologyCost = this.calculateHomologyCost(iBound, jBound);
			var reuseCost = this.calculateReuseCost(iBound, jBound);
			return {weightedTotal: weights.levelMatch*levelMatchCost + weights.homology*homologyCost + weights.reuse*reuseCost, 
					total: levelMatchCost + homologyCost + reuseCost, levelMatch: levelMatchCost, homology: homologyCost, reuse: reuseCost};
		};
		this.calculateLevelMatchCost = function(iBound, jBound) {
			if (arguments.length < 2) {
				if (arguments.length < 1) {
					iBound = this.levelSelections.length - 1;
				}
				jBound = this.levelSelections[iBound].length - 1;
			}
			var levelMatchCost = 0;
			var normalizationFactor = 0;
			var i, j, k;
			for (i = 0; i <= iBound; i++) {
				for (j = 0; j <= (i == iBound ? jBound : this.levelSelections[i].length - 1); j++) {
					k = this.levelSelections[i][j];
					levelMatchCost += this.clusterGrid[i][j].levelCosts[k];
				}
				normalizationFactor += this.levelSelections[i].length;
			}
			levelMatchCost /= normalizationFactor;
			return levelMatchCost;
		};
		this.calculateReuseCost = function(iBound, jBound) {
			if (arguments.length < 2) {
				if (arguments.length < 1) {
					iBound = this.levelSelections.length - 1;
				}
				jBound = this.levelSelections[iBound].length - 1;
			}
			var reuseCost = 0;
			var i;
			for (i = 0; i < this.levelSelections.length; i++) {
				reuseCost += (this.levelSelections[i].length - 1);
			}
			if (reuseCost > 0) {
				var normalizationFactor = reuseCost;
				var factorFeatRecord;
				var levelFeatRecord;
				var feats;
				var j, k, f;
				for (i = 0; i < this.levelSelections.length; i++) {
					if (this.levelSelections[i].length > 1) {
						if (i > iBound) {
							reuseCost -= (this.levelSelections[i].length - 1);
						} else {
							factorFeatRecord = {};
							for (j = 0; j < this.levelSelections[i].length; j++) {
								if (i == iBound && j > jBound) {
									reuseCost--;
								} else {
									k = this.levelSelections[i][j];
									feats = this.clusterGrid[i][j].lNodes[k].bioDesign.module.getFeatures();
									levelFeatRecord = {};
									for (f = 0; f < feats.length; f++) {
										if (factorFeatRecord[hash(feats[f])] && !levelFeatRecord[hash(feats[f])]) {
											reuseCost--;
											f = feats.length;
										} else {
											factorFeatRecord[hash(feats[f])] = true;
											levelFeatRecord[hash(feats[f])] = true;
										}
									}
								}
							}
						}
					}
				}
				reuseCost /= normalizationFactor;
			}
			return reuseCost;
		};
		this.calculateHomologyCost = function(iBound, jBound) {
			if (arguments.length < 2) {
				if (arguments.length < 1) {
					iBound = this.levelSelections.length - 1;
				}
				jBound = this.levelSelections[iBound].length - 1;
			}
			var homologyCost = 0;
			if (this.levelSelections.length > 1) {
				var normalizationFactor = 0;
				var levelTotal = 0;
				var i;
				for (i = 0; i < this.levelSelections.length; i++) {
					if (this.levelSelections[i].length > 1) {
						normalizationFactor -= combinatorial(this.levelSelections[i].length, 2);
					}
					levelTotal += this.levelSelections[i].length;
				}
				if (levelTotal < 2) {
					normalizationFactor++;
				} else {
					normalizationFactor += combinatorial(levelTotal, 2);
				}
				var featDict = {};
				var homologyDict;
	    		var feats;
	    		var j, k, f, m, n;
	    		for (i = 0; i <= iBound; i++) {
					for (j = 0; j <= (i == iBound ? jBound : this.levelSelections[i].length - 1); j++) {
						k = this.levelSelections[i][j];
		    			feats = this.clusterGrid[i][j].lNodes[k].bioDesign.module.getFeatures();
		    			homologyDict = {};
		    			for (f = 0; f < feats.length; f++) {
		    				if (featDict[hash(feats[f])] == null) {
		    					featDict[hash(feats[f])] = [];
		    					for (m = 0; m <= iBound; m++) {
		    						featDict[hash(feats[f])].push([]);
		    						for (n = 0; n <= jBound; n++) {
			    						featDict[hash(feats[f])][m].push(0);
			    					}
		    					}
		    				} else {
		    					for (m = 0; m <= iBound; m++) {
		    						if (m != i) {
		    							for (n = 0; n <= jBound; n++) {
		    								if (featDict[hash(feats[f])][m][n] > 0 
			    									&& homologyDict[hash(JSON.stringify(m) + JSON.stringify(n))] == null) {
				    							homologyCost += featDict[hash(feats[f])][m][n];
				    							homologyDict[hash(JSON.stringify(m) + JSON.stringify(n))] = true;
					    					}
			    						}
		    						}
		    					}
		    				}
	    					featDict[hash(feats[f])][i][j]++;
		    			}
		    		}
	    		}
	    		homologyCost /= normalizationFactor;
    		}
    		return homologyCost;
		};
		this.copy = function() {
			var solnCopy = new flSolution(this.clusterGrid);
			var i, j;
			for (i = 0; i < solnCopy.levelSelections.length; i++) {
				for (j = 0; j < solnCopy.levelSelections[i].length; j++) {
					solnCopy.levelSelections[i][j] = this.levelSelections[i][j];
				}
			}
			return solnCopy;
		};
	}

	function flSolver() {
		this.randomSolve = function(clusterGrid, weights, numTrials, timer) {
			if (arguments.length < 4) {
    			timer = new Timer();
    		}
  			var soln;
  			var solnCost;
			var bestSoln;
			var bestSolnCost;
  			var trialCount = 0;
  			var i, j;
  			while (trialCount < numTrials && !timer.hasTimedOut()) {
  				soln = new flSolution(clusterGrid);
	  			for (i = 0; i < soln.levelSelections.length; i++) {
	  				for (j = 0; j < soln.levelSelections[i].length; j++) {
	  					soln = this.mutateSolution(soln, i, j);
	  					solnCost = soln.calculateCost(weights);
	  				}
	  			}
	  			if (trialCount == 0 || solnCost.weightedTotal < bestSoln.weightedTotal) {
	  				bestSoln = soln;
	  				bestSolnCost = solnCost;
	  			}
	  			trialCount++;
	  		}
    		return bestSoln;
    	};
    	this.mutateSolution = function(soln, i, j) {
    		var mutantSoln = soln.copy();
    		if (mutantSoln.clusterGrid[i][j].lNodes.length > 1) {
    			var k;
				do {
					k = Math.floor(Math.random()*mutantSoln.clusterGrid[i][j].lNodes.length);
				} while (k == mutantSoln.levelSelections[i][j]);
				mutantSoln.levelSelections[i][j] = k;
    		}
    		return mutantSoln;
    	};
    	this.annealSolve = function(clusterGrid, annealingOptions, weights, timer) {
    		if (arguments.length < 4) {
    			timer = new Timer();
    		}
			var soln;
			var solnCost;
			var bestSoln = this.randomSolve(clusterGrid, weights, 1, timer);
			var bestSolnCost = bestSoln.calculateCost(weights);
			var annealCount = 0;
			var temp;
			var phi = Math.pow(1/annealingOptions.initialTemp, 1/annealingOptions.iterPerAnnealing);
			var mutantSoln;
			var mutantCost;
			var i, j;
			while (annealCount < annealingOptions.numAnnealings && !timer.hasTimedOut()) {
				soln = this.randomSolve(clusterGrid, weights, 1, timer);
				solnCost = soln.calculateCost(weights);
				temp = annealingOptions.initialTemp;
				while (temp >= 1) {
					i = Math.floor(Math.random()*soln.levelSelections.length);
					j = Math.floor(Math.random()*soln.levelSelections[i].length);
					mutantSoln = this.mutateSolution(soln, i, j);
					mutantCost = mutantSoln.calculateCost(weights);
					if (mutantCost.weightedTotal <= solnCost.weightedTotal 
							|| Math.random() <= Math.exp((solnCost.weightedTotal - mutantCost.weightedTotal)*0.1*annealingOptions.initTemp/temp)) {
						soln = mutantSoln;
						solnCost = mutantCost;
					}
					temp *= phi;
				}
				if (solnCost.weightedTotal < bestSolnCost.weightedTotal) {
					 bestSoln = soln
					 bestSolnCost = solnCost;
				}
				annealCount++;
			}
			return bestSoln;
    	};
    	this.boundSolve = function(clusterGrid, annealingOptions, weights, timer, levelSelections) {
    		var soln = new flSolution(clusterGrid);
    		if (arguments.length > 4) {
    			soln.levelSelections = levelSelections;
    		}
    		var solnCost;
    		var bestSoln;
    		if (arguments.length > 4) {
    			bestSoln = soln;
    			bestSoln.levelSelections = levelSelections;
    		} else {
    			bestSoln = this.annealSolve(clusterGrid, annealingOptions, weights, timer);
    		}
    		var bestSolnCost = bestSoln.calculateCost(weights);
    		var backtrack = false;
    		var i = 0;
    		var j = 0;
    		while (!backtrack && !timer.hasTimedOut()) {
    			while (!backtrack && j < soln.levelSelections[i].length && !timer.hasTimedOut()) {
    				backtrack = (soln.levelSelections[i][j] == soln.clusterGrid[i][j].lNodes.length);
    				if (!backtrack) {
						solnCost = soln.calculateCost(weights, i, j);
						if (solnCost.weightedTotal >= bestSolnCost.weightedTotal) {
							soln.levelSelections[i][j]++;
						} else if (i == soln.levelSelections.length - 1 && j == soln.levelSelections[i].length - 1) {
 							bestSoln = soln.copy();
							bestSolnCost = solnCost;
							soln.levelSelections[i][j]++;
						} else {
	    					j++;
	    				}
	    			} else {
						soln.levelSelections[i][j] = 0;
						if (j > 0) {
							j--;
							soln.levelSelections[i][j]++;
							backtrack = false;
						}
					}
    			}
    			if (!backtrack) {
    				i++;
    				j = 0;
    			} else if (i > 0) {
					i--;
					j = soln.levelSelections[i].length - 1;
					soln.levelSelections[i][j]++;
					backtrack = false;
				}
    		}
    		if (i == 0 && j == 0) {
    			bestSoln.isOptimal = true;
    		}
    		return bestSoln;
    	};
	}

	Timer = function(timeout) {
		if (arguments.length < 1) {
			timeout = 0;
		}
		this.timeout = timeout;
		this.start();
	};

	Timer.prototype.start = function() {
		this.startTime = new Date().getTime();
	};

	Timer.prototype.startSec = function() {
		this.startTime = new Date().getTime();
	};

	Timer.prototype.getElapsedTime = function() {
		if (this.startTime) {
			return (new Date().getTime() - this.startTime)/60000;
		} else {
			return 0;
		}
	};

	Timer.prototype.getElapsedTimeSec = function() {
		if (this.startTime) {
			return (new Date().getTime() - this.startTime)/1000;
		} else {
			return 0;
		}
	};

	Timer.prototype.hasTimedOut = function() {
		if (this.startTime) {
			return this.timeout > 0 && this.getElapsedTime() >= this.timeout; 
		} else {
			return false;
		}
		
	};

	function lClusterer() {
		this.templateCluster = function(fNodes, lNodes, doeTemplate, numClusterings) {
			var numsClusters = [];
			var i;
			for (i = 0; i < doeTemplate.rangeGrid.length; i++) {
				numsClusters[i] = doeTemplate.rangeGrid[i].length;
			}
			var clusterGrid = this.lfMeansCluster(fNodes, lNodes, numsClusters, numClusterings);
			fNodes = this.retargetNodes(fNodes, clusterGrid, doeTemplate);
			return this.targetedCluster(fNodes, lNodes);
		};
		this.lfMeansCluster = function(fNodes, lNodes, numsClusters, numClusterings) {
			var processNumsClusters = function(numsClusters, numFactors) {
				if (numsClusters.constructor !== Array) {
					numsClusters = [numsClusters];
					var i;
					for (i = 1; i < numFactors; i++) {
						numsClusters[i] = numsClusters[0];
					}
				}
				return numsClusters;
			};
			var composeConstraints = function(fNodes, numsClusters) {
				var constraintMap = {};
				var constraintKeys;
				var constraintNodes;
				var i, j;
				for (i = 0; i < fNodes.length; i++) {
					constraintKeys = [];
					constraintNodes = [];
					for (j = 0; j < fNodes[i].children.length; j++) {
						if (fNodes[i].children[j].isConstraint) {
							constraintKeys.push(hash(fNodes[i].children[j].bioDesign));
							constraintNodes.push(fNodes[i].children[j]);
						}
					}
					if (constraintKeys.length > 0) {
						constraintKeys.sort();
					} else {
						constraintKeys[0] = "unconstrained";
					}
					constraintKeys.push(numsClusters[i]);
					if (constraintMap[constraintKeys.toString()]) {
						constraintMap[constraintKeys.toString()].indices.push(i);
					} else {
						constraintMap[constraintKeys.toString()] = {indices: [i], nodes: constraintNodes, numClusters: numsClusters[i]};
					}
				}
				var constraints = [];
				for (var property in constraintMap) {
					if (constraintMap.hasOwnProperty(property)) {
						constraints.push(constraintMap[property]);
					}
				}
				return constraints;
			};
			var makeClusterGrid = function(lNodes, kMeansCluster, constraints) {
				var clusterGrid = [];
				var clusters;
				var m, n;
	    		for (m = 0; m < constraints.length; m++) {
	    			clusters = kMeansCluster(lNodes, constraints[m].numClusters, constraints[m].nodes);
	    			for (n = 0; n < constraints[m].indices.length; n++) {
	    				clusterGrid[constraints[m].indices[n]] = clusters;
	    			}
	    		}
	    		return clusterGrid;
			};
			var calculateClusteringCost = function(clusterGrid, constraints) {
				var totalClusteringCost = 0;
				var clusteringCost;
				var m, i, j;
				for (m = 0; m < constraints.length; m++) {
					clusteringCost = 0;
					i = constraints[m].indices[0];
					for (j = 0; j < clusterGrid[i].length; j++) {
						clusteringCost += clusterGrid[i][j].calculateClusterCost();
					}
					totalClusteringCost += constraints[m].indices.length*clusteringCost;
				}
				return totalClusteringCost;
			};
			numsClusters = processNumsClusters(numsClusters, fNodes.length);
			var constraints = composeConstraints(fNodes, numsClusters);
			var clusterGrid;
			var clusteringCost;
			var bestClusterGrid;
			var bestClusteringCost = -1;
	    	var clusteringCount = 0;
	    	while (clusteringCount <= numClusterings) {
	    		clusterGrid = makeClusterGrid(lNodes, this.kMeansCluster, constraints);
	    		clusteringCost = calculateClusteringCost(clusterGrid, constraints);
		    	if (bestClusteringCost < 0 || clusteringCost < bestClusteringCost) {
		    		bestClusteringCost = clusteringCost;
		    		bestClusterGrid = clusterGrid;
		    	}
		    	clusteringCount++;
	    	}
	    	var i, j;
	    	for (i = 0; i < bestClusterGrid.length; i++) {
	    		bestClusterGrid[i].sort(function(a, b) {return a.target - b.target});
	    		for (j = 0; j < bestClusterGrid[i].length; j++) {
	    			bestClusterGrid[i][j].applyConstraint();
	    		}
	    	}
	    	return bestClusterGrid;
	    };
	    this.kMeansCluster = function(lNodes, numClusters, constraintNodes) {
	    	if (arguments.length < 3) {
	    		constraintNodes = [];
	    	}
	    	var initializeClusters = function(lNodes, numClusters, constraintNodes) {
				var clusters = [];
				var i;
				for (i = 0; i < constraintNodes.length; i++) {
					clusters[i] = new lCluster([constraintNodes[i]], constraintNodes[i].parameter.value);
				}
				var targetNodes = [];
				var k;
				for (k = 0; k < lNodes.length; k++) {
					targetNodes[k] = lNodes[k];
				}
				var targetNode;
				var targetRecord = {};
				var j = 0;
				while (j < numClusters - constraintNodes.length && targetNodes.length > 0) {
			    	targetNode = targetNodes.splice(Math.floor(Math.random()*targetNodes.length), 1)[0];
		    		if (!targetRecord[hash(targetNode.parameter.value)]) {
			    		targetRecord[hash(targetNode.parameter.value)] = true;
			    		clusters.push(new lCluster([], targetNode.parameter.value));
			    		j++;
			    	}
		    	}
		    	return clusters;
			};
			var populateClusters = function(clusters, lNodes) {
				var levelCost;
				var bestLevelCost;
				var bestJ;
				var j, k;
				for (k = 0; k < lNodes.length; k++) {
		    		bestLevelCost = -1;
		    		for (j = 0; j < clusters.length; j++) {
		    			levelCost = lNodes[k].cost(clusters[j].target);
		    			if (bestLevelCost < 0 || levelCost < bestLevelCost) {
		    				bestJ = j;
		    				bestLevelCost = levelCost;
		    			}
		    		}
		    		if (!clusters[bestJ].isBioDesignConstraint(lNodes[k].bioDesign)) {
				    	clusters[bestJ].lNodes.push(lNodes[k]);
				    }
		    	}
		    	return clusters;
			};
			var areClustersEqual = function(clusters, otherClusters) {
	    		if (clusters.length != otherClusters.length) {
	    			return false;
	    		} else {
	    			var j;
					for (j = 0; j < clusters.length; j++) {
						if (!clusters[j].isEqualTo(otherClusters[j])) {
							return false;
						}
		    		}
		    		return true;
	    		}
			};
			var recalculateClusters = function(clusters) {
				var clusterTotal;
				var j, k;
				for (j = 0; j < clusters.length; j++) {
					if (!clusters[j].isConstrained()) {
			    		clusterTotal = 0;
			    		for (k = 0; k < clusters[j].lNodes.length; k++) {
			    			clusterTotal += clusters[j].lNodes[k].parameter.value;
			    		}
			    		clusters[j].target = clusterTotal/clusters[j].lNodes.length;
			    	}
		    	}
		    	return clusters;
			};
	    	var clusters = initializeClusters(lNodes, numClusters, constraintNodes);
			var hasConverged;
			var oldClusters = [];
			var j;
			do {
		    	clusters = populateClusters(clusters, lNodes);
		    	hasConverged = areClustersEqual(clusters, oldClusters);
		    	if (!hasConverged) {
			    	clusters = recalculateClusters(clusters);
			    	oldClusters = [];
			    	for (j = 0; j < clusters.length; j++) {
			    		oldClusters[j] = clusters[j].copy();
			    		clusters[j].lNodes = [];
			    		if (oldClusters[j].isConstrained()) {
				    		clusters[j].lNodes[0] = oldClusters[j].lNodes[0];
				    	}
			    	}
		    	}
	    	} while (!hasConverged);
	    	return clusters;
		};
		this.targetedCluster = function(fNodes, lNodes) {
			var initializeClusterGrid = function(fNodes) {
				var clusterGrid = [];
		    	var i, j;
		    	for (i = 0; i < fNodes.length; i++) {
		    		clusterGrid[i] = [];
		    		for (j = 0; j < fNodes[i].levelTargets.length; j++) {
		    			if (fNodes[i].levelTargets.length == 0) {
			    			clusterGrid[i][0] = new lCluster([], $scope.minTarget);
			    			clusterGrid[i][1] = new lCluster([], $scope.maxTarget);
			    		} else {
			    			clusterGrid[i][j] = new lCluster([], fNodes[i].levelTargets[j]);
			    		}
		    		}
		    	}
		    	return clusterGrid;
			};
			var makeConstraintGrid = function(fNodes) {
				var constraintGrid = [];
				var i, j;
		    	for (i = 0; i < fNodes.length; i++) {
		    		constraintGrid[i] = [];
	    			for (j = 0; j < fNodes[i].children.length; j++) {
	    				if (fNodes[i].children[j].isConstraint) {
	    					constraintGrid[i].push(fNodes[i].children[j]);
	    				}
	    			}
	    		}
	    		return constraintGrid;
			};
			var constrainClusterGrid = function(clusterGrid, constraintGrid) {
				var clusters;
				var constraintNodes;
				var bestJ;
				var targetConstraintToCluster = function(constraintNode, clusters) {
					var targetCost;
					var bestTargetCost = -1;
					var bestJ = -1;
					var j;
					for (j = 0; j < clusters.length; j++) {
    					targetCost = constraintNode.cost(clusters[j].target);
			    		if (bestTargetCost < 0 || targetCost < bestTargetCost) {
			    			bestTargetCost = targetCost;
			    			bestJ = j;
			    		}
					}
					return bestJ;
				};
				var unconstrainedClusters = [];
				var unusedConstraints = [];
		    	var i, j, c;
		    	for (i = 0; i < clusterGrid.length; i++) {
		    		clusters = clusterGrid[i];
		    		constraintNodes = constraintGrid[i];
		    		clusterGrid[i] = [];
		    		constraintGrid[i] = [];
			    	while (clusters.length > 0 && constraintNodes.length > 0) {
		    			for (c = 0; c < constraintNodes.length; c++) {
		    				bestJ = targetConstraintToCluster(constraintNodes[c], clusters);
							if (clusters[bestJ].isConstrained()) {
								if (constraintNodes[c].cost(clusters[bestJ].target) 
										< clusters[bestJ].lNodes[0].cost(clusters[bestJ].target)) {
									unusedConstraints.push(clusters[bestJ].lNodes[0]);
									clusters[bestJ].lNodes[0] = constraintNodes[c];
								} else {
									unusedConstraints.push(constraintNodes[c]);
								}
							} else {
								clusters[bestJ].lNodes[0] = constraintNodes[c];
							}
		    			}
		    			for (j = 0; j < clusters.length; j++) {
			    			if (clusters[j].isConstrained()) {
			    				clusterGrid[i].push(clusters[j]);
			    			} else {
			    				unconstrainedClusters.push(clusters[j]);
			    			}
				    	}
				    	clusters = unconstrainedClusters;
			    		constraintNodes = unusedConstraints;
				    	unusedConstraints = [];
						unconstrainedClusters = [];
			    	}
		    		for (j = 0; j < clusters.length; j++) {
		    			clusterGrid[i].push(clusters[j]);
		    		}		
		    		for (j = 0; j < constraintNodes.length; j++) {
		    			bestJ = targetConstraintToCluster(constraintNodes[j], clusterGrid[i]);
		    			clusterGrid[i][bestJ].lNodes.push(constraintNodes[j]);
			    	}
		    	}
		    	return clusterGrid;
			};
			var clusterGrid = initializeClusterGrid(fNodes);
			var constraintGrid = makeConstraintGrid(fNodes);
			clusterGrid = constrainClusterGrid(clusterGrid, constraintGrid);
			var levelCost;
			var bestLevelCost;
			var bestJ;
			var i, j, k;
			for (k = 0; k < lNodes.length; k++) {
				for (i = 0; i < clusterGrid.length; i++) {
					bestLevelCost = - 1;
					for (j = 0; j < clusterGrid[i].length; j++) {
						levelCost = lNodes[k].cost(clusterGrid[i][j].target);
						if (bestLevelCost < 0 || levelCost < bestLevelCost) {
							bestLevelCost = levelCost;
							bestJ = j;
						}
					}
					if (!clusterGrid[i][bestJ].isBioDesignConstraint(lNodes[k].bioDesign)) {
						clusterGrid[i][bestJ].lNodes.push(lNodes[k]);
					}
				}
			}
			for (i = 0; i < clusterGrid.length; i++) {
				clusterGrid[i].sort(function(a, b) {return a.target - b.target});
				for (j = 0; j < clusterGrid[i].length; j++) {
					clusterGrid[i][j].calculateLevelCosts();
					clusterGrid[i][j].applyConstraint();
				}
			}
			return clusterGrid;
		};
		this.retargetNodes = function(fNodes, clusterGrid, doeTemplate) {
			var linReg
    		var logReg;
    		var xData;
    		var yData;
    		var i, j;
    		for (i = 0; i < fNodes.length; i++) {
    			xData = [];
    			yData = [];
    			for (j = 0; j < doeTemplate.rangeGrid[i].length; j++) {
    				xData[j] = doeTemplate.rangeGrid[i][j];
    			}
    			for (j = 0; j < clusterGrid[i].length; j++) {
    				yData[j] = clusterGrid[i][j].target;
    			}
    			if (xData.length <= 2) {
    				fNodes[i].levelTargets = yData;
    			} else {
	    			linReg = new LinearRegression(xData, yData);
		    		logReg = new LogYRegression(xData, yData);
		    		if (linReg.se < logReg.se) {
		    			for (j = 0; j < xData.length; j++) {
		    				if (clusterGrid[i][j].isConstrained()) {
		    					fNodes[i].levelTargets[j] = yData[j];
			    			} else {
			    				fNodes[i].levelTargets[j] = linReg.estimate(xData[j]);
			    			}
		    			}
		    		} else {
		    			for (j = 0; j < xData.length; j++) {
		    				if (clusterGrid[i][j].isConstrained()) {
		    					fNodes[i].levelTargets[j] = yData[j];
		    				} else {
		    					fNodes[i].levelTargets[j] = Math.pow(10, logReg.estimate(xData[j]));
			    			}
		    			}
		    		}
		    	}
    		}
    		return fNodes;
		};
	}

	factorialStore = [];
	factorial = function(n) {
		if (n == 0 || n == 1)
			return 1;
		if (factorialStore[n] > 0)
			return factorialStore[n];
		return factorialStore[n] = factorial(n - 1)*n;
	};
	combinatorial = function(n, k) {
		return factorial(n)/(factorial(k)*factorial(n - k));
	};

	arrayProduct = function(arr1, arr2) {
		var product = [];
		var i;
		for (i = 0; i < Math.max(arr1.length, arr2.length); i++) {
			if (i >= arr1.length) {
				product.push(arr2[i]);	
			} else if (i >= arr2.length) {
				product.push(arr1[i]);
			} else {
				product.push(arr1[i]*arr2[i]);
			}
		}
		return product;
	};

	generatorProduct = function(generator1, generator2) {
		var product = generator1.concat(generator2);
		product.sort(function(a, b) {return a - b});
		var i;
		for (i = product.length - 1; i > 0; i--) {
			if (product[i] == product[i - 1]) {
				product.splice(i, 1);
			}
		}
		return product;
	};

	areArraysDisjoint = function(arr1, arr2) {
		var hashTable = {};
		var i;
		for (i = 0; i < arr1.length; i++) {
			hashTable[hash(arr1[i])] = true;
		}
		for (i = 0; i < arr2.length; i++) {
			if (hashTable[hash(arr2[i])] == true) {
				return false;
			}
		}
		return true;
	};

	hash = function(value) {
	    return (typeof value) + ' ' + (value instanceof Object ?
	        (value.__hash || (value.__hash = ++arguments.callee.current)) :
	        value.toString());
	};
	hash.current = 0;

	basicStats = function(arr) {
		var result = {mean: 0, stdDev: 0, min: -1};
		var i;
		for (i = 0; i < arr.length; i++) {
			if (result.min < 0 || arr[i] < result.min) {
				result.min = arr[i];
			}
		}
		for (i = 0; i < arr.length; i++) {
			result.mean += arr[i];
		}
		result.mean /= arr.length;
		for (i = 0; i < arr.length; i++) {
			result.stdDev += Math.pow(arr[i] - result.mean, 2);
		}
		result.stdDev = Math.sqrt(result.stdDev/arr.length);
		return result;
	};

	LinearRegression = function(x, y) {
        var n = y.length;
        var sumX = 0;
        var sumY = 0;
        var sumXY = 0;
        var sumXX = 0;
        var sumYY = 0;
        var i;
        for (i = 0; i < y.length; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += (x[i]*y[i]);
            sumXX += (x[i]*x[i]);
            sumYY += (y[i]*y[i]);
        }
        var diffXY = n*sumXY - sumX*sumY;
        var diffX = n*sumXX - Math.pow(sumX, 2);
        var diffY = n*sumYY - Math.pow(sumY, 2);
        this.slope = diffXY/diffX;
        this.intercept = (sumY - this.slope*sumX)/n;
        this.se = Math.sqrt((diffY - Math.pow(diffXY, 2)/diffX)/(n - 2));
	};

	LinearRegression.prototype.estimate = function(x) {
		return this.slope*x + this.intercept;
	};

	LogYRegression = function(x, y) {
		var logY = [];
		var i;
		for (i = 0; i < y.length; i++) {
			logY[i] = Math.log(y[i])/Math.LN10;
		}
		LinearRegression.call(this, x, logY);
	};

	LogYRegression.prototype = Object.create(LinearRegression.prototype);
	LogYRegression.prototype.constructor = LinearRegression;

	decimalPlaces = function (num) {
		var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
		if (!match) { return 0; }
		return Math.max(0,
		    // Number of digits right of decimal point.
		    (match[1] ? match[1].length : 0)
		    // Adjust for scientific notation.
		    - (match[2] ? + match[2] : 0));
	};

	validateNumericInput = function(param, min, max, step, defaultParam) {
		if (param == null || isNaN(param) || param === "") {
			return defaultParam;
		} else if (param < min) {
		    return min;
		} else if (param > max) {
		    return max;
		} else {
			var numStepDecimals = decimalPlaces(step.toString());
			if (decimalPlaces(param.toString()) > numStepDecimals) {
				return parseFloat(param.toFixed(numStepDecimals));
			} else {
				return param;
			}
		}
    };

	plackettBurmanSeeds = {};
	plackettBurmanSeeds[hash(4)] = [1, 1, -1];
	plackettBurmanSeeds[hash(8)] = [1, 1, 1, -1, 1, -1, -1];
	plackettBurmanSeeds[hash(12)] = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1];
	plackettBurmanSeeds[hash(16)] = [1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, 1, -1, -1, -1];
	plackettBurmanSeeds[hash(20)] = [1, 1, -1, -1, 1, 1, 1, 1, -1, 1, -1, 1, -1, -1, -1, -1, 1, 1, -1];
	plackettBurmanSeeds[hash(24)] = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, -1, 1, -1, -1, -1, -1];

	boxBehnkenSeeds = {};
	boxBehnkenSeeds[hash(3)] = [[1, 1, 0],
								[1, 0, 1],
								[0, 1, 1],
								[3]];
	boxBehnkenSeeds[hash(4)] = [[1, 1, 0, 0],
								[0, 0, 1, 1],
								[1],
								[1, 0, 0, 1],
								[0, 1, 1, 0],
								[1],
								[1, 0, 1, 0],
								[0, 1, 0, 1],
								[1]];
	boxBehnkenSeeds[hash(5)] = [[1, 1, 0, 0, 0],
								[0, 0, 1, 1, 0],
								[0, 1, 0, 0, 1],
								[1, 0, 1, 0, 0],
								[0, 0, 0, 1, 1],
								[3],
								[0, 1, 1, 0, 0],
								[1, 0, 0, 1, 0],
								[0, 0, 1, 0, 1],
								[1, 0, 0, 0, 1],
								[0, 1, 0, 1, 0],
								[3]];
	boxBehnkenSeeds[hash(6)] = [[1, 1, 0, 1, 0, 0],
								[0, 1, 1, 0, 1, 0],
								[0, 0, 1, 1, 0, 1],
								[1, 0, 0, 1, 1, 0],
								[0, 1, 0, 0, 1, 1],
								[1, 0, 1, 0, 0, 1],
								[6]];
	boxBehnkenSeeds[hash(7)] = [[0, 0, 0, 1, 1, 1, 0],
								[1, 0, 0, 0, 0, 1, 1],
								[0, 1, 0, 0, 1, 0, 1],
								[1, 1, 0, 1, 0, 0, 0],
								[0, 0, 1, 1, 0, 0, 1],
								[1, 0, 1, 0, 1, 0, 0],
								[0, 1, 1, 0, 0, 1, 0],
								[6]];
	boxBehnkenSeeds[hash(9)] = [[1, 0, 0, 1, 0, 0, 1, 0, 0],
								[0, 1, 0, 0, 1, 0, 0, 1, 0],
								[0, 0, 1, 0, 0, 1, 0, 0, 1],
								[2],
								[1, 1, 1, 0, 0, 0, 0, 0, 0],
								[0, 0, 0, 1, 1, 1, 0, 0, 0],
								[0, 0, 0, 0, 0, 0, 1, 1, 1],
								[2],
								[1, 0, 0, 0, 1, 0, 0, 0, 1],
								[0, 0, 1, 1, 0, 0, 0, 1, 0],
								[0, 1, 0, 0, 0, 1, 1, 0, 0],
								[2],
								[1, 0, 0, 0, 0, 1, 0, 1, 0],
								[0, 1, 0, 1, 0, 0, 0, 0, 1],
								[0, 0, 1, 0, 1, 0, 1, 0, 0],
								[2],
								[1, 0, 0, 1, 0, 0, 1, 0, 0],
								[0, 1, 0, 0, 1, 0, 0, 1, 0],
								[0, 0, 1, 0, 0, 1, 0, 0, 1],
								[2]];
	boxBehnkenSeeds[hash(10)] = [[0, 1, 0, 0, 0, 1, 1, 0, 0, 1],
								[1, 1, 0, 0, 1, 0, 0, 0, 0, 1],
								[0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
								[0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
								[1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
								[0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
								[1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
								[0, 0, 1, 0, 1, 0, 1, 0, 1, 0],
								[1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
								[0, 0, 0, 1, 1, 1, 0, 1, 0, 0],
								[10]];
	boxBehnkenSeeds[hash(11)] = [[0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1],
								[1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0],
								[0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1],
								[1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1],
								[1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1],
								[1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0],
								[0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0],
								[0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0],
								[0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1],
								[1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0],
								[0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0],
								[12]];			
	boxBehnkenSeeds[hash(12)] = [[1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
								[0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
								[0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0],
								[0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
								[0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0],
								[0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1],
								[1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0],
								[0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
								[1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
								[0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0],
								[0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1],
								[1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
								[12]];										

	function doeTemplate(name, designGrid, type, resolution, generators) {
		this.name = name;
		this.designGrid = designGrid;
		this.type = type;
		this.resolution = resolution;
		this.generators = generators;
		this.rangeGrid = [];
		this.rangeMaps = [];
		this.isEmpty = function() {
			return this.designGrid.length == 0;
		}
		this.isGridValid = function() {
			var k;
			for (k = 0; k < this.designGrid.length; k++) {
				if (this.designGrid[k].length == 0 || (k > 0 && this.designGrid[k].length != this.designGrid[k - 1].length)) {
					return false;
				} 
			} 
			return true;
		};
		if (!this.isEmpty() && this.isGridValid()) {
			var rangeHash;
			var i;
			for (i = 0; i < this.designGrid[0].length; i++) {
				this.rangeMaps[i] = {};
				this.rangeGrid[i] = [];
			}
			var k;
			for (k = 0; k < this.designGrid.length; k++) {
				for (i = 0; i < this.designGrid[k].length; i++) {
					rangeHash = hash(this.designGrid[k][i]);
					if (this.rangeMaps[i][rangeHash] == null) {
						this.rangeMaps[i][rangeHash] = 0;
						this.rangeGrid[i].push(this.designGrid[k][i]);
					}
				}
			}
			var j;
			for (i = 0; i < this.rangeGrid.length; i++) {
				this.rangeGrid[i].sort(function(a, b) {return a - b});
				for (j = 0; j < this.rangeGrid[i].length; j++) {
					this.rangeMaps[i][hash(this.rangeGrid[i][j])] = j;
				}
			}
		}
		this.isRangeValid = function(numsLevelsPerFactor) {
			var i;
			for (i = 0; i < this.rangeGrid.length; i++) {
				if (this.rangeGrid[i].length == 0) {
					return false;
				}
			}
			if (arguments.length > 0) {
				if (this.rangeGrid.length != numsLevelsPerFactor.length) {
					return false;
				} else {
					for (i = 0; i < this.rangeGrid.length; i++) {
						if (this.rangeGrid[i].length != numsLevelsPerFactor[i]) {
							return false;
						}
					}
				}
			}
			return true;
		};
		this.isRangeValidVsDesign = function(numsLevelsPerFactor) {
			var i;
			if (this.rangeGrid.length != numsLevelsPerFactor.length) {
				return false;
			} else {
				for (i = 0; i < this.rangeGrid.length; i++) {
					if (this.rangeGrid[i].length != numsLevelsPerFactor[i]) {
						return false;
					}
				}
			}
			return true;
		};
		this.isGridValidVsDesign = function(numFactors) {
			if (this.isEmpty()) {
				return false;
			} else {
				var k;
				for (k = 0; k < this.designGrid.length; k++) {
					if (this.designGrid[k].length != numFactors) {
						return false;
					}
				}
			}
			return true;
		};
		this.indexDesignVsRange = function(k, i) {
			return this.rangeMaps[i][hash(this.designGrid[k][i])];
		};
	}

	function doeTemplater() {
		this.doeTypes = {fullFactorial: "fullFactorial", fractionalFactorial: "fractionalFactorial", plackettBurman: "plackettBurman",
				boxBehnken: "boxBehnken"};
		this.makeFullFactorial = function(numsLevelsPerFactor) {
			var designGrid = [];
			if (numsLevelsPerFactor.length > 0) {
				var ranges = [];
				var numDesigns = 1;
				var i, j;
				for (i = 0; i < numsLevelsPerFactor.length; i++) {
					ranges.push([]);
					numDesigns *= numsLevelsPerFactor[i];
					if (numsLevelsPerFactor[i] == 1) {
						ranges[i].push(1);
					} else {
						for (j = -Math.floor(numsLevelsPerFactor[i]/2); j <= Math.floor(numsLevelsPerFactor[i]/2); j++) {
			  				if (j != 0 || numsLevelsPerFactor[i]%2 != 0) {
			  					ranges[i].push(j);
			  				}
			  			}
			  		}
		  		}
	  			
	  			var k;
	  			for (k = 0; k < numDesigns; k++) {
	  				designGrid.push([]);
	  			}
	  			var designsPerLevel = 1; 
	  			j = 0;
	  			for (i = 0; i < numsLevelsPerFactor.length; i++) {
	   				for (k = 0; k < numDesigns; k++) {
						designGrid[k].push(ranges[i][j]);
						if ((k + 1)%designsPerLevel == 0) {
	   						j++;
	   					}
	   					if (j == numsLevelsPerFactor[i]) {
	   						j = 0;
	   					}
	  				}
	  				designsPerLevel *= numsLevelsPerFactor[i];
	  			}
	  		}
	  		return new doeTemplate(this.makeFullFactorialName(numsLevelsPerFactor), designGrid, this.doeTypes.fullFactorial);
		};
		this.makeFullFactorialName = function(numsLevelsPerFactor) {
			var templateName;
			if (numsLevelsPerFactor.length > 0) {
	  			templateName = "Full Factorial (" + numsLevelsPerFactor.length + "x";
				var isLPFConstant = function(numsLevelsPerFactor) {
	  				for (i = 1; i < numsLevelsPerFactor.length; i++) {
		  				if (numsLevelsPerFactor[i] != numsLevelsPerFactor[i - 1]) {
		  					return false;
		  				}
		  			}
		  			return true;
	  			};
	  			if (isLPFConstant(numsLevelsPerFactor)) {
	  				templateName += numsLevelsPerFactor[0] + ")";
	  			} else {
	  				for (i = 0; i < numsLevelsPerFactor.length; i++) {
	  					templateName += numsLevelsPerFactor[i] + ",";
	  				}
	  				templateName = templateName.substring(0, templateName.length - 1) + ")";
	  			}
	  		} else {
	  			templateName = "Full Factorial (Any Size)";
	  		}
  			return templateName;
		};
		this.makeFractionalFactorial = function(numFactors, resolution) {
			var designGrid = [];
			if (numFactors > 0) {
				var calculateBaseFactors = function(numFactors, resolution, templater) {
					var numBaseFactors = resolution - 1;
					var calculateNumAliasedFactors = function(numBaseFactors, resolution) {
						var numAliasedFactors = 0;
						var i;
						for (i = resolution - 1; i <= numBaseFactors; i++) {
							numAliasedFactors += combinatorial(numBaseFactors, i);
						}
						return numAliasedFactors;
					};
					while (numBaseFactors + calculateNumAliasedFactors(numBaseFactors, resolution) < numFactors) {
						numBaseFactors++;
					}
					var baseFactors = [];
					var numsLevelsPerFactor = [];
					var i;
					for (i = 0; i < numBaseFactors; i++) {
						baseFactors[i] = [];
						numsLevelsPerFactor[i] = 2;
					}
					var fullFactorial = templater.makeFullFactorial(numsLevelsPerFactor);
					var k;
					for (k = 0; k < fullFactorial.designGrid.length; k++) {
						for (i = 0; i < fullFactorial.designGrid[k].length; i++) {
							baseFactors[i].push(fullFactorial.designGrid[k][i]);
						}
					}
					return baseFactors;
				};
				var baseFactors = calculateBaseFactors(numFactors, resolution, this);
				var aliasFactors = function(baseFactors, resolution) {
					var aliasFactorsHelper = function(baseFactors, aliasSize, start) {
						var aliasedFactors = []
						var generators = [];
						aliasSize--;
						var i;
						if (aliasSize > 0) {
							var aliasingResults;
							var r;
							for (i = start + 1; i < baseFactors.length; i++) {
								aliasingResults = aliasFactorsHelper(baseFactors, aliasSize, i);
								for (r = 0; r < aliasingResults.aliasedFactors.length; r++) {
									aliasedFactors.push(arrayProduct(baseFactors[i - 1], aliasingResults.aliasedFactors[r]));
									generators.push([i - 1].concat(aliasingResults.generators[r]));
								} 
							}
						} else {
							aliasedFactors = aliasedFactors.concat(baseFactors.slice(start));
							for (i = start; i < baseFactors.length; i++) {
								generators.push([i]);
							}
						}
						return {aliasedFactors: aliasedFactors, generators: generators};
					};
					var aliasedFactors = []
					var generators = [];
					var aliasSize;
					var aliasingResults;
					var i = baseFactors.length - 1;
					var g;
					for (aliasSize = resolution - 1; aliasSize <= baseFactors.length; aliasSize++) {
						aliasingResults = aliasFactorsHelper(baseFactors, aliasSize, 0);
						aliasedFactors = aliasedFactors.concat(aliasingResults.aliasedFactors);
						for (g = 0; g < aliasingResults.generators.length; g++) {
							i++;
							generators.push(aliasingResults.generators[g].concat([i]));
						}
					}
					return {aliasedFactors: aliasedFactors, generators: generators};
				};
				var aliasingResults = aliasFactors(baseFactors, resolution);
				var designsByFactor = baseFactors.concat(aliasingResults.aliasedFactors);
				if (designsByFactor.length > numFactors) {
					designsByFactor = designsByFactor.slice(0, numFactors);
					aliasingResults.generators = aliasingResults.generators.slice(0, numFactors);
				}
				var i, k;
				for (k = 0; k < designsByFactor[0].length; k++) {
					designGrid.push([]);
				}
				for (i = 0; i < designsByFactor.length; i++) {
					for (k = 0; k < designsByFactor[i].length; k++) {
						designGrid[k].push(designsByFactor[i][k]);
					}
				}
				return new doeTemplate(this.makeFractionalFactorialName(numFactors, 2, resolution), designGrid, this.doeTypes.fractionalFactorial, 
						resolution, aliasingResults.generators);
			} else {
				return new doeTemplate(this.makeFractionalFactorialName(numFactors, 2, resolution), designGrid, this.doeTypes.fractionalFactorial, 
						resolution);
			}
			
		};
		this.makeFractionalFactorialName = function(numFactors, numLevelsPerFactor, resolution) {
			var templateName;
			if (numFactors > 0) {
				templateName = "Fractional Factorial (" + numFactors + "x" + numLevelsPerFactor + ")";
			} else {
				templateName = "Fractional Factorial (Nx2)";
			} 
			if (resolution == 3) {
				templateName += " III";
			} else if (resolution == 4) {
				templateName += " IV";
			} else if (resolution == 5) {
				templateName += " V";
			}
			return templateName;
		};
		this.makePlackettBurman = function(numFactors) {
			var designGrid = [];
			if (numFactors > 0 && numFactors < 24) {
				var numDesigns = numFactors + 1;
				while (numDesigns % 4 != 0) {
					numDesigns++;
				}
	  			designGrid.push([]);
	  			var pbSeed = plackettBurmanSeeds[hash(numDesigns)];
	  			var i;
	  			for (i = 0; i < pbSeed.length; i++) {
	  				designGrid[0].push(pbSeed[i]);
	  			}
	  			var k;
	  			for (k = 1; k < numDesigns - 1; k++) {
	  				designGrid.push([]);
	  				designGrid[k].push(designGrid[k - 1][pbSeed.length - 1]);
	  				for (i = 0; i < pbSeed.length - 1; i++) {
	  					designGrid[k].push(designGrid[k - 1][i]);
	  				}
	  			}
	  			designGrid.push([]);
	  			for (i = 0; i < pbSeed.length; i++) {
	  				designGrid[numDesigns - 1].push(-1);
	  			}
	  			if (numFactors < pbSeed.length) {
	  				var factorDifference = pbSeed.length - numFactors;
	  				for (k = 0; k < numDesigns; k++) {
	  					designGrid[k].splice(numFactors, factorDifference);
	  				}
	  			}
	  		}
  			return new doeTemplate(this.makePlackettBurmanName(numFactors), designGrid, this.doeTypes.plackettBurman);
		};
		this.makePlackettBurmanName = function(numFactors) {
			if (numFactors > 0) {
				return "Plackett Burman (" + numFactors + "x2)";
			} else {
				return "Plackett Burman (N<24x2)"
			}
		};
		this.makeBoxBehnken = function(numFactors) {
			var designGrid = [];
			if (numFactors > 2 && numFactors < 13 && numFactors != 8) {
				var bbSeed = boxBehnkenSeeds[hash(numFactors)];
				var numsLevelsPerFactor = [];
				var i;
				for (i = 0; i < bbSeed[0].length; i++) {
					if (bbSeed[0][i] == 1) {
						numsLevelsPerFactor.push(2);
					}
				}
				var fullFactorial = this.makeFullFactorial(numsLevelsPerFactor);
				var k = 0;
				var b, m, n;
				for (b = 0; b < bbSeed.length; b++) {
					if (bbSeed[b].length == 1) {
						for (m = 0; m < bbSeed[b][0]; m++) {
							designGrid.push([]);
							for (i = 0; i < numFactors; i++) {
								designGrid[k].push(0);
							}
							k++;
						}
					} else {
						for (m = 0; m < fullFactorial.designGrid.length; m++) {
							n = 0;
							designGrid.push([]);
							for (i = 0; i < bbSeed[b].length; i++) {
								if (bbSeed[b][i] == 1) {
									designGrid[k].push(fullFactorial.designGrid[m][n]);
									n++;
								} else {
									designGrid[k].push(bbSeed[b][i]);
								}
							}
							k++;
						}
					}
				}
			}
			return new doeTemplate(this.makeBoxBehnkenName(numFactors), designGrid, this.doeTypes.boxBehnken);		
		};
		this.makeBoxBehnkenName = function(numFactors) {
			if (numFactors > 0) {
				return "Box Behnken (" + numFactors + "x3)";
			} else {
				return "Box Behnken (2<N<13x3, N/=8)"
			}
		};
		this.parseTemplate = function(name, data) {
			var designGrid = [];
			var ranges = [];
			if (data != null) {
				var i, k;
				var minK;
				var minI = -1;
				var maxI = -1;
				for (k = 0; k < data.length; k++) {
					i = 0;
					while (minI < 0 && i < data[k].length) {
						if (i > 0 && !isNaN(data[k][i]) && data[k][i] !== ""
								&& !isNaN(data[k][i - 1]) && data[k][i - 1] !== "") {
							minI = i;
							minK = k;
						} else {
							i++;
						}
					}
					while (maxI < 0 && i < data[k].length) {
						if (!isNaN(data[k][i]) && data[k][i] !== ""
								&& (i + 1 == data[k].length || isNaN(data[k][i + 1]) || data[k][i + 1] === "")) {
							maxI = i;
						} else {
							i++;
						}
					}
					if (minI >= 0 && maxI >= minI && minI < data[k].length) {
						i = minI;
						designGrid.push([]);
						while (!isNaN(data[k][i]) && data[k][i] !== "" && i <= maxI) {
							designGrid[k - minK].push(data[k][i]);
							i++;
						}
					}
				}
			}
			return new doeTemplate(name, designGrid);
		};
		this.serializeTemplate = function(template) {
			var outputData = [[]];
			outputData[0].push(template.name);
			var i;
			for (i = 0; i < template.rangeGrid.length; i++) {
				outputData[0].push("Factor " + (i + 1));
			}
			var k;
			for (k = 0; k < template.designGrid.length; k++) {
				outputData.push([k + 1].concat(template.designGrid[k]));
			}
			if (template.generators != null) {
				outputData[0].push("Generators");
				var g;
				for (g = 0; g < template.generators.length; g++) {
					if (g + 1 == outputData.length) {
						outputData.push([]);
						for (i = 0; i < template.rangeGrid.length + 1; i++) {
							outputData[g + 1].push("");
						}
					}
					outputData[g + 1].push(template.generators[g].toString());
				}
			}
			return outputData;
		};
	}

	expressGrammar = {
		name: "Expression Grammar",
		variables: {TRANSCRIPTION: new variable("Transcription Strength"), TRANSLATION: new variable("Translation Strength"),
				EXPRESSION: new variable("Expression Strength"), TERMINATION: new variable("Termination Efficiency")},
		units: {REU: new units("REU")},
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
		}, inferVariable: function(mod) {
			if (mod.role === modRole.EXPRESSION) {
				return this.variables.EXPRESSION;
			} else if (mod.role === modRole.TRANSCRIPTION) {
				var feats = mod.getFeatures();
				if (feats.length == 1 && feats[0].role === featRole.TERMINATOR) {
					return this.variables.TERMINATION;
				} else {
					return this.variables.TRANSCRIPTION;
				}
			} else if (mod.role === modRole.TRANSLATION) {
				return this.variables.TRANSLATION;
			} else {
				return null;
			}
		}, inferUnits: function(varia) {
			if (varia == this.variables.EXPRESSION || varia == this.variables.TRANSCRIPTION || varia == this.variables.TRANSLATION) {
				return this.units.REU;
			} else if (varia == this.variables.TERMINATION) {
				return null;
			}
		}, schema: "org.clothocad.model.FunctionalGrammar"
	};

	var gridParser = {
		grammar: expressGrammar,
		parseDesign: function(data) {
			var bioDesigns = [];
			var inferredMod;
			var rowFeats = [];
			var i;
			for (i = 0; i < data.length; i++) {
				if (data[i].length > 0) {
					rowFeats[i] = this.parseFeature(data[i][0]);
					if (rowFeats[i] != null) {
						inferredMod = this.grammar.inferModule([rowFeats[i]]);
						if (inferredMod != null) {
							bioDesigns.push(new bioDesign(inferredMod, []));
						}
					}
				}
			}
			var colFeats = [];
			var j;
			for (j = 1; data.length > 0 && j < data[0].length; j++) {
				colFeats[j] = this.parseFeature(data[0][j]);
				if (colFeats[j] != null) {
					inferredMod = this.grammar.inferModule([colFeats[j]]);
					if (inferredMod != null) {
						bioDesigns.push(new bioDesign(inferredMod, []));
					}
				}
			}
			var parsedParam;
			for (i = 1; i < data.length; i++) {
				for (j = 1; j < data[i].length; j++) {
					if (rowFeats[i] != null && colFeats[j] != null) {
						inferredMod = this.grammar.inferModule([rowFeats[i], colFeats[j]]);
						if (inferredMod != null) {
							parsedParam = this.parseParameter(data[i][j], inferredMod);
							if (parsedParam != null) {
								bioDesigns.push(new bioDesign(inferredMod, parsedParam));
							}
						}
					}
				}
			}
			return bioDesigns;
		}, parseFeature: function(data) {
			if (data.length > 0) {
				var roleChar = data.charAt(0);
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
					return new feature(data.substring(1), parsedRole, new sequence(""));
				} else {
					return new feature(data, parsedRole, new sequence(""));
				}
			} else {
				return null;
			}
		}, parseParameter: function(data, mod) {
			if (!isNaN(data) && data !== "") {
				var inferredVaria = this.grammar.inferVariable(mod);
				if (inferredVaria != null) {
					var inferredUnits = this.grammar.inferUnits(inferredVaria);
					if (inferredUnits != null) {
						return [new parameter(data, inferredVaria, inferredUnits)];
					} else {
						return null;
					}
				} else {
					return null;
				}	
			} else {
				return null;
			}
		}
	};

	var tableParser = {
		grammar: expressGrammar,
		parseDesign: function(data) {
			var bioDesigns = [];
			if (data[0].length == 7
					&& data[0][0] === "Part" && data[0][1] === "Part Type" && data[0][2] === "Strength" 
					&& data[0][3] === "Strength_SD" && data[0][4] === "REU" && data[0][5] === "REU_SD"
					&& data[0][6] === "Part Sequence") {
				var i;
				var parsedFeat;
				var inferredMod;
				var parsedParam;
				for (i = 1; i < data.length; i++) {
					if (data[i].length > 1 && isNaN(data[i][0]) && data[i][0].length > 0
							&& isNaN(data[i][1]) && data[i][1].length > 0) {
						parsedFeat = this.parseFeature(data[i]);
						if (parsedFeat != null) {
							inferredMod = this.grammar.inferModule([parsedFeat]);
							if (inferredMod != null) {
								parsedParam = this.parseParameter(data[i], inferredMod);
								if (parsedParam != null) {
									bioDesigns.push(new bioDesign(inferredMod, parsedParam));
								}
							}
						}
					}
				}
			}
			return bioDesigns;
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
					seq = new sequence("");
				}
				return new feature(data[0], parsedRole, seq);
			} else {
				return null;
			}
		}, parseParameter: function(data, mod) {
			var inferredVaria = this.grammar.inferVariable(mod);
			if (inferredVaria != null) {
				if (!isNaN(data[2]) && data[2] !== "") {
					return [new unitlessParameter(data[2], inferredVaria)];
				} else if (!isNaN(data[4]) && data[4] !== "") {
					var inferredUnits = this.grammar.inferUnits(inferredVaria);
					if (inferredUnits != null) {
						return [new parameter(data[4], inferredVaria, inferredUnits)];
					} else {
						return null;
					}
				} else {
					return null;
				}
			} else {
				return null;
			}
		}
	};

	$scope.lNodes = [];
	$scope.fNodes = [];
	$scope.fldNodes = [];

	$scope.uploadSelector = "0";
	$scope.bioDesignParsers = [gridParser, tableParser];
	$scope.feats = [];
	$scope.featNameDict = {};
	$scope.numFeatsUploaded;
	$scope.numModsUploaded;
	$scope.isNumUploadsShown = false;

	$scope.minTarget = 0;
	$scope.maxTarget = 1000000;

	$scope.assignmentCost = 0;
	$scope.levelMatchCost = 0;
	$scope.homologyCost = 0;
	$scope.reuseCost = 0;

	$scope.defaultIsTemplateAssignment = true;
	$scope.isTemplateAssignment = $scope.defaultIsTemplateAssignment;

	$scope.defaultIsAssignmentExhaustive = false;
	$scope.isAssignmentExhaustive = $scope.defaultIsAssignmentExhaustive;

	$scope.defaultTimeout = 0;
	$scope.timeout = $scope.defaultTimeout;

	$scope.defaultAnnealingOptions = {numAnnealings: 100, iterPerAnnealing: 100, initialTemp: 1000};
	$scope.annealingOptions = {numAnnealings: $scope.defaultAnnealingOptions.numAnnealings, iterPerAnnealing: $scope.defaultAnnealingOptions.iterPerAnnealing, 
			initialTemp: $scope.defaultAnnealingOptions.initialTemp};

	$scope.defaultWeights = {levelMatch: 1, homology: 1, reuse: 1};
	$scope.weights = {levelMatch: $scope.defaultWeights.levelMatch, homology: $scope.defaultWeights.levelMatch, reuse: $scope.defaultWeights.levelMatch};

	$scope.defaultClusteringOptions = {numClusterings: 10, autoTarget: true};
	$scope.clusteringOptions = {numClusterings: $scope.defaultClusteringOptions.numClusterings, autoTarget: $scope.defaultClusteringOptions.autoTarget};

	$scope.doeTemplater = new doeTemplater();
	$scope.doeTemplates = [$scope.doeTemplater.makeBoxBehnken(0), 
			$scope.doeTemplater.makeFractionalFactorial(0, 3),
			$scope.doeTemplater.makeFractionalFactorial(0, 4), 
			$scope.doeTemplater.makeFractionalFactorial(0, 5),
			$scope.doeTemplater.makeFullFactorial([]),
			$scope.doeTemplater.makePlackettBurman(0)];
	$scope.defaultSelectedTemplate = $scope.doeTemplates[4];
	$scope.isTemplateSelectAShown = $scope.defaultIsTemplateAssignment;
	$scope.isTemplateSelectADisabled = false;

	$scope.defaultNumLevelsPerFactor = 2;
	$scope.numLevelsPerFactor = $scope.defaultNumLevelsPerFactor;
	$scope.minLevelsPerFactor = 1;
	$scope.maxLevelsPerFactor = 100;
	$scope.numLevelsPerFactorStep = 1;
	$scope.isNumLevelsPerFactorShown = ($scope.defaultIsTemplateAssignment && $scope.defaultSelectedTemplate.isEmpty() 
			&& $scope.defaultSelectedTemplate.type === $scope.doeTemplater.doeTypes.fullFactorial) || $scope.defaultClusteringOptions.autoTarget;

	$scope.isAssigning = false;
	$scope.assignmentCount = 0;
	$scope.assignmentTime = 0;

	$scope.addFeatures = function(size, flNode) {
	    var modalInstance = $modal.open({
	    	templateUrl: 'featureWindow.html',
	    	controller: 'featureWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {flNode: flNode, features: $scope.feats};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(feats) {
	    	flNode.bioDesign.module = expressGrammar.inferModule(feats);
	    	flNode.bioDesign.constructNameFromFeatures();
	    });
	};

	$scope.toggleConstraint = function(lNode) {
		if (lNode.isConstraint) {
			lNode.isConstraint = false;
			lNode.constraintIcon = "glyphicon glyphicon-star-empty";
			lNode.constraintColor = "pull-right btn btn-default btn-xs";
		} else {
			lNode.isConstraint = true;
			lNode.constraintIcon = "glyphicon glyphicon-star";
			lNode.constraintColor = "pull-right btn btn-success btn-xs";
		}
	};

	$scope.moveToTop = function(flNode) {
		var nodeIndex;
		if (flNode.isFNode) {
			nodeIndex = $scope.fNodes.indexOf(flNode);
			$scope.fNodes.splice(nodeIndex, 1);
			$scope.fNodes.unshift(flNode);
		} else {
			nodeIndex = $scope.lNodes.indexOf(flNode);
			$scope.lNodes.splice(nodeIndex, 1);
			$scope.lNodes.unshift(flNode);
		}
	}; 

	$scope.viewTargets = function(size, fNode) {
		var modalInstance = $modal.open({
	    	templateUrl: 'targetWindow.html',
	    	controller: 'targetWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {fNodes: $scope.fldNodes, levelTargets: fNode.levelTargets, autoTarget: $scope.clusteringOptions.autoTarget, 
		          			isAssigning: $scope.isAssigning, minTarget: $scope.minTarget, maxTarget: $scope.maxTarget};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(levelTargets) {
	    	fNode.levelTargets = levelTargets;
	    });
	};

	$scope.editAssignmentOptions = function(size) {
	    var modalInstance = $modal.open({
	    	templateUrl: 'assignmentWindow.html',
	    	controller: 'assignmentWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {isAssigning: $scope.isAssigning, 
	          				isTemplateAssignment: $scope.isTemplateAssignment, defaultIsTemplateAssignment: $scope.defaultIsTemplateAssignment,
		          			isAssignmentExhaustive: $scope.isAssignmentExhaustive, defaultIsAssignmentExhaustive: $scope.defaultIsAssignmentExhaustive,
		          			timeout: $scope.timeout, defaultTimeout: $scope.defaultTimeout,
		          			annealingOptions: $scope.annealingOptions, defaultAnnealingOptions: $scope.defaultAnnealingOptions,  
			          		weights: $scope.weights, defaultWeights: $scope.defaultWeights, 
			          		clusteringOptions: $scope.clusteringOptions, defaultClusteringOptions: $scope.defaultClusteringOptions};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(items) {
	    	$scope.isTemplateAssignment = items.isTemplateAssignment;
	    	$scope.isAssignmentExhaustive = items.isAssignmentExhaustive;
	    	$scope.timeout = items.timeout;
	    	$scope.annealingOptions = items.annealingOptions;
	    	$scope.weights = items.weights;
	    	$scope.clusteringOptions = items.clusteringOptions;
	    	var i;
			for (i = 0; i < $scope.fldNodes.length; i++) {
		    	if (!$scope.clusteringOptions.autoTarget) {
					$scope.fldNodes[i].isTargetShown = true;
				} else if (!$scope.isAssigning) {
					$scope.fldNodes[i].isTargetShown = false;
				}
			}
			if ($scope.isTemplateAssignment) {
				if ($scope.selectedTemplateA.isEmpty() 
			  			&& $scope.selectedTemplateA.type === $scope.doeTemplater.doeTypes.fullFactorial) {
					$scope.isNumLevelsPerFactorShown = true;
				} else {
					$scope.isNumLevelsPerFactorShown = false;
				}
				$scope.isTemplateSelectAShown = true;
			} else {
				$scope.isNumLevelsPerFactorShown = $scope.clusteringOptions.autoTarget;
				$scope.isTemplateSelectAShown = false;
			}
	    });
	};

	alertUser = function(size, alertType, alertMessage) {
	    var modalInstance = $modal.open({
	    	templateUrl: 'alertWindow.html',
	    	controller: 'alertWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {alertType: alertType, alertMessage: alertMessage};
	        	}
	      	}
	    });
	};

    $scope.fldTreeOptions = {
    	accept: function(sourceNodeScope, destNodesScope, destIndex) {
    		if (sourceNodeScope.$modelValue.isFNode) {
    			return destNodesScope.maxDepth == 0;
      		} else {
      			return destNodesScope.maxDepth == 1 
			      		&& (!$scope.isAssigning 
			      		|| destNodesScope.$id === sourceNodeScope.$parentNodesScope.$id);
      		}
    	}
  	};

  	$scope.flTreeOptions = {
    	accept: function(sourceNodeScope, destNodesScope, destIndex) {
    		return destNodesScope.$id === sourceNodeScope.$parentNodesScope.$id;
    	},
    	beforeDrop: function(event) {
    		if (event.dest.nodesScope.$id !== event.source.nodesScope.$id) {
    			var nodeCopy = event.source.nodeScope.$modelValue.copy();
    			if (event.source.nodeScope.$modelValue.isFNode) {
	    			if (!$scope.clusteringOptions.autoTarget) {
		    			event.source.nodeScope.$modelValue.isTargetShown = true;
		    		}
		    	} else {
		    		event.source.nodeScope.$modelValue.isConstraintShown = true;
		    	}
		    	event.source.nodeScope.$modelValue.isMoveTopShown = false;
	    		if (event.dest.nodesScope.$nodeScope) {
	    			event.dest.nodesScope.$nodeScope.$modelValue.isToggleShown = true;
	    		}
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, nodeCopy);
    		}
    	}
  	};

  	$scope.removeFLNode = function(flNode) {
  		if (flNode.$nodeScope.$parentNodeScope != null && flNode.$nodeScope.$parentNodesScope.$modelValue.length - 1 == 0) {
  			flNode.$nodeScope.$parentNodeScope.$modelValue.isToggleShown = false;
  		}
  		flNode.remove();
  	}

  	$scope.changeTemplate = function() {
  			if ($scope.selectedTemplateA.isEmpty() 
		  			&& $scope.selectedTemplateA.type === $scope.doeTemplater.doeTypes.fullFactorial) {
  				$scope.isNumLevelsPerFactorShown = true;
  			} else {
  				$scope.isNumLevelsPerFactorShown = false;
  			}
  			$scope.selectedTemplateB = $scope.selectedTemplateA;
  	};

  	$scope.downloadAssignment = function() {
  		var makeOutputData = function(fNodes, assignmentCount, assignmentTime, weights, solnCost, isAssignmentExhaustive) {
			var outputData = [[]];
			var i, j, t;
			for (i = 0; i < fNodes.length; i++) {
  				outputData[0].push(fNodes[i].bioDesign.name);
  				outputData[0].push(fNodes[i].bioDesign.name + " Levels");
  				outputData[0].push(fNodes[i].bioDesign.name + " Level Targets");
  				fNodes[i].children.sort(function(a, b) {return a.parameter.value - b.parameter.value});
  				fNodes[i].levelTargets.sort(function(a, b) {return a - b});
  				for (j = 0; j < fNodes[i].children.length; j++) {
  					if (!outputData[j + 1]) {
  						outputData[j + 1] = [];
  					}
  					outputData[j + 1].push(fNodes[i].children[j].bioDesign.name);
  					outputData[j + 1].push(fNodes[i].children[j].parameter.value);
  				}
  				for (t = 0; t < fNodes[i].levelTargets.length; t++) {
  					outputData[t + 1].push(fNodes[i].levelTargets[t]);
  				}
  			}
  			if (isAssignmentExhaustive) {
				outputData[0].push("# of Pretrials");
			} else {
				outputData[0].push("# of Trials");
			}
		    outputData[0].push("Assignment Time (min)");
	        outputData[0].push("Level Matching Weight");
	        outputData[0].push("Pathway Homology Weight");
	        outputData[0].push("Feature Reuse Weight");
	        outputData[0].push("Level Matching Cost");
	        outputData[0].push("Pathway Homology Cost");
	        outputData[0].push("Feature Reuse Cost");
	        outputData[0].push("Total Assignment Cost");
	        outputData[0].push("Weighted Total Assignment Cost");
	        outputData[1].push(assignmentCount);
	        outputData[1].push(assignmentTime);
	        outputData[1].push(weights.levelMatch);
	        outputData[1].push(weights.homology);
	        outputData[1].push(weights.reuse);
	        outputData[1].push(solnCost.levelMatch);
	        outputData[1].push(solnCost.homology);
	        outputData[1].push(solnCost.reuse);
	        outputData[1].push(solnCost.total);
	        outputData[1].push(solnCost.weightedTotal);
	        return outputData;
		};
  		if (!$scope.areFLDNodesValid() || !$scope.areFLNodesValid()) {
  			return [[]];
  		} else if ($scope.isAssigning) {
  			if ($scope.isAssignmentExhaustive) {
  				return makeOutputData($scope.fldNodes, $scope.annealingOptions.numAnnealings, $scope.assignmentTime, 
		  				$scope.weights, $scope.bestSolnCost, $scope.isAssignmentExhaustive);
  			} else {
	  			return makeOutputData($scope.fldNodes, $scope.assignmentCount, $scope.assignmentTime, 
	  					$scope.weights, $scope.bestSolnCost, $scope.isAssignmentExhaustive);
	  		}
		} else {
			$scope.reconcileFLNodes();
			var clusterer = new lClusterer();
			var clusterGrid; 
			if ($scope.clusteringOptions.autoTarget) {
				var numsClusters = [];
  				for (i = 0; i < $scope.fldNodes.length; i++) {
  					numsClusters[i] = $scope.fldNodes[i].children.length;
  				}
  				clusterGrid = clusterer.lfMeansCluster($scope.fldNodes, $scope.lNodes, numsClusters, 
						$scope.clusteringOptions.numClusterings);
  				for (i = 0; i < clusterGrid.length; i++) {
					$scope.fldNodes[i].levelTargets = [];
					for (j = 0; j < clusterGrid[i].length; j++) {
						$scope.fldNodes[i].levelTargets[j] = parseFloat(clusterGrid[i][j].target.toFixed(2));
					}
				}
  			}
  			var constraintRecord = {};
			var i, j;
			for (i = 0; i < $scope.fldNodes.length; i++) { 
				for (j = 0; j < $scope.fldNodes[i].children.length; j++) {
					if ($scope.fldNodes[i].children[j].isConstraint) {
						constraintRecord[hash($scope.fldNodes[i].children[j])] = true;
					} else {
						$scope.fldNodes[i].children[j].isConstraint = true;
					}
				}
			} 
  			clusterGrid = clusterer.targetedCluster($scope.fldNodes, $scope.lNodes);
  			for (i = 0; i < $scope.fldNodes.length; i++) { 
				for (j = 0; j < $scope.fldNodes[i].children.length; j++) {
					if (!constraintRecord[hash($scope.fldNodes[i].children[j])]) {
						$scope.fldNodes[i].children[j].isConstraint = false;
					}
				}
			}
			var validateClusterGrid = function(clusterGrid) {
				var invalidClusters = [];
				var i, j;
				for (i = 0; i < clusterGrid.length; i++) {
					for (j = 0; j < clusterGrid[i].length; j++) {
						if (clusterGrid[i][j].isEmpty()) {
							invalidClusters.push(clusterGrid[i][j]);
						}
					}
				}
				if (invalidClusters.length > 0) {
					var clusterErrorMessage = "";
					for (j = 0; j < invalidClusters.length; j++) {
						clusterErrorMessage += ", " + invalidClusters[j].target.toFixed(2);
					}
					clusterErrorMessage = clusterErrorMessage.substring(2);
					clusterErrorMessage += "<br><br>There are no available levels that cluster around the above targets. Change these targets or upload additional "
							+ "features with parameters that are close to them in magnitude.";
					alertUser("md", "Error", clusterErrorMessage);
					return false;
				} else {
					return true;
				}
			};
  			if (validateClusterGrid(clusterGrid)) {
  				var soln = new flSolution(clusterGrid);
  				for (i = 0; i < $scope.fldNodes.length; i++) {
					$scope.fldNodes[i].children = [];
				}
  				var k;
  				for (i = 0; i < soln.levelSelections.length; i++) {
					for (j = 0; j < soln.levelSelections[i].length; j++) {
						k = soln.levelSelections[i][j];
						$scope.fldNodes[i].children[j] = soln.clusterGrid[i][j].lNodes[k];
					}
				}
  				return makeOutputData($scope.fldNodes, 0, 0, $scope.weights, soln.calculateCost($scope.weights), 
	  					$scope.isAssignmentExhaustive);
  			} else {
  				return [[]];
  			}
		}
  	};

  	$scope.generateDesigns = function() {
  		var outputData = [[]];
  		if ($scope.areFLDNodesValid() && $scope.areFLNodesValid() && $scope.loadSelectedTemplate(true)) {
  			for (i = 0; i < $scope.fldNodes.length; i++) {
  				outputData[0].push($scope.fldNodes[i].bioDesign.name);
  				$scope.fldNodes[i].children.sort(function(a, b) {return a.parameter.value - b.parameter.value});
  			}
  			var j, k;
  			for (k = 0; k < $scope.selectedTemplateB.designGrid.length; k++) {
  				outputData.push([]);
  				for (i = 0; i < $scope.selectedTemplateB.designGrid[k].length; i++) {
  					j = $scope.selectedTemplateB.indexDesignVsRange(k, i);
  					outputData[k + 1].push($scope.fldNodes[i].children[j].bioDesign.name);
  				}
  			}
  		}
  		return outputData;
  	};

  	$scope.loadSelectedTemplate = function(isDownloading) {
  		var extractNumsLevelsPerFactorFromDesign = function(fNodes) {
  			var numsLevelsPerFactor = [];
  			var i;
			for (i = 0; i < fNodes.length; i++) {
  				numsLevelsPerFactor[i] = fNodes[i].children.length;
  			}
	  		return numsLevelsPerFactor;
  		};
  		var inferNumsLevelsPerFactorFromType = function(doeType, doeTemplater, numFactors, numLevelsPerFactor) {
  			var numsLevelsPerFactor = [];
  			var i;
  			if (doeType === doeTemplater.doeTypes.fullFactorial) { 
			  	for (i = 0; i < numFactors; i++) {
	  				numsLevelsPerFactor[i] = numLevelsPerFactor;
	  			}
	  		} else if (doeType === doeTemplater.doeTypes.fractionalFactorial
		  			|| doeType === doeTemplater.doeTypes.plackettBurman) {
	  			for (i = 0; i < numFactors; i++) {
	  				numsLevelsPerFactor[i] = 2;
	  			}
	  		} else if (doeType === doeTemplater.doeTypes.boxBehnken) {
	  			for (i = 0; i < numFactors; i++) {
	  				numsLevelsPerFactor[i] = 3;
	  			}
	  		} 
	  		return numsLevelsPerFactor;
  		};
  		var loadTemplate = function(metaTemplate, numFactors, numsLevelsPerFactor, doeTemplates, doeTemplater) {
  			var findTemplate = function(doeType, numFactors, numsLevelsPerFactor, doeTemplates) {
				var n;
	  			for (n = 0; n < doeTemplates.length; n++) {
	  				if (doeTemplates[n].type === doeType && doeTemplates[n].isGridValidVsDesign(numFactors) 
		  					&& doeTemplates[n].isRangeValidVsDesign(numsLevelsPerFactor)) {
	  					return n;
	  				}
	  			}
	  			return -1;
	  		};
	  		var makeTemplate = function(metaTemplate, numFactors, numsLevelsPerFactor, doeTemplater) {
	  			if (metaTemplate.type === doeTemplater.doeTypes.fullFactorial) { 
				  	return doeTemplater.makeFullFactorial(numsLevelsPerFactor);
		  		} else if (metaTemplate.type === doeTemplater.doeTypes.fractionalFactorial) {
		  			return doeTemplater.makeFractionalFactorial(numFactors, metaTemplate.resolution);
		  		} else if (metaTemplate.type === doeTemplater.doeTypes.plackettBurman) {
		  			return doeTemplater.makePlackettBurman(numFactors);
		  		} else if (metaTemplate.type === doeTemplater.doeTypes.boxBehnken) {
		  			return doeTemplater.makeBoxBehnken(numFactors);
		  		} else {
		  			return new doeTemplate("", []);
		  		}
	  		};
	  		var sortByName = function(a, b) {
				var name1 = a.name;
				var name2 = b.name;
				if (name1 < name2) {
					return -1;
				} else if (name1 > name2) {
					return 1;
				} else {
					return 0;
				}
			};
  			var n = findTemplate(metaTemplate.type, numFactors, numsLevelsPerFactor, doeTemplates);
			if (n < 0) {
				var doeTemplate = makeTemplate(metaTemplate, numFactors, numsLevelsPerFactor, doeTemplater);
				if (!doeTemplate.isEmpty()) {
					doeTemplates.push(doeTemplate);
					doeTemplates.sort(sortByName);
				}
				return doeTemplate;
			} else {
				return doeTemplates[n];
			}
  		};
  		var selectedTemplate;
  		var numsLevelsPerFactor;
  		if (isDownloading) {
  			selectedTemplate = $scope.selectedTemplateB;
  			numsLevelsPerFactor = extractNumsLevelsPerFactorFromDesign($scope.fldNodes);
  			if (selectedTemplate.isEmpty()) {
  				selectedTemplate = loadTemplate(selectedTemplate, $scope.fldNodes.length,
		  				numsLevelsPerFactor, $scope.doeTemplates, $scope.doeTemplater);
  			}
  		} else {
  			selectedTemplate = $scope.selectedTemplateA;
  			if (selectedTemplate.isEmpty()) {
				numsLevelsPerFactor = inferNumsLevelsPerFactorFromType(selectedTemplate.type, $scope.doeTemplater, 
	  					$scope.fldNodes.length, $scope.numLevelsPerFactor);
				selectedTemplate = loadTemplate(selectedTemplate, $scope.fldNodes.length,
			  			numsLevelsPerFactor, $scope.doeTemplates, $scope.doeTemplater);
			}
		}  	
	  	if (selectedTemplate.isGridValidVsDesign($scope.fldNodes.length)) {
		  	if (isDownloading) {
	  			if (selectedTemplate.isRangeValidVsDesign(numsLevelsPerFactor)) {
		  			$scope.selectedTemplateB = selectedTemplate;
		  			return true;
		  		} else {
		  			var errorMessage = "The ranges of values for each column in the DOE template are not equal in size to the numbers of levels for "
				  			+ "each factor in the factorial design. Upload or select a template that has columns containing ranges of ";
				  	for (i = 0; i < $scope.fldNodes.length; i++) {
				  		errorMessage += $scope.fldNodes[i].children.length + ", ";
				  	}
				  	errorMessage = errorMessage.substring(0, errorMessage.length - 2);
				  	errorMessage += " non-equal numbers."
		  			alertUser("md", "Error",  errorMessage);
		  			return false;
		  		}
	  		} else {
	  			$scope.selectedTemplateA = selectedTemplate;
	  			$scope.selectedTemplateB = selectedTemplate;
	  			return true;
	  		}
  		} else {
  			alertUser("md", "Error", "The lengths of rows in the DOE template are not equal to the number of factors in the factorial design. "
  					+ "Upload or select a template that has rows of length " + $scope.fldNodes.length + ".");
  			return false;
  		}
  	};

  	$scope.uploadTemplate = function() {
  		if ($scope.templateFiles == null || $scope.templateFiles.length == 0) {
			alertUser("md", "Warning", "No file selected. Browse and select a DOE template file (.csv) to upload.");
		} else if ($scope.templateFiles[0].name.length < 4 || $scope.templateFiles[0].name.substring($scope.templateFiles[0].name.length - 4) !== ".csv") {
			alertUser("md", "Error", "Selected file lacks the .csv file extension. Browse and select a DOE template file (.csv) to upload.");
		} else {
			Papa.parse($scope.templateFiles[0], {dynamicTyping: true, 
				complete: function(results) {
					if (results.data.length == 0) {
						alertUser("md", "Error", "DOE template file contains no data. Browse and select a new DOE template file (.csv) to upload.");
					} else {
						var template = $scope.doeTemplater.parseTemplate($scope.templateFiles[0].name.substring(0, $scope.templateFiles[0].name.length - 4), 
								results.data);
						if (template.isEmpty()) {
							alertUser("md", "Error", "Failed to parse DOE template file. Check file format.");
						} else if (!template.isGridValid()) {
							alertUser("md", "Error", "DOE template is not a grid. Upload template that contains rows of equal length.");
						} else if (!template.isRangeValid()) {
							alertUser("md", "Error", "DOE template has an invalid range. Upload template that has a range of at least two non-equal numbers "
									+ "per column.");
						} else {
							$scope.doeTemplates.push(template);
							if (!$scope.isAssigning) {
								$scope.selectedTemplateA = template;
							}
							$scope.selectedTemplateB = template;		
							var sortByName = function(a, b) {
								var name1 = a.name;
								var name2 = b.name;
								if (name1 < name2) {
									return -1;
								} else if (name1 > name2) {
									return 1;
								} else {
									return 0;
								}
							};
					  		$scope.doeTemplates.sort(sortByName);
							$scope.$apply();
						}
					}
				}
			});
		}
  	};

	$scope.uploadFeatures = function() {
		var allCSVFiles = function(files) {
			var i;
			for (i = 0; i < files.length; i++) {
				if (files[i].name.substring(files[i].name.length - 4) !== ".csv") {
					return false;
				}
			}
			return true;
		}
		var parseFile = function(results) {
			if (results.data.length == 0) {
				alertUser("md", "Error", $scope.featFiles[this.i].name + " contains no data. Browse and select a new feature file (.csv) to upload.");
			} else {
				var bioDesignParser = $scope.bioDesignParsers[$scope.uploadSelector];
				var bioDesigns = bioDesignParser.parseDesign(results.data);
				if (bioDesigns.length == 0) {
					alertUser("md", "Error", "Failed to parse contents of " + $scope.featFiles[this.i].name + ". Check file format.");
				} else {
					var isCodedExpression = function(bioDesign) {
						if ('module' in bioDesign) { 
							if (bioDesign.module.role === modRole.EXPRESSION) {
								var feats = bioDesign.module.getFeatures();
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
					var isParameterizedExpression = function(bioDesign) {
						if ('module' in bioDesign && 'parameters' in bioDesign) { 
							var inferredVaria = expressGrammar.inferVariable(bioDesign.module);
							if (inferredVaria == null) {
								return -1;
							} else {
								var i = 0;
								while (i < bioDesign.parameters.length) {
									if (bioDesign.parameters[i].variable.name === inferredVaria.name) {
										return i;
									} else {
										i++;
									}
								}
								return -1;
							}
						} else {
							return -1;
						}
					};
					var i, j;
					var feats;
					for (i = 0; i < bioDesigns.length; i++) {
						if (isCodedExpression(bioDesigns[i])) {
							$scope.fNodes.push(new fNode(bioDesigns[i]));
							$scope.numModsUploaded++;
						} else {
							j = isParameterizedExpression(bioDesigns[i]);
							if (j >= 0) {
								$scope.lNodes.push(new lNode(bioDesigns[i], j));
								$scope.numModsUploaded++;
							} 
						}
						feats = bioDesigns[i].module.getFeatures();
						for (j = 0; j < feats.length; j++) {
							if ($scope.featNameDict[hash(feats[j])] == null) {
								$scope.featNameDict[hash(feats[j])] = true;
								$scope.feats.push(feats[j]);
								$scope.numFeatsUploaded++;
							}
						}
					}
					$scope.fNodes.sort(function(a, b) {
						var nameA = a.bioDesign.module.name;
						var nameB = b.bioDesign.module.name;
						if (nameA < nameB) {
							return -1;
						} else if (nameA > nameB) {
							return 1;
						} else {
							return 0;
						}
					});
					$scope.lNodes.sort(function(a, b) {return a.parameter.value - b.parameter.value});
					if ($scope.lNodes.length > 0) {
						$scope.minTarget = Math.floor($scope.lNodes[0].parameter.value);
						$scope.maxTarget = Math.ceil($scope.lNodes[$scope.lNodes.length - 1].parameter.value);
					}
					$scope.$apply();
				}
			}
		};
		if ($scope.featFiles == null) {
			alertUser("md", "Warning", "No files selected. Browse and select one or more feature files (.csv) to upload.");
		} else if (!allCSVFiles($scope.featFiles)) {
			alertUser("md", "Error", "One or more of selected files lack the .csv file extension. Browse and select feature files (.csv) to upload.");
		} else {
			$scope.numFeatsUploaded = 0;
			$scope.numModsUploaded = 0;
			var i;
	    	for (i = 0; i < $scope.featFiles.length; i++) {
	    		Papa.parse($scope.featFiles[i], 
	    			{i: i, dynamicTyping: true, complete: parseFile});
	    	}
	    	$scope.isNumUploadsShown = true;
		}
    };

  //   $scope.testAssign3 = function() {
  //   	var numFactors = [7];
		// var numLevels = [2];
		// var boundCosts = [];
		// var boundTimes = [];
		// var n;
		// for (n = 0; n < numFactors.length; n++) {
		// 	boundCosts[n] = [];
		// 	boundTimes[n] = [];
		// }
		// var fNodes = [];
		// var i;
		// for (i = 0; i < numFactors[0] - 1; i++) {
		// 	fNodes[i] = new fNode(new bioDesign());
		// }
		// var clusterer = new lClusterer();
		// var clusterGrid;
		// var solver = new flSolver();
		// var boundSoln;
		// var m;
		// for (n = 0; n < numFactors.length; n++) {
		// 	fNodes.push(new fNode(new bioDesign()));
		// 	for (m = 0; m < numLevels.length; m++) {
	 //    		clusterGrid = clusterer.lfMeansCluster(fNodes, $scope.lNodes, numLevels[m], 
		// 			$scope.clusteringOptions.numClusterings);
	 //    		var timer = new Timer();
  //   			boundSoln = solver.boundSolve(clusterGrid, $scope.annealingOptions, $scope.weights, timer);
  //   			boundTimes[n].push(timer.getElapsedTime());
  //   			boundCosts[n].push(boundSoln.calculateCost($scope.weights));
	 //    	}
	 //    }
		// console.log("bound");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + boundCosts[n][m].total + ", levelMatch = " 
		// 			+ boundCosts[n][m].levelMatch + ", homology = " + boundCosts[n][m].homology + ", reuse = " + boundCosts[n][m].reuse
		// 			+ ", time = " + boundTimes[n][m]);
		// 	}
		// }
  //   };

  //   $scope.testAssign = function(fNodes, lNodes, numDesignFactors, numLevelsPerDesignFactor, clusteringOptions, annealingOptions, numTrials) {
  //   	numDesignFactors.sort(function(a, b){return b.value - a.value});
  //   	if (fNodes.length < numDesignFactors[0]) {
		// 		throw "Number of available factors is less than largest number of design factors to be tested.";
		// } else {
		// 	var clusterer = new lClusterer();
		// 	var clusterGrid;
		// 	var m, n, i, j;
		// 	for (m = 0; m < numDesignFactors.length; m++) {
		// 		for (n = 0; n < numLevelsPerDesignFactor.length; n++) {
		// 			if (!clusteringOptions.autoTarget || validateLevelsPerFactor(lNodes, numLevelsPerDesignFactor[n])) {
		// 				if (clusteringOptions.autoTarget) {
		// 					clusterGrid = clusterer.lfMeansCluster(fNodes, lNodes, numLevelsPerDesignFactor[n], 
		// 							clusteringOptions.numClusterings);
		// 				} else {
		// 					clusterGrid = clusterer.targetedCluster(fNodes, lNodes);
		// 				}
		// 				if (validateClusterGrid(clusterGrid)) {
		// 					if (clusteringOptions.autoTarget) {
		// 						for (i = 0; i < clusterGrid.length; i++) {
		// 							fNodes[i].levelTargets = [];
		// 							for (j = 0; j < clusterGrid[i].length; j++) {
		// 								fNodes[i].levelTargets[j] = parseFloat(clusterGrid[i][j].target.toFixed(2));
		// 							}
		// 						}
		// 					}
							
		// 				}
		// 			}
		// 		}
		// 	}
		// }
  //   };

  //   $scope.testAssign2 = function() {
		// var gTotal = 100;
		// var numFactors = [5, 6, 7, 8, 9];
		// var numLevels = [2, 3, 4, 5];
		// var randomCosts = [];
		// var annealCosts = [];
		// var comparedCosts = [];
		// var randomTimes = [];
		// var annealTimes = [];
		// var n, m;
		// for (n = 0; n < numFactors.length; n++) {
		// 		randomCosts[n] = [];
		// 		annealCosts[n] = [];
		// 		comparedCosts[n] = [];
		// 		annealTimes[n] = [];
		// 		randomTimes[n] = [];
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		randomCosts[n][m] = [];
		// 		annealCosts[n][m] = [];
		// 		comparedCosts[n][m] = [];
		// 		annealTimes[n][m] = [];
		// 		randomTimes[n][m] = [];
		// 	}
		// }
		// var fNodes = [];
		// var i;
		// for (i = 0; i < numFactors[0] - 1; i++) {
		// 	fNodes[i] = new fNode(new bioDesign());
		// }
 	// 	var clusterer = new lClusterer();
		// var clusterGrid;
		// var solver = new flSolver();
		// var randomSoln, annealSoln;
		// var timer;
		// var g;
		// for (n = 0; n < numFactors.length; n++) {
		// 	fNodes.push(new fNode(new bioDesign()));
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		clusterGrid = clusterer.lfMeansCluster(fNodes, $scope.lNodes, numLevels[m], 
		// 			$scope.clusteringOptions.numClusterings);
		// 		for (g = 0; g < gTotal; g++) {
		//     		timer = new Timer();
		//     		timer.startSec();
	 //    			randomSoln = solver.randomSolve(clusterGrid, $scope.weights, $scope.annealingOptions.numAnnealings, timer);
	 //    			randomTimes[n][m][g] = timer.getElapsedTimeSec();
	 //    			randomCosts[n][m][g] = randomSoln.calculateCost($scope.weights);
	 //    			timer = new Timer();
	 //    			timer.startSec();
		// 			annealSoln = solver.annealSolve(clusterGrid, $scope.annealingOptions, $scope.weights, timer);
		// 			annealTimes[n][m][g] = timer.getElapsedTimeSec();
		// 			annealCosts[n][m][g] = annealSoln.calculateCost($scope.weights);
		// 		}
	 //    	}
	 //    }
	 //    var randomTotal = [];
	 //    var randomLevelMatch = [];
	 //    var randomHomology = [];
	 //    var randomReuse = [];
	 //    var annealTotal = [];
	 //    var annealLevelMatch = [];
	 //    var annealHomology = [];
	 //    var annealReuse = [];
	 //    for (n = 0; n < numFactors.length; n++) {
	 //    	randomTotal[n] = [];
	 //    	randomLevelMatch[n] = [];
		//     randomHomology[n] = [];
		//     randomReuse[n] = [];
		//     annealTotal[n] = [];
		//     annealLevelMatch[n] = [];
		//     annealHomology[n] = [];
		//     annealReuse[n] = [];
	 //    	for (m = 0; m < numLevels.length; m++) {
	 //    		randomTotal[n][m] = [];
		//     	randomLevelMatch[n][m] = [];
		// 	    randomHomology[n][m] = [];
		// 	    randomReuse[n][m] = [];
		// 	    annealTotal[n][m] = [];
		// 	    annealLevelMatch[n][m] = [];
		// 	    annealHomology[n][m] = [];
		// 	    annealReuse[n][m] = [];
	 //    		for (g = 0; g < gTotal; g++) {
		//     		randomTotal[n][m][g] = randomCosts[n][m][g].total;
		// 	    	randomLevelMatch[n][m][g] = randomCosts[n][m][g].levelMatch;
		// 		    randomHomology[n][m][g] = randomCosts[n][m][g].homology;
		// 		    randomReuse[n][m][g] = randomCosts[n][m][g].reuse;
		// 		    annealTotal[n][m][g] = annealCosts[n][m][g].total;
		// 		    annealLevelMatch[n][m][g] = annealCosts[n][m][g].levelMatch;
		// 		    annealHomology[n][m][g] = annealCosts[n][m][g].homology;
		// 		    annealReuse[n][m][g] = annealCosts[n][m][g].reuse;
		// 		}
	 //    	}
	 //    }
	 //    for (n = 0; n < numFactors.length; n++) {
	 //    	for (m = 0; m < numLevels.length; m++) {
	 //    		randomTimes[n][m] = basicStats(randomTimes[n][m]);
	 //    		annealTimes[n][m] = basicStats(annealTimes[n][m]);
	 //    		randomTotal[n][m] = basicStats(randomTotal[n][m]);
		//     	randomLevelMatch[n][m] = basicStats(randomLevelMatch[n][m]);
		// 	    randomHomology[n][m] = basicStats(randomHomology[n][m]);
		// 	    randomReuse[n][m] = basicStats(randomReuse[n][m]);
		// 	    annealTotal[n][m] = basicStats(annealTotal[n][m]);
		// 	    annealLevelMatch[n][m] = basicStats(annealLevelMatch[n][m]);
		// 	    annealHomology[n][m] = basicStats(annealHomology[n][m]);
		// 	    annealReuse[n][m] = basicStats(annealReuse[n][m]);
	 //    	}
	 //    }
	 //    var comparedTotal = [];
	 //    var comparedLevelMatch = [];
	 //    var comparedHomology = [];
	 //    var comparedReuse = [];
	 //    for (n = 0; n < numFactors.length; n++) {
	 //    	comparedTotal[n] = [];
		//     comparedLevelMatch[n] = [];
		//     comparedHomology[n] = [];
		//     comparedReuse[n] = [];
	 //    	for (m = 0; m < numLevels.length; m++) {
	 //    		comparedTotal[n][m] = {mean: randomTotal[n][m].mean - annealTotal[n][m].mean, 
	 //    			stdDev: Math.sqrt(Math.pow(randomTotal[n][m].stdDev, 2) + Math.pow(annealTotal[n][m].stdDev, 2))};
		// 	    comparedLevelMatch[n][m] = {mean: randomLevelMatch[n][m].mean - annealLevelMatch[n][m].mean, 
	 //    			stdDev: Math.sqrt(Math.pow(randomLevelMatch[n][m].stdDev, 2) + Math.pow(annealLevelMatch[n][m].stdDev, 2))};
		// 	    comparedHomology[n][m] = {mean: randomHomology[n][m].mean - annealHomology[n][m].mean, 
	 //    			stdDev: Math.sqrt(Math.pow(randomHomology[n][m].stdDev, 2) + Math.pow(annealHomology[n][m].stdDev, 2))};
		// 	    comparedReuse[n][m] = {mean: randomReuse[n][m].mean - annealReuse[n][m].mean, 
	 //    			stdDev: Math.sqrt(Math.pow(randomReuse[n][m].stdDev, 2) + Math.pow(annealReuse[n][m].stdDev, 2))};
	 //    	}
	 //    }		 
		// console.log("compared");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + comparedTotal[n][m].mean + ", levelMatch = " 
		// 			+ comparedLevelMatch[n][m].mean + ", homology = " + comparedHomology[n][m].mean + ", reuse = " + comparedReuse[n][m].mean);
		// 	}
		// }
		// console.log("anneal");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + annealTotal[n][m].mean + ", levelMatch = " 
		// 			+ annealLevelMatch[n][m].mean + ", homology = " + annealHomology[n][m].mean + ", reuse = " + annealReuse[n][m].mean
		// 			+ ", time = " + annealTimes[n][m].mean);
		// 	}
		// }
		// console.log("random");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + randomTotal[n][m].mean + ", levelMatch = " 
		// 			+ randomLevelMatch[n][m].mean + ", homology = " + randomHomology[n][m].mean + ", reuse = " + randomReuse[n][m].mean
		// 			+ ", time = " + randomTimes[n][m].mean);
		// 	}
		// }
		// console.log("compared sd");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + comparedTotal[n][m].stdDev + ", levelMatch = " 
		// 			+ comparedLevelMatch[n][m].stdDev + ", homology = " + comparedHomology[n][m].stdDev + ", reuse = " + comparedReuse[n][m].stdDev);
		// 	}
		// }
		// console.log("anneal sd");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + annealTotal[n][m].stdDev + ", levelMatch = " 
		// 			+ annealLevelMatch[n][m].stdDev + ", homology = " + annealHomology[n][m].stdDev + ", reuse = " + annealReuse[n][m].stdDev
		// 			+ ", time = " + annealTimes[n][m].stdDev);
		// 	}
		// }
		// console.log("random sd");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + randomTotal[n][m].stdDev + ", levelMatch = " 
		// 			+ randomLevelMatch[n][m].stdDev + ", homology = " + randomHomology[n][m].stdDev + ", reuse = " + randomReuse[n][m].stdDev
		// 			+ ", time = " + randomTimes[n][m].stdDev);
		// 	}
		// }
		// console.log("anneal min");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + annealTotal[n][m].min);
		// 	}
		// }
		// console.log("random min");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + randomTotal[n][m].min);
		// 	}
		// }
  //   };

	$scope.assignLevels = function() {
		var isStarting = false;
		var clusterGrid;
		var i, j;
		if ($scope.isAssigning) {
			clusterGrid = $scope.bestSoln.clusterGrid;
		} else {
			if ($scope.clusteringOptions.autoTarget) {
				$scope.numLevelsPerFactor = validateNumericInput($scope.numLevelsPerFactor, $scope.minLevelsPerFactor, $scope.maxLevelsPerFactor, 
					$scope.numLevelsPerFactorStep, $scope.defaultNumLevelsPerFactor);
			}
			if ($scope.areFLDNodesValid() && (!$scope.clusteringOptions.autoTarget || $scope.areLNodesValid())
					&& (!$scope.isTemplateAssignment || $scope.loadSelectedTemplate(false))) {
				var clusterer = new lClusterer();
				if ($scope.isTemplateAssignment) {
					clusterGrid = clusterer.templateCluster($scope.fldNodes, $scope.lNodes, $scope.selectedTemplateA, 
							$scope.clusteringOptions.numClusterings);
				} else if ($scope.clusteringOptions.autoTarget) {
					clusterGrid = clusterer.lfMeansCluster($scope.fldNodes, $scope.lNodes, $scope.numLevelsPerFactor, 
							$scope.clusteringOptions.numClusterings);
				} else {
					clusterGrid = clusterer.targetedCluster($scope.fldNodes, $scope.lNodes);
				}
				var validateClusterGrid = function(clusterGrid) {
					var invalidClusters = [];
					var i, j;
					for (i = 0; i < clusterGrid.length; i++) {
						for (j = 0; j < clusterGrid[i].length; j++) {
							if (clusterGrid[i][j].isEmpty()) {
								invalidClusters.push(clusterGrid[i][j]);
							}
						}
					}
					if (invalidClusters.length > 0) {
						var clusterErrorMessage = "";
						for (j = 0; j < invalidClusters.length; j++) {
							clusterErrorMessage += ", " + invalidClusters[j].target.toFixed(2);
						}
						clusterErrorMessage = clusterErrorMessage.substring(2);
						clusterErrorMessage += "<br><br>There are no available levels that cluster around the above targets. Change these targets "
								+ "or upload additional features with parameters that are close to them in magnitude.";
						alertUser("md", "Error", clusterErrorMessage);
						return false;
					} else {
						return true;
					}
				};
				if (validateClusterGrid(clusterGrid)) {
					$scope.isAssigning = true;
					isStarting = true;
					if ($scope.clusteringOptions.autoTarget) {
						for (i = 0; i < clusterGrid.length; i++) {
							$scope.fldNodes[i].levelTargets = [];
							for (j = 0; j < clusterGrid[i].length; j++) {
								$scope.fldNodes[i].levelTargets[j] = parseFloat(clusterGrid[i][j].target.toFixed(2));
							}
							$scope.fldNodes[i].isTargetShown = true;
							$scope.fldNodes[i].isToggleShown = true;
						}
					}
					if ($scope.isTemplateAssignment) {
						$scope.isTemplateSelectADisabled = true;
						$scope.isNumLevelsPerFactorShown = false;
					}
				}
			}
		}
		if ($scope.isAssigning) {
			var solver = new flSolver();
			var soln;
			var timer = new Timer($scope.timeout);
			if ($scope.isAssignmentExhaustive) {
				if (isStarting) {
					soln = solver.boundSolve(clusterGrid, $scope.annealingOptions, $scope.weights, timer);
				} else {
					soln = solver.boundSolve(clusterGrid, $scope.annealingOptions, $scope.weights, timer, $scope.bestSoln.levelSelections);
				}
			} else {
				soln = solver.annealSolve(clusterGrid, $scope.annealingOptions, $scope.weights);
			}
			$scope.assignmentTime += timer.getElapsedTime();
			if (!$scope.isAssignmentExhaustive) {
				$scope.assignmentCount += $scope.annealingOptions.numAnnealings;
			}
			var solnCost = soln.calculateCost($scope.weights);
			if (isStarting || solnCost.weightedTotal <= $scope.bestSolnCost.weightedTotal) {
				$scope.bestSoln = soln;
				$scope.bestSolnCost = solnCost;
				for (i = 0; i < $scope.fldNodes.length; i++) {
					$scope.fldNodes[i].children = [];
				}
				var k;
				for (i = 0; i < $scope.bestSoln.levelSelections.length; i++) {
					for (j = 0; j < $scope.bestSoln.levelSelections[i].length; j++) {
						k = $scope.bestSoln.levelSelections[i][j];
						if ($scope.bestSoln.clusterGrid[i][j].lNodes[k].isConstraint) {
							$scope.fldNodes[i].children[j] = $scope.bestSoln.clusterGrid[i][j].lNodes[k];
						} else {
							$scope.fldNodes[i].children[j] = $scope.bestSoln.clusterGrid[i][j].lNodes[k].copy();
							$scope.fldNodes[i].children[j].isConstraintShown = true;
							$scope.fldNodes[i].children[j].isMoveTopShown = false;
						}
					}
				}
			}
		} 
	};

	$scope.quitAssigning = function() {
		$scope.isAssigning = false;
		if ($scope.isAssignmentExhaustive) {
			$scope.bestSoln.isOptimal = false;
		} else {
			$scope.assignmentCount = 0;
		}
		$scope.assignmentTime = 0;
		var i;
		for (i = 0; i < $scope.fldNodes.length; i++) {
			if ($scope.clusteringOptions.autoTarget) {
				$scope.fldNodes[i].isTargetShown = false;
			} else {
				$scope.fldNodes[i].isTargetShown = true;
			}
		}
		$scope.isTemplateSelectADisabled = false;
	};
});