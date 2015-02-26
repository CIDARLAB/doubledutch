function uploadCSV()
{
    var file = document.getElementById('file').files[0];
    //alert(file);

    Clotho.uploadCSV(file, {header: true});

    alert("objects created.");

}

function getCluster()
{
    var circuitName = document.getElementById('circuitName').value;
    var matrix = Clotho.run({function:'org.cellocad.assignment',args:[circuitName]}).then(function(result){
        console.log(JSON.stringify(result));
        var clusterVal = Clotho.run({function:'org.cellocad.cluster',args:[result]}).then(function(cluster){
            alert(JSON.stringify(cluster));
        });
    });


}


function login(){
    Clotho.login('write','write');
}