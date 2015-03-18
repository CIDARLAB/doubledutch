// Add script tag to html for Q Promise library hosted at cdnjs and JQuery library
//<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/q.js/0.9.6/q.min.js"></script>

//Encapsulate all code in this immediately-invoked function expression (aka: self-evoking anonymous function).
//Maintains scope and state for entirety of the library's execution.
(function(Clotho) {

    var callbackHash = {}; //Callback function hash table --> Key: request id, Value: callback function

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                              WebSocket                                                //
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////

    var socket = new WebSocket("wss://localhost:8443/websocket");
    socket.messageCache = [];

    socket.onopen = function() {
        console.log("websocket opened!");
        ///Remember JS is single-threaded so the WebSocket will not reach readystate=1 until 
        ///the entire library finishes loading. In the off chance the user writes a script that calls
        ///a Clotho function immediately upon completion of dependencies loading, the socket will not 
        ///have had enough time to enter readystate. Handle this by storing those calls (if any are made)
        ///and executing them in this socket.onopen() method.
        for (var i=0; i < socket.messageCache.length; i++){
            socket.send(socket.messageCache[i]);
        }
    };

    socket.onmessage = function(evt) {
        // Parse message into JSON  
        var dataJSON = JSON.parse(evt.data);
        var channel = dataJSON.channel;
        var requestId = dataJSON.requestId;
        if (requestId !== null) {
            // If callback function exists, run it
            var callback = callbackHash[channel + requestId];
            if (callback !== undefined) {
                callback(dataJSON.data);
                delete callbackHash[channel + requestId];
            }
        }
    };

    socket.sendwhenready = function(message) {
        if (socket.readyState == 1) {
            socket.send(message);
        }
        else {
            console.log("caching " + message);
            socket.messageCache.push(message);
        }
    }

    var Message = function(channel, data, requestID, options) {
        this.channel = channel;
        this.data = data;
        this.requestId = requestID;
        if (typeof options != undefined){
            this.options = options;
        }
    };

    //a generator would be nice
    var lastRequestId = -1;
    function nextId(){
        lastRequestId++;
        return lastRequestId; 
    }

    // Helper function: Sends message to server 
    socket.emit = function(channel, data, options) {
        // Create 'deferred' object ... Q is a global variable
        var deferred = Q.defer();
        var requestID = nextId();
        // var message = '{"channel":"' + channel + '","data":"' + data + '","requestId":"' + requestID + '"}';
        var message = new Message(channel, data, requestID, options);
        var callback = function(dataFromServer) {
            deferred.resolve(dataFromServer);
        };
        // Hash callback function: (channel + requestID) because we need to distinguish between "say" messages and desired responses from server. 
        callbackHash[channel + requestID] = callback;
        socket.sendwhenready(JSON.stringify(message));
        return deferred.promise;
    };

    /**
     * Returns [spec, options]
     */
    var parseQueryArgs = function(schema, name, options) {
        if (typeof(schema) !== 'string') {
            return {obj:schema, options:name};
        }
        else {
            return {obj:{schema:name}, options:options};
        }
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                          Clotho Object                                                //
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    window.Clotho = Clotho.prototype = { //Clotho function prototypes

        /**
         * Clotho.create
         * Creates specified object(s) and associated UUIDs in the order they are found in the list (if more than one).
         * @param {Object} A list of one or more JSON objects describing an instance(s) of Clotho schema.
         * @return {Object} A list of created objects' IDs. Ex: Clotho.create([{"name":"My New Part", "sequence":"GGGGGG"},{"name":"Another Part", "sequence":"AAACCC"}])
         */
        create: function(object, options) {
            /** Three cases below (in order):
             *  Input param is a JSON object. Ex: Clotho.create({"name":"My New Part", "sequence":"GGGGGG"})
             *  Input param is an object containing a single JSON. Ex: Clotho.create([{"name":"My New Part", "sequence":"GGGGGG"}])
             *  Input param is an object containing multiple JSONs. Ex: 
             */
            if (object.length == undefined) {
                return socket.emit("create", object, options);
            } else if (object.length == 1) {
                return socket.emit("create", object[0], options);
            } else {
                return socket.emit("createAll", object, options);
            }
        },

        /**
         * Clotho.destroy
         * Destroys object(s) as defined by the input.
         * @param {Object selector} A string or list of strings describing a particular Clotho object.
         */
        destroy: function(name, options) {
            if (typeof name == "string") {
                return socket.emit("destroy", name, options);
            } else {
                return socket.emit("destroyAll", name, options);
            }
        },

        /**
         * Clotho.set
         * Sets the fields present in the specificiation to the values defined by the spec.
         * @param id: ID of the object to be updated, key: field
         * @return {Object} An ID or list of IDs of objects updated.
         */
        set: function(object, options) {
            if (typeof object == "string") {
                return socket.emit("set", object, options);
            } else {
                return socket.emit("setAll", object, options);
            }
        },

        /** 
         * Clotho.get
         * Gets object(s) as defined by the input parameter(s).
         * @param {Object} JSON object selector(s) describing an instance(s) of Clotho schema.
         * @return {Object} Object description for every input object requested.
         */

        get: function(name, options) {
            if (typeof name == "string") {
                return socket.emit("get", name, options);
            } else {
                return socket.emit("getAll", name, options);
            }
        },

        /**
         * Clotho.query
         * Seeks all Clotho object instances that match the object specification.
         * @param {Object} Clotho object specification.
         * @return {Object} All objects that match the spec.
         * 2 arg patterns: (String schema, String name, options) searches for {<schema>:<name}
         * (Object spec, options) searches for spec
         */
        query: function(schema, name, options) {
            var args = parseQueryArgs(schema,name,options);
            return socket.emit("query", args.obj, args.options);
        },

        /**
         * Clotho.queryOne
         * Seeks Clotho object instances that match the object specification.
         * @param {Object} Clotho object specification.
         * @return {Object} The first Clotho object that matches the spec.
         */
        queryOne: function(schema, name, options) {
            var args = parseQueryArgs(schema,name,options);
            return socket.emit("queryOne", args.obj, args.options);
        },

        /**
         * Clotho.run
         * Executes specified function with args as its input.
         * @param {Object} Object selector with 2 or 3 fields: 
         *  'Object.module' {String} indicates function module to run [OPTIONAL], 
         *  'Object.func' {String} indicates the function to run,
         *  'Object.input' {Object} indicates input arguments for function. 
         */
        run: function(object, options) {
            if (object.args == undefined)
                object.args = [];
            if (object.module == undefined) {
                return socket.emit("run", {"id":object.function, "args":object.args}, options);
            } else {
                return socket.emit("run", {"id":object.module, "function":object.function, "args":object.args}, options);
            }
        },

        /**
         * Clotho.submit
         * Executes script.
         * @param {Object}
         */
        submit: function(script, options) {
            return socket.emit("submit", script, options);
        },

        /**
         * Clotho.validate
         * Validates object against associated schemas
         */
        validate: function (object, options) {
            return socket.emit("validate", object, options);
        }, 

        /**
         * Clotho.login
         * Login to Clotho
         * @param {Object} 
         */
        login: function(name, pass) {
            return socket.emit("login", {"username":name, "credentials":pass});
        },

        /**
         * Clotho.logout
         * Login to Clotho
         * @param {Object} 
         */
        logout: function() {
            return socket.emit("logout", "");
        },

        /**
         * Clotho.grant
         * Grant permissions to a user on an object
         * @param {Object}
         */
        grant: function(user, id, add, remove){
            if (id.length == undefined || (typeof id) == "string")
                return socket.emit("grant", {"user":user, "id":id, "add":add, "remove":remove});
            else
                return socket.emit("grantAll", {"user":user, "id":id, "add":add, "remove":remove});
        }
    };
}(Clotho = window.Clotho || {}));