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
	termEfficiency = new variable("Termination Efficiency");
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
		this.copy = function() {
			return new parameter(this.parameter.value, this.parameter.variable, this.parameter.units);
		}
	}

	dummaryParam = new parameter(0, dummyVaria, dummyUnits);

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
			var paramsCopy = [];
			var i;
			for (i = 0; i < this.parameters.length; i++) {
				paramsCopy.push(this.parameters[i].copy());
			}
			return new bioDesign(mod, paramsCopy);
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
		this.parameter = dummyParam;
		this.levelTargets = [];
		this.displayTargets = "display:none";
		this.children = [];
		this.copy = function() {
			return new fNode(this.bioDesign.copy());
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
    	this.annealSolve = function(clusterGrid, numAnnealings, iterPerAnnealing, initialTemp, weights) {
			var soln;
			var solnCost;
			var bestSoln;
			var bestCost;
			var annealCount = 0;
			var temp;
			var phi = Math.pow(1/initialTemp, 1/iterPerAnnealing);
			var mutantSoln;
			var mutantCost;
			var i, j;
			while (annealCount < numAnnealings) {
				soln = this.randomSolve(clusterGrid, weights, 1);
				solnCost = soln.calculateCost(weights);
				temp = initialTemp;
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
					if (annealCount == 0 || solnCost.weightedTotal < bestCost.weightedTotal) {
						 bestSoln = soln
						 bestCost = solnCost;
					}
					temp *= phi;
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
		this.validateGridVsDesign = function(fNodes) {
			var k;
			for (k = 0; k < this.designGrid; k++) {
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
				for (i = 0; i < this.levelsPerFactor; i++) {
					if (this.levelsPerFactor[i] != fNodes[i].children.length) {
						return false;
					}
				}
			}
		  	return true;
		};
	}

	function doeTemplater() {
		this.makeFullFactorial = function(levelsPerFactor) {
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
  			return new doeTemplate(this.makeFullFactorialName(levelsPerFactor), designGrid);
		};
		this.makePlackettBurman = function(levelsPerFactor) {
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
  			if (levelsPerFactor.length < pbSeed.length) {
  				var factorDifference = pbSeed.length - levelsPerFactor.length;
  				for (k = 0; k < numDesigns; k++) {
  					designGrid[k].splice(levelsPerFactor.length, factorDifference);
  				}
  			}
  			return new doeTemplate(this.makePlackettBurmanName(levelsPerFactor.length), designGrid);
		};
		this.fullFactorial = "Full Factorial (Any Size)"
		this.makeFullFactorialName = function(levelsPerFactor) {
  			var templateName = "Full Factorial (" + levelsPerFactor.length + "x";
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
  			return templateName;
		};
		this.plackettBurman = "Plackett Burman (<24x2)";
		this.makePlackettBurmanName = function(numFactors) {
			return "Plackett Burman (" + numFactors + "x2)";
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

	$scope.expressGrammar = {
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
		grammar: $scope.expressGrammar,
		parseDesignData: function(data) {
			var bioDesigns = [];
			var parsedMod;
			var rowFeats = [];
			var i;
			for (i = 0; i < data.length; i++) {
				if (data[i].length > 0) {
					rowFeats[i] = this.parseFeature(data[i][0]);
					if (rowFeats[i] != null) {
						parsedMod = this.grammar.inferModule([rowFeats[i]]);
						if (parsedMod != null) {
							bioDesigns.push(new bioDesign(parsedMod, []));
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
						bioDesigns.push(new bioDesign(parsedMod, []));
					}
				}
			}
			var parsedParam;
			for (i = 1; i < data.length; i++) {
				for (j = 1; j < data[i].length; j++) {
					if (rowFeats[i] != null && colFeats[j] != null) {
						parsedMod = this.grammar.inferModule([rowFeats[i], colFeats[j]]);
						if (parsedMod != null) {
							parsedParam = this.parseParameter(data[i][j], parsedMod.role);
							if (parsedParam != null) {
								bioDesigns.push(new bioDesign(parsedMod, parsedParam));
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
		grammar: $scope.expressGrammar,
		parseDesignData: function(data) {
			var bioDesigns = [];
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
									bioDesigns.push(new bioDesign(parsedMod, parsedParam));
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
					seq = new sequence(".");
				}
				return new feature(data[0], parsedRole, seq);
			} else {
				return null;
			}
		}, parseParameter: function(data, role) {
			if (!isNaN(data[2]) && data[2] !== "") {
				return [new parameter(data[2], termEfficiency, reu)];
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
	$scope.fldNodes = [];

	$scope.uploadSelector = "0";
	$scope.bioDesignParsers = [gridParser, tableParser];
	$scope.feats = [];
	$scope.numFeatsUploaded = 0;

	$scope.doeTemplates = [new doeTemplate("Full Factorial (Any Size)", []), new doeTemplate("Plackett Burman (<24x2)", [])];

	$scope.numClusterings = 3;
	$scope.autoTarget = true;

	$scope.assignmentCost = 0;
	$scope.levelMatchCost = 0;
	$scope.homologyCost = 0;
	$scope.reuseCost = 0;

	$scope.weights = {levelMatch: 1, homology: 1, reuse: 1};

	$scope.levelsPerFactor = 2;
	$scope.numAnnealings = 100;
	$scope.iterPerAnnealing = 100
	$scope.initialTemp = 1000;
	
	$scope.toleranceModifier = 1;

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
	          		return {levelTargets: fNode.levelTargets, autoTarget: $scope.autoTarget};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(levelTargets) {
	    	fNode.levelTargets = levelTargets;
	    });
	};

	$scope.viewAssignmentResults = function(size, solver) {
		var factors = [];
		var i, j;
		for (i = 0; i < $scope.fldNodes.length; i++) {
			factors.push(new factor(dummyVaria, $scope.fldNodes[i].bioDesign));
			for (j = 0; j < $scope.fldNodes[i].children.length; j++) {
				factors[i].levels.push(new level($scope.fldNodes[i].children[j].parameter, $scope.fldNodes[i].children[j].bioDesign));
			}
		}
		var modalInstance = $modal.open({
	    	templateUrl: 'assignmentResultsWindow.html',
	    	controller: 'assignmentResultsWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {experimentalDesign: new experimentalDesign(factors), bestSoln: $scope.bestSoln, solver: solver, 
		          			numAnnealings: $scope.numAnnealings, iterPerAnnealing: $scope.iterPerAnnealing, initialTemp: $scope.initialTemp, 
		          			weights: $scope.weights};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(items) {
	 		$scope.bestSoln = items.bestSoln;
	 		$scope.numAnnealings = items.numAnnealings;
	 		$scope.iterPerAnnealing = items.iterPerAnnealing;
	 		$scope.initialTemp = items.initialTemp;
	    });
	};

	$scope.editAssignmentOptions = function(size, onRepeat) {
	    var modalInstance = $modal.open({
	    	templateUrl: 'assignmentWindow.html',
	    	controller: 'assignmentWindowCtrl',
		    size: size,
		    resolve: {
	        	items: function() {
	          		return {onRepeat: onRepeat, 
		          			numAnnealings: $scope.numAnnealings, iterPerAnnealing: $scope.iterPerAnnealing, initialTemp: $scope.initialTemp,   
			          		weights: $scope.weights, autoTarget: $scope.autoTarget, numClusterings: $scope.numClusterings};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(items) {
	    	$scope.numAnnealings = items.numAnnealings;
	    	$scope.iterPerAnnealing = items.iterPerAnnealing;
	    	$scope.initialTemp = items.initialTemp;
	    	$scope.weights = items.weights;
	    	$scope.autoTarget = items.autoTarget;
	    	var i;
    		for (i = 0; i < $scope.fldNodes.length; i++) {
    			if ($scope.autoTarget) {
    				$scope.fldNodes[i].displayTargets = "display:none";
    			} else {
    				$scope.fldNodes[i].displayTargets = "";
    			}
    		}
	    	$scope.numClusterings = items.numClusterings;
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
    			if (!$scope.autoTarget) {
	    			event.source.nodeScope.$modelValue.displayTargets = "";
	    		}
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, nodeCopy);
    		}
    	}
  	};

  	$scope.generateDesigns = function() {
  		var outputData = [[]];
  		var validateExperimentalDesign = function(fNodes) {
			var i;
			for (i = 1; i < fNodes.length; i++) {
				if (fNodes[i].children.length < 2) {
					alertUser("md", "Error", "Factorial design does not have greater than two levels associated with each factor. "
					+ "Upload parameterized features and select 'Assign Levels' or drag levels from the rightmost column to the center column.");
					return false;
				}
			}
			return true;
		};
  		if ($scope.fldNodes.length == 0) {
  			alertUser("md", "Error", "Factorial design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column " 
					+ "to the center column.");
  		} else if (validateExperimentalDesign($scope.fldNodes)) {
  			var templater = new doeTemplater();
  			var i;
  			if ($scope.selectedTemplate.isEmpty()
	  				&& ($scope.selectedTemplate.name === templater.fullFactorial || $scope.selectedTemplate.name === templater.plackettBurman)) {
  				var levelsPerFactor = [];
	  			for (i = 0; i < $scope.fldNodes.length; i++) {
	  				levelsPerFactor.push($scope.fldNodes[i].children.length);
	  			}
  				var targetTemplateName;
	  			if ($scope.selectedTemplate.name === templater.fullFactorial) { 
				  	targetTemplateName = templater.makeFullFactorialName(levelsPerFactor);
		  		} else {
		  			targetTemplateName = templater.makePlackettBurmanName(levelsPerFactor);
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
		  			&& ($scope.selectedTemplate.name === templater.fullFactorial || $scope.selectedTemplate.name === templater.plackettBurman)) {
		  		if ($scope.selectedTemplate.name === templater.fullFactorial) { 
				  	$scope.doeTemplates.push(templater.makeFullFactorial(levelsPerFactor));
		  		} else {
		  			$scope.doeTemplates.push(templater.makePlackettBurman(levelsPerFactor));
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
	  				$scope.fldNodes[i].children.sort(function(a, b){return a.parameter.value - b.parameter.value})
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
		var parseFileData = function(results) {
			if (results.data.length == 0) {
				alertUser("md", "Error", $scope.featFiles[this.i].name + " contains no data. Browse and select a new feature file (.csv) to upload.");
			} else {
				var bioDesignParser = $scope.bioDesignParsers[$scope.uploadSelector];
				var bioDesigns = bioDesignParser.parseDesignData(results.data);
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
							var varia;
							if (bioDesign.module.role === modRole.EXPRESSION) {
								varia = expressStrength;
							} else if (bioDesign.module.role === modRole.TRANSCRIPTION) {
								varia = transcStrength;
							} else if (bioDesign.module.role === modRole.TRANSLATION) {
								varia = translStrength;
							} else {
								return -1;
							}
							var i = 0;
							while (i < bioDesign.parameters.length) {
								if (bioDesign.parameters[i].variable.name === varia.name) {
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
	    			{i: i, dynamicTyping: true, complete: parseFileData});
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
		if ($scope.fldNodes.length == 0) {
			alertUser("md", "Error", "Experimental design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column "
					+ "to the center column.");
		} else if (validateLevelsPerFactor($scope.fldNodes, $scope.levelsPerFactor, $scope.lNodes.length, $scope.autoTarget)) {
			var clusterer = new lClusterer();
			var clusterGrid;
			if ($scope.autoTarget) {
				clusterGrid = clusterer.lfMeansCluster($scope.levelsPerFactor, $scope.fldNodes.length, $scope.numClusterings, $scope.lNodes);
			} else {
				clusterGrid = clusterer.targetedCluster($scope.fldNodes, $scope.lNodes);
			}
			if (validateClusterGrid(clusterGrid)) {
				var i, j;
				if ($scope.autoTarget) {
					for (i = 0; i < clusterGrid.length; i++) {
						$scope.fldNodes[i].levelTargets = [];
						for (j = 0; j < clusterGrid[i].length; j++) {
							$scope.fldNodes[i].levelTargets.push(parseFloat(clusterGrid[i][j].target.toFixed(2)));
						}
						$scope.fldNodes[i].displayTargets = "";
					}
				}
				var solver = new flSolver();
				// $scope.bestSoln = solver.randomSolve(clusterGrid, $scope.weights, $scope.numAnnealings);
				$scope.bestSoln = solver.annealSolve(clusterGrid, $scope.numAnnealings, $scope.iterPerAnnealing, $scope.initialTemp, $scope.weights);
				for (i = 0; i < $scope.fldNodes.length; i++) {
					$scope.fldNodes[i].children = [];
				}
				var k;
				for (i = 0; i < $scope.bestSoln.levelSelections.length; i++) {
					for (j = 0; j < $scope.bestSoln.levelSelections[i].length; j++) {
						k = $scope.bestSoln.levelSelections[i][j];
						$scope.fldNodes[i].children.push(clusterGrid[i][j].lNodes[k]);
					}
				}
				$scope.viewAssignmentResults('md', solver);
			}
		} 
	};
});