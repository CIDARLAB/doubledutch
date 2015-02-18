/**
 * Created by prash on 2/10/15.
 */
var n_in = 3;
function addNewRow()
{
    n_in = Number(n_in) + 1;
    sessionStorage.n_keys = n_in;

    $('#keyValueForm').append("<tr style='margin-top: 10px;'> <td> <div class='form-group' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='key"+n_in+ "' >Key:</label>" +
    "<input type='text' class='form-control' id='key" +n_in + "' placeholder='Key'>"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='value"+n_in+ "'>Value:</label>"+
    "<input type='text' class='form-control' id='value"+n_in+ "' placeholder='Value'>"+
    "</div> </td>"+
    "</tr>");
    //"<td> <button class='btn btn-info btn-sm' onclick='' style='margin-left: 10px; margin-bottom: 10px; id='btn"+n_in+ "'><span class='glyphicon glyphicon-plus'></span></button> </td> </tr>");
    //"<td> <button class='btn btn-danger btn-sm' onclick='deleteRow("+n_in+")' style='margin-left: 10px; margin-bottom: 10px; id='btn"+n_in+ "'><span class='glyphicon glyphicon-minus'></span></button> </td> </tr>");

}

function deleteRow(Rowid)
{
    alert(Rowid);
    var table = document.getElementById("keyValueForm");

}

function initializeCreatePage()
{
    resetForm();
}





function submitJSON()
{
    var table = document.getElementById("keyValueForm");
    len = table.rows.length;

    var q = '"';
    var obj = "{";

    var idkey = $('#idKey').val();
    var idvalue = $('#idValue').val();

    var namekey = $('#nameKey').val();
    var namevalue = $('#nameValue').val();

    var schemakey = $('#schemaKey').val();
    var schemavalue = $('#schemaValue').val();


    if(!namevalue == "")
    {

        obj += q + namekey + q+ ":" + q + namevalue +q;
        //obj += "'+ namekey +':'+ namevalue +'";
    }
    else
    {
        alert("Please make sure you enter a Value for name");
        return false;
    }

    if(!idvalue == "")
    {
        obj += "," + q + idkey + q+ ":" + q + idvalue +q;
    }

    if(!schemavalue == "")
    {
        obj += "," + q + schemakey + q+ ":" + q + schemavalue +q;
    }
    for(i=4;i<=len;i++)
    {
        var valNum = "value"+i;
        var idNum = "key"+i;
        var keyVal = document.getElementById(idNum).value;
        var valueVal = document.getElementById(valNum).value;
        if((!(keyVal=="")) && (!(valueVal== "")))
        {
            obj += "," + q + keyVal + q+ ":" + q + valueVal +q;
        }
        //    obj += i;
    }


    obj += "}";
    var jsonObj = JSON.parse(obj);

    /*obj = {"name":"MyNewPart", "sequence":"GGGGGG"};
    var obj1;
    obj1[idkey] = idvalue;
    obj1[namekey] = namevalue;
    obj1[schemakey] = schemavalue;
    alert(obj);*/
    Clotho.create(jsonObj).then(function(data){
        alert("Part with id "+data+ " successfully created.");
    });

}



function resetForm()
{
    var input_table = document.getElementById("keyValueForm");
    while(input_table.rows.length > 0) {
        deleterow("keyValueForm");
    }
    n_in = 3;
    initializeForm();

    //$('#keyValueForm');
}

function initializeForm()
{

    $('#keyValueForm').append("<tr  style=' margin-top: 10px;'> <td> <div class='form-group ' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='nameKey'"+ " >Name:</label>" +
    "<input type='text' class='form-control' id='nameKey'"  + " placeholder='name' value='name' disabled>"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='nameValue'" + ">Value:</label>"+
    "<input type='text' class='form-control' id='nameValue'" + " placeholder='Value'>"+
    "</div> </td>"+
    "</tr>");
    //"<td> <button class='btn btn-info btn-sm' onclick='addNewRow()' style='margin-left: 10px; margin-bottom: 10px;'><span class='glyphicon glyphicon-plus'></span></button> </td>


    $('#keyValueForm').append("<tr style='margin-top: 10px;'> <td> <div class='form-group' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='schemaKey'"+ " >Schema:</label>" +
    "<input type='text' class='form-control' id='schemaKey'"  + " placeholder='schema' value='schema' disabled>"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='schemaValue'" + ">Value:</label>"+
    "<input type='text' class='form-control' id='schemaValue'" + " placeholder='Value'>"+
    "</div> </td>"+
    "</tr>");
    //"<td> <button class='btn btn-info btn-sm' onclick='addNewRow()' style='margin-left: 10px; margin-bottom: 10px;'><span class='glyphicon glyphicon-plus'></span></button> </td> " +




    $('#keyValueForm').append("<tr style='margin-top: 10px;'> <td> <div class='form-group' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='idKey'"+ " >id:</label>" +
    "<input type='text' class='form-control' id='idKey'"  + " placeholder='id' value='id' disabled>"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='idValue'" + ">Value:</label>"+
    "<input type='text' class='form-control' id='idValue'" + " placeholder='Value'>"+
    "</div> </td>"+
    "<td> <button class='btn btn-info btn-sm' onclick='addNewRow()' style='margin-left: 10px; margin-bottom: 10px;'><span class='glyphicon glyphicon-plus'></span></button> </td> </tr>");
}

function deleterow(tableID) {
    var table = document.getElementById(tableID);
    var rowCount = table.rows.length;

    table.deleteRow(rowCount -1);
}



//File Upload:


function uploadCSV()
{
    var file = document.getElementById('file').files[0];
    //alert(file);
    var results = Papa.parse(file, {
        header: true,
        complete: function(results) {

            console.log(results);
            var objRes = JSON.stringify(results.data);
            Clotho.create(results.data).then(function(dataCreate){
                alert(dataCreate);
                alert(dataCreate.length +" objects created.");
            });

            //alert(objRes);
        }
    });
    //var obj = JSON.stringify(JSON.parse(results),null,2);
    //var obj = JSON.stringify(results);
    //alert(results);


}

