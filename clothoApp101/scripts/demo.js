/**
 * Created by prash on 2/22/15.
 */

function uploadCSV()
{
    file = document.getElementById('file').files[0];
    csvOptions = {};
    csvOptions.header = true;
    Clotho.uploadCSV(file,csvOptions).then(function(data){
        alert(JSON.stringify(data));
    });
}

function test(){
    obj = {"name":"My Part", "sequence":"ACTGACTG"};
    Clotho.create(obj).then(function(data){
        alert(JSON.stringify(data));
    });
}