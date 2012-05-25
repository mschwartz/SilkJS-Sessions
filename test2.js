var fs = require('builtin/fs'),
    console = require('console');

function DirectoryProxy(path) {
    return Proxy.create({
        get: function(receiver, name) {
            return fs.readFile(path + '/' + name);
        },
        set: function(receiver, name, value) {
            fs.writeFile(path + '/' + name, value);
            return true;
        },
        keys: function() {
            return fs.readDir(path);
        },
        enumerate: function() {
            return fs.readDir(path);
        },
        has: function(name) {
            return fs.exists(path + '/' + name);
        },
        delete: function(name) {
            fs.unlink(path + '/' + name);
        }
    });
}

// test it out!
var currentDir = new DirectoryProxy('.');
console.dir(Object.keys(currentDir));
currentDir.foo = 'This string written to the file "foo" in the current directory';
console.dir(currentDir.foo);
// "foo" should show up in this list:
for (var filename in currentDir) {
    console.log(filename);
}
console.log('foo exists? ' + ('foo' in currentDir));
delete currentDir.foo;  // file "foo" is removed from file system, current directory.
console.log('foo exists? ' + ('foo' in currentDir));

