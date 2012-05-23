/**
 * Created with JetBrains WebStorm.
 * User: mschwartz
 * Date: 5/23/12
 * Time: 6:10 AM
 * To change this template use File | Settings | File Templates.
 */

/*global require, Config, HttpChild, req, res, global, session */

(function() {
    "use strict";

    var console = require('console'),
        fs = require('fs'),
        Json = require('Json'),
        process = require('builtin/process'),
        uuid = require('Util').uuid;

    Config.extend({
        documentRoot: 'docroot',
        numChildren: 25,
        sessionDir: fs.isDir('/dev/shm') ? '/dev/shm/' : '/tmp/',
        sessionCookie: 'SilkJS_Session',
        sessionTimeout: 1   // in minutes
    });

    HttpChild.requestHandler = function() {
        var cookie = req.data[Config.sessionCookie];
        if (!cookie) {
            cookie = uuid();
        }
        var expires = new Date();
        expires.setMinutes(expires.getMinutes() + Config.sessionTimeout);
        res.setCookie(Config.sessionCookie, cookie, expires);
        global.session = {
            started: false,
            cookie: cookie,
            file: Config.sessionDir + 'silkjs_session_' + cookie,
            data: {

            },
            start: function() {
                var content = fs.readFile(this.file);
                if (content) {
                    this.data = Json.decode(content);
                }
                this.started = true;
            },
            close: function() {
                if (this.started) {
                    fs.writeFile(this.file, Json.encode(this.data));
                }
            }
        };
    };

    HttpChild.endRequest = function() {
        global.session.close();
    };

    function sessionGarbageCollector() {
        if (process.fork()) {
            return; // parent
        }
        // child
        while (true) {
            process.sleep(1);
            var now = new Date();
            now.setMinutes(now.getMinutes() - Config.sessionTimeout);
            var when = parseInt(now.getTime() / 1000, 10);    // unix time stamp
            fs.list(Config.sessionDir, /silkjs_session_.*/).each(function(file) {
                var stat = fs.stat(Config.sessionDir + file);
                if (stat.atime < when) {
                    fs.unlink(Config.sessionDir + file);
                }
            });
        }
    }
    fs.list(Config.sessionDir, /silkjs_session_.*/).each(function(file) {
        console.dir('removing ' + Config.sessionDir + file);
        fs.unlink(Config.sessionDir + file);
    });
    sessionGarbageCollector();

    global.main_action = function() {
        session.start();
        session.data.count = session.data.count || 0;
        session.data.count++;
        res.write(session.data.count);
    }
}());

