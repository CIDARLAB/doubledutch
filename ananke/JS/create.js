/**
 * Created by prash on 2/10/15.
 */
var n_in = 0;
function addNewRow()
{
    n_in = Number(n_in) + 1;
    sessionStorage.n_keys = n_in;

    $('#keyValueForm').append("<tr style='margin-top: 10px;'> <td> <div class='form-group' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='key'"+n_in+ " >Key:</label>" +
    "<input type='text' class='form-control' id='key'" +n_in + " placeholder='Key'>"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='value'"+n_in+ ">Value:</label>"+
    "<input type='text' class='form-control' id='value'"+n_in+ " placeholder='Value'>"+
    "</div> </td>"+
    "<td> <button class='btn btn-info btn-sm' onclick='addNewRow()' style='margin-left: 10px; margin-bottom: 10px;'><span class='glyphicon glyphicon-plus'></span></button> </td> </tr>");
}

function initializeForm()
{
    var input_table = document.getElementById("keyValueForm");
    while(input_table.rows.length > 0) {
        deleterow("keyValueForm");
    }
    //$('#keyValueForm');
}
function deleterow(tableID) {
    var table = document.getElementById(tableID);
    var rowCount = table.rows.length;

    table.deleteRow(rowCount -1);
}