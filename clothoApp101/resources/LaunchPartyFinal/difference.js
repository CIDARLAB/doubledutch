(function() {
    var isPromoter = function(partName){
        return partName.toLowerCase()[0] == 'p';
    }

    var scoreDifference = function(assignment1, assignment2){
        assignment1 = assignment1.assignArray;
        assignment2 = assignment2.assignArray;
        var length = assignment1.length;

        var difference = 0;
        for (var i=0; i<length; i++){
            var part1 = assignment1[i].toLowerCase();
            var part2 = assignment2[i].toLowerCase();
            if (part1 != part2)
                difference = difference + (isPromoter(part1) ? 1 : 2);
        }
        return difference;
    }

    var calcDifferences = function(circuitName){
        var assignments = clotho.query({circuit:circuitName,
            schema:"org.cellocad.circuit.mux"});

        var scoreMatrix = [];

        for (var i=0; i<assignments.length; i++){
            var scores = [];
            for (var j=0; j<assignments.length; j++){
                scores.push(scoreDifference(assignments[i], assignments[j]));
            }
            scoreMatrix.push(scores);
        }
        return scoreMatrix;
    }

    return calcDifferences;
}())
