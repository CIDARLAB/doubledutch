/**
 * Created by prash on 2/25/15.
 */
function storeDissimilarityScore()
{
    var assignArray = clotho.query({schema:"org.cellocad.assignment.mux"});
    return assignArray[0].get("index");
    /*for(var i=0;i<assignArray.length;i++){

    }*/
}