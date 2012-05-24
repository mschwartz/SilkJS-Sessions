/**
 * Sessions implementation for SilkJS's HTTP server in 100 lines (not including comments!).
 *
 * Passes jshint.
 */

// This line below specifies global variables used by the rest of the file.
// Without it, jshint complains they're not defined.
/*global require, HttpChild, req, res, global */

(function() {
    "use strict";

    var Config = global.Config,
        console = require('console'),
        fs = require('fs'),
        Json = require('Json'),
        process = require('builtin/process'),
        uuid = require('Util').uuid;

    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

    // Configure HTTP Server
    // (Note the session configuration variables)
    Config.extend({
        documentRoot: 'docroot',        // where to serve static and dynamic content from
        numChildren: 25,                // how many HttpChild processes to pre-fork
        sessionDir: fs.isDir('/dev/shm') ? '/dev/shm/' : '/tmp/',   // session files
        sessionCookie: 'SilkJS_Session', // name of session cookie
        sessionTimeout: 1,              // session timeout in minutes
        sessionGCFrequency: 60          // session garbage collection period in seconds
    });

    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

    // Session class

    // constructor
    // 1. If no cookie set, generate a new cookie value
    // 2. Set cookie to expire in 15 minutes from now
    // 3. initialize the session object's member variables.
    var Session = function() {
        var cookie = req.data[Config.sessionCookie];
        if (!cookie) {
            // no cookie set, generate a cookie value, using uuid() function
            // uuid() supposedly generates a unique string each time it is
            // called.
            cookie = uuid();
        }
        // compute expire time, Config.sessionTimeout minutes in the future
        var expires = new Date();
        expires.setMinutes(expires.getMinutes() + Config.sessionTimeout);
        // set the cookie/value and to expire when the session timeout period
        // elapses.
        res.setCookie(Config.sessionCookie, cookie, expires);
        this.data = {};
        this.started = false;
        this.cookie = cookie;
        this.file = Config.sessionDir + 'silkjs_session_' + cookie;
    };
    // Session prototype methods
    Session.prototype.extend({  // see SilkJS repo, builtin/extensions.js
        // start the session
        // if this function is not called, an empty session is provided,
        // and it won't be written to disk by the end method.
        start: function() {
            // read the session file
            var content = fs.readFile(this.file);
            if (content) {
                // file exists, deserialize it
                this.data = Json.decode(content);
            }
            // flag that the session.data should be serialized and written to disk
            // by end()
            this.started = true;
        },
        // end the session
        // If the session.start() method was called, then this function will write
        // the serialized session.data to the session file.
        //
        // This function is called by the HttpChild.endRequest handler we install
        // so the application should never really need to call this directly.
        end: function() {
            if (this.started) {
                fs.writeFile(this.file, Json.encode(this.data));
                this.data = {};
            }
        }
    });

    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

    // HttpChild Hooks

    // request handler
    // 3. Instantiate global.session object.
    HttpChild.requestHandler = function() {
        // instantiate global.session variable for this request.
        global.session = new Session();
        // we don't automatically start the session because you don't need or
        // want a session for static (image, css file, js file, etc.) requests.
    };

    // request cleanup handler
    // Save session to session store (disk file)
    HttpChild.endRequest = function() {
        global.session.end();
    };

    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

    // Garbage collection

    // Before the http server forks the child processes, this function is called.
    // It forks a garbage collector process that sleeps for a Config.sessionGCGrequency
    // seconds, then examines each of the session files in the Config.sessionDir and
    // deletes session files that haven't been accessed for Config.sessionTimeout minutes.
    function sessionGarbageCollector() {
        if (process.fork()) {
            return; // parent
        }
        // child
        while (true) {
            process.sleep(Config.sessionGCFrequency);
            // compute timestamp for Config.sessionTimeout seconds ago
            var now = new Date();
            now.setMinutes(now.getMinutes() - Config.sessionTimeout);
            var when = parseInt(now.getTime() / 1000, 10);    // unix time stamp
            // iterate through the session files
            fs.list(Config.sessionDir, /silkjs_session_.*/).each(function(file) {
                var stat = fs.stat(Config.sessionDir + file);
                if (stat.atime < when) {
                    // file has not been accessed and is expired - delete it.
                    fs.unlink(Config.sessionDir + file);
                }
            });
        }
    }

    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
    //\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

    // initialization

    // iterate through the Config.sessionDir and delete all the session files
    // at server startup.
    fs.list(Config.sessionDir, /silkjs_session_.*/).each(function(file) {
        console.dir('removing ' + Config.sessionDir + file);
        fs.unlink(Config.sessionDir + file);
    });

    // kick start the garbage collector
    sessionGarbageCollector();

}());

