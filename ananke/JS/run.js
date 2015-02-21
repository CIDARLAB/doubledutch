/**
 * Created by prash on 2/17/15.
 */
var n_in = 0;
function initializeRunPage()
{
    resetFunctionsForm();


    //resetForm();
}

function resetFunctionsForm()
{
    emptyMenu();
    var funcQuer = {};
    funcQuer.schema = "org.clothocad.core.datums.Function";
    var jsFunc=[];
    var pythFunc=[];


    var a = document.createElement("a");
    a.setAttribute("role","menuitem");
    a.setAttribute("tabIndex","-1");
    a.setAttribute("id","org.clothocad.something");
    a.setAttribute("onclick","loadFunction(this)");
    a.appendChild(document.createTextNode("FUNCTION!!!"));

    var li = document.createElement("li");
    li.setAttribute("role","presentation");
    li.appendChild(a);

    var ul = document.getElementById("funcMenu");
    //ul.appendChild(li);



    Clotho.query(funcQuer).then(function(dataFuncQ) {

        var first = true;


        for(var i=0;i<dataFuncQ.length;i++)
        {
            if(dataFuncQ[i].language == "JAVASCRIPT")
            {
                if(first)
                {

                    var liHeader = document.createElement("li");
                    liHeader.setAttribute("role","presentation");
                    liHeader.setAttribute("class","dropdown-header");
                    liHeader.appendChild(document.createTextNode("JavaScript"));
                    ul.appendChild(liHeader);
                    first = false;

                }
                var a = document.createElement("a");
                a.setAttribute("role","menuitem");
                a.setAttribute("tabIndex","-1");
                a.setAttribute("id",dataFuncQ[i].id);
                a.setAttribute("onclick","loadFunction(this)");
                a.appendChild(document.createTextNode(dataFuncQ[i].name));

                var li = document.createElement("li");
                li.setAttribute("role","presentation");
                li.appendChild(a);
                ul.appendChild(li);
                //jsFunc[jsFunc.length] = dataFuncQ[i].name;
            }
        }
        first = true;
        for(var i=0;i<dataFuncQ.length;i++)
        {
            if(dataFuncQ[i].language == "PYTHON")
            {
                if(first)
                {
                    var liDiv = document.createElement("li");
                    liDiv.setAttribute("role","presentation");
                    liDiv.setAttribute("class","divider");
                    ul.appendChild(liDiv);

                    var liHeader = document.createElement("li");
                    liHeader.setAttribute("role","presentation");
                    liHeader.setAttribute("class","dropdown-header");
                    liHeader.appendChild(document.createTextNode("Python"));
                    ul.appendChild(liHeader);
                    first = false;
                }
                var a = document.createElement("a");
                a.setAttribute("role","menuitem");
                a.setAttribute("tabIndex","-1");
                a.setAttribute("id",dataFuncQ[i].id);
                a.setAttribute("onclick","loadFunction(this)");
                a.appendChild(document.createTextNode(dataFuncQ[i].name));

                var li = document.createElement("li");
                li.setAttribute("role","presentation");
                li.appendChild(a);
                ul.appendChild(li);
                //pythFunc[pythFunc.length] = dataFuncQ[i].name;
            }
        }
    });
}



function emptyMenu()
{
    var ul = document.getElementById('funcMenu');
    if (ul)
    {
        while (ul.firstChild)
        {
            ul.removeChild(ul.firstChild);
        }
    }
}



function resetForm()
{
    var input_table = document.getElementById("functionArgsTable");
    while(input_table.rows.length > 0) {
        deleterow("functionArgsTable");
    }
    n_in = 0;
    var el = document.getElementById('FunctionCode');
    var elLabel = document.getElementById('FunctionLabel');
    var elBtn = document.getElementById('runFunctionBtn');
    var elAPanel = document.getElementById('argsLabel');
    if(el!= undefined){
        document.getElementById('functionParams').removeChild(el);
    }
    if(elLabel != undefined)
    {
        document.getElementById('functionParams').removeChild(elLabel);
    }
    if(elBtn != undefined)
    {
        document.getElementById('functionParams').removeChild(elBtn);
    }
    if(elAPanel != undefined)
    {
        document.getElementById('argsLabelPanel').removeChild(elAPanel);
    }

    //document.getElementById('jsonText').value = "";
    //initializeForm();
}




function getJSONquery()
{
    var table = document.getElementById("functionArgsTable");
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


function loadFunction(opt)
{

    var funcQuer = {};
    funcQuer.id = opt.id;


    Clotho.queryOne(funcQuer).then(function(dataFuncQ) {

        resetForm();
        if(dataFuncQ.args != undefined)
        {
            var first = true;
            n_in = 0;
            for(var i=0;i<dataFuncQ.args.length;i++)
            {
                if(first)
                {
                    var argsLabel = document.createElement("label");
                    argsLabel.setAttribute("id","argsLabel");
                    argsLabel.appendChild(document.createTextNode("Args:"));
                    var aPanel = document.getElementById('argsLabelPanel');
                    aPanel.appendChild(argsLabel);
                    first = false;
                }
                addNewRow(dataFuncQ.args[i].name,dataFuncQ.args[i].type);
            }
        }
        else
        {
            // Do something?
        }
        if(dataFuncQ.code != undefined)
        {
            var label =  document.createElement("label");
            label.setAttribute("id","FunctionLabel");
            label.appendChild(document.createTextNode("Code: "));
            var funcParams = document.getElementById('functionParams');
            funcParams.appendChild(label);


            addNewTextRow(dataFuncQ.code);

            var btn = document.createElement("button");
            btn.setAttribute("id","runFunctionBtn");
            btn.setAttribute("class","btn btn-primary");
            btn.setAttribute("style","margin-top:10px;");

            btn.appendChild(document.createTextNode("Run Function"));

            funcParams.appendChild(btn);


        }
        else
        {
            //Do something?
        }



    });


    //document.getElementById('buttonContent').value = optVal;
    //alert(optVal.id);
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



function addNewRow(nameVal,typeVal)
{
    n_in = Number(n_in) + 1;
    sessionStorage.n_keys = n_in;

    $('#functionArgsTable').append("<tr style='margin-top: 10px;'> <td> <div class='form-group' style='margin-bottom: 10px;'>"+
    "<label class='sr-only' for='arg"+n_in+ "' >Key:</label>" +
    "<input type='text' class='form-control' id='arg" +n_in + "' value='"+nameVal+"' title='"+typeVal+"' disabled >"+
    "</div> </td>"+
    "<td> <div class='form-group' style='margin-left: 10px; margin-bottom: 10px;'>"+
    "<label class='sr-only' for='argVal"+n_in+ "'>Value:</label>"+
    "<input type='text' class='form-control' id='argVal"+n_in+ "' placeholder='Value'>"+
    "</div> </td>"+
    "</tr>");
}


function addNewTextRow(codeVal)
{
    var textArea =  document.createElement("textarea");
    textArea.setAttribute("id","FunctionCode");
    textArea.setAttribute("class","form-control");
    textArea.setAttribute("rows","15");
    textArea.setAttribute("disabled","true");
    textArea.appendChild(document.createTextNode(codeVal));


    var funcParams = document.getElementById('functionParams');

    funcParams.appendChild(textArea);



}



function deleterow(tableID) {
    var table = document.getElementById(tableID);
    var rowCount = table.rows.length;

    table.deleteRow(rowCount -1);
}

