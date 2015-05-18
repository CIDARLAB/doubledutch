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
			this.rootable = true;
			this.valueDisplay = "display:none";
			this.toggleDisplay = "";
			this.labelColor = "color:#ffffff";
			this.backgroundColor = "background-color:#787878"
			this.variable = fl.variable;
			this.parameter = new parameter(0, dummyVaria, dummyUnits);
			this.levelTargets = [];
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
		this.targetDisplay = "display:none";
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
	}

	function flSolution(numFactors, levelsPerFactor, clusterGrid) {
		this.numFactors = numFactors;
		this.levelsPerFactor = levelsPerFactor;
		this.levelSelections = [];
	    var i, j;
		for (i = 0; i < this.numFactors; i++) {
			this.levelSelections.push([]);
			for (j = 0; j < this.levelsPerFactor; j++) {
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
			if (this.levelsPerFactor >= 2) {
				var i, j, k;
				for (i = 0; i < this.levelSelections.length; i++) {
					for (j = 0; j < this.levelSelections[i].length; j++) {
						k = this.levelSelections[i][j];
						levelMatchCost += this.clusterGrid[i][j].levelCosts[k];
					}
				}
				levelMatchCost /= (this.levelsPerFactor*this.numFactors);
			}
			return levelMatchCost;
		};
		this.calculateReuseCost = function() {
			var reuseCost = 0;
			if (this.levelsPerFactor >= 2) {
				reuseCost = (this.levelsPerFactor - 1)*this.numFactors;
				var dict;
				var feats;
				var featHash;
				var i, j, k, m;
				for (i = 0; i < this.levelSelections.length; i++) {
					dict = {};
					for (j = 0; j < this.levelSelections[i].length; j++) {
						k = this.levelSelections[i][j];
						feats = this.clusterGrid[i][j].lNodes[k].fl.design.module.getFeatures();
						for (m = 0; m < feats.length; m++) {
							featHash = hash(feats[m]);
							if (dict[featHash] == null) {
								dict[featHash] = true;
							} else {
								reuseCost--;
							}
						}
					}
				}
				reuseCost /= ((this.levelsPerFactor - 1)*this.numFactors);
			} 
			return reuseCost;
		};
		this.calculateHomologyCost = function() {
			var homologyCost = 0;
			if (this.levelsPerFactor>= 2) {
				var featDict = {};
	    		var feats;
	    		var featHash;
	    		var i, j, k, m, n;
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
	    		homologyCost /= (combinatorial(this.levelsPerFactor*this.numFactors, 2) - this.numFactors*combinatorial(this.levelsPerFactor, 2));
    		}
    		return homologyCost;
		};
		this.copy = function() {
			var copySoln = new flSolution(this.numFactors, this.levelsPerFactor, this.clusterGrid);
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
		this.randomSolve = function(numFactors, levelsPerFactor, clusterGrid, weights, numTrials) {
  			var soln;
  			var solnCost;
			var bestSoln;
			var bestCost;
  			var trialCount = 0;
  			var i, j;
  			while (trialCount < numTrials) {
  				soln = new flSolution(numFactors, levelsPerFactor, clusterGrid);
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
    	this.annealSolve = function(numFactors, levelsPerFactor, clusterGrid, initialTemp, weights, numAnnealings) {
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
				soln = this.randomSolve(numFactors, levelsPerFactor, clusterGrid, weights, 1);
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
		this.targetedCluster = function(targetGrid, lNodes) {
			var makeClusterGrid = function(targetGrid) {
				var clusterGrid = [];
		    	var i, j;
		    	for (i = 0; i < targetGrid.length; i++) {
		    		clusterGrid.push([]);
		    		for (j = 0; j < targetGrid[i].length; j++) {
		    			clusterGrid[i].push(new lCluster([], targetGrid[i][j]));
		    		}
		    	}
		    	return clusterGrid;
			};
			var clusterGrid = makeClusterGrid(targetGrid);
			lNodes.sort(function(a, b){return a.parameter.value - b.parameter.value});
			var midPoints;
			var i, j, k;
			for (i = 0; i < targetGrid.length; i++) {
				targetGrid[i].sort(function(a, b){return a - b});
				midPoints = [];
				for (j = 0; j < targetGrid[i].length - 1; j++) {
					midPoints.push((targetGrid[i][j] + targetGrid[i][j + 1])/2);
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
		this.validateClusters = function(clusters) {
			var clusterVald
		};
	}

	factorialStore = [];
	factorial = function(n) {
		if (n == 0 || n == 1)
			return 1;
		if (factorialStore[n] > 0)
			return factorialStore[n];
		return factorialStore[n] = factorial(n - 1)*n;
	} 
	combinatorial = function(n, k) {
		return factorial(n)/(factorial(k)*factorial(n - k));
	}

	hash = function(value) {
	    return (typeof value) + ' ' + (value instanceof Object ?
	        (value.__hash || (value.__hash = ++arguments.callee.current)) :
	        value.toString());
	}
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
	}

	function doeTemplate(name, grid, range) {
		this.name = name;
		this.grid = grid;
		this.range = range;
	}

	function doeTemplater() {
		this.fullFactorial = function(numFactors, levelsPerFactor) {
			var range = [];
			var j;
			for (j = -Math.floor(levelsPerFactor/2); j <= Math.floor(levelsPerFactor/2); j++) {
  				if (j != 0 || levelsPerFactor%2 != 0) {
  					range.push(j);
  				}
  			}
  			var grid = [];
  			var numDesigns = Math.pow(levelsPerFactor, numFactors);
  			var k;
  			for (k = 0; k < numDesigns; k++) {
  				grid.push([]);
  			}
  			var designsPerLevel = numDesigns; 
  			var i;
  			for (i = 0; i < numFactors; i++) {
  				designsPerLevel /= levelsPerFactor;
   				for (k = 0; k < numDesigns; k++) {
   					j = Math.floor(k%(designsPerLevel*levelsPerFactor)/designsPerLevel);
					grid[k].push(range[j]);
  				}
  			}
  			return new doeTemplate("Full Factorial (" + numFactors + "x" + levelsPerFactor + ")", grid, range);
		};
		this.parseTemplate = function(name, data) {
			var grid = [];
			var range = [];
			if (data != null) {
				var i, k;
				var minK;
				var minI = -1;
				var maxI = -1;
				for (k = 0; k < data.length; k++) {
					i = 0;
					while (i < data[k].length && minI < 0) {
						if (i > 0 && !isNaN(data[k][i]) && data[k][i] !== ""
								&& !isNaN(data[k][i - 1]) && data[k][i - 1] !== "") {
							minI = i;
							minK = k;
						} else {
							i++;
						}
					}
					while (i < data[k].length && maxI < 0) {
						if (!isNaN(data[k][i]) && data[k][i] !== ""
								&& (i + 1 == data[k].length || isNaN(data[k][i + 1]) || data[k][i + 1] === "")) {
							maxI = i;
						} else {
							i++;
						}
					}
					if (minI >= 0 && maxI >= minI && data[k].length > minI) {
						i = minI;
						grid.push([]);
						while (!isNaN(data[k][i]) && data[k][i] !== "" && i <= maxI) {
							grid[k - minK].push(data[k][i]);
							if (range.indexOf(data[k][i]) < 0) {
								range.push(data[k][i]);
							}
							i++;
						}
					}
				}
				range.sort(function(a, b){return a - b});
			}
			return new doeTemplate(name, grid, range);
		};
		this.validateTemplate = function(template) {
			if (template.grid.length == 0 || template.range.length == 0) {
				return {isValidParse: false, isValidRange: false, isValidGrid: false};
			} else {
				var k;
				for (k = 1; k < template.grid.length; k++) {
					if (template.grid[k].length != template.grid[k - 1].length) {
						return {isValidParse: true, isValidRange: template.range.length > 1, isValidGrid: false};
					}
				}
				return {isValidParse: true, isValidRange: template.range.length > 1, isValidGrid: true};
			}
		};
		this.validateTemplateVsDesign = function(template, flNodes) {
		  	return {isValidRange: template.range.length == flNodes[0].children.length, 
					isValidGrid: template.grid[0].length == flNodes.length};
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

	$scope.doeTemplates = [{name: "Full Factorial (Any Size)", grid: [], range: []}];

	$scope.numClusterings = 3;
	$scope.chooseTargets = false;

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
	          		return {levelTargets: fNode.levelTargets, chooseTargets: $scope.chooseTargets};
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
			          		weights: $scope.weights, numClusterings: $scope.numClusterings, chooseTargets: $scope.chooseTargets};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(items) {
	    	$scope.initialTemp = items.initialTemp;
	    	$scope.numAnnealings = items.numAnnealings;
	    	$scope.toleranceModifier = items.toleranceModifier;

	    	$scope.numClusterings = items.numClusterings;
	    	$scope.chooseTargets = items.chooseTargets;

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
    			var copyNode;
    			if (fl.schema === "org.clothocad.model.Level") {
    				copyNode = new flNode(new level(fl.parameter, fl.design));
    			} else {
    				copyNode = new flNode(new factor(dummyVaria, fl.design));
    			}
    			event.source.nodeScope.$modelValue.targetDisplay = "";
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, copyNode);
    		}
    	}
  	};

  	$scope.generateDesigns = function() {
  		var outputData = [[]];
  		var isValidExperimentalDesign = function(flNodes) {
			var i;
			for (i = 1; i < flNodes.length; i++) {
				if (flNodes[i].children.length < 2 || flNodes[i].children.length != flNodes[i - 1].children.length) {
					return false;
				}
			}
			return true;
		};
  		if ($scope.flNodes.length == 0) {
  			alertUser("lg", "Error", "Factorial design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column " 
					+ "to the center column.");
  		} else if (!isValidExperimentalDesign($scope.flNodes)) {
			alertUser("lg", "Error", "Factorial design does not have the same number of levels associated with each factor or this number is less "
					+ "than two. Upload parameterized features and select 'Assign Levels' or drag levels from the rightmost column to the center "
					+ "column.");
		} else {
			var templater = new doeTemplater();
			var i;
	  		if ($scope.selectedTemplate.name === "Full Factorial (Any Size)" && $scope.selectedTemplate.range.length == 0) {
	  			for (i = 0; i < $scope.doeTemplates.length; i++) {
	  				if ($scope.flNodes[0].children.length == $scope.doeTemplates[i].range.length 
		  					&& $scope.doeTemplates[i].grid.length == Math.pow($scope.doeTemplates[i].range.length, $scope.doeTemplates[i].grid[0].length)) {
	  					$scope.selectedTemplate = $scope.doeTemplates[i];
	  					i = $scope.doeTemplates[i].length;
	  				}
	  			}
	  			if ($scope.selectedTemplate.name === "Full Factorial (Any Size)" && $scope.selectedTemplate.range.length == 0) { 
				  	$scope.doeTemplates.push(templater.fullFactorial($scope.flNodes.length, $scope.flNodes[0].children.length));
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
	  		}
	  		var templateValidation = templater.validateTemplateVsDesign($scope.selectedTemplate, $scope.flNodes);
	  		if (!templateValidation.isValidRange || !templateValidation.isValidGrid) {
	  			var errorMessage = "";
	  			if (!templateValidation.isValidRange) {
  					errorMessage += "Range of values in DOE template is not equal in size to the number of levels associated with each factor in the "
  							+ "factorial design. Upload or select a template that has a range of " + $scope.flNodes[0].children.length + " non-identical "
  							+ "numbers.";
	  			}
	  			if (!templateValidation.isValidGrid) {
	  				if (errorMessage.length > 0) {
	  					errorMessage += "<br><br>";
	  				}
	  				errorMessage += "The length of rows in DOE template is not equal to the number of factors in the factorial design. "
	  						+ "Upload or select a template that contains rows of length " + $scope.flNodes.length + ".";
	  			}
	  			alertUser("lg", "Error", errorMessage);
	  		}
	  		if (templateValidation.isValidRange && templateValidation.isValidGrid) {
	  			var i;
	  			for (i = 0; i < $scope.flNodes.length; i++) {
	  				$scope.flNodes[i].children.sort(function(a, b){return a.parameter.value - b.parameter.value})
	  				outputData[0].push($scope.flNodes[i].fl.design.name);
	  			}
	  			var j, k;
	  			for (k = 0; k < $scope.selectedTemplate.grid.length; k++) {
	  				outputData.push([]);
	  				for (i = 0; i < $scope.selectedTemplate.grid[k].length; i++) {
	  					j = $scope.selectedTemplate.range.indexOf($scope.selectedTemplate.grid[k][i]);
	  					outputData[k + 1].push($scope.flNodes[i].children[j].fl.design.name);
	  				}
	  			}
	  		}
  		}
  		return outputData;
  	};

  	$scope.uploadTemplate = function() {
  		if ($scope.templateFiles == null || $scope.templateFiles.length == 0) {
			alertUser("lg", "Warning", "No file selected. Browse and select a DOE template file (.csv) to upload.");
		} else if ($scope.templateFiles[0].name.length < 4 || $scope.templateFiles[0].name.substring($scope.templateFiles[0].name.length - 4) !== ".csv") {
			alertUser("lg", "Error", "Selected file lacks the .csv file extension. Browse and select a DOE template file (.csv) to upload.");
		} else {
			Papa.parse($scope.templateFiles[0], {dynamicTyping: true, 
				complete: function(results) {
					if (results.data.length == 0) {
						alertUser("lg", "Error", "DOE template file contains no data. Browse and select a new DOE template file (.csv) to upload.");
					} else {
						var templater = new doeTemplater();
						var template = templater.parseTemplate($scope.templateFiles[0].name.substring(0, $scope.templateFiles[0].name.length - 4), 
								results.data);
						var templateValidation = templater.validateTemplate(template);
						if (!templateValidation.isValidParse) {
							alertUser("lg", "Error", "Failed to parse DOE template file. Check file format.");
						} else if (!templateValidation.isValidRange || !templateValidation.isValidGrid) {
							var errorMessage = "";
							if (!templateValidation.isValidRange) {
								errorMessage += "DOE template has a range of size one. Upload template that has a range of at least two non-identical numbers.";
							}
							if (!templateValidation.isValidGrid) {
								if (errorMessage.length > 0) {
									errorMessage += "<br><br>";
								}
								errorMessage += "DOE template is not a grid. Upload template that contains rows of equal length.";
							}
							alertUser("lg", "Error", errorMessage);
						} 		
						if (templateValidation.isValidParse && templateValidation.isValidRange && templateValidation.isValidGrid) {
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
			alertUser("lg", "Warning", "No files selected. Browse and select one or more feature files (.csv) to upload.");
		} else if (!isCSV($scope.featFiles)) {
			alertUser("lg", "Error", "One or more of selected files lack the .csv file extension. Browse and select feature files (.csv) to upload.");
		} else {
			$scope.numFeatsUploaded = 0;
			var i;
	    	for (i = 0; i < $scope.featFiles.length; i++) {
	    		Papa.parse($scope.featFiles[i], {i: i, dynamicTyping: true, 
					complete: function(results) {
						if (results.data.length == 0) {
							alertUser("lg", "Error", $scope.featFiles[this.i].name + " contains no data. Browse and select a new feature file (.csv) to upload.");
						} else {
							var designs = $scope.featParsers[$scope.uploadSelector].parseDesigns(results.data);
							if (designs.length == 0) {
								alertUser("lg", "Error", "Failed to parse contents of " + $scope.featFiles[this.i].name + ". Check file format.");
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
		if ($scope.flNodes.length == 0) {
			alertUser("lg", "Error", "Experimental design contains no factors. Upload one or more coding sequences and drag a factor from the leftmost column "
					+ "to the center column.");
		} else if ($scope.lNodes.length < $scope.levelsPerFactor) {
			alertUser("lg", "Error", "The number of available levels does not satisfy the number of levels per factor that you've selected for the experimental "
					+ "design. Select a lower number of levels per factor or upload additional parameterized features.");
		} else {
			var clusterer = new lClusterer();
			var clusterGrid;
			if (!$scope.chooseTargets) {
				clusterGrid = clusterer.lfMeansCluster($scope.levelsPerFactor, $scope.flNodes.length, $scope.numClusterings, $scope.lNodes);
			} else {
				var levelTargetGrid = [];
				var i;
				for (i = 0; i < $scope.flNodes.length; i++) {
					if ($scope.flNodes[i].levelTargets.length > 0) {
						levelTargetGrid.push($scope.flNodes[i].levelTargets);
					} else {
						levelTargetGrid.push([0]);
					}
				}
				clusterGrid = clusterer.targetedCluster(levelTargetGrid, $scope.lNodes);
			}
			var clusterGrid = clusterer.lfMeansCluster($scope.levelsPerFactor, $scope.flNodes.length, $scope.numClusterings, $scope.lNodes);
			var invalidClusters = [];
			var j;
			for (i = 0; i < clusterGrid.length; i++) {
				for (j = 0; j < clusterGrid[i].length; j++) {
					if (clusterGrid[i][j].lNodes.length == 0) {
						invalidClusters.push(clusterGrid[i][j]);
					}
				}
			}
			if (invalidClusters.length > 0) {
				var clusterErrorMessage = "";
				for (j = 0; j < invalidClusters.length; j++) {
					clusterErrorMessage += ", " + invalidClusters[i].target.toFixed(2);
				}
				clusterErrorMessage = clusterErrorMessage.substring(2);
				clusterErrorMessage += "<br><br>There are no available levels that cluster around the above targets. Change these targets or upload additional "
						+ "features with parameters that are close to them in magnitude.";
				alertUser("lg", "Error", clusterErrorMessage);
			} else {
				if (!$scope.chooseTargets) {
					for (i = 0; i < clusterGrid.length; i++) {
						$scope.flNodes[i].levelTargets = [];
						for (j = 0; j < clusterGrid[i].length; j++) {
							$scope.flNodes[i].levelTargets.push(parseFloat(clusterGrid[i][j].target.toFixed(2)));
						}
					}
				}
				var solver = new flSolver();
				// var soln = solver.randomSolve($scope.flNodes.length, $scope.levelsPerFactor, clusterGrid, $scope.weights, $scope.trialLimit);
				var soln = solver.annealSolve($scope.flNodes.length, $scope.levelsPerFactor, clusterGrid, $scope.initialTemp, $scope.weights, 
						$scope.numAnnealings);
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