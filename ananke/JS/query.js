/**
 * Created by prash on 2/17/15.
 */
var n_in = 1;
function initializeQueryPage()
{

    resetForm();
}
function resetForm()
{
    var input_table = document.getElementById("keyValueForm");
    while(input_table.rows.length > 0) {
        deleterow("keyValueForm");
    }
    n_in = 1;
    document.getElementById('jsonText').value = "";
    document.getElementById('jsonText').disabled = true;
    document.getElementById('editJSONButton').style.visibility = "hidden";
    document.getElementById('updateJSONButton').style.visibility = "hidden";
    initializeForm();
}


function syntaxHighlight(json) {
    json = json.replace(/&/g, '&').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}



function getJSONquery()
{
    var table = document.getElementById("keyValueForm");
    len = table.rows.length;

    var q = '"';
    var obj = "{";


    var idkey = $('#idKey').val();
    var idvalue = $('#idValue').val();

    if((!(idvalue == "")) && (!(idkey == "")))
    {
        obj += q + idkey + q+ ":" + q + idvalue +q;
    }
    for(i=2;i<=len;i++)
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
    return obj;
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
}


function enableText(){
    document.getElementById('jsonText').disabled = false;
    document.getElementById('updateJSONButton').style.visibility = "visible";
    //document.getElementById('updateJSONButton').style.visibility = "visible";

}

function updateJSON()
{

    var textJSON =  document.getElementById('jsonText').value;

    alert(textJSON);

    try{
        var objJSON = JSON.parse(textJSON);

        Clotho.set(objJSON).then(function(dataSet) {
            //var arrLen = dataSet.length;
            alert("Objects successfully modified");
        });

        document.getElementById('jsonText').value = "";
        document.getElementById('jsonText').disabled = true;
        document.getElementById('editJSONButton').style.visibility = "hidden";
        document.getElementById('updateJSONButton').style.visibility = "hidden";

    }catch(err)
    {
        alert("Error in Parsing edited JSON");
    }

}


function queryOneObj() {
    var str = getJSONquery();
    if (str != null)
    {
        //alert(str);
        var jsonObj = JSON.parse(str);
        if(isEmpty(jsonObj))
        {
            alert("Empty Query. Please enter at least 1 valid query");
        }
        else
        {
            Clotho.queryOne(jsonObj).then(function(dataQuery) {
                var jsonStr = JSON.stringify(dataQuery, undefined, 4);
                document.getElementById('jsonText').value = jsonStr;
                //document.getElementById('jsonText').value = syntaxHighlight(jsonStr);

                document.getElementById('editJSONButton').style.visibility = "visible";
            });
        }
    }

}

function queryAllObj()
{
    var str = getJSONquery();
    if (str != null)
    {
        //alert(str);
        var jsonObj = JSON.parse(str);
        if(isEmpty(jsonObj))
        {
            alert("Empty Query. Please enter at least 1 valid query");
        }
        else
        {
            Clotho.query(jsonObj).then(function(dataQuery) {
                jsonStr = JSON.stringify(dataQuery, undefined, 3);

                document.getElementById('jsonText').value = jsonStr;
            });
        }
    }
}


function initializeForm()
{
    $('#keyValueForm').append("<tr style='margin-top: 10px;'> <td> <div class='form-group' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='idKey'"+ " >id:</label>" +
    "<input type='text' class='form-control' id='idKey'"  + " placeholder='id'>"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='idValue'" + ">Value:</label>"+
    "<input type='text' class='form-control' id='idValue'" + " placeholder='Value'>"+
    "</div> </td>"+
    "<td> <button class='btn btn-info btn-sm' onclick='addNewRow()' style='margin-left: 10px; margin-bottom: 10px;'><span class='glyphicon glyphicon-plus'></span></button> </td> </tr>");
}



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



function deleterow(tableID) {
    var table = document.getElementById(tableID);
    var rowCount = table.rows.length;

    table.deleteRow(rowCount -1);
}

