/**
 * Created by prash on 2/9/15.
 */
jQuery(document).ready(function () {
    jQuery('.tabs .tab-links a').on('click', function (e) {
        var currentAttrValue = jQuery(this).attr('href');

// Show/Hide Tabs
        jQuery('.tabs ' + currentAttrValue).show().siblings().hide();

// Change/remove current tab to active
        jQuery(this).parent('li').addClass('active').siblings().removeClass('active');

        e.preventDefault();
    });
});
function inputFocus(i) {
    if (i.value == i.defaultValue) {
        i.value = "";
        i.style.color = "#000";
    }
}
function inputBlur(i) {
    if (i.value == "") {
        i.value = i.defaultValue;
        i.style.color = "#888";
    }
}
function displayQueriedParts(data) {
    var parts = [];
    var out = document.getElementById('outputWindow');
    for (i = 0; i < data.length; i++) {
        if (data[i].schema == "org.clothocad.model.BasicPart" || data[i].schema == "org.clothocad.model.CompositePart") {
            parts[parts.length] = data[i];
        }
    }
    if (parts.length != 1) {
        out.value += (parts.length + " parts were found:\n");
    } else if (parts.length == 1) {
        out.value += "1 part was found:\n";
    }
    for (i = 0; i < parts.length; i++) {
        out.value += (JSON.stringify(parts[i]) + "\n");
    }
    out.value += "\n";
}
function displayQueriedObjects(data) {
    var out = document.getElementById('outputWindow');
    if (data.length != 1) {
        out.value += (data.length + " objects were found:\n");
    } else if (parts.length == 1) {
        out.value += "1 object was found:\n";
    }
    for (i = 0; i < data.length; i++) {
        out.value += (JSON.stringify(data[i]) + "\n");
    }
    out.value += "\n";
}
function refreshFunctions() {
    Clotho.query("schema", "org.clothocad.core.datums.Function").then(function (data) {
        //alert(data.length);
        var dropdownMenu = document.getElementById('presetFunctions');
        $('#presetFunctions').empty();
        //alert(dropdownMenu.selectedIndex);
        for (var i = 0; i < data.length; i++) {
            if (data[i].language == "JAVASCRIPT" && data[i].name != "functionX") {
                var option = document.createElement('option');
                option.value = data[i].name;
                option.text = data[i].name;
                //alert(data[i].name);
                dropdownMenu.appendChild(option);
            }

        }
    }).done();
}


