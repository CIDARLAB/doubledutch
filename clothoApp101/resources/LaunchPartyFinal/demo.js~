function uploadCSV()
{
    var file = document.getElementById('file').files[0];
    Clotho.uploadCSV(file, {header: true,cello:true});
    alert("CSV Data sent to Clotho");

}

function getCluster()
{
    clusterResults.value = "";
    var circuitName = document.getElementById('circuitName').value;
    var matrix = Clotho.run({function:'org.cellocad.assignment',args:[circuitName]}).then(function(result){
        var clusterVal = Clotho.run({function:'org.cellocad.cluster',args:[result]}).then(function(cluster){
            for(var i=0;i<cluster.length;i++)
            {
                clusterResults.value += "Group " + i + " : \n" + cluster[i].group + "\n\n";
            }
        });
    });


}


function login(){
    user = document.getElementById('username').value;
    pass = document.getElementById('password').value;

    Clotho.login(user,pass).then(function(loginResult){
        if(loginResult.accessToken == "dummy") {
            alert("Login successful");
        }
    });
}
