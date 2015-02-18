// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          (((codePoint - 0x10000) / 0x400)|0) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;

function jsCall() {
  var args = Array.prototype.slice.call(arguments);
  return Runtime.functionPointers[args[0]].apply(null, args.slice(1));
}








//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;


function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;


function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[(((buffer)+(i))>>0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 1728;
  /* global initializers */ __ATINIT__.push();
  

/* memory initializer */ allocate([110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,102,114,101,113,0,0,0,0,109,115,103,95,103,101,116,78,117,109,66,121,116,101,115,40,109,41,32,60,61,32,108,101,110,0,0,0,0,0,0,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,99,0,0,0,109,115,103,95,99,111,112,121,84,111,66,117,102,102,101,114,0,0,0,0,0,0,0,0,108,101,110,95,114,32,43,32,115,121,109,76,101,110,32,60,61,32,108,101,110,0,0,0,37,115,0,0,0,0,0,0,98,97,110,103,0,0,0,0,37,103,0,0,0,0,0,0,48,120,37,88,0,0,0,0,32,0,0,0,0,0,0,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,105,32,60,32,77,80,95,78,85,77,95,77,69,83,83,65,71,69,95,76,73,83,84,83,0,0,0,0,0,0,0,0,46,47,98,117,105,108,100,47,99,47,77,101,115,115,97,103,101,80,111,111,108,46,99,0,109,112,95,97,100,100,77,101,115,115,97,103,101,0,0,0,110,101,119,73,110,100,101,120,32,60,61,32,109,112,45,62,98,117,102,102,101,114,83,105,122,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,45,43,32,32,32,48,88,48,120,0,0,0,0,0,0,0,40,110,117,108,108,41,0,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,0,0,0,0,0,105,110,102,0,0,0,0,0,73,78,70,0,0,0,0,0,110,97,110,0,0,0,0,0,78,65,78,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,46,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  var _BDtoIHigh=true;

   
  Module["_i64Subtract"] = _i64Subtract;

  var _fabsf=Math_abs;

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC); 
  Module["_llvm_ctlz_i32"] = _llvm_ctlz_i32;

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          writeAsciiToMemory(msg, strerrbuf);
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

   
  Module["_strlen"] = _strlen;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

   
  Module["_strncpy"] = _strncpy;

   
  Module["_i64Add"] = _i64Add;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function ___errno_location() {
      return ___errno_state;
    }

  var _BItoD=true;

  var _llvm_pow_f32=Math_pow;

  
  
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          }
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
      else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
      Browser.mainLoop.scheduler();
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  var _atan2f=Math_atan2;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_vdiii(x) { Module["printErr"]("Invalid function pointer called with signature 'vdiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_viii(x) { Module["printErr"]("Invalid function pointer called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vdiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_vdiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "jsCall": jsCall, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vdiii": nullFunc_vdiii, "nullFunc_iii": nullFunc_iii, "nullFunc_viii": nullFunc_viii, "invoke_iiii": invoke_iiii, "invoke_vdiii": invoke_vdiii, "invoke_iii": invoke_iii, "invoke_viii": invoke_viii, "_fflush": _fflush, "___errno_location": ___errno_location, "___assert_fail": ___assert_fail, "_strerror_r": _strerror_r, "_abort": _abort, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_fabsf": _fabsf, "_sbrk": _sbrk, "_time": _time, "_llvm_pow_f32": _llvm_pow_f32, "_strerror": _strerror, "___setErrNo": ___setErrNo, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_sysconf": _sysconf, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_atan2f": _atan2f, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;
  var ctlz_i8=env.ctlz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var jsCall=env.jsCall;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_vdiii=env.nullFunc_vdiii;
  var nullFunc_iii=env.nullFunc_iii;
  var nullFunc_viii=env.nullFunc_viii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vdiii=env.invoke_vdiii;
  var invoke_iii=env.invoke_iii;
  var invoke_viii=env.invoke_viii;
  var _fflush=env._fflush;
  var ___errno_location=env.___errno_location;
  var ___assert_fail=env.___assert_fail;
  var _strerror_r=env._strerror_r;
  var _abort=env._abort;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _fabsf=env._fabsf;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _llvm_pow_f32=env._llvm_pow_f32;
  var _strerror=env._strerror;
  var ___setErrNo=env.___setErrNo;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _sysconf=env._sysconf;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _atan2f=env._atan2f;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _msg_isFloat($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_getByteSize($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((8|0),(24|0),56,(48|0));
  // unreachable;
 }
 return (0)|0;
}
function _cBinop_perform_op($op,$f,$k) {
 $op = $op|0;
 $f = +$f;
 $k = +$k;
 var $0 = 0.0, $1 = 0, $10 = 0.0, $100 = 0.0, $101 = 0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0, $11 = 0.0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0, $114 = 0.0, $115 = 0.0;
 var $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0.0, $121 = 0.0, $122 = 0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0.0, $13 = 0.0, $130 = 0, $131 = 0.0, $132 = 0.0, $133 = 0.0;
 var $134 = 0.0, $135 = 0.0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0.0, $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0.0;
 var $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0.0, $35 = 0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0;
 var $49 = 0.0, $5 = 0.0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0, $57 = 0.0, $58 = 0, $59 = 0, $6 = 0.0, $60 = 0.0, $61 = 0.0, $62 = 0, $63 = 0.0, $64 = 0, $65 = 0, $66 = 0.0;
 var $67 = 0.0, $68 = 0, $69 = 0.0, $7 = 0.0, $70 = 0, $71 = 0, $72 = 0.0, $73 = 0.0, $74 = 0, $75 = 0.0, $76 = 0, $77 = 0, $78 = 0.0, $79 = 0.0, $8 = 0.0, $80 = 0.0, $81 = 0, $82 = 0.0, $83 = 0.0, $84 = 0.0;
 var $85 = 0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0.0, $9 = 0.0, $90 = 0, $91 = 0.0, $92 = 0, $93 = 0.0, $94 = 0, $95 = 0.0, $96 = 0, $97 = 0.0, $98 = 0, $99 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $op;
 $2 = $f;
 $3 = $k;
 $4 = $1;
 do {
  switch ($4|0) {
  case 0:  {
   $5 = $2;
   $6 = $3;
   $7 = $5 + $6;
   $0 = $7;
   break;
  }
  case 1:  {
   $8 = $2;
   $9 = $3;
   $10 = $8 - $9;
   $0 = $10;
   break;
  }
  case 2:  {
   $11 = $2;
   $12 = $3;
   $13 = $11 * $12;
   $0 = $13;
   break;
  }
  case 3:  {
   $14 = $3;
   $15 = $14 != 0.0;
   if ($15) {
    $16 = $2;
    $17 = $3;
    $18 = $16 / $17;
    $19 = $18;
   } else {
    $19 = 0.0;
   }
   $0 = $19;
   break;
  }
  case 4:  {
   $20 = $2;
   $21 = (~~(($20)));
   $22 = $3;
   $23 = (~~(($22)));
   $24 = (($21|0) / ($23|0))&-1;
   $25 = (+($24|0));
   $0 = $25;
   break;
  }
  case 5:  {
   $26 = $2;
   $27 = (~~(($26)));
   $28 = $3;
   $29 = (~~(($28)));
   $30 = (($27|0) % ($29|0))&-1;
   $31 = (+($30|0));
   $0 = $31;
   break;
  }
  case 6:  {
   $32 = $3;
   $33 = $32 == 0.0;
   if ($33) {
    $40 = 0.0;
   } else {
    $34 = $2;
    $35 = (~~(($34)));
    $36 = $3;
    $37 = (~~(($36)));
    $38 = (($35|0) % ($37|0))&-1;
    $39 = (+($38|0));
    $40 = $39;
   }
   $2 = $40;
   $41 = $2;
   $42 = $41 < 0.0;
   if ($42) {
    $43 = $2;
    $44 = $3;
    $45 = (+Math_abs((+$44)));
    $46 = $43 + $45;
    $48 = $46;
   } else {
    $47 = $2;
    $48 = $47;
   }
   $0 = $48;
   break;
  }
  case 7:  {
   $49 = $2;
   $50 = (~~(($49)));
   $51 = $3;
   $52 = (~~(($51)));
   $53 = $50 << $52;
   $54 = (+($53|0));
   $0 = $54;
   break;
  }
  case 8:  {
   $55 = $2;
   $56 = (~~(($55)));
   $57 = $3;
   $58 = (~~(($57)));
   $59 = $56 >> $58;
   $60 = (+($59|0));
   $0 = $60;
   break;
  }
  case 9:  {
   $61 = $2;
   $62 = (~~(($61)));
   $63 = $3;
   $64 = (~~(($63)));
   $65 = $62 & $64;
   $66 = (+($65|0));
   $0 = $66;
   break;
  }
  case 10:  {
   $67 = $2;
   $68 = (~~(($67)));
   $69 = $3;
   $70 = (~~(($69)));
   $71 = $68 ^ $70;
   $72 = (+($71|0));
   $0 = $72;
   break;
  }
  case 11:  {
   $73 = $2;
   $74 = (~~(($73)));
   $75 = $3;
   $76 = (~~(($75)));
   $77 = $74 | $76;
   $78 = (+($77|0));
   $0 = $78;
   break;
  }
  case 12:  {
   $79 = $2;
   $80 = $3;
   $81 = $79 == $80;
   $82 = $81 ? 1.0 : 0.0;
   $0 = $82;
   break;
  }
  case 13:  {
   $83 = $2;
   $84 = $3;
   $85 = $83 != $84;
   $86 = $85 ? 1.0 : 0.0;
   $0 = $86;
   break;
  }
  case 14:  {
   $87 = $2;
   $88 = $87 == 0.0;
   if ($88) {
    $92 = 1;
   } else {
    $89 = $3;
    $90 = $89 == 0.0;
    $92 = $90;
   }
   $91 = $92 ? 0.0 : 1.0;
   $0 = $91;
   break;
  }
  case 15:  {
   $93 = $2;
   $94 = $93 == 0.0;
   if ($94) {
    $95 = $3;
    $96 = $95 == 0.0;
    $98 = $96;
   } else {
    $98 = 0;
   }
   $97 = $98 ? 0.0 : 1.0;
   $0 = $97;
   break;
  }
  case 16:  {
   $99 = $2;
   $100 = $3;
   $101 = $99 < $100;
   $102 = $101 ? 1.0 : 0.0;
   $0 = $102;
   break;
  }
  case 17:  {
   $103 = $2;
   $104 = $3;
   $105 = $103 <= $104;
   $106 = $105 ? 1.0 : 0.0;
   $0 = $106;
   break;
  }
  case 18:  {
   $107 = $2;
   $108 = $3;
   $109 = $107 > $108;
   $110 = $109 ? 1.0 : 0.0;
   $0 = $110;
   break;
  }
  case 19:  {
   $111 = $2;
   $112 = $3;
   $113 = $111 >= $112;
   $114 = $113 ? 1.0 : 0.0;
   $0 = $114;
   break;
  }
  case 20:  {
   $115 = $2;
   $116 = $3;
   $117 = (+_fmaxf($115,$116));
   $0 = $117;
   break;
  }
  case 21:  {
   $118 = $2;
   $119 = $3;
   $120 = (+_fminf($118,$119));
   $0 = $120;
   break;
  }
  case 22:  {
   $121 = $2;
   $122 = $121 > 0.0;
   if ($122) {
    $123 = $2;
    $124 = $3;
    $125 = (+Math_pow((+$123),(+$124)));
    $126 = $125;
   } else {
    $126 = 0.0;
   }
   $0 = $126;
   break;
  }
  case 23:  {
   $127 = $2;
   $128 = $127 == 0.0;
   if ($128) {
    $129 = $3;
    $130 = $129 == 0.0;
    if ($130) {
     $134 = 0.0;
    } else {
     label = 44;
    }
   } else {
    label = 44;
   }
   if ((label|0) == 44) {
    $131 = $2;
    $132 = $3;
    $133 = (+Math_atan2((+$131),(+$132)));
    $134 = $133;
   }
   $0 = $134;
   break;
  }
  default: {
   $0 = 0.0;
  }
  }
 } while(0);
 $135 = $0;
 STACKTOP = sp;return (+$135);
}
function _msg_getTimestamp($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _cBinop_k_onMessage($_c,$o,$op,$k,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $op = $op|0;
 $k = +$k;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f = 0.0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $op;
 $3 = $k;
 $4 = $letIn;
 $5 = $m;
 $6 = $sendMessage;
 $7 = $5;
 $8 = (_msg_isFloat($7,0)|0);
 $9 = ($8|0)!=(0);
 if (!($9)) {
  STACKTOP = sp;return;
 }
 $10 = $5;
 $11 = (_msg_getNumElements($10)|0);
 $12 = ($11|0)>(1);
 if ($12) {
  $13 = $5;
  $14 = (_msg_isFloat($13,1)|0);
  $15 = ($14|0)!=(0);
  if ($15) {
   $16 = $5;
   $17 = (+_msg_getFloat($16,1));
   $19 = $17;
  } else {
   label = 5;
  }
 } else {
  label = 5;
 }
 if ((label|0) == 5) {
  $18 = $3;
  $19 = $18;
 }
 $f = $19;
 $20 = (_msg_getByteSize(1)|0);
 $21 = STACKTOP; STACKTOP = STACKTOP + ((((1*$20)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $n = $21;
 $22 = $2;
 $23 = $5;
 $24 = (+_msg_getFloat($23,0));
 $25 = $f;
 $26 = (+_cBinop_perform_op($22,$24,$25));
 $f = $26;
 $27 = $n;
 $28 = $5;
 $29 = (_msg_getTimestamp($28)|0);
 $30 = $f;
 (_msg_initWithFloat($27,$29,$30)|0);
 $31 = $6;
 $32 = $0;
 $33 = $n;
 FUNCTION_TABLE_viii[$31 & 15]($32,0,$33);
 STACKTOP = sp;return;
}
function _msg_getNumElements($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _cPrint_onMessage($_c,$m,$name) {
 $_c = $_c|0;
 $m = $m|0;
 $name = $name|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $s = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $m;
 $2 = $name;
 $3 = $0;
 $4 = (($3) + 88|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)!=(0|0);
 if (!($6)) {
  STACKTOP = sp;return;
 }
 $7 = $1;
 $8 = (_msg_toString($7)|0);
 $s = $8;
 $9 = $0;
 $10 = (($9) + 88|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $1;
 $13 = (_msg_getTimestamp1($12)|0);
 $14 = (+($13>>>0));
 $15 = $0;
 $16 = (+_ctx_getSampleRate($15));
 $17 = $14 / $16;
 $18 = $2;
 $19 = $s;
 $20 = $0;
 $21 = (_ctx_getUserData($20)|0);
 FUNCTION_TABLE_vdiii[$11 & 7]($17,$18,$19,$21);
 $22 = $s;
 _free($22);
 STACKTOP = sp;return;
}
function _msg_getTimestamp1($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getSampleRate($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = +HEAPF64[$2>>3];
 STACKTOP = sp;return (+$3);
}
function _ctx_getUserData($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 100|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _cVar_init_f($o,$k) {
 $o = $o|0;
 $k = +$k;
 var $0 = 0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $k;
 $2 = $0;
 HEAP32[$2>>2] = 1;
 $3 = $1;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAPF32[$5>>2] = $3;
 STACKTOP = sp;return 0;
}
function _cVar_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $2;
 if ((($5|0) == 0)) {
  $6 = $3;
  $7 = (_msg_getType($6,0)|0);
  if ((($7|0) == 0)) {
   $8 = (_msg_getByteSize5(1)|0);
   $9 = STACKTOP; STACKTOP = STACKTOP + ((((1*$8)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
   $n = $9;
   $10 = $1;
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==(1);
   do {
    if ($12) {
     $13 = $n;
     $14 = $3;
     $15 = (_msg_getTimestamp6($14)|0);
     $16 = $1;
     $17 = (($16) + 4|0);
     $18 = +HEAPF32[$17>>2];
     (_msg_initWithFloat($13,$15,$18)|0);
    } else {
     $19 = $1;
     $20 = HEAP32[$19>>2]|0;
     $21 = ($20|0)==(3);
     if ($21) {
      $22 = $n;
      $23 = $3;
      $24 = (_msg_getTimestamp6($23)|0);
      $25 = $1;
      $26 = (($25) + 4|0);
      $27 = HEAP32[$26>>2]|0;
      (_msg_initWithHash($22,$24,$27)|0);
      break;
     } else {
      STACKTOP = sp;return;
     }
    }
   } while(0);
   $28 = $4;
   $29 = $0;
   $30 = $n;
   FUNCTION_TABLE_viii[$28 & 15]($29,0,$30);
  } else if ((($7|0) == 1)) {
   $31 = $1;
   HEAP32[$31>>2] = 1;
   $32 = $3;
   $33 = (+_msg_getFloat7($32,0));
   $34 = $1;
   $35 = (($34) + 4|0);
   HEAPF32[$35>>2] = $33;
   $36 = $4;
   $37 = $0;
   $38 = $3;
   FUNCTION_TABLE_viii[$36 & 15]($37,0,$38);
  } else if ((($7|0) == 3) | (($7|0) == 2)) {
   $39 = $1;
   HEAP32[$39>>2] = 3;
   $40 = $3;
   $41 = (_msg_getHash($40,0)|0);
   $42 = $1;
   $43 = (($42) + 4|0);
   HEAP32[$43>>2] = $41;
   $44 = $4;
   $45 = $0;
   $46 = $3;
   FUNCTION_TABLE_viii[$44 & 15]($45,0,$46);
  } else {
   STACKTOP = sp;return;
  }
  STACKTOP = sp;return;
 } else if ((($5|0) == 1)) {
  $47 = $3;
  $48 = (_msg_getType($47,0)|0);
  if ((($48|0) == 1)) {
   $49 = $1;
   HEAP32[$49>>2] = 1;
   $50 = $3;
   $51 = (+_msg_getFloat7($50,0));
   $52 = $1;
   $53 = (($52) + 4|0);
   HEAPF32[$53>>2] = $51;
  } else if ((($48|0) == 3) | (($48|0) == 2)) {
   $54 = $1;
   HEAP32[$54>>2] = 3;
   $55 = $3;
   $56 = (_msg_getHash($55,0)|0);
   $57 = $1;
   $58 = (($57) + 4|0);
   HEAP32[$58>>2] = $56;
  } else {
  }
 }
 STACKTOP = sp;return;
}
function _msg_getType($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getByteSize5($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((64|0),(80|0),56,(104|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_getTimestamp6($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _msg_getFloat7($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _hv_msg_getByteSize($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = (_msg_getByteSize11($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _hv_msg_init($m,$numElements,$timestamp) {
 $m = $m|0;
 $numElements = $numElements|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $numElements;
 $2 = $timestamp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 (_msg_init($3,$4,$5)|0);
 STACKTOP = sp;return;
}
function _hv_msg_getFloat($m,$i) {
 $m = $m|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = (+_msg_getFloat15($2,$3));
 STACKTOP = sp;return (+$4);
}
function _hv_msg_setFloat($m,$i,$f) {
 $m = $m|0;
 $i = $i|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $i;
 $2 = $f;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 _msg_setFloat($3,$4,$5);
 STACKTOP = sp;return;
}
function _hv_getNumInputChannels($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $0;
 $2 = (_ctx_getNumInputChannels($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _hv_getNumOutputChannels($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $0;
 $2 = (_ctx_getNumOutputChannels($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _hv_setPrintHook($c,$f) {
 $c = $c|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $f;
 $2 = $0;
 $3 = $1;
 _ctx_setPrintHook($2,$3);
 STACKTOP = sp;return;
}
function _hv_vscheduleMessageForReceiver($c,$receiverName,$delayMs,$format,$varargs) {
 $c = $c|0;
 $receiverName = $receiverName|0;
 $delayMs = +$delayMs;
 $format = $format|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ap = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0, $i = 0, $m = 0, $numElem = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp + 32|0;
 $0 = $c;
 $1 = $receiverName;
 $2 = $delayMs;
 $3 = $format;
 HEAP32[$ap>>2] = $varargs;
 $4 = $3;
 $5 = (_strlen(($4|0))|0);
 $numElem = $5;
 $6 = $numElem;
 $7 = (_msg_getByteSize11($6)|0);
 $8 = STACKTOP; STACKTOP = STACKTOP + ((((1*$7)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $8;
 $9 = $m;
 $10 = $numElem;
 $11 = $0;
 $12 = (($11) + 16|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = $2;
 $15 = (+_fmax(0.0,$14));
 $16 = $0;
 $17 = (+_ctx_getSampleRate16($16));
 $18 = $15 * $17;
 $19 = $18 / 1000.0;
 $20 = (~~(($19))>>>0);
 $21 = (($13) + ($20))|0;
 (_msg_init($9,$10,$21)|0);
 $i = 0;
 while(1) {
  $22 = $i;
  $23 = $numElem;
  $24 = ($22|0)<($23|0);
  if (!($24)) {
   break;
  }
  $25 = $i;
  $26 = $3;
  $27 = (($26) + ($25)|0);
  $28 = HEAP8[$27>>0]|0;
  $29 = $28 << 24 >> 24;
  if ((($29|0) == 98)) {
   $30 = $m;
   $31 = $i;
   _msg_setBang($30,$31);
  } else if ((($29|0) == 102)) {
   $32 = $m;
   $33 = $i;
   $arglist_current = HEAP32[$ap>>2]|0;
   HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current+4>>2];$34 = +HEAPF64[tempDoublePtr>>3];
   $arglist_next = (($arglist_current) + 8|0);
   HEAP32[$ap>>2] = $arglist_next;
   $35 = $34;
   _msg_setFloat($32,$33,$35);
  } else if ((($29|0) == 115)) {
   $36 = $m;
   $37 = $i;
   $arglist_current2 = HEAP32[$ap>>2]|0;
   $38 = HEAP32[$arglist_current2>>2]|0;
   $arglist_next3 = (($arglist_current2) + 4|0);
   HEAP32[$ap>>2] = $arglist_next3;
   _msg_setSymbol($36,$37,$38);
  } else {
  }
  $39 = $i;
  $40 = (($39) + 1)|0;
  $i = $40;
 }
 $41 = $0;
 $42 = $1;
 $43 = $m;
 _ctx_scheduleMessageForReceiver($41,$42,$43);
 STACKTOP = sp;return;
}
function _hv_scheduleMessageForReceiver($c,$receiverName,$delayMs,$m) {
 $c = $c|0;
 $receiverName = $receiverName|0;
 $delayMs = +$delayMs;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $receiverName;
 $2 = $delayMs;
 $3 = $m;
 $4 = $3;
 $5 = $0;
 $6 = (($5) + 16|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = $2;
 $9 = (+_fmax(0.0,$8));
 $10 = $0;
 $11 = (+_ctx_getSampleRate16($10));
 $12 = $9 * $11;
 $13 = $12 / 1000.0;
 $14 = (~~(($13))>>>0);
 $15 = (($7) + ($14))|0;
 _msg_setTimestamp($4,$15);
 $16 = $0;
 $17 = $1;
 $18 = $3;
 _ctx_scheduleMessageForReceiver($16,$17,$18);
 STACKTOP = sp;return;
}
function _msg_getByteSize11($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((120|0),(136|0),56,(160|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_setTimestamp($m,$timestamp) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $1;
 $3 = $0;
 HEAP32[$3>>2] = $2;
 STACKTOP = sp;return;
}
function _msg_setBang($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 HEAP32[$5>>2] = 0;
 $6 = $0;
 $7 = (($6) + 8|0);
 $8 = $1;
 $9 = (($7) + ($8<<3)|0);
 $10 = (($9) + 4|0);
 HEAP32[$10>>2] = 0;
 STACKTOP = sp;return;
}
function _msg_getFloat15($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_setFloat($m,$index,$f) {
 $m = $m|0;
 $index = $index|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $f;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 1;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAPF32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_setSymbol($m,$index,$s) {
 $m = $m|0;
 $index = $index|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $s;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 2;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _ctx_getSampleRate16($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = +HEAPF64[$2>>3];
 STACKTOP = sp;return (+$3);
}
function _ctx_getNumInputChannels($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getNumOutputChannels($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _ctx_setPrintHook($_c,$f) {
 $_c = $_c|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $f;
 $2 = $1;
 $3 = $0;
 $4 = (($3) + 88|0);
 HEAP32[$4>>2] = $2;
 STACKTOP = sp;return;
}
function _ctx_scheduleMessageForReceiver($_c,$name,$m) {
 $_c = $_c|0;
 $name = $name|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $name;
 $2 = $m;
 $3 = $0;
 $4 = (($3) + 24|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $0;
 $7 = $1;
 $8 = $2;
 FUNCTION_TABLE_viii[$5 & 15]($6,$7,$8);
 STACKTOP = sp;return;
}
function _hv_heavy_new($sampleRate) {
 $sampleRate = +$sampleRate;
 var $0 = 0.0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $_c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $sampleRate;
 $1 = (_malloc(136)|0);
 $_c = $1;
 $2 = $_c;
 HEAP32[$2>>2] = 0;
 $3 = $_c;
 $4 = (($3) + 4|0);
 HEAP32[$4>>2] = 2;
 $5 = $0;
 $6 = $_c;
 $7 = (($6) + 8|0);
 HEAPF64[$7>>3] = $5;
 $8 = $_c;
 $9 = (($8) + 16|0);
 HEAP32[$9>>2] = 0;
 $10 = $_c;
 $11 = (($10) + 24|0);
 HEAP32[$11>>2] = 7;
 $12 = $_c;
 $13 = (($12) + 28|0);
 HEAP32[$13>>2] = 8;
 $14 = $_c;
 $15 = (($14) + 32|0);
 _mq_initWithPoolSize($15,10);
 $16 = $_c;
 $17 = (($16) + 96|0);
 HEAP32[$17>>2] = 0;
 $18 = $_c;
 $19 = (($18) + 88|0);
 HEAP32[$19>>2] = 0;
 $20 = $_c;
 $21 = (($20) + 92|0);
 HEAP32[$21>>2] = 0;
 $22 = $_c;
 $23 = (($22) + 100|0);
 HEAP32[$23>>2] = 0;
 $24 = $_c;
 $25 = (($24) + 20|0);
 HEAP32[$25>>2] = 136;
 $26 = $_c;
 $27 = (($26) + 104|0);
 $28 = $0;
 $29 = (_sPhasor_k_init($27,440.0,$28)|0);
 $30 = $_c;
 $31 = (($30) + 20|0);
 $32 = HEAP32[$31>>2]|0;
 $33 = (($32) + ($29))|0;
 HEAP32[$31>>2] = $33;
 $34 = $_c;
 $35 = (($34) + 120|0);
 $36 = (_cVar_init_f($35,0.0)|0);
 $37 = $_c;
 $38 = (($37) + 20|0);
 $39 = HEAP32[$38>>2]|0;
 $40 = (($39) + ($36))|0;
 HEAP32[$38>>2] = $40;
 $41 = $_c;
 $42 = (_msg_getByteSize33(1)|0);
 $43 = STACKTOP; STACKTOP = STACKTOP + ((((1*$42)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $44 = (_msg_initWithBang($43,0)|0);
 (_ctx_scheduleMessage($41,$44,9,0)|0);
 $45 = $_c;
 STACKTOP = sp;return ($45|0);
}
function _hv_heavy_free($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 96|0);
 $3 = HEAP32[$2>>2]|0;
 _free($3);
 $4 = $0;
 $5 = (($4) + 32|0);
 _mq_free($5);
 $6 = $0;
 _free($6);
 STACKTOP = sp;return;
}
function _hv_heavy_process($_c,$inputBuffers,$outputBuffers,$n4) {
 $_c = $_c|0;
 $inputBuffers = $inputBuffers|0;
 $outputBuffers = $outputBuffers|0;
 $n4 = $n4|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0;
 var $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0, $61 = 0.0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0.0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $8 = 0, $9 = 0, $Bf0 = 0;
 var $Bf1 = 0, $Bf2 = 0, $Bf3 = 0, $O0 = 0, $O1 = 0, $ZERO = 0, $n = 0, $nextBlock = 0, $node = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Bf0 = sp + 40|0;
 $Bf1 = sp + 48|0;
 $Bf2 = sp + 52|0;
 $Bf3 = sp + 8|0;
 $O0 = sp + 4|0;
 $O1 = sp + 28|0;
 $ZERO = sp + 12|0;
 $0 = $_c;
 $1 = $inputBuffers;
 $2 = $outputBuffers;
 $3 = $n4;
 $4 = $3;
 $3 = $4;
 $5 = $3;
 $n = $5;
 _sZero_process($ZERO);
 $6 = $0;
 $7 = (($6) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $nextBlock = $8;
 while(1) {
  $9 = $3;
  $10 = ($9|0)!=(0);
  if (!($10)) {
   break;
  }
  $11 = $nextBlock;
  $12 = (($11) + 1)|0;
  $nextBlock = $12;
  while(1) {
   $13 = $0;
   $14 = (($13) + 32|0);
   $15 = $nextBlock;
   $16 = (_mq_hasMessageBefore($14,$15)|0);
   if (!($16)) {
    break;
   }
   $17 = $0;
   $18 = (($17) + 32|0);
   $19 = (_mq_peek($18)|0);
   $node = $19;
   $20 = $node;
   $21 = (($20) + 16|0);
   $22 = HEAP32[$21>>2]|0;
   $23 = $0;
   $24 = $node;
   $25 = (($24) + 8|0);
   $26 = HEAP32[$25>>2]|0;
   $27 = $node;
   $28 = (($27) + 12|0);
   $29 = HEAP32[$28>>2]|0;
   FUNCTION_TABLE_viii[$22 & 15]($23,$26,$29);
   $30 = $0;
   $31 = (($30) + 32|0);
   _mq_pop($31);
  }
  _sZero_process($O0);
  _sZero_process($O1);
  $32 = $0;
  $33 = (($32) + 104|0);
  ___hv_phasor_k_f($33,$Bf0);
  HEAPF32[$Bf1>>2] = 0.5;
  $34 = +HEAPF32[$Bf0>>2];
  $35 = +HEAPF32[$Bf1>>2];
  ___hv_sub_f($34,$35,$Bf1);
  $36 = +HEAPF32[$Bf1>>2];
  ___hv_abs_f($36,$Bf1);
  HEAPF32[$Bf0>>2] = 0.25;
  $37 = +HEAPF32[$Bf1>>2];
  $38 = +HEAPF32[$Bf0>>2];
  ___hv_sub_f($37,$38,$Bf0);
  HEAPF32[$Bf1>>2] = 6.2831897735595703;
  $39 = +HEAPF32[$Bf0>>2];
  $40 = +HEAPF32[$Bf1>>2];
  ___hv_mul_f($39,$40,$Bf1);
  $41 = +HEAPF32[$Bf1>>2];
  $42 = +HEAPF32[$Bf1>>2];
  ___hv_mul_f($41,$42,$Bf0);
  $43 = +HEAPF32[$Bf1>>2];
  $44 = +HEAPF32[$Bf0>>2];
  ___hv_mul_f($43,$44,$Bf2);
  HEAPF32[$Bf3>>2] = 0.16666699945926666;
  $45 = +HEAPF32[$Bf2>>2];
  $46 = +HEAPF32[$Bf3>>2];
  ___hv_mul_f($45,$46,$Bf3);
  $47 = +HEAPF32[$Bf1>>2];
  $48 = +HEAPF32[$Bf3>>2];
  ___hv_sub_f($47,$48,$Bf3);
  $49 = +HEAPF32[$Bf2>>2];
  $50 = +HEAPF32[$Bf0>>2];
  ___hv_mul_f($49,$50,$Bf0);
  HEAPF32[$Bf2>>2] = 0.0083333300426602364;
  $51 = +HEAPF32[$Bf0>>2];
  $52 = +HEAPF32[$Bf2>>2];
  ___hv_mul_f($51,$52,$Bf2);
  $53 = +HEAPF32[$Bf3>>2];
  $54 = +HEAPF32[$Bf2>>2];
  ___hv_add_f($53,$54,$Bf2);
  HEAPF32[$Bf3>>2] = 0.5;
  $55 = +HEAPF32[$Bf2>>2];
  $56 = +HEAPF32[$Bf3>>2];
  ___hv_mul_f($55,$56,$Bf3);
  $57 = +HEAPF32[$Bf3>>2];
  $58 = +HEAPF32[$O0>>2];
  ___hv_add_f($57,$58,$O0);
  $59 = $2;
  $60 = HEAP32[$59>>2]|0;
  $61 = +HEAPF32[$O0>>2];
  _sStore_process($60,$61);
  $62 = $2;
  $63 = HEAP32[$62>>2]|0;
  $64 = (($63) + 4|0);
  HEAP32[$62>>2] = $64;
  $65 = $2;
  $66 = (($65) + 4|0);
  $67 = HEAP32[$66>>2]|0;
  $68 = +HEAPF32[$O1>>2];
  _sStore_process($67,$68);
  $69 = $2;
  $70 = (($69) + 4|0);
  $71 = HEAP32[$70>>2]|0;
  $72 = (($71) + 4|0);
  HEAP32[$70>>2] = $72;
  $73 = $3;
  $74 = (($73) - 1)|0;
  $3 = $74;
 }
 $75 = $nextBlock;
 $76 = $0;
 $77 = (($76) + 16|0);
 HEAP32[$77>>2] = $75;
 $78 = $n;
 STACKTOP = sp;return ($78|0);
}
function _hv_heavy_process_inline($c,$inputBuffers,$outputBuffers,$n4) {
 $c = $c|0;
 $inputBuffers = $inputBuffers|0;
 $outputBuffers = $outputBuffers|0;
 $n4 = $n4|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $bIn = 0, $bOut = 0, $i = 0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $inputBuffers;
 $2 = $outputBuffers;
 $3 = $n4;
 $4 = $0;
 $5 = (_ctx_getNumInputChannels34($4)|0);
 $i = $5;
 $6 = $i;
 $7 = $6<<2;
 $8 = STACKTOP; STACKTOP = STACKTOP + ((((1*$7)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $bIn = $8;
 while(1) {
  $9 = $i;
  $10 = (($9) + -1)|0;
  $i = $10;
  $11 = ($9|0)!=(0);
  if (!($11)) {
   break;
  }
  $12 = $1;
  $13 = $i;
  $14 = $3;
  $15 = Math_imul($13, $14)|0;
  $16 = (($12) + ($15<<2)|0);
  $17 = $i;
  $18 = $bIn;
  $19 = (($18) + ($17<<2)|0);
  HEAP32[$19>>2] = $16;
 }
 $20 = $0;
 $21 = (_ctx_getNumOutputChannels35($20)|0);
 $i = $21;
 $22 = $i;
 $23 = $22<<2;
 $24 = STACKTOP; STACKTOP = STACKTOP + ((((1*$23)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $bOut = $24;
 while(1) {
  $25 = $i;
  $26 = (($25) + -1)|0;
  $i = $26;
  $27 = ($25|0)!=(0);
  if (!($27)) {
   break;
  }
  $28 = $2;
  $29 = $i;
  $30 = $3;
  $31 = Math_imul($29, $30)|0;
  $32 = (($28) + ($31<<2)|0);
  $33 = $i;
  $34 = $bOut;
  $35 = (($34) + ($33<<2)|0);
  HEAP32[$35>>2] = $32;
 }
 $36 = $0;
 $37 = $bIn;
 $38 = $bOut;
 $39 = $3;
 $40 = (_hv_heavy_process($36,$37,$38,$39)|0);
 $n = $40;
 $41 = $n;
 STACKTOP = sp;return ($41|0);
}
function _ctx_intern_scheduleMessageForReceiver($_c,$name,$m) {
 $_c = $_c|0;
 $name = $name|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $name;
 $2 = $m;
 $3 = $1;
 $4 = (_msg_symbolToHash($3)|0);
 $cond = ($4|0)==(1344747292);
 if ($cond) {
  $5 = $0;
  $6 = $2;
  (_ctx_scheduleMessage($5,$6,10,0)|0);
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _ctx_intern_getTableForHash($_c,$h) {
 $_c = $_c|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $h;
 STACKTOP = sp;return (0|0);
}
function _msg_getByteSize33($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((176|0),(192|0),56,(216|0));
  // unreachable;
 }
 return (0)|0;
}
function _cLoadbang_o97LG_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 120|0);
 $6 = $2;
 _cVar_onMessage($3,$5,0,$6,11);
 STACKTOP = sp;return;
}
function _ctx_scheduleMessage($_c,$m,$sendMessage,$outletIndex) {
 $_c = $_c|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 $outletIndex = $outletIndex|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $m;
 $2 = $sendMessage;
 $3 = $outletIndex;
 $4 = $0;
 $5 = (($4) + 32|0);
 $6 = $1;
 $7 = $3;
 $8 = $2;
 $9 = (_mq_addMessageByTimestamp($5,$6,$7,$8)|0);
 STACKTOP = sp;return ($9|0);
}
function _sZero_process($bOut) {
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bOut;
 $1 = $0;
 HEAPF32[$1>>2] = 0.0;
 STACKTOP = sp;return;
}
function _mq_hasMessageBefore($q,$timestamp) {
 $q = $q|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $timestamp;
 $2 = $0;
 $3 = (_mq_hasMessage($2)|0);
 if (!($3)) {
  $10 = 0;
  STACKTOP = sp;return ($10|0);
 }
 $4 = $0;
 $5 = HEAP32[$4>>2]|0;
 $6 = (_mq_node_getMessage($5)|0);
 $7 = (_msg_getTimestamp36($6)|0);
 $8 = $1;
 $9 = ($7>>>0)<($8>>>0);
 $10 = $9;
 STACKTOP = sp;return ($10|0);
}
function _mq_peek($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function ___hv_phasor_k_f($o,$bOut) {
 $o = $o|0;
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $bOut;
 $2 = $0;
 $3 = (($2) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $4 >>> 9;
 $6 = (+($5>>>0));
 $7 = $6 * 1.1920930376163597E-7;
 $8 = $1;
 HEAPF32[$8>>2] = $7;
 $9 = $0;
 $10 = (($9) + 8|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $0;
 $13 = (($12) + 4|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = (($14) + ($11))|0;
 HEAP32[$13>>2] = $15;
 STACKTOP = sp;return;
}
function ___hv_sub_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = $3 - $4;
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_abs_f($bIn,$bOut) {
 $bIn = +$bIn;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0, $2 = 0.0, $3 = 0.0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn;
 $1 = $bOut;
 $2 = $0;
 $3 = (+Math_abs((+$2)));
 $4 = $1;
 HEAPF32[$4>>2] = $3;
 STACKTOP = sp;return;
}
function ___hv_mul_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = $3 * $4;
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_add_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = $3 + $4;
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function _sStore_process($bOut,$bIn) {
 $bOut = $bOut|0;
 $bIn = +$bIn;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bOut;
 $1 = $bIn;
 $2 = $1;
 $3 = $0;
 HEAPF32[$3>>2] = $2;
 STACKTOP = sp;return;
}
function _ctx_getNumInputChannels34($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getNumOutputChannels35($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _cReceive_6QtVp_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,500.0,0,$4,12);
 STACKTOP = sp;return;
}
function _cVar_Xc2HH_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,0,0.75,0,$4,13);
 STACKTOP = sp;return;
}
function _mq_hasMessage($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0|0);
 STACKTOP = sp;return ($3|0);
}
function _mq_node_getMessage($n) {
 $n = $n|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $n;
 $1 = $0;
 $2 = (($1) + 12|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _msg_getTimestamp36($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _cBinop_CnKZZ_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,0,100.0,0,$4,14);
 STACKTOP = sp;return;
}
function _cBinop_q7lmS_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 104|0);
 $6 = $2;
 _sPhasor_k_onMessage($3,$5,1,$6);
 STACKTOP = sp;return;
}
function _cBinop_lC35Y_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 104|0);
 $6 = $2;
 _sPhasor_k_onMessage($3,$5,0,$6);
 $7 = $0;
 $8 = $2;
 _cPrint_onMessage($7,$8,232);
 STACKTOP = sp;return;
}
function _msg_init($m,$numElements,$timestamp) {
 $m = $m|0;
 $numElements = $numElements|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $numElements;
 $2 = $timestamp;
 $3 = $2;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $1;
 $6 = $5&65535;
 $7 = $0;
 $8 = (($7) + 4|0);
 HEAP16[$8>>1] = $6;
 $9 = $1;
 $10 = (_msg_getByteSize62($9)|0);
 $11 = $10&65535;
 $12 = $0;
 $13 = (($12) + 6|0);
 HEAP16[$13>>1] = $11;
 $14 = $0;
 STACKTOP = sp;return ($14|0);
}
function _msg_initWithFloat($m,$timestamp,$f) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $f;
 $3 = $1;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $0;
 $6 = (($5) + 4|0);
 HEAP16[$6>>1] = 1;
 $7 = $0;
 $8 = (($7) + 6|0);
 HEAP16[$8>>1] = 16;
 $9 = $0;
 $10 = $2;
 _msg_setFloat63($9,0,$10);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function _msg_initWithBang($m,$timestamp) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $1;
 $3 = $0;
 HEAP32[$3>>2] = $2;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAP16[$5>>1] = 1;
 $6 = $0;
 $7 = (($6) + 6|0);
 HEAP16[$7>>1] = 16;
 $8 = $0;
 _msg_setBang64($8,0);
 $9 = $0;
 STACKTOP = sp;return ($9|0);
}
function _msg_initWithHash($m,$timestamp,$h) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $h;
 $3 = $1;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $0;
 $6 = (($5) + 4|0);
 HEAP16[$6>>1] = 1;
 $7 = $0;
 $8 = (($7) + 6|0);
 HEAP16[$8>>1] = 16;
 $9 = $0;
 $10 = $2;
 _msg_setHash($9,0,$10);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function _msg_getNumHeapBytes($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $i = 0, $rsizeofsym = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $rsizeofsym = 0;
 $i = 0;
 while(1) {
  $1 = $i;
  $2 = $0;
  $3 = (_msg_getNumElements66($2)|0);
  $4 = ($1|0)<($3|0);
  if (!($4)) {
   break;
  }
  $5 = $0;
  $6 = $i;
  $7 = (_msg_isSymbol67($5,$6)|0);
  $8 = ($7|0)!=(0);
  if ($8) {
   $9 = $0;
   $10 = $i;
   $11 = (_msg_getSymbol68($9,$10)|0);
   $12 = (_strlen(($11|0))|0);
   $13 = (($12) + 1)|0;
   $14 = $rsizeofsym;
   $15 = (($14) + ($13))|0;
   $rsizeofsym = $15;
  }
  $16 = $i;
  $17 = (($16) + 1)|0;
  $i = $17;
 }
 $18 = $0;
 $19 = (_msg_getNumElements66($18)|0);
 $20 = (_msg_getByteSize62($19)|0);
 $21 = $rsizeofsym;
 $22 = (($20) + ($21))|0;
 STACKTOP = sp;return ($22|0);
}
function _msg_copyToBuffer($m,$buffer,$len) {
 $m = $m|0;
 $buffer = $buffer|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, $len_r = 0, $p = 0;
 var $r = 0, $symLen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $buffer;
 $2 = $len;
 $3 = $1;
 $r = $3;
 $4 = $0;
 $5 = (_msg_getNumBytes($4)|0);
 $6 = $2;
 $7 = ($5>>>0)<=($6>>>0);
 if (!($7)) {
  ___assert_fail((240|0),(272|0),102,(296|0));
  // unreachable;
 }
 $8 = $r;
 $9 = $0;
 $10 = $0;
 $11 = (_msg_getNumBytes($10)|0);
 _memcpy(($8|0),($9|0),($11|0))|0;
 $12 = $0;
 $13 = (_msg_getNumBytes($12)|0);
 $len_r = $13;
 $14 = $1;
 $15 = $0;
 $16 = (_msg_getNumElements66($15)|0);
 $17 = (_msg_getByteSize62($16)|0);
 $18 = (($14) + ($17)|0);
 $p = $18;
 $i = 0;
 while(1) {
  $19 = $i;
  $20 = $0;
  $21 = (_msg_getNumElements66($20)|0);
  $22 = ($19|0)<($21|0);
  if (!($22)) {
   label = 11;
   break;
  }
  $23 = $0;
  $24 = $i;
  $25 = (_msg_isSymbol67($23,$24)|0);
  $26 = ($25|0)!=(0);
  if ($26) {
   $27 = $0;
   $28 = $i;
   $29 = (_msg_getSymbol68($27,$28)|0);
   $30 = (_strlen(($29|0))|0);
   $31 = (($30) + 1)|0;
   $symLen = $31;
   $32 = $len_r;
   $33 = $symLen;
   $34 = (($32) + ($33))|0;
   $35 = $2;
   $36 = ($34>>>0)<=($35>>>0);
   if (!($36)) {
    label = 7;
    break;
   }
   $37 = $p;
   $38 = $0;
   $39 = $i;
   $40 = (_msg_getSymbol68($38,$39)|0);
   $41 = $symLen;
   (_strncpy(($37|0),($40|0),($41|0))|0);
   $42 = $r;
   $43 = $i;
   $44 = $p;
   _msg_setSymbol65($42,$43,$44);
   $45 = $symLen;
   $46 = $p;
   $47 = (($46) + ($45)|0);
   $p = $47;
   $48 = $symLen;
   $49 = $len_r;
   $50 = (($49) + ($48))|0;
   $len_r = $50;
  }
  $51 = $i;
  $52 = (($51) + 1)|0;
  $i = $52;
 }
 if ((label|0) == 7) {
  ___assert_fail((320|0),(272|0),113,(296|0));
  // unreachable;
 }
 else if ((label|0) == 11) {
  $53 = $len_r;
  $54 = $53&65535;
  $55 = $r;
  $56 = (($55) + 6|0);
  HEAP16[$56>>1] = $54;
  STACKTOP = sp;return;
 }
}
function _msg_getHash($m,$i) {
 $m = $m|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0;
 var $9 = 0, $f = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f = sp;
 $1 = $m;
 $2 = $i;
 $3 = $1;
 $4 = $2;
 $5 = (_msg_getType71($3,$4)|0);
 if ((($5|0) == 1)) {
  $6 = $1;
  $7 = $2;
  $8 = (+_msg_getFloat72($6,$7));
  HEAPF32[$f>>2] = $8;
  $9 = HEAP32[$f>>2]|0;
  $0 = $9;
 } else if ((($5|0) == 0)) {
  $0 = -1;
 } else if ((($5|0) == 2)) {
  $10 = $1;
  $11 = $2;
  $12 = (_msg_getSymbol68($10,$11)|0);
  $13 = (_msg_symbolToHash($12)|0);
  $0 = $13;
 } else if ((($5|0) == 3)) {
  $14 = $1;
  $15 = (($14) + 8|0);
  $16 = $2;
  $17 = (($15) + ($16<<3)|0);
  $18 = (($17) + 4|0);
  $19 = HEAP32[$18>>2]|0;
  $0 = $19;
 } else {
  $0 = 0;
 }
 $20 = $0;
 STACKTOP = sp;return ($20|0);
}
function _msg_symbolToHash($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k = 0, $len = 0;
 var $x = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $s;
 $1 = $0;
 $2 = (_strlen(($1|0))|0);
 $len = $2;
 $3 = $len;
 $x = $3;
 while(1) {
  $4 = $len;
  $5 = ($4|0)>=(4);
  if (!($5)) {
   break;
  }
  $6 = $0;
  $7 = HEAP32[$6>>2]|0;
  $k = $7;
  $8 = $k;
  $9 = Math_imul($8, 1540483477)|0;
  $k = $9;
  $10 = $k;
  $11 = $10 >>> 24;
  $12 = $k;
  $13 = $12 ^ $11;
  $k = $13;
  $14 = $k;
  $15 = Math_imul($14, 1540483477)|0;
  $k = $15;
  $16 = $x;
  $17 = Math_imul($16, 1540483477)|0;
  $x = $17;
  $18 = $k;
  $19 = $x;
  $20 = $19 ^ $18;
  $x = $20;
  $21 = $0;
  $22 = (($21) + 4|0);
  $0 = $22;
  $23 = $len;
  $24 = (($23) - 4)|0;
  $len = $24;
 }
 $25 = $len;
 if ((($25|0) == 1)) {
  label = 7;
 } else if ((($25|0) == 3)) {
  $26 = $0;
  $27 = (($26) + 2|0);
  $28 = HEAP8[$27>>0]|0;
  $29 = $28 << 24 >> 24;
  $30 = $29 << 16;
  $31 = $x;
  $32 = $31 ^ $30;
  $x = $32;
  label = 6;
 } else if ((($25|0) == 2)) {
  label = 6;
 }
 if ((label|0) == 6) {
  $33 = $0;
  $34 = (($33) + 1|0);
  $35 = HEAP8[$34>>0]|0;
  $36 = $35 << 24 >> 24;
  $37 = $36 << 8;
  $38 = $x;
  $39 = $38 ^ $37;
  $x = $39;
  label = 7;
 }
 if ((label|0) == 7) {
  $40 = $0;
  $41 = HEAP8[$40>>0]|0;
  $42 = $41 << 24 >> 24;
  $43 = $x;
  $44 = $43 ^ $42;
  $x = $44;
  $45 = $x;
  $46 = Math_imul($45, 1540483477)|0;
  $x = $46;
 }
 $47 = $x;
 $48 = $47 >>> 13;
 $49 = $x;
 $50 = $49 ^ $48;
 $x = $50;
 $51 = $x;
 $52 = Math_imul($51, 1540483477)|0;
 $x = $52;
 $53 = $x;
 $54 = $53 >>> 15;
 $55 = $x;
 $56 = $55 ^ $54;
 $x = $56;
 $57 = $x;
 STACKTOP = sp;return ($57|0);
}
function _msg_toString($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $finalString = 0;
 var $i = 0, $i1 = 0, $lengths = 0, $pos = 0, $size = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer13 = 0, $vararg_buffer16 = 0, $vararg_buffer19 = 0, $vararg_buffer4 = 0, $vararg_buffer7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 96|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer19 = sp + 56|0;
 $vararg_buffer16 = sp + 40|0;
 $vararg_buffer13 = sp + 16|0;
 $vararg_buffer10 = sp + 32|0;
 $vararg_buffer7 = sp + 8|0;
 $vararg_buffer4 = sp;
 $vararg_buffer1 = sp + 24|0;
 $vararg_buffer = sp + 48|0;
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 $5 = $4<<2;
 $6 = STACKTOP; STACKTOP = STACKTOP + ((((1*$5)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $lengths = $6;
 $size = 0;
 $pos = 0;
 $i = 0;
 while(1) {
  $7 = $i;
  $8 = $0;
  $9 = (_msg_getNumElements66($8)|0);
  $10 = ($7|0)<($9|0);
  if (!($10)) {
   break;
  }
  $11 = $i;
  $12 = $lengths;
  $13 = (($12) + ($11<<2)|0);
  HEAP32[$13>>2] = 0;
  $14 = $0;
  $15 = $i;
  $16 = (_msg_getType71($14,$15)|0);
  if ((($16|0) == 3)) {
   $36 = $0;
   $37 = $i;
   $38 = (_msg_getHash($36,$37)|0);
   HEAP32[$vararg_buffer7>>2] = $38;
   $39 = (_snprintf(0,0,368,$vararg_buffer7)|0);
   $40 = $i;
   $41 = $lengths;
   $42 = (($41) + ($40<<2)|0);
   HEAP32[$42>>2] = $39;
  } else if ((($16|0) == 0)) {
   HEAP32[$vararg_buffer>>2] = 352;
   $17 = (_snprintf(0,0,344,$vararg_buffer)|0);
   $18 = $i;
   $19 = $lengths;
   $20 = (($19) + ($18<<2)|0);
   HEAP32[$20>>2] = $17;
  } else if ((($16|0) == 1)) {
   $21 = $0;
   $22 = $i;
   $23 = (+_msg_getFloat72($21,$22));
   $24 = $23;
   HEAPF64[tempDoublePtr>>3]=$24;HEAP32[$vararg_buffer1>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer1+4>>2]=HEAP32[tempDoublePtr+4>>2];
   $25 = (_snprintf(0,0,360,$vararg_buffer1)|0);
   $26 = $i;
   $27 = $lengths;
   $28 = (($27) + ($26<<2)|0);
   HEAP32[$28>>2] = $25;
  } else if ((($16|0) == 2)) {
   $29 = $0;
   $30 = $i;
   $31 = (_msg_getSymbol68($29,$30)|0);
   HEAP32[$vararg_buffer4>>2] = $31;
   $32 = (_snprintf(0,0,344,$vararg_buffer4)|0);
   $33 = $i;
   $34 = $lengths;
   $35 = (($34) + ($33<<2)|0);
   HEAP32[$35>>2] = $32;
  } else {
  }
  $43 = $i;
  $44 = $lengths;
  $45 = (($44) + ($43<<2)|0);
  $46 = HEAP32[$45>>2]|0;
  $47 = (($46) + 1)|0;
  $48 = $size;
  $49 = (($48) + ($47))|0;
  $size = $49;
  $50 = $i;
  $51 = (($50) + 1)|0;
  $i = $51;
 }
 $52 = $size;
 $53 = ($52|0)<=(0);
 $54 = $53 ? 1 : 1;
 $55 = (_malloc($54)|0);
 $finalString = $55;
 $i1 = 0;
 while(1) {
  $56 = $i1;
  $57 = $0;
  $58 = (_msg_getNumElements66($57)|0);
  $59 = ($56|0)<($58|0);
  if (!($59)) {
   break;
  }
  $60 = $i1;
  $61 = ($60|0)>(0);
  if ($61) {
   $62 = $finalString;
   (_strncat($62,376,1)|0);
   $63 = $pos;
   $64 = (($63) + 1)|0;
   $pos = $64;
  }
  $65 = $0;
  $66 = $i1;
  $67 = (_msg_getType71($65,$66)|0);
  if ((($67|0) == 0)) {
   $68 = $pos;
   $69 = $finalString;
   $70 = (($69) + ($68)|0);
   $71 = $i1;
   $72 = $lengths;
   $73 = (($72) + ($71<<2)|0);
   $74 = HEAP32[$73>>2]|0;
   $75 = (($74) + 1)|0;
   HEAP32[$vararg_buffer10>>2] = 352;
   (_snprintf($70,$75,344,$vararg_buffer10)|0);
  } else if ((($67|0) == 1)) {
   $76 = $pos;
   $77 = $finalString;
   $78 = (($77) + ($76)|0);
   $79 = $i1;
   $80 = $lengths;
   $81 = (($80) + ($79<<2)|0);
   $82 = HEAP32[$81>>2]|0;
   $83 = (($82) + 1)|0;
   $84 = $0;
   $85 = $i1;
   $86 = (+_msg_getFloat72($84,$85));
   $87 = $86;
   HEAPF64[tempDoublePtr>>3]=$87;HEAP32[$vararg_buffer13>>2]=HEAP32[tempDoublePtr>>2];HEAP32[$vararg_buffer13+4>>2]=HEAP32[tempDoublePtr+4>>2];
   (_snprintf($78,$83,360,$vararg_buffer13)|0);
  } else if ((($67|0) == 2)) {
   $88 = $pos;
   $89 = $finalString;
   $90 = (($89) + ($88)|0);
   $91 = $i1;
   $92 = $lengths;
   $93 = (($92) + ($91<<2)|0);
   $94 = HEAP32[$93>>2]|0;
   $95 = (($94) + 1)|0;
   $96 = $0;
   $97 = $i1;
   $98 = (_msg_getSymbol68($96,$97)|0);
   HEAP32[$vararg_buffer16>>2] = $98;
   (_snprintf($90,$95,344,$vararg_buffer16)|0);
  } else if ((($67|0) == 3)) {
   $99 = $pos;
   $100 = $finalString;
   $101 = (($100) + ($99)|0);
   $102 = $i1;
   $103 = $lengths;
   $104 = (($103) + ($102<<2)|0);
   $105 = HEAP32[$104>>2]|0;
   $106 = (($105) + 1)|0;
   $107 = $0;
   $108 = $i1;
   $109 = (_msg_getHash($107,$108)|0);
   HEAP32[$vararg_buffer19>>2] = $109;
   (_snprintf($101,$106,368,$vararg_buffer19)|0);
  } else {
  }
  $110 = $i1;
  $111 = $lengths;
  $112 = (($111) + ($110<<2)|0);
  $113 = HEAP32[$112>>2]|0;
  $114 = $pos;
  $115 = (($114) + ($113))|0;
  $pos = $115;
  $116 = $i1;
  $117 = (($116) + 1)|0;
  $i1 = $117;
 }
 $118 = $finalString;
 STACKTOP = sp;return ($118|0);
}
function _msg_getByteSize62($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((384|0),(400|0),56,(424|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_setFloat63($m,$index,$f) {
 $m = $m|0;
 $index = $index|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $f;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 1;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAPF32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_setBang64($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 HEAP32[$5>>2] = 0;
 $6 = $0;
 $7 = (($6) + 8|0);
 $8 = $1;
 $9 = (($7) + ($8<<3)|0);
 $10 = (($9) + 4|0);
 HEAP32[$10>>2] = 0;
 STACKTOP = sp;return;
}
function _msg_setSymbol65($m,$index,$s) {
 $m = $m|0;
 $index = $index|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $s;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 2;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_setHash($m,$index,$h) {
 $m = $m|0;
 $index = $index|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $h;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 3;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_getNumElements66($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _msg_isSymbol67($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(2);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getSymbol68($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 STACKTOP = sp;return ($7|0);
}
function _msg_getNumBytes($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 6|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _msg_getType71($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getFloat72($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _mp_init($mp,$numKB) {
 $mp = $mp|0;
 $numKB = $numKB|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mp;
 $1 = $numKB;
 $2 = $1;
 $3 = $2<<10;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAP32[$5>>2] = $3;
 $6 = $0;
 $7 = (($6) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (_malloc($8)|0);
 $10 = $0;
 HEAP32[$10>>2] = $9;
 $11 = $0;
 $12 = (($11) + 8|0);
 HEAP32[$12>>2] = 0;
 $i = 0;
 while(1) {
  $13 = $i;
  $14 = ($13|0)<(4);
  if (!($14)) {
   break;
  }
  $15 = $i;
  $16 = $0;
  $17 = (($16) + 12|0);
  $18 = (($17) + ($15<<3)|0);
  HEAP32[$18>>2] = 0;
  $19 = $i;
  $20 = $0;
  $21 = (($20) + 12|0);
  $22 = (($21) + ($19<<3)|0);
  $23 = (($22) + 4|0);
  HEAP32[$23>>2] = 0;
  $24 = $i;
  $25 = (($24) + 1)|0;
  $i = $25;
 }
 $26 = $0;
 $27 = (($26) + 4|0);
 $28 = HEAP32[$27>>2]|0;
 STACKTOP = sp;return ($28|0);
}
function _mp_free($mp) {
 $mp = $mp|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mp;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 _free($2);
 $i = 0;
 while(1) {
  $3 = $i;
  $4 = ($3|0)<(4);
  if (!($4)) {
   break;
  }
  $5 = $i;
  $6 = $0;
  $7 = (($6) + 12|0);
  $8 = (($7) + ($5<<3)|0);
  _ml_free($8);
  $9 = $i;
  $10 = (($9) + 1)|0;
  $i = $10;
 }
 STACKTOP = sp;return;
}
function _mp_freeMessage($mp,$m) {
 $mp = $mp|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $chunkSize = 0, $i = 0, $ml = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mp;
 $1 = $m;
 $2 = $1;
 $3 = (_msg_getNumBytes81($2)|0);
 $b = $3;
 $4 = $b;
 $5 = (_mp_messagelistIndexForSize($4)|0);
 $i = $5;
 $6 = $i;
 $7 = $0;
 $8 = (($7) + 12|0);
 $9 = (($8) + ($6<<3)|0);
 $ml = $9;
 $10 = $i;
 $11 = 32 << $10;
 $chunkSize = $11;
 $12 = $1;
 $13 = $chunkSize;
 _memset(($12|0),0,($13|0))|0;
 $14 = $ml;
 $15 = $1;
 _ml_push($14,$15);
 STACKTOP = sp;return;
}
function _mp_addMessage($mp,$m) {
 $mp = $mp|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $buf = 0, $buf2 = 0, $chunkSize = 0;
 var $i = 0, $i1 = 0, $ml = 0, $newIndex = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $mp;
 $2 = $m;
 $3 = $2;
 $4 = (_msg_getNumHeapBytes($3)|0);
 $b = $4;
 $5 = $b;
 $6 = (_mp_messagelistIndexForSize($5)|0);
 $i = $6;
 $7 = $i;
 $8 = ($7>>>0)<(4);
 if (!($8)) {
  ___assert_fail((440|0),(472|0),127,(496|0));
  // unreachable;
 }
 $9 = $i;
 $10 = $1;
 $11 = (($10) + 12|0);
 $12 = (($11) + ($9<<3)|0);
 $ml = $12;
 $13 = $i;
 $14 = 32 << $13;
 $chunkSize = $14;
 $15 = $ml;
 $16 = (_ml_hasAvailable($15)|0);
 if ($16) {
  $17 = $ml;
  $18 = (_ml_pop($17)|0);
  $buf = $18;
  $19 = $2;
  $20 = $buf;
  $21 = $chunkSize;
  _msg_copyToBuffer($19,$20,$21);
  $22 = $buf;
  $0 = $22;
  $55 = $0;
  STACKTOP = sp;return ($55|0);
 }
 $23 = $1;
 $24 = (($23) + 8|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = (($25) + 512)|0;
 $newIndex = $26;
 $27 = $newIndex;
 $28 = $1;
 $29 = (($28) + 4|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = ($27>>>0)<=($30>>>0);
 if (!($31)) {
  ___assert_fail((512|0),(472|0),138,(496|0));
  // unreachable;
 }
 $32 = $1;
 $33 = (($32) + 8|0);
 $34 = HEAP32[$33>>2]|0;
 $i1 = $34;
 while(1) {
  $35 = $i1;
  $36 = $newIndex;
  $37 = ($35>>>0)<($36>>>0);
  if (!($37)) {
   break;
  }
  $38 = $ml;
  $39 = $1;
  $40 = HEAP32[$39>>2]|0;
  $41 = $i1;
  $42 = (($40) + ($41)|0);
  _ml_push($38,$42);
  $43 = $chunkSize;
  $44 = $i1;
  $45 = (($44) + ($43))|0;
  $i1 = $45;
 }
 $46 = $newIndex;
 $47 = $1;
 $48 = (($47) + 8|0);
 HEAP32[$48>>2] = $46;
 $49 = $ml;
 $50 = (_ml_pop($49)|0);
 $buf2 = $50;
 $51 = $2;
 $52 = $buf2;
 $53 = $chunkSize;
 _msg_copyToBuffer($51,$52,$53);
 $54 = $buf2;
 $0 = $54;
 $55 = $0;
 STACKTOP = sp;return ($55|0);
}
function _ml_free($ml) {
 $ml = $ml|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $0;
 $2 = ($1|0)!=(0|0);
 if (!($2)) {
  STACKTOP = sp;return;
 }
 while(1) {
  $3 = $0;
  $4 = (_ml_hasAvailable($3)|0);
  if (!($4)) {
   break;
  }
  $5 = $0;
  (_ml_pop($5)|0);
 }
 while(1) {
  $6 = $0;
  $7 = (($6) + 4|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ($8|0)!=(0|0);
  if (!($9)) {
   break;
  }
  $10 = $0;
  $11 = (($10) + 4|0);
  $12 = HEAP32[$11>>2]|0;
  $n = $12;
  $13 = $n;
  $14 = (($13) + 4|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = $0;
  $17 = (($16) + 4|0);
  HEAP32[$17>>2] = $15;
  $18 = $n;
  _free($18);
 }
 STACKTOP = sp;return;
}
function _msg_getNumBytes81($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 6|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _mp_messagelistIndexForSize($byteSize) {
 $byteSize = $byteSize|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $byteSize;
 $1 = $0;
 $2 = (_hv_min_max_log2($1)|0);
 $3 = (($2) - 5)|0;
 $4 = (_hv_max_i($3,0)|0);
 STACKTOP = sp;return ($4|0);
}
function _ml_push($ml,$p) {
 $ml = $ml|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $p;
 $n = 0;
 $2 = $0;
 $3 = (($2) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 if ($5) {
  $6 = $0;
  $7 = (($6) + 4|0);
  $8 = HEAP32[$7>>2]|0;
  $n = $8;
  $9 = $n;
  $10 = (($9) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = $0;
  $13 = (($12) + 4|0);
  HEAP32[$13>>2] = $11;
 } else {
  $14 = (_malloc(8)|0);
  $n = $14;
 }
 $15 = $1;
 $16 = $n;
 HEAP32[$16>>2] = $15;
 $17 = $0;
 $18 = HEAP32[$17>>2]|0;
 $19 = $n;
 $20 = (($19) + 4|0);
 HEAP32[$20>>2] = $18;
 $21 = $n;
 $22 = $0;
 HEAP32[$22>>2] = $21;
 STACKTOP = sp;return;
}
function _ml_hasAvailable($ml) {
 $ml = $ml|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0|0);
 STACKTOP = sp;return ($3|0);
}
function _ml_pop($ml) {
 $ml = $ml|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var $p = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $n = $2;
 $3 = $n;
 $4 = (($3) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $0;
 HEAP32[$6>>2] = $5;
 $7 = $0;
 $8 = (($7) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $n;
 $11 = (($10) + 4|0);
 HEAP32[$11>>2] = $9;
 $12 = $n;
 $13 = $0;
 $14 = (($13) + 4|0);
 HEAP32[$14>>2] = $12;
 $15 = $n;
 $16 = HEAP32[$15>>2]|0;
 $p = $16;
 $17 = $n;
 HEAP32[$17>>2] = 0;
 $18 = $p;
 STACKTOP = sp;return ($18|0);
}
function _mq_initWithPoolSize($q,$poolSizeKB) {
 $q = $q|0;
 $poolSizeKB = $poolSizeKB|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $poolSizeKB;
 $2 = $0;
 HEAP32[$2>>2] = 0;
 $3 = $0;
 $4 = (($3) + 4|0);
 HEAP32[$4>>2] = 0;
 $5 = $0;
 $6 = (($5) + 8|0);
 HEAP32[$6>>2] = 0;
 $7 = $0;
 $8 = (($7) + 12|0);
 $9 = $1;
 (_mp_init($8,$9)|0);
 STACKTOP = sp;return;
}
function _mq_free($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 _mq_clear($1);
 while(1) {
  $2 = $0;
  $3 = (($2) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)!=(0|0);
  if (!($5)) {
   break;
  }
  $6 = $0;
  $7 = (($6) + 8|0);
  $8 = HEAP32[$7>>2]|0;
  $n = $8;
  $9 = $0;
  $10 = (($9) + 8|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = (($11) + 4|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = $0;
  $15 = (($14) + 8|0);
  HEAP32[$15>>2] = $13;
  $16 = $n;
  _free($16);
 }
 $17 = $0;
 $18 = (($17) + 12|0);
 _mp_free($18);
 STACKTOP = sp;return;
}
function _mq_clear($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 while(1) {
  $1 = $0;
  $2 = (_mq_hasMessage92($1)|0);
  if (!($2)) {
   break;
  }
  $3 = $0;
  _mq_pop($3);
 }
 STACKTOP = sp;return;
}
function _mq_addMessage($q,$m,$let,$sendMessage) {
 $q = $q|0;
 $m = $m|0;
 $let = $let|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $node = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $m;
 $2 = $let;
 $3 = $sendMessage;
 $4 = $0;
 $5 = (_mq_getOrCreateNodeFromPool($4)|0);
 $node = $5;
 $6 = $0;
 $7 = (($6) + 12|0);
 $8 = $1;
 $9 = (_mp_addMessage($7,$8)|0);
 $10 = $node;
 $11 = (($10) + 12|0);
 HEAP32[$11>>2] = $9;
 $12 = $2;
 $13 = $node;
 $14 = (($13) + 8|0);
 HEAP32[$14>>2] = $12;
 $15 = $3;
 $16 = $node;
 $17 = (($16) + 16|0);
 HEAP32[$17>>2] = $15;
 $18 = $node;
 HEAP32[$18>>2] = 0;
 $19 = $node;
 $20 = (($19) + 4|0);
 HEAP32[$20>>2] = 0;
 $21 = $0;
 $22 = (($21) + 4|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ($23|0)!=(0|0);
 if ($24) {
  $25 = $node;
  $26 = $0;
  $27 = (($26) + 4|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = (($28) + 4|0);
  HEAP32[$29>>2] = $25;
  $30 = $0;
  $31 = (($30) + 4|0);
  $32 = HEAP32[$31>>2]|0;
  $33 = $node;
  HEAP32[$33>>2] = $32;
  $34 = $node;
  $35 = $0;
  $36 = (($35) + 4|0);
  HEAP32[$36>>2] = $34;
  $43 = $node;
  $44 = (_mq_node_getMessage93($43)|0);
  STACKTOP = sp;return ($44|0);
 } else {
  $37 = $node;
  HEAP32[$37>>2] = 0;
  $38 = $node;
  $39 = $0;
  HEAP32[$39>>2] = $38;
  $40 = $node;
  $41 = $0;
  $42 = (($41) + 4|0);
  HEAP32[$42>>2] = $40;
  $43 = $node;
  $44 = (_mq_node_getMessage93($43)|0);
  STACKTOP = sp;return ($44|0);
 }
 return (0)|0;
}
function _mq_addMessageByTimestamp($q,$m,$let,$sendMessage) {
 $q = $q|0;
 $m = $m|0;
 $let = $let|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $n = 0, $node = 0, $r = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $q;
 $2 = $m;
 $3 = $let;
 $4 = $sendMessage;
 $5 = $1;
 $6 = (_mq_hasMessage92($5)|0);
 if (!($6)) {
  $94 = $1;
  $95 = $2;
  $96 = $3;
  $97 = $4;
  $98 = (_mq_addMessage($94,$95,$96,$97)|0);
  $0 = $98;
  $99 = $0;
  STACKTOP = sp;return ($99|0);
 }
 $7 = $1;
 $8 = (_mq_getOrCreateNodeFromPool($7)|0);
 $n = $8;
 $9 = $1;
 $10 = (($9) + 12|0);
 $11 = $2;
 $12 = (_mp_addMessage($10,$11)|0);
 $13 = $n;
 $14 = (($13) + 12|0);
 HEAP32[$14>>2] = $12;
 $15 = $3;
 $16 = $n;
 $17 = (($16) + 8|0);
 HEAP32[$17>>2] = $15;
 $18 = $4;
 $19 = $n;
 $20 = (($19) + 16|0);
 HEAP32[$20>>2] = $18;
 $21 = $2;
 $22 = (_msg_getTimestamp94($21)|0);
 $23 = $1;
 $24 = HEAP32[$23>>2]|0;
 $25 = (($24) + 12|0);
 $26 = HEAP32[$25>>2]|0;
 $27 = (_msg_getTimestamp94($26)|0);
 $28 = ($22>>>0)<($27>>>0);
 if ($28) {
  $29 = $1;
  $30 = HEAP32[$29>>2]|0;
  $31 = $n;
  $32 = (($31) + 4|0);
  HEAP32[$32>>2] = $30;
  $33 = $n;
  $34 = $1;
  $35 = HEAP32[$34>>2]|0;
  HEAP32[$35>>2] = $33;
  $36 = $n;
  HEAP32[$36>>2] = 0;
  $37 = $n;
  $38 = $1;
  HEAP32[$38>>2] = $37;
 } else {
  $39 = $2;
  $40 = (_msg_getTimestamp94($39)|0);
  $41 = $1;
  $42 = (($41) + 4|0);
  $43 = HEAP32[$42>>2]|0;
  $44 = (($43) + 12|0);
  $45 = HEAP32[$44>>2]|0;
  $46 = (_msg_getTimestamp94($45)|0);
  $47 = ($40>>>0)>=($46>>>0);
  if ($47) {
   $48 = $n;
   $49 = (($48) + 4|0);
   HEAP32[$49>>2] = 0;
   $50 = $1;
   $51 = (($50) + 4|0);
   $52 = HEAP32[$51>>2]|0;
   $53 = $n;
   HEAP32[$53>>2] = $52;
   $54 = $n;
   $55 = $1;
   $56 = (($55) + 4|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = (($57) + 4|0);
   HEAP32[$58>>2] = $54;
   $59 = $n;
   $60 = $1;
   $61 = (($60) + 4|0);
   HEAP32[$61>>2] = $59;
  } else {
   $62 = $1;
   $63 = HEAP32[$62>>2]|0;
   $node = $63;
   while(1) {
    $64 = $node;
    $65 = ($64|0)!=(0|0);
    if (!($65)) {
     break;
    }
    $66 = $2;
    $67 = HEAP32[$66>>2]|0;
    $68 = $node;
    $69 = (($68) + 4|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = (($70) + 12|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (_msg_getTimestamp94($72)|0);
    $74 = ($67>>>0)<($73>>>0);
    if ($74) {
     label = 9;
     break;
    }
    $88 = $node;
    $89 = (($88) + 4|0);
    $90 = HEAP32[$89>>2]|0;
    $node = $90;
   }
   if ((label|0) == 9) {
    $75 = $node;
    $76 = (($75) + 4|0);
    $77 = HEAP32[$76>>2]|0;
    $r = $77;
    $78 = $n;
    $79 = $node;
    $80 = (($79) + 4|0);
    HEAP32[$80>>2] = $78;
    $81 = $r;
    $82 = $n;
    $83 = (($82) + 4|0);
    HEAP32[$83>>2] = $81;
    $84 = $node;
    $85 = $n;
    HEAP32[$85>>2] = $84;
    $86 = $n;
    $87 = $r;
    HEAP32[$87>>2] = $86;
   }
  }
 }
 $91 = $n;
 $92 = (($91) + 12|0);
 $93 = HEAP32[$92>>2]|0;
 $0 = $93;
 $99 = $0;
 STACKTOP = sp;return ($99|0);
}
function _mq_pop($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = (_mq_hasMessage92($1)|0);
 if (!($2)) {
  STACKTOP = sp;return;
 }
 $3 = $0;
 $4 = HEAP32[$3>>2]|0;
 $n = $4;
 $5 = $0;
 $6 = (($5) + 12|0);
 $7 = $n;
 $8 = (($7) + 12|0);
 $9 = HEAP32[$8>>2]|0;
 _mp_freeMessage($6,$9);
 $10 = $n;
 $11 = (($10) + 12|0);
 HEAP32[$11>>2] = 0;
 $12 = $n;
 $13 = (($12) + 8|0);
 HEAP32[$13>>2] = 0;
 $14 = $n;
 $15 = (($14) + 16|0);
 HEAP32[$15>>2] = 0;
 $16 = $n;
 $17 = (($16) + 4|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = $0;
 HEAP32[$19>>2] = $18;
 $20 = $0;
 $21 = HEAP32[$20>>2]|0;
 $22 = ($21|0)==(0|0);
 if ($22) {
  $23 = $0;
  $24 = (($23) + 4|0);
  HEAP32[$24>>2] = 0;
 } else {
  $25 = $0;
  $26 = HEAP32[$25>>2]|0;
  HEAP32[$26>>2] = 0;
 }
 $27 = $0;
 $28 = (($27) + 8|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = $n;
 $31 = (($30) + 4|0);
 HEAP32[$31>>2] = $29;
 $32 = $n;
 HEAP32[$32>>2] = 0;
 $33 = $n;
 $34 = $0;
 $35 = (($34) + 8|0);
 HEAP32[$35>>2] = $33;
 STACKTOP = sp;return;
}
function _mq_hasMessage92($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0|0);
 STACKTOP = sp;return ($3|0);
}
function _mq_getOrCreateNodeFromPool($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $node = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0|0);
 if ($4) {
  $5 = (_malloc(20)|0);
  $6 = $0;
  $7 = (($6) + 8|0);
  HEAP32[$7>>2] = $5;
  $8 = $0;
  $9 = (($8) + 8|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = (($10) + 4|0);
  HEAP32[$11>>2] = 0;
 }
 $12 = $0;
 $13 = (($12) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $node = $14;
 $15 = $0;
 $16 = (($15) + 8|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (($17) + 4|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = $0;
 $21 = (($20) + 8|0);
 HEAP32[$21>>2] = $19;
 $22 = $node;
 STACKTOP = sp;return ($22|0);
}
function _mq_node_getMessage93($n) {
 $n = $n|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $n;
 $1 = $0;
 $2 = (($1) + 12|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _msg_getTimestamp94($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _sPhasor_k_init($o,$frequency,$samplerate) {
 $o = $o|0;
 $frequency = +$frequency;
 $samplerate = +$samplerate;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $frequency;
 $2 = $samplerate;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 _sPhasor_updateFrequency($3,$4,$5);
 $6 = $0;
 _sPhasor_updatePhase($6,0.0);
 STACKTOP = sp;return 0;
}
function _sPhasor_k_onMessage($_c,$o,$letIn,$m) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $3;
 $5 = (_msg_isFloat99($4,0)|0);
 $6 = ($5|0)!=(0);
 if (!($6)) {
  STACKTOP = sp;return;
 }
 $7 = $2;
 if ((($7|0) == 1)) {
  $13 = $1;
  $14 = $3;
  $15 = (+_msg_getFloat100($14,0));
  _sPhasor_updatePhase($13,$15);
 } else if ((($7|0) == 0)) {
  $8 = $1;
  $9 = $3;
  $10 = (+_msg_getFloat100($9,0));
  $11 = $0;
  $12 = (+_ctx_getSampleRate101($11));
  _sPhasor_updateFrequency($8,$10,$12);
 } else {
 }
 STACKTOP = sp;return;
}
function _msg_isFloat99($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat100($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _sPhasor_updateFrequency($o,$f,$r) {
 $o = $o|0;
 $f = +$f;
 $r = +$r;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $f;
 $2 = $r;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = 4294967295.0 / $5;
 $7 = $4 * $6;
 $8 = (~~(($7)));
 $9 = $0;
 HEAP32[$9>>2] = $8;
 $10 = $0;
 $11 = HEAP32[$10>>2]|0;
 $12 = $0;
 $13 = (($12) + 8|0);
 HEAP32[$13>>2] = $11;
 STACKTOP = sp;return;
}
function _sPhasor_updatePhase($o,$phase) {
 $o = $o|0;
 $phase = +$phase;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, $p = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $phase;
 while(1) {
  $2 = $1;
  $3 = $2 < 0.0;
  if (!($3)) {
   break;
  }
  $4 = $1;
  $5 = $4 + 1.0;
  $1 = $5;
 }
 while(1) {
  $6 = $1;
  $7 = $6 > 1.0;
  if (!($7)) {
   break;
  }
  $8 = $1;
  $9 = $8 - 1.0;
  $1 = $9;
 }
 $10 = $1;
 $11 = $10;
 $12 = $11 * 4294967295.0;
 $13 = (~~(($12))>>>0);
 $p = $13;
 $14 = $p;
 $15 = $0;
 $16 = (($15) + 4|0);
 HEAP32[$16>>2] = $14;
 STACKTOP = sp;return;
}
function _ctx_getSampleRate101($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = +HEAPF64[$2>>3];
 STACKTOP = sp;return (+$3);
}
function _hv_max_i($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0;
 $3 = $1;
 $4 = ($2|0)>=($3|0);
 if ($4) {
  $5 = $0;
  $7 = $5;
 } else {
  $6 = $1;
  $7 = $6;
 }
 STACKTOP = sp;return ($7|0);
}
function _hv_min_max_log2($x) {
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0;
 $2 = (($1) - 1)|0;
 $3 = (_llvm_ctlz_i32(($2|0))|0);
 $4 = (32 - ($3))|0;
 STACKTOP = sp;return ($4|0);
}
function _strncat($d,$s,$n) {
 $d = $d|0;
 $s = $s|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$014 = 0, $$023 = 0, $$05 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_strlen(($d|0))|0);
 $1 = (($d) + ($0)|0);
 $2 = ($n|0)==(0);
 L1: do {
  if ($2) {
   $$0$lcssa = $1;
  } else {
   $$014 = $n;$$023 = $s;$$05 = $1;
   while(1) {
    $3 = HEAP8[$$023>>0]|0;
    $4 = ($3<<24>>24)==(0);
    if ($4) {
     $$0$lcssa = $$05;
     break L1;
    }
    $5 = (($$014) + -1)|0;
    $6 = (($$023) + 1|0);
    $7 = (($$05) + 1|0);
    HEAP8[$$05>>0] = $3;
    $8 = ($5|0)==(0);
    if ($8) {
     $$0$lcssa = $7;
     break;
    } else {
     $$014 = $5;$$023 = $6;$$05 = $7;
    }
   }
  }
 } while(0);
 HEAP8[$$0$lcssa>>0] = 0;
 STACKTOP = sp;return ($d|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0;
 var $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0;
 var $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0;
 var $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0;
 var $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0;
 var $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0;
 var $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0;
 var $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0;
 var $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0;
 var $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0;
 var $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0;
 var $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0;
 var $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0;
 var $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0;
 var $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0;
 var $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0;
 var $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0;
 var $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0;
 var $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0;
 var $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0;
 var $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0;
 var $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0;
 var $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0;
 var $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0;
 var $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0;
 var $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0;
 var $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0;
 var $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0;
 var $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0;
 var $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0;
 var $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0;
 var $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0;
 var $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0;
 var $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0;
 var $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0;
 var $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0;
 var $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0;
 var $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0;
 var $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0;
 var $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0;
 var $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0;
 var $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0;
 var $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0;
 var $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0;
 var $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0;
 var $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0;
 var $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0;
 var $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0;
 var $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0;
 var $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0;
 var $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0;
 var $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0;
 var $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0;
 var $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0;
 var $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0;
 var $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0;
 var $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0;
 var $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0;
 var $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0;
 var $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$027$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0;
 var $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$026$i = 0, $T$052$i$i = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0;
 var $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0;
 var $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$073$i = 0, $sp$166$i = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0;
 var $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[544>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((544 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((544 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[544>>2] = $22;
     } else {
      $23 = HEAP32[((544 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((544 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((544 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((544 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[544>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[((544 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((544 + 8|0))>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[((544 + 20|0))>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = ((544 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[544>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[544>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((544 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((544 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((544 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((544 + 8|0))>>2] = $81;
     HEAP32[((544 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((544 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((544 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((544 + 16|0))>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($5)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = (($v$0$i) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = (($v$0$i) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((544 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((544 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((544 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((544 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((544 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((544 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i) + ($5))|0;
      $224 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i;
      $225 = HEAP32[((544 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((544 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((544 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[544>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[544>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((544 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((544 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((544 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((544 + 8|0))>>2] = $rsize$0$i;
      HEAP32[((544 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i) + 8|0);
     $mem$0 = $243;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((544 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((544 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L126: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
      } else {
       $278 = ($idx$0$i|0)==(31);
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = (25 - ($279))|0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = (($t$0$i14) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$2$i = $286;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = (($t$0$i14) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((544 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = (($t$230$i) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((544 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((544 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = (($R$0$i18) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((544 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((544 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((544 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((544 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((544 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((544 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((544 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[544>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[544>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((544 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((544 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((544 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((544 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((544 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((544 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$027$i = $483;$T$026$i = $475;
           while(1) {
            $491 = $K12$027$i >>> 31;
            $492 = ((($T$026$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             break;
            }
            $485 = $K12$027$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$027$i = $485;$T$026$i = $487;
            }
           }
           $494 = HEAP32[((544 + 16|0))>>2]|0;
           $495 = ($492>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$492>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$026$i;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L204;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((544 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((544 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((544 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((544 + 20|0))>>2] = $514;
   HEAP32[((544 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((544 + 8|0))>>2] = 0;
   HEAP32[((544 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  STACKTOP = sp;return ($mem$0|0);
 }
 $526 = HEAP32[((544 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((544 + 12|0))>>2] = $528;
  $529 = HEAP32[((544 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((544 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  STACKTOP = sp;return ($mem$0|0);
 }
 $536 = HEAP32[1016>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((1016 + 8|0))>>2] = $538;
    HEAP32[((1016 + 4|0))>>2] = $538;
    HEAP32[((1016 + 12|0))>>2] = -1;
    HEAP32[((1016 + 16|0))>>2] = -1;
    HEAP32[((1016 + 20|0))>>2] = 0;
    HEAP32[((544 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[1016>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((1016 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $552 = HEAP32[((544 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((544 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $558 = HEAP32[((544 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L266: do {
  if ($560) {
   $561 = HEAP32[((544 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   L268: do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = ((544 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i|0)==(0|0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[((544 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$sp$0$i$i>>2]|0;
       $601 = HEAP32[$565>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((1016 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((544 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((544 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((1016 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while(0);
   $619 = HEAP32[((544 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((544 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while(0);
 if ((label|0) == 198) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label|0) == 201) {
  $632 = HEAP32[((544 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((544 + 432|0))>>2] = $633;
  $634 = HEAP32[((544 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((544 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((544 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L308: do {
   if ($637) {
    $638 = HEAP32[((544 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((544 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((544 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((544 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((544 + 460|0))>>2] = 0;
    $641 = HEAP32[1016>>2]|0;
    HEAP32[((544 + 36|0))>>2] = $641;
    HEAP32[((544 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((544 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((544 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((544 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((544 + 24|0))>>2] = $654;
    HEAP32[((544 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((1016 + 16|0))>>2]|0;
    HEAP32[((544 + 28|0))>>2] = $660;
   } else {
    $sp$073$i = ((544 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$073$i>>2]|0;
     $662 = (($sp$073$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      label = 213;
      break;
     }
     $666 = (($sp$073$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$073$i = $667;
     }
    }
    if ((label|0) == 213) {
     $669 = (($sp$073$i) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($661>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($663) + ($tsize$244$i))|0;
       HEAP32[$662>>2] = $675;
       $676 = HEAP32[((544 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((544 + 24|0))>>2] = $684;
       HEAP32[((544 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((1016 + 16|0))>>2]|0;
       HEAP32[((544 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((544 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((544 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$166$i = ((544 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$166$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      label = 223;
      break;
     }
     $696 = (($sp$166$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$166$i = $697;
     }
    }
    if ((label|0) == 223) {
     $699 = (($sp$166$i) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$sp$166$i>>2] = $tbase$245$i;
      $703 = (($sp$166$i) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L345: do {
       if ($729) {
        $730 = HEAP32[((544 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((544 + 12|0))>>2] = $731;
        HEAP32[((544 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((544 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((544 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((544 + 8|0))>>2] = $737;
         HEAP32[((544 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L353: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((544 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[544>>2]|0;
            $764 = $763 & $762;
            HEAP32[544>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;$RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;$RP$0$i$i = $785;
             }
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if (!($793)) {
               $R$0$i$i = $792;$RP$0$i$i = $791;
               continue;
              }
              $794 = (($R$0$i$i) + 16|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if ($796) {
               break;
              } else {
               $R$0$i$i = $795;$RP$0$i$i = $794;
              }
             }
             $797 = ($RP$0$i$i>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((544 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((544 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((544 + 4|0))>>2] = $807;
             break L353;
            } else {
             $808 = HEAP32[((544 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L353;
             }
            }
           } while(0);
           $815 = HEAP32[((544 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((544 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((544 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[544>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[544>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((544 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((544 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((544 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((544 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((544 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((544 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        L442: do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L442;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          $911 = HEAP32[((544 + 16|0))>>2]|0;
          $912 = ($909>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$909>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L345;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((544 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((544 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($929) + -47)|0;
    $$sum1$i14$i = (($929) + -39)|0;
    $934 = (($926) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($926) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((544 + 24|0))>>2] = $953;
    HEAP32[((544 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((1016 + 16|0))>>2]|0;
    HEAP32[((544 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((544 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((544 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((544 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((544 + 448|0))+12>>2]|0;
    HEAP32[((544 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((544 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((544 + 460|0))>>2] = 0;
    HEAP32[((544 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($930>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($930>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((544 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[544>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[544>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((544 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((544 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((544 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((544 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((544 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((544 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     L493: do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L493;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[((544 + 16|0))>>2]|0;
       $1051 = ($1048>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1048>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L308;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((544 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((544 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((544 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((544 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((544 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$058 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0;
 var $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$057 = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((544 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((544 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((544 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((544 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[544>>2]|0;
     $36 = $35 & $34;
     HEAP32[544>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((544 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((544 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((544 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((544 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((544 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((544 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((544 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((544 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((544 + 12|0))>>2] = $120;
   HEAP32[((544 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((544 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    STACKTOP = sp;return;
   }
   HEAP32[((544 + 20|0))>>2] = 0;
   HEAP32[((544 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $125 = HEAP32[((544 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((544 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((544 + 8|0))>>2] = $128;
   HEAP32[((544 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   STACKTOP = sp;return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((544 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((544 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[544>>2]|0;
     $152 = $151 & $150;
     HEAP32[544>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((544 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = (($R7$0) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[((544 + 16|0))>>2]|0;
      $188 = ($RP9$0>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((544 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((544 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((544 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((544 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((544 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((544 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((544 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((544 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((544 + 8|0))>>2] = $133;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((544 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[544>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[544>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((544 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((544 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((544 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  STACKTOP = sp;return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((544 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((544 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((544 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   L205: do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$058 = $292;$T$057 = $284;
     while(1) {
      $300 = $K19$058 >>> 31;
      $301 = ((($T$057) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       break;
      }
      $294 = $K19$058 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L205;
      } else {
       $K19$058 = $294;$T$057 = $296;
      }
     }
     $303 = HEAP32[((544 + 16|0))>>2]|0;
     $304 = ($301>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$301>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$057;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((544 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((544 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((544 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = ((544 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((544 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _fmax($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(2146435072);
 $4 = ($0>>>0)>(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0 = $y;
  STACKTOP = sp;return (+$$0);
 }
 HEAPF64[tempDoublePtr>>3] = $y;$8 = HEAP32[tempDoublePtr>>2]|0;
 $9 = HEAP32[tempDoublePtr+4>>2]|0;
 $10 = $9 & 2147483647;
 $11 = ($10>>>0)>(2146435072);
 $12 = ($8>>>0)>(0);
 $13 = ($10|0)==(2146435072);
 $14 = $13 & $12;
 $15 = $11 | $14;
 if ($15) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $16 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $17 = tempRet0;
 $18 = (_bitshift64Lshr(($8|0),($9|0),63)|0);
 $19 = tempRet0;
 $20 = ($16|0)==($18|0);
 if ($20) {
  $23 = $x < $y;
  $24 = $23 ? $y : $x;
  $$0 = $24;
  STACKTOP = sp;return (+$$0);
 } else {
  $21 = ($1|0)<(0);
  $22 = $21 ? $y : $x;
  $$0 = $22;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _fmaxf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$unshifted = 0, $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 do {
  if ($2) {
   $$0 = $y;
  } else {
   $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
   $4 = $3 & 2147483647;
   $5 = ($4>>>0)>(2139095040);
   if ($5) {
    $$0 = $x;
   } else {
    $$unshifted = $3 ^ $0;
    $6 = ($$unshifted|0)<(0);
    if ($6) {
     $7 = ($0|0)<(0);
     $8 = $7 ? $y : $x;
     $$0 = $8;
     break;
    } else {
     $9 = $x < $y;
     $10 = $9 ? $y : $x;
     $$0 = $10;
     break;
    }
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _fminf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$unshifted = 0, $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 do {
  if ($2) {
   $$0 = $y;
  } else {
   $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
   $4 = $3 & 2147483647;
   $5 = ($4>>>0)>(2139095040);
   if ($5) {
    $$0 = $x;
   } else {
    $$unshifted = $3 ^ $0;
    $6 = ($$unshifted|0)<(0);
    if ($6) {
     $7 = ($0|0)<(0);
     $8 = $7 ? $x : $y;
     $$0 = $8;
     break;
    } else {
     $9 = $x < $y;
     $10 = $9 ? $x : $y;
     $$0 = $10;
     break;
    }
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 if ((($4|0) == 0)) {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  STACKTOP = sp;return (+$$0);
 } else if ((($4|0) == 2047)) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 } else {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 STACKTOP = sp;return (+$0);
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 STACKTOP = sp;return ($$0|0);
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 }
 $1 = ($wc>>>0)<(128);
 if ($1) {
  $2 = $wc&255;
  HEAP8[$s>>0] = $2;
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 }
 $3 = ($wc>>>0)<(2048);
 if ($3) {
  $4 = $wc >>> 6;
  $5 = $4 | 192;
  $6 = $5&255;
  $7 = (($s) + 1|0);
  HEAP8[$s>>0] = $6;
  $8 = $wc & 63;
  $9 = $8 | 128;
  $10 = $9&255;
  HEAP8[$7>>0] = $10;
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $11 = ($wc>>>0)<(55296);
 $12 = $wc & -8192;
 $13 = ($12|0)==(57344);
 $or$cond = $11 | $13;
 if ($or$cond) {
  $14 = $wc >>> 12;
  $15 = $14 | 224;
  $16 = $15&255;
  $17 = (($s) + 1|0);
  HEAP8[$s>>0] = $16;
  $18 = $wc >>> 6;
  $19 = $18 & 63;
  $20 = $19 | 128;
  $21 = $20&255;
  $22 = (($s) + 2|0);
  HEAP8[$17>>0] = $21;
  $23 = $wc & 63;
  $24 = $23 | 128;
  $25 = $24&255;
  HEAP8[$22>>0] = $25;
  $$0 = 3;
  STACKTOP = sp;return ($$0|0);
 }
 $26 = (($wc) + -65536)|0;
 $27 = ($26>>>0)<(1048576);
 if ($27) {
  $28 = $wc >>> 18;
  $29 = $28 | 240;
  $30 = $29&255;
  $31 = (($s) + 1|0);
  HEAP8[$s>>0] = $30;
  $32 = $wc >>> 12;
  $33 = $32 & 63;
  $34 = $33 | 128;
  $35 = $34&255;
  $36 = (($s) + 2|0);
  HEAP8[$31>>0] = $35;
  $37 = $wc >>> 6;
  $38 = $37 & 63;
  $39 = $38 | 128;
  $40 = $39&255;
  $41 = (($s) + 3|0);
  HEAP8[$36>>0] = $40;
  $42 = $wc & 63;
  $43 = $42 | 128;
  $44 = $43&255;
  HEAP8[$41>>0] = $44;
  $$0 = 4;
  STACKTOP = sp;return ($$0|0);
 } else {
  $45 = (___errno_location()|0);
  HEAP32[$45>>2] = 84;
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = (($f) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = (($f) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = (($f) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (($f) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = (($f) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = (($f) + 48|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (($13) + ($17)|0);
  $19 = (($f) + 16|0);
  HEAP32[$19>>2] = $18;
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre5 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$1 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   $3 = (___towrite($f)|0);
   $4 = ($3|0)==(0);
   if ($4) {
    $$pre = HEAP32[$0>>2]|0;
    $8 = $$pre;
    break;
   } else {
    $$0 = 0;
    STACKTOP = sp;return ($$0|0);
   }
  } else {
   $8 = $1;
  }
 } while(0);
 $5 = (($f) + 20|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $8;
 $9 = $6;
 $10 = (($7) - ($9))|0;
 $11 = ($10>>>0)<($l>>>0);
 if ($11) {
  $12 = (($f) + 36|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (FUNCTION_TABLE_iiii[$13 & 7]($f,$s,$l)|0);
  $$0 = $14;
  STACKTOP = sp;return ($$0|0);
 }
 $15 = (($f) + 75|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = ($16<<24>>24)>(-1);
 L11: do {
  if ($17) {
   $i$0 = $l;
   while(1) {
    $18 = ($i$0|0)==(0);
    if ($18) {
     $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
     break L11;
    }
    $19 = (($i$0) + -1)|0;
    $20 = (($s) + ($19)|0);
    $21 = HEAP8[$20>>0]|0;
    $22 = ($21<<24>>24)==(10);
    if ($22) {
     break;
    } else {
     $i$0 = $19;
    }
   }
   $23 = (($f) + 36|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = (FUNCTION_TABLE_iiii[$24 & 7]($f,$s,$i$0)|0);
   $26 = ($25>>>0)<($i$0>>>0);
   if ($26) {
    $$0 = $i$0;
    STACKTOP = sp;return ($$0|0);
   } else {
    $27 = (($s) + ($i$0)|0);
    $28 = (($l) - ($i$0))|0;
    $$pre5 = HEAP32[$5>>2]|0;
    $$01 = $28;$$02 = $27;$29 = $$pre5;$i$1 = $i$0;
    break;
   }
  } else {
   $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
  }
 } while(0);
 _memcpy(($29|0),($$02|0),($$01|0))|0;
 $30 = HEAP32[$5>>2]|0;
 $31 = (($30) + ($$01)|0);
 HEAP32[$5>>2] = $31;
 $32 = (($i$1) + ($$01))|0;
 $$0 = $32;
 STACKTOP = sp;return ($$0|0);
}
function _snprintf($s,$n,$fmt,$varargs) {
 $s = $s|0;
 $n = $n|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vsnprintf($s,$n,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _MUSL_vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0, $ret$1 = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = (($f) + 48|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0);
 if ($4) {
  $6 = (($f) + 44|0);
  $7 = HEAP32[$6>>2]|0;
  HEAP32[$6>>2] = $internal_buf;
  $8 = (($f) + 28|0);
  HEAP32[$8>>2] = $internal_buf;
  $9 = (($f) + 20|0);
  HEAP32[$9>>2] = $internal_buf;
  HEAP32[$2>>2] = 80;
  $10 = (($internal_buf) + 80|0);
  $11 = (($f) + 16|0);
  HEAP32[$11>>2] = $10;
  $12 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $13 = ($7|0)==(0|0);
  if ($13) {
   $ret$1 = $12;
  } else {
   $14 = (($f) + 36|0);
   $15 = HEAP32[$14>>2]|0;
   (FUNCTION_TABLE_iiii[$15 & 7]($f,0,0)|0);
   $16 = HEAP32[$9>>2]|0;
   $17 = ($16|0)==(0|0);
   $$ = $17 ? -1 : $12;
   HEAP32[$6>>2] = $7;
   HEAP32[$2>>2] = 0;
   HEAP32[$11>>2] = 0;
   HEAP32[$8>>2] = 0;
   HEAP32[$9>>2] = 0;
   $ret$1 = $$;
  }
 } else {
  $5 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $ret$1 = $5;
 }
 $$0 = $ret$1;
 STACKTOP = sp;return ($$0|0);
}
function _vsnprintf($s,$n,$fmt,$ap) {
 $s = $s|0;
 $n = $n|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$$02 = 0, $$0 = 0, $$01 = 0, $$02 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $f = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $b = sp + 112|0;
 $f = sp;
 dest=$f+0|0; src=1608+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $0 = (($n) + -1)|0;
 $1 = ($0>>>0)>(2147483646);
 if ($1) {
  $2 = ($n|0)==(0);
  if ($2) {
   $$01 = $b;$$02 = 1;
  } else {
   $3 = (___errno_location()|0);
   HEAP32[$3>>2] = 75;
   $$0 = -1;
   STACKTOP = sp;return ($$0|0);
  }
 } else {
  $$01 = $s;$$02 = $n;
 }
 $4 = $$01;
 $5 = (-2 - ($4))|0;
 $6 = ($$02>>>0)>($5>>>0);
 $$$02 = $6 ? $5 : $$02;
 $7 = (($f) + 48|0);
 HEAP32[$7>>2] = $$$02;
 $8 = (($f) + 20|0);
 HEAP32[$8>>2] = $$01;
 $9 = (($f) + 44|0);
 HEAP32[$9>>2] = $$01;
 $10 = (($$01) + ($$$02)|0);
 $11 = (($f) + 16|0);
 HEAP32[$11>>2] = $10;
 $12 = (($f) + 28|0);
 HEAP32[$12>>2] = $10;
 $13 = (_MUSL_vfprintf($f,$fmt,$ap)|0);
 $14 = ($$$02|0)==(0);
 if ($14) {
  $$0 = $13;
  STACKTOP = sp;return ($$0|0);
 }
 $15 = HEAP32[$8>>2]|0;
 $16 = HEAP32[$11>>2]|0;
 $17 = ($15|0)==($16|0);
 $18 = $17 << 31 >> 31;
 $19 = (($15) + ($18)|0);
 HEAP8[$19>>0] = 0;
 $$0 = $13;
 STACKTOP = sp;return ($$0|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa36 = 0, $$012 = 0, $$1$lcssa = 0, $$15 = 0, $$22 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0;
 var $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond11 = 0, $s$0$lcssa = 0, $s$0$lcssa35 = 0, $s$013 = 0, $s$13 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$06 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond11 = $3 & $4;
 L1: do {
  if ($or$cond11) {
   $5 = $c&255;
   $$012 = $n;$s$013 = $src;
   while(1) {
    $6 = HEAP8[$s$013>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa36 = $$012;$s$0$lcssa35 = $s$013;
     label = 6;
     break L1;
    }
    $8 = (($s$013) + 1|0);
    $9 = (($$012) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $12 & $13;
    if ($or$cond) {
     $$012 = $9;$s$013 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa36 = $$0$lcssa;$s$0$lcssa35 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa35>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa36;$s$2 = $s$0$lcssa35;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa36>>>0)>(3);
    L11: do {
     if ($18) {
      $$15 = $$0$lcssa36;$w$06 = $s$0$lcssa35;
      while(1) {
       $19 = HEAP32[$w$06>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$1$lcssa = $$15;$w$0$lcssa = $w$06;
        break L11;
       }
       $26 = (($w$06) + 4|0);
       $27 = (($$15) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$15 = $27;$w$06 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        break;
       }
      }
     } else {
      $$1$lcssa = $$0$lcssa36;$w$0$lcssa = $s$0$lcssa35;
     }
    } while(0);
    $29 = ($$1$lcssa|0)==(0);
    if ($29) {
     $$3 = 0;$s$2 = $w$0$lcssa;
    } else {
     $$22 = $$1$lcssa;$s$13 = $w$0$lcssa;
     while(1) {
      $30 = HEAP8[$s$13>>0]|0;
      $31 = ($30<<24>>24)==($15<<24>>24);
      if ($31) {
       $$3 = $$22;$s$2 = $s$13;
       break L8;
      }
      $32 = (($s$13) + 1|0);
      $33 = (($$22) + -1)|0;
      $34 = ($33|0)==(0);
      if ($34) {
       $$3 = 0;$s$2 = $32;
       break;
      } else {
       $$22 = $33;$s$13 = $32;
      }
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 STACKTOP = sp;return ($36|0);
}
function _sn_write($f,$s,$l) {
 $f = $f|0;
 $s = $s|0;
 $l = $l|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($f) + 20|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = $3;
 $6 = (($4) - ($5))|0;
 $7 = ($6>>>0)>($l>>>0);
 $l$ = $7 ? $l : $6;
 _memcpy(($3|0),($s|0),($l$|0))|0;
 $8 = HEAP32[$2>>2]|0;
 $9 = (($8) + ($l$)|0);
 HEAP32[$2>>2] = $9;
 STACKTOP = sp;return ($l|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$5$i = 0, $$$i = 0, $$$p$i = 0, $$0 = 0, $$0$lcssa$i = 0, $$0$lcssa$i$i = 0, $$0$lcssa$i102$i = 0, $$0$lcssa$i109$i = 0, $$0$lcssa$i133$i = 0, $$0$lcssa$i148$i = 0, $$0$lcssa$i40 = 0, $$0$lcssa$i44$i = 0, $$0$lcssa$i45 = 0, $$0$lcssa$i47 = 0, $$0$lcssa$i51$i = 0, $$0$lcssa$i53$i = 0, $$0$lcssa$i55 = 0, $$0$lcssa$i61$i = 0, $$0$lcssa$i62 = 0;
 var $$0$lcssa$i68$i = 0, $$0$lcssa$i69 = 0, $$0$lcssa$i74$i = 0, $$0$lcssa$i79 = 0, $$0$lcssa$i81$i = 0, $$0$lcssa$i89$i = 0, $$01$i = 0, $$01$i$i = 0, $$01$i100$i = 0, $$01$i107$i = 0, $$01$i131$i = 0, $$01$i146$i = 0, $$01$i38 = 0, $$01$i42$i = 0, $$01$i49$i = 0, $$01$i53 = 0, $$01$i59$i = 0, $$01$i60 = 0, $$01$i66$i = 0, $$01$i67 = 0;
 var $$01$i72$i = 0, $$01$i77 = 0, $$01$i79$i = 0, $$01$lcssa$off0$i = 0, $$01$lcssa$off0$i$i = 0, $$01$lcssa$off0$i90$i = 0, $$010$i = 0.0, $$012$i = 0, $$016$i = 0, $$03$i42 = 0, $$05$i = 0, $$05$i$i = 0, $$05$i84$i = 0, $$1$i = 0.0, $$1$lcssa$i$i = 0, $$1$lcssa$i117$i = 0, $$117$i = 0, $$12$i = 0, $$12$i$i = 0, $$12$i115$i = 0;
 var $$12$i124$i = 0, $$12$i139$i = 0, $$12$i92$i = 0, $$15 = 0, $$19 = 0, $$2$i = 0.0, $$2$us$i = 0.0, $$2$us$us$i = 0.0, $$20 = 0, $$213$$26$i = 0, $$213$$28$i = 0, $$213$i = 0, $$23$i = 0, $$23$us$i = 0, $$24$i = 0, $$25$i = 0.0, $$26$i = 0, $$28$i = 0, $$3$i = 0.0, $$314$i = 0;
 var $$36$i = 0, $$4$i = 0.0, $$415$lcssa$i = 0, $$415171$i = 0, $$5189$i = 0, $$a$3$i = 0, $$a$3$us$i = 0, $$a$3$us307$i = 0, $$a$3$us308$i = 0, $$a$3309$i = 0, $$a$3310$i = 0, $$fl$4 = 0, $$lcssa292$i = 0, $$mask$i = 0, $$mask$i32 = 0, $$mask1$i = 0, $$mask1$i31 = 0, $$neg156$i = 0, $$neg157$i = 0, $$not$i = 0;
 var $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr = 0, $$pr$i = 0, $$pr151$i = 0, $$pre = 0, $$pre$i = 0, $$pre260 = 0, $$pre261 = 0, $$pre306$i = 0, $$sum$i = 0, $$sum18$i = 0, $$sum19$i = 0, $$z$3$i = 0, $$z$4$us$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0;
 var $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0;
 var $1019 = 0, $102 = 0, $1020 = 0.0, $1021 = 0.0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $1029$phi = 0, $103 = 0, $1030 = 0, $1030$phi = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0;
 var $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0.0, $176 = 0, $177 = 0, $178 = 0.0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0.0, $356 = 0, $357 = 0.0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0.0, $396 = 0.0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0.0, $411 = 0, $412 = 0, $413 = 0, $414 = 0.0, $415 = 0.0, $416 = 0.0, $417 = 0.0, $418 = 0.0, $419 = 0.0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0.0, $468 = 0.0, $469 = 0.0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0.0, $484 = 0.0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0.0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0.0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0.0, $562 = 0.0, $563 = 0.0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0;
 var $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0;
 var $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0;
 var $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0;
 var $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0.0, $7 = 0, $70 = 0, $700 = 0.0, $701 = 0, $702 = 0.0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0;
 var $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0;
 var $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0;
 var $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0;
 var $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0;
 var $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0;
 var $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0;
 var $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0;
 var $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0;
 var $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0;
 var $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0;
 var $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0;
 var $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0;
 var $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0;
 var $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0;
 var $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0;
 var $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0;
 var $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1258$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3244$i = 0, $a$3244$us$i = 0, $a$5$lcssa$i = 0, $a$5218$i = 0, $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0, $arglist_current2 = 0, $arglist_current20 = 0;
 var $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current29 = 0, $arglist_current32 = 0, $arglist_current35 = 0, $arglist_current38 = 0, $arglist_current41 = 0, $arglist_current44 = 0, $arglist_current47 = 0, $arglist_current5 = 0, $arglist_current50 = 0, $arglist_current53 = 0, $arglist_current56 = 0, $arglist_current59 = 0, $arglist_current62 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0;
 var $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next30 = 0, $arglist_next33 = 0, $arglist_next36 = 0, $arglist_next39 = 0, $arglist_next42 = 0, $arglist_next45 = 0, $arglist_next48 = 0, $arglist_next51 = 0, $arglist_next54 = 0, $arglist_next57 = 0, $arglist_next6 = 0, $arglist_next60 = 0, $arglist_next63 = 0, $arglist_next9 = 0, $argpos$0 = 0, $big$i = 0;
 var $buf = 0, $buf$i = 0, $carry$0250$i = 0, $carry3$0238$i = 0, $carry3$0238$us$i = 0, $cnt$0 = 0, $cnt$1 = 0, $d$0$i = 0, $d$0249$i = 0, $d$0251$i = 0, $d$1237$i = 0, $d$1237$us$i = 0, $d$2$lcssa$i = 0, $d$2217$i = 0, $d$3$i = 0, $d$4180$i = 0, $d$5170$i = 0, $d$6188$i = 0, $e$0233$i = 0, $e$1$i = 0;
 var $e$2213$i = 0, $e$3$i = 0, $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$1$ph$i = 0, $estr$1195$i = 0, $estr$2$i = 0, $exitcond$i = 0, $fl$0113 = 0, $fl$0118 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $fmt81$lcssa = 0, $fmt81102 = 0;
 var $fmt82 = 0, $fmt83 = 0, $fmt84 = 0, $fmt86 = 0, $fmt87 = 0, $i$0$lcssa = 0, $i$0$lcssa267 = 0, $i$0166 = 0, $i$0232$i = 0, $i$03$i = 0, $i$03$i24 = 0, $i$1$lcssa$i = 0, $i$1174 = 0, $i$1225$i = 0, $i$2100 = 0, $i$2212$i = 0, $i$3204$i = 0, $i$397 = 0, $isdigit = 0, $isdigit$i = 0;
 var $isdigit$i26 = 0, $isdigit2$i = 0, $isdigit2$i23 = 0, $isdigit4 = 0, $isdigit6 = 0, $isdigittmp = 0, $isdigittmp$i = 0, $isdigittmp$i25 = 0, $isdigittmp1$i = 0, $isdigittmp1$i22 = 0, $isdigittmp3 = 0, $isdigittmp5 = 0, $j$0$i = 0, $j$0224$i = 0, $j$0226$i = 0, $j$1205$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0;
 var $l$1165 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$phi = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$us$us$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i105$i = 0, $or$cond$i40$i = 0, $or$cond$i47$i = 0, $or$cond$i51 = 0, $or$cond$i57$i = 0, $or$cond$i58 = 0, $or$cond$i64$i = 0;
 var $or$cond$i65 = 0, $or$cond$i73 = 0, $or$cond$i75 = 0, $or$cond$i77$i = 0, $or$cond$i98$i = 0, $or$cond13 = 0, $or$cond17 = 0, $or$cond271 = 0, $or$cond32$i = 0, $or$cond34$i = 0, $or$cond5$i = 0, $or$cond7$i = 0, $or$cond7169$i = 0, $or$cond9 = 0, $or$cond9$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$4266 = 0;
 var $p$5 = 0, $pad$i = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$8$i = 0, $re$0$i = 0, $re$1163$i = 0, $round$0162$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$0$us$i = 0, $s$0$us$us$i = 0;
 var $s$1$i = 0, $s$1$lcssa$i = 0, $s$1$us$i = 0, $s$1$us$us$i = 0, $s1$0$i = 0, $s7$0177$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$0165$i = 0, $s9$0$i = 0, $s9$1184$i = 0, $s9$2$i = 0, $sext = 0, $sext93 = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $storemerge = 0, $storemerge2111 = 0, $storemerge2117 = 0;
 var $storemerge7 = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $w$22$i = 0, $w$35$i = 0, $wc = 0, $ws$0167 = 0, $ws$1175 = 0, $y$03$i = 0, $y$03$i$i = 0, $y$03$i114$i = 0, $y$03$i123$i = 0, $y$03$i138$i = 0, $y$03$i91$i = 0, $z$0$i = 0, $z$0$lcssa = 0;
 var $z$0103 = 0, $z$1$lcssa$i = 0, $z$1257$i = 0, $z$2 = 0, $z$2$i = 0, $z$3$lcssa$i = 0, $z$3243$i = 0, $z$3243$us$i = 0, $z$4$i = 0, $z$4$us$i = 0, $z$5$i = 0, $z$6$$i = 0, $z$6$i = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 864|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $big$i = sp + 16|0;
 $e2$i = sp + 8|0;
 $buf$i = sp + 560|0;
 $0 = $buf$i;
 $ebuf0$i = sp + 840|0;
 $pad$i = sp + 584|0;
 $buf = sp + 520|0;
 $wc = sp;
 $mb = sp + 852|0;
 $1 = ($f|0)!=(0|0);
 $2 = (($buf) + 40|0);
 $3 = $2;
 $4 = (($buf) + 39|0);
 $5 = (($wc) + 4|0);
 $6 = $wc;
 $7 = (($ebuf0$i) + 12|0);
 $8 = (($ebuf0$i) + 11|0);
 $9 = $7;
 $10 = (($9) - ($0))|0;
 $11 = (-2 - ($0))|0;
 $12 = (($9) + 2)|0;
 $13 = (($big$i) + 288|0);
 $14 = (($buf$i) + 9|0);
 $15 = $14;
 $16 = (($buf$i) + 8|0);
 $1029 = 0;$1030 = 0;$cnt$0 = 0;$fmt83 = $fmt;$l$0 = 0;$l10n$0 = 0;
 L1: while(1) {
  $17 = ($cnt$0|0)>(-1);
  do {
   if ($17) {
    $18 = (2147483647 - ($cnt$0))|0;
    $19 = ($l$0|0)>($18|0);
    if ($19) {
     $20 = (___errno_location()|0);
     HEAP32[$20>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $21 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $21;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $22 = HEAP8[$fmt83>>0]|0;
  $23 = ($22<<24>>24)==(0);
  if ($23) {
   label = 352;
   break;
  } else {
   $1031 = $22;$fmt82 = $fmt83;
  }
  while(1) {
   if ((($1031<<24>>24) == 37)) {
    $fmt81102 = $fmt82;$z$0103 = $fmt82;
    label = 9;
    break;
   } else if ((($1031<<24>>24) == 0)) {
    $fmt81$lcssa = $fmt82;$z$0$lcssa = $fmt82;
    break;
   }
   $24 = (($fmt82) + 1|0);
   $$pre = HEAP8[$24>>0]|0;
   $1031 = $$pre;$fmt82 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $25 = (($fmt81102) + 1|0);
     $26 = HEAP8[$25>>0]|0;
     $27 = ($26<<24>>24)==(37);
     if (!($27)) {
      $fmt81$lcssa = $fmt81102;$z$0$lcssa = $z$0103;
      break L12;
     }
     $28 = (($z$0103) + 1|0);
     $29 = (($fmt81102) + 2|0);
     $30 = HEAP8[$29>>0]|0;
     $31 = ($30<<24>>24)==(37);
     if ($31) {
      $fmt81102 = $29;$z$0103 = $28;
      label = 9;
     } else {
      $fmt81$lcssa = $29;$z$0$lcssa = $28;
      break;
     }
    }
   }
  } while(0);
  $32 = $z$0$lcssa;
  $33 = $fmt83;
  $34 = (($32) - ($33))|0;
  if ($1) {
   (___fwritex($fmt83,$34,$f)|0);
  }
  $35 = ($z$0$lcssa|0)==($fmt83|0);
  if (!($35)) {
   $l10n$0$phi = $l10n$0;$1030$phi = $1030;$1029$phi = $1029;$cnt$0 = $cnt$1;$fmt83 = $fmt81$lcssa;$l$0 = $34;$l10n$0 = $l10n$0$phi;$1030 = $1030$phi;$1029 = $1029$phi;
   continue;
  }
  $36 = (($fmt81$lcssa) + 1|0);
  $37 = HEAP8[$36>>0]|0;
  $38 = $37 << 24 >> 24;
  $isdigittmp = (($38) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $39 = (($fmt81$lcssa) + 2|0);
   $40 = HEAP8[$39>>0]|0;
   $41 = ($40<<24>>24)==(36);
   if ($41) {
    $42 = (($fmt81$lcssa) + 3|0);
    $$pre260 = HEAP8[$42>>0]|0;
    $44 = $$pre260;$argpos$0 = $isdigittmp;$l10n$1 = 1;$storemerge = $42;
   } else {
    $44 = $37;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $36;
   }
  } else {
   $44 = $37;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $36;
  }
  $43 = $44 << 24 >> 24;
  $45 = $43 & -32;
  $46 = ($45|0)==(32);
  L25: do {
   if ($46) {
    $$pr = $44;$48 = $43;$fl$0118 = 0;$storemerge2117 = $storemerge;
    while(1) {
     $47 = (($48) + -32)|0;
     $49 = 1 << $47;
     $50 = $49 & 75913;
     $51 = ($50|0)==(0);
     if ($51) {
      $59 = $$pr;$fl$0113 = $fl$0118;$storemerge2111 = $storemerge2117;
      break L25;
     }
     $52 = $49 | $fl$0118;
     $53 = (($storemerge2117) + 1|0);
     $54 = HEAP8[$53>>0]|0;
     $55 = $54 << 24 >> 24;
     $56 = $55 & -32;
     $57 = ($56|0)==(32);
     if ($57) {
      $$pr = $54;$48 = $55;$fl$0118 = $52;$storemerge2117 = $53;
     } else {
      $59 = $54;$fl$0113 = $52;$storemerge2111 = $53;
      break;
     }
    }
   } else {
    $59 = $44;$fl$0113 = 0;$storemerge2111 = $storemerge;
   }
  } while(0);
  $58 = ($59<<24>>24)==(42);
  do {
   if ($58) {
    $60 = (($storemerge2111) + 1|0);
    $61 = HEAP8[$60>>0]|0;
    $62 = $61 << 24 >> 24;
    $isdigittmp5 = (($62) + -48)|0;
    $isdigit6 = ($isdigittmp5>>>0)<(10);
    if ($isdigit6) {
     $63 = (($storemerge2111) + 2|0);
     $64 = HEAP8[$63>>0]|0;
     $65 = ($64<<24>>24)==(36);
     if ($65) {
      $66 = (($nl_type) + ($isdigittmp5<<2)|0);
      HEAP32[$66>>2] = 10;
      $67 = HEAP8[$60>>0]|0;
      $68 = $67 << 24 >> 24;
      $69 = (($68) + -48)|0;
      $70 = (($nl_arg) + ($69<<3)|0);
      $71 = $70;
      $72 = $71;
      $73 = HEAP32[$72>>2]|0;
      $74 = (($71) + 4)|0;
      $75 = $74;
      $76 = HEAP32[$75>>2]|0;
      $77 = (($storemerge2111) + 3|0);
      $l10n$2 = 1;$storemerge7 = $77;$w$0 = $73;
     } else {
      label = 24;
     }
    } else {
     label = 24;
    }
    if ((label|0) == 24) {
     label = 0;
     $78 = ($l10n$1|0)==(0);
     if (!($78)) {
      $$0 = -1;
      label = 370;
      break L1;
     }
     if (!($1)) {
      $fl$1 = $fl$0113;$fmt84 = $60;$l10n$3 = 0;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $79 = HEAP32[$arglist_current>>2]|0;
     $arglist_next = (($arglist_current) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge7 = $60;$w$0 = $79;
    }
    $80 = ($w$0|0)<(0);
    if ($80) {
     $81 = $fl$0113 | 8192;
     $82 = (0 - ($w$0))|0;
     $fl$1 = $81;$fmt84 = $storemerge7;$l10n$3 = $l10n$2;$w$1 = $82;
    } else {
     $fl$1 = $fl$0113;$fmt84 = $storemerge7;$l10n$3 = $l10n$2;$w$1 = $w$0;
    }
   } else {
    $83 = $59 << 24 >> 24;
    $isdigittmp1$i = (($83) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $86 = $83;$89 = $storemerge2111;$i$03$i = 0;
     while(1) {
      $84 = ($i$03$i*10)|0;
      $85 = (($86) + -48)|0;
      $87 = (($85) + ($84))|0;
      $88 = (($89) + 1|0);
      $90 = HEAP8[$88>>0]|0;
      $91 = $90 << 24 >> 24;
      $isdigittmp$i = (($91) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $86 = $91;$89 = $88;$i$03$i = $87;
      } else {
       break;
      }
     }
     $92 = ($87|0)<(0);
     if ($92) {
      $$0 = -1;
      label = 370;
      break L1;
     } else {
      $fl$1 = $fl$0113;$fmt84 = $88;$l10n$3 = $l10n$1;$w$1 = $87;
     }
    } else {
     $fl$1 = $fl$0113;$fmt84 = $storemerge2111;$l10n$3 = $l10n$1;$w$1 = 0;
    }
   }
  } while(0);
  $93 = HEAP8[$fmt84>>0]|0;
  $94 = ($93<<24>>24)==(46);
  L46: do {
   if ($94) {
    $95 = (($fmt84) + 1|0);
    $96 = HEAP8[$95>>0]|0;
    $97 = ($96<<24>>24)==(42);
    if (!($97)) {
     $118 = $96 << 24 >> 24;
     $isdigittmp1$i22 = (($118) + -48)|0;
     $isdigit2$i23 = ($isdigittmp1$i22>>>0)<(10);
     if ($isdigit2$i23) {
      $121 = $118;$124 = $95;$i$03$i24 = 0;
     } else {
      $fmt87 = $95;$p$0 = 0;
      break;
     }
     while(1) {
      $119 = ($i$03$i24*10)|0;
      $120 = (($121) + -48)|0;
      $122 = (($120) + ($119))|0;
      $123 = (($124) + 1|0);
      $125 = HEAP8[$123>>0]|0;
      $126 = $125 << 24 >> 24;
      $isdigittmp$i25 = (($126) + -48)|0;
      $isdigit$i26 = ($isdigittmp$i25>>>0)<(10);
      if ($isdigit$i26) {
       $121 = $126;$124 = $123;$i$03$i24 = $122;
      } else {
       $fmt87 = $123;$p$0 = $122;
       break L46;
      }
     }
    }
    $98 = (($fmt84) + 2|0);
    $99 = HEAP8[$98>>0]|0;
    $100 = $99 << 24 >> 24;
    $isdigittmp3 = (($100) + -48)|0;
    $isdigit4 = ($isdigittmp3>>>0)<(10);
    if ($isdigit4) {
     $101 = (($fmt84) + 3|0);
     $102 = HEAP8[$101>>0]|0;
     $103 = ($102<<24>>24)==(36);
     if ($103) {
      $104 = (($nl_type) + ($isdigittmp3<<2)|0);
      HEAP32[$104>>2] = 10;
      $105 = HEAP8[$98>>0]|0;
      $106 = $105 << 24 >> 24;
      $107 = (($106) + -48)|0;
      $108 = (($nl_arg) + ($107<<3)|0);
      $109 = $108;
      $110 = $109;
      $111 = HEAP32[$110>>2]|0;
      $112 = (($109) + 4)|0;
      $113 = $112;
      $114 = HEAP32[$113>>2]|0;
      $115 = (($fmt84) + 4|0);
      $fmt87 = $115;$p$0 = $111;
      break;
     }
    }
    $116 = ($l10n$3|0)==(0);
    if (!($116)) {
     $$0 = -1;
     label = 370;
     break L1;
    }
    if ($1) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $117 = HEAP32[$arglist_current2>>2]|0;
     $arglist_next3 = (($arglist_current2) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $fmt87 = $98;$p$0 = $117;
    } else {
     $fmt87 = $98;$p$0 = 0;
    }
   } else {
    $fmt87 = $fmt84;$p$0 = -1;
   }
  } while(0);
  $fmt86 = $fmt87;$st$0 = 0;
  while(1) {
   $127 = HEAP8[$fmt86>>0]|0;
   $128 = $127 << 24 >> 24;
   $129 = (($128) + -65)|0;
   $130 = ($129>>>0)>(57);
   if ($130) {
    $$0 = -1;
    label = 370;
    break L1;
   }
   $131 = (($fmt86) + 1|0);
   $132 = ((1040 + (($st$0*58)|0)|0) + ($129)|0);
   $133 = HEAP8[$132>>0]|0;
   $134 = $133&255;
   $135 = (($134) + -1)|0;
   $136 = ($135>>>0)<(8);
   if ($136) {
    $fmt86 = $131;$st$0 = $134;
   } else {
    break;
   }
  }
  $137 = ($133<<24>>24)==(0);
  if ($137) {
   $$0 = -1;
   label = 370;
   break;
  }
  $138 = ($133<<24>>24)==(19);
  $139 = ($argpos$0|0)>(-1);
  L65: do {
   if ($138) {
    if ($139) {
     $$0 = -1;
     label = 370;
     break L1;
    } else {
     $1032 = $1029;$1033 = $1030;
     label = 63;
    }
   } else {
    if ($139) {
     $140 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$140>>2] = $134;
     $141 = (($nl_arg) + ($argpos$0<<3)|0);
     $142 = $141;
     $143 = $142;
     $144 = HEAP32[$143>>2]|0;
     $145 = (($142) + 4)|0;
     $146 = $145;
     $147 = HEAP32[$146>>2]|0;
     $1032 = $144;$1033 = $147;
     label = 63;
     break;
    }
    if (!($1)) {
     $$0 = 0;
     label = 370;
     break L1;
    }
    $148 = ($133&255)>(20);
    if ($148) {
     $182 = $127;$191 = $1029;$218 = $1030;
    } else {
     do {
      switch ($134|0) {
      case 17:  {
       $arglist_current29 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current29>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current29+4>>2];$175 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next30 = (($arglist_current29) + 8|0);
       HEAP32[$ap>>2] = $arglist_next30;
       HEAPF64[tempDoublePtr>>3] = $175;$176 = HEAP32[tempDoublePtr>>2]|0;
       $177 = HEAP32[tempDoublePtr+4>>2]|0;
       $1034 = $177;$1035 = $176;
       label = 64;
       break L65;
       break;
      }
      case 13:  {
       $arglist_current17 = HEAP32[$ap>>2]|0;
       $161 = HEAP32[$arglist_current17>>2]|0;
       $arglist_next18 = (($arglist_current17) + 4|0);
       HEAP32[$ap>>2] = $arglist_next18;
       $162 = $161&65535;
       $163 = $162 << 16 >> 16;
       $164 = ($163|0)<(0);
       $165 = $164 << 31 >> 31;
       $sext93 = $161 << 16;
       $166 = $sext93 >> 16;
       $1034 = $165;$1035 = $166;
       label = 64;
       break L65;
       break;
      }
      case 14:  {
       $arglist_current20 = HEAP32[$ap>>2]|0;
       $167 = HEAP32[$arglist_current20>>2]|0;
       $arglist_next21 = (($arglist_current20) + 4|0);
       HEAP32[$ap>>2] = $arglist_next21;
       $$mask1$i31 = $167 & 65535;
       $1034 = 0;$1035 = $$mask1$i31;
       label = 64;
       break L65;
       break;
      }
      case 15:  {
       $arglist_current23 = HEAP32[$ap>>2]|0;
       $168 = HEAP32[$arglist_current23>>2]|0;
       $arglist_next24 = (($arglist_current23) + 4|0);
       HEAP32[$ap>>2] = $arglist_next24;
       $169 = $168&255;
       $170 = $169 << 24 >> 24;
       $171 = ($170|0)<(0);
       $172 = $171 << 31 >> 31;
       $sext = $168 << 24;
       $173 = $sext >> 24;
       $1034 = $172;$1035 = $173;
       label = 64;
       break L65;
       break;
      }
      case 16:  {
       $arglist_current26 = HEAP32[$ap>>2]|0;
       $174 = HEAP32[$arglist_current26>>2]|0;
       $arglist_next27 = (($arglist_current26) + 4|0);
       HEAP32[$ap>>2] = $arglist_next27;
       $$mask$i32 = $174 & 255;
       $1034 = 0;$1035 = $$mask$i32;
       label = 64;
       break L65;
       break;
      }
      case 9:  {
       $arglist_current5 = HEAP32[$ap>>2]|0;
       $149 = HEAP32[$arglist_current5>>2]|0;
       $arglist_next6 = (($arglist_current5) + 4|0);
       HEAP32[$ap>>2] = $arglist_next6;
       $150 = $149;
       $1034 = $1030;$1035 = $150;
       label = 64;
       break L65;
       break;
      }
      case 10:  {
       $arglist_current8 = HEAP32[$ap>>2]|0;
       $151 = HEAP32[$arglist_current8>>2]|0;
       $arglist_next9 = (($arglist_current8) + 4|0);
       HEAP32[$ap>>2] = $arglist_next9;
       $152 = ($151|0)<(0);
       $153 = $152 << 31 >> 31;
       $1034 = $153;$1035 = $151;
       label = 64;
       break L65;
       break;
      }
      case 11:  {
       $arglist_current11 = HEAP32[$ap>>2]|0;
       $154 = HEAP32[$arglist_current11>>2]|0;
       $arglist_next12 = (($arglist_current11) + 4|0);
       HEAP32[$ap>>2] = $arglist_next12;
       $1034 = 0;$1035 = $154;
       label = 64;
       break L65;
       break;
      }
      case 12:  {
       $arglist_current14 = HEAP32[$ap>>2]|0;
       $155 = $arglist_current14;
       $156 = $155;
       $157 = HEAP32[$156>>2]|0;
       $158 = (($155) + 4)|0;
       $159 = $158;
       $160 = HEAP32[$159>>2]|0;
       $arglist_next15 = (($arglist_current14) + 8|0);
       HEAP32[$ap>>2] = $arglist_next15;
       $1034 = $160;$1035 = $157;
       label = 64;
       break L65;
       break;
      }
      case 18:  {
       $arglist_current32 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current32>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current32+4>>2];$178 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next33 = (($arglist_current32) + 8|0);
       HEAP32[$ap>>2] = $arglist_next33;
       HEAPF64[tempDoublePtr>>3] = $178;$179 = HEAP32[tempDoublePtr>>2]|0;
       $180 = HEAP32[tempDoublePtr+4>>2]|0;
       $1032 = $179;$1033 = $180;
       label = 63;
       break L65;
       break;
      }
      default: {
       $1034 = $1030;$1035 = $1029;
       label = 64;
       break L65;
      }
      }
     } while(0);
    }
   }
  } while(0);
  if ((label|0) == 63) {
   label = 0;
   if ($1) {
    $1034 = $1033;$1035 = $1032;
    label = 64;
   } else {
    $1029 = $1032;$1030 = $1033;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
    continue;
   }
  }
  if ((label|0) == 64) {
   label = 0;
   $$pre261 = HEAP8[$fmt86>>0]|0;
   $182 = $$pre261;$191 = $1035;$218 = $1034;
  }
  $181 = $182 << 24 >> 24;
  $183 = ($st$0|0)!=(0);
  $184 = $181 & 15;
  $185 = ($184|0)==(3);
  $or$cond9 = $183 & $185;
  $186 = $181 & -33;
  $t$0 = $or$cond9 ? $186 : $181;
  $187 = $fl$1 & 8192;
  $188 = ($187|0)==(0);
  $189 = $fl$1 & -65537;
  $fl$1$ = $188 ? $fl$1 : $189;
  L89: do {
   switch ($t$0|0) {
   case 110:  {
    switch ($st$0|0) {
    case 1:  {
     $192 = $191;
     HEAP32[$192>>2] = $cnt$1;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 2:  {
     $193 = ($cnt$1|0)<(0);
     $194 = $193 << 31 >> 31;
     $195 = $191;
     $196 = $195;
     $197 = $196;
     HEAP32[$197>>2] = $cnt$1;
     $198 = (($196) + 4)|0;
     $199 = $198;
     HEAP32[$199>>2] = $194;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 0:  {
     $190 = $191;
     HEAP32[$190>>2] = $cnt$1;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 3:  {
     $200 = $cnt$1&65535;
     $201 = $191;
     HEAP16[$201>>1] = $200;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 4:  {
     $202 = $cnt$1&255;
     $203 = $191;
     HEAP8[$203>>0] = $202;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 6:  {
     $204 = $191;
     HEAP32[$204>>2] = $cnt$1;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 7:  {
     $205 = ($cnt$1|0)<(0);
     $206 = $205 << 31 >> 31;
     $207 = $191;
     $208 = $207;
     $209 = $208;
     HEAP32[$209>>2] = $cnt$1;
     $210 = (($208) + 4)|0;
     $211 = $210;
     HEAP32[$211>>2] = $206;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    default: {
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $212 = ($p$0>>>0)>(8);
    $213 = $212 ? $p$0 : 8;
    $214 = $fl$1$ | 8;
    $fl$3 = $214;$p$1 = $213;$t$1 = 120;
    label = 75;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 75;
    break;
   }
   case 111:  {
    $238 = ($191|0)==(0);
    $239 = ($218|0)==(0);
    $240 = $238 & $239;
    if ($240) {
     $$0$lcssa$i45 = $2;
    } else {
     $$03$i42 = $2;$242 = $191;$246 = $218;
     while(1) {
      $241 = $242 & 7;
      $243 = $241 | 48;
      $244 = $243&255;
      $245 = (($$03$i42) + -1|0);
      HEAP8[$245>>0] = $244;
      $247 = (_bitshift64Lshr(($242|0),($246|0),3)|0);
      $248 = tempRet0;
      $249 = ($247|0)==(0);
      $250 = ($248|0)==(0);
      $251 = $249 & $250;
      if ($251) {
       $$0$lcssa$i45 = $245;
       break;
      } else {
       $$03$i42 = $245;$242 = $247;$246 = $248;
      }
     }
    }
    $252 = $fl$1$ & 8;
    $253 = ($252|0)==(0);
    $or$cond13 = $253 | $240;
    $$19 = $or$cond13 ? 1504 : ((1504 + 5|0));
    $254 = $or$cond13&1;
    $$20 = $254 ^ 1;
    $293 = $191;$295 = $218;$a$0 = $$0$lcssa$i45;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $$20;$prefix$1 = $$19;
    label = 91;
    break;
   }
   case 105: case 100:  {
    $255 = ($218|0)<(0);
    if ($255) {
     $256 = (_i64Subtract(0,0,($191|0),($218|0))|0);
     $257 = tempRet0;
     $263 = $257;$265 = $256;$pl$0 = 1;$prefix$0 = 1504;
     label = 86;
     break L89;
    }
    $258 = $fl$1$ & 2048;
    $259 = ($258|0)==(0);
    if ($259) {
     $260 = $fl$1$ & 1;
     $261 = ($260|0)==(0);
     $$ = $261 ? 1504 : ((1504 + 2|0));
     $263 = $218;$265 = $191;$pl$0 = $260;$prefix$0 = $$;
     label = 86;
    } else {
     $263 = $218;$265 = $191;$pl$0 = 1;$prefix$0 = ((1504 + 1|0));
     label = 86;
    }
    break;
   }
   case 117:  {
    $263 = $218;$265 = $191;$pl$0 = 0;$prefix$0 = 1504;
    label = 86;
    break;
   }
   case 99:  {
    $304 = $191&255;
    HEAP8[$4>>0] = $304;
    $1036 = $191;$1037 = $218;$a$2 = $4;$fl$6 = $189;$p$5 = 1;$pl$2 = 0;$prefix$2 = 1504;$z$2 = $2;
    break;
   }
   case 109:  {
    $305 = (___errno_location()|0);
    $306 = HEAP32[$305>>2]|0;
    $307 = (_strerror(($306|0))|0);
    $a$1 = $307;
    label = 96;
    break;
   }
   case 115:  {
    $308 = $191;
    $309 = ($191|0)==(0);
    $$15 = $309 ? 1520 : $308;
    $a$1 = $$15;
    label = 96;
    break;
   }
   case 67:  {
    HEAP32[$wc>>2] = $191;
    HEAP32[$5>>2] = 0;
    $1038 = $wc;$1039 = $6;$p$4266 = -1;
    label = 101;
    break;
   }
   case 83:  {
    $316 = $191;
    $317 = ($p$0|0)==(0);
    if ($317) {
     $1040 = $191;$1041 = $316;$i$0$lcssa267 = 0;
     label = 106;
    } else {
     $1038 = $316;$1039 = $191;$p$4266 = $p$0;
     label = 101;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    HEAP32[tempDoublePtr>>2] = $191;HEAP32[tempDoublePtr+4>>2] = $218;$355 = +HEAPF64[tempDoublePtr>>3];
    HEAP32[$e2$i>>2] = 0;
    $356 = ($218|0)<(0);
    if ($356) {
     $357 = -$355;
     $$010$i = $357;$pl$0$i = 1;$prefix$0$i = 1528;
    } else {
     $358 = $fl$1$ & 2048;
     $359 = ($358|0)==(0);
     if ($359) {
      $360 = $fl$1$ & 1;
      $361 = ($360|0)==(0);
      $$$i = $361 ? ((1528 + 1|0)) : ((1528 + 6|0));
      $$010$i = $355;$pl$0$i = $360;$prefix$0$i = $$$i;
     } else {
      $$010$i = $355;$pl$0$i = 1;$prefix$0$i = ((1528 + 3|0));
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$010$i;$362 = HEAP32[tempDoublePtr>>2]|0;
    $363 = HEAP32[tempDoublePtr+4>>2]|0;
    $364 = $363 & 2146435072;
    $365 = ($364>>>0)<(2146435072);
    $366 = (0)<(0);
    $367 = ($364|0)==(2146435072);
    $368 = $367 & $366;
    $369 = $365 | $368;
    if (!($369)) {
     $370 = $t$0 & 32;
     $371 = ($370|0)!=(0);
     $372 = $371 ? 1552 : 1560;
     $373 = ($$010$i != $$010$i) | (0.0 != 0.0);
     if ($373) {
      $374 = $371 ? 1568 : 1576;
      $pl$1$i = 0;$s1$0$i = $374;
     } else {
      $pl$1$i = $pl$0$i;$s1$0$i = $372;
     }
     $375 = (($pl$1$i) + 3)|0;
     $376 = $fl$1$ & 8192;
     $377 = ($376|0)==(0);
     $378 = ($w$1|0)>($375|0);
     $or$cond$i40$i = $377 & $378;
     if ($or$cond$i40$i) {
      $379 = (($w$1) - ($375))|0;
      $380 = ($379>>>0)>(256);
      $381 = $380 ? 256 : $379;
      _memset(($pad$i|0),32,($381|0))|0;
      $382 = ($379>>>0)>(255);
      if ($382) {
       $$01$i42$i = $379;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $383 = (($$01$i42$i) + -256)|0;
        $384 = ($383>>>0)>(255);
        if ($384) {
         $$01$i42$i = $383;
        } else {
         break;
        }
       }
       $385 = $379 & 255;
       $$0$lcssa$i44$i = $385;
      } else {
       $$0$lcssa$i44$i = $379;
      }
      (___fwritex($pad$i,$$0$lcssa$i44$i,$f)|0);
     }
     (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
     (___fwritex($s1$0$i,3,$f)|0);
     $386 = $fl$1$ & 73728;
     $387 = ($386|0)==(8192);
     $or$cond$i47$i = $387 & $378;
     if ($or$cond$i47$i) {
      $388 = (($w$1) - ($375))|0;
      $389 = ($388>>>0)>(256);
      $390 = $389 ? 256 : $388;
      _memset(($pad$i|0),32,($390|0))|0;
      $391 = ($388>>>0)>(255);
      if ($391) {
       $$01$i49$i = $388;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $392 = (($$01$i49$i) + -256)|0;
        $393 = ($392>>>0)>(255);
        if ($393) {
         $$01$i49$i = $392;
        } else {
         break;
        }
       }
       $394 = $388 & 255;
       $$0$lcssa$i51$i = $394;
      } else {
       $$0$lcssa$i51$i = $388;
      }
      (___fwritex($pad$i,$$0$lcssa$i51$i,$f)|0);
     }
     $w$$i = $378 ? $w$1 : $375;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$$i;$l10n$0 = $l10n$3;
     continue L1;
    }
    $395 = (+_frexpl($$010$i,$e2$i));
    $396 = $395 * 2.0;
    $397 = $396 != 0.0;
    if ($397) {
     $398 = HEAP32[$e2$i>>2]|0;
     $399 = (($398) + -1)|0;
     HEAP32[$e2$i>>2] = $399;
    }
    $400 = $t$0 | 32;
    $401 = ($400|0)==(97);
    if ($401) {
     $402 = $t$0 & 32;
     $403 = ($402|0)==(0);
     $404 = (($prefix$0$i) + 9|0);
     $prefix$0$$i = $403 ? $prefix$0$i : $404;
     $405 = $pl$0$i | 2;
     $406 = ($p$0>>>0)>(11);
     $407 = (12 - ($p$0))|0;
     $re$0$i = $406 ? 0 : $407;
     $408 = ($re$0$i|0)==(0);
     do {
      if ($408) {
       $$1$i = $396;
      } else {
       $re$1163$i = $re$0$i;$round$0162$i = 8.0;
       while(1) {
        $409 = (($re$1163$i) + -1)|0;
        $410 = $round$0162$i * 16.0;
        $411 = ($409|0)==(0);
        if ($411) {
         break;
        } else {
         $re$1163$i = $409;$round$0162$i = $410;
        }
       }
       $412 = HEAP8[$prefix$0$$i>>0]|0;
       $413 = ($412<<24>>24)==(45);
       if ($413) {
        $414 = -$396;
        $415 = $414 - $410;
        $416 = $410 + $415;
        $417 = -$416;
        $$1$i = $417;
        break;
       } else {
        $418 = $396 + $410;
        $419 = $418 - $410;
        $$1$i = $419;
        break;
       }
      }
     } while(0);
     $420 = HEAP32[$e2$i>>2]|0;
     $421 = ($420|0)<(0);
     $422 = (0 - ($420))|0;
     $423 = $421 ? $422 : $420;
     $424 = ($423|0)<(0);
     if ($424) {
      $425 = ($423|0)<(0);
      $426 = $425 << 31 >> 31;
      $$05$i$i = $7;$427 = $423;$428 = $426;
      while(1) {
       $429 = (___uremdi3(($427|0),($428|0),10,0)|0);
       $430 = tempRet0;
       $431 = $429 | 48;
       $432 = $431&255;
       $433 = (($$05$i$i) + -1|0);
       HEAP8[$433>>0] = $432;
       $434 = (___udivdi3(($427|0),($428|0),10,0)|0);
       $435 = tempRet0;
       $436 = ($428>>>0)>(9);
       $437 = ($427>>>0)>(4294967295);
       $438 = ($428|0)==(9);
       $439 = $438 & $437;
       $440 = $436 | $439;
       if ($440) {
        $$05$i$i = $433;$427 = $434;$428 = $435;
       } else {
        break;
       }
      }
      $$0$lcssa$i53$i = $433;$$01$lcssa$off0$i$i = $434;
     } else {
      $$0$lcssa$i53$i = $7;$$01$lcssa$off0$i$i = $423;
     }
     $441 = ($$01$lcssa$off0$i$i|0)==(0);
     if ($441) {
      $$1$lcssa$i$i = $$0$lcssa$i53$i;
     } else {
      $$12$i$i = $$0$lcssa$i53$i;$y$03$i$i = $$01$lcssa$off0$i$i;
      while(1) {
       $442 = (($y$03$i$i>>>0) % 10)&-1;
       $443 = $442 | 48;
       $444 = $443&255;
       $445 = (($$12$i$i) + -1|0);
       HEAP8[$445>>0] = $444;
       $446 = (($y$03$i$i>>>0) / 10)&-1;
       $447 = ($y$03$i$i>>>0)<(10);
       if ($447) {
        $$1$lcssa$i$i = $445;
        break;
       } else {
        $$12$i$i = $445;$y$03$i$i = $446;
       }
      }
     }
     $448 = ($$1$lcssa$i$i|0)==($7|0);
     if ($448) {
      HEAP8[$8>>0] = 48;
      $estr$0$i = $8;
     } else {
      $estr$0$i = $$1$lcssa$i$i;
     }
     $449 = HEAP32[$e2$i>>2]|0;
     $450 = $449 >> 31;
     $451 = $450 & 2;
     $452 = (($451) + 43)|0;
     $453 = $452&255;
     $454 = (($estr$0$i) + -1|0);
     HEAP8[$454>>0] = $453;
     $455 = (($t$0) + 15)|0;
     $456 = $455&255;
     $457 = (($estr$0$i) + -2|0);
     HEAP8[$457>>0] = $456;
     $notrhs$i = ($p$0|0)<(1);
     if ($notrhs$i) {
      $458 = $fl$1$ & 8;
      $459 = ($458|0)==(0);
      if ($459) {
       $$2$us$us$i = $$1$i;$s$0$us$us$i = $buf$i;
       while(1) {
        $460 = (~~(($$2$us$us$i)));
        $461 = (1584 + ($460)|0);
        $462 = HEAP8[$461>>0]|0;
        $463 = $462&255;
        $464 = $463 | $402;
        $465 = $464&255;
        $466 = (($s$0$us$us$i) + 1|0);
        HEAP8[$s$0$us$us$i>>0] = $465;
        $467 = (+($460|0));
        $468 = $$2$us$us$i - $467;
        $469 = $468 * 16.0;
        $470 = $466;
        $471 = (($470) - ($0))|0;
        $472 = ($471|0)!=(1);
        $notlhs$us$us$i = $469 == 0.0;
        $or$cond$i73 = $472 | $notlhs$us$us$i;
        if ($or$cond$i73) {
         $s$1$us$us$i = $466;
        } else {
         $473 = (($s$0$us$us$i) + 2|0);
         HEAP8[$466>>0] = 46;
         $s$1$us$us$i = $473;
        }
        $474 = $469 != 0.0;
        if ($474) {
         $$2$us$us$i = $469;$s$0$us$us$i = $s$1$us$us$i;
        } else {
         $s$1$lcssa$i = $s$1$us$us$i;
         break;
        }
       }
      } else {
       $$2$us$i = $$1$i;$s$0$us$i = $buf$i;
       while(1) {
        $475 = (~~(($$2$us$i)));
        $476 = (1584 + ($475)|0);
        $477 = HEAP8[$476>>0]|0;
        $478 = $477&255;
        $479 = $478 | $402;
        $480 = $479&255;
        $481 = (($s$0$us$i) + 1|0);
        HEAP8[$s$0$us$i>>0] = $480;
        $482 = (+($475|0));
        $483 = $$2$us$i - $482;
        $484 = $483 * 16.0;
        $485 = $481;
        $486 = (($485) - ($0))|0;
        $487 = ($486|0)==(1);
        if ($487) {
         $488 = (($s$0$us$i) + 2|0);
         HEAP8[$481>>0] = 46;
         $s$1$us$i = $488;
        } else {
         $s$1$us$i = $481;
        }
        $489 = $484 != 0.0;
        if ($489) {
         $$2$us$i = $484;$s$0$us$i = $s$1$us$i;
        } else {
         $s$1$lcssa$i = $s$1$us$i;
         break;
        }
       }
      }
     } else {
      $$2$i = $$1$i;$s$0$i = $buf$i;
      while(1) {
       $490 = (~~(($$2$i)));
       $491 = (1584 + ($490)|0);
       $492 = HEAP8[$491>>0]|0;
       $493 = $492&255;
       $494 = $493 | $402;
       $495 = $494&255;
       $496 = (($s$0$i) + 1|0);
       HEAP8[$s$0$i>>0] = $495;
       $497 = (+($490|0));
       $498 = $$2$i - $497;
       $499 = $498 * 16.0;
       $500 = $496;
       $501 = (($500) - ($0))|0;
       $502 = ($501|0)==(1);
       if ($502) {
        $503 = (($s$0$i) + 2|0);
        HEAP8[$496>>0] = 46;
        $s$1$i = $503;
       } else {
        $s$1$i = $496;
       }
       $504 = $499 != 0.0;
       if ($504) {
        $$2$i = $499;$s$0$i = $s$1$i;
       } else {
        $s$1$lcssa$i = $s$1$i;
        break;
       }
      }
     }
     $505 = ($p$0|0)!=(0);
     $$pre306$i = $s$1$lcssa$i;
     $506 = (($11) + ($$pre306$i))|0;
     $507 = ($506|0)<($p$0|0);
     $or$cond271 = $505 & $507;
     $508 = $457;
     if ($or$cond271) {
      $509 = (($12) + ($p$0))|0;
      $510 = (($509) - ($508))|0;
      $l$0$i = $510;
     } else {
      $511 = (($10) - ($508))|0;
      $512 = (($511) + ($$pre306$i))|0;
      $l$0$i = $512;
     }
     $513 = (($l$0$i) + ($405))|0;
     $514 = $fl$1$ & 73728;
     $515 = ($514|0)==(0);
     $516 = ($w$1|0)>($513|0);
     $or$cond$i57$i = $515 & $516;
     if ($or$cond$i57$i) {
      $517 = (($w$1) - ($513))|0;
      $518 = ($517>>>0)>(256);
      $519 = $518 ? 256 : $517;
      _memset(($pad$i|0),32,($519|0))|0;
      $520 = ($517>>>0)>(255);
      if ($520) {
       $$01$i59$i = $517;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $521 = (($$01$i59$i) + -256)|0;
        $522 = ($521>>>0)>(255);
        if ($522) {
         $$01$i59$i = $521;
        } else {
         break;
        }
       }
       $523 = $517 & 255;
       $$0$lcssa$i61$i = $523;
      } else {
       $$0$lcssa$i61$i = $517;
      }
      (___fwritex($pad$i,$$0$lcssa$i61$i,$f)|0);
     }
     (___fwritex($prefix$0$$i,$405,$f)|0);
     $524 = ($514|0)==(65536);
     $or$cond$i64$i = $524 & $516;
     if ($or$cond$i64$i) {
      $525 = (($w$1) - ($513))|0;
      $526 = ($525>>>0)>(256);
      $527 = $526 ? 256 : $525;
      _memset(($pad$i|0),48,($527|0))|0;
      $528 = ($525>>>0)>(255);
      if ($528) {
       $$01$i66$i = $525;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $529 = (($$01$i66$i) + -256)|0;
        $530 = ($529>>>0)>(255);
        if ($530) {
         $$01$i66$i = $529;
        } else {
         break;
        }
       }
       $531 = $525 & 255;
       $$0$lcssa$i68$i = $531;
      } else {
       $$0$lcssa$i68$i = $525;
      }
      (___fwritex($pad$i,$$0$lcssa$i68$i,$f)|0);
     }
     $532 = (($$pre306$i) - ($0))|0;
     (___fwritex($buf$i,$532,$f)|0);
     $533 = $457;
     $534 = (($9) - ($533))|0;
     $535 = (($l$0$i) - ($534))|0;
     $536 = (($535) - ($532))|0;
     $537 = ($536|0)>(0);
     if ($537) {
      $538 = ($536>>>0)>(256);
      $539 = $538 ? 256 : $536;
      _memset(($pad$i|0),48,($539|0))|0;
      $540 = ($536>>>0)>(255);
      if ($540) {
       $$01$i72$i = $536;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $541 = (($$01$i72$i) + -256)|0;
        $542 = ($541>>>0)>(255);
        if ($542) {
         $$01$i72$i = $541;
        } else {
         break;
        }
       }
       $543 = $536 & 255;
       $$0$lcssa$i74$i = $543;
      } else {
       $$0$lcssa$i74$i = $536;
      }
      (___fwritex($pad$i,$$0$lcssa$i74$i,$f)|0);
     }
     (___fwritex($457,$534,$f)|0);
     $544 = ($514|0)==(8192);
     $or$cond$i77$i = $544 & $516;
     if ($or$cond$i77$i) {
      $545 = (($w$1) - ($513))|0;
      $546 = ($545>>>0)>(256);
      $547 = $546 ? 256 : $545;
      _memset(($pad$i|0),32,($547|0))|0;
      $548 = ($545>>>0)>(255);
      if ($548) {
       $$01$i79$i = $545;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $549 = (($$01$i79$i) + -256)|0;
        $550 = ($549>>>0)>(255);
        if ($550) {
         $$01$i79$i = $549;
        } else {
         break;
        }
       }
       $551 = $545 & 255;
       $$0$lcssa$i81$i = $551;
      } else {
       $$0$lcssa$i81$i = $545;
      }
      (___fwritex($pad$i,$$0$lcssa$i81$i,$f)|0);
     }
     $w$22$i = $516 ? $w$1 : $513;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$22$i;$l10n$0 = $l10n$3;
     continue L1;
    }
    $552 = ($p$0|0)<(0);
    $$p$i = $552 ? 6 : $p$0;
    if ($397) {
     $553 = $396 * 268435456.0;
     $554 = HEAP32[$e2$i>>2]|0;
     $555 = (($554) + -28)|0;
     HEAP32[$e2$i>>2] = $555;
     $$3$i = $553;$557 = $555;
    } else {
     $$pre$i = HEAP32[$e2$i>>2]|0;
     $$3$i = $396;$557 = $$pre$i;
    }
    $556 = ($557|0)<(0);
    $$36$i = $556 ? $big$i : $13;
    $558 = $$36$i;
    $$4$i = $$3$i;$z$0$i = $$36$i;
    while(1) {
     $559 = (~~(($$4$i))>>>0);
     HEAP32[$z$0$i>>2] = $559;
     $560 = (($z$0$i) + 4|0);
     $561 = (+($559>>>0));
     $562 = $$4$i - $561;
     $563 = $562 * 1.0E+9;
     $564 = $563 != 0.0;
     if ($564) {
      $$4$i = $563;$z$0$i = $560;
     } else {
      break;
     }
    }
    $$pr$i = HEAP32[$e2$i>>2]|0;
    $565 = ($$pr$i|0)>(0);
    if ($565) {
     $567 = $$pr$i;$a$1258$i = $$36$i;$z$1257$i = $560;
     while(1) {
      $566 = ($567|0)>(29);
      $568 = $566 ? 29 : $567;
      $d$0249$i = (($z$1257$i) + -4|0);
      $569 = ($d$0249$i>>>0)<($a$1258$i>>>0);
      do {
       if ($569) {
        $a$2$ph$i = $a$1258$i;
       } else {
        $carry$0250$i = 0;$d$0251$i = $d$0249$i;
        while(1) {
         $570 = HEAP32[$d$0251$i>>2]|0;
         $571 = (_bitshift64Shl(($570|0),0,($568|0))|0);
         $572 = tempRet0;
         $573 = (_i64Add(($571|0),($572|0),($carry$0250$i|0),0)|0);
         $574 = tempRet0;
         $575 = (___uremdi3(($573|0),($574|0),1000000000,0)|0);
         $576 = tempRet0;
         HEAP32[$d$0251$i>>2] = $575;
         $577 = (___udivdi3(($573|0),($574|0),1000000000,0)|0);
         $578 = tempRet0;
         $d$0$i = (($d$0251$i) + -4|0);
         $579 = ($d$0$i>>>0)<($a$1258$i>>>0);
         if ($579) {
          break;
         } else {
          $carry$0250$i = $577;$d$0251$i = $d$0$i;
         }
        }
        $580 = ($577|0)==(0);
        if ($580) {
         $a$2$ph$i = $a$1258$i;
         break;
        }
        $581 = (($a$1258$i) + -4|0);
        HEAP32[$581>>2] = $577;
        $a$2$ph$i = $581;
       }
      } while(0);
      $z$2$i = $z$1257$i;
      while(1) {
       $582 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
       if (!($582)) {
        break;
       }
       $583 = (($z$2$i) + -4|0);
       $584 = HEAP32[$583>>2]|0;
       $585 = ($584|0)==(0);
       if ($585) {
        $z$2$i = $583;
       } else {
        break;
       }
      }
      $586 = HEAP32[$e2$i>>2]|0;
      $587 = (($586) - ($568))|0;
      HEAP32[$e2$i>>2] = $587;
      $588 = ($587|0)>(0);
      if ($588) {
       $567 = $587;$a$1258$i = $a$2$ph$i;$z$1257$i = $z$2$i;
      } else {
       $$pr151$i = $587;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i;
       break;
      }
     }
    } else {
     $$pr151$i = $$pr$i;$a$1$lcssa$i = $$36$i;$z$1$lcssa$i = $560;
    }
    $589 = ($$pr151$i|0)<(0);
    L247: do {
     if ($589) {
      $590 = (($$p$i) + 25)|0;
      $591 = (($590|0) / 9)&-1;
      $592 = (($591) + 1)|0;
      $593 = ($400|0)==(102);
      if ($593) {
       $594 = (($$36$i) + ($592<<2)|0);
       $596 = $$pr151$i;$a$3244$us$i = $a$1$lcssa$i;$z$3243$us$i = $z$1$lcssa$i;
       while(1) {
        $595 = (0 - ($596))|0;
        $597 = ($595|0)>(9);
        $$23$us$i = $597 ? 9 : $595;
        $598 = ($a$3244$us$i>>>0)<($z$3243$us$i>>>0);
        do {
         if ($598) {
          $623 = 1 << $$23$us$i;
          $617 = (($623) + -1)|0;
          $620 = 1000000000 >>> $$23$us$i;
          $carry3$0238$us$i = 0;$d$1237$us$i = $a$3244$us$i;
          while(1) {
           $615 = HEAP32[$d$1237$us$i>>2]|0;
           $616 = $615 & $617;
           $618 = $615 >>> $$23$us$i;
           $619 = (($618) + ($carry3$0238$us$i))|0;
           HEAP32[$d$1237$us$i>>2] = $619;
           $606 = Math_imul($616, $620)|0;
           $621 = (($d$1237$us$i) + 4|0);
           $622 = ($621>>>0)<($z$3243$us$i>>>0);
           if ($622) {
            $carry3$0238$us$i = $606;$d$1237$us$i = $621;
           } else {
            break;
           }
          }
          $602 = HEAP32[$a$3244$us$i>>2]|0;
          $603 = ($602|0)==(0);
          $604 = (($a$3244$us$i) + 4|0);
          $$a$3$us$i = $603 ? $604 : $a$3244$us$i;
          $605 = ($606|0)==(0);
          if ($605) {
           $$a$3$us308$i = $$a$3$us$i;$z$4$us$i = $z$3243$us$i;
           break;
          }
          $607 = (($z$3243$us$i) + 4|0);
          HEAP32[$z$3243$us$i>>2] = $606;
          $$a$3$us308$i = $$a$3$us$i;$z$4$us$i = $607;
         } else {
          $599 = HEAP32[$a$3244$us$i>>2]|0;
          $600 = ($599|0)==(0);
          $601 = (($a$3244$us$i) + 4|0);
          $$a$3$us307$i = $600 ? $601 : $a$3244$us$i;
          $$a$3$us308$i = $$a$3$us307$i;$z$4$us$i = $z$3243$us$i;
         }
        } while(0);
        $608 = $z$4$us$i;
        $609 = (($608) - ($558))|0;
        $610 = $609 >> 2;
        $611 = ($610|0)>($592|0);
        $$z$4$us$i = $611 ? $594 : $z$4$us$i;
        $612 = HEAP32[$e2$i>>2]|0;
        $613 = (($612) + ($$23$us$i))|0;
        HEAP32[$e2$i>>2] = $613;
        $614 = ($613|0)<(0);
        if ($614) {
         $596 = $613;$a$3244$us$i = $$a$3$us308$i;$z$3243$us$i = $$z$4$us$i;
        } else {
         $a$3$lcssa$i = $$a$3$us308$i;$z$3$lcssa$i = $$z$4$us$i;
         break L247;
        }
       }
      } else {
       $625 = $$pr151$i;$a$3244$i = $a$1$lcssa$i;$z$3243$i = $z$1$lcssa$i;
      }
      while(1) {
       $624 = (0 - ($625))|0;
       $626 = ($624|0)>(9);
       $$23$i = $626 ? 9 : $624;
       $627 = ($a$3244$i>>>0)<($z$3243$i>>>0);
       do {
        if ($627) {
         $631 = 1 << $$23$i;
         $632 = (($631) + -1)|0;
         $633 = 1000000000 >>> $$23$i;
         $carry3$0238$i = 0;$d$1237$i = $a$3244$i;
         while(1) {
          $634 = HEAP32[$d$1237$i>>2]|0;
          $635 = $634 & $632;
          $636 = $634 >>> $$23$i;
          $637 = (($636) + ($carry3$0238$i))|0;
          HEAP32[$d$1237$i>>2] = $637;
          $638 = Math_imul($635, $633)|0;
          $639 = (($d$1237$i) + 4|0);
          $640 = ($639>>>0)<($z$3243$i>>>0);
          if ($640) {
           $carry3$0238$i = $638;$d$1237$i = $639;
          } else {
           break;
          }
         }
         $641 = HEAP32[$a$3244$i>>2]|0;
         $642 = ($641|0)==(0);
         $643 = (($a$3244$i) + 4|0);
         $$a$3$i = $642 ? $643 : $a$3244$i;
         $644 = ($638|0)==(0);
         if ($644) {
          $$a$3310$i = $$a$3$i;$z$4$i = $z$3243$i;
          break;
         }
         $645 = (($z$3243$i) + 4|0);
         HEAP32[$z$3243$i>>2] = $638;
         $$a$3310$i = $$a$3$i;$z$4$i = $645;
        } else {
         $628 = HEAP32[$a$3244$i>>2]|0;
         $629 = ($628|0)==(0);
         $630 = (($a$3244$i) + 4|0);
         $$a$3309$i = $629 ? $630 : $a$3244$i;
         $$a$3310$i = $$a$3309$i;$z$4$i = $z$3243$i;
        }
       } while(0);
       $646 = $z$4$i;
       $647 = $$a$3310$i;
       $648 = (($646) - ($647))|0;
       $649 = $648 >> 2;
       $650 = ($649|0)>($592|0);
       if ($650) {
        $651 = (($$a$3310$i) + ($592<<2)|0);
        $z$5$i = $651;
       } else {
        $z$5$i = $z$4$i;
       }
       $652 = HEAP32[$e2$i>>2]|0;
       $653 = (($652) + ($$23$i))|0;
       HEAP32[$e2$i>>2] = $653;
       $654 = ($653|0)<(0);
       if ($654) {
        $625 = $653;$a$3244$i = $$a$3310$i;$z$3243$i = $z$5$i;
       } else {
        $a$3$lcssa$i = $$a$3310$i;$z$3$lcssa$i = $z$5$i;
        break;
       }
      }
     } else {
      $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
     }
    } while(0);
    $655 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
    do {
     if ($655) {
      $656 = $a$3$lcssa$i;
      $657 = (($558) - ($656))|0;
      $658 = $657 >> 2;
      $659 = ($658*9)|0;
      $660 = HEAP32[$a$3$lcssa$i>>2]|0;
      $661 = ($660>>>0)<(10);
      if ($661) {
       $e$1$i = $659;
       break;
      } else {
       $e$0233$i = $659;$i$0232$i = 10;
      }
      while(1) {
       $662 = ($i$0232$i*10)|0;
       $663 = (($e$0233$i) + 1)|0;
       $664 = ($660>>>0)<($662>>>0);
       if ($664) {
        $e$1$i = $663;
        break;
       } else {
        $e$0233$i = $663;$i$0232$i = $662;
       }
      }
     } else {
      $e$1$i = 0;
     }
    } while(0);
    $665 = ($400|0)!=(102);
    $666 = $665 ? $e$1$i : 0;
    $667 = (($$p$i) - ($666))|0;
    $668 = ($400|0)==(103);
    $669 = ($$p$i|0)!=(0);
    $$24$i = $668 & $669;
    $$neg156$i = $$24$i << 31 >> 31;
    $670 = (($667) + ($$neg156$i))|0;
    $671 = $z$3$lcssa$i;
    $672 = (($671) - ($558))|0;
    $673 = $672 >> 2;
    $674 = ($673*9)|0;
    $675 = (($674) + -9)|0;
    $676 = ($670|0)<($675|0);
    if ($676) {
     $677 = (($670) + 9216)|0;
     $678 = (($677|0) / 9)&-1;
     $$sum$i = (($678) + -1023)|0;
     $679 = (($$36$i) + ($$sum$i<<2)|0);
     $680 = (($677|0) % 9)&-1;
     $j$0224$i = (($680) + 1)|0;
     $681 = ($j$0224$i|0)<(9);
     if ($681) {
      $i$1225$i = 10;$j$0226$i = $j$0224$i;
      while(1) {
       $682 = ($i$1225$i*10)|0;
       $j$0$i = (($j$0226$i) + 1)|0;
       $exitcond$i = ($j$0$i|0)==(9);
       if ($exitcond$i) {
        $i$1$lcssa$i = $682;
        break;
       } else {
        $i$1225$i = $682;$j$0226$i = $j$0$i;
       }
      }
     } else {
      $i$1$lcssa$i = 10;
     }
     $683 = HEAP32[$679>>2]|0;
     $684 = (($683>>>0) % ($i$1$lcssa$i>>>0))&-1;
     $685 = ($684|0)==(0);
     if ($685) {
      $$sum18$i = (($678) + -1022)|0;
      $686 = (($$36$i) + ($$sum18$i<<2)|0);
      $687 = ($686|0)==($z$3$lcssa$i|0);
      if ($687) {
       $a$7$i = $a$3$lcssa$i;$d$3$i = $679;$e$3$i = $e$1$i;
      } else {
       label = 232;
      }
     } else {
      label = 232;
     }
     do {
      if ((label|0) == 232) {
       label = 0;
       $688 = (($683>>>0) / ($i$1$lcssa$i>>>0))&-1;
       $689 = $688 & 1;
       $690 = ($689|0)==(0);
       $$25$i = $690 ? 9007199254740992.0 : 9007199254740994.0;
       $691 = (($i$1$lcssa$i|0) / 2)&-1;
       $692 = ($684>>>0)<($691>>>0);
       do {
        if ($692) {
         $small$0$i = 0.5;
        } else {
         $693 = ($684|0)==($691|0);
         if ($693) {
          $$sum19$i = (($678) + -1022)|0;
          $694 = (($$36$i) + ($$sum19$i<<2)|0);
          $695 = ($694|0)==($z$3$lcssa$i|0);
          if ($695) {
           $small$0$i = 1.0;
           break;
          }
         }
         $small$0$i = 1.5;
        }
       } while(0);
       $696 = ($pl$0$i|0)==(0);
       do {
        if ($696) {
         $round6$1$i = $$25$i;$small$1$i = $small$0$i;
        } else {
         $697 = HEAP8[$prefix$0$i>>0]|0;
         $698 = ($697<<24>>24)==(45);
         if (!($698)) {
          $round6$1$i = $$25$i;$small$1$i = $small$0$i;
          break;
         }
         $699 = $$25$i * -1.0;
         $700 = $small$0$i * -1.0;
         $round6$1$i = $699;$small$1$i = $700;
        }
       } while(0);
       $701 = (($683) - ($684))|0;
       HEAP32[$679>>2] = $701;
       $702 = $round6$1$i + $small$1$i;
       $703 = $702 != $round6$1$i;
       if (!($703)) {
        $a$7$i = $a$3$lcssa$i;$d$3$i = $679;$e$3$i = $e$1$i;
        break;
       }
       $704 = (($701) + ($i$1$lcssa$i))|0;
       HEAP32[$679>>2] = $704;
       $705 = ($704>>>0)>(999999999);
       if ($705) {
        $a$5218$i = $a$3$lcssa$i;$d$2217$i = $679;
        while(1) {
         $706 = (($d$2217$i) + -4|0);
         HEAP32[$d$2217$i>>2] = 0;
         $707 = ($706>>>0)<($a$5218$i>>>0);
         if ($707) {
          $708 = (($a$5218$i) + -4|0);
          HEAP32[$708>>2] = 0;
          $a$6$i = $708;
         } else {
          $a$6$i = $a$5218$i;
         }
         $709 = HEAP32[$706>>2]|0;
         $710 = (($709) + 1)|0;
         HEAP32[$706>>2] = $710;
         $711 = ($710>>>0)>(999999999);
         if ($711) {
          $a$5218$i = $a$6$i;$d$2217$i = $706;
         } else {
          $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $706;
          break;
         }
        }
       } else {
        $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $679;
       }
       $712 = $a$5$lcssa$i;
       $713 = (($558) - ($712))|0;
       $714 = $713 >> 2;
       $715 = ($714*9)|0;
       $716 = HEAP32[$a$5$lcssa$i>>2]|0;
       $717 = ($716>>>0)<(10);
       if ($717) {
        $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $715;
        break;
       } else {
        $e$2213$i = $715;$i$2212$i = 10;
       }
       while(1) {
        $718 = ($i$2212$i*10)|0;
        $719 = (($e$2213$i) + 1)|0;
        $720 = ($716>>>0)<($718>>>0);
        if ($720) {
         $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $719;
         break;
        } else {
         $e$2213$i = $719;$i$2212$i = $718;
        }
       }
      }
     } while(0);
     $721 = (($d$3$i) + 4|0);
     $722 = ($z$3$lcssa$i>>>0)>($721>>>0);
     $$z$3$i = $722 ? $721 : $z$3$lcssa$i;
     $a$8$ph$i = $a$7$i;$e$4$ph$i = $e$3$i;$z$6$ph$i = $$z$3$i;
    } else {
     $a$8$ph$i = $a$3$lcssa$i;$e$4$ph$i = $e$1$i;$z$6$ph$i = $z$3$lcssa$i;
    }
    $723 = (0 - ($e$4$ph$i))|0;
    $z$6$i = $z$6$ph$i;
    while(1) {
     $724 = ($z$6$i>>>0)>($a$8$ph$i>>>0);
     if (!($724)) {
      $$lcssa292$i = 0;
      break;
     }
     $725 = (($z$6$i) + -4|0);
     $726 = HEAP32[$725>>2]|0;
     $727 = ($726|0)==(0);
     if ($727) {
      $z$6$i = $725;
     } else {
      $$lcssa292$i = 1;
      break;
     }
    }
    do {
     if ($668) {
      $728 = ($$p$i|0)==(0);
      $729 = $728&1;
      $$$p$i = (($729) + ($$p$i))|0;
      $730 = ($$$p$i|0)>($e$4$ph$i|0);
      $731 = ($e$4$ph$i|0)>(-5);
      $or$cond5$i = $730 & $731;
      if ($or$cond5$i) {
       $732 = (($t$0) + -1)|0;
       $$neg157$i = (($$$p$i) + -1)|0;
       $733 = (($$neg157$i) - ($e$4$ph$i))|0;
       $$016$i = $732;$$213$i = $733;
      } else {
       $734 = (($t$0) + -2)|0;
       $735 = (($$$p$i) + -1)|0;
       $$016$i = $734;$$213$i = $735;
      }
      $736 = $fl$1$ & 8;
      $737 = ($736|0)==(0);
      if (!($737)) {
       $$117$i = $$016$i;$$314$i = $$213$i;
       break;
      }
      do {
       if ($$lcssa292$i) {
        $738 = (($z$6$i) + -4|0);
        $739 = HEAP32[$738>>2]|0;
        $740 = ($739|0)==(0);
        if ($740) {
         $j$2$i = 9;
         break;
        }
        $741 = (($739>>>0) % 10)&-1;
        $742 = ($741|0)==(0);
        if ($742) {
         $i$3204$i = 10;$j$1205$i = 0;
        } else {
         $j$2$i = 0;
         break;
        }
        while(1) {
         $743 = ($i$3204$i*10)|0;
         $744 = (($j$1205$i) + 1)|0;
         $745 = (($739>>>0) % ($743>>>0))&-1;
         $746 = ($745|0)==(0);
         if ($746) {
          $i$3204$i = $743;$j$1205$i = $744;
         } else {
          $j$2$i = $744;
          break;
         }
        }
       } else {
        $j$2$i = 9;
       }
      } while(0);
      $747 = $$016$i | 32;
      $748 = ($747|0)==(102);
      $749 = $z$6$i;
      $750 = (($749) - ($558))|0;
      $751 = $750 >> 2;
      $752 = ($751*9)|0;
      $753 = (($752) + -9)|0;
      if ($748) {
       $754 = (($753) - ($j$2$i))|0;
       $755 = ($754|0)<(0);
       $$26$i = $755 ? 0 : $754;
       $756 = ($$213$i|0)<($$26$i|0);
       $$213$$26$i = $756 ? $$213$i : $$26$i;
       $$117$i = $$016$i;$$314$i = $$213$$26$i;
       break;
      } else {
       $757 = (($753) + ($e$4$ph$i))|0;
       $758 = (($757) - ($j$2$i))|0;
       $759 = ($758|0)<(0);
       $$28$i = $759 ? 0 : $758;
       $760 = ($$213$i|0)<($$28$i|0);
       $$213$$28$i = $760 ? $$213$i : $$28$i;
       $$117$i = $$016$i;$$314$i = $$213$$28$i;
       break;
      }
     } else {
      $$117$i = $t$0;$$314$i = $$p$i;
     }
    } while(0);
    $761 = ($$314$i|0)!=(0);
    if ($761) {
     $765 = 1;
    } else {
     $762 = $fl$1$ & 8;
     $763 = ($762|0)!=(0);
     $765 = $763;
    }
    $764 = $765&1;
    $766 = $$117$i | 32;
    $767 = ($766|0)==(102);
    if ($767) {
     $768 = ($e$4$ph$i|0)>(0);
     $769 = $768 ? $e$4$ph$i : 0;
     $$pn$i = $769;$estr$2$i = 0;
    } else {
     $770 = ($e$4$ph$i|0)<(0);
     $771 = $770 ? $723 : $e$4$ph$i;
     $772 = ($771|0)<(0);
     if ($772) {
      $773 = ($771|0)<(0);
      $774 = $773 << 31 >> 31;
      $$05$i84$i = $7;$775 = $771;$776 = $774;
      while(1) {
       $777 = (___uremdi3(($775|0),($776|0),10,0)|0);
       $778 = tempRet0;
       $779 = $777 | 48;
       $780 = $779&255;
       $781 = (($$05$i84$i) + -1|0);
       HEAP8[$781>>0] = $780;
       $782 = (___udivdi3(($775|0),($776|0),10,0)|0);
       $783 = tempRet0;
       $784 = ($776>>>0)>(9);
       $785 = ($775>>>0)>(4294967295);
       $786 = ($776|0)==(9);
       $787 = $786 & $785;
       $788 = $784 | $787;
       if ($788) {
        $$05$i84$i = $781;$775 = $782;$776 = $783;
       } else {
        break;
       }
      }
      $$0$lcssa$i89$i = $781;$$01$lcssa$off0$i90$i = $782;
     } else {
      $$0$lcssa$i89$i = $7;$$01$lcssa$off0$i90$i = $771;
     }
     $789 = ($$01$lcssa$off0$i90$i|0)==(0);
     if ($789) {
      $estr$1$ph$i = $$0$lcssa$i89$i;
     } else {
      $$12$i92$i = $$0$lcssa$i89$i;$y$03$i91$i = $$01$lcssa$off0$i90$i;
      while(1) {
       $790 = (($y$03$i91$i>>>0) % 10)&-1;
       $791 = $790 | 48;
       $792 = $791&255;
       $793 = (($$12$i92$i) + -1|0);
       HEAP8[$793>>0] = $792;
       $794 = (($y$03$i91$i>>>0) / 10)&-1;
       $795 = ($y$03$i91$i>>>0)<(10);
       if ($795) {
        $estr$1$ph$i = $793;
        break;
       } else {
        $$12$i92$i = $793;$y$03$i91$i = $794;
       }
      }
     }
     $796 = $estr$1$ph$i;
     $797 = (($9) - ($796))|0;
     $798 = ($797|0)<(2);
     if ($798) {
      $estr$1195$i = $estr$1$ph$i;
      while(1) {
       $799 = (($estr$1195$i) + -1|0);
       HEAP8[$799>>0] = 48;
       $800 = $799;
       $801 = (($9) - ($800))|0;
       $802 = ($801|0)<(2);
       if ($802) {
        $estr$1195$i = $799;
       } else {
        $estr$1$lcssa$i = $799;
        break;
       }
      }
     } else {
      $estr$1$lcssa$i = $estr$1$ph$i;
     }
     $803 = $e$4$ph$i >> 31;
     $804 = $803 & 2;
     $805 = (($804) + 43)|0;
     $806 = $805&255;
     $807 = (($estr$1$lcssa$i) + -1|0);
     HEAP8[$807>>0] = $806;
     $808 = $$117$i&255;
     $809 = (($estr$1$lcssa$i) + -2|0);
     HEAP8[$809>>0] = $808;
     $810 = $809;
     $811 = (($9) - ($810))|0;
     $$pn$i = $811;$estr$2$i = $809;
    }
    $812 = (($pl$0$i) + 1)|0;
    $813 = (($812) + ($$314$i))|0;
    $l$1$i = (($813) + ($764))|0;
    $814 = (($l$1$i) + ($$pn$i))|0;
    $815 = $fl$1$ & 73728;
    $816 = ($815|0)==(0);
    $817 = ($w$1|0)>($814|0);
    $or$cond$i98$i = $816 & $817;
    if ($or$cond$i98$i) {
     $818 = (($w$1) - ($814))|0;
     $819 = ($818>>>0)>(256);
     $820 = $819 ? 256 : $818;
     _memset(($pad$i|0),32,($820|0))|0;
     $821 = ($818>>>0)>(255);
     if ($821) {
      $$01$i100$i = $818;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $822 = (($$01$i100$i) + -256)|0;
       $823 = ($822>>>0)>(255);
       if ($823) {
        $$01$i100$i = $822;
       } else {
        break;
       }
      }
      $824 = $818 & 255;
      $$0$lcssa$i102$i = $824;
     } else {
      $$0$lcssa$i102$i = $818;
     }
     (___fwritex($pad$i,$$0$lcssa$i102$i,$f)|0);
    }
    (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
    $825 = ($815|0)==(65536);
    $or$cond$i105$i = $825 & $817;
    if ($or$cond$i105$i) {
     $826 = (($w$1) - ($814))|0;
     $827 = ($826>>>0)>(256);
     $828 = $827 ? 256 : $826;
     _memset(($pad$i|0),48,($828|0))|0;
     $829 = ($826>>>0)>(255);
     if ($829) {
      $$01$i107$i = $826;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $830 = (($$01$i107$i) + -256)|0;
       $831 = ($830>>>0)>(255);
       if ($831) {
        $$01$i107$i = $830;
       } else {
        break;
       }
      }
      $832 = $826 & 255;
      $$0$lcssa$i109$i = $832;
     } else {
      $$0$lcssa$i109$i = $826;
     }
     (___fwritex($pad$i,$$0$lcssa$i109$i,$f)|0);
    }
    do {
     if ($767) {
      $833 = ($a$8$ph$i>>>0)>($$36$i>>>0);
      $r$0$a$8$i = $833 ? $$36$i : $a$8$ph$i;
      $d$4180$i = $r$0$a$8$i;
      while(1) {
       $834 = HEAP32[$d$4180$i>>2]|0;
       $835 = ($834|0)==(0);
       if ($835) {
        $$1$lcssa$i117$i = $14;
       } else {
        $$12$i115$i = $14;$y$03$i114$i = $834;
        while(1) {
         $836 = (($y$03$i114$i>>>0) % 10)&-1;
         $837 = $836 | 48;
         $838 = $837&255;
         $839 = (($$12$i115$i) + -1|0);
         HEAP8[$839>>0] = $838;
         $840 = (($y$03$i114$i>>>0) / 10)&-1;
         $841 = ($y$03$i114$i>>>0)<(10);
         if ($841) {
          $$1$lcssa$i117$i = $839;
          break;
         } else {
          $$12$i115$i = $839;$y$03$i114$i = $840;
         }
        }
       }
       $842 = ($d$4180$i|0)==($r$0$a$8$i|0);
       do {
        if ($842) {
         $846 = ($$1$lcssa$i117$i|0)==($14|0);
         if (!($846)) {
          $s7$1$i = $$1$lcssa$i117$i;
          break;
         }
         HEAP8[$16>>0] = 48;
         $s7$1$i = $16;
        } else {
         $843 = ($$1$lcssa$i117$i>>>0)>($buf$i>>>0);
         if ($843) {
          $s7$0177$i = $$1$lcssa$i117$i;
         } else {
          $s7$1$i = $$1$lcssa$i117$i;
          break;
         }
         while(1) {
          $844 = (($s7$0177$i) + -1|0);
          HEAP8[$844>>0] = 48;
          $845 = ($844>>>0)>($buf$i>>>0);
          if ($845) {
           $s7$0177$i = $844;
          } else {
           $s7$1$i = $844;
           break;
          }
         }
        }
       } while(0);
       $847 = $s7$1$i;
       $848 = (($15) - ($847))|0;
       (___fwritex($s7$1$i,$848,$f)|0);
       $849 = (($d$4180$i) + 4|0);
       $850 = ($849>>>0)>($$36$i>>>0);
       if ($850) {
        break;
       } else {
        $d$4180$i = $849;
       }
      }
      $$not$i = $761 ^ 1;
      $851 = $fl$1$ & 8;
      $852 = ($851|0)==(0);
      $or$cond32$i = $852 & $$not$i;
      if (!($or$cond32$i)) {
       (___fwritex(1600,1,$f)|0);
      }
      $853 = ($849>>>0)<($z$6$i>>>0);
      $854 = ($$314$i|0)>(0);
      $or$cond7169$i = $853 & $854;
      if ($or$cond7169$i) {
       $$415171$i = $$314$i;$d$5170$i = $849;
       while(1) {
        $855 = HEAP32[$d$5170$i>>2]|0;
        $856 = ($855|0)==(0);
        if ($856) {
         $s8$0165$i = $14;
         label = 301;
        } else {
         $$12$i124$i = $14;$y$03$i123$i = $855;
         while(1) {
          $857 = (($y$03$i123$i>>>0) % 10)&-1;
          $858 = $857 | 48;
          $859 = $858&255;
          $860 = (($$12$i124$i) + -1|0);
          HEAP8[$860>>0] = $859;
          $861 = (($y$03$i123$i>>>0) / 10)&-1;
          $862 = ($y$03$i123$i>>>0)<(10);
          if ($862) {
           break;
          } else {
           $$12$i124$i = $860;$y$03$i123$i = $861;
          }
         }
         $863 = ($860>>>0)>($buf$i>>>0);
         if ($863) {
          $s8$0165$i = $860;
          label = 301;
         } else {
          $s8$0$lcssa$i = $860;
         }
        }
        if ((label|0) == 301) {
         while(1) {
          label = 0;
          $864 = (($s8$0165$i) + -1|0);
          HEAP8[$864>>0] = 48;
          $865 = ($864>>>0)>($buf$i>>>0);
          if ($865) {
           $s8$0165$i = $864;
           label = 301;
          } else {
           $s8$0$lcssa$i = $864;
           break;
          }
         }
        }
        $866 = ($$415171$i|0)>(9);
        $867 = $866 ? 9 : $$415171$i;
        (___fwritex($s8$0$lcssa$i,$867,$f)|0);
        $868 = (($d$5170$i) + 4|0);
        $869 = (($$415171$i) + -9)|0;
        $870 = ($868>>>0)<($z$6$i>>>0);
        $871 = ($869|0)>(0);
        $or$cond7$i = $870 & $871;
        if ($or$cond7$i) {
         $$415171$i = $869;$d$5170$i = $868;
        } else {
         $$415$lcssa$i = $869;
         break;
        }
       }
      } else {
       $$415$lcssa$i = $$314$i;
      }
      $872 = ($$415$lcssa$i|0)>(0);
      if (!($872)) {
       break;
      }
      $873 = ($$415$lcssa$i>>>0)>(256);
      $874 = $873 ? 256 : $$415$lcssa$i;
      _memset(($pad$i|0),48,($874|0))|0;
      $875 = ($$415$lcssa$i>>>0)>(255);
      if ($875) {
       $$01$i131$i = $$415$lcssa$i;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $876 = (($$01$i131$i) + -256)|0;
        $877 = ($876>>>0)>(255);
        if ($877) {
         $$01$i131$i = $876;
        } else {
         break;
        }
       }
       $878 = $$415$lcssa$i & 255;
       $$0$lcssa$i133$i = $878;
      } else {
       $$0$lcssa$i133$i = $$415$lcssa$i;
      }
      (___fwritex($pad$i,$$0$lcssa$i133$i,$f)|0);
     } else {
      $879 = (($a$8$ph$i) + 4|0);
      $z$6$$i = $$lcssa292$i ? $z$6$i : $879;
      $880 = ($$314$i|0)>(-1);
      do {
       if ($880) {
        $881 = $fl$1$ & 8;
        $882 = ($881|0)==(0);
        $$5189$i = $$314$i;$d$6188$i = $a$8$ph$i;
        while(1) {
         $883 = HEAP32[$d$6188$i>>2]|0;
         $884 = ($883|0)==(0);
         if ($884) {
          label = 313;
         } else {
          $$12$i139$i = $14;$y$03$i138$i = $883;
          while(1) {
           $885 = (($y$03$i138$i>>>0) % 10)&-1;
           $886 = $885 | 48;
           $887 = $886&255;
           $888 = (($$12$i139$i) + -1|0);
           HEAP8[$888>>0] = $887;
           $889 = (($y$03$i138$i>>>0) / 10)&-1;
           $890 = ($y$03$i138$i>>>0)<(10);
           if ($890) {
            break;
           } else {
            $$12$i139$i = $888;$y$03$i138$i = $889;
           }
          }
          $891 = ($888|0)==($14|0);
          if ($891) {
           label = 313;
          } else {
           $s9$0$i = $888;
          }
         }
         if ((label|0) == 313) {
          label = 0;
          HEAP8[$16>>0] = 48;
          $s9$0$i = $16;
         }
         $892 = ($d$6188$i|0)==($a$8$ph$i|0);
         do {
          if ($892) {
           $896 = (($s9$0$i) + 1|0);
           (___fwritex($s9$0$i,1,$f)|0);
           $897 = ($$5189$i|0)<(1);
           $or$cond34$i = $897 & $882;
           if ($or$cond34$i) {
            $s9$2$i = $896;
            break;
           }
           (___fwritex(1600,1,$f)|0);
           $s9$2$i = $896;
          } else {
           $893 = ($s9$0$i>>>0)>($buf$i>>>0);
           if ($893) {
            $s9$1184$i = $s9$0$i;
           } else {
            $s9$2$i = $s9$0$i;
            break;
           }
           while(1) {
            $894 = (($s9$1184$i) + -1|0);
            HEAP8[$894>>0] = 48;
            $895 = ($894>>>0)>($buf$i>>>0);
            if ($895) {
             $s9$1184$i = $894;
            } else {
             $s9$2$i = $894;
             break;
            }
           }
          }
         } while(0);
         $898 = $s9$2$i;
         $899 = (($15) - ($898))|0;
         $900 = ($$5189$i|0)>($899|0);
         $$$5$i = $900 ? $899 : $$5189$i;
         (___fwritex($s9$2$i,$$$5$i,$f)|0);
         $901 = (($$5189$i) - ($899))|0;
         $902 = (($d$6188$i) + 4|0);
         $903 = ($902>>>0)<($z$6$$i>>>0);
         $904 = ($901|0)>(-1);
         $or$cond9$i = $903 & $904;
         if ($or$cond9$i) {
          $$5189$i = $901;$d$6188$i = $902;
         } else {
          break;
         }
        }
        $905 = ($901|0)>(0);
        if (!($905)) {
         break;
        }
        $906 = ($901>>>0)>(256);
        $907 = $906 ? 256 : $901;
        _memset(($pad$i|0),48,($907|0))|0;
        $908 = ($901>>>0)>(255);
        if ($908) {
         $$01$i146$i = $901;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $909 = (($$01$i146$i) + -256)|0;
          $910 = ($909>>>0)>(255);
          if ($910) {
           $$01$i146$i = $909;
          } else {
           break;
          }
         }
         $911 = $901 & 255;
         $$0$lcssa$i148$i = $911;
        } else {
         $$0$lcssa$i148$i = $901;
        }
        (___fwritex($pad$i,$$0$lcssa$i148$i,$f)|0);
       }
      } while(0);
      $912 = $estr$2$i;
      $913 = (($9) - ($912))|0;
      (___fwritex($estr$2$i,$913,$f)|0);
     }
    } while(0);
    $914 = ($815|0)==(8192);
    $or$cond$i$i = $914 & $817;
    if ($or$cond$i$i) {
     $915 = (($w$1) - ($814))|0;
     $916 = ($915>>>0)>(256);
     $917 = $916 ? 256 : $915;
     _memset(($pad$i|0),32,($917|0))|0;
     $918 = ($915>>>0)>(255);
     if ($918) {
      $$01$i$i = $915;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $919 = (($$01$i$i) + -256)|0;
       $920 = ($919>>>0)>(255);
       if ($920) {
        $$01$i$i = $919;
       } else {
        break;
       }
      }
      $921 = $915 & 255;
      $$0$lcssa$i$i = $921;
     } else {
      $$0$lcssa$i$i = $915;
     }
     (___fwritex($pad$i,$$0$lcssa$i$i,$f)|0);
    }
    $w$35$i = $817 ? $w$1 : $814;
    $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$35$i;$l10n$0 = $l10n$3;
    continue L1;
    break;
   }
   default: {
    $1036 = $191;$1037 = $218;$a$2 = $fmt83;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 1504;$z$2 = $2;
   }
   }
  } while(0);
  do {
   if ((label|0) == 75) {
    label = 0;
    $215 = $t$1 & 32;
    $216 = ($191|0)==(0);
    $217 = ($218|0)==(0);
    $219 = $216 & $217;
    if ($219) {
     $293 = $191;$295 = $218;$a$0 = $2;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 1504;
     label = 91;
    } else {
     $$012$i = $2;$221 = $191;$228 = $218;
     while(1) {
      $220 = $221 & 15;
      $222 = (1584 + ($220)|0);
      $223 = HEAP8[$222>>0]|0;
      $224 = $223&255;
      $225 = $224 | $215;
      $226 = $225&255;
      $227 = (($$012$i) + -1|0);
      HEAP8[$227>>0] = $226;
      $229 = (_bitshift64Lshr(($221|0),($228|0),4)|0);
      $230 = tempRet0;
      $231 = ($229|0)==(0);
      $232 = ($230|0)==(0);
      $233 = $231 & $232;
      if ($233) {
       break;
      } else {
       $$012$i = $227;$221 = $229;$228 = $230;
      }
     }
     $234 = $fl$3 & 8;
     $235 = ($234|0)==(0);
     if ($235) {
      $293 = $191;$295 = $218;$a$0 = $227;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 1504;
      label = 91;
     } else {
      $236 = $t$1 >> 4;
      $237 = (1504 + ($236)|0);
      $293 = $191;$295 = $218;$a$0 = $227;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $237;
      label = 91;
     }
    }
   }
   else if ((label|0) == 86) {
    label = 0;
    $262 = ($263>>>0)>(0);
    $264 = ($265>>>0)>(4294967295);
    $266 = ($263|0)==(0);
    $267 = $266 & $264;
    $268 = $262 | $267;
    if ($268) {
     $$05$i = $2;$269 = $265;$270 = $263;
     while(1) {
      $271 = (___uremdi3(($269|0),($270|0),10,0)|0);
      $272 = tempRet0;
      $273 = $271 | 48;
      $274 = $273&255;
      $275 = (($$05$i) + -1|0);
      HEAP8[$275>>0] = $274;
      $276 = (___udivdi3(($269|0),($270|0),10,0)|0);
      $277 = tempRet0;
      $278 = ($270>>>0)>(9);
      $279 = ($269>>>0)>(4294967295);
      $280 = ($270|0)==(9);
      $281 = $280 & $279;
      $282 = $278 | $281;
      if ($282) {
       $$05$i = $275;$269 = $276;$270 = $277;
      } else {
       break;
      }
     }
     $$0$lcssa$i47 = $275;$$01$lcssa$off0$i = $276;
    } else {
     $$0$lcssa$i47 = $2;$$01$lcssa$off0$i = $265;
    }
    $283 = ($$01$lcssa$off0$i|0)==(0);
    if ($283) {
     $293 = $265;$295 = $263;$a$0 = $$0$lcssa$i47;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
     label = 91;
    } else {
     $$12$i = $$0$lcssa$i47;$y$03$i = $$01$lcssa$off0$i;
     while(1) {
      $284 = (($y$03$i>>>0) % 10)&-1;
      $285 = $284 | 48;
      $286 = $285&255;
      $287 = (($$12$i) + -1|0);
      HEAP8[$287>>0] = $286;
      $288 = (($y$03$i>>>0) / 10)&-1;
      $289 = ($y$03$i>>>0)<(10);
      if ($289) {
       $293 = $265;$295 = $263;$a$0 = $287;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
       label = 91;
       break;
      } else {
       $$12$i = $287;$y$03$i = $288;
      }
     }
    }
   }
   else if ((label|0) == 96) {
    label = 0;
    $310 = (_memchr($a$1,0,$p$0)|0);
    $311 = ($310|0)==(0|0);
    if ($311) {
     $312 = (($a$1) + ($p$0)|0);
     $1036 = $191;$1037 = $218;$a$2 = $a$1;$fl$6 = $189;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 1504;$z$2 = $312;
     break;
    } else {
     $313 = $310;
     $314 = $a$1;
     $315 = (($313) - ($314))|0;
     $1036 = $191;$1037 = $218;$a$2 = $a$1;$fl$6 = $189;$p$5 = $315;$pl$2 = 0;$prefix$2 = 1504;$z$2 = $310;
     break;
    }
   }
   else if ((label|0) == 101) {
    label = 0;
    $i$0166 = 0;$l$1165 = 0;$ws$0167 = $1038;
    while(1) {
     $318 = HEAP32[$ws$0167>>2]|0;
     $319 = ($318|0)==(0);
     if ($319) {
      $i$0$lcssa = $i$0166;$l$2 = $l$1165;
      break;
     }
     $320 = (_wctomb($mb,$318)|0);
     $321 = ($320|0)<(0);
     $322 = (($p$4266) - ($i$0166))|0;
     $323 = ($320>>>0)>($322>>>0);
     $or$cond17 = $321 | $323;
     if ($or$cond17) {
      $i$0$lcssa = $i$0166;$l$2 = $320;
      break;
     }
     $324 = (($ws$0167) + 4|0);
     $325 = (($320) + ($i$0166))|0;
     $326 = ($p$4266>>>0)>($325>>>0);
     if ($326) {
      $i$0166 = $325;$l$1165 = $320;$ws$0167 = $324;
     } else {
      $i$0$lcssa = $325;$l$2 = $320;
      break;
     }
    }
    $327 = ($l$2|0)<(0);
    if ($327) {
     $$0 = -1;
     label = 370;
     break L1;
    } else {
     $1040 = $1039;$1041 = $1038;$i$0$lcssa267 = $i$0$lcssa;
     label = 106;
    }
   }
  } while(0);
  if ((label|0) == 91) {
   label = 0;
   $290 = ($p$2|0)>(-1);
   $291 = $fl$4 & -65537;
   $$fl$4 = $290 ? $291 : $fl$4;
   $292 = ($293|0)!=(0);
   $294 = ($295|0)!=(0);
   $296 = $292 | $294;
   $297 = ($p$2|0)!=(0);
   $or$cond = $296 | $297;
   if ($or$cond) {
    $298 = $a$0;
    $299 = (($3) - ($298))|0;
    $300 = $296&1;
    $301 = $300 ^ 1;
    $302 = (($301) + ($299))|0;
    $303 = ($p$2|0)>($302|0);
    $p$2$ = $303 ? $p$2 : $302;
    $1036 = $293;$1037 = $295;$a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   } else {
    $1036 = $293;$1037 = $295;$a$2 = $2;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   }
  }
  else if ((label|0) == 106) {
   label = 0;
   $328 = $fl$1$ & 73728;
   $329 = ($328|0)==(0);
   $330 = ($w$1|0)>($i$0$lcssa267|0);
   $or$cond$i58 = $329 & $330;
   if ($or$cond$i58) {
    $331 = (($w$1) - ($i$0$lcssa267))|0;
    $332 = ($331>>>0)>(256);
    $333 = $332 ? 256 : $331;
    _memset(($pad$i|0),32,($333|0))|0;
    $334 = ($331>>>0)>(255);
    if ($334) {
     $$01$i60 = $331;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $335 = (($$01$i60) + -256)|0;
      $336 = ($335>>>0)>(255);
      if ($336) {
       $$01$i60 = $335;
      } else {
       break;
      }
     }
     $337 = $331 & 255;
     $$0$lcssa$i62 = $337;
    } else {
     $$0$lcssa$i62 = $331;
    }
    (___fwritex($pad$i,$$0$lcssa$i62,$f)|0);
   }
   $338 = ($i$0$lcssa267|0)==(0);
   L479: do {
    if (!($338)) {
     $i$1174 = 0;$ws$1175 = $1041;
     while(1) {
      $339 = HEAP32[$ws$1175>>2]|0;
      $340 = ($339|0)==(0);
      if ($340) {
       break L479;
      }
      $341 = (_wctomb($mb,$339)|0);
      $342 = (($341) + ($i$1174))|0;
      $343 = ($342|0)>($i$0$lcssa267|0);
      if ($343) {
       break L479;
      }
      $344 = (($ws$1175) + 4|0);
      (___fwritex($mb,$341,$f)|0);
      $345 = ($342>>>0)<($i$0$lcssa267>>>0);
      if ($345) {
       $i$1174 = $342;$ws$1175 = $344;
      } else {
       break;
      }
     }
    }
   } while(0);
   $346 = ($328|0)==(8192);
   $or$cond$i65 = $346 & $330;
   if ($or$cond$i65) {
    $347 = (($w$1) - ($i$0$lcssa267))|0;
    $348 = ($347>>>0)>(256);
    $349 = $348 ? 256 : $347;
    _memset(($pad$i|0),32,($349|0))|0;
    $350 = ($347>>>0)>(255);
    if ($350) {
     $$01$i67 = $347;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $351 = (($$01$i67) + -256)|0;
      $352 = ($351>>>0)>(255);
      if ($352) {
       $$01$i67 = $351;
      } else {
       break;
      }
     }
     $353 = $347 & 255;
     $$0$lcssa$i69 = $353;
    } else {
     $$0$lcssa$i69 = $347;
    }
    (___fwritex($pad$i,$$0$lcssa$i69,$f)|0);
   }
   $354 = $330 ? $w$1 : $i$0$lcssa267;
   $1029 = $1040;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $354;$l10n$0 = $l10n$3;
   continue;
  }
  $922 = $z$2;
  $923 = $a$2;
  $924 = (($922) - ($923))|0;
  $925 = ($p$5|0)<($924|0);
  $$p$5 = $925 ? $924 : $p$5;
  $926 = (($pl$2) + ($$p$5))|0;
  $927 = ($w$1|0)<($926|0);
  $w$2 = $927 ? $926 : $w$1;
  $928 = $fl$6 & 73728;
  $929 = ($928|0)==(0);
  $930 = ($w$2|0)>($926|0);
  $or$cond$i75 = $929 & $930;
  if ($or$cond$i75) {
   $931 = (($w$2) - ($926))|0;
   $932 = ($931>>>0)>(256);
   $933 = $932 ? 256 : $931;
   _memset(($pad$i|0),32,($933|0))|0;
   $934 = ($931>>>0)>(255);
   if ($934) {
    $$01$i77 = $931;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $935 = (($$01$i77) + -256)|0;
     $936 = ($935>>>0)>(255);
     if ($936) {
      $$01$i77 = $935;
     } else {
      break;
     }
    }
    $937 = $931 & 255;
    $$0$lcssa$i79 = $937;
   } else {
    $$0$lcssa$i79 = $931;
   }
   (___fwritex($pad$i,$$0$lcssa$i79,$f)|0);
  }
  (___fwritex($prefix$2,$pl$2,$f)|0);
  $938 = ($928|0)==(65536);
  $or$cond$i51 = $938 & $930;
  if ($or$cond$i51) {
   $939 = (($w$2) - ($926))|0;
   $940 = ($939>>>0)>(256);
   $941 = $940 ? 256 : $939;
   _memset(($pad$i|0),48,($941|0))|0;
   $942 = ($939>>>0)>(255);
   if ($942) {
    $$01$i53 = $939;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $943 = (($$01$i53) + -256)|0;
     $944 = ($943>>>0)>(255);
     if ($944) {
      $$01$i53 = $943;
     } else {
      break;
     }
    }
    $945 = $939 & 255;
    $$0$lcssa$i55 = $945;
   } else {
    $$0$lcssa$i55 = $939;
   }
   (___fwritex($pad$i,$$0$lcssa$i55,$f)|0);
  }
  $946 = ($$p$5|0)>($924|0);
  if ($946) {
   $947 = (($$p$5) - ($924))|0;
   $948 = ($947>>>0)>(256);
   $949 = $948 ? 256 : $947;
   _memset(($pad$i|0),48,($949|0))|0;
   $950 = ($947>>>0)>(255);
   if ($950) {
    $$01$i38 = $947;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $951 = (($$01$i38) + -256)|0;
     $952 = ($951>>>0)>(255);
     if ($952) {
      $$01$i38 = $951;
     } else {
      break;
     }
    }
    $953 = $947 & 255;
    $$0$lcssa$i40 = $953;
   } else {
    $$0$lcssa$i40 = $947;
   }
   (___fwritex($pad$i,$$0$lcssa$i40,$f)|0);
  }
  (___fwritex($a$2,$924,$f)|0);
  $954 = ($928|0)==(8192);
  $or$cond$i = $954 & $930;
  if (!($or$cond$i)) {
   $1029 = $1036;$1030 = $1037;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$2;$l10n$0 = $l10n$3;
   continue;
  }
  $955 = (($w$2) - ($926))|0;
  $956 = ($955>>>0)>(256);
  $957 = $956 ? 256 : $955;
  _memset(($pad$i|0),32,($957|0))|0;
  $958 = ($955>>>0)>(255);
  if ($958) {
   $$01$i = $955;
   while(1) {
    (___fwritex($pad$i,256,$f)|0);
    $959 = (($$01$i) + -256)|0;
    $960 = ($959>>>0)>(255);
    if ($960) {
     $$01$i = $959;
    } else {
     break;
    }
   }
   $961 = $955 & 255;
   $$0$lcssa$i = $961;
  } else {
   $$0$lcssa$i = $955;
  }
  (___fwritex($pad$i,$$0$lcssa$i,$f)|0);
  $1029 = $1036;$1030 = $1037;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$2;$l10n$0 = $l10n$3;
 }
 if ((label|0) == 352) {
  $962 = ($f|0)==(0|0);
  if (!($962)) {
   $$0 = $cnt$1;
   STACKTOP = sp;return ($$0|0);
  }
  $963 = ($l10n$0|0)==(0);
  if ($963) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  } else {
   $i$2100 = 1;
  }
  while(1) {
   $964 = (($nl_type) + ($i$2100<<2)|0);
   $965 = HEAP32[$964>>2]|0;
   $966 = ($965|0)==(0);
   if ($966) {
    $i$397 = $i$2100;
    break;
   }
   $967 = (($nl_arg) + ($i$2100<<3)|0);
   $968 = ($965>>>0)>(20);
   L534: do {
    if (!($968)) {
     do {
      switch ($965|0) {
      case 9:  {
       $arglist_current35 = HEAP32[$ap>>2]|0;
       $969 = HEAP32[$arglist_current35>>2]|0;
       $arglist_next36 = (($arglist_current35) + 4|0);
       HEAP32[$ap>>2] = $arglist_next36;
       HEAP32[$967>>2] = $969;
       break L534;
       break;
      }
      case 10:  {
       $arglist_current38 = HEAP32[$ap>>2]|0;
       $970 = HEAP32[$arglist_current38>>2]|0;
       $arglist_next39 = (($arglist_current38) + 4|0);
       HEAP32[$ap>>2] = $arglist_next39;
       $971 = ($970|0)<(0);
       $972 = $971 << 31 >> 31;
       $973 = $967;
       $974 = $973;
       HEAP32[$974>>2] = $970;
       $975 = (($973) + 4)|0;
       $976 = $975;
       HEAP32[$976>>2] = $972;
       break L534;
       break;
      }
      case 11:  {
       $arglist_current41 = HEAP32[$ap>>2]|0;
       $977 = HEAP32[$arglist_current41>>2]|0;
       $arglist_next42 = (($arglist_current41) + 4|0);
       HEAP32[$ap>>2] = $arglist_next42;
       $978 = $967;
       $979 = $978;
       HEAP32[$979>>2] = $977;
       $980 = (($978) + 4)|0;
       $981 = $980;
       HEAP32[$981>>2] = 0;
       break L534;
       break;
      }
      case 12:  {
       $arglist_current44 = HEAP32[$ap>>2]|0;
       $982 = $arglist_current44;
       $983 = $982;
       $984 = HEAP32[$983>>2]|0;
       $985 = (($982) + 4)|0;
       $986 = $985;
       $987 = HEAP32[$986>>2]|0;
       $arglist_next45 = (($arglist_current44) + 8|0);
       HEAP32[$ap>>2] = $arglist_next45;
       $988 = $967;
       $989 = $988;
       HEAP32[$989>>2] = $984;
       $990 = (($988) + 4)|0;
       $991 = $990;
       HEAP32[$991>>2] = $987;
       break L534;
       break;
      }
      case 13:  {
       $arglist_current47 = HEAP32[$ap>>2]|0;
       $992 = HEAP32[$arglist_current47>>2]|0;
       $arglist_next48 = (($arglist_current47) + 4|0);
       HEAP32[$ap>>2] = $arglist_next48;
       $993 = $992&65535;
       $994 = $993 << 16 >> 16;
       $995 = ($994|0)<(0);
       $996 = $995 << 31 >> 31;
       $997 = $967;
       $998 = $997;
       HEAP32[$998>>2] = $994;
       $999 = (($997) + 4)|0;
       $1000 = $999;
       HEAP32[$1000>>2] = $996;
       break L534;
       break;
      }
      case 14:  {
       $arglist_current50 = HEAP32[$ap>>2]|0;
       $1001 = HEAP32[$arglist_current50>>2]|0;
       $arglist_next51 = (($arglist_current50) + 4|0);
       HEAP32[$ap>>2] = $arglist_next51;
       $$mask1$i = $1001 & 65535;
       $1002 = $967;
       $1003 = $1002;
       HEAP32[$1003>>2] = $$mask1$i;
       $1004 = (($1002) + 4)|0;
       $1005 = $1004;
       HEAP32[$1005>>2] = 0;
       break L534;
       break;
      }
      case 15:  {
       $arglist_current53 = HEAP32[$ap>>2]|0;
       $1006 = HEAP32[$arglist_current53>>2]|0;
       $arglist_next54 = (($arglist_current53) + 4|0);
       HEAP32[$ap>>2] = $arglist_next54;
       $1007 = $1006&255;
       $1008 = $1007 << 24 >> 24;
       $1009 = ($1008|0)<(0);
       $1010 = $1009 << 31 >> 31;
       $1011 = $967;
       $1012 = $1011;
       HEAP32[$1012>>2] = $1008;
       $1013 = (($1011) + 4)|0;
       $1014 = $1013;
       HEAP32[$1014>>2] = $1010;
       break L534;
       break;
      }
      case 16:  {
       $arglist_current56 = HEAP32[$ap>>2]|0;
       $1015 = HEAP32[$arglist_current56>>2]|0;
       $arglist_next57 = (($arglist_current56) + 4|0);
       HEAP32[$ap>>2] = $arglist_next57;
       $$mask$i = $1015 & 255;
       $1016 = $967;
       $1017 = $1016;
       HEAP32[$1017>>2] = $$mask$i;
       $1018 = (($1016) + 4)|0;
       $1019 = $1018;
       HEAP32[$1019>>2] = 0;
       break L534;
       break;
      }
      case 17:  {
       $arglist_current59 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current59>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current59+4>>2];$1020 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next60 = (($arglist_current59) + 8|0);
       HEAP32[$ap>>2] = $arglist_next60;
       HEAPF64[$967>>3] = $1020;
       break L534;
       break;
      }
      case 18:  {
       $arglist_current62 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current62>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current62+4>>2];$1021 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next63 = (($arglist_current62) + 8|0);
       HEAP32[$ap>>2] = $arglist_next63;
       HEAPF64[$967>>3] = $1021;
       break L534;
       break;
      }
      default: {
       break L534;
      }
      }
     } while(0);
    }
   } while(0);
   $1022 = (($i$2100) + 1)|0;
   $1023 = ($1022|0)<(10);
   if ($1023) {
    $i$2100 = $1022;
   } else {
    $$0 = 1;
    label = 370;
    break;
   }
  }
  if ((label|0) == 370) {
   STACKTOP = sp;return ($$0|0);
  }
  while(1) {
   $1026 = (($nl_type) + ($i$397<<2)|0);
   $1027 = HEAP32[$1026>>2]|0;
   $1028 = ($1027|0)==(0);
   $1025 = (($i$397) + 1)|0;
   if (!($1028)) {
    $$0 = -1;
    label = 370;
    break;
   }
   $1024 = ($1025|0)<(10);
   if ($1024) {
    $i$397 = $1025;
   } else {
    $$0 = 1;
    label = 370;
    break;
   }
  }
  if ((label|0) == 370) {
   STACKTOP = sp;return ($$0|0);
  }
 }
 else if ((label|0) == 370) {
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function runPostSets() {
 
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _llvm_ctlz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((ctlz_i8)+(x >>> 24))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((ctlz_i8)+(x&0xff))>>0)])|0) + 24)|0;
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _strncpy(pdest, psrc, num) {
    pdest = pdest|0; psrc = psrc|0; num = num|0;
    var padding = 0, curr = 0, i = 0;
    while ((i|0) < (num|0)) {
      curr = padding ? 0 : ((HEAP8[(((psrc)+(i))>>0)])|0);
      HEAP8[(((pdest)+(i))>>0)]=curr;
      padding = padding ? 1 : (((HEAP8[(((psrc)+(i))>>0)])|0) == 0);
      i = (i+1)|0;
    }
    return pdest|0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return (tempRet0 = tempRet0, $10$0) | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return (tempRet0 = tempRet0, $1$0) | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (_llvm_ctlz_i32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0, $d_sroa_0_0_insert_insert99$1, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



// EMSCRIPTEN_END_FUNCS

  
  function dynCall_iiii(index,a1,a2,a3) {
    index = index|0;
    a1=a1|0; a2=a2|0; a3=a3|0;
    return FUNCTION_TABLE_iiii[index&7](a1|0,a2|0,a3|0)|0;
  }


  function jsCall_iiii_0(a1,a2,a3) {
    a1=a1|0; a2=a2|0; a3=a3|0;
    return jsCall(0,a1|0,a2|0,a3|0)|0;
  }



  function jsCall_iiii_1(a1,a2,a3) {
    a1=a1|0; a2=a2|0; a3=a3|0;
    return jsCall(1,a1|0,a2|0,a3|0)|0;
  }



  function dynCall_vdiii(index,a1,a2,a3,a4) {
    index = index|0;
    a1=+a1; a2=a2|0; a3=a3|0; a4=a4|0;
    FUNCTION_TABLE_vdiii[index&7](+a1,a2|0,a3|0,a4|0);
  }


  function jsCall_vdiii_0(a1,a2,a3,a4) {
    a1=+a1; a2=a2|0; a3=a3|0; a4=a4|0;
    jsCall(0,+a1,a2|0,a3|0,a4|0);
  }



  function jsCall_vdiii_1(a1,a2,a3,a4) {
    a1=+a1; a2=a2|0; a3=a3|0; a4=a4|0;
    jsCall(1,+a1,a2|0,a3|0,a4|0);
  }



  function dynCall_iii(index,a1,a2) {
    index = index|0;
    a1=a1|0; a2=a2|0;
    return FUNCTION_TABLE_iii[index&15](a1|0,a2|0)|0;
  }


  function jsCall_iii_0(a1,a2) {
    a1=a1|0; a2=a2|0;
    return jsCall(0,a1|0,a2|0)|0;
  }



  function jsCall_iii_1(a1,a2) {
    a1=a1|0; a2=a2|0;
    return jsCall(1,a1|0,a2|0)|0;
  }



  function dynCall_viii(index,a1,a2,a3) {
    index = index|0;
    a1=a1|0; a2=a2|0; a3=a3|0;
    FUNCTION_TABLE_viii[index&15](a1|0,a2|0,a3|0);
  }


  function jsCall_viii_0(a1,a2,a3) {
    a1=a1|0; a2=a2|0; a3=a3|0;
    jsCall(0,a1|0,a2|0,a3|0);
  }



  function jsCall_viii_1(a1,a2,a3) {
    a1=a1|0; a2=a2|0; a3=a3|0;
    jsCall(1,a1|0,a2|0,a3|0);
  }


function b0(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0; }
  function b1(p0,p1,p2,p3) { p0 = +p0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_vdiii(1); }
  function b2(p0,p1) { p0 = p0|0;p1 = p1|0; nullFunc_iii(2);return 0; }
  function b3(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_viii(3); }
  // EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_iiii = [b0,b0,jsCall_iiii_0,b0,jsCall_iiii_1,b0,_sn_write,b0];
  var FUNCTION_TABLE_vdiii = [b1,b1,jsCall_vdiii_0,b1,jsCall_vdiii_1,b1,b1,b1];
  var FUNCTION_TABLE_iii = [b2,b2,jsCall_iii_0,b2,jsCall_iii_1,b2,b2,b2,_ctx_intern_getTableForHash,b2,b2,b2,b2,b2,b2,b2];
  var FUNCTION_TABLE_viii = [b3,b3,jsCall_viii_0,b3,jsCall_viii_1,b3,b3,_ctx_intern_scheduleMessageForReceiver,b3,_cLoadbang_o97LG_sendMessage,_cReceive_6QtVp_sendMessage,_cVar_Xc2HH_sendMessage,_cBinop_CnKZZ_sendMessage,_cBinop_q7lmS_sendMessage,_cBinop_lC35Y_sendMessage,b3];

  return { _strlen: _strlen, _hv_heavy_new: _hv_heavy_new, _hv_setPrintHook: _hv_setPrintHook, _bitshift64Lshr: _bitshift64Lshr, _bitshift64Shl: _bitshift64Shl, _hv_msg_init: _hv_msg_init, _hv_msg_getByteSize: _hv_msg_getByteSize, _hv_vscheduleMessageForReceiver: _hv_vscheduleMessageForReceiver, _memset: _memset, _hv_scheduleMessageForReceiver: _hv_scheduleMessageForReceiver, _hv_msg_getFloat: _hv_msg_getFloat, _hv_heavy_process: _hv_heavy_process, _memcpy: _memcpy, _i64Subtract: _i64Subtract, _i64Add: _i64Add, _hv_getNumInputChannels: _hv_getNumInputChannels, _hv_heavy_process_inline: _hv_heavy_process_inline, _hv_getNumOutputChannels: _hv_getNumOutputChannels, _free: _free, _hv_heavy_free: _hv_heavy_free, _hv_msg_setFloat: _hv_msg_setFloat, _malloc: _malloc, _strncpy: _strncpy, _llvm_ctlz_i32: _llvm_ctlz_i32, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_vdiii: dynCall_vdiii, dynCall_iii: dynCall_iii, dynCall_viii: dynCall_viii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real__hv_heavy_new = asm["_hv_heavy_new"]; asm["_hv_heavy_new"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_new.apply(null, arguments);
};

var real__hv_setPrintHook = asm["_hv_setPrintHook"]; asm["_hv_setPrintHook"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_setPrintHook.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};

var real__hv_msg_init = asm["_hv_msg_init"]; asm["_hv_msg_init"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_init.apply(null, arguments);
};

var real__hv_msg_getByteSize = asm["_hv_msg_getByteSize"]; asm["_hv_msg_getByteSize"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_getByteSize.apply(null, arguments);
};

var real__hv_vscheduleMessageForReceiver = asm["_hv_vscheduleMessageForReceiver"]; asm["_hv_vscheduleMessageForReceiver"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_vscheduleMessageForReceiver.apply(null, arguments);
};

var real__hv_scheduleMessageForReceiver = asm["_hv_scheduleMessageForReceiver"]; asm["_hv_scheduleMessageForReceiver"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_scheduleMessageForReceiver.apply(null, arguments);
};

var real__hv_msg_getFloat = asm["_hv_msg_getFloat"]; asm["_hv_msg_getFloat"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_getFloat.apply(null, arguments);
};

var real__hv_heavy_process = asm["_hv_heavy_process"]; asm["_hv_heavy_process"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_process.apply(null, arguments);
};

var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__hv_getNumInputChannels = asm["_hv_getNumInputChannels"]; asm["_hv_getNumInputChannels"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_getNumInputChannels.apply(null, arguments);
};

var real__hv_heavy_process_inline = asm["_hv_heavy_process_inline"]; asm["_hv_heavy_process_inline"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_process_inline.apply(null, arguments);
};

var real__hv_getNumOutputChannels = asm["_hv_getNumOutputChannels"]; asm["_hv_getNumOutputChannels"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_getNumOutputChannels.apply(null, arguments);
};

var real__hv_heavy_free = asm["_hv_heavy_free"]; asm["_hv_heavy_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_free.apply(null, arguments);
};

var real__hv_msg_setFloat = asm["_hv_msg_setFloat"]; asm["_hv_msg_setFloat"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_setFloat.apply(null, arguments);
};

var real__strncpy = asm["_strncpy"]; asm["_strncpy"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strncpy.apply(null, arguments);
};

var real__llvm_ctlz_i32 = asm["_llvm_ctlz_i32"]; asm["_llvm_ctlz_i32"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__llvm_ctlz_i32.apply(null, arguments);
};

var real_runPostSets = asm["runPostSets"]; asm["runPostSets"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real_runPostSets.apply(null, arguments);
};
var _strlen = Module["_strlen"] = asm["_strlen"];
var _hv_heavy_new = Module["_hv_heavy_new"] = asm["_hv_heavy_new"];
var _hv_setPrintHook = Module["_hv_setPrintHook"] = asm["_hv_setPrintHook"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _hv_msg_init = Module["_hv_msg_init"] = asm["_hv_msg_init"];
var _hv_msg_getByteSize = Module["_hv_msg_getByteSize"] = asm["_hv_msg_getByteSize"];
var _hv_vscheduleMessageForReceiver = Module["_hv_vscheduleMessageForReceiver"] = asm["_hv_vscheduleMessageForReceiver"];
var _memset = Module["_memset"] = asm["_memset"];
var _hv_scheduleMessageForReceiver = Module["_hv_scheduleMessageForReceiver"] = asm["_hv_scheduleMessageForReceiver"];
var _hv_msg_getFloat = Module["_hv_msg_getFloat"] = asm["_hv_msg_getFloat"];
var _hv_heavy_process = Module["_hv_heavy_process"] = asm["_hv_heavy_process"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _hv_getNumInputChannels = Module["_hv_getNumInputChannels"] = asm["_hv_getNumInputChannels"];
var _hv_heavy_process_inline = Module["_hv_heavy_process_inline"] = asm["_hv_heavy_process_inline"];
var _hv_getNumOutputChannels = Module["_hv_getNumOutputChannels"] = asm["_hv_getNumOutputChannels"];
var _free = Module["_free"] = asm["_free"];
var _hv_heavy_free = Module["_hv_heavy_free"] = asm["_hv_heavy_free"];
var _hv_msg_setFloat = Module["_hv_msg_setFloat"] = asm["_hv_msg_setFloat"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _strncpy = Module["_strncpy"] = asm["_strncpy"];
var _llvm_ctlz_i32 = Module["_llvm_ctlz_i32"] = asm["_llvm_ctlz_i32"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vdiii = Module["dynCall_vdiii"] = asm["dynCall_vdiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so not exiting');
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



