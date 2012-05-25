var console = require('console');

function handlerMaker(obj) {
    return {
        // Fundamental traps
        getOwnPropertyDescriptor: function(name) {
            console.log('getOwnPropertyDescriptor ' + name);
            var desc = Object.getOwnPropertyDescriptor(obj, name);
            // a trapping proxy's properties must always be configurable
            if (desc !== undefined) { desc.configurable = true; }
            return desc;
        },
        getPropertyDescriptor:  function(name) {
            console.log('getPropertyDescriptor ' + name);
            var desc = Object.getPropertyDescriptor(obj, name); // not in ES5
            // a trapping proxy's properties must always be configurable
            if (desc !== undefined) { desc.configurable = true; }
            return desc;
        },
        getOwnPropertyNames: function() {
            console.log('getOwnPropertyNames');
            return Object.getOwnPropertyNames(obj);
        },
        getPropertyNames: function() {
            console.log('getPropertyNames');
            return Object.getPropertyNames(obj);                // not in ES5
        },
        defineProperty: function(name, desc) {
            console.log('defineProperty ' + name);
            console.dir(desc);
            Object.defineProperty(obj, name, desc);
        },
        delete:       function(name) { console.log('delete ' + name); return delete obj[name]; },
        fix:          function() {
            if (Object.isFrozen(obj)) {
                return Object.getOwnPropertyNames(obj).map(function(name) {
                    return Object.getOwnPropertyDescriptor(obj, name);
                });
            }
            // As long as obj is not frozen, the proxy won't allow itself to be fixed
            return undefined; // will cause a TypeError to be thrown
        },

        // derived traps
        has:          function(name) { return name in obj; },
        hasOwn:       function(name) { return Object.prototype.hasOwnProperty.call(obj, name); },
        get:          function(receiver, name) { console.log('get ' + name); return obj[name]; },
        set:          function(receiver, name, val) { console.log('set ' + name); console.dir(val); obj[name] = val; return true; }, // bad behavior when set fails in non-strict mode
        enumerate:    function() {
            var result = [];
            for (name in obj) { result.push(name); };
            return result;
        },
        keys: function() { return Object.keys(obj) }
    };
}

// ...

var o = Object.create({});
var proxy = Proxy.create(handlerMaker(o));

proxy.blabla = { foo: 12 };
proxy.blabla.foo = 12; // Thanks to the forwarding, o now has a 'blabla' property which value is 12
o.blabla.foo++; // just incrementing o.blabla

console.log(proxy.blabla.foo); // alerts 13: the getting operation is forwarded to o which returns 13.

