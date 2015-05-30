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
	dummyVaria = new variable("");

	function units(name) {
		this.name = name;
		this.schema = "org.clothocad.model.Units";
	}

	reu = new units("REU");
	dummyUnits = new units("");

	function parameter(value, varia, units) {
		this.value = value;
		this.variable = varia;
		this.units = units;
		this.schema = "org.clothocad.model.Parameter";
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

	function design(mod, params, grammar) {
		this.module = mod;
		this.constructNameFromFeatures = function() {
			return this.module.constructNameFromFeatures();
		};
		this.name = this.constructNameFromFeatures();
		this.parameters = params;
		this.grammar = grammar;
		this.schema = "org.clothocad.model.Design";
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
		this.levels = [];
		this.schema = "org.clothocad.model.Factor";
	}

	function flNode(fl) {
		this.fl = fl;
		if (fl.schema === "org.clothocad.model.Factor") {
			this.depth = 1;
			this.labelColor = "color:#ffffff";
			this.backgroundColor = "background-color:#787878"
			this.variable = fl.variable;
			this.parameter = new parameter(0, dummyVaria, dummyUnits);
			this.levelTargets = [];
		} else if (fl.schema === "org.clothocad.model.Level") {
			this.depth = 2;
			this.labelColor = "";
			this.backgroundColor = ""
			this.variable = fl.parameter.variable;
			this.parameter = fl.parameter;
		}
		this.displayTargets = "display:none";
		this.children = [];
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
			var copyCluster = new lCluster([], this.target);
			var i;
			for (i = 0; i < this.lNodes.length; i++) {
				copyCluster.lNodes.push(this.lNodes[i]);
			}
			for (i = 0; i < this.levelCosts.length; i++) {
				copyCluster.levelCosts.push(this.levelCosts[i]);
			}
			return copyCluster;
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
							feats = this.clusterGrid[i][j].lNodes[k].fl.design.module.getFeatures();
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
		    			feats = this.clusterGrid[i][j].lNodes[k].fl.design.module.getFeatures();
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
		this.copy = function() {
			var copySoln = new flSolution(this.clusterGrid);
			var i, j;
			for (i = 0; i < copySoln.levelSelections.length; i++) {
				for (j = 0; j < copySoln.levelSelections[i].length; j++) {
					copySoln.levelSelections[i][j] = this.levelSelections[i][j];
				}
			}
			return copySoln;
		};
	}

	function flSolver() {
		this.randomSolve = function(clusterGrid, weights, numTrials) {
  			var soln;
  			var solnCost;
			var bestSoln;
			var bestCost;
  			var trialCount = 0;
  			var i, j;
  			while (trialCount < numTrials) {
  				soln = new flSolution(clusterGrid);
	  			for (i = 0; i < soln.levelSelections.length; i++) {
	  				for (j = 0; j < soln.levelSelections[i].length; j++) {
	  					soln = this.mutateSolution(soln, i, j);
	  					solnCost = soln.calculateCost(weights);
			  			if (trialCount == 0 || solnCost.weightedTotal < bestSoln.weightedTotal) {
			  				bestSoln = soln;
			  				bestCost = solnCost;
			  			}
	  				}
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
    	this.annealSolve = function(clusterGrid, initialTemp, weights, numAnnealings) {
			var soln;
			var solnCost;
			var bestSoln;
			var bestCost;
			var annealCount = 0;
			var temp;
			var mutantSoln;
			var mutantCost;
			var i, j;
			while (annealCount < numAnnealings) {
				soln = this.randomSolve(clusterGrid, weights, 1);
				solnCost = soln.calculateCost(weights);
				temp = initialTemp;
				while (temp >= 0) {
					i = Math.floor(Math.random()*soln.levelSelections.length);
					j = Math.floor(Math.random()*soln.levelSelections[i].length);
					mutantSoln = this.mutateSolution(soln, i, j);
					mutantCost = mutantSoln.calculateCost(weights);
					if (mutantCost.weightedTotal <= solnCost.weightedTotal 
							|| Math.random() <= Math.exp((solnCost.weightedTotal - mutantCost.weightedTotal)/temp)) {
						soln = mutantSoln;
						solnCost = mutantCost;
					}
					if (annealCount == 0 || solnCost.weightedTotal < bestCost.weightedTotal) {
						 bestSoln = soln
						 bestCost = solnCost;
					}
					temp--;
				}
				annealCount++;
			}
			return bestSoln;
    	};
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
		this.targetedCluster = function(flNodes, lNodes) {
			var initializeClusterGrid = function(flNodes) {
				var clusterGrid = [];
		    	var i, j;
		    	for (i = 0; i < flNodes.length; i++) {
		    		clusterGrid.push([]);
		    		if (flNodes[i].levelTargets.length == 0) {
		    			clusterGrid[i].push(new lCluster([], 0));
		    			clusterGrid[i].push(new lCluster([], 0));
		    		} else {
			    		for (j = 0; j < flNodes[i].levelTargets.length; j++) {
			    			clusterGrid[i].push(new lCluster([], flNodes[i].levelTargets[j]));
			    		}
			    	}
		    	}
		    	return clusterGrid;
			};
			var clusterGrid = initializeClusterGrid(flNodes);
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

	plackettBurmanSeeds = {};
	plackettBurmanSeeds[hash(8)] = [1, 1, 1, -1, 1, -1, -1];
	plackettBurmanSeeds[hash(12)] = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1];
	plackettBurmanSeeds[hash(16)] = [1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, 1, -1, -1, -1];
	plackettBurmanSeeds[hash(20)] = [1, 1, -1, -1, 1, 1, 1, 1, -1, 1, -1, 1, -1, -1, -1, -1, 1, 1, -1];
	plackettBurmanSeeds[hash(24)] = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, -1, 1, -1, -1, -1, -1];

	function doeTemplate(name, designGrid) {
		this.name = name;
		this.designGrid = designGrid;
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
			for (i = 0; i < this.levelsPerFactor; i++) {
				if (this.levelsPerFactor[i] < 2) {
					return false;
				}
			}
			return true;
		};
		this.isDesignGridValid = function(flNodes) {
			var k;
			for (k = 0; k < this.designGrid; k++) {
				if (this.designGrid[k].length != flNodes.length) {
					return false;
				}
			}
		  	return true;
		};
		this.isDesignRangeValid = function(flNodes) {
			if (this.levelsPerFactor.length != flNodes.length) {
				return false;
			} else {
				var i;
				for (i = 0; i < this.levelsPerFactor; i++) {
					if (this.levelsPerFactor[i] != flNodes[i].children.length) {
						return false;
					}
				}
			}
		  	return true;
		};
		this.isFullFactorial = function() {
			var fullFactorial = 1;
			for (i = 0; i < this.levelsPerFactor.length; i++) {
				fullFactorial *= this.levelsPerFactor[i];
			}
			return (this.designGrid.length == fullFactorial);
		};
	}

	function doeTemplater() {
		this.fullFactorial = function(levelsPerFactor) {
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
  			var designGrid = [];
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
  			var isLPFConstant = function(levelsPerFactor) {
  				for (i = 1; i < levelsPerFactor.length; i++) {
	  				if (levelsPerFactor[i] != levelsPerFactor[i - 1]) {
	  					return false;
	  				}
	  			}
	  			return true;
  			};
  			var templateName = "Full Factorial (" + levelsPerFactor.length + "x";
  			if (isLPFConstant(levelsPerFactor)) {
  				templateName += levelsPerFactor[0] + ")";
  			} else {
  				for (i = 0; i < levelsPerFactor.length; i++) {
  					templateName += levelsPerFactor[i] + ",";
  				}
  				templateName = templateName.substring(0, templateName.length - 1) + ")";
  			}
  			return new doeTemplate(templateName, designGrid);
		};
		this.plackettBurman = function(levelsPerFactor) {
			var numDesigns = levelsPerFactor.length + 1;
			while (numDesigns % 4 != 0) {
				numDesigns++;
			}
  			var designGrid = [[]];
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
  			for (i = 0; i < pbSeed.length; i++) {
  				designGrid[numDesigns - 1].push(-1);
  			}
  			var templateName = "Plackett Burman (" + levelsPerFactor.length + "x2)";
  			return new doeTemplate(templateName, designGrid);
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
	}

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
							if (parsedParam != null) {
								designs.push(new design(parsedMod, parsedParam, this.grammar));
							}
						}
					}
				}
			}
			return designs;
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
					return new feature(data.substring(1), parsedRole, new sequence("."));
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
			if (data[0].length == 7
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
								if (parsedParam != null) {
									designs.push(new design(parsedMod, parsedParam, this.grammar));
								}
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

	$scope.lNodes = [];
	$scope.fNodes = [];
	$scope.flNodes = [];

	$scope.uploadSelector = "0";
	$scope.featParsers = [gridParser, tableParser];
	$scope.feats = [];
	$scope.numFeatsUploaded = 0;

	$scope.doeTemplates = [new doeTemplate("Full Factorial (Any Size)", [])];

	$scope.numClusterings = 3;
	$scope.autoTarget = true;

	$scope.assignmentCost = 0;
	$scope.levelMatchCost = 0;
	$scope.homologyCost = 0;
	$scope.reuseCost = 0;

	$scope.weights = {levelMatch: 1, homology: 1, reuse: 1};

	$scope.levelsPerFactor = 2;
	$scope.initialTemp = 100;
	$scope.numAnnealings = 10;
	$scope.toleranceModifier = 1;

	$scope.addFeatures = function(size, selectedFl) {
	    var modalInstance = $modal.open({
	    	templateUrl: 'featureWindow.html',
	    	controller: 'featureWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {selectedFl: selectedFl, features: $scope.feats};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(feats) {
	    	selectedFl.design.module = selectedFl.design.grammar.inferModule(feats);
	    	selectedFl.design.constructNameFromFeatures();
	    });
	};

	$scope.viewTargets = function(size, fNode) {
		var modalInstance = $modal.open({
	    	templateUrl: 'targetWindow.html',
	    	controller: 'targetWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {levelTargets: fNode.levelTargets, autoTarget: $scope.autoTarget};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(levelTargets) {
	    	fNode.levelTargets = levelTargets;
	    });
	};

	$scope.assignmentOptions = function(size) {
	    var modalInstance = $modal.open({
	    	templateUrl: 'assignmentWindow.html',
	    	controller: 'assignmentWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {initialTemp: $scope.initialTemp, numAnnealings: $scope.numAnnealings, toleranceModifier: $scope.toleranceModifier, 
			          		weights: $scope.weights, numClusterings: $scope.numClusterings, autoTarget: $scope.autoTarget};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(items) {
	    	$scope.initialTemp = items.initialTemp;
	    	$scope.numAnnealings = items.numAnnealings;
	    	$scope.toleranceModifier = items.toleranceModifier;

	    	$scope.numClusterings = items.numClusterings;
	    	$scope.autoTarget = items.autoTarget;
    		var i;
    		for (i = 0; i < $scope.flNodes.length; i++) {
    			if ($scope.autoTarget) {
    				$scope.flNodes[i].displayTargets = "display:none";
    			} else {
    				$scope.flNodes[i].displayTargets = "";
    			}
    		}

	    	$scope.weights.levelMatch = items.weights.levelMatch;
	    	$scope.weights.homology = items.weights.homology;
	    	$scope.weights.reuse = items.weights.reuse;
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
    		if (sourceNodeScope.$modelValue.fl.schema === "org.clothocad.model.Factor") {
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
    			var copyNode;
    			if (fl.schema === "org.clothocad.model.Level") {
    				copyNode = new flNode(new level(fl.parameter, fl.design));
    			} else {
    				copyNode = new flNode(new factor(dummyVaria, fl.design));
    			}
    			if (!$scope.autoTarget) {
	    			event.source.nodeScope.$modelValue.displayTargets = "";
	    		}
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, copyNode);
    		}
    	}
  	};

  	$scope.generateDesigns = function() {
  		var outputData = [[]];
  		var validateExperimentalDesign = function(flNodes) {
			var i;
			for (i = 1; i < flNodes.length; i++) {
				if (flNodes[i].children.length < 2) {
					alertUser("md", "Error", "Factorial design does not have greater than two levels associated with each factor. "
					+ "Upload parameterized features and select 'Assign Levels' or drag levels from the rightmost column to the center column.");
					return false;
				}
			}
			return true;
		};
  		if ($scope.flNodes.length == 0) {
  			alertUser("md", "Error", "Factorial design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column " 
					+ "to the center column.");
  		} else if (validateExperimentalDesign($scope.flNodes)) {
	  		if ($scope.selectedTemplate.name === "Full Factorial (Any Size)" && $scope.selectedTemplate.isEmpty()) {
	  			var n;
	  			for (n = 0; n < $scope.doeTemplates.length; n++) {
	  				if ($scope.doeTemplates[n].isDesignGridValid($scope.flNodes) && $scope.doeTemplates[n].isDesignRangeValid($scope.flNodes) 
		  					&& $scope.doeTemplates[n].isFullFactorial()) {
	  					$scope.selectedTemplate = $scope.doeTemplates[n];
	  					n = $scope.doeTemplates.length;
	  				}
	  			}
	  		}
	  		var i;
	  		if ($scope.selectedTemplate.name === "Full Factorial (Any Size)" && $scope.selectedTemplate.isEmpty()) { 
	  			var levelsPerFactor = [];
	  			for (i = 0; i < $scope.flNodes.length; i++) {
	  				levelsPerFactor.push($scope.flNodes[i].children.length);
	  			}
	  			var templater = new doeTemplater();
			  	$scope.doeTemplates.push(templater.fullFactorial(levelsPerFactor));
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
	  		if (!$scope.selectedTemplate.isDesignGridValid($scope.flNodes)) {
	  			alertUser("md", "Error", "The lengths of rows in the DOE template are not equal to the number of factors in the factorial design. "
	  					+ "Upload or select a template that has rows of length " + $scope.flNodes.length + ".");
	  		} else if (!$scope.selectedTemplate.isDesignRangeValid($scope.flNodes)) {
	  			var errorMessage = "The ranges of values for each column in the DOE template are not equal in size to the numbers of levels associated "
			  			+ "with each factor in the factorial design. Upload or select a template that has columns containing ranges of ";
			  	for (i = 0; i < $scope.flNodes.length; i++) {
			  		errorMessage += $scope.flNodes[i].children.length + ", ";
			  	}
			  	errorMessage = errorMessage.substring(0, errorMessage.length - 2);
			  	errorMessage += " non-equal numbers."
	  			alertUser("md", "Error",  errorMessage);
	  		} else {
	  			for (i = 0; i < $scope.flNodes.length; i++) {
	  				outputData[0].push($scope.flNodes[i].fl.design.name);
	  				$scope.flNodes[i].children.sort(function(a, b){return a.parameter.value - b.parameter.value})
	  			}
	  			var j, k;
	  			for (k = 0; k < $scope.selectedTemplate.designGrid.length; k++) {
	  				outputData.push([]);
	  				for (i = 0; i < $scope.selectedTemplate.designGrid[k].length; i++) {
	  					j = $scope.selectedTemplate.rangeIndices[i][hash($scope.selectedTemplate.designGrid[k][i])];
	  					outputData[k + 1].push($scope.flNodes[i].children[j].fl.design.name);
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
						var templater = new doeTemplater();
						var template = templater.parseTemplate($scope.templateFiles[0].name.substring(0, $scope.templateFiles[0].name.length - 4), 
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

	$scope.uploadFeatures = function() {
		var isCSV = function(files) {
			var i;
			for (i = 0; i < $scope.featFiles.length; i++) {
				if ($scope.featFiles[i].name.substring($scope.featFiles[i].name.length - 4) !== ".csv") {
					return false;
				}
			}
			return true;
		}
		if ($scope.featFiles == null) {
			alertUser("md", "Warning", "No files selected. Browse and select one or more feature files (.csv) to upload.");
		} else if (!isCSV($scope.featFiles)) {
			alertUser("md", "Error", "One or more of selected files lack the .csv file extension. Browse and select feature files (.csv) to upload.");
		} else {
			$scope.numFeatsUploaded = 0;
			var i;
	    	for (i = 0; i < $scope.featFiles.length; i++) {
	    		Papa.parse($scope.featFiles[i], {i: i, dynamicTyping: true, 
					complete: function(results) {
						if (results.data.length == 0) {
							alertUser("md", "Error", $scope.featFiles[this.i].name + " contains no data. Browse and select a new feature file (.csv) to upload.");
						} else {
							var designs = $scope.featParsers[$scope.uploadSelector].parseDesigns(results.data);
							if (designs.length == 0) {
								alertUser("md", "Error", "Failed to parse contents of " + $scope.featFiles[this.i].name + ". Check file format.");
							} else {
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
								var i, j;
								var feats;
								for (i = 0; i < designs.length; i++) {
									if (isCodedExpression(designs[i])) {
										$scope.fNodes.push(new flNode(new factor(dummyVaria, designs[i])));
									} else {
										j = isParameterizedExpression(designs[i]);
										if (j >= 0) {
											$scope.lNodes.push(new flNode(new level(designs[i].parameters[j], designs[i])));
										} 
									}
									feats = designs[i].module.getFeatures();
									for (j = 0; j < feats.length; j++) {
										if ($scope.feats.indexOf(feats[j]) < 0) {
											$scope.feats.push(feats[j]);
											$scope.numFeatsUploaded++;
										}
									}
								}
								$scope.fNodes.sort(function(a, b) {
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
								$scope.lNodes.sort(function(a, b){return a.parameter.value - b.parameter.value});
								$scope.$apply();
							}
						}
					}
				});
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
		// var i, j;
		// for (i = 0; i < numFactors.length; i++) {
		// 	randomCosts.push([]);
		// 	annealCosts.push([]);
		// 	comparedCosts.push([]);
		// 	annealTimes.push([]);
		// }
		// var clusterer = new lClusterer();
		// var clusterResult;
		// // var clusterValidation;
		// var levelCosts;
		// var solver = new flSolver();
		// var randomSoln, annealSoln;
		// var refTime;
		// var k;
		// for (i = 0; i < numFactors.length; i++) {
		// 	for (j = 0; j < numLevels.length; j++) {
	 //    		clusterResult = clusterer.cluster($scope.lNodes, numLevels[j], numFactors[i], $scope.clusteringLimit);
	 //    		// clusterValidation = clusterer.validateClusters(clusterResult.clusters, numFactors[i]);
	 //    		// if (clusterValidation.result) {
	 //    			levelCosts = clusterer.costClusters(clusterResult.clusters);
	 //    			randomSoln = solver.randomSolve(numFactors[i], numLevels[j], levelCosts, $scope.trialLimit);
	 //    			randomCosts[i].push(randomSoln.calculateCost());
		// 			refTime = new Date().getTime();
		// 			annealSoln = solver.annealSolve(numFactors[i], numLevels[j], levelCosts, $scope.initialTemp, $scope.trialLimit);
		// 			annealTimes[i].push(new Date().getTime() - refTime);
		// 			annealCosts[i].push(annealSoln.calculateCost());
	 //    		// }
	 //    	}
	 //    }
	 //    var compareCosts = function(randomCost, annealCost) {
	 //    	return 100*(randomCost - annealCost)/randomCost;
	 //    }
	 //    for (i = 0; i < numFactors.length; i++) {
		// 	for (j = 0; j < numLevels.length; j++) {
		// 		comparedCosts[i].push({total: compareCosts(randomCosts[i][j].total, annealCosts[i][j].total), 
		// 				levelMatch: compareCosts(randomCosts[i][j].levelMatch, annealCosts[i][j].levelMatch), 
		// 				homology: compareCosts(randomCosts[i][j].homology, annealCosts[i][j].homology), 
		// 				reuse: compareCosts(randomCosts[i][j].reuse, annealCosts[i][j].reuse)});
		// 	}
		// }
		// console.log("compared");
		// for (i = 0; i < numFactors.length; i++) {
		// 	for (j = 0; j < numLevels.length; j++) {
		// 		console.log("fl(" + numFactors[i] + "," + numLevels[j] + "): total = " + comparedCosts[i][j].total + ", levelMatch = " 
		// 			+ comparedCosts[i][j].levelMatch + ", homology = " + comparedCosts[i][j].homology + ", reuse = " + comparedCosts[i][j].reuse
		// 			+ ", time = " + annealTimes[i][j]);
		// 	}
		// }
		// console.log("anneal");
		// for (i = 0; i < numFactors.length; i++) {
		// 	for (j = 0; j < numLevels.length; j++) {
		// 		console.log("fl(" + numFactors[i] + "," + numLevels[j] + "): total = " + annealCosts[i][j].total + ", levelMatch = " 
		// 			+ annealCosts[i][j].levelMatch + ", homology = " + annealCosts[i][j].homology + ", reuse = " + annealCosts[i][j].reuse);
		// 	}
		// }
		// console.log("random");
		// for (i = 0; i < numFactors.length; i++) {
		// 	for (j = 0; j < numLevels.length; j++) {
		// 		console.log("fl(" + numFactors[i] + "," + numLevels[j] + "): total = " + randomCosts[i][j].total + ", levelMatch = " 
		// 			+ randomCosts[i][j].levelMatch + ", homology = " + randomCosts[i][j].homology + ", reuse = " + randomCosts[i][j].reuse);
		// 	}
		// }
  //   };

	$scope.assignLevels = function() {
		var validateLevelsPerFactor = function(flNodes, levelsPerFactor, maxLevelsPerFactor, autoTarget) {
			if (autoTarget && levelsPerFactor > maxLevelsPerFactor) {
				alertUser("md", "Error", "The number of available levels does not satisfy the number of levels per factor that you've selected for the "
					+ "experimental design. Select a lower number of levels per factor or upload additional parameterized features.");
				return false;
			} else {
				var invalidFactors = [];
				var i;
				for (i = 0; i < flNodes.length; i++) {
					if (flNodes[i].levelTargets.length > maxLevelsPerFactor) {
						invalidFactors.push(flNodes[i]);
					}
				}
				if (invalidFactors.length > 0) {
					var perFactorErrorMessage = "";
					for (i = 0; i < invalidFactors.length; i++) {
						perFactorErrorMessage += ", " + invalidFactors[i].fl.design.name;
					}
					perFactorErrorMessage = perFactorErrorMessage.substring(2);
					perFactorErrorMessage += "<br><br>The number of available levels does not satisfy the number of targets that you've chosen for the "
							+ "above factors in the experimental design. Choose a lower number of targets for these factors or upload additional "
							+ "parameterized features.";
					alertUser("md", "Error", perFactorErrorMessage);
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
		if ($scope.flNodes.length == 0) {
			alertUser("md", "Error", "Experimental design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column "
					+ "to the center column.");
		} else if (validateLevelsPerFactor($scope.flNodes, $scope.levelsPerFactor, $scope.lNodes.length, $scope.autoTarget)) {
			var clusterer = new lClusterer();
			var clusterGrid;
			if ($scope.autoTarget) {
				clusterGrid = clusterer.lfMeansCluster($scope.levelsPerFactor, $scope.flNodes.length, $scope.numClusterings, $scope.lNodes);
			} else {
				clusterGrid = clusterer.targetedCluster($scope.flNodes, $scope.lNodes);
			}
			if (validateClusterGrid(clusterGrid)) {
				if ($scope.autoTarget) {
					var i, j;
					for (i = 0; i < clusterGrid.length; i++) {
						$scope.flNodes[i].levelTargets = [];
						for (j = 0; j < clusterGrid[i].length; j++) {
							$scope.flNodes[i].levelTargets.push(parseFloat(clusterGrid[i][j].target.toFixed(2)));
						}
						$scope.flNodes[i].displayTargets = "";
					}
				}
				var solver = new flSolver();
				// var soln = solver.randomSolve(clusterGrid, $scope.weights, $scope.trialLimit);
				var soln = solver.annealSolve(clusterGrid, $scope.initialTemp, $scope.weights, $scope.numAnnealings);
				for (i = 0; i < $scope.flNodes.length; i++) {
					$scope.flNodes[i].children = [];
				}
				var k;
				for (i = 0; i < soln.levelSelections.length; i++) {
					for (j = 0; j < soln.levelSelections[i].length; j++) {
						k = soln.levelSelections[i][j];
						$scope.flNodes[i].children.push(clusterGrid[i][j].lNodes[k]);
					}
				}
				var solnCost = soln.calculateCost($scope.weights);
				$scope.levelMatchCost = solnCost.levelMatch;
				$scope.homologyCost = solnCost.homology;
				$scope.reuseCost = solnCost.reuse;
				$scope.assignmentCost = solnCost.total;
			}
		} 
	};
});