(function() {
    var scoreDifference = function(assignment1, assignment2){
        var difference = 0;
        for (var i=0; i<assignment1.length & i<assignment2.length; i++){
            var part1 = assignment1[i].toLowerCase();
            var part2 = assignment2[i].toLowerCase();
            if (part1 != part2)
                difference = difference + (part1.startsWith('p') ? 1 : 2);
        }
        return difference;
    }

    var calcDifferences = function (circuitName){
        var assignments = clotho.query({circuit:circuitName, 
            schema:"org.cellocad.circuit.mux"});

        var scoreMatrix = [];

        for (var i=0; i<assignments.length; i++){
            var scores = [];
            for (var j=0; j<assignments.length; j++){
                scores.push(scoreDifference(assignments[i+1], assignments[j+1]));
            }
            scoreMatrix.push(scores);
        }
        return scoreMatrix;
    }

    return calcDifferences;
}())

    
    
