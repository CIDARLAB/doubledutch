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
				name = name + " + " + feats[i].name;
			}
			return name.substring(3);
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

	function flSolution(levelSelections, levelScorings) {
		this.levelSelections = levelSelections;
		this.levelScorings = levelScorings;
		this.getScore = function() {
			var score = 0;
			var i, j, k;
			for (i = 0; i < this.levelSelections.length; i++) {
				for (j = 0; j < this.levelSelections[i].length; j++) {
					k = this.levelSelections[i][j];
					score += this.levelScorings[i][k].score;
				}
			}
			return score;
		};
		this.getHomology = function(i, j, iMax) {
			var indices = [];
			var k = this.levelSelections[i][j];
			var feats = this.levelScorings[i][k].level.fl.design.module.getFeatures();
			var usedFeats;
			var d;
			var isHomologous = function (feats1, feats2) {
				for (d = 0; d < feats1.length; d++) {
					if (feats2.indexOf(feats1[d]) >= 0) {
						return true;
					}
				}
				return false;
			};
			var a, b, c;
			for (a = 0; a < iMax; a++) {
				if (a == i && i == iMax) {
					for (b = 0; b < j; b++) {
						c = this.levelSelections[i][b];
						usedFeats = this.levelScorings[i][c].level.fl.design.module.getFeatures();
						if (isHomologous(feats, usedFeats)) {
							indices.push({i: i, j: b});
							// if (!getAll) {
							// 	return indices;
							// }
						}
					}
				} else {
					for (b = 0; b < this.levelSelections[a].length; b++) {
						if (b != j) {
							c = this.levelSelections[a][b];
							usedFeats = this.levelScorings[a][c].level.fl.design.module.getFeatures();
							if (isHomologous(feats, usedFeats)) {
								indices.push({i: a, j: b});
								// if (!getAll) {
								// 	return indices;
								// }
							}
						}
					}
				}
			}
			return indices;	
		};
		// this.isHomologyRisk = function(i, j, iMax) {
		// 	return this.getHomology(i, j, iMax, false).length > 0;
		// };
		this.isHomologyRisk = function() {
			var i, j;
			for (i = 0; i < this.levelSelections.length; i++) {
				for (j = this.levelSelections[i].length - 1; j >= 0; j--) {
					if (this.getHomology(i, j, i).length > 0) {
						return true;
					}
				}
			}
		}
		this.copy = function() {
			var copyGrid = function(grid) {
				var copyGrid = [];
				var i, j;
				for (i = 0; i < grid.length; i++) {
					copyGrid.push([]);
					for (j = 0; j < grid[i].length; j++) {
						copyGrid[i].push(grid[i][j]);
					}
				}
				return copyGrid;
			};
			return new flSolution(copyGrid(this.levelSelections), copyGrid(this.levelScorings));
		};
		// this.getSize = function() {
		// 	if (this.levelSelections.length > 0 && this.levelSelections[0].length > 0) {
		// 		return this.levelSelections.length*this.levelSelections[0].length;
		// 	} else {
		// 		return 0;
		// 	}
		// };
		// this.getLibrarySize = function() {
		// 	var libSize = 0;
		// 	var i;
		// 	for (i = 0; i < this.levelScorings.length; i++) {
		// 		if (this.levelScorings[i].length > 0) {
		// 			libSize += this.levelScorings[i].length;
		// 		}
		// 	}
		// 	return libSize;
		// };
		// this.getLibrary = function() {
		// 	var lib = [];
		// 	var i, j;
		// 	for (i = 0; i < this.levelScorings.length; i++) {
		// 		for (j = 0; j < this.levelScorings[i].length; j++) {
		// 			lib.push(this.levelScorings[i][j].level);
		// 		}
		// 	}
		// 	return lib;
		// };
		// this.isSubOptimal = function(levelScorings, i, j, k, targetSolution) {
		// 	if (targetSolution.score < 0) {
		// 		return false;
		// 	} else {
		// 		var lowerBound = 0;
		// 		var a;
		// 		for (a = i + 1; a < this.levelSelections.length; a++) {
		// 			lowerBound = lowerBound + this.levelSelections[a].length*levelScorings[a][0].score;
		// 		}
		// 		var b = this.levelSelections[i].length - j - 1;
		// 		if (b > 0) {
		// 			lowerBound = lowerBound + b*levelScorings[i][0].score;
		// 		}
		// 		return this.score + levelScorings[i][k].score + lowerBound >= targetSolution.score;
		// 	}
		// };
	}

	function flSolver() {
		this.randomSolve = function(factorCount, levelsPerFactor, levelScorings, mutationTolerance) {
			var levelSelections = [];
		    var i, j;
			for (i = 0; i < levelsPerFactor; i++) {
				levelSelections.push([]);
				for (j = 0; j < factorCount; j++) {
					levelSelections[i].push(0);
				}
			}
  			var soln = new flSolution(levelSelections, levelScorings);
  			var k;
  			for (i = 0; i < soln.levelSelections.length; i++) {
  				for (j = 0; j < soln.levelSelections[i].length; j++) {
  					// if (soln.isHomologyRisk(i, j, soln.levelSelections.length)) {
  					soln = this.mutateSolution(soln, i, j, mutationTolerance);
  					// }
  				}
  			}
    		return soln;
    	};
    	this.mutateSolution = function(soln, initialI, initialJ, mutationTolerance) {
    		var mutantSoln = soln.copy();
    		var indices = [];
    		indices.push({i: initialI, j: initialJ});
    		var oldLength;
    		var mutationStreak = 0;
    		var homoIndices;
    		var isIndexed;
    		// var streaks = [];
    		var i, j, k, a, b;
    		do {
    			oldLength = indices.length;
    			i = indices[0].i;
    			j = indices[0].j;
    			indices.shift();
    			do {
    				k = Math.floor(Math.random()*soln.levelScorings[i].length);
				} while (k == mutantSoln.levelSelections[i][j]);
				mutantSoln.levelSelections[i][j] = k;
    			// if (k == 0 || (k < mutantSoln.levelScorings[i].length - 1 && Math.random() >= 0.5)) {
    			// 	mutantSoln.levelSelections[i][j] = k + 1;
    			// } else {
    			// 	mutantSoln.levelSelections[i][j] = k - 1;
    			// }
    			homoIndices = mutantSoln.getHomology(i, j, mutantSoln.levelSelections.length);
    			for (a = 0; a < homoIndices.length; a++) {
    				isIndexed = false;
    				b = 0;
    				while (!isIndexed && b < indices.length) {
    					if (indices[b].i == homoIndices[a].i && indices[b].j == homoIndices[a].j) {
    						isIndexed = true;
    					} else {
    						b++;
    					}
    				} 
    				if (!isIndexed) {
	    				indices.push({i: homoIndices[a].i, j: homoIndices[a].j});
    				}
    			}
    			if (indices.length >= oldLength) {
    				mutationStreak++;
    				if (mutationStreak > mutationTolerance) {

    					return soln;
    				}
    			} else {
    				// streaks.push(mutationStreak);
    				mutationStreak = 0;
    			}
    		} while (indices.length > 0);
    		// var streakTotal = 0;
    		// for (i = 0; i < streaks.length; i++) {
    		// 	streakTotal += streaks[i];
    		// }
    		// console.log(streakTotal/streaks.length);
    		return mutantSoln;
    	};
    	this.annealSolve = function(factorCount, levelsPerFactor, levelScorings, initialTemp, cycleLimit, mutationTolerance) {
			var bestSoln = this.randomSolve(factorCount, levelsPerFactor, levelScorings, mutationTolerance);
			var soln = bestSoln.copy();
			var cycleCount = 0;
			var temp;
			var mutantSoln;
			var i, j;
			while (cycleCount < cycleLimit) {
				temp = initialTemp;
				while (temp >= 0) {
					i = Math.floor(Math.random()*soln.levelSelections.length);
					j = Math.floor(Math.random()*soln.levelSelections[i].length);
					mutantSoln = this.mutateSolution(soln, i, j, mutationTolerance);
					if (mutantSoln.getScore() <= soln.getScore()) {
						soln = mutantSoln;
						if (soln.getScore() < bestSoln.getScore()) {
							 bestSoln = soln.copy();
						}
					} else if (Math.random() <= Math.exp((soln.getScore() - mutantSoln.getScore())/temp)) {
						soln = mutantSoln;
					}
					temp--;
				}
				cycleCount++;
			}
			return bestSoln;
    	};
	}

	function lClusterer() { 
		this.cluster = function(lNodes, clusterCount, minClusterSize) {
    		var clusters;
	    	var oldClusters; 
	    	var clusteringLimit = 3;
	    	var clusteringCount = 0;
	    	var clusterMeans;
	    	var usedNodes;
	    	var score;
	    	var bestScore;
	    	var bestI;
	    	var hasConverged;
	    	var clusterTotal;
	    	var i, j, k;
	    	do {
		    	clusters = [];
		    	oldClusters = [];
		    	for (i = 0; i < clusterCount; i++) {
			    	clusters.push([]);
		    		oldClusters.push([]);
		    	}
		    	usedNodes = [];
		    	clusterMeans = []; 
				for (i = 0; i < clusterCount; i++) {
		    		do {
			    		k = Math.floor(Math.random()*lNodes.length);
		    		} while (usedNodes.indexOf(lNodes[k]) >= 0);
		    		usedNodes.push(lNodes[k]);
		    		clusterMeans.push(lNodes[k].parameter.value);
		    	}
		    	clusterMeans.sort(function(a, b){return a - b});
		    	do {
			    	for (k = 0; k < lNodes.length; k++) {
			    		bestScore = -1;
			    		for (i = 0; i < clusterCount; i++) {
			    			score = Math.abs(lNodes[k].parameter.value - clusterMeans[i]);
			    			if (bestScore < 0 || score < bestScore) {
			    				bestI = i;
			    				bestScore = score;
			    			}
			    		}
			    		clusters[bestI].push(lNodes[k]);
			    	}
			    	hasConverged = true;
			    	i = 0;
			    	while (hasConverged && i < clusterCount) {
			    		if (clusters[i].length == oldClusters[i].length) {
			    			for (j = 0; j < clusters[i].length; j++) {
			    				if (clusters[i][j] != oldClusters[i][j]) {
			    					hasConverged = false;
			    				}
			    			}
			    		} else {
			    			hasConverged = false;
			    		}
			    		i++;
			    	}
			    	if (!hasConverged) {
				    	for (i = 0; i < clusterCount; i++) {
				    		clusterTotal = 0;
				    		for (j = 0; j < clusters[i].length; j++) {
				    			clusterTotal += clusters[i][j].parameter.value;
				    		}
				    		clusterMeans[i] = clusterTotal/clusters[i].length;
				    		// if (isNaN(clusterMeans[i])) {
				    		// 	console.log("oh noes");
				    		// 	console.log("it happened");
				    		// }
				    	}
				    	for (i = 0; i < clusterCount; i++) {
				    		oldClusters.splice(i, 1, clusters[i]);
				    		clusters[i] = [];
				    	}
			    	}
		    	} while (!hasConverged);
		    	clusteringCount++;
	    	} while (clusteringCount < clusteringLimit && !this.validateClusters(clusters, minClusterSize));
	    	$scope.clusterMeans = clusterMeans;
	    	return clusters;
	    };
	    this.validateClusters = function(clusters, minClusterSize) {
	    	var i;
	    	for (i = 0; i < clusters.length; i++) {
	    		if (!this.validateCluster(clusters[i], minClusterSize)) {
	    			return false;
	    		}
	    	}
	    	return true;
	    }
	    this.validateCluster = function(cluster, minClusterSize) {
	    	if (cluster.length >= minClusterSize) {
	    		var counter = new homologyCounter();
				if (counter.countHomologies(cluster) <= combinatorial(cluster.length, 2) - combinatorial(minClusterSize, 2)) {
	    			return true;
		    	} else {
		    		return false;
		   		}
	    	} else {
    			return false;
    		}
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

	function homologyCounter() {
		this.countHomologies = function(lNodes) {
			var dict = {};
    		var feats;
    		var featHash;
    		var homologyCount = 0;
    		var i, j;
    		for (i = 0; i < lNodes.length; i++) {
    			feats = lNodes[i].fl.design.module.getFeatures();
    			for (j = 0; j < feats.length; j++) {
    				featHash = hash(feats[j]);
    				if (dict[featHash] == null) {
    					dict[featHash] = 0;
    				} else if (dict[featHash] > 0) {
    					homologyCount += dict[featHash];
    					dict[featHash]++;
    				}
    			}
    			for (j = 0; j < feats.length; j++) {
    				featHash = hash(feats[j]);
    				if (dict[featHash] == 0) {
    					dict[featHash]++;
    				}
    			}
    		}
    		return homologyCount;
		};
	}

	function lScorer() { 
		this.scoreClusters = function(clusters) {
			var levelScorings = [];
			var i;
			for (i = 0; i < clusters.length; i++) {
				levelScorings.push(this.normalScore(clusters[i]));
			}
			return levelScorings;
		};
		this.normalScore = function(lNodes) {
	    	var levelScorings = [];
	    	var total = 0;
	    	var i;
    		for (i = 0; i < lNodes.length; i++) {
    			total += lNodes[i].parameter.value;
    		}
    		var mean = total/lNodes.length;
			var squareDiffTotal = 0;
			for (i = 0; i < lNodes.length; i++) {
				squareDiffTotal += Math.pow(lNodes[i].parameter.value - mean, 2);
			}
			var stdDev = Math.sqrt(squareDiffTotal/lNodes.length);
			for (i = 0; i < lNodes.length; i++) {
				levelScorings.push({level: lNodes[i], 
					score: Math.abs(lNodes[i].parameter.value - mean)/stdDev});
			}
			return levelScorings;
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

	$scope.selectedFL;
	$scope.lNodes = [];
	// $scope.targetLevels = [{value: 100}, {value: 1000}, {value: 10000}];
	$scope.fNodes = [];
	$scope.flNodes = [];
	$scope.designParsers = [gridParser, tableParser];
	// $scope.currentParser = $scope.parsers[0];
	$scope.spareFeatures = [];
	$scope.doeParser = doeTemplateParser;
	$scope.doeTemplate;
	$scope.assignmentPenalty = 0;
	$scope.uploadSelector = "0";
	$scope.levelsPerFactor = 2;

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
	        		for (i = 0; i < $scope.fNodes.length; i++) {
	        			feats = addUniqueFeatures(feats, $scope.fNodes[i].fl.design.module.getFeatures());
	        		}
	        		for (i = 0; i < $scope.lNodes.length; i++) {
	        			feats = addUniqueFeatures(feats, $scope.lNodes[i].fl.design.module.getFeatures());
	        		}
	        		var j;
	        		for (i = 0; i < $scope.flNodes.length; i++) {
	        			feats = addUniqueFeatures(feats, $scope.flNodes[i].fl.design.module.getFeatures());
	        			for (j = 0; j < $scope.flNodes[i].nodes.length; j++) {
	        				feats = addUniqueFeatures(feats, $scope.flNodes[i].nodes[j].fl.design.module.getFeatures());
	        			}
	        		}
	        		feats = addUniqueFeatures(feats, $scope.spareFeatures);
	          		return {selectedFeatures: $scope.selectedFL.design.module.getFeatures(), features: feats};
	        	}
	      	}
	    });
	    modalInstance.result.then(function(selectedItem) {
	    	$scope.selectedFL.design.module = $scope.selectedFL.design.grammar.inferModule(selectedItem);
	    	$scope.selectedFL.design.constructNameFromFeatures();
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
    			var copyNode;
    			if (fl.schema === "org.clothocad.model.Level") {
    				copyNode = new flNode(new level(fl.parameter, fl.design));
    			} else {
    				copyNode = new flNode(new factor(dummyVaria, fl.design));
    			}
    			event.source.nodesScope.$modelValue.splice(event.source.index, 0, copyNode);
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
								$scope.fNodes.push(new flNode(new factor(dummyVaria, designs[i])));
							} else {
								j = isParameterizedExpression(designs[i]);
								if (j >= 0) {
									$scope.lNodes.push(new flNode(new level(designs[i].parameters[j], designs[i])));
								} else {
									spareFeats = designs[i].module.getFeatures();
									for (j = 0; j < spareFeats.length; j++) {
										$scope.spareFeatures.push(spareFeats[j]);
									}
									
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
				});
	    	}
    	}
    };

	// $scope.addTarget = function() {
	// 	if (!isNaN($scope.newTarget) && $scope.newTarget !== "") {
	//     	$scope.targetLevels.push({value: $scope.newTarget});
	//     	$scope.newTarget = "";
 //    	} else {
 //    		$scope.targetLevels.push({value: 0});
 //    	}
 //    };

 //    $scope.removeTarget = function() {
 //        if ($scope.targetLevels.length > 2) {
	//         $scope.targetLevels.pop();
 //    	}
 //    };

    // $scope.clusterLevels = function() {
    // 	if ($scope.lNodes.length >= $scope.targetLevels.length) {
	   //  	var usedValues = [];
	   //  	var clusters = [];
	   //  	var prevClusters = [];
	   //  	var i, j;
	   //  	for (i = 0; i < $scope.targetLevels.length; i++) {
	   //  		do {
		  //   		j = Math.floor(Math.random()*$scope.lNodes.length);
	   //  		} while(usedValues.indexOf($scope.lNodes[j].parameter.value) >= 0);
	   //  		// $scope.targetLevels[i].value = Number($scope.lNodes[j].parameter.value.toFixed(2));
	   //  		$scope.targetLevels[i].value = $scope.lNodes[j].parameter.value;
	   //  		clusters.push([]);
	   //  		prevClusters.push([]);
	   //  	}
	   //  	$scope.targetLevels.sort(function(a, b){return a.value - b.value});
	   //  	var k;
	   //  	var levelScore;
	   //  	var bestScore;
	   //  	var clusterTotal;
	   //  	var repeatClustering;
	   //  	do {
	   //  		repeatClustering = false;
	   //  		for (i = 0; i < clusters.length; i++) {
	   //  			clusters.splice(i, 1, []);
	   //  		}	
		  //   	for (i = 0; i < $scope.lNodes.length; i++) {
		  //   		bestScore = -1;
		  //   		for (j = 0; j < $scope.targetLevels.length; j++) {
		  //   			levelScore = Math.pow(($scope.lNodes[i].parameter.value - $scope.targetLevels[j].value), 2);
		  //   			if (bestScore < 0 || levelScore < bestScore) {
		  //   				k = j;
		  //   				bestScore = levelScore;
		  //   			}
		  //   		}
		  //   		clusters[k].push($scope.lNodes[i]);
		  //   		if (prevClusters[k].length < clusters[k].length 
		  //   				|| prevClusters[k][clusters[k].length - 1] != $scope.lNodes[i]) {
		  //   			repeatClustering = true;
		  //   		}
		  //   	}
		  //   	if (repeatClustering) {
			 //    	for (i = 0; i < $scope.targetLevels.length; i++) {
			 //    		clusterTotal = 0;
			 //    		for (j = 0; j < clusters[i].length; j++) {
			 //    			clusterTotal += clusters[i][j].parameter.value;
			 //    		}
			 //    		$scope.targetLevels[i].value = Number((clusterTotal/clusters[i].length).toFixed(2));
			 //    	}
			 //    	for (i = 0; i < prevClusters.length; i++) {
		  //   			prevClusters.splice(i, 1, clusters[i]);
		  //   		}	
		  //   	}
	   //  	} while (repeatClustering);
    // 	}
    // };

	$scope.assignLevels = function() {
		if ($scope.flNodes.length >= 1 && $scope.lNodes.length >= $scope.levelsPerFactor*$scope.flNodes.length) {
		  //   var initializeSelections = function() {
		  //   	var levelSelections = [];
			 //    var i, j;
				// for (i = 0; i < $scope.levelsPerFactor; i++) {
				// 	levelSelections.push([]);
				// 	for (j = 0; j < $scope.flNodes.length; j++) {
				// 		levelSelections[i].push(0);
				// 	}
				// }
				// return levelSelections;
		  //   };
			
			var clusterer = new lClusterer();
			var clusters = clusterer.cluster($scope.lNodes, $scope.levelsPerFactor, $scope.flNodes.length);
			
			if (clusterer.validateClusters(clusters, $scope.flNodes.length)) {
				// var levelSelections = initializeSelections();

				var scorer = new lScorer();
				var levelScorings = scorer.scoreClusters(clusters);

				// var initialSoln = new flSolution(levelSelections, levelScorings);

				var counter = new homologyCounter();
	    		var homologyCount = counter.countHomologies($scope.lNodes);
	    		var mutationTolerance = 10*Math.ceil(1/Math.pow(1 - 2*homologyCount/Math.pow($scope.lNodes.length, 2), 
		    			$scope.flNodes.length*$scope.levelsPerFactor - 1));
				
				var solver = new flSolver();
				// var soln = solver.randomSolve($scope.flNodes.length, $scope.levelsPerFactor, levelScorings, mutationTolerance);
				var soln = solver.annealSolve($scope.flNodes.length, $scope.levelsPerFactor, levelScorings, 100, 10, mutationTolerance);

				if (!soln.isHomologyRisk()) {
					$scope.assignmentPenalty = soln.getScore();
					var i;
					for (i = 0; i < $scope.flNodes.length; i++) {
						$scope.flNodes[i].nodes = [];
					}
					var j, k;
					for (i = 0; i < soln.levelSelections.length; i++) {
						for (j = 0; j < soln.levelSelections[i].length; j++) {
							k = soln.levelSelections[i][j];
							$scope.flNodes[j].nodes.push(levelScorings[i][k].level);
						}
					}
				} else {
					console.log("assignment failed");
				}
			} else {
				console.log("assignment impossible: invalid cluster");
			}
		} else {
			console.log("assignment impossible: insufficient factors or levels");
		}
	};
});