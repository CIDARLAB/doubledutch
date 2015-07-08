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
		this.name = this.constructNameFromFeatures();
		this.parameters = params;
		this.schema = "org.clothocad.model.BioDesign";
		this.copy = function() {
			var bioDesignCopy = new bioDesign(mod, []);
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
		this.flType = 'f';
		this.depth = 1;
		this.labelColor = "color:#ffffff";
		this.backgroundColor = "background-color:#787878"
		this.parameter = new parameter(0, new variable(""), new units(""));
		this.levelTargets = [];
		this.displayTargets = "display:none";
		this.displayToggle = "display:none";
		this.children = [];
		this.copy = function() {
			return new fNode(this.bioDesign);
		};
	}

	function lNode(bioDesign, pIndex) {
		this.bioDesign = bioDesign;
		this.flType = 'l';
		this.depth = 2;
		this.labelColor = "";
		this.backgroundColor = ""
		this.parameter = bioDesign.parameters[pIndex];
		this.pIndex = pIndex;
		this.displayTargets = "display:none";
		this.displayToggle = "display:none";
		this.children = [];
		this.copy = function() {
			return new lNode(this.bioDesign, this.pIndex);
		};
	}

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
    			this.levelCosts.push(Math.abs(this.lNodes[i].parameter.value - this.target));
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
			if (this.lNodes.length > 0 && this.levelCosts.length == 0) {
				this.calculateLevelCosts();
			}
			for (i = 0; i < this.levelCosts.length; i++) {
				clusterCost += this.levelCosts[i];
			}
			return clusterCost;
		};
		this.isEmpty = function() {
			return this.lNodes.length == 0;
		}
	}

	function flSolution(clusterGrid) {
		this.numFactors = clusterGrid.length;
		this.levelsPerFactor = [];
		var i;
		for (i = 0; i < this.numFactors; i++) {
			this.levelsPerFactor.push(clusterGrid[i].length);
		}
		this.levelSelections = [];
	    var j;
		for (i = 0; i < this.numFactors; i++) {
			this.levelSelections.push([]);
			for (j = 0; j < this.levelsPerFactor[i]; j++) {
				this.levelSelections[i].push(0);
			}
		}
		this.clusterGrid = clusterGrid;
		this.calculateCost = function(weights) {
			var levelMatchCost = this.calculateLevelMatchCost();
			var homologyCost = this.calculateHomologyCost();
			var reuseCost = this.calculateReuseCost();
			return {weightedTotal: weights.levelMatch*levelMatchCost + weights.homology*homologyCost + weights.reuse*reuseCost, 
					total: levelMatchCost + homologyCost + reuseCost, levelMatch: levelMatchCost, homology: homologyCost, reuse: reuseCost};
		};
		this.calculateLevelMatchCost = function() {
			var levelMatchCost = 0;
			var normalizationFactor = 0;
			var i, j, k;
			for (i = 0; i < this.levelSelections.length; i++) {
				for (j = 0; j < this.levelSelections[i].length; j++) {
					k = this.levelSelections[i][j];
					levelMatchCost += this.clusterGrid[i][j].levelCosts[k];
				}
				normalizationFactor += this.levelsPerFactor[i];
			}
			levelMatchCost /= normalizationFactor;
			return levelMatchCost;
		};
		this.calculateReuseCost = function() {
			var reuseCost = 0;
			var i;
			for (i = 0; i < this.levelsPerFactor.length; i++) {
				if (this.levelsPerFactor[i] > 1) {
					reuseCost += (this.levelsPerFactor[i] - 1);
				}
			}
			if (reuseCost > 0) {
				var normalizationFactor = reuseCost;
				var featDict;
				var feats;
				var featHash;
				var j, k, m;
				for (i = 0; i < this.levelSelections.length; i++) {
					if (this.levelsPerFactor[i] > 1) {
						featDict = {};
						for (j = 0; j < this.levelSelections[i].length; j++) {
							k = this.levelSelections[i][j];
							feats = this.clusterGrid[i][j].lNodes[k].bioDesign.module.getFeatures();
							for (m = 0; m < feats.length; m++) {
								featHash = hash(feats[m]);
								if (featDict[featHash] == null) {
									featDict[featHash] = true;
								} else {
									reuseCost--;
								}
							}
						}
					}
				}
				reuseCost /= normalizationFactor;
			}
			return reuseCost;
		};
		this.calculateHomologyCost = function() {
			var homologyCost = 0;
			if (this.numFactors > 1) {
				var normalizationFactor = 0;
				var levelTotal = 0;
				var i;
				for (i = 0; i < this.levelsPerFactor.length; i++) {
					if (this.levelsPerFactor[i] > 1) {
						normalizationFactor -= combinatorial(this.levelsPerFactor[i], 2);
					}
					levelTotal += this.levelsPerFactor[i];
				}
				normalizationFactor += combinatorial(levelTotal, 2);
				var featDict = {};
	    		var feats;
	    		var featHash;
	    		var j, k, m, n;
	    		for (i = 0; i < this.levelSelections.length; i++) {
					for (j = 0; j < this.levelSelections[i].length; j++) {
						k = this.levelSelections[i][j];
		    			feats = this.clusterGrid[i][j].lNodes[k].bioDesign.module.getFeatures();
		    			for (m = 0; m < feats.length; m++) {
		    				featHash = hash(feats[m]);
		    				if (featDict[featHash] == null) {
		    					featDict[featHash] = [];
		    					for (n = 0; n < this.numFactors; n++) {
		    						featDict[featHash].push(0);
		    					}
		    				} else {
		    					for (n = 0; n < this.numFactors; n++) {
		    						if (n != i) {
		    							homologyCost += featDict[featHash][n];
		    						}
		    					}
		    				}
	    					featDict[featHash][i]++;
		    			}
		    		}
	    		}
	    		homologyCost /= normalizationFactor;
    		}
    		return homologyCost;
		};
		this.makeNodeDesign = function(fNodes) {
			var i;
			for (i = 0; i < fNodes.length; i++) {
				fNodes[i].children = [];
			}
			var j, k;
			for (i = 0; i < this.levelSelections.length; i++) {
				for (j = 0; j < this.levelSelections[i].length; j++) {
					k = this.levelSelections[i][j];
					fNodes[i].children.push(this.clusterGrid[i][j].lNodes[k]);
				}
			}
			return fNodes;
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
		this.randomSolve = function(clusterGrid, weights, numTrials) {
  			var soln;
  			var solnCost;
			var bestSoln = new flSolution(clusterGrid);
			var bestSolnCost = bestSoln.calculateCost(weights);
  			var trialCount = 0;
  			var i, j;
  			while (trialCount < numTrials) {
  				soln = new flSolution(clusterGrid);
	  			for (i = 0; i < soln.levelSelections.length; i++) {
	  				for (j = 0; j < soln.levelSelections[i].length; j++) {
	  					soln = this.mutateSolution(soln, i, j);
	  					solnCost = soln.calculateCost(weights);
	  				}
	  			}
	  			if (solnCost.weightedTotal < bestSoln.weightedTotal) {
	  				bestSoln = soln;
	  				bestSolnCost = solnCost;
	  			}
	  			trialCount++;
	  		}
    		return bestSoln;
    	};
    	this.mutateSolution = function(soln, i, j) {
    		var mutantSoln = soln.copy();
    		var k;
			do {
				k = Math.floor(Math.random()*mutantSoln.clusterGrid[i][j].lNodes.length);
			} while (k == mutantSoln.levelSelections[i][j]);
			mutantSoln.levelSelections[i][j] = k;
    		return mutantSoln;
    	};
    	this.annealSolve = function(clusterGrid, annealingOptions, weights) {
			var soln;
			var solnCost;
			var bestSoln = this.randomSolve(clusterGrid, weights, 1);
			var bestSolnCost = bestSoln.calculateCost(weights);
			var annealCount = 0;
			var temp;
			var phi = Math.pow(1/annealingOptions.initialTemp, 1/annealingOptions.iterPerAnnealing);
			var mutantSoln;
			var mutantCost;
			var i, j;
			while (annealCount < annealingOptions.numAnnealings) {
				soln = this.randomSolve(clusterGrid, weights, 1);
				solnCost = soln.calculateCost(weights);
				temp = annealingOptions.initialTemp;
				while (temp >= 1) {
					i = Math.floor(Math.random()*soln.levelSelections.length);
					j = Math.floor(Math.random()*soln.levelSelections[i].length);
					mutantSoln = this.mutateSolution(soln, i, j);
					mutantCost = mutantSoln.calculateCost(weights);
					if (mutantCost.weightedTotal <= solnCost.weightedTotal 
							|| Math.random() <= Math.exp((solnCost.weightedTotal - mutantCost.weightedTotal)/temp)) {
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
    	// this.bbSolve = function(clusterGrid, weights) {
    	// 	var soln = new flSolution(clusterGrid);
    	// 	var solnCost;
    	// 	var bestSoln;
    	// 	var bestSolnCost;
    	// 	var i, j;
    	// 	for (i = 0; i < soln.levelSelections.length; i++) {
    	// 		for (j = 0; j < soln.levelSelections[i].length; j++)
    	// 	}
    	// };
	}

	function lClusterer() {
		this.lfMeansCluster = function(numClusters, numFactors, numClusterings, lNodes) {
			var makeClusterGrid = function(clusters, numFactors) {
				var clusterGrid = [];
		    	var i, j;
		    	for (i = 0; i < numFactors; i++) {
		    		clusterGrid.push([]);
		    		for (j = 0; j < clusters.length; j++) {
		    			clusterGrid[i].push(clusters[j]);
		    		}
		    	}
		    	return clusterGrid;
			};
			var clusters;
			var bestClusters;
			var bestCost = -1;
			var clusteringCost;
	    	var clusteringCount = 0;
	    	var j;    	
	    	do {
		    	clusters = this.kMeansCluster(numClusters, lNodes);
		    	for (j = 0; j < clusters.length; j++) {
		    		clusteringCost += clusters[j].calculateClusterCost();
		    	}
		    	if (bestCost < 0 || clusteringCost < bestCost) {
		    		bestCost = clusteringCost;
		    		bestClusters = clusters;
		    	}
		    	clusteringCount++;
	    	} while (clusteringCount <= numClusterings);
	    	bestClusters.sort(function(a, b){return a.target - b.target});
	    	return makeClusterGrid(bestClusters, numFactors);
	    };
	    this.kMeansCluster = function(numClusters, lNodes) {
	    	var initializeClusters = function(numClusters, lNodes) {
				var clusters;
				var nodeDict;
		    	var nodeHash;
				clusters = [];
		    	nodeDict = {};
		    	var j, k;
				for (j = 0; j < numClusters; j++) {
					clusters.push(new lCluster([], 0));
		    		do {
			    		k = Math.floor(Math.random()*lNodes.length);
			    		nodeHash = hash(lNodes[k]);
		    		} while (nodeDict[nodeHash] != null);
		    		nodeDict[nodeHash] = true;
		    		clusters[j].target = lNodes[k].parameter.value;
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
			var score;
	    	var bestScore;
	    	var bestJ;
	    	var clusters = initializeClusters(numClusters, lNodes);
	    	var oldClusters = [];
			var hasConverged;
			var clusterTotal;
			var j, k;
			do {
		    	for (k = 0; k < lNodes.length; k++) {
		    		bestScore = -1;
		    		for (j = 0; j < clusters.length; j++) {
		    			score = Math.abs(lNodes[k].parameter.value - clusters[j].target);
		    			if (bestScore < 0 || score < bestScore) {
		    				bestJ = j;
		    				bestScore = score;
		    			}
		    		}
		    		clusters[bestJ].lNodes.push(lNodes[k]);
		    	}
		    	hasConverged = areClustersEqual(clusters, oldClusters);
		    	if (!hasConverged) {
			    	for (j = 0; j < clusters.length; j++) {
			    		clusterTotal = 0;
			    		for (k = 0; k < clusters[j].lNodes.length; k++) {
			    			clusterTotal += clusters[j].lNodes[k].parameter.value;
			    		}
			    		clusters[j].target = clusterTotal/clusters[j].lNodes.length;
			    	}
			    	oldClusters = [];
			    	for (j = 0; j < clusters.length; j++) {
			    		oldClusters.push(clusters[j].copy());
			    		clusters[j].lNodes = [];
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
		    		clusterGrid.push([]);
		    		if (fNodes[i].levelTargets.length == 0) {
		    			clusterGrid[i].push(new lCluster([], 0));
		    			clusterGrid[i].push(new lCluster([], 0));
		    		} else {
			    		for (j = 0; j < fNodes[i].levelTargets.length; j++) {
			    			clusterGrid[i].push(new lCluster([], fNodes[i].levelTargets[j]));
			    		}
			    	}
		    	}
		    	return clusterGrid;
			};
			var clusterGrid = initializeClusterGrid(fNodes);
			lNodes.sort(function(a, b){return a.parameter.value - b.parameter.value});
			var midPoints;
			var i, j, k;
			for (i = 0; i < clusterGrid.length; i++) {
				clusterGrid[i].sort(function(a, b){return a.target - b.target});
				midPoints = [];
				for (j = 0; j < clusterGrid[i].length - 1; j++) {
					midPoints.push((clusterGrid[i][j].target + clusterGrid[i][j + 1].target)/2);
				}
				j = 0;
				for (k = 0; k < lNodes.length; k++) {
					while (lNodes[k].parameter.value >= midPoints[j] && j < midPoints.length) {
						j++;
					}
					clusterGrid[i][j].lNodes.push(lNodes[k]);
				}
			}
			for (i = 0; i < clusterGrid.length; i++) {
				for (j = 0; j < clusterGrid[i].length; j++) {
					clusterGrid[i][j].calculateLevelCosts();
				}
			}
			return clusterGrid;
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
		product.sort(function(a, b){return a - b});
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
		var result = {mean: 0, stdDev: 0};
		var i;
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

	function doeTemplate(name, type, designGrid, resolution, generators) {
		this.name = name;
		this.type = type;
		this.designGrid = designGrid;
		this.resolution = resolution;
		this.generators = generators;
		this.rangeIndices = [];
		this.levelsPerFactor = [];
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
			var ranges = [];
			var rangeHash;
			var i;
			for (i = 0; i < this.designGrid[0].length; i++) {
				this.rangeIndices.push({});
				ranges.push([]);
			}
			var k;
			for (k = 0; k < this.designGrid.length; k++) {
				for (i = 0; i < this.designGrid[k].length; i++) {
					rangeHash = hash(this.designGrid[k][i]);
					if (this.rangeIndices[i][rangeHash] == null) {
						this.rangeIndices[i][rangeHash] = 0;
						ranges[i].push(this.designGrid[k][i]);
					}
				}
			}
			var j;
			for (i = 0; i < ranges.length; i++) {
				this.levelsPerFactor.push(ranges[i].length);
				ranges[i].sort(function(a, b){return a - b});
				for (j = 0; j < ranges[i].length; j++) {
					this.rangeIndices[i][hash(ranges[i][j])] = j;
				}
			}
		}
		this.isRangeValid = function() {
			var i;
			for (i = 0; i < this.levelsPerFactor.length; i++) {
				if (this.levelsPerFactor[i] < 2) {
					return false;
				}
			}
			return true;
		};
		this.validateGridVsDesign = function(fNodes) {
			var k;
			for (k = 0; k < this.designGrid.length; k++) {
				if (this.designGrid[k].length != fNodes.length) {
					return false;
				}
			}
		  	return true;
		};
		this.validateRangeVsDesign = function(fNodes) {
			if (this.levelsPerFactor.length != fNodes.length) {
				return false;
			} else {
				var i;
				for (i = 0; i < this.levelsPerFactor.length; i++) {
					if (this.levelsPerFactor[i] != fNodes[i].children.length) {
						return false;
					}
				}
			}
		  	return true;
		};
	}

	function doeTemplater() {
		this.doeTypes = {fullFactorial: "fullFactorial", fractionalFactorial: "fractionalFactorial", plackettBurman: "plackettBurman",
				boxBehnken: "boxBehnken"};
		this.makeFullFactorial = function(levelsPerFactor) {
			var designGrid = [];
			if (levelsPerFactor.length > 0) {
				var ranges = [];
				var numDesigns = 1;
				var i, j;
				for (i = 0; i < levelsPerFactor.length; i++) {
					ranges.push([]);
					numDesigns *= levelsPerFactor[i];
					for (j = -Math.floor(levelsPerFactor[i]/2); j <= Math.floor(levelsPerFactor[i]/2); j++) {
		  				if (j != 0 || levelsPerFactor[i]%2 != 0) {
		  					ranges[i].push(j);
		  				}
		  			}
		  		}
	  			
	  			var k;
	  			for (k = 0; k < numDesigns; k++) {
	  				designGrid.push([]);
	  			}
	  			var designsPerLevel = 1; 
	  			j = 0;
	  			for (i = 0; i < levelsPerFactor.length; i++) {
	   				for (k = 0; k < numDesigns; k++) {
						designGrid[k].push(ranges[i][j]);
						if ((k + 1)%designsPerLevel == 0) {
	   						j++;
	   					}
	   					if (j == levelsPerFactor[i]) {
	   						j = 0;
	   					}
	  				}
	  				designsPerLevel *= levelsPerFactor[i];
	  			}
	  		}
	  		return new doeTemplate(this.makeFullFactorialName(levelsPerFactor), this.doeTypes.fullFactorial, designGrid);
		};
		this.makeFullFactorialName = function(levelsPerFactor) {
			var templateName;
			if (levelsPerFactor.length > 0) {
	  			templateName = "Full Factorial (" + levelsPerFactor.length + "x";
				var isLPFConstant = function(levelsPerFactor) {
	  				for (i = 1; i < levelsPerFactor.length; i++) {
		  				if (levelsPerFactor[i] != levelsPerFactor[i - 1]) {
		  					return false;
		  				}
		  			}
		  			return true;
	  			};
	  			if (isLPFConstant(levelsPerFactor)) {
	  				templateName += levelsPerFactor[0] + ")";
	  			} else {
	  				for (i = 0; i < levelsPerFactor.length; i++) {
	  					templateName += levelsPerFactor[i] + ",";
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
					var calculateNumAliasedFactors = function(numBaseFactors) {
						var numAliasedFactors = 0;
						var i;
						for (i = 2; i <= numBaseFactors; i++) {
							numAliasedFactors += combinatorial(numBaseFactors, i);
						}
						return numAliasedFactors;
					};
					while (numBaseFactors + calculateNumAliasedFactors(numBaseFactors) < numFactors) {
						numBaseFactors++;
					}
					var baseFactors = [];
					var levelsPerFactor = [];
					var i;
					for (i = 0; i < numBaseFactors; i++) {
						baseFactors.push([]);
						levelsPerFactor.push(2);
					}
					var fullFactorial = templater.makeFullFactorial(levelsPerFactor);
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
				return new doeTemplate(this.makeFractionalFactorialName(numFactors, 2, resolution), this.doeTypes.fractionalFactorial, 
						designGrid, resolution, aliasingResults.generators);
			} else {
				return new doeTemplate(this.makeFractionalFactorialName(numFactors, 2, resolution), this.doeTypes.fractionalFactorial, 
						designGrid, resolution);
			}
			
		};
		this.makeFractionalFactorialName = function(numFactors, levelsPerFactor, resolution) {
			var templateName;
			if (numFactors > 0) {
				templateName = "Fractional Factorial (" + numFactors + "x" + levelsPerFactor + ")";
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
  			return new doeTemplate(this.makePlackettBurmanName(numFactors), this.doeTypes.plackettBurman, designGrid);
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
				var levelsPerFactor = [];
				var i;
				for (i = 0; i < bbSeed[0].length; i++) {
					if (bbSeed[0][i] == 1) {
						levelsPerFactor.push(2);
					}
				}
				var fullFactorial = this.makeFullFactorial(levelsPerFactor);
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
			return new doeTemplate(this.makeBoxBehnkenName(numFactors), this.doeTypes.boxBehnken, designGrid);		
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
			for (i = 0; i < template.levelsPerFactor.length; i++) {
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
						for (i = 0; i < template.levelsPerFactor.length + 1; i++) {
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
	$scope.numFeatsUploaded = 0;

	$scope.doeTemplater = new doeTemplater();
	$scope.doeTemplates = [$scope.doeTemplater.makeFullFactorial([]), 
			$scope.doeTemplater.makeFractionalFactorial(0, 3),
			$scope.doeTemplater.makeFractionalFactorial(0, 4), 
			$scope.doeTemplater.makeFractionalFactorial(0, 5),
			$scope.doeTemplater.makePlackettBurman(0),
			$scope.doeTemplater.makeBoxBehnken(0)];

	$scope.defaultClusteringOptions = {numClusterings: 10, autoTarget: true};
	$scope.clusteringOptions = {numClusterings: $scope.defaultClusteringOptions.numClusterings, autoTarget: $scope.defaultClusteringOptions.autoTarget};

	$scope.minTarget = 0;
	$scope.maxTarget = 1000000;

	$scope.assignmentCost = 0;
	$scope.levelMatchCost = 0;
	$scope.homologyCost = 0;
	$scope.reuseCost = 0;

	$scope.defaultWeights = {levelMatch: 1, homology: 1, reuse: 1};
	$scope.weights = {levelMatch: $scope.defaultWeights.levelMatch, homology: $scope.defaultWeights.levelMatch, reuse: $scope.defaultWeights.levelMatch};

	$scope.defaultLevelsPerFactor = 2;
	$scope.levelsPerFactor = $scope.defaultLevelsPerFactor;
	$scope.minLevelsPerFactor = 2;
	$scope.maxLevelsPerFactor = 100;
	$scope.levelsPerFactorStep = 1;

	$scope.defaultAnnealingOptions = {numAnnealings: 100, iterPerAnnealing: 100, initialTemp: 1000};
	$scope.annealingOptions = {numAnnealings: $scope.defaultAnnealingOptions.numAnnealings, iterPerAnnealing: $scope.defaultAnnealingOptions.iterPerAnnealing, 
			initialTemp: $scope.defaultAnnealingOptions.initialTemp};

	$scope.isAssigning = false;
	$scope.assignmentCount = 0;

	$scope.addFeatures = function(size, flNode, grammar) {
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
	    	flNode.bioDesign.module = grammar.inferModule(feats);
	    	flNode.bioDesign.constructNameFromFeatures();
	    });
	};

	$scope.viewTargets = function(size, fNode) {
		var modalInstance = $modal.open({
	    	templateUrl: 'targetWindow.html',
	    	controller: 'targetWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {levelTargets: fNode.levelTargets, autoTarget: $scope.clusteringOptions.autoTarget, 
		          			minTarget: $scope.minTarget, maxTarget: $scope.maxTarget};
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
	          		return {isAssigning: $scope.isAssigning, annealingOptions: $scope.annealingOptions, defaultAnnealingOptions: $scope.defaultAnnealingOptions,  
			          		weights: $scope.weights, defaultWeights: $scope.defaultWeights, clusteringOptions: $scope.clusteringOptions,
				          	defaultClusteringOptions: $scope.defaultClusteringOptions};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(items) {
	    	$scope.annealingOptions = items.annealingOptions;
	    	$scope.weights = items.weights;
	    	$scope.clusteringOptions = items.clusteringOptions;
	    	var i;
			for (i = 0; i < $scope.fldNodes.length; i++) {
		    	if (!$scope.clusteringOptions.autoTarget) {
					$scope.fldNodes[i].displayTargets = "";
				} else if (!$scope.isAssigning) {
					$scope.fldNodes[i].displayTargets = "display:none";
					$scope.fldNodes[i].levelTargets = [];
				}
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
    		if (sourceNodeScope.$modelValue.flType === 'f') {
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
    			var nodeCopy = event.source.nodeScope.$modelValue.copy();
    			if (!$scope.clusteringOptions.autoTarget) {
	    			event.source.nodeScope.$modelValue.displayTargets = "";
	    		}
	    		if (event.dest.nodesScope.$nodeScope != null) {
	    			event.dest.nodesScope.$nodeScope.$modelValue.displayToggle = "";
	    		}
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, nodeCopy);
    		}
    	}
  	};

  	$scope.removeFLNode = function(flNode) {
  		if (flNode.$nodeScope.$parentNodeScope != null && flNode.$nodeScope.$parentNodesScope.$modelValue.length - 1 == 0) {
  			flNode.$nodeScope.$parentNodeScope.$modelValue.displayToggle = "display:none";
  		}
  		flNode.remove();
  	}

  	$scope.validateFLDNodes = function() {
  		var validateLNodesPerFNodes = function(fNodes) {
			var i;
			for (i = 1; i < fNodes.length; i++) {
				if (fNodes[i].children.length < 2) {
					alertUser("md", "Error", "Factorial design does not have two or more levels associated with each factor. "
					+ "Upload parameterized features and select 'Assign Levels' or drag levels from the rightmost column to the center column.");
					return false;
				}
			}
			return true;
		};
		if ($scope.fldNodes.length == 0) {
  			alertUser("md", "Error", "Factorial design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column " 
					+ "to the center column.");
  			return false;
  		} else {
  			return validateLNodesPerFNodes($scope.fldNodes);
  		}
  	};

  	$scope.downloadAssignment = function() {
  		var outputData = [];
  		if ($scope.validateFLDNodes()) {
  			var i, j;
  			var k = 0;
  			if ($scope.isAssigning) {
	  			outputData.push([]);
			    outputData[k].push("# of Trials");
				outputData[k].push($scope.assignmentCount);
			    k++;
			    outputData.push([]);
		        outputData[k].push("Level Assignment Weights");
		        k++;
		        outputData.push([]);
		        outputData[k].push("Level Matching");
		        outputData[k].push($scope.weights.levelMatch);
		        k++;
		        outputData.push([]);
		        outputData[k].push("Pathway Homology");
		        outputData[k].push($scope.weights.homology);
		        k++;
		        outputData.push([]);
		        outputData[k].push("Feature Reuse");
		        outputData[k].push($scope.weights.reuse);
		        k++;
		        outputData.push([]);
		        outputData[k].push("Level Assignment Costs");
		        k++;
		        outputData.push([]);
		        outputData[k].push("Level Matching");
		        outputData[k].push($scope.bestSolnCost.levelMatch);
		        k++;
		        outputData.push([]);
		        outputData[k].push("Pathway Homology");
		        outputData[k].push($scope.bestSolnCost.homology);
		        k++;
		        outputData.push([]);
		        outputData[k].push("Feature Reuse");
		        outputData[k].push($scope.bestSolnCost.reuse);
		        k++;
		        outputData.push([]);
		        outputData[k].push("Total");
		        outputData[k].push($scope.bestSolnCost.total);
		        k++;
		    }
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
  		} else {
  			outputData.push([]);
  		}
  		return outputData;
  	};

  	$scope.generateDesigns = function() {
  		var outputData = [[]];
  		if ($scope.validateFLDNodes()) {
  			var i;
  			if ($scope.selectedTemplate.isEmpty()
	  				&& ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fullFactorial 
	  				|| $scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fractionalFactorial
	  				|| $scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.plackettBurman
	  				|| $scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.boxBehnken)) {
  				var levelsPerFactor = [];
	  			for (i = 0; i < $scope.fldNodes.length; i++) {
	  				levelsPerFactor.push($scope.fldNodes[i].children.length);
	  			}
  				var targetTemplateName;
	  			if ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fullFactorial) { 
				  	targetTemplateName = $scope.doeTemplater.makeFullFactorialName(levelsPerFactor);
		  		} else if ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fractionalFactorial) {
		  			targetTemplateName = $scope.doeTemplater.makeFractionalFactorialName(levelsPerFactor.length, 2);
		  		} else if ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.plackettBurman) {
		  			targetTemplateName = $scope.doeTemplater.makePlackettBurmanName(levelsPerFactor.length);
		  		} else {
		  			targetTemplateName = $scope.doeTemplater.makeBoxBehnkenName(levelsPerFactor.length);
		  		}
  				var n;
	  			for (n = 0; n < $scope.doeTemplates.length; n++) {
	  				if ($scope.doeTemplates[n].name === targetTemplateName 
		  					&& $scope.doeTemplates[n].validateGridVsDesign($scope.fldNodes) && $scope.doeTemplates[n].validateRangeVsDesign($scope.fldNodes)) {
	  					$scope.selectedTemplate = $scope.doeTemplates[n];
	  					n = $scope.doeTemplates.length;
	  				}
	  			}
		  	}
	  		if ($scope.selectedTemplate.isEmpty()
		  			&& ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fullFactorial
		  			|| $scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fractionalFactorial 
		  			|| $scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.plackettBurman
		  			|| $scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.boxBehnken)) {
		  		if ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fullFactorial) { 
				  	$scope.doeTemplates.push($scope.doeTemplater.makeFullFactorial(levelsPerFactor));
		  		} else if ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.fractionalFactorial) {
		  			$scope.doeTemplates.push($scope.doeTemplater.makeFractionalFactorial(levelsPerFactor.length, $scope.selectedTemplate.resolution));
		  		} else if ($scope.selectedTemplate.type === $scope.doeTemplater.doeTypes.plackettBurman) {
		  			$scope.doeTemplates.push($scope.doeTemplater.makePlackettBurman(levelsPerFactor.length));
		  		} else {
		  			$scope.doeTemplates.push($scope.doeTemplater.makeBoxBehnken(levelsPerFactor.length));
		  		}
		  		$scope.selectedTemplate = $scope.doeTemplates[$scope.doeTemplates.length - 1];
		  		$scope.doeTemplates.sort(function(a, b) {
					var nameA = a.name;
					var nameB = b.name;
					if (nameA < nameB) {
						return -1;
					} else if (nameA > nameB) {
						return 1;
					} else {
						return 0;
					}
				});
		  	}
	  		if (!$scope.selectedTemplate.validateGridVsDesign($scope.fldNodes)) {
	  			alertUser("md", "Error", "The lengths of rows in the DOE template are not equal to the number of factors in the factorial design. "
	  					+ "Upload or select a template that has rows of length " + $scope.fldNodes.length + ".");
	  		} else if (!$scope.selectedTemplate.validateRangeVsDesign($scope.fldNodes)) {
	  			var errorMessage = "The ranges of values for each column in the DOE template are not equal in size to the numbers of levels associated "
			  			+ "with each factor in the factorial design. Upload or select a template that has columns containing ranges of ";
			  	for (i = 0; i < $scope.fldNodes.length; i++) {
			  		errorMessage += $scope.fldNodes[i].children.length + ", ";
			  	}
			  	errorMessage = errorMessage.substring(0, errorMessage.length - 2);
			  	errorMessage += " non-equal numbers."
	  			alertUser("md", "Error",  errorMessage);
	  		} else {
	  			for (i = 0; i < $scope.fldNodes.length; i++) {
	  				outputData[0].push($scope.fldNodes[i].bioDesign.name);
	  				$scope.fldNodes[i].children.sort(function(a, b){return a.parameter.value - b.parameter.value});
	  			}
	  			var j, k;
	  			for (k = 0; k < $scope.selectedTemplate.designGrid.length; k++) {
	  				outputData.push([]);
	  				for (i = 0; i < $scope.selectedTemplate.designGrid[k].length; i++) {
	  					j = $scope.selectedTemplate.rangeIndices[i][hash($scope.selectedTemplate.designGrid[k][i])];
	  					outputData[k + 1].push($scope.fldNodes[i].children[j].bioDesign.name);
	  				}
	  			}
	  		}
  		}
  		return outputData;
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
							$scope.selectedTemplate = template;	
							$scope.doeTemplates.sort(function(a, b) {
								var nameA = a.name;
								var nameB = b.name;
								if (nameA < nameB) {
									return -1;
								} else if (nameA > nameB) {
									return 1;
								} else {
									return 0;
								}
							});
							$scope.$apply();
						}
					}
				}
			});
		}
  	};

	$scope.uploadBioDesigns = function() {
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
						} else {
							j = isParameterizedExpression(bioDesigns[i]);
							if (j >= 0) {
								$scope.lNodes.push(new lNode(bioDesigns[i], j));
							} 
						}
						feats = bioDesigns[i].module.getFeatures();
						for (j = 0; j < feats.length; j++) {
							if ($scope.feats.indexOf(feats[j]) < 0) {
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
					$scope.lNodes.sort(function(a, b){return a.parameter.value - b.parameter.value});
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
			var i;
	    	for (i = 0; i < $scope.featFiles.length; i++) {
	    		Papa.parse($scope.featFiles[i], 
	    			{i: i, dynamicTyping: true, complete: parseFile});
	    	}
		}
    };

  //   $scope.testAssign = function() {
  //   	var numFactors = [5, 6, 7, 8, 9];
		// var numLevels = [2, 3, 4, 5];
		// var randomCosts = [];
		// var annealCosts = [];
		// var comparedCosts = [];
		// var annealTimes = [];
		// var n;
		// for (n = 0; n < numFactors.length; n++) {
		// 	randomCosts.push([]);
		// 	annealCosts.push([]);
		// 	comparedCosts.push([]);
		// 	annealTimes.push([]);
		// }
		// var clusterer = new lClusterer();
		// var clusterGrid;
		// var validateClusterGrid = function(clusterGrid) {
		// 	var invalidClusters = [];
		// 	var i, j;
		// 	for (i = 0; i < clusterGrid.length; i++) {
		// 		for (j = 0; j < clusterGrid[i].length; j++) {
		// 			if (clusterGrid[i][j].isEmpty()) {
		// 				invalidClusters.push(clusterGrid[i][j]);
		// 			}
		// 		}
		// 	}
		// 	if (invalidClusters.length > 0) {
		// 		var clusterErrorMessage = "";
		// 		for (j = 0; j < invalidClusters.length; j++) {
		// 			clusterErrorMessage += ", " + invalidClusters[j].target.toFixed(2);
		// 		}
		// 		clusterErrorMessage = clusterErrorMessage.substring(2);
		// 		clusterErrorMessage += "<br><br>There are no available levels that cluster around the above targets. Change these targets or upload additional "
		// 				+ "features with parameters that are close to them in magnitude.";
		// 		alertUser("md", "Error", clusterErrorMessage);
		// 		return false;
		// 	} else {
		// 		return true;
		// 	}
		// };
		// var solver = new flSolver();
		// var randomSoln, annealSoln;
		// var refTime;
		// var m;
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
	 //    		clusterGrid = clusterer.lfMeansCluster(numLevels[m], numFactors[n], $scope.numClusterings, $scope.lNodes);
	 //    		if (validateClusterGrid(clusterGrid)) {
	 //    			randomSoln = solver.randomSolve(clusterGrid, $scope.weights, $scope.numAnnealings);
	 //    			randomCosts[n].push(randomSoln.calculateCost($scope.weights));
		// 			refTime = new Date().getTime();
		// 			annealSoln = solver.annealSolve(clusterGrid, $scope.numAnnealings, $scope.iterPerAnnealing, $scope.initialTemp, $scope.weights);
		// 			annealTimes[n].push(new Date().getTime() - refTime);
		// 			annealCosts[n].push(annealSoln.calculateCost($scope.weights));
	 //    		}
	 //    	}
	 //    }
	 //    var compareCosts = function(randomCost, annealCost) {
	 //    	return 100*(randomCost - annealCost)/randomCost;
	 //    }
	 //    for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		comparedCosts[n].push({total: compareCosts(randomCosts[n][m].total, annealCosts[n][m].total), 
		// 				levelMatch: compareCosts(randomCosts[n][m].levelMatch, annealCosts[n][m].levelMatch), 
		// 				homology: compareCosts(randomCosts[n][m].homology, annealCosts[n][m].homology), 
		// 				reuse: compareCosts(randomCosts[n][m].reuse, annealCosts[n][m].reuse)});
		// 	}
		// }
		// console.log("compared");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + comparedCosts[n][m].total + ", levelMatch = " 
		// 			+ comparedCosts[n][m].levelMatch + ", homology = " + comparedCosts[n][m].homology + ", reuse = " + comparedCosts[n][m].reuse
		// 			+ ", time = " + annealTimes[n][m]);
		// 	}
		// }
		// console.log("anneal");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + annealCosts[n][m].total + ", levelMatch = " 
		// 			+ annealCosts[n][m].levelMatch + ", homology = " + annealCosts[n][m].homology + ", reuse = " + annealCosts[n][m].reuse);
		// 	}
		// }
		// console.log("random");
		// for (n = 0; n < numFactors.length; n++) {
		// 	for (m = 0; m < numLevels.length; m++) {
		// 		console.log("fl(" + numFactors[n] + "," + numLevels[m] + "): total = " + randomCosts[n][m].total + ", levelMatch = " 
		// 			+ randomCosts[n][m].levelMatch + ", homology = " + randomCosts[n][m].homology + ", reuse = " + randomCosts[n][m].reuse);
		// 	}
		// }
  //   };

	$scope.assignLevels = function() {
		var validateLevelsPerFactor = function(fNodes, levelsPerFactor, maxLevelsPerFactor, autoTarget) {
			if (autoTarget && levelsPerFactor > maxLevelsPerFactor) {
				alertUser("md", "Error", "The number of available levels does not satisfy the number of levels per factor that you've selected for the "
					+ "experimental design. Select a lower number of levels per factor or upload additional parameterized features.");
				return false;
			} else {
				var invalidNodes = [];
				var i;
				for (i = 0; i < fNodes.length; i++) {
					if (fNodes[i].levelTargets.length > maxLevelsPerFactor) {
						invalidNodes.push(fNodes[i]);
					}
				}
				if (invalidNodes.length > 0) {
					var errorMessage = "";
					for (i = 0; i < invalidNodes.length; i++) {
						errorMessage += ", " + invalidNodes[i].bioDesign.name;
					}
					errorMessage = errorMessage.substring(2);
					errorMessage += "<br><br>The number of available levels does not satisfy the number of targets that you've chosen for the "
							+ "above factors in the experimental design. Choose a lower number of targets for these factors or upload additional "
							+ "parameterized features.";
					alertUser("md", "Error", errorMessage);
					return false;
				} else {
					return true;
				}
			}
		};
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
		$scope.levelsPerFactor = validateNumericInput($scope.levelsPerFactor, $scope.minLevelsPerFactor, $scope.maxLevelsPerFactor, $scope.levelsPerFactorStep, 
			$scope.defaultLevelsPerFactor);
		if ($scope.fldNodes.length == 0) {
			alertUser("md", "Error", "Experimental design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column "
					+ "to the center column.");
		} else if (validateLevelsPerFactor($scope.fldNodes, $scope.levelsPerFactor, $scope.lNodes.length, $scope.clusteringOptions.autoTarget)) {
			var clusterer = new lClusterer();
			var clusterGrid;
			if ($scope.clusteringOptions.autoTarget) {
				clusterGrid = clusterer.lfMeansCluster($scope.levelsPerFactor, $scope.fldNodes.length, $scope.clusteringOptions.numClusterings, $scope.lNodes);
			} else {
				clusterGrid = clusterer.targetedCluster($scope.fldNodes, $scope.lNodes);
			}
			if (validateClusterGrid(clusterGrid)) {
				var i, j;
				if ($scope.clusteringOptions.autoTarget) {
					for (i = 0; i < clusterGrid.length; i++) {
						$scope.fldNodes[i].levelTargets = [];
						for (j = 0; j < clusterGrid[i].length; j++) {
							$scope.fldNodes[i].levelTargets.push(parseFloat(clusterGrid[i][j].target.toFixed(2)));
						}
						$scope.fldNodes[i].displayTargets = "";
					}
				}
				var solver = new flSolver();
				// var bestSoln = solver.randomSolve(clusterGrid, $scope.weights, $scope.annealingOptions.numAnnealings);
				var soln = solver.annealSolve(clusterGrid, $scope.annealingOptions, $scope.weights);
				var solnCost = soln.calculateCost($scope.weights);
				if (!$scope.isAssigning || solnCost.weightedTotal <= $scope.bestSolnCost.weightedTotal) {
					$scope.bestSoln = soln;
					$scope.bestSolnCost = solnCost;
					$scope.fldNodes = $scope.bestSoln.makeNodeDesign($scope.fldNodes);
				}
				$scope.isAssigning = true;
				$scope.assignmentCount += $scope.annealingOptions.numAnnealings;
			}
		} 
	};

	$scope.quitAssigning = function() {
		$scope.isAssigning = false;
		$scope.assignmentCount = 0;
		var i;
		for (i = 0; i < $scope.fldNodes.length; i++) {
			if ($scope.clusteringOptions.autoTarget) {
				$scope.fldNodes[i].displayTargets = "display:none";
				$scope.fldNodes[i].levelTargets = [];
			} else {
				$scope.fldNodes[i].displayTargets = "";
			}
		}
	};
});