$(document).ready(function () {

    $('#funcTab').click(function () {
        refreshFunctions();
    });

    $("#queryAuthor").click(function () {
        var authorText = document.getElementById('authorQuery').value;
        var out = document.getElementById('outputWindow');
        if (authorText.length > 0) {
            Clotho.query("author", {name: authorText}).then(function (data) {
                displayQueriedParts(data);
            }).done();
        } else {
            out.value += "Query failed. Part author is missing.\n\n";
        }
    });

    $("#queryType").click(function () {
        var typeText = document.getElementById('typeQuery').value;
        var out = document.getElementById('outputWindow');
        if (typeText.length > 0) {
            Clotho.query("type", typeText).then(function (data) {
                displayQueriedParts(data);
            }).done();
        } else {
            out.value += "Query failed. Part type is missing.\n\n";
        }
    });

    $("#queryName").click(function () {
        var nameText = document.getElementById('nameQuery').value;
        var out = document.getElementById('outputWindow');
        if (nameText.length > 0) {
            Clotho.query("name", nameText).then(function (data) {
                displayQueriedParts(data);
            }).done();
        } else {
            out.value += "Query failed. Part name is missing.\n\n";
        }
    });

    $("#queryProperty").click(function () {
        var propertyText = document.getElementById('propertyQuery').value;
        var valueText = document.getElementById('valueQuery').value;
        var out = document.getElementById('outputWindow');
        if (propertyText.length > 0 && valueText.length > 0) {
            if (valueText.length > 1 && valueText.charAt(0) == "{" && valueText.charAt(valueText.length - 1) == "}") {
                var valueObject = JSON.parse(valueText);
                Clotho.query(propertyText, valueObject).then(function (data) {
                    displayQueriedObjects(data);
                }).done();
            } else {
                Clotho.query(propertyText, valueText).then(function (data) {
                    displayQueriedObjects(data);
                }).done();
            }
        } else {
            out.value += "Query failed. ";
            if (propertyText.length == 0) {
                out.value += "Object property is missing. ";
            }
            if (valueText.length == 0) {
                out.value += "Property value is missing.";
            }
            out.value += "\n\n";
        }
    });

    $('#clothoQuery').keypress(function (e) {
        if (e.keyCode == 13) {
            var text;
            var queryVal = document.getElementById('clothoQuery').value;
            Clotho.get(queryVal).then(function (data) {
                var found = false;
                if (data != null) {
                    document.getElementById('debugWindow').value += ("Object Found. Name: " + data.name + " \n");
                    found = true;
                }
                if (!found) {
                    document.getElementById('debugWindow').value += ("No results obtained\n");
                }
                document.getElementById('clothoQuery').value = "";
            }).done();
            return false;
        }
    });


    $('#runFunction').click(function () {
        var func = {};
        func.name = document.getElementById('funcName').value;
        func.language = "JAVASCRIPT";
        func.schema = "org.clothocad.core.datums.Function";
        func.code = document.getElementById('functionVal').value;
        var argData = document.getElementById('functionArgs').value.split("\n");
        var argJson = "[";
        for (i = 0; i < argData.length; i++) {
            var argDatum = argData[i].trim();
            if (argDatum.length > 0) {
                argJson += ("{" + argDatum + "},");
            }
        }
        if (argJson.length > 1) {
            argJson = argJson.substring(0, argJson.length - 1);
        }
        argJson += "]";
        func.args = JSON.parse(argJson);
        Clotho.create(func).then(function (functionX) {
            var argVals = JSON.parse("[" + document.getElementById('funcArgument').value + "]");
            Clotho.run({function: functionX, args: argVals}).then(function (data) {
                document.getElementById('outputWindow').value += ("\nOutput:\n" + data + "\n");
            }).done();
            if (document.getElementById('newFunc').checked == false) {
                Clotho.destroy(functionX);
            }
            refreshFunctions();
        });
    });


    $('#runFunctionAdv').click(function () {

        var argumentVal = document.getElementById('funcArgumentAdv').value;
        var codeVal = document.getElementById('functionValAdv').value;
        var functionNameVal = document.getElementById('funcNameAdv').value;

        alert(argumentVal);

        document.getElementById('outputWindow').value += ("\nArguments :\n" + argumentVal + "\n");


        Clotho.queryOne("name", argumentVal).then(function (dataQ) {

            if (dataQ != null) {
                if (dataQ.sequence != null) {
                    var script = "var data = {};\n"
                        + "data.name = \"" + functionNameVal + "\";\n"
                        + "data.language = \"JAVASCRIPT\";\n"
                        + "data.schema = \"org.clothocad.core.datums.Function\";\n"
                        + "data.code = \"" + codeVal + "\";\n"
                        + "data.args = [{name:'sequence', type:'String'}];\n"
                        + "\n"
                        + functionNameVal + " = clotho.create(data);\n"
                        + "\n"
                        + "clotho.run(" + functionNameVal + ", [\"" + dataQ.sequence + "\"]);";
                    document.getElementById('outputWindow').value += ("\nScript :\n" + script + "\n");
                    Clotho.submit(script).then(function (data) {
                        document.getElementById('functionResultsAdv').value = data;
                        //document.getElementById('outputWindow').value += ("\nOutput :\n" + data +"\n");
                    }).done();
                }
                else {

                    document.getElementById('outputWindow').value += ("Result : \n Sequence field is empty\n");
                }
            }
            else {
                document.getElementById('outputWindow').value += ("No results obtained\n");
            }
        }).done();
    });


    $('#nameSearch').keypress(function (e) {
        if (e.keyCode == 13) {

            document.getElementById('queryResults').value = "";
            document.getElementById('partName').innerHTML = "";
            document.getElementById('partId').innerHTML = "";
            document.getElementById('partSchema').innerHTML = "";

            var text;
            var queryVal = document.getElementById('nameSearch').value;
            Clotho.queryOne("name", queryVal).then(function (data) {

                var found = false;
                if (data != null) {

                    found = true;
                    document.getElementById('outputWindow').value += ("Data :\n" + JSON.stringify(data) + "\n");
                    document.getElementById('debugWindow').value += ("Query Object Found\n");
                    if (data.name != null) {
                        document.getElementById('partName').innerHTML = data.name;
                    }
                    if (data.id != null) {
                        document.getElementById('partId').innerHTML = data.id;
                    }
                    if (data.schema != null) {
                        document.getElementById('partSchema').innerHTML = data.schema;
                    }
                    if (data.type != null) {
                        document.getElementById('queryResults').value += ("Type : " + data.type + "\n");
                    }
                    if (data.seq != null) {
                        document.getElementById('queryResults').value += ("Sequence : " + data.seq + "\n");
                    }
                    document.getElementById('queryResults').value += ("\nOther Details: \n");
                    var jsonString = JSON.stringify(data);
                    var jsonMap = JSON.parse(jsonString);
                    var i = 0;
                    for (var key in jsonMap) {
                        if (jsonMap.hasOwnProperty(key)) {
                            if ((key !== "name") && (key !== "id") && (key !== "schema") && (key !== "seq") && (key !== "type")) {
                                if (typeof jsonMap[key] == 'object') {
                                    document.getElementById('queryResults').value += (key + " : " + "\n");
                                    for (var subkey in jsonMap[key]) {
                                        document.getElementById('queryResults').value += (subkey + " : " + jsonMap[key][subkey] + "\n");
                                    }
                                }
                                else {
                                    document.getElementById('queryResults').value += (key + " : " + jsonMap[key] + "\n");
                                }
                            }
                        }
                    }
                }
                if (!found) {
                    document.getElementById('outputWindow').value += ("No results obtained for Query : " + queryVal + "\n");
                }
                document.getElementById('nameSearch').value = "";
            }).done();

            return false;
        }
    });

    $("#uploadPart").click(function () {
        var authorText = document.getElementById('authorEntry').value;
        var nameText = document.getElementById('nameEntry').value;
        var out = document.getElementById('outputWindow');
        if (nameText.length > 0 && authorText.length > 0) {
            var part = {name: nameText};
            part.type = document.getElementById('typeEntry').value;
            part.shortDescription = document.getElementById('descriptionEntry').value;
            part.sequence = document.getElementById('sequenceEntry').value;
            part.author = {name: authorText};
            part.schema = "org.clothocad.model.BasicPart";
            Clotho.create(part).then(function () {
                out.value += "1 part was successfully uploaded.\n\n";
            }).done();
        } else {
            out.value += "Upload failed. ";
            if (authorText.length == 0) {
                out.value += "Part author is missing. ";
            }
            if (nameText.length == 0) {
                out.value += "Part name is missing.";
            }
            out.value += "\n\n";
        }
    });


    $("#presetFunctions").change(function () {
        var funcMenu = document.getElementById('presetFunctions');
        var option = funcMenu.options[funcMenu.selectedIndex].value;
        var code = "";
        Clotho.query("name", option).then(function (data) {
            //alert(JSON.stringify(data[0]));
            //alert(data[0]);
            var argsString = "";
            //alert(data[0].code);

            if (data[0].args != null) {
                //argsString += "Arguments: \n";
                for (var i = 0; i < data[0].args.length; i++) {
                    for (var subkey in data[0].args[i]) {
                        argsString += ("\"" + subkey + "\":\"" + data[0].args[i][subkey] + "\",");
                    }
                    if (argsString.length > 0) {
                        argsString = argsString.substring(0, argsString.length - 1);
                    }
                    argsString += "\n\n";
                }
            }
            document.getElementById('funcName').value = option;
            document.getElementById('functionArgs').value = argsString;
            document.getElementById('functionVal').value = data[0].code;

        }).done();

    });


    $("#advancedUpload").click(function () {
        document.getElementById('partEntryArea').style.display = "none";
        document.getElementById('objectEntryArea').style.display = "initial";
    });

    $("#basicUpload").click(function () {
        document.getElementById('partEntryArea').style.display = "initial";
        document.getElementById('objectEntryArea').style.display = "none";
    });


    $("#advancedFunctions").click(function () {

        document.getElementById('preloadedFunctions').style.display = "none";
        document.getElementById('advFunctions').style.display = "initial";
        //abcd
        //alert("advanced");
        //document.getElementById('partEntryArea').style.display = "none";
        //document.getElementById('objectEntryArea').style.display = "initial";
    });

    $("#basicFunctions").click(function () {


        document.getElementById('preloadedFunctions').style.display = "initial";
        document.getElementById('advFunctions').style.display = "none";

        //alert("basic");
        refreshFunctions();

    });


    $("#advancedQuery").click(function () {
        document.getElementById('partQueryArea').style.display = "none";
        document.getElementById('objectQueryArea').style.display = "initial";
    });

    $("#basicQuery").click(function () {
        document.getElementById('partQueryArea').style.display = "initial";
        document.getElementById('objectQueryArea').style.display = "none";
    });

    $("#create").click(function () {

        var entiretext = document.getElementById('gateupload').value;
        var lineArray = entiretext.split("\n");

        if (document.getElementById('asJson').checked) {
            for (var i = 0; i < lineArray.length; i++) {
                line = lineArray[i];
                obj = JSON.parse(line);
                Clotho.create(obj);
            }
            var textMessage = " successfully uploaded.\n\n";
            if (lineArray.length == 1) {
                textMessage = " object was" + textMessage;
            } else if (lineArray.length > 1) {
                textMessage = " objects were" + textMessage;
            }
            textMessage = lineArray.length + textMessage;
            document.getElementById('outputWindow').value += textMessage;
        }
        else if (document.getElementById('parse').checked) {
            for (var i = 0; i < lineArray.length; i++) {
                var line = lineArray[i].split(" ");
                var gtstring = "";
                gtstring += "{"
                for (var j = 0; j < line.length - 1; j++) {
                    var gatecomp = line[j].split(":");
                    gtstring += ("\"" + gatecomp[0] + "\":\"" + gatecomp[1] + "\",");
                }
                var gatecomp = line[line.length - 1].split(":");
                gtstring += ("\"" + gatecomp[0] + "\":\"" + gatecomp[1] + "\"");
                gtstring += "}"
                document.getElementById('outputWindow').value += (gtstring + "\n");
                obj = JSON.parse(gtstring);
                Clotho.create(obj);
            }
            var textmessage = lineArray.length + " Gates added.";
            document.getElementById('outputWindow').value += (textmessage + "\n");
        }
        else if (document.getElementById('originalText').checked) {
            var lineArray = entiretext.split("\n");
            var gtstring = "";
            for (var i = 0; i < lineArray.length; i++) {

                var line = lineArray[i];
                if (line[0] === '>') {
                    if (gtstring === "") {
                        gtstring += "{\"name\":\"" + line.substring(1) + "\"";
                    }
                    else {
                        gtstring += "}";
                        document.getElementById('outputWindow').value += (gtstring + "\n");
                        obj = JSON.parse(gtstring);
                        Clotho.create(obj);
                        gtstring = "";
                        gtstring += "{\"name\":\"" + line.substring(1) + "\"";
                    }
                }
                else {
                    var lineComp = line.split(":");
                    if (lineComp[0] === "attribs") {
                        if (lineComp[1] !== "") {
                            gtstring += ",\"attribs\":" + "{";
                            var atrlist = lineComp[1].split(",");
                            for (var j = 0; j < atrlist.length - 1; j++) {
                                var atrcomp = atrlist[j].split("=");
                                gtstring += ("\"" + atrcomp[0] + "\":\"" + atrcomp[1] + "\",");
                            }
                            var atrcomp = atrlist[atrlist.length - 1].split("=");
                            gtstring += ("\"" + atrcomp[0] + "\":\"" + atrcomp[1] + "\"}");

                        }
                    }
                    else {
                        if (line !== "") {
                            gtstring += (",\"" + lineComp[0] + "\":\"" + lineComp[1] + "\"");
                        }
                    }
                }

                if (i === lineArray.length - 1) {
                    gtstring += "}";
                    document.getElementById('outputWindow').value += (gtstring + "\n");
                    obj = JSON.parse(gtstring);
                    Clotho.create(obj);
                }
            }
        }


    });

});

