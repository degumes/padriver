(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('most'), require('@most/multicast')) :
  typeof define === 'function' && define.amd ? define(['exports', 'most', '@most/multicast'], factory) :
  (factory((global.mostCreate = global.mostCreate || {}),global.most,global.mostMulticast));
}(this, (function (exports,most,_most_multicast) { 'use strict';

/** @license MIT License (c) copyright 2010-2016 original author or authors */

function defer (task) { return Promise.resolve(task).then(runTask); }

function runTask (task) {
  try {
    return task.run()
  } catch (e) {
    return task.error(e)
  }
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */

var PropagateAllTask = function PropagateAllTask (sink, time, events) {
  this.sink = sink
  this.time = time
  this.events = events
};

PropagateAllTask.prototype.run = function run () {
    var this$1 = this;

  var events = this.events
  var sink = this.sink
  var event

  for (var i = 0, l = events.length; i < l; ++i) {
    event = events[i]
    this$1.time = event.time
    sink.event(event.time, event.value)
  }

  events.length = 0
};

PropagateAllTask.prototype.error = function error (e) {
  this.sink.error(this.time, e)
};

/** @license MIT License (c) copyright 2010-2016 original author or authors */

var EndTask = function EndTask (t, x, sink) {
  this.time = t
  this.value = x
  this.sink = sink
};

EndTask.prototype.run = function run () {
  this.sink.end(this.time, this.value)
};

EndTask.prototype.error = function error (e) {
  this.sink.error(this.time, e)
};

/** @license MIT License (c) copyright 2010-2016 original author or authors */

var ErrorTask = function ErrorTask (t, e, sink) {
  this.time = t
  this.value = e
  this.sink = sink
};

ErrorTask.prototype.run = function run () {
  this.sink.error(this.time, this.value)
};

ErrorTask.prototype.error = function error (e) {
  throw e
};

/** @license MIT License (c) copyright 2010-2016 original author or authors */

var DeferredSink = function DeferredSink (sink) {
  this.sink = sink
  this.events = []
  this.active = true
};

DeferredSink.prototype.event = function event (t, x) {
  if (!this.active) {
    return
  }

  if (this.events.length === 0) {
    defer(new PropagateAllTask(this.sink, t, this.events))
  }

  this.events.push({ time: t, value: x })
};

DeferredSink.prototype.end = function end (t, x) {
  if (!this.active) {
    return
  }

  this._end(new EndTask(t, x, this.sink))
};

DeferredSink.prototype.error = function error (t, e) {
  this._end(new ErrorTask(t, e, this.sink))
};

DeferredSink.prototype._end = function _end (task) {
  this.active = false
  defer(task)
};

/** @license MIT License (c) copyright 2010-2016 original author or authors */

var CreateSubscriber = function CreateSubscriber (sink, scheduler, subscribe) {
  this.sink = sink
  this.scheduler = scheduler
  this._unsubscribe = this._init(subscribe)
};

CreateSubscriber.prototype._init = function _init (subscribe) {
    var this$1 = this;

  var add = function (x) { return this$1.sink.event(this$1.scheduler.now(), x); }
  var end = function (x) { return this$1.sink.end(this$1.scheduler.now(), x); }
  var error = function (e) { return this$1.sink.error(this$1.scheduler.now(), e); }

  try {
    return subscribe(add, end, error)
  } catch (e) {
    error(e)
  }
};

CreateSubscriber.prototype.dispose = function dispose () {
  if (typeof this._unsubscribe === 'function') {
    return this._unsubscribe.call(void 0)
  }
};

/** @license MIT License (c) copyright 2010-2016 original author or authors */

var Create = function Create (subscribe) {
  this._subscribe = subscribe
};

Create.prototype.run = function run (sink, scheduler) {
  return new CreateSubscriber(new DeferredSink(sink), scheduler, this._subscribe)
};

/** @license MIT License (c) copyright 2016 original author or authors */

function create (run) {
  return new most.Stream(new _most_multicast.MulticastSource(new Create(run)))
}

exports.create = create;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{"@most/multicast":2,"most":40}],2:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@most/prelude')) :
  typeof define === 'function' && define.amd ? define(['exports', '@most/prelude'], factory) :
  (factory((global.mostMulticast = global.mostMulticast || {}),global.mostPrelude));
}(this, (function (exports,_most_prelude) { 'use strict';

var MulticastDisposable = function MulticastDisposable (source, sink) {
  this.source = source
  this.sink = sink
  this.disposed = false
};

MulticastDisposable.prototype.dispose = function dispose () {
  if (this.disposed) {
    return
  }
  this.disposed = true
  var remaining = this.source.remove(this.sink)
  return remaining === 0 && this.source._dispose()
};

function tryEvent (t, x, sink) {
  try {
    sink.event(t, x)
  } catch (e) {
    sink.error(t, e)
  }
}

function tryEnd (t, x, sink) {
  try {
    sink.end(t, x)
  } catch (e) {
    sink.error(t, e)
  }
}

var dispose = function (disposable) { return disposable.dispose(); }

var emptyDisposable = {
  dispose: function dispose$1 () {}
}

var MulticastSource = function MulticastSource (source) {
  this.source = source
  this.sinks = []
  this._disposable = emptyDisposable
};

MulticastSource.prototype.run = function run (sink, scheduler) {
  var n = this.add(sink)
  if (n === 1) {
    this._disposable = this.source.run(this, scheduler)
  }
  return new MulticastDisposable(this, sink)
};

MulticastSource.prototype._dispose = function _dispose () {
  var disposable = this._disposable
  this._disposable = emptyDisposable
  return Promise.resolve(disposable).then(dispose)
};

MulticastSource.prototype.add = function add (sink) {
  this.sinks = _most_prelude.append(sink, this.sinks)
  return this.sinks.length
};

MulticastSource.prototype.remove = function remove$1 (sink) {
  var i = _most_prelude.findIndex(sink, this.sinks)
  // istanbul ignore next
  if (i >= 0) {
    this.sinks = _most_prelude.remove(i, this.sinks)
  }

  return this.sinks.length
};

MulticastSource.prototype.event = function event (time, value) {
  var s = this.sinks
  if (s.length === 1) {
    return s[0].event(time, value)
  }
  for (var i = 0; i < s.length; ++i) {
    tryEvent(time, value, s[i])
  }
};

MulticastSource.prototype.end = function end (time, value) {
  var s = this.sinks
  for (var i = 0; i < s.length; ++i) {
    tryEnd(time, value, s[i])
  }
};

MulticastSource.prototype.error = function error (time, err) {
  var s = this.sinks
  for (var i = 0; i < s.length; ++i) {
    s[i].error(time, err)
  }
};

function multicast (stream) {
  var source = stream.source
  return source instanceof MulticastSource
    ? stream
    : new stream.constructor(new MulticastSource(source))
}

exports['default'] = multicast;
exports.MulticastSource = MulticastSource;

Object.defineProperty(exports, '__esModule', { value: true });

})));


},{"@most/prelude":3}],3:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.mostPrelude = global.mostPrelude || {})));
}(this, (function (exports) { 'use strict';

/** @license MIT License (c) copyright 2010-2016 original author or authors */

// Non-mutating array operations

// cons :: a -> [a] -> [a]
// a with x prepended
function cons (x, a) {
  var l = a.length;
  var b = new Array(l + 1);
  b[0] = x;
  for (var i = 0; i < l; ++i) {
    b[i + 1] = a[i];
  }
  return b
}

// append :: a -> [a] -> [a]
// a with x appended
function append (x, a) {
  var l = a.length;
  var b = new Array(l + 1);
  for (var i = 0; i < l; ++i) {
    b[i] = a[i];
  }

  b[l] = x;
  return b
}

// drop :: Int -> [a] -> [a]
// drop first n elements
function drop (n, a) { // eslint-disable-line complexity
  if (n < 0) {
    throw new TypeError('n must be >= 0')
  }

  var l = a.length;
  if (n === 0 || l === 0) {
    return a
  }

  if (n >= l) {
    return []
  }

  return unsafeDrop(n, a, l - n)
}

// unsafeDrop :: Int -> [a] -> Int -> [a]
// Internal helper for drop
function unsafeDrop (n, a, l) {
  var b = new Array(l);
  for (var i = 0; i < l; ++i) {
    b[i] = a[n + i];
  }
  return b
}

// tail :: [a] -> [a]
// drop head element
function tail (a) {
  return drop(1, a)
}

// copy :: [a] -> [a]
// duplicate a (shallow duplication)
function copy (a) {
  var l = a.length;
  var b = new Array(l);
  for (var i = 0; i < l; ++i) {
    b[i] = a[i];
  }
  return b
}

// map :: (a -> b) -> [a] -> [b]
// transform each element with f
function map (f, a) {
  var l = a.length;
  var b = new Array(l);
  for (var i = 0; i < l; ++i) {
    b[i] = f(a[i]);
  }
  return b
}

// reduce :: (a -> b -> a) -> a -> [b] -> a
// accumulate via left-fold
function reduce (f, z, a) {
  var r = z;
  for (var i = 0, l = a.length; i < l; ++i) {
    r = f(r, a[i], i);
  }
  return r
}

// replace :: a -> Int -> [a]
// replace element at index
function replace (x, i, a) { // eslint-disable-line complexity
  if (i < 0) {
    throw new TypeError('i must be >= 0')
  }

  var l = a.length;
  var b = new Array(l);
  for (var j = 0; j < l; ++j) {
    b[j] = i === j ? x : a[j];
  }
  return b
}

// remove :: Int -> [a] -> [a]
// remove element at index
function remove (i, a) {  // eslint-disable-line complexity
  if (i < 0) {
    throw new TypeError('i must be >= 0')
  }

  var l = a.length;
  if (l === 0 || i >= l) { // exit early if index beyond end of array
    return a
  }

  if (l === 1) { // exit early if index in bounds and length === 1
    return []
  }

  return unsafeRemove(i, a, l - 1)
}

// unsafeRemove :: Int -> [a] -> Int -> [a]
// Internal helper to remove element at index
function unsafeRemove (i, a, l) {
  var b = new Array(l);
  var j;
  for (j = 0; j < i; ++j) {
    b[j] = a[j];
  }
  for (j = i; j < l; ++j) {
    b[j] = a[j + 1];
  }

  return b
}

// removeAll :: (a -> boolean) -> [a] -> [a]
// remove all elements matching a predicate
function removeAll (f, a) {
  var l = a.length;
  var b = new Array(l);
  var j = 0;
  for (var x = (void 0), i = 0; i < l; ++i) {
    x = a[i];
    if (!f(x)) {
      b[j] = x;
      ++j;
    }
  }

  b.length = j;
  return b
}

// findIndex :: a -> [a] -> Int
// find index of x in a, from the left
function findIndex (x, a) {
  for (var i = 0, l = a.length; i < l; ++i) {
    if (x === a[i]) {
      return i
    }
  }
  return -1
}

// isArrayLike :: * -> boolean
// Return true iff x is array-like
function isArrayLike (x) {
  return x != null && typeof x.length === 'number' && typeof x !== 'function'
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */

// id :: a -> a
var id = function (x) { return x; };

// compose :: (b -> c) -> (a -> b) -> (a -> c)
var compose = function (f, g) { return function (x) { return f(g(x)); }; };

// apply :: (a -> b) -> a -> b
var apply = function (f, x) { return f(x); };

// curry2 :: ((a, b) -> c) -> (a -> b -> c)
function curry2 (f) {
  function curried (a, b) {
    switch (arguments.length) {
      case 0: return curried
      case 1: return function (b) { return f(a, b); }
      default: return f(a, b)
    }
  }
  return curried
}

// curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
function curry3 (f) {
  function curried (a, b, c) { // eslint-disable-line complexity
    switch (arguments.length) {
      case 0: return curried
      case 1: return curry2(function (b, c) { return f(a, b, c); })
      case 2: return function (c) { return f(a, b, c); }
      default:return f(a, b, c)
    }
  }
  return curried
}

// curry4 :: ((a, b, c, d) -> e) -> (a -> b -> c -> d -> e)
function curry4 (f) {
  function curried (a, b, c, d) { // eslint-disable-line complexity
    switch (arguments.length) {
      case 0: return curried
      case 1: return curry3(function (b, c, d) { return f(a, b, c, d); })
      case 2: return curry2(function (c, d) { return f(a, b, c, d); })
      case 3: return function (d) { return f(a, b, c, d); }
      default:return f(a, b, c, d)
    }
  }
  return curried
}

/** @license MIT License (c) copyright 2016 original author or authors */

exports.cons = cons;
exports.append = append;
exports.drop = drop;
exports.tail = tail;
exports.copy = copy;
exports.map = map;
exports.reduce = reduce;
exports.replace = replace;
exports.remove = remove;
exports.removeAll = removeAll;
exports.findIndex = findIndex;
exports.isArrayLike = isArrayLike;
exports.id = id;
exports.compose = compose;
exports.apply = apply;
exports.curry2 = curry2;
exports.curry3 = curry3;
exports.curry4 = curry4;

Object.defineProperty(exports, '__esModule', { value: true });

})));


},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = LinkedList;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Doubly linked list
 * @constructor
 */
function LinkedList() {
  this.head = null;
  this.length = 0;
}

/**
 * Add a node to the end of the list
 * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to add
 */
LinkedList.prototype.add = function (x) {
  if (this.head !== null) {
    this.head.prev = x;
    x.next = this.head;
  }
  this.head = x;
  ++this.length;
};

/**
 * Remove the provided node from the list
 * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to remove
 */
LinkedList.prototype.remove = function (x) {
  // eslint-disable-line  complexity
  --this.length;
  if (x === this.head) {
    this.head = this.head.next;
  }
  if (x.next !== null) {
    x.next.prev = x.prev;
    x.next = null;
  }
  if (x.prev !== null) {
    x.prev.next = x.next;
    x.prev = null;
  }
};

/**
 * @returns {boolean} true iff there are no nodes in the list
 */
LinkedList.prototype.isEmpty = function () {
  return this.length === 0;
};

/**
 * Dispose all nodes
 * @returns {Promise} promise that fulfills when all nodes have been disposed,
 *  or rejects if an error occurs while disposing
 */
LinkedList.prototype.dispose = function () {
  if (this.isEmpty()) {
    return Promise.resolve();
  }

  var promises = [];
  var x = this.head;
  this.head = null;
  this.length = 0;

  while (x !== null) {
    promises.push(x.dispose());
    x = x.next;
  }

  return Promise.all(promises);
};
},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPromise = isPromise;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function isPromise(p) {
  return p !== null && typeof p === 'object' && typeof p.then === 'function';
}
},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Queue;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

// Based on https://github.com/petkaantonov/deque

function Queue(capPow2) {
  this._capacity = capPow2 || 32;
  this._length = 0;
  this._head = 0;
}

Queue.prototype.push = function (x) {
  var len = this._length;
  this._checkCapacity(len + 1);

  var i = this._head + len & this._capacity - 1;
  this[i] = x;
  this._length = len + 1;
};

Queue.prototype.shift = function () {
  var head = this._head;
  var x = this[head];

  this[head] = void 0;
  this._head = head + 1 & this._capacity - 1;
  this._length--;
  return x;
};

Queue.prototype.isEmpty = function () {
  return this._length === 0;
};

Queue.prototype.length = function () {
  return this._length;
};

Queue.prototype._checkCapacity = function (size) {
  if (this._capacity < size) {
    this._ensureCapacity(this._capacity << 1);
  }
};

Queue.prototype._ensureCapacity = function (capacity) {
  var oldCapacity = this._capacity;
  this._capacity = capacity;

  var last = this._head + this._length;

  if (last > oldCapacity) {
    copy(this, 0, this, oldCapacity, last & oldCapacity - 1);
  }
};

function copy(src, srcIndex, dst, dstIndex, len) {
  for (var j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = void 0;
  }
}
},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Stream;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Stream(source) {
  this.source = source;
}

Stream.prototype.run = function (sink, scheduler) {
  return this.source.run(sink, scheduler);
};
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scan = scan;
exports.reduce = reduce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _runSource = require('../runSource');

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream containing successive reduce results of applying f to
 * the previous reduce result and the current stream item.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial initial value
 * @param {Stream} stream stream to scan
 * @returns {Stream} new stream containing successive reduce results
 */
function scan(f, initial, stream) {
  return new _Stream2.default(new Scan(f, initial, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Scan(f, z, source) {
  this.source = source;
  this.f = f;
  this.value = z;
}

Scan.prototype.run = function (sink, scheduler) {
  var d1 = scheduler.asap(_PropagateTask2.default.event(this.value, sink));
  var d2 = this.source.run(new ScanSink(this.f, this.value, sink), scheduler);
  return dispose.all([d1, d2]);
};

function ScanSink(f, z, sink) {
  this.f = f;
  this.value = z;
  this.sink = sink;
}

ScanSink.prototype.event = function (t, x) {
  var f = this.f;
  this.value = f(this.value, x);
  this.sink.event(t, this.value);
};

ScanSink.prototype.error = _Pipe2.default.prototype.error;
ScanSink.prototype.end = _Pipe2.default.prototype.end;

/**
* Reduce a stream to produce a single result.  Note that reducing an infinite
* stream will return a Promise that never fulfills, but that may reject if an error
* occurs.
* @param {function(result:*, x:*):*} f reducer function
* @param {*} initial initial value
* @param {Stream} stream to reduce
* @returns {Promise} promise for the file result of the reduce
*/
function reduce(f, initial, stream) {
  return (0, _runSource.withDefaultScheduler)(new Reduce(f, initial, stream.source));
}

function Reduce(f, z, source) {
  this.source = source;
  this.f = f;
  this.value = z;
}

Reduce.prototype.run = function (sink, scheduler) {
  return this.source.run(new ReduceSink(this.f, this.value, sink), scheduler);
};

function ReduceSink(f, z, sink) {
  this.f = f;
  this.value = z;
  this.sink = sink;
}

ReduceSink.prototype.event = function (t, x) {
  var f = this.f;
  this.value = f(this.value, x);
  this.sink.event(t, this.value);
};

ReduceSink.prototype.error = _Pipe2.default.prototype.error;

ReduceSink.prototype.end = function (t) {
  this.sink.end(t, this.value);
};
},{"../Stream":7,"../disposable/dispose":35,"../runSource":46,"../scheduler/PropagateTask":48,"../sink/Pipe":55}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ap = ap;

var _combine = require('./combine');

var _prelude = require('@most/prelude');

/**
 * Assume fs is a stream containing functions, and apply the latest function
 * in fs to the latest value in xs.
 * fs:         --f---------g--------h------>
 * xs:         -a-------b-------c-------d-->
 * ap(fs, xs): --fa-----fb-gb---gc--hc--hd->
 * @param {Stream} fs stream of functions to apply to the latest x
 * @param {Stream} xs stream of values to which to apply all the latest f
 * @returns {Stream} stream containing all the applications of fs to xs
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ap(fs, xs) {
  return (0, _combine.combine)(_prelude.apply, fs, xs);
}
},{"./combine":11,"@most/prelude":3}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cons = cons;
exports.concat = concat;

var _core = require('../source/core');

var _continueWith = require('./continueWith');

/**
 * @param {*} x value to prepend
 * @param {Stream} stream
 * @returns {Stream} new stream with x prepended
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function cons(x, stream) {
  return concat((0, _core.of)(x), stream);
}

/**
* @param {Stream} left
* @param {Stream} right
* @returns {Stream} new stream containing all events in left followed by all
*  events in right.  This *timeshifts* right to the end of left.
*/
function concat(left, right) {
  return (0, _continueWith.continueWith)(function () {
    return right;
  }, left);
}
},{"../source/core":59,"./continueWith":13}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combine = combine;
exports.combineArray = combineArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _transform = require('./transform');

var transform = _interopRequireWildcard(_transform);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var map = base.map;
var tail = base.tail;

/**
 * Combine latest events from all input streams
 * @param {function(...events):*} f function to combine most recent events
 * @returns {Stream} stream containing the result of applying f to the most recent
 *  event of each input stream, whenever a new event arrives on any stream.
 */
function combine(f /*, ...streams */) {
  return combineArray(f, tail(arguments));
}

/**
* Combine latest events from all input streams
* @param {function(...events):*} f function to combine most recent events
* @param {[Stream]} streams most recent events
* @returns {Stream} stream containing the result of applying f to the most recent
*  event of each input stream, whenever a new event arrives on any stream.
*/
function combineArray(f, streams) {
  var l = streams.length;
  return l === 0 ? core.empty() : l === 1 ? transform.map(f, streams[0]) : new _Stream2.default(combineSources(f, streams));
}

function combineSources(f, streams) {
  return new Combine(f, map(getSource, streams));
}

function getSource(stream) {
  return stream.source;
}

function Combine(f, sources) {
  this.f = f;
  this.sources = sources;
}

Combine.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);

  var mergeSink = new CombineSink(disposables, sinks, sink, this.f);

  for (var indexSink, i = 0; i < l; ++i) {
    indexSink = sinks[i] = new _IndexSink2.default(i, mergeSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function CombineSink(disposables, sinks, sink, f) {
  var this$1 = this;

  this.sink = sink;
  this.disposables = disposables;
  this.sinks = sinks;
  this.f = f;

  var l = sinks.length;
  this.awaiting = l;
  this.values = new Array(l);
  this.hasValue = new Array(l);
  for (var i = 0; i < l; ++i) {
    this$1.hasValue[i] = false;
  }

  this.activeCount = sinks.length;
}

CombineSink.prototype.error = _Pipe2.default.prototype.error;

CombineSink.prototype.event = function (t, indexedValue) {
  var i = indexedValue.index;
  var awaiting = this._updateReady(i);

  this.values[i] = indexedValue.value;
  if (awaiting === 0) {
    this.sink.event(t, (0, _invoke2.default)(this.f, this.values));
  }
};

CombineSink.prototype._updateReady = function (index) {
  if (this.awaiting > 0) {
    if (!this.hasValue[index]) {
      this.hasValue[index] = true;
      this.awaiting -= 1;
    }
  }
  return this.awaiting;
};

CombineSink.prototype.end = function (t, indexedValue) {
  dispose.tryDispose(t, this.disposables[indexedValue.index], this.sink);
  if (--this.activeCount === 0) {
    this.sink.end(t, indexedValue.value);
  }
};
},{"../Stream":7,"../disposable/dispose":35,"../invoke":41,"../sink/IndexSink":54,"../sink/Pipe":55,"../source/core":59,"./transform":31,"@most/prelude":3}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatMap = concatMap;

var _mergeConcurrently = require('./mergeConcurrently');

/**
 * Map each value in stream to a new stream, and concatenate them all
 * stream:              -a---b---cX
 * f(a):                 1-1-1-1X
 * f(b):                        -2-2-2-2X
 * f(c):                                -3-3-3-3X
 * stream.concatMap(f): -1-1-1-1-2-2-2-2-3-3-3-3X
 * @param {function(x:*):Stream} f function to map each value to a stream
 * @param {Stream} stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */
function concatMap(f, stream) {
  return (0, _mergeConcurrently.mergeMapConcurrently)(f, 1, stream);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"./mergeConcurrently":21}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.continueWith = continueWith;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function continueWith(f, stream) {
  return new _Stream2.default(new ContinueWith(f, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ContinueWith(f, source) {
  this.f = f;
  this.source = source;
}

ContinueWith.prototype.run = function (sink, scheduler) {
  return new ContinueWithSink(this.f, this.source, sink, scheduler);
};

function ContinueWithSink(f, source, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;
  this.disposable = dispose.once(source.run(this, scheduler));
}

ContinueWithSink.prototype.error = _Pipe2.default.prototype.error;

ContinueWithSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.sink.event(t, x);
};

ContinueWithSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }

  dispose.tryDispose(t, this.disposable, this.sink);
  this._startNext(t, x, this.sink);
};

ContinueWithSink.prototype._startNext = function (t, x, sink) {
  try {
    this.disposable = this._continue(this.f, x, sink);
  } catch (e) {
    sink.error(t, e);
  }
};

ContinueWithSink.prototype._continue = function (f, x, sink) {
  return f(x).source.run(sink, this.scheduler);
};

ContinueWithSink.prototype.dispose = function () {
  this.active = false;
  return this.disposable.dispose();
};
},{"../Stream":7,"../disposable/dispose":35,"../sink/Pipe":55}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.delay = delay;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {Number} delayTime milliseconds to delay each item
 * @param {Stream} stream
 * @returns {Stream} new stream containing the same items, but delayed by ms
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function delay(delayTime, stream) {
  return delayTime <= 0 ? stream : new _Stream2.default(new Delay(delayTime, stream.source));
}

function Delay(dt, source) {
  this.dt = dt;
  this.source = source;
}

Delay.prototype.run = function (sink, scheduler) {
  var delaySink = new DelaySink(this.dt, sink, scheduler);
  return dispose.all([delaySink, this.source.run(delaySink, scheduler)]);
};

function DelaySink(dt, sink, scheduler) {
  this.dt = dt;
  this.sink = sink;
  this.scheduler = scheduler;
}

DelaySink.prototype.dispose = function () {
  var self = this;
  this.scheduler.cancelAll(function (task) {
    return task.sink === self.sink;
  });
};

DelaySink.prototype.event = function (t, x) {
  this.scheduler.delay(this.dt, _PropagateTask2.default.event(x, this.sink));
};

DelaySink.prototype.end = function (t, x) {
  this.scheduler.delay(this.dt, _PropagateTask2.default.end(x, this.sink));
};

DelaySink.prototype.error = _Pipe2.default.prototype.error;
},{"../Stream":7,"../disposable/dispose":35,"../scheduler/PropagateTask":48,"../sink/Pipe":55}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMapError = undefined;
exports.recoverWith = recoverWith;
exports.throwError = throwError;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _SafeSink = require('../sink/SafeSink');

var _SafeSink2 = _interopRequireDefault(_SafeSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('../source/tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * If stream encounters an error, recover and continue with items from stream
 * returned by f.
 * @param {function(error:*):Stream} f function which returns a new stream
 * @param {Stream} stream
 * @returns {Stream} new stream which will recover from an error by calling f
 */
function recoverWith(f, stream) {
  return new _Stream2.default(new RecoverWith(f, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var flatMapError = exports.flatMapError = recoverWith;

/**
 * Create a stream containing only an error
 * @param {*} e error value, preferably an Error or Error subtype
 * @returns {Stream} new stream containing only an error
 */
function throwError(e) {
  return new _Stream2.default(new ErrorSource(e));
}

function ErrorSource(e) {
  this.value = e;
}

ErrorSource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runError, this.value, sink));
};

function runError(t, e, sink) {
  sink.error(t, e);
}

function RecoverWith(f, source) {
  this.f = f;
  this.source = source;
}

RecoverWith.prototype.run = function (sink, scheduler) {
  return new RecoverWithSink(this.f, this.source, sink, scheduler);
};

function RecoverWithSink(f, source, sink, scheduler) {
  this.f = f;
  this.sink = new _SafeSink2.default(sink);
  this.scheduler = scheduler;
  this.disposable = source.run(this, scheduler);
}

RecoverWithSink.prototype.event = function (t, x) {
  tryEvent.tryEvent(t, x, this.sink);
};

RecoverWithSink.prototype.end = function (t, x) {
  tryEvent.tryEnd(t, x, this.sink);
};

RecoverWithSink.prototype.error = function (t, e) {
  var nextSink = this.sink.disable();

  dispose.tryDispose(t, this.disposable, this.sink);
  this._startNext(t, e, nextSink);
};

RecoverWithSink.prototype._startNext = function (t, x, sink) {
  try {
    this.disposable = this._continue(this.f, x, sink);
  } catch (e) {
    sink.error(t, e);
  }
};

RecoverWithSink.prototype._continue = function (f, x, sink) {
  var stream = f(x);
  return stream.source.run(sink, this.scheduler);
};

RecoverWithSink.prototype.dispose = function () {
  return this.disposable.dispose();
};
},{"../Stream":7,"../disposable/dispose":35,"../scheduler/PropagateTask":48,"../sink/SafeSink":56,"../source/tryEvent":67}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filter = filter;
exports.skipRepeats = skipRepeats;
exports.skipRepeatsWith = skipRepeatsWith;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Filter = require('../fusion/Filter');

var _Filter2 = _interopRequireDefault(_Filter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Retain only items matching a predicate
 * @param {function(x:*):boolean} p filtering predicate called for each item
 * @param {Stream} stream stream to filter
 * @returns {Stream} stream containing only items for which predicate returns truthy
 */
function filter(p, stream) {
  return new _Stream2.default(_Filter2.default.create(p, stream.source));
}

/**
 * Skip repeated events, using === to detect duplicates
 * @param {Stream} stream stream from which to omit repeated events
 * @returns {Stream} stream without repeated events
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function skipRepeats(stream) {
  return skipRepeatsWith(same, stream);
}

/**
 * Skip repeated events using the provided equals function to detect duplicates
 * @param {function(a:*, b:*):boolean} equals optional function to compare items
 * @param {Stream} stream stream from which to omit repeated events
 * @returns {Stream} stream without repeated events
 */
function skipRepeatsWith(equals, stream) {
  return new _Stream2.default(new SkipRepeats(equals, stream.source));
}

function SkipRepeats(equals, source) {
  this.equals = equals;
  this.source = source;
}

SkipRepeats.prototype.run = function (sink, scheduler) {
  return this.source.run(new SkipRepeatsSink(this.equals, sink), scheduler);
};

function SkipRepeatsSink(equals, sink) {
  this.equals = equals;
  this.sink = sink;
  this.value = void 0;
  this.init = true;
}

SkipRepeatsSink.prototype.end = _Pipe2.default.prototype.end;
SkipRepeatsSink.prototype.error = _Pipe2.default.prototype.error;

SkipRepeatsSink.prototype.event = function (t, x) {
  if (this.init) {
    this.init = false;
    this.value = x;
    this.sink.event(t, x);
  } else if (!this.equals(this.value, x)) {
    this.value = x;
    this.sink.event(t, x);
  }
};

function same(a, b) {
  return a === b;
}
},{"../Stream":7,"../fusion/Filter":37,"../sink/Pipe":55}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMap = flatMap;
exports.join = join;

var _mergeConcurrently = require('./mergeConcurrently');

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param {function(x:*):Stream} f chaining function, must return a Stream
 * @param {Stream} stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */
function flatMap(f, stream) {
  return (0, _mergeConcurrently.mergeMapConcurrently)(f, Infinity, stream);
}

/**
 * Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer. Event arrival times are preserved.
 * @param {Stream<Stream<X>>} stream stream of streams
 * @returns {Stream<X>} new stream containing all events of all inner streams
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function join(stream) {
  return (0, _mergeConcurrently.mergeConcurrently)(Infinity, stream);
}
},{"./mergeConcurrently":21}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throttle = throttle;
exports.debounce = debounce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Limit the rate of events by suppressing events that occur too often
 * @param {Number} period time to suppress events
 * @param {Stream} stream
 * @returns {Stream}
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function throttle(period, stream) {
  return new _Stream2.default(throttleSource(period, stream.source));
}

function throttleSource(period, source) {
  return source instanceof _Map2.default ? commuteMapThrottle(period, source) : source instanceof Throttle ? fuseThrottle(period, source) : new Throttle(period, source);
}

function commuteMapThrottle(period, source) {
  return _Map2.default.create(source.f, throttleSource(period, source.source));
}

function fuseThrottle(period, source) {
  return new Throttle(Math.max(period, source.period), source.source);
}

function Throttle(period, source) {
  this.period = period;
  this.source = source;
}

Throttle.prototype.run = function (sink, scheduler) {
  return this.source.run(new ThrottleSink(this.period, sink), scheduler);
};

function ThrottleSink(period, sink) {
  this.time = 0;
  this.period = period;
  this.sink = sink;
}

ThrottleSink.prototype.event = function (t, x) {
  if (t >= this.time) {
    this.time = t + this.period;
    this.sink.event(t, x);
  }
};

ThrottleSink.prototype.end = _Pipe2.default.prototype.end;

ThrottleSink.prototype.error = _Pipe2.default.prototype.error;

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * @param {Number} period events occuring more frequently than this
 *  will be suppressed
 * @param {Stream} stream stream to debounce
 * @returns {Stream} new debounced stream
 */
function debounce(period, stream) {
  return new _Stream2.default(new Debounce(period, stream.source));
}

function Debounce(dt, source) {
  this.dt = dt;
  this.source = source;
}

Debounce.prototype.run = function (sink, scheduler) {
  return new DebounceSink(this.dt, this.source, sink, scheduler);
};

function DebounceSink(dt, source, sink, scheduler) {
  this.dt = dt;
  this.sink = sink;
  this.scheduler = scheduler;
  this.value = void 0;
  this.timer = null;
  this.disposable = source.run(this, scheduler);
}

DebounceSink.prototype.event = function (t, x) {
  this._clearTimer();
  this.value = x;
  this.timer = this.scheduler.delay(this.dt, _PropagateTask2.default.event(x, this.sink));
};

DebounceSink.prototype.end = function (t, x) {
  if (this._clearTimer()) {
    this.sink.event(t, this.value);
    this.value = void 0;
  }
  this.sink.end(t, x);
};

DebounceSink.prototype.error = function (t, x) {
  this._clearTimer();
  this.sink.error(t, x);
};

DebounceSink.prototype.dispose = function () {
  this._clearTimer();
  return this.disposable.dispose();
};

DebounceSink.prototype._clearTimer = function () {
  if (this.timer === null) {
    return false;
  }
  this.timer.dispose();
  this.timer = null;
  return true;
};
},{"../Stream":7,"../fusion/Map":39,"../scheduler/PropagateTask":48,"../sink/Pipe":55}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loop = loop;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Generalized feedback loop. Call a stepper function for each event. The stepper
 * will be called with 2 params: the current seed and the an event value.  It must
 * return a new { seed, value } pair. The `seed` will be fed back into the next
 * invocation of stepper, and the `value` will be propagated as the event value.
 * @param {function(seed:*, value:*):{seed:*, value:*}} stepper loop step function
 * @param {*} seed initial seed value passed to first stepper call
 * @param {Stream} stream event stream
 * @returns {Stream} new stream whose values are the `value` field of the objects
 * returned by the stepper
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function loop(stepper, seed, stream) {
  return new _Stream2.default(new Loop(stepper, seed, stream.source));
}

function Loop(stepper, seed, source) {
  this.step = stepper;
  this.seed = seed;
  this.source = source;
}

Loop.prototype.run = function (sink, scheduler) {
  return this.source.run(new LoopSink(this.step, this.seed, sink), scheduler);
};

function LoopSink(stepper, seed, sink) {
  this.step = stepper;
  this.seed = seed;
  this.sink = sink;
}

LoopSink.prototype.error = _Pipe2.default.prototype.error;

LoopSink.prototype.event = function (t, x) {
  var result = this.step(this.seed, x);
  this.seed = result.seed;
  this.sink.event(t, result.value);
};

LoopSink.prototype.end = function (t) {
  this.sink.end(t, this.seed);
};
},{"../Stream":7,"../sink/Pipe":55}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
exports.mergeArray = mergeArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _core = require('../source/core');

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var copy = base.copy;
var reduce = base.reduce;

/**
 * @returns {Stream} stream containing events from all streams in the argument
 * list in time order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */
function merge() /* ...streams*/{
  return mergeArray(copy(arguments));
}

/**
 * @param {Array} streams array of stream to merge
 * @returns {Stream} stream containing events from all input observables
 * in time order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */
function mergeArray(streams) {
  var l = streams.length;
  return l === 0 ? (0, _core.empty)() : l === 1 ? streams[0] : new _Stream2.default(mergeSources(streams));
}

/**
 * This implements fusion/flattening for merge.  It will
 * fuse adjacent merge operations.  For example:
 * - a.merge(b).merge(c) effectively becomes merge(a, b, c)
 * - merge(a, merge(b, c)) effectively becomes merge(a, b, c)
 * It does this by concatenating the sources arrays of
 * any nested Merge sources, in effect "flattening" nested
 * merge operations into a single merge.
 */
function mergeSources(streams) {
  return new Merge(reduce(appendSources, [], streams));
}

function appendSources(sources, stream) {
  var source = stream.source;
  return source instanceof Merge ? sources.concat(source.sources) : sources.concat(source);
}

function Merge(sources) {
  this.sources = sources;
}

Merge.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);

  var mergeSink = new MergeSink(disposables, sinks, sink);

  for (var indexSink, i = 0; i < l; ++i) {
    indexSink = sinks[i] = new _IndexSink2.default(i, mergeSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function MergeSink(disposables, sinks, sink) {
  this.sink = sink;
  this.disposables = disposables;
  this.activeCount = sinks.length;
}

MergeSink.prototype.error = _Pipe2.default.prototype.error;

MergeSink.prototype.event = function (t, indexValue) {
  this.sink.event(t, indexValue.value);
};

MergeSink.prototype.end = function (t, indexedValue) {
  dispose.tryDispose(t, this.disposables[indexedValue.index], this.sink);
  if (--this.activeCount === 0) {
    this.sink.end(t, indexedValue.value);
  }
};
},{"../Stream":7,"../disposable/dispose":35,"../sink/IndexSink":54,"../sink/Pipe":55,"../source/core":59,"@most/prelude":3}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeConcurrently = mergeConcurrently;
exports.mergeMapConcurrently = mergeMapConcurrently;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _LinkedList = require('../LinkedList');

var _LinkedList2 = _interopRequireDefault(_LinkedList);

var _prelude = require('@most/prelude');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function mergeConcurrently(concurrency, stream) {
  return mergeMapConcurrently(_prelude.id, concurrency, stream);
}

function mergeMapConcurrently(f, concurrency, stream) {
  return new _Stream2.default(new MergeConcurrently(f, concurrency, stream.source));
}

function MergeConcurrently(f, concurrency, source) {
  this.f = f;
  this.concurrency = concurrency;
  this.source = source;
}

MergeConcurrently.prototype.run = function (sink, scheduler) {
  return new Outer(this.f, this.concurrency, this.source, sink, scheduler);
};

function Outer(f, concurrency, source, sink, scheduler) {
  this.f = f;
  this.concurrency = concurrency;
  this.sink = sink;
  this.scheduler = scheduler;
  this.pending = [];
  this.current = new _LinkedList2.default();
  this.disposable = dispose.once(source.run(this, scheduler));
  this.active = true;
}

Outer.prototype.event = function (t, x) {
  this._addInner(t, x);
};

Outer.prototype._addInner = function (t, x) {
  if (this.current.length < this.concurrency) {
    this._startInner(t, x);
  } else {
    this.pending.push(x);
  }
};

Outer.prototype._startInner = function (t, x) {
  try {
    this._initInner(t, x);
  } catch (e) {
    this.error(t, e);
  }
};

Outer.prototype._initInner = function (t, x) {
  var innerSink = new Inner(t, this, this.sink);
  innerSink.disposable = mapAndRun(this.f, x, innerSink, this.scheduler);
  this.current.add(innerSink);
};

function mapAndRun(f, x, sink, scheduler) {
  return f(x).source.run(sink, scheduler);
}

Outer.prototype.end = function (t, x) {
  this.active = false;
  dispose.tryDispose(t, this.disposable, this.sink);
  this._checkEnd(t, x);
};

Outer.prototype.error = function (t, e) {
  this.active = false;
  this.sink.error(t, e);
};

Outer.prototype.dispose = function () {
  this.active = false;
  this.pending.length = 0;
  return Promise.all([this.disposable.dispose(), this.current.dispose()]);
};

Outer.prototype._endInner = function (t, x, inner) {
  this.current.remove(inner);
  dispose.tryDispose(t, inner, this);

  if (this.pending.length === 0) {
    this._checkEnd(t, x);
  } else {
    this._startInner(t, this.pending.shift());
  }
};

Outer.prototype._checkEnd = function (t, x) {
  if (!this.active && this.current.isEmpty()) {
    this.sink.end(t, x);
  }
};

function Inner(time, outer, sink) {
  this.prev = this.next = null;
  this.time = time;
  this.outer = outer;
  this.sink = sink;
  this.disposable = void 0;
}

Inner.prototype.event = function (t, x) {
  this.sink.event(Math.max(t, this.time), x);
};

Inner.prototype.end = function (t, x) {
  this.outer._endInner(Math.max(t, this.time), x, this);
};

Inner.prototype.error = function (t, e) {
  this.outer.error(Math.max(t, this.time), e);
};

Inner.prototype.dispose = function () {
  return this.disposable.dispose();
};
},{"../LinkedList":4,"../Stream":7,"../disposable/dispose":35,"@most/prelude":3}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observe = observe;
exports.drain = drain;

var _runSource = require('../runSource');

var _transform = require('./transform');

/**
 * Observe all the event values in the stream in time order. The
 * provided function `f` will be called for each event value
 * @param {function(x:T):*} f function to call with each event value
 * @param {Stream<T>} stream stream to observe
 * @return {Promise} promise that fulfills after the stream ends without
 *  an error, or rejects if the stream ends with an error.
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function observe(f, stream) {
  return drain((0, _transform.tap)(f, stream));
}

/**
 * "Run" a stream by creating demand and consuming all events
 * @param {Stream<T>} stream stream to drain
 * @return {Promise} promise that fulfills after the stream ends without
 *  an error, or rejects if the stream ends with an error.
 */
function drain(stream) {
  return (0, _runSource.withDefaultScheduler)(stream.source);
}
},{"../runSource":46,"./transform":31}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromPromise = fromPromise;
exports.awaitPromises = awaitPromises;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

var _core = require('../source/core');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream containing only the promise's fulfillment
 * value at the time it fulfills.
 * @param {Promise<T>} p promise
 * @return {Stream<T>} stream containing promise's fulfillment value.
 *  If the promise rejects, the stream will error
 */
function fromPromise(p) {
  return awaitPromises((0, _core.of)(p));
}

/**
 * Turn a Stream<Promise<T>> into Stream<T> by awaiting each promise.
 * Event order is preserved.
 * @param {Stream<Promise<T>>} stream
 * @return {Stream<T>} stream of fulfillment values.  The stream will
 * error if any promise rejects.
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function awaitPromises(stream) {
  return new _Stream2.default(new Await(stream.source));
}

function Await(source) {
  this.source = source;
}

Await.prototype.run = function (sink, scheduler) {
  return this.source.run(new AwaitSink(sink, scheduler), scheduler);
};

function AwaitSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
  this.queue = Promise.resolve();
  var self = this;

  // Pre-create closures, to avoid creating them per event
  this._eventBound = function (x) {
    self.sink.event(self.scheduler.now(), x);
  };

  this._endBound = function (x) {
    self.sink.end(self.scheduler.now(), x);
  };

  this._errorBound = function (e) {
    self.sink.error(self.scheduler.now(), e);
  };
}

AwaitSink.prototype.event = function (t, promise) {
  var self = this;
  this.queue = this.queue.then(function () {
    return self._event(promise);
  }).catch(this._errorBound);
};

AwaitSink.prototype.end = function (t, x) {
  var self = this;
  this.queue = this.queue.then(function () {
    return self._end(x);
  }).catch(this._errorBound);
};

AwaitSink.prototype.error = function (t, e) {
  var self = this;
  // Don't resolve error values, propagate directly
  this.queue = this.queue.then(function () {
    return self._errorBound(e);
  }).catch(_fatalError2.default);
};

AwaitSink.prototype._event = function (promise) {
  return promise.then(this._eventBound);
};

AwaitSink.prototype._end = function (x) {
  return Promise.resolve(x).then(this._endBound);
};
},{"../Stream":7,"../fatalError":36,"../source/core":59}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sample = sample;
exports.sampleWith = sampleWith;
exports.sampleArray = sampleArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * When an event arrives on sampler, emit the result of calling f with the latest
 * values of all streams being sampled
 * @param {function(...values):*} f function to apply to each set of sampled values
 * @param {Stream} sampler streams will be sampled whenever an event arrives
 *  on sampler
 * @returns {Stream} stream of sampled and transformed values
 */
function sample(f, sampler /*, ...streams */) {
  return sampleArray(f, sampler, base.drop(2, arguments));
}

/**
 * When an event arrives on sampler, emit the latest event value from stream.
 * @param {Stream} sampler stream of events at whose arrival time
 *  stream's latest value will be propagated
 * @param {Stream} stream stream of values
 * @returns {Stream} sampled stream of values
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function sampleWith(sampler, stream) {
  return new _Stream2.default(new Sampler(base.id, sampler.source, [stream.source]));
}

function sampleArray(f, sampler, streams) {
  return new _Stream2.default(new Sampler(f, sampler.source, base.map(getSource, streams)));
}

function getSource(stream) {
  return stream.source;
}

function Sampler(f, sampler, sources) {
  this.f = f;
  this.sampler = sampler;
  this.sources = sources;
}

Sampler.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l + 1);
  var sinks = new Array(l);

  var sampleSink = new SampleSink(this.f, sinks, sink);

  for (var hold, i = 0; i < l; ++i) {
    hold = sinks[i] = new Hold(sampleSink);
    disposables[i] = this$1.sources[i].run(hold, scheduler);
  }

  disposables[i] = this.sampler.run(sampleSink, scheduler);

  return dispose.all(disposables);
};

function Hold(sink) {
  this.sink = sink;
  this.hasValue = false;
}

Hold.prototype.event = function (t, x) {
  this.value = x;
  this.hasValue = true;
  this.sink._notify(this);
};

Hold.prototype.end = function () {};
Hold.prototype.error = _Pipe2.default.prototype.error;

function SampleSink(f, sinks, sink) {
  this.f = f;
  this.sinks = sinks;
  this.sink = sink;
  this.active = false;
}

SampleSink.prototype._notify = function () {
  if (!this.active) {
    this.active = this.sinks.every(hasValue);
  }
};

SampleSink.prototype.event = function (t) {
  if (this.active) {
    this.sink.event(t, (0, _invoke2.default)(this.f, base.map(getValue, this.sinks)));
  }
};

SampleSink.prototype.end = _Pipe2.default.prototype.end;
SampleSink.prototype.error = _Pipe2.default.prototype.error;

function hasValue(hold) {
  return hold.hasValue;
}

function getValue(hold) {
  return hold.value;
}
},{"../Stream":7,"../disposable/dispose":35,"../invoke":41,"../sink/Pipe":55,"@most/prelude":3}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.take = take;
exports.skip = skip;
exports.slice = slice;
exports.takeWhile = takeWhile;
exports.skipWhile = skipWhile;
exports.skipAfter = skipAfter;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {number} n
 * @param {Stream} stream
 * @returns {Stream} new stream containing only up to the first n items from stream
 */
function take(n, stream) {
  return slice(0, n, stream);
}

/**
 * @param {number} n
 * @param {Stream} stream
 * @returns {Stream} new stream with the first n items removed
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function skip(n, stream) {
  return slice(n, Infinity, stream);
}

/**
 * Slice a stream by index. Negative start/end indexes are not supported
 * @param {number} start
 * @param {number} end
 * @param {Stream} stream
 * @returns {Stream} stream containing items where start <= index < end
 */
function slice(start, end, stream) {
  return end <= start ? core.empty() : new _Stream2.default(sliceSource(start, end, stream.source));
}

function sliceSource(start, end, source) {
  return source instanceof _Map2.default ? commuteMapSlice(start, end, source) : source instanceof Slice ? fuseSlice(start, end, source) : new Slice(start, end, source);
}

function commuteMapSlice(start, end, source) {
  return _Map2.default.create(source.f, sliceSource(start, end, source.source));
}

function fuseSlice(start, end, source) {
  start += source.min;
  end = Math.min(end + source.min, source.max);
  return new Slice(start, end, source.source);
}

function Slice(min, max, source) {
  this.source = source;
  this.min = min;
  this.max = max;
}

Slice.prototype.run = function (sink, scheduler) {
  var disposable = dispose.settable();
  var sliceSink = new SliceSink(this.min, this.max - this.min, sink, disposable);

  disposable.setDisposable(this.source.run(sliceSink, scheduler));
  return disposable;
};

function SliceSink(skip, take, sink, disposable) {
  this.sink = sink;
  this.skip = skip;
  this.take = take;
  this.disposable = disposable;
}

SliceSink.prototype.end = _Pipe2.default.prototype.end;
SliceSink.prototype.error = _Pipe2.default.prototype.error;

SliceSink.prototype.event = function (t, x) {
  /* eslint complexity: [1, 4] */
  if (this.skip > 0) {
    this.skip -= 1;
    return;
  }

  if (this.take === 0) {
    return;
  }

  this.take -= 1;
  this.sink.event(t, x);
  if (this.take === 0) {
    this.disposable.dispose();
    this.sink.end(t, x);
  }
};

function takeWhile(p, stream) {
  return new _Stream2.default(new TakeWhile(p, stream.source));
}

function TakeWhile(p, source) {
  this.p = p;
  this.source = source;
}

TakeWhile.prototype.run = function (sink, scheduler) {
  var disposable = dispose.settable();
  var takeWhileSink = new TakeWhileSink(this.p, sink, disposable);

  disposable.setDisposable(this.source.run(takeWhileSink, scheduler));
  return disposable;
};

function TakeWhileSink(p, sink, disposable) {
  this.p = p;
  this.sink = sink;
  this.active = true;
  this.disposable = disposable;
}

TakeWhileSink.prototype.end = _Pipe2.default.prototype.end;
TakeWhileSink.prototype.error = _Pipe2.default.prototype.error;

TakeWhileSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }

  var p = this.p;
  this.active = p(x);
  if (this.active) {
    this.sink.event(t, x);
  } else {
    this.disposable.dispose();
    this.sink.end(t, x);
  }
};

function skipWhile(p, stream) {
  return new _Stream2.default(new SkipWhile(p, stream.source));
}

function SkipWhile(p, source) {
  this.p = p;
  this.source = source;
}

SkipWhile.prototype.run = function (sink, scheduler) {
  return this.source.run(new SkipWhileSink(this.p, sink), scheduler);
};

function SkipWhileSink(p, sink) {
  this.p = p;
  this.sink = sink;
  this.skipping = true;
}

SkipWhileSink.prototype.end = _Pipe2.default.prototype.end;
SkipWhileSink.prototype.error = _Pipe2.default.prototype.error;

SkipWhileSink.prototype.event = function (t, x) {
  if (this.skipping) {
    var p = this.p;
    this.skipping = p(x);
    if (this.skipping) {
      return;
    }
  }

  this.sink.event(t, x);
};

function skipAfter(p, stream) {
  return new _Stream2.default(new SkipAfter(p, stream.source));
}

function SkipAfter(p, source) {
  this.p = p;
  this.source = source;
}

SkipAfter.prototype.run = function run(sink, scheduler) {
  return this.source.run(new SkipAfterSink(this.p, sink), scheduler);
};

function SkipAfterSink(p, sink) {
  this.p = p;
  this.sink = sink;
  this.skipping = false;
}

SkipAfterSink.prototype.event = function event(t, x) {
  if (this.skipping) {
    return;
  }

  var p = this.p;
  this.skipping = p(x);
  this.sink.event(t, x);

  if (this.skipping) {
    this.sink.end(t, x);
  }
};

SkipAfterSink.prototype.end = _Pipe2.default.prototype.end;
SkipAfterSink.prototype.error = _Pipe2.default.prototype.error;
},{"../Stream":7,"../disposable/dispose":35,"../fusion/Map":39,"../sink/Pipe":55,"../source/core":59}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switch = undefined;
exports.switchLatest = switchLatest;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Given a stream of streams, return a new stream that adopts the behavior
 * of the most recent inner stream.
 * @param {Stream} stream of streams on which to switch
 * @returns {Stream} switching stream
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function switchLatest(stream) {
  return new _Stream2.default(new Switch(stream.source));
}

exports.switch = switchLatest;


function Switch(source) {
  this.source = source;
}

Switch.prototype.run = function (sink, scheduler) {
  var switchSink = new SwitchSink(sink, scheduler);
  return dispose.all([switchSink, this.source.run(switchSink, scheduler)]);
};

function SwitchSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
  this.current = null;
  this.ended = false;
}

SwitchSink.prototype.event = function (t, stream) {
  this._disposeCurrent(t); // TODO: capture the result of this dispose
  this.current = new Segment(t, Infinity, this, this.sink);
  this.current.disposable = stream.source.run(this.current, this.scheduler);
};

SwitchSink.prototype.end = function (t, x) {
  this.ended = true;
  this._checkEnd(t, x);
};

SwitchSink.prototype.error = function (t, e) {
  this.ended = true;
  this.sink.error(t, e);
};

SwitchSink.prototype.dispose = function () {
  return this._disposeCurrent(this.scheduler.now());
};

SwitchSink.prototype._disposeCurrent = function (t) {
  if (this.current !== null) {
    return this.current._dispose(t);
  }
};

SwitchSink.prototype._disposeInner = function (t, inner) {
  inner._dispose(t); // TODO: capture the result of this dispose
  if (inner === this.current) {
    this.current = null;
  }
};

SwitchSink.prototype._checkEnd = function (t, x) {
  if (this.ended && this.current === null) {
    this.sink.end(t, x);
  }
};

SwitchSink.prototype._endInner = function (t, x, inner) {
  this._disposeInner(t, inner);
  this._checkEnd(t, x);
};

SwitchSink.prototype._errorInner = function (t, e, inner) {
  this._disposeInner(t, inner);
  this.sink.error(t, e);
};

function Segment(min, max, outer, sink) {
  this.min = min;
  this.max = max;
  this.outer = outer;
  this.sink = sink;
  this.disposable = dispose.empty();
}

Segment.prototype.event = function (t, x) {
  if (t < this.max) {
    this.sink.event(Math.max(t, this.min), x);
  }
};

Segment.prototype.end = function (t, x) {
  this.outer._endInner(Math.max(t, this.min), x, this);
};

Segment.prototype.error = function (t, e) {
  this.outer._errorInner(Math.max(t, this.min), e, this);
};

Segment.prototype._dispose = function (t) {
  this.max = t;
  dispose.tryDispose(t, this.disposable, this.sink);
};
},{"../Stream":7,"../disposable/dispose":35}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.thru = thru;
/** @license MIT License (c) copyright 2010-2017 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function thru(f, stream) {
  return f(stream);
}
},{}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeUntil = takeUntil;
exports.skipUntil = skipUntil;
exports.during = during;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _flatMap = require('../combinator/flatMap');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function takeUntil(signal, stream) {
  return new _Stream2.default(new Until(signal.source, stream.source));
}

function skipUntil(signal, stream) {
  return new _Stream2.default(new Since(signal.source, stream.source));
}

function during(timeWindow, stream) {
  return takeUntil((0, _flatMap.join)(timeWindow), skipUntil(timeWindow, stream));
}

function Until(maxSignal, source) {
  this.maxSignal = maxSignal;
  this.source = source;
}

Until.prototype.run = function (sink, scheduler) {
  var min = new Bound(-Infinity, sink);
  var max = new UpperBound(this.maxSignal, sink, scheduler);
  var disposable = this.source.run(new TimeWindowSink(min, max, sink), scheduler);

  return dispose.all([min, max, disposable]);
};

function Since(minSignal, source) {
  this.minSignal = minSignal;
  this.source = source;
}

Since.prototype.run = function (sink, scheduler) {
  var min = new LowerBound(this.minSignal, sink, scheduler);
  var max = new Bound(Infinity, sink);
  var disposable = this.source.run(new TimeWindowSink(min, max, sink), scheduler);

  return dispose.all([min, max, disposable]);
};

function Bound(value, sink) {
  this.value = value;
  this.sink = sink;
}

Bound.prototype.error = _Pipe2.default.prototype.error;
Bound.prototype.event = noop;
Bound.prototype.end = noop;
Bound.prototype.dispose = noop;

function TimeWindowSink(min, max, sink) {
  this.min = min;
  this.max = max;
  this.sink = sink;
}

TimeWindowSink.prototype.event = function (t, x) {
  if (t >= this.min.value && t < this.max.value) {
    this.sink.event(t, x);
  }
};

TimeWindowSink.prototype.error = _Pipe2.default.prototype.error;
TimeWindowSink.prototype.end = _Pipe2.default.prototype.end;

function LowerBound(signal, sink, scheduler) {
  this.value = Infinity;
  this.sink = sink;
  this.disposable = signal.run(this, scheduler);
}

LowerBound.prototype.event = function (t /*, x */) {
  if (t < this.value) {
    this.value = t;
  }
};

LowerBound.prototype.end = noop;
LowerBound.prototype.error = _Pipe2.default.prototype.error;

LowerBound.prototype.dispose = function () {
  return this.disposable.dispose();
};

function UpperBound(signal, sink, scheduler) {
  this.value = Infinity;
  this.sink = sink;
  this.disposable = signal.run(this, scheduler);
}

UpperBound.prototype.event = function (t, x) {
  if (t < this.value) {
    this.value = t;
    this.sink.end(t, x);
  }
};

UpperBound.prototype.end = noop;
UpperBound.prototype.error = _Pipe2.default.prototype.error;

UpperBound.prototype.dispose = function () {
  return this.disposable.dispose();
};

function noop() {}
},{"../Stream":7,"../combinator/flatMap":17,"../disposable/dispose":35,"../sink/Pipe":55}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timestamp = timestamp;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function timestamp(stream) {
  return new _Stream2.default(new Timestamp(stream.source));
}

function Timestamp(source) {
  this.source = source;
}

Timestamp.prototype.run = function (sink, scheduler) {
  return this.source.run(new TimestampSink(sink), scheduler);
};

function TimestampSink(sink) {
  this.sink = sink;
}

TimestampSink.prototype.end = _Pipe2.default.prototype.end;
TimestampSink.prototype.error = _Pipe2.default.prototype.error;

TimestampSink.prototype.event = function (t, x) {
  this.sink.event(t, { time: t, value: x });
};
},{"../Stream":7,"../sink/Pipe":55}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transduce = transduce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Transform a stream by passing its events through a transducer.
 * @param  {function} transducer transducer function
 * @param  {Stream} stream stream whose events will be passed through the
 *  transducer
 * @return {Stream} stream of events transformed by the transducer
 */
function transduce(transducer, stream) {
  return new _Stream2.default(new Transduce(transducer, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Transduce(transducer, source) {
  this.transducer = transducer;
  this.source = source;
}

Transduce.prototype.run = function (sink, scheduler) {
  var xf = this.transducer(new Transformer(sink));
  return this.source.run(new TransduceSink(getTxHandler(xf), sink), scheduler);
};

function TransduceSink(adapter, sink) {
  this.xf = adapter;
  this.sink = sink;
}

TransduceSink.prototype.event = function (t, x) {
  var next = this.xf.step(t, x);

  return this.xf.isReduced(next) ? this.sink.end(t, this.xf.getResult(next)) : next;
};

TransduceSink.prototype.end = function (t, x) {
  return this.xf.result(x);
};

TransduceSink.prototype.error = function (t, e) {
  return this.sink.error(t, e);
};

function Transformer(sink) {
  this.time = -Infinity;
  this.sink = sink;
}

Transformer.prototype['@@transducer/init'] = Transformer.prototype.init = function () {};

Transformer.prototype['@@transducer/step'] = Transformer.prototype.step = function (t, x) {
  if (!isNaN(t)) {
    this.time = Math.max(t, this.time);
  }
  return this.sink.event(this.time, x);
};

Transformer.prototype['@@transducer/result'] = Transformer.prototype.result = function (x) {
  return this.sink.end(this.time, x);
};

/**
* Given an object supporting the new or legacy transducer protocol,
* create an adapter for it.
* @param {object} tx transform
* @returns {TxAdapter|LegacyTxAdapter}
*/
function getTxHandler(tx) {
  return typeof tx['@@transducer/step'] === 'function' ? new TxAdapter(tx) : new LegacyTxAdapter(tx);
}

/**
* Adapter for new official transducer protocol
* @param {object} tx transform
* @constructor
*/
function TxAdapter(tx) {
  this.tx = tx;
}

TxAdapter.prototype.step = function (t, x) {
  return this.tx['@@transducer/step'](t, x);
};
TxAdapter.prototype.result = function (x) {
  return this.tx['@@transducer/result'](x);
};
TxAdapter.prototype.isReduced = function (x) {
  return x != null && x['@@transducer/reduced'];
};
TxAdapter.prototype.getResult = function (x) {
  return x['@@transducer/value'];
};

/**
* Adapter for older transducer protocol
* @param {object} tx transform
* @constructor
*/
function LegacyTxAdapter(tx) {
  this.tx = tx;
}

LegacyTxAdapter.prototype.step = function (t, x) {
  return this.tx.step(t, x);
};
LegacyTxAdapter.prototype.result = function (x) {
  return this.tx.result(x);
};
LegacyTxAdapter.prototype.isReduced = function (x) {
  return x != null && x.__transducers_reduced__;
};
LegacyTxAdapter.prototype.getResult = function (x) {
  return x.value;
};
},{"../Stream":7}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.map = map;
exports.constant = constant;
exports.tap = tap;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Transform each value in the stream by applying f to each
 * @param {function(*):*} f mapping function
 * @param {Stream} stream stream to map
 * @returns {Stream} stream containing items transformed by f
 */
function map(f, stream) {
  return new _Stream2.default(_Map2.default.create(f, stream.source));
}

/**
* Replace each value in the stream with x
* @param {*} x
* @param {Stream} stream
* @returns {Stream} stream containing items replaced with x
*/
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function constant(x, stream) {
  return map(function () {
    return x;
  }, stream);
}

/**
* Perform a side effect for each item in the stream
* @param {function(x:*):*} f side effect to execute for each item. The
*  return value will be discarded.
* @param {Stream} stream stream to tap
* @returns {Stream} new stream containing the same items as this stream
*/
function tap(f, stream) {
  return new _Stream2.default(new Tap(f, stream.source));
}

function Tap(f, source) {
  this.source = source;
  this.f = f;
}

Tap.prototype.run = function (sink, scheduler) {
  return this.source.run(new TapSink(this.f, sink), scheduler);
};

function TapSink(f, sink) {
  this.sink = sink;
  this.f = f;
}

TapSink.prototype.end = _Pipe2.default.prototype.end;
TapSink.prototype.error = _Pipe2.default.prototype.error;

TapSink.prototype.event = function (t, x) {
  var f = this.f;
  f(x);
  this.sink.event(t, x);
};
},{"../Stream":7,"../fusion/Map":39,"../sink/Pipe":55}],32:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zip = zip;
exports.zipArray = zipArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _transform = require('./transform');

var transform = _interopRequireWildcard(_transform);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

var _Queue = require('../Queue');

var _Queue2 = _interopRequireDefault(_Queue);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var map = base.map; /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var tail = base.tail;

/**
 * Combine streams pairwise (or tuple-wise) by index by applying f to values
 * at corresponding indices.  The returned stream ends when any of the input
 * streams ends.
 * @param {function} f function to combine values
 * @returns {Stream} new stream with items at corresponding indices combined
 *  using f
 */
function zip(f /*, ...streams */) {
  return zipArray(f, tail(arguments));
}

/**
* Combine streams pairwise (or tuple-wise) by index by applying f to values
* at corresponding indices.  The returned stream ends when any of the input
* streams ends.
* @param {function} f function to combine values
* @param {[Stream]} streams streams to zip using f
* @returns {Stream} new stream with items at corresponding indices combined
*  using f
*/
function zipArray(f, streams) {
  return streams.length === 0 ? core.empty() : streams.length === 1 ? transform.map(f, streams[0]) : new _Stream2.default(new Zip(f, map(getSource, streams)));
}

function getSource(stream) {
  return stream.source;
}

function Zip(f, sources) {
  this.f = f;
  this.sources = sources;
}

Zip.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);
  var buffers = new Array(l);

  var zipSink = new ZipSink(this.f, buffers, sinks, sink);

  for (var indexSink, i = 0; i < l; ++i) {
    buffers[i] = new _Queue2.default();
    indexSink = sinks[i] = new _IndexSink2.default(i, zipSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function ZipSink(f, buffers, sinks, sink) {
  this.f = f;
  this.sinks = sinks;
  this.sink = sink;
  this.buffers = buffers;
}

ZipSink.prototype.event = function (t, indexedValue) {
  // eslint-disable-line complexity
  var buffers = this.buffers;
  var buffer = buffers[indexedValue.index];

  buffer.push(indexedValue.value);

  if (buffer.length() === 1) {
    if (!ready(this.buffers)) {
      return;
    }

    emitZipped(this.f, t, buffers, this.sink);

    if (ended(this.buffers, this.sinks)) {
      this.sink.end(t, void 0);
    }
  }
};

ZipSink.prototype.end = function (t, indexedValue) {
  var buffer = this.buffers[indexedValue.index];
  if (buffer.isEmpty()) {
    this.sink.end(t, indexedValue.value);
  }
};

ZipSink.prototype.error = _Pipe2.default.prototype.error;

function emitZipped(f, t, buffers, sink) {
  sink.event(t, (0, _invoke2.default)(f, map(head, buffers)));
}

function head(buffer) {
  return buffer.shift();
}

function ended(buffers, sinks) {
  for (var i = 0, l = buffers.length; i < l; ++i) {
    if (buffers[i].isEmpty() && !sinks[i].active) {
      return true;
    }
  }
  return false;
}

function ready(buffers) {
  for (var i = 0, l = buffers.length; i < l; ++i) {
    if (buffers[i].isEmpty()) {
      return false;
    }
  }
  return true;
}
},{"../Queue":6,"../Stream":7,"../disposable/dispose":35,"../invoke":41,"../sink/IndexSink":54,"../sink/Pipe":55,"../source/core":59,"./transform":31,"@most/prelude":3}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Disposable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Create a new Disposable which will dispose its underlying resource.
 * @param {function} dispose function
 * @param {*?} data any data to be passed to disposer function
 * @constructor
 */
function Disposable(dispose, data) {
  this._dispose = dispose;
  this._data = data;
}

Disposable.prototype.dispose = function () {
  return this._dispose(this._data);
};
},{}],34:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SettableDisposable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SettableDisposable() {
  this.disposable = void 0;
  this.disposed = false;
  this._resolve = void 0;

  var self = this;
  this.result = new Promise(function (resolve) {
    self._resolve = resolve;
  });
}

SettableDisposable.prototype.setDisposable = function (disposable) {
  if (this.disposable !== void 0) {
    throw new Error('setDisposable called more than once');
  }

  this.disposable = disposable;

  if (this.disposed) {
    this._resolve(disposable.dispose());
  }
};

SettableDisposable.prototype.dispose = function () {
  if (this.disposed) {
    return this.result;
  }

  this.disposed = true;

  if (this.disposable !== void 0) {
    this.result = this.disposable.dispose();
  }

  return this.result;
};
},{}],35:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tryDispose = tryDispose;
exports.create = create;
exports.empty = empty;
exports.all = all;
exports.promised = promised;
exports.settable = settable;
exports.once = once;

var _Disposable = require('./Disposable');

var _Disposable2 = _interopRequireDefault(_Disposable);

var _SettableDisposable = require('./SettableDisposable');

var _SettableDisposable2 = _interopRequireDefault(_SettableDisposable);

var _Promise = require('../Promise');

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
var map = base.map;
var identity = base.id;

/**
 * Call disposable.dispose.  If it returns a promise, catch promise
 * error and forward it through the provided sink.
 * @param {number} t time
 * @param {{dispose: function}} disposable
 * @param {{error: function}} sink
 * @return {*} result of disposable.dispose
 */
function tryDispose(t, disposable, sink) {
  var result = disposeSafely(disposable);
  return (0, _Promise.isPromise)(result) ? result.catch(function (e) {
    sink.error(t, e);
  }) : result;
}

/**
 * Create a new Disposable which will dispose its underlying resource
 * at most once.
 * @param {function} dispose function
 * @param {*?} data any data to be passed to disposer function
 * @return {Disposable}
 */
function create(dispose, data) {
  return once(new _Disposable2.default(dispose, data));
}

/**
 * Create a noop disposable. Can be used to satisfy a Disposable
 * requirement when no actual resource needs to be disposed.
 * @return {Disposable|exports|module.exports}
 */
function empty() {
  return new _Disposable2.default(identity, void 0);
}

/**
 * Create a disposable that will dispose all input disposables in parallel.
 * @param {Array<Disposable>} disposables
 * @return {Disposable}
 */
function all(disposables) {
  return create(disposeAll, disposables);
}

function disposeAll(disposables) {
  return Promise.all(map(disposeSafely, disposables));
}

function disposeSafely(disposable) {
  try {
    return disposable.dispose();
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Create a disposable from a promise for another disposable
 * @param {Promise<Disposable>} disposablePromise
 * @return {Disposable}
 */
function promised(disposablePromise) {
  return create(disposePromise, disposablePromise);
}

function disposePromise(disposablePromise) {
  return disposablePromise.then(disposeOne);
}

function disposeOne(disposable) {
  return disposable.dispose();
}

/**
 * Create a disposable proxy that allows its underlying disposable to
 * be set later.
 * @return {SettableDisposable}
 */
function settable() {
  return new _SettableDisposable2.default();
}

/**
 * Wrap an existing disposable (which may not already have been once()d)
 * so that it will only dispose its underlying resource at most once.
 * @param {{ dispose: function() }} disposable
 * @return {Disposable} wrapped disposable
 */
function once(disposable) {
  return new _Disposable2.default(disposeMemoized, memoized(disposable));
}

function disposeMemoized(memoized) {
  if (!memoized.disposed) {
    memoized.disposed = true;
    memoized.value = disposeSafely(memoized.disposable);
    memoized.disposable = void 0;
  }

  return memoized.value;
}

function memoized(disposable) {
  return { disposed: false, disposable: disposable, value: void 0 };
}
},{"../Promise":5,"./Disposable":33,"./SettableDisposable":34,"@most/prelude":3}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fatalError;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fatalError(e) {
  setTimeout(function () {
    throw e;
  }, 0);
}
},{}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Filter;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Filter(p, source) {
  this.p = p;
  this.source = source;
}

/**
 * Create a filtered source, fusing adjacent filter.filter if possible
 * @param {function(x:*):boolean} p filtering predicate
 * @param {{run:function}} source source to filter
 * @returns {Filter} filtered source
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

Filter.create = function createFilter(p, source) {
  if (source instanceof Filter) {
    return new Filter(and(source.p, p), source.source);
  }

  return new Filter(p, source);
};

Filter.prototype.run = function (sink, scheduler) {
  return this.source.run(new FilterSink(this.p, sink), scheduler);
};

function FilterSink(p, sink) {
  this.p = p;
  this.sink = sink;
}

FilterSink.prototype.end = _Pipe2.default.prototype.end;
FilterSink.prototype.error = _Pipe2.default.prototype.error;

FilterSink.prototype.event = function (t, x) {
  var p = this.p;
  p(x) && this.sink.event(t, x);
};

function and(p, q) {
  return function (x) {
    return p(x) && q(x);
  };
}
},{"../sink/Pipe":55}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = FilterMap;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function FilterMap(p, f, source) {
  this.p = p;
  this.f = f;
  this.source = source;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

FilterMap.prototype.run = function (sink, scheduler) {
  return this.source.run(new FilterMapSink(this.p, this.f, sink), scheduler);
};

function FilterMapSink(p, f, sink) {
  this.p = p;
  this.f = f;
  this.sink = sink;
}

FilterMapSink.prototype.event = function (t, x) {
  var f = this.f;
  var p = this.p;
  p(x) && this.sink.event(t, f(x));
};

FilterMapSink.prototype.end = _Pipe2.default.prototype.end;
FilterMapSink.prototype.error = _Pipe2.default.prototype.error;
},{"../sink/Pipe":55}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Map;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Filter = require('./Filter');

var _Filter2 = _interopRequireDefault(_Filter);

var _FilterMap = require('./FilterMap');

var _FilterMap2 = _interopRequireDefault(_FilterMap);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Map(f, source) {
  this.f = f;
  this.source = source;
}

/**
 * Create a mapped source, fusing adjacent map.map, filter.map,
 * and filter.map.map if possible
 * @param {function(*):*} f mapping function
 * @param {{run:function}} source source to map
 * @returns {Map|FilterMap} mapped source, possibly fused
 */
Map.create = function createMap(f, source) {
  if (source instanceof Map) {
    return new Map(base.compose(f, source.f), source.source);
  }

  if (source instanceof _Filter2.default) {
    return new _FilterMap2.default(source.p, f, source.source);
  }

  return new Map(f, source);
};

Map.prototype.run = function (sink, scheduler) {
  // eslint-disable-line no-extend-native
  return this.source.run(new MapSink(this.f, sink), scheduler);
};

function MapSink(f, sink) {
  this.f = f;
  this.sink = sink;
}

MapSink.prototype.end = _Pipe2.default.prototype.end;
MapSink.prototype.error = _Pipe2.default.prototype.error;

MapSink.prototype.event = function (t, x) {
  var f = this.f;
  this.sink.event(t, f(x));
};
},{"../sink/Pipe":55,"./Filter":37,"./FilterMap":38,"@most/prelude":3}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PropagateTask = exports.defaultScheduler = exports.multicast = exports.throwError = exports.flatMapError = exports.recoverWith = exports.await = exports.awaitPromises = exports.fromPromise = exports.debounce = exports.throttle = exports.timestamp = exports.delay = exports.during = exports.since = exports.skipUntil = exports.until = exports.takeUntil = exports.skipAfter = exports.skipWhile = exports.takeWhile = exports.slice = exports.skip = exports.take = exports.distinctBy = exports.skipRepeatsWith = exports.distinct = exports.skipRepeats = exports.filter = exports.switch = exports.switchLatest = exports.zipArray = exports.zip = exports.sampleWith = exports.sampleArray = exports.sample = exports.combineArray = exports.combine = exports.mergeArray = exports.merge = exports.mergeConcurrently = exports.concatMap = exports.flatMapEnd = exports.continueWith = exports.join = exports.chain = exports.flatMap = exports.transduce = exports.ap = exports.tap = exports.constant = exports.map = exports.startWith = exports.concat = exports.generate = exports.iterate = exports.unfold = exports.reduce = exports.scan = exports.loop = exports.drain = exports.forEach = exports.observe = exports.fromEvent = exports.periodic = exports.from = exports.never = exports.empty = exports.just = exports.of = exports.Stream = undefined;

var _fromEvent = require('./source/fromEvent');

Object.defineProperty(exports, 'fromEvent', {
  enumerable: true,
  get: function () {
    return _fromEvent.fromEvent;
  }
});

var _unfold = require('./source/unfold');

Object.defineProperty(exports, 'unfold', {
  enumerable: true,
  get: function () {
    return _unfold.unfold;
  }
});

var _iterate = require('./source/iterate');

Object.defineProperty(exports, 'iterate', {
  enumerable: true,
  get: function () {
    return _iterate.iterate;
  }
});

var _generate = require('./source/generate');

Object.defineProperty(exports, 'generate', {
  enumerable: true,
  get: function () {
    return _generate.generate;
  }
});

var _Stream = require('./Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _core = require('./source/core');

var _from = require('./source/from');

var _periodic = require('./source/periodic');

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

var _subscribe = require('./observable/subscribe');

var _thru = require('./combinator/thru');

var _observe = require('./combinator/observe');

var _loop = require('./combinator/loop');

var _accumulate = require('./combinator/accumulate');

var _build = require('./combinator/build');

var _transform = require('./combinator/transform');

var _applicative = require('./combinator/applicative');

var _transduce = require('./combinator/transduce');

var _flatMap = require('./combinator/flatMap');

var _continueWith = require('./combinator/continueWith');

var _concatMap = require('./combinator/concatMap');

var _mergeConcurrently = require('./combinator/mergeConcurrently');

var _merge = require('./combinator/merge');

var _combine = require('./combinator/combine');

var _sample = require('./combinator/sample');

var _zip = require('./combinator/zip');

var _switch = require('./combinator/switch');

var _filter = require('./combinator/filter');

var _slice = require('./combinator/slice');

var _timeslice = require('./combinator/timeslice');

var _delay = require('./combinator/delay');

var _timestamp = require('./combinator/timestamp');

var _limit = require('./combinator/limit');

var _promises = require('./combinator/promises');

var _errors = require('./combinator/errors');

var _multicast = require('@most/multicast');

var _multicast2 = _interopRequireDefault(_multicast);

var _defaultScheduler = require('./scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

var _PropagateTask = require('./scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Core stream type
 * @type {Stream}
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.Stream = _Stream2.default;

// Add of and empty to constructor for fantasy-land compat

_Stream2.default.of = _core.of;
_Stream2.default.empty = _core.empty;
// Add from to constructor for ES Observable compat
_Stream2.default.from = _from.from;
exports.of = _core.of;
exports.just = _core.of;
exports.empty = _core.empty;
exports.never = _core.never;
exports.from = _from.from;
exports.periodic = _periodic.periodic;

// -----------------------------------------------------------------------
// Draft ES Observable proposal interop
// https://github.com/zenparsing/es-observable

_Stream2.default.prototype.subscribe = function (subscriber) {
  return (0, _subscribe.subscribe)(subscriber, this);
};

_Stream2.default.prototype[_symbolObservable2.default] = function () {
  return this;
};

// -----------------------------------------------------------------------
// Fluent adapter

/**
 * Adapt a functional stream transform to fluent style.
 * It applies f to the this stream object
 * @param  {function(s: Stream): Stream} f function that
 * receives the stream itself and must return a new stream
 * @return {Stream}
 */
_Stream2.default.prototype.thru = function (f) {
  return (0, _thru.thru)(f, this);
};

// -----------------------------------------------------------------------
// Adapting other sources

/**
 * Create a stream of events from the supplied EventTarget or EventEmitter
 * @param {String} event event name
 * @param {EventTarget|EventEmitter} source EventTarget or EventEmitter. The source
 *  must support either addEventListener/removeEventListener (w3c EventTarget:
 *  http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget),
 *  or addListener/removeListener (node EventEmitter: http://nodejs.org/api/events.html)
 * @returns {Stream} stream of events of the specified type from the source
 */


// -----------------------------------------------------------------------
// Observing

exports.observe = _observe.observe;
exports.forEach = _observe.observe;
exports.drain = _observe.drain;

/**
 * Process all the events in the stream
 * @returns {Promise} promise that fulfills when the stream ends, or rejects
 *  if the stream fails with an unhandled error.
 */

_Stream2.default.prototype.observe = _Stream2.default.prototype.forEach = function (f) {
  return (0, _observe.observe)(f, this);
};

/**
 * Consume all events in the stream, without providing a function to process each.
 * This causes a stream to become active and begin emitting events, and is useful
 * in cases where all processing has been setup upstream via other combinators, and
 * there is no need to process the terminal events.
 * @returns {Promise} promise that fulfills when the stream ends, or rejects
 *  if the stream fails with an unhandled error.
 */
_Stream2.default.prototype.drain = function () {
  return (0, _observe.drain)(this);
};

// -------------------------------------------------------

exports.loop = _loop.loop;

/**
 * Generalized feedback loop. Call a stepper function for each event. The stepper
 * will be called with 2 params: the current seed and the an event value.  It must
 * return a new { seed, value } pair. The `seed` will be fed back into the next
 * invocation of stepper, and the `value` will be propagated as the event value.
 * @param {function(seed:*, value:*):{seed:*, value:*}} stepper loop step function
 * @param {*} seed initial seed value passed to first stepper call
 * @returns {Stream} new stream whose values are the `value` field of the objects
 * returned by the stepper
 */

_Stream2.default.prototype.loop = function (stepper, seed) {
  return (0, _loop.loop)(stepper, seed, this);
};

// -------------------------------------------------------

exports.scan = _accumulate.scan;
exports.reduce = _accumulate.reduce;

/**
 * Create a stream containing successive reduce results of applying f to
 * the previous reduce result and the current stream item.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial initial value
 * @returns {Stream} new stream containing successive reduce results
 */

_Stream2.default.prototype.scan = function (f, initial) {
  return (0, _accumulate.scan)(f, initial, this);
};

/**
 * Reduce the stream to produce a single result.  Note that reducing an infinite
 * stream will return a Promise that never fulfills, but that may reject if an error
 * occurs.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial optional initial value
 * @returns {Promise} promise for the file result of the reduce
 */
_Stream2.default.prototype.reduce = function (f, initial) {
  return (0, _accumulate.reduce)(f, initial, this);
};

// -----------------------------------------------------------------------
// Building and extending

exports.concat = _build.concat;
exports.startWith = _build.cons;

/**
 * @param {Stream} tail
 * @returns {Stream} new stream containing all items in this followed by
 *  all items in tail
 */

_Stream2.default.prototype.concat = function (tail) {
  return (0, _build.concat)(this, tail);
};

/**
 * @param {*} x value to prepend
 * @returns {Stream} a new stream with x prepended
 */
_Stream2.default.prototype.startWith = function (x) {
  return (0, _build.cons)(x, this);
};

// -----------------------------------------------------------------------
// Transforming

exports.map = _transform.map;
exports.constant = _transform.constant;
exports.tap = _transform.tap;
exports.ap = _applicative.ap;

/**
 * Transform each value in the stream by applying f to each
 * @param {function(*):*} f mapping function
 * @returns {Stream} stream containing items transformed by f
 */

_Stream2.default.prototype.map = function (f) {
  return (0, _transform.map)(f, this);
};

/**
 * Assume this stream contains functions, and apply each function to each item
 * in the provided stream.  This generates, in effect, a cross product.
 * @param {Stream} xs stream of items to which
 * @returns {Stream} stream containing the cross product of items
 */
_Stream2.default.prototype.ap = function (xs) {
  return (0, _applicative.ap)(this, xs);
};

/**
 * Replace each value in the stream with x
 * @param {*} x
 * @returns {Stream} stream containing items replaced with x
 */
_Stream2.default.prototype.constant = function (x) {
  return (0, _transform.constant)(x, this);
};

/**
 * Perform a side effect for each item in the stream
 * @param {function(x:*):*} f side effect to execute for each item. The
 *  return value will be discarded.
 * @returns {Stream} new stream containing the same items as this stream
 */
_Stream2.default.prototype.tap = function (f) {
  return (0, _transform.tap)(f, this);
};

// -----------------------------------------------------------------------
// Transducer support

exports.transduce = _transduce.transduce;

/**
 * Transform this stream by passing its events through a transducer.
 * @param  {function} transducer transducer function
 * @return {Stream} stream of events transformed by the transducer
 */

_Stream2.default.prototype.transduce = function (transducer) {
  return (0, _transduce.transduce)(transducer, this);
};

// -----------------------------------------------------------------------
// FlatMapping

// @deprecated flatMap, use chain instead
exports.flatMap = _flatMap.flatMap;
exports.chain = _flatMap.flatMap;
exports.join = _flatMap.join;

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param {function(x:*):Stream} f chaining function, must return a Stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */

_Stream2.default.prototype.chain = function (f) {
  return (0, _flatMap.flatMap)(f, this);
};

// @deprecated use chain instead
_Stream2.default.prototype.flatMap = _Stream2.default.prototype.chain;

/**
* Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
* streams to the outer. Event arrival times are preserved.
* @returns {Stream<X>} new stream containing all events of all inner streams
*/
_Stream2.default.prototype.join = function () {
  return (0, _flatMap.join)(this);
};

// @deprecated flatMapEnd, use continueWith instead
exports.continueWith = _continueWith.continueWith;
exports.flatMapEnd = _continueWith.continueWith;

/**
 * Map the end event to a new stream, and begin emitting its values.
 * @param {function(x:*):Stream} f function that receives the end event value,
 * and *must* return a new Stream to continue with.
 * @returns {Stream} new stream that emits all events from the original stream,
 * followed by all events from the stream returned by f.
 */

_Stream2.default.prototype.continueWith = function (f) {
  return (0, _continueWith.continueWith)(f, this);
};

// @deprecated use continueWith instead
_Stream2.default.prototype.flatMapEnd = _Stream2.default.prototype.continueWith;

exports.concatMap = _concatMap.concatMap;


_Stream2.default.prototype.concatMap = function (f) {
  return (0, _concatMap.concatMap)(f, this);
};

// -----------------------------------------------------------------------
// Concurrent merging

exports.mergeConcurrently = _mergeConcurrently.mergeConcurrently;

/**
 * Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer, limiting the number of inner streams that may
 * be active concurrently.
 * @param {number} concurrency at most this many inner streams will be
 *  allowed to be active concurrently.
 * @return {Stream<X>} new stream containing all events of all inner
 *  streams, with limited concurrency.
 */

_Stream2.default.prototype.mergeConcurrently = function (concurrency) {
  return (0, _mergeConcurrently.mergeConcurrently)(concurrency, this);
};

// -----------------------------------------------------------------------
// Merging

exports.merge = _merge.merge;
exports.mergeArray = _merge.mergeArray;

/**
 * Merge this stream and all the provided streams
 * @returns {Stream} stream containing items from this stream and s in time
 * order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */

_Stream2.default.prototype.merge = function () /* ...streams*/{
  return (0, _merge.mergeArray)(base.cons(this, arguments));
};

// -----------------------------------------------------------------------
// Combining

exports.combine = _combine.combine;
exports.combineArray = _combine.combineArray;

/**
 * Combine latest events from all input streams
 * @param {function(...events):*} f function to combine most recent events
 * @returns {Stream} stream containing the result of applying f to the most recent
 *  event of each input stream, whenever a new event arrives on any stream.
 */

_Stream2.default.prototype.combine = function (f /*, ...streams*/) {
  return (0, _combine.combineArray)(f, base.replace(this, 0, arguments));
};

// -----------------------------------------------------------------------
// Sampling

exports.sample = _sample.sample;
exports.sampleArray = _sample.sampleArray;
exports.sampleWith = _sample.sampleWith;

/**
 * When an event arrives on sampler, emit the latest event value from stream.
 * @param {Stream} sampler stream of events at whose arrival time
 *  signal's latest value will be propagated
 * @returns {Stream} sampled stream of values
 */

_Stream2.default.prototype.sampleWith = function (sampler) {
  return (0, _sample.sampleWith)(sampler, this);
};

/**
 * When an event arrives on this stream, emit the result of calling f with the latest
 * values of all streams being sampled
 * @param {function(...values):*} f function to apply to each set of sampled values
 * @returns {Stream} stream of sampled and transformed values
 */
_Stream2.default.prototype.sample = function (f /* ...streams */) {
  return (0, _sample.sampleArray)(f, this, base.tail(arguments));
};

// -----------------------------------------------------------------------
// Zipping

exports.zip = _zip.zip;
exports.zipArray = _zip.zipArray;

/**
 * Pair-wise combine items with those in s. Given 2 streams:
 * [1,2,3] zipWith f [4,5,6] -> [f(1,4),f(2,5),f(3,6)]
 * Note: zip causes fast streams to buffer and wait for slow streams.
 * @param {function(a:Stream, b:Stream, ...):*} f function to combine items
 * @returns {Stream} new stream containing pairs
 */

_Stream2.default.prototype.zip = function (f /*, ...streams*/) {
  return (0, _zip.zipArray)(f, base.replace(this, 0, arguments));
};

// -----------------------------------------------------------------------
// Switching

// @deprecated switch, use switchLatest instead
exports.switchLatest = _switch.switchLatest;
exports.switch = _switch.switchLatest;

/**
 * Given a stream of streams, return a new stream that adopts the behavior
 * of the most recent inner stream.
 * @returns {Stream} switching stream
 */

_Stream2.default.prototype.switchLatest = function () {
  return (0, _switch.switchLatest)(this);
};

// @deprecated use switchLatest instead
_Stream2.default.prototype.switch = _Stream2.default.prototype.switchLatest;

// -----------------------------------------------------------------------
// Filtering

// @deprecated distinct, use skipRepeats instead
// @deprecated distinctBy, use skipRepeatsWith instead
exports.filter = _filter.filter;
exports.skipRepeats = _filter.skipRepeats;
exports.distinct = _filter.skipRepeats;
exports.skipRepeatsWith = _filter.skipRepeatsWith;
exports.distinctBy = _filter.skipRepeatsWith;

/**
 * Retain only items matching a predicate
 * stream:                           -12345678-
 * filter(x => x % 2 === 0, stream): --2-4-6-8-
 * @param {function(x:*):boolean} p filtering predicate called for each item
 * @returns {Stream} stream containing only items for which predicate returns truthy
 */

_Stream2.default.prototype.filter = function (p) {
  return (0, _filter.filter)(p, this);
};

/**
 * Skip repeated events, using === to compare items
 * stream:           -abbcd-
 * distinct(stream): -ab-cd-
 * @returns {Stream} stream with no repeated events
 */
_Stream2.default.prototype.skipRepeats = function () {
  return (0, _filter.skipRepeats)(this);
};

/**
 * Skip repeated events, using supplied equals function to compare items
 * @param {function(a:*, b:*):boolean} equals function to compare items
 * @returns {Stream} stream with no repeated events
 */
_Stream2.default.prototype.skipRepeatsWith = function (equals) {
  return (0, _filter.skipRepeatsWith)(equals, this);
};

// -----------------------------------------------------------------------
// Slicing

exports.take = _slice.take;
exports.skip = _slice.skip;
exports.slice = _slice.slice;
exports.takeWhile = _slice.takeWhile;
exports.skipWhile = _slice.skipWhile;
exports.skipAfter = _slice.skipAfter;

/**
 * stream:          -abcd-
 * take(2, stream): -ab|
 * @param {Number} n take up to this many events
 * @returns {Stream} stream containing at most the first n items from this stream
 */

_Stream2.default.prototype.take = function (n) {
  return (0, _slice.take)(n, this);
};

/**
 * stream:          -abcd->
 * skip(2, stream): ---cd->
 * @param {Number} n skip this many events
 * @returns {Stream} stream not containing the first n events
 */
_Stream2.default.prototype.skip = function (n) {
  return (0, _slice.skip)(n, this);
};

/**
 * Slice a stream by event index. Equivalent to, but more efficient than
 * stream.take(end).skip(start);
 * NOTE: Negative start and end are not supported
 * @param {Number} start skip all events before the start index
 * @param {Number} end allow all events from the start index to the end index
 * @returns {Stream} stream containing items where start <= index < end
 */
_Stream2.default.prototype.slice = function (start, end) {
  return (0, _slice.slice)(start, end, this);
};

/**
 * stream:                        -123451234->
 * takeWhile(x => x < 5, stream): -1234|
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items up to, but not including, the
 * first item for which p returns falsy.
 */
_Stream2.default.prototype.takeWhile = function (p) {
  return (0, _slice.takeWhile)(p, this);
};

/**
 * stream:                        -123451234->
 * skipWhile(x => x < 5, stream): -----51234->
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items following *and including* the
 * first item for which p returns falsy.
 */
_Stream2.default.prototype.skipWhile = function (p) {
  return (0, _slice.skipWhile)(p, this);
};

/**
 * stream:                         -123456789->
 * skipAfter(x => x === 5, stream):-12345|
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items up to, *and including*, the
 * first item for which p returns truthy.
 */
_Stream2.default.prototype.skipAfter = function (p) {
  return (0, _slice.skipAfter)(p, this);
};

// -----------------------------------------------------------------------
// Time slicing

// @deprecated takeUntil, use until instead
// @deprecated skipUntil, use since instead
exports.takeUntil = _timeslice.takeUntil;
exports.until = _timeslice.takeUntil;
exports.skipUntil = _timeslice.skipUntil;
exports.since = _timeslice.skipUntil;
exports.during = _timeslice.during;

/**
 * stream:                    -a-b-c-d-e-f-g->
 * signal:                    -------x
 * takeUntil(signal, stream): -a-b-c-|
 * @param {Stream} signal retain only events in stream before the first
 * event in signal
 * @returns {Stream} new stream containing only events that occur before
 * the first event in signal.
 */

_Stream2.default.prototype.until = function (signal) {
  return (0, _timeslice.takeUntil)(signal, this);
};

// @deprecated use until instead
_Stream2.default.prototype.takeUntil = _Stream2.default.prototype.until;

/**
* stream:                    -a-b-c-d-e-f-g->
* signal:                    -------x
* takeUntil(signal, stream): -------d-e-f-g->
* @param {Stream} signal retain only events in stream at or after the first
* event in signal
* @returns {Stream} new stream containing only events that occur after
* the first event in signal.
*/
_Stream2.default.prototype.since = function (signal) {
  return (0, _timeslice.skipUntil)(signal, this);
};

// @deprecated use since instead
_Stream2.default.prototype.skipUntil = _Stream2.default.prototype.since;

/**
* stream:                    -a-b-c-d-e-f-g->
* timeWindow:                -----s
* s:                               -----t
* stream.during(timeWindow): -----c-d-e-|
* @param {Stream<Stream>} timeWindow a stream whose first event (s) represents
*  the window start time.  That event (s) is itself a stream whose first event (t)
*  represents the window end time
* @returns {Stream} new stream containing only events within the provided timespan
*/
_Stream2.default.prototype.during = function (timeWindow) {
  return (0, _timeslice.during)(timeWindow, this);
};

// -----------------------------------------------------------------------
// Delaying

exports.delay = _delay.delay;

/**
 * @param {Number} delayTime milliseconds to delay each item
 * @returns {Stream} new stream containing the same items, but delayed by ms
 */

_Stream2.default.prototype.delay = function (delayTime) {
  return (0, _delay.delay)(delayTime, this);
};

// -----------------------------------------------------------------------
// Getting event timestamp

exports.timestamp = _timestamp.timestamp;

/**
 * Expose event timestamps into the stream. Turns a Stream<X> into
 * Stream<{time:t, value:X}>
 * @returns {Stream<{time:number, value:*}>}
 */

_Stream2.default.prototype.timestamp = function () {
  return (0, _timestamp.timestamp)(this);
};

// -----------------------------------------------------------------------
// Rate limiting

exports.throttle = _limit.throttle;
exports.debounce = _limit.debounce;

/**
 * Limit the rate of events
 * stream:              abcd----abcd----
 * throttle(2, stream): a-c-----a-c-----
 * @param {Number} period time to suppress events
 * @returns {Stream} new stream that skips events for throttle period
 */

_Stream2.default.prototype.throttle = function (period) {
  return (0, _limit.throttle)(period, this);
};

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * stream:              abcd----abcd----
 * debounce(2, stream): -----d-------d--
 * @param {Number} period events occuring more frequently than this
 *  on the provided scheduler will be suppressed
 * @returns {Stream} new debounced stream
 */
_Stream2.default.prototype.debounce = function (period) {
  return (0, _limit.debounce)(period, this);
};

// -----------------------------------------------------------------------
// Awaiting Promises

// @deprecated await, use awaitPromises instead
exports.fromPromise = _promises.fromPromise;
exports.awaitPromises = _promises.awaitPromises;
exports.await = _promises.awaitPromises;

/**
 * Await promises, turning a Stream<Promise<X>> into Stream<X>.  Preserves
 * event order, but timeshifts events based on promise resolution time.
 * @returns {Stream<X>} stream containing non-promise values
 */

_Stream2.default.prototype.awaitPromises = function () {
  return (0, _promises.awaitPromises)(this);
};

// @deprecated use awaitPromises instead
_Stream2.default.prototype.await = _Stream2.default.prototype.awaitPromises;

// -----------------------------------------------------------------------
// Error handling

// @deprecated flatMapError, use recoverWith instead
exports.recoverWith = _errors.recoverWith;
exports.flatMapError = _errors.flatMapError;
exports.throwError = _errors.throwError;

/**
 * If this stream encounters an error, recover and continue with items from stream
 * returned by f.
 * stream:                  -a-b-c-X-
 * f(X):                           d-e-f-g-
 * flatMapError(f, stream): -a-b-c-d-e-f-g-
 * @param {function(error:*):Stream} f function which returns a new stream
 * @returns {Stream} new stream which will recover from an error by calling f
 */

_Stream2.default.prototype.recoverWith = function (f) {
  return (0, _errors.flatMapError)(f, this);
};

// @deprecated use recoverWith instead
_Stream2.default.prototype.flatMapError = _Stream2.default.prototype.recoverWith;

// -----------------------------------------------------------------------
// Multicasting

exports.multicast = _multicast2.default;

/**
 * Transform the stream into multicast stream.  That means that many subscribers
 * to the stream will not cause multiple invocations of the internal machinery.
 * @returns {Stream} new stream which will multicast events to all observers.
 */

_Stream2.default.prototype.multicast = function () {
  return (0, _multicast2.default)(this);
};

// export the instance of the defaultScheduler for third-party libraries
exports.defaultScheduler = _defaultScheduler2.default;

// export an implementation of Task used internally for third-party libraries

exports.PropagateTask = _PropagateTask2.default;
},{"./Stream":7,"./combinator/accumulate":8,"./combinator/applicative":9,"./combinator/build":10,"./combinator/combine":11,"./combinator/concatMap":12,"./combinator/continueWith":13,"./combinator/delay":14,"./combinator/errors":15,"./combinator/filter":16,"./combinator/flatMap":17,"./combinator/limit":18,"./combinator/loop":19,"./combinator/merge":20,"./combinator/mergeConcurrently":21,"./combinator/observe":22,"./combinator/promises":23,"./combinator/sample":24,"./combinator/slice":25,"./combinator/switch":26,"./combinator/thru":27,"./combinator/timeslice":28,"./combinator/timestamp":29,"./combinator/transduce":30,"./combinator/transform":31,"./combinator/zip":32,"./observable/subscribe":45,"./scheduler/PropagateTask":48,"./scheduler/defaultScheduler":52,"./source/core":59,"./source/from":60,"./source/fromEvent":62,"./source/generate":64,"./source/iterate":65,"./source/periodic":66,"./source/unfold":68,"@most/multicast":2,"@most/prelude":3,"symbol-observable":70}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = invoke;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function invoke(f, args) {
  /*eslint complexity: [2,7]*/
  switch (args.length) {
    case 0:
      return f();
    case 1:
      return f(args[0]);
    case 2:
      return f(args[0], args[1]);
    case 3:
      return f(args[0], args[1], args[2]);
    case 4:
      return f(args[0], args[1], args[2], args[3]);
    case 5:
      return f(args[0], args[1], args[2], args[3], args[4]);
    default:
      return f.apply(void 0, args);
  }
}
},{}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIterable = isIterable;
exports.getIterator = getIterator;
exports.makeIterable = makeIterable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global Set, Symbol*/
var iteratorSymbol;
// Firefox ships a partial implementation using the name @@iterator.
// https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
if (typeof Set === 'function' && typeof new Set()['@@iterator'] === 'function') {
  iteratorSymbol = '@@iterator';
} else {
  iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator || '_es6shim_iterator_';
}

function isIterable(o) {
  return typeof o[iteratorSymbol] === 'function';
}

function getIterator(o) {
  return o[iteratorSymbol]();
}

function makeIterable(f, o) {
  o[iteratorSymbol] = f;
  return o;
}
},{}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromObservable = fromObservable;
exports.ObservableSource = ObservableSource;
exports.SubscriberSink = SubscriberSink;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('../source/tryEvent');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fromObservable(observable) {
  return new _Stream2.default(new ObservableSource(observable));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ObservableSource(observable) {
  this.observable = observable;
}

ObservableSource.prototype.run = function (sink, scheduler) {
  var sub = this.observable.subscribe(new SubscriberSink(sink, scheduler));
  if (typeof sub === 'function') {
    return dispose.create(sub);
  } else if (sub && typeof sub.unsubscribe === 'function') {
    return dispose.create(unsubscribe, sub);
  }

  throw new TypeError('Observable returned invalid subscription ' + String(sub));
};

function SubscriberSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
}

SubscriberSink.prototype.next = function (x) {
  (0, _tryEvent.tryEvent)(this.scheduler.now(), x, this.sink);
};

SubscriberSink.prototype.complete = function (x) {
  (0, _tryEvent.tryEnd)(this.scheduler.now(), x, this.sink);
};

SubscriberSink.prototype.error = function (e) {
  this.sink.error(this.scheduler.now(), e);
};

function unsubscribe(subscription) {
  return subscription.unsubscribe();
}
},{"../Stream":7,"../disposable/dispose":35,"../source/tryEvent":67}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getObservable;

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getObservable(o) {
  // eslint-disable-line complexity
  var obs = null;
  if (o) {
    // Access foreign method only once
    var method = o[_symbolObservable2.default];
    if (typeof method === 'function') {
      obs = method.call(o);
      if (!(obs && typeof obs.subscribe === 'function')) {
        throw new TypeError('invalid observable ' + obs);
      }
    }
  }

  return obs;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"symbol-observable":70}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.subscribe = subscribe;
exports.SubscribeObserver = SubscribeObserver;
exports.Subscription = Subscription;

var _defaultScheduler = require('../scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function subscribe(subscriber, stream) {
  if (Object(subscriber) !== subscriber) {
    throw new TypeError('subscriber must be an object');
  }

  var disposable = dispose.settable();
  var observer = new SubscribeObserver(_fatalError2.default, subscriber, disposable);

  disposable.setDisposable(stream.source.run(observer, _defaultScheduler2.default));

  return new Subscription(disposable);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SubscribeObserver(fatalError, subscriber, disposable) {
  this.fatalError = fatalError;
  this.subscriber = subscriber;
  this.disposable = disposable;
}

SubscribeObserver.prototype.event = function (t, x) {
  if (!this.disposable.disposed && typeof this.subscriber.next === 'function') {
    this.subscriber.next(x);
  }
};

SubscribeObserver.prototype.end = function (t, x) {
  if (!this.disposable.disposed) {
    var s = this.subscriber;
    var fatalError = this.fatalError;
    Promise.resolve(this.disposable.dispose()).then(function () {
      if (typeof s.complete === 'function') {
        s.complete(x);
      }
    }).catch(function (e) {
      throwError(e, s, fatalError);
    });
  }
};

SubscribeObserver.prototype.error = function (t, e) {
  var s = this.subscriber;
  var fatalError = this.fatalError;
  Promise.resolve(this.disposable.dispose()).then(function () {
    throwError(e, s, fatalError);
  });
};

function Subscription(disposable) {
  this.disposable = disposable;
}

Subscription.prototype.unsubscribe = function () {
  this.disposable.dispose();
};

function throwError(e1, subscriber, throwError) {
  if (typeof subscriber.error === 'function') {
    try {
      subscriber.error(e1);
    } catch (e2) {
      throwError(e2);
    }
  } else {
    throwError(e1);
  }
}
},{"../disposable/dispose":35,"../fatalError":36,"../scheduler/defaultScheduler":52}],46:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withDefaultScheduler = withDefaultScheduler;
exports.withScheduler = withScheduler;

var _dispose = require('./disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _defaultScheduler = require('./scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function withDefaultScheduler(source) {
  return withScheduler(source, _defaultScheduler2.default);
}

function withScheduler(source, scheduler) {
  return new Promise(function (resolve, reject) {
    runSource(source, scheduler, resolve, reject);
  });
}

function runSource(source, scheduler, resolve, reject) {
  var disposable = dispose.settable();
  var observer = new Drain(resolve, reject, disposable);

  disposable.setDisposable(source.run(observer, scheduler));
}

function Drain(end, error, disposable) {
  this._end = end;
  this._error = error;
  this._disposable = disposable;
  this.active = true;
}

Drain.prototype.event = function (t, x) {};

Drain.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.active = false;
  disposeThen(this._end, this._error, this._disposable, x);
};

Drain.prototype.error = function (t, e) {
  this.active = false;
  disposeThen(this._error, this._error, this._disposable, e);
};

function disposeThen(end, error, disposable, x) {
  Promise.resolve(disposable.dispose()).then(function () {
    end(x);
  }, error);
}
},{"./disposable/dispose":35,"./scheduler/defaultScheduler":52}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ClockTimer;

var _task = require('../task');

/*global setTimeout, clearTimeout*/

function ClockTimer() {} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

ClockTimer.prototype.now = Date.now;

ClockTimer.prototype.setTimer = function (f, dt) {
  return dt <= 0 ? runAsap(f) : setTimeout(f, dt);
};

ClockTimer.prototype.clearTimer = function (t) {
  return t instanceof Asap ? t.cancel() : clearTimeout(t);
};

function Asap(f) {
  this.f = f;
  this.active = true;
}

Asap.prototype.run = function () {
  return this.active && this.f();
};

Asap.prototype.error = function (e) {
  throw e;
};

Asap.prototype.cancel = function () {
  this.active = false;
};

function runAsap(f) {
  var task = new Asap(f);
  (0, _task.defer)(task);
  return task;
}
},{"../task":69}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = PropagateTask;

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function PropagateTask(run, value, sink) {
  this._run = run;
  this.value = value;
  this.sink = sink;
  this.active = true;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

PropagateTask.event = function (value, sink) {
  return new PropagateTask(emit, value, sink);
};

PropagateTask.end = function (value, sink) {
  return new PropagateTask(end, value, sink);
};

PropagateTask.error = function (value, sink) {
  return new PropagateTask(error, value, sink);
};

PropagateTask.prototype.dispose = function () {
  this.active = false;
};

PropagateTask.prototype.run = function (t) {
  if (!this.active) {
    return;
  }
  this._run(t, this.value, this.sink);
};

PropagateTask.prototype.error = function (t, e) {
  if (!this.active) {
    return (0, _fatalError2.default)(e);
  }
  this.sink.error(t, e);
};

function error(t, e, sink) {
  sink.error(t, e);
}

function emit(t, x, sink) {
  sink.event(t, x);
}

function end(t, x, sink) {
  sink.end(t, x);
}
},{"../fatalError":36}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ScheduledTask;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ScheduledTask(delay, period, task, scheduler) {
  this.time = delay;
  this.period = period;
  this.task = task;
  this.scheduler = scheduler;
  this.active = true;
}

ScheduledTask.prototype.run = function () {
  return this.task.run(this.time);
};

ScheduledTask.prototype.error = function (e) {
  return this.task.error(this.time, e);
};

ScheduledTask.prototype.dispose = function () {
  this.scheduler.cancel(this);
  return this.task.dispose();
};
},{}],50:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Scheduler;

var _ScheduledTask = require('./ScheduledTask');

var _ScheduledTask2 = _interopRequireDefault(_ScheduledTask);

var _task = require('../task');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Scheduler(timer, timeline) {
  this.timer = timer;
  this.timeline = timeline;

  this._timer = null;
  this._nextArrival = Infinity;

  var self = this;
  this._runReadyTasksBound = function () {
    self._runReadyTasks(self.now());
  };
}

Scheduler.prototype.now = function () {
  return this.timer.now();
};

Scheduler.prototype.asap = function (task) {
  return this.schedule(0, -1, task);
};

Scheduler.prototype.delay = function (delay, task) {
  return this.schedule(delay, -1, task);
};

Scheduler.prototype.periodic = function (period, task) {
  return this.schedule(0, period, task);
};

Scheduler.prototype.schedule = function (delay, period, task) {
  var now = this.now();
  var st = new _ScheduledTask2.default(now + Math.max(0, delay), period, task, this);

  this.timeline.add(st);
  this._scheduleNextRun(now);
  return st;
};

Scheduler.prototype.cancel = function (task) {
  task.active = false;
  if (this.timeline.remove(task)) {
    this._reschedule();
  }
};

Scheduler.prototype.cancelAll = function (f) {
  this.timeline.removeAll(f);
  this._reschedule();
};

Scheduler.prototype._reschedule = function () {
  if (this.timeline.isEmpty()) {
    this._unschedule();
  } else {
    this._scheduleNextRun(this.now());
  }
};

Scheduler.prototype._unschedule = function () {
  this.timer.clearTimer(this._timer);
  this._timer = null;
};

Scheduler.prototype._scheduleNextRun = function (now) {
  // eslint-disable-line complexity
  if (this.timeline.isEmpty()) {
    return;
  }

  var nextArrival = this.timeline.nextArrival();

  if (this._timer === null) {
    this._scheduleNextArrival(nextArrival, now);
  } else if (nextArrival < this._nextArrival) {
    this._unschedule();
    this._scheduleNextArrival(nextArrival, now);
  }
};

Scheduler.prototype._scheduleNextArrival = function (nextArrival, now) {
  this._nextArrival = nextArrival;
  var delay = Math.max(0, nextArrival - now);
  this._timer = this.timer.setTimer(this._runReadyTasksBound, delay);
};

Scheduler.prototype._runReadyTasks = function (now) {
  this._timer = null;
  this.timeline.runTasks(now, _task.runTask);
  this._scheduleNextRun(this.now());
};
},{"../task":69,"./ScheduledTask":49}],51:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Timeline;

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function Timeline() {
  this.tasks = [];
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

Timeline.prototype.nextArrival = function () {
  return this.isEmpty() ? Infinity : this.tasks[0].time;
};

Timeline.prototype.isEmpty = function () {
  return this.tasks.length === 0;
};

Timeline.prototype.add = function (st) {
  insertByTime(st, this.tasks);
};

Timeline.prototype.remove = function (st) {
  var i = binarySearch(st.time, this.tasks);

  if (i >= 0 && i < this.tasks.length) {
    var at = base.findIndex(st, this.tasks[i].events);
    if (at >= 0) {
      this.tasks[i].events.splice(at, 1);
      return true;
    }
  }

  return false;
};

Timeline.prototype.removeAll = function (f) {
  var this$1 = this;

  for (var i = 0, l = this.tasks.length; i < l; ++i) {
    removeAllFrom(f, this$1.tasks[i]);
  }
};

Timeline.prototype.runTasks = function (t, runTask) {
  var this$1 = this;

  var tasks = this.tasks;
  var l = tasks.length;
  var i = 0;

  while (i < l && tasks[i].time <= t) {
    ++i;
  }

  this.tasks = tasks.slice(i);

  // Run all ready tasks
  for (var j = 0; j < i; ++j) {
    this$1.tasks = runTasks(runTask, tasks[j], this$1.tasks);
  }
};

function runTasks(runTask, timeslot, tasks) {
  // eslint-disable-line complexity
  var events = timeslot.events;
  for (var i = 0; i < events.length; ++i) {
    var task = events[i];

    if (task.active) {
      runTask(task);

      // Reschedule periodic repeating tasks
      // Check active again, since a task may have canceled itself
      if (task.period >= 0 && task.active) {
        task.time = task.time + task.period;
        insertByTime(task, tasks);
      }
    }
  }

  return tasks;
}

function insertByTime(task, timeslots) {
  // eslint-disable-line complexity
  var l = timeslots.length;

  if (l === 0) {
    timeslots.push(newTimeslot(task.time, [task]));
    return;
  }

  var i = binarySearch(task.time, timeslots);

  if (i >= l) {
    timeslots.push(newTimeslot(task.time, [task]));
  } else if (task.time === timeslots[i].time) {
    timeslots[i].events.push(task);
  } else {
    timeslots.splice(i, 0, newTimeslot(task.time, [task]));
  }
}

function removeAllFrom(f, timeslot) {
  timeslot.events = base.removeAll(f, timeslot.events);
}

function binarySearch(t, sortedArray) {
  // eslint-disable-line complexity
  var lo = 0;
  var hi = sortedArray.length;
  var mid, y;

  while (lo < hi) {
    mid = Math.floor((lo + hi) / 2);
    y = sortedArray[mid];

    if (t === y.time) {
      return mid;
    } else if (t < y.time) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return hi;
}

function newTimeslot(t, events) {
  return { time: t, events: events };
}
},{"@most/prelude":3}],52:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Scheduler = require('./Scheduler');

var _Scheduler2 = _interopRequireDefault(_Scheduler);

var _ClockTimer = require('./ClockTimer');

var _ClockTimer2 = _interopRequireDefault(_ClockTimer);

var _Timeline = require('./Timeline');

var _Timeline2 = _interopRequireDefault(_Timeline);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultScheduler = new _Scheduler2.default(new _ClockTimer2.default(), new _Timeline2.default()); /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.default = defaultScheduler;
},{"./ClockTimer":47,"./Scheduler":50,"./Timeline":51}],53:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = DeferredSink;

var _task = require('../task');

function DeferredSink(sink) {
  this.sink = sink;
  this.events = [];
  this.active = true;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

DeferredSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }

  if (this.events.length === 0) {
    (0, _task.defer)(new PropagateAllTask(this.sink, t, this.events));
  }

  this.events.push({ time: t, value: x });
};

DeferredSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }

  this._end(new EndTask(t, x, this.sink));
};

DeferredSink.prototype.error = function (t, e) {
  this._end(new ErrorTask(t, e, this.sink));
};

DeferredSink.prototype._end = function (task) {
  this.active = false;
  (0, _task.defer)(task);
};

function PropagateAllTask(sink, time, events) {
  this.sink = sink;
  this.events = events;
  this.time = time;
}

PropagateAllTask.prototype.run = function () {
  var this$1 = this;

  var events = this.events;
  var sink = this.sink;
  var event;

  for (var i = 0, l = events.length; i < l; ++i) {
    event = events[i];
    this$1.time = event.time;
    sink.event(event.time, event.value);
  }

  events.length = 0;
};

PropagateAllTask.prototype.error = function (e) {
  this.sink.error(this.time, e);
};

function EndTask(t, x, sink) {
  this.time = t;
  this.value = x;
  this.sink = sink;
}

EndTask.prototype.run = function () {
  this.sink.end(this.time, this.value);
};

EndTask.prototype.error = function (e) {
  this.sink.error(this.time, e);
};

function ErrorTask(t, e, sink) {
  this.time = t;
  this.value = e;
  this.sink = sink;
}

ErrorTask.prototype.run = function () {
  this.sink.error(this.time, this.value);
};

ErrorTask.prototype.error = function (e) {
  throw e;
};
},{"../task":69}],54:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = IndexSink;

var _Pipe = require('./Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function IndexSink(i, sink) {
  this.sink = sink;
  this.index = i;
  this.active = true;
  this.value = void 0;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

IndexSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.value = x;
  this.sink.event(t, this);
};

IndexSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.active = false;
  this.sink.end(t, { index: this.index, value: x });
};

IndexSink.prototype.error = _Pipe2.default.prototype.error;
},{"./Pipe":55}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Pipe;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * A sink mixin that simply forwards event, end, and error to
 * another sink.
 * @param sink
 * @constructor
 */
function Pipe(sink) {
  this.sink = sink;
}

Pipe.prototype.event = function (t, x) {
  return this.sink.event(t, x);
};

Pipe.prototype.end = function (t, x) {
  return this.sink.end(t, x);
};

Pipe.prototype.error = function (t, e) {
  return this.sink.error(t, e);
};
},{}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SafeSink;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SafeSink(sink) {
  this.sink = sink;
  this.active = true;
}

SafeSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.sink.event(t, x);
};

SafeSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.disable();
  this.sink.end(t, x);
};

SafeSink.prototype.error = function (t, e) {
  this.disable();
  this.sink.error(t, e);
};

SafeSink.prototype.disable = function () {
  this.active = false;
  return this.sink;
};
},{}],57:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventEmitterSource;

var _DeferredSink = require('../sink/DeferredSink');

var _DeferredSink2 = _interopRequireDefault(_DeferredSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('./tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function EventEmitterSource(event, source) {
  this.event = event;
  this.source = source;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

EventEmitterSource.prototype.run = function (sink, scheduler) {
  // NOTE: Because EventEmitter allows events in the same call stack as
  // a listener is added, use a DeferredSink to buffer events
  // until the stack clears, then propagate.  This maintains most.js's
  // invariant that no event will be delivered in the same call stack
  // as an observer begins observing.
  var dsink = new _DeferredSink2.default(sink);

  function addEventVariadic(a) {
    var arguments$1 = arguments;

    var l = arguments.length;
    if (l > 1) {
      var arr = new Array(l);
      for (var i = 0; i < l; ++i) {
        arr[i] = arguments$1[i];
      }
      tryEvent.tryEvent(scheduler.now(), arr, dsink);
    } else {
      tryEvent.tryEvent(scheduler.now(), a, dsink);
    }
  }

  this.source.addListener(this.event, addEventVariadic);

  return dispose.create(disposeEventEmitter, { target: this, addEvent: addEventVariadic });
};

function disposeEventEmitter(info) {
  var target = info.target;
  target.source.removeListener(target.event, info.addEvent);
}
},{"../disposable/dispose":35,"../sink/DeferredSink":53,"./tryEvent":67}],58:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventTargetSource;

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('./tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function EventTargetSource(event, source, capture) {
  this.event = event;
  this.source = source;
  this.capture = capture;
}

EventTargetSource.prototype.run = function (sink, scheduler) {
  function addEvent(e) {
    tryEvent.tryEvent(scheduler.now(), e, sink);
  }

  this.source.addEventListener(this.event, addEvent, this.capture);

  return dispose.create(disposeEventTarget, { target: this, addEvent: addEvent });
};

function disposeEventTarget(info) {
  var target = info.target;
  target.source.removeEventListener(target.event, info.addEvent, target.capture);
}
},{"../disposable/dispose":35,"./tryEvent":67}],59:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.of = of;
exports.empty = empty;
exports.never = never;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Stream containing only x
 * @param {*} x
 * @returns {Stream}
 */
function of(x) {
  return new _Stream2.default(new Just(x));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Just(x) {
  this.value = x;
}

Just.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runJust, this.value, sink));
};

function runJust(t, x, sink) {
  sink.event(t, x);
  sink.end(t, void 0);
}

/**
 * Stream containing no events and ends immediately
 * @returns {Stream}
 */
function empty() {
  return EMPTY;
}

function EmptySource() {}

EmptySource.prototype.run = function (sink, scheduler) {
  var task = _PropagateTask2.default.end(void 0, sink);
  scheduler.asap(task);

  return dispose.create(disposeEmpty, task);
};

function disposeEmpty(task) {
  return task.dispose();
}

var EMPTY = new _Stream2.default(new EmptySource());

/**
 * Stream containing no events and never ends
 * @returns {Stream}
 */
function never() {
  return NEVER;
}

function NeverSource() {}

NeverSource.prototype.run = function () {
  return dispose.empty();
};

var NEVER = new _Stream2.default(new NeverSource());
},{"../Stream":7,"../disposable/dispose":35,"../scheduler/PropagateTask":48}],60:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.from = from;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _fromArray = require('./fromArray');

var _iterable = require('../iterable');

var _fromIterable = require('./fromIterable');

var _getObservable = require('../observable/getObservable');

var _getObservable2 = _interopRequireDefault(_getObservable);

var _fromObservable = require('../observable/fromObservable');

var _prelude = require('@most/prelude');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function from(a) {
  // eslint-disable-line complexity
  if (a instanceof _Stream2.default) {
    return a;
  }

  var observable = (0, _getObservable2.default)(a);
  if (observable != null) {
    return (0, _fromObservable.fromObservable)(observable);
  }

  if (Array.isArray(a) || (0, _prelude.isArrayLike)(a)) {
    return (0, _fromArray.fromArray)(a);
  }

  if ((0, _iterable.isIterable)(a)) {
    return (0, _fromIterable.fromIterable)(a);
  }

  throw new TypeError('from(x) must be observable, iterable, or array-like: ' + a);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"../Stream":7,"../iterable":42,"../observable/fromObservable":43,"../observable/getObservable":44,"./fromArray":61,"./fromIterable":63,"@most/prelude":3}],61:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromArray = fromArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fromArray(a) {
  return new _Stream2.default(new ArraySource(a));
}

function ArraySource(a) {
  this.array = a;
}

ArraySource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runProducer, this.array, sink));
};

function runProducer(t, array, sink) {
  for (var i = 0, l = array.length; i < l && this.active; ++i) {
    sink.event(t, array[i]);
  }

  this.active && sink.end(t);
}
},{"../Stream":7,"../scheduler/PropagateTask":48}],62:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromEvent = fromEvent;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _EventTargetSource = require('./EventTargetSource');

var _EventTargetSource2 = _interopRequireDefault(_EventTargetSource);

var _EventEmitterSource = require('./EventEmitterSource');

var _EventEmitterSource2 = _interopRequireDefault(_EventEmitterSource);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream from an EventTarget, such as a DOM Node, or EventEmitter.
 * @param {String} event event type name, e.g. 'click'
 * @param {EventTarget|EventEmitter} source EventTarget or EventEmitter
 * @param {*?} capture for DOM events, whether to use
 *  capturing--passed as 3rd parameter to addEventListener.
 * @returns {Stream} stream containing all events of the specified type
 * from the source.
 */
function fromEvent(event, source, capture) {
  // eslint-disable-line complexity
  var s;

  if (typeof source.addEventListener === 'function' && typeof source.removeEventListener === 'function') {
    if (arguments.length < 3) {
      capture = false;
    }

    s = new _EventTargetSource2.default(event, source, capture);
  } else if (typeof source.addListener === 'function' && typeof source.removeListener === 'function') {
    s = new _EventEmitterSource2.default(event, source);
  } else {
    throw new Error('source must support addEventListener/removeEventListener or addListener/removeListener');
  }

  return new _Stream2.default(s);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"../Stream":7,"./EventEmitterSource":57,"./EventTargetSource":58}],63:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromIterable = fromIterable;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _iterable = require('../iterable');

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fromIterable(iterable) {
  return new _Stream2.default(new IterableSource(iterable));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function IterableSource(iterable) {
  this.iterable = iterable;
}

IterableSource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runProducer, (0, _iterable.getIterator)(this.iterable), sink));
};

function runProducer(t, iterator, sink) {
  var r = iterator.next();

  while (!r.done && this.active) {
    sink.event(t, r.value);
    r = iterator.next();
  }

  sink.end(t, r.value);
}
},{"../Stream":7,"../iterable":42,"../scheduler/PropagateTask":48}],64:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generate = generate;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compute a stream using an *async* generator, which yields promises
 * to control event times.
 * @param f
 * @returns {Stream}
 */
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function generate(f /*, ...args */) {
  return new _Stream2.default(new GenerateSource(f, base.tail(arguments)));
}

function GenerateSource(f, args) {
  this.f = f;
  this.args = args;
}

GenerateSource.prototype.run = function (sink, scheduler) {
  return new Generate(this.f.apply(void 0, this.args), sink, scheduler);
};

function Generate(iterator, sink, scheduler) {
  this.iterator = iterator;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  Promise.resolve(this).then(next).catch(err);
}

function next(generate, x) {
  return generate.active ? handle(generate, generate.iterator.next(x)) : x;
}

function handle(generate, result) {
  if (result.done) {
    return generate.sink.end(generate.scheduler.now(), result.value);
  }

  return Promise.resolve(result.value).then(function (x) {
    return emit(generate, x);
  }, function (e) {
    return error(generate, e);
  });
}

function emit(generate, x) {
  generate.sink.event(generate.scheduler.now(), x);
  return next(generate, x);
}

function error(generate, e) {
  return handle(generate, generate.iterator.throw(e));
}

Generate.prototype.dispose = function () {
  this.active = false;
};
},{"../Stream":7,"@most/prelude":3}],65:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.iterate = iterate;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compute a stream by iteratively calling f to produce values
 * Event times may be controlled by returning a Promise from f
 * @param {function(x:*):*|Promise<*>} f
 * @param {*} x initial value
 * @returns {Stream}
 */
function iterate(f, x) {
  return new _Stream2.default(new IterateSource(f, x));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function IterateSource(f, x) {
  this.f = f;
  this.value = x;
}

IterateSource.prototype.run = function (sink, scheduler) {
  return new Iterate(this.f, this.value, sink, scheduler);
};

function Iterate(f, initial, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var x = initial;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  function start(iterate) {
    return stepIterate(iterate, x);
  }

  Promise.resolve(this).then(start).catch(err);
}

Iterate.prototype.dispose = function () {
  this.active = false;
};

function stepIterate(iterate, x) {
  iterate.sink.event(iterate.scheduler.now(), x);

  if (!iterate.active) {
    return x;
  }

  var f = iterate.f;
  return Promise.resolve(f(x)).then(function (y) {
    return continueIterate(iterate, y);
  });
}

function continueIterate(iterate, x) {
  return !iterate.active ? iterate.value : stepIterate(iterate, x);
}
},{"../Stream":7}],66:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.periodic = periodic;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream that emits the current time periodically
 * @param {Number} period periodicity of events in millis
 * @param {*} deprecatedValue @deprecated value to emit each period
 * @returns {Stream} new stream that emits the current time every period
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function periodic(period, deprecatedValue) {
  return new _Stream2.default(new Periodic(period, deprecatedValue));
}

function Periodic(period, value) {
  this.period = period;
  this.value = value;
}

Periodic.prototype.run = function (sink, scheduler) {
  return scheduler.periodic(this.period, _PropagateTask2.default.event(this.value, sink));
};
},{"../Stream":7,"../scheduler/PropagateTask":48}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tryEvent = tryEvent;
exports.tryEnd = tryEnd;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function tryEvent(t, x, sink) {
  try {
    sink.event(t, x);
  } catch (e) {
    sink.error(t, e);
  }
}

function tryEnd(t, x, sink) {
  try {
    sink.end(t, x);
  } catch (e) {
    sink.error(t, e);
  }
}
},{}],68:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unfold = unfold;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compute a stream by unfolding tuples of future values from a seed value
 * Event times may be controlled by returning a Promise from f
 * @param {function(seed:*):{value:*, seed:*, done:boolean}|Promise<{value:*, seed:*, done:boolean}>} f unfolding function accepts
 *  a seed and returns a new tuple with a value, new seed, and boolean done flag.
 *  If tuple.done is true, the stream will end.
 * @param {*} seed seed value
 * @returns {Stream} stream containing all value of all tuples produced by the
 *  unfolding function.
 */
function unfold(f, seed) {
  return new _Stream2.default(new UnfoldSource(f, seed));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function UnfoldSource(f, seed) {
  this.f = f;
  this.value = seed;
}

UnfoldSource.prototype.run = function (sink, scheduler) {
  return new Unfold(this.f, this.value, sink, scheduler);
};

function Unfold(f, x, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  function start(unfold) {
    return stepUnfold(unfold, x);
  }

  Promise.resolve(this).then(start).catch(err);
}

Unfold.prototype.dispose = function () {
  this.active = false;
};

function stepUnfold(unfold, x) {
  var f = unfold.f;
  return Promise.resolve(f(x)).then(function (tuple) {
    return continueUnfold(unfold, tuple);
  });
}

function continueUnfold(unfold, tuple) {
  if (tuple.done) {
    unfold.sink.end(unfold.scheduler.now(), tuple.value);
    return tuple.value;
  }

  unfold.sink.event(unfold.scheduler.now(), tuple.value);

  if (!unfold.active) {
    return tuple.value;
  }
  return stepUnfold(unfold, tuple.seed);
}
},{"../Stream":7}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defer = defer;
exports.runTask = runTask;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function defer(task) {
  return Promise.resolve(task).then(runTask);
}

function runTask(task) {
  try {
    return task.run();
  } catch (e) {
    return task.error(e);
  }
}
},{}],70:[function(require,module,exports){
module.exports = require('./lib/index');

},{"./lib/index":71}],71:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ponyfill = require('./ponyfill');

var _ponyfill2 = _interopRequireDefault(_ponyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var root; /* global window */


if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = (0, _ponyfill2['default'])(root);
exports['default'] = result;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ponyfill":72}],72:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports['default'] = symbolObservablePonyfill;
function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};
},{}],73:[function(require,module,exports){
"use strict";

if('requestAnimationFrame' in window && 'GamepadEvent' in window){
    window.padstream = []
    const ppad = []
    for(let i=0; i<4; i++){
        window.padstream.push(new Promise((resolve, reject)=>{
            ppad.push({resolve:resolve,reject:reject})
        }))
    }

    window.addEventListener("gamepadconnected", (e)=>{
        const pad = {}
        pad.idx = e.gamepad.index

        const mostcreate = require('@most/create')
        const streamtap = {}
        streamtap.add = function(){}
        streamtap.end = function(){}
        streamtap.err = function(){}
        pad.tap = streamtap

        pad.stream = mostcreate.create((add,end,err)=>{
            streamtap.add = add
            streamtap.end = end
            streamtap.err = err

            const _gl = genloop(pad)
            _gl.next()
            const gl = _gl.next.bind(_gl)
            pad.gl = gl

            pad.aFI = requestAnimationFrame(pad.gl)
        })

        ppad[pad.idx].resolve(pad)
        console.dir(e.gamepad);

        window.addEventListener("gamepaddisconnected", (e)=>{
            console.log("Gamepad disconnected from index %d",e.gamepad.index)
            window.padstream[e.gamepad.index].then(pad=>{
                pad.tap.end()
                cancelAnimationFrame(pad.aFI)
            })
            /*
            **  chrome bug:
            **    reflesh page ->
            **      gamepaddisconnected fires,
            **      gamepadconnected not fires
            */
            window.padstream[e.gamepad.index] = new Promise((resolve, reject)=>{
                ppad[e.gamepad.index] = {resolve:resolve,reject:reject}
            })
        })
    })
}else{
    console.error("browser sem suporte apropriado")
}

function* genloop(pad){
    let lstDraw = 0
    let dt
    let t

    let snappad;

    while(true){
        t = yield
        snappad = navigator.getGamepads()[pad.idx]
        // windows:
        //let {axes:[dx,dy]} = snappad
        // linux:
        let {axes:[dx,undefined,dy]} = snappad

        pad.tap.add(`{"timestamp":${t},"v":${dy},"h":${dx}}`)

        pad.aFI = requestAnimationFrame(pad.gl)
    }
}

/*
padstream[0].then(pad=>{
	pad.stream.observe(console.log)
})
*/

},{"@most/create":1}]},{},[73])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9AbW9zdC9jcmVhdGUvZGlzdC9jcmVhdGUuanMiLCJub2RlX21vZHVsZXMvQG1vc3QvbXVsdGljYXN0L2Rpc3QvbXVsdGljYXN0LmpzIiwibm9kZV9tb2R1bGVzL0Btb3N0L3ByZWx1ZGUvZGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9MaW5rZWRMaXN0LmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL1Byb21pc2UuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvUXVldWUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvU3RyZWFtLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvYWNjdW11bGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL2FwcGxpY2F0aXZlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvYnVpbGQuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9jb21iaW5lLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvY29uY2F0TWFwLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvY29udGludWVXaXRoLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvZGVsYXkuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9lcnJvcnMuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9maWx0ZXIuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9mbGF0TWFwLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvbGltaXQuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9sb29wLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvbWVyZ2UuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9tZXJnZUNvbmN1cnJlbnRseS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL29ic2VydmUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvY29tYmluYXRvci9wcm9taXNlcy5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3NhbXBsZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3NsaWNlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3Ivc3dpdGNoLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2NvbWJpbmF0b3IvdGhydS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3RpbWVzbGljZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3RpbWVzdGFtcC5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3RyYW5zZHVjZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3RyYW5zZm9ybS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9jb21iaW5hdG9yL3ppcC5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9kaXNwb3NhYmxlL0Rpc3Bvc2FibGUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvZGlzcG9zYWJsZS9TZXR0YWJsZURpc3Bvc2FibGUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvZGlzcG9zYWJsZS9kaXNwb3NlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2ZhdGFsRXJyb3IuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvZnVzaW9uL0ZpbHRlci5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9mdXNpb24vRmlsdGVyTWFwLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2Z1c2lvbi9NYXAuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvaW52b2tlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL2l0ZXJhYmxlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL29ic2VydmFibGUvZnJvbU9ic2VydmFibGUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvb2JzZXJ2YWJsZS9nZXRPYnNlcnZhYmxlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL29ic2VydmFibGUvc3Vic2NyaWJlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL3J1blNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zY2hlZHVsZXIvQ2xvY2tUaW1lci5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zY2hlZHVsZXIvUHJvcGFnYXRlVGFzay5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zY2hlZHVsZXIvU2NoZWR1bGVkVGFzay5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zY2hlZHVsZXIvU2NoZWR1bGVyLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL3NjaGVkdWxlci9UaW1lbGluZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zY2hlZHVsZXIvZGVmYXVsdFNjaGVkdWxlci5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zaW5rL0RlZmVycmVkU2luay5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zaW5rL0luZGV4U2luay5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zaW5rL1BpcGUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvc2luay9TYWZlU2luay5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zb3VyY2UvRXZlbnRFbWl0dGVyU291cmNlLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL3NvdXJjZS9FdmVudFRhcmdldFNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zb3VyY2UvY29yZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zb3VyY2UvZnJvbS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zb3VyY2UvZnJvbUFycmF5LmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL3NvdXJjZS9mcm9tRXZlbnQuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvc291cmNlL2Zyb21JdGVyYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zb3VyY2UvZ2VuZXJhdGUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvc291cmNlL2l0ZXJhdGUuanMiLCJub2RlX21vZHVsZXMvbW9zdC9saWIvc291cmNlL3BlcmlvZGljLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL3NvdXJjZS90cnlFdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9tb3N0L2xpYi9zb3VyY2UvdW5mb2xkLmpzIiwibm9kZV9tb2R1bGVzL21vc3QvbGliL3Rhc2suanMiLCJub2RlX21vZHVsZXMvc3ltYm9sLW9ic2VydmFibGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc3ltYm9sLW9ic2VydmFibGUvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N5bWJvbC1vYnNlcnZhYmxlL2xpYi9wb255ZmlsbC5qcyIsInBhZHN0cmVhbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoMEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBOzs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdtb3N0JyksIHJlcXVpcmUoJ0Btb3N0L211bHRpY2FzdCcpKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnLCAnbW9zdCcsICdAbW9zdC9tdWx0aWNhc3QnXSwgZmFjdG9yeSkgOlxuICAoZmFjdG9yeSgoZ2xvYmFsLm1vc3RDcmVhdGUgPSBnbG9iYWwubW9zdENyZWF0ZSB8fCB7fSksZ2xvYmFsLm1vc3QsZ2xvYmFsLm1vc3RNdWx0aWNhc3QpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzLG1vc3QsX21vc3RfbXVsdGljYXN0KSB7ICd1c2Ugc3RyaWN0JztcblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbmZ1bmN0aW9uIGRlZmVyICh0YXNrKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUodGFzaykudGhlbihydW5UYXNrKTsgfVxuXG5mdW5jdGlvbiBydW5UYXNrICh0YXNrKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHRhc2sucnVuKClcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB0YXNrLmVycm9yKGUpXG4gIH1cbn1cblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbnZhciBQcm9wYWdhdGVBbGxUYXNrID0gZnVuY3Rpb24gUHJvcGFnYXRlQWxsVGFzayAoc2luaywgdGltZSwgZXZlbnRzKSB7XG4gIHRoaXMuc2luayA9IHNpbmtcbiAgdGhpcy50aW1lID0gdGltZVxuICB0aGlzLmV2ZW50cyA9IGV2ZW50c1xufTtcblxuUHJvcGFnYXRlQWxsVGFzay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gcnVuICgpIHtcbiAgICB2YXIgdGhpcyQxID0gdGhpcztcblxuICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHNcbiAgdmFyIHNpbmsgPSB0aGlzLnNpbmtcbiAgdmFyIGV2ZW50XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBldmVudHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgZXZlbnQgPSBldmVudHNbaV1cbiAgICB0aGlzJDEudGltZSA9IGV2ZW50LnRpbWVcbiAgICBzaW5rLmV2ZW50KGV2ZW50LnRpbWUsIGV2ZW50LnZhbHVlKVxuICB9XG5cbiAgZXZlbnRzLmxlbmd0aCA9IDBcbn07XG5cblByb3BhZ2F0ZUFsbFRhc2sucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gZXJyb3IgKGUpIHtcbiAgdGhpcy5zaW5rLmVycm9yKHRoaXMudGltZSwgZSlcbn07XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuXG52YXIgRW5kVGFzayA9IGZ1bmN0aW9uIEVuZFRhc2sgKHQsIHgsIHNpbmspIHtcbiAgdGhpcy50aW1lID0gdFxuICB0aGlzLnZhbHVlID0geFxuICB0aGlzLnNpbmsgPSBzaW5rXG59O1xuXG5FbmRUYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiBydW4gKCkge1xuICB0aGlzLnNpbmsuZW5kKHRoaXMudGltZSwgdGhpcy52YWx1ZSlcbn07XG5cbkVuZFRhc2sucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gZXJyb3IgKGUpIHtcbiAgdGhpcy5zaW5rLmVycm9yKHRoaXMudGltZSwgZSlcbn07XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuXG52YXIgRXJyb3JUYXNrID0gZnVuY3Rpb24gRXJyb3JUYXNrICh0LCBlLCBzaW5rKSB7XG4gIHRoaXMudGltZSA9IHRcbiAgdGhpcy52YWx1ZSA9IGVcbiAgdGhpcy5zaW5rID0gc2lua1xufTtcblxuRXJyb3JUYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiBydW4gKCkge1xuICB0aGlzLnNpbmsuZXJyb3IodGhpcy50aW1lLCB0aGlzLnZhbHVlKVxufTtcblxuRXJyb3JUYXNrLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIGVycm9yIChlKSB7XG4gIHRocm93IGVcbn07XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuXG52YXIgRGVmZXJyZWRTaW5rID0gZnVuY3Rpb24gRGVmZXJyZWRTaW5rIChzaW5rKSB7XG4gIHRoaXMuc2luayA9IHNpbmtcbiAgdGhpcy5ldmVudHMgPSBbXVxuICB0aGlzLmFjdGl2ZSA9IHRydWVcbn07XG5cbkRlZmVycmVkU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiBldmVudCAodCwgeCkge1xuICBpZiAoIXRoaXMuYWN0aXZlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAodGhpcy5ldmVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZGVmZXIobmV3IFByb3BhZ2F0ZUFsbFRhc2sodGhpcy5zaW5rLCB0LCB0aGlzLmV2ZW50cykpXG4gIH1cblxuICB0aGlzLmV2ZW50cy5wdXNoKHsgdGltZTogdCwgdmFsdWU6IHggfSlcbn07XG5cbkRlZmVycmVkU2luay5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gZW5kICh0LCB4KSB7XG4gIGlmICghdGhpcy5hY3RpdmUpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHRoaXMuX2VuZChuZXcgRW5kVGFzayh0LCB4LCB0aGlzLnNpbmspKVxufTtcblxuRGVmZXJyZWRTaW5rLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIGVycm9yICh0LCBlKSB7XG4gIHRoaXMuX2VuZChuZXcgRXJyb3JUYXNrKHQsIGUsIHRoaXMuc2luaykpXG59O1xuXG5EZWZlcnJlZFNpbmsucHJvdG90eXBlLl9lbmQgPSBmdW5jdGlvbiBfZW5kICh0YXNrKSB7XG4gIHRoaXMuYWN0aXZlID0gZmFsc2VcbiAgZGVmZXIodGFzaylcbn07XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuXG52YXIgQ3JlYXRlU3Vic2NyaWJlciA9IGZ1bmN0aW9uIENyZWF0ZVN1YnNjcmliZXIgKHNpbmssIHNjaGVkdWxlciwgc3Vic2NyaWJlKSB7XG4gIHRoaXMuc2luayA9IHNpbmtcbiAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXJcbiAgdGhpcy5fdW5zdWJzY3JpYmUgPSB0aGlzLl9pbml0KHN1YnNjcmliZSlcbn07XG5cbkNyZWF0ZVN1YnNjcmliZXIucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24gX2luaXQgKHN1YnNjcmliZSkge1xuICAgIHZhciB0aGlzJDEgPSB0aGlzO1xuXG4gIHZhciBhZGQgPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4gdGhpcyQxLnNpbmsuZXZlbnQodGhpcyQxLnNjaGVkdWxlci5ub3coKSwgeCk7IH1cbiAgdmFyIGVuZCA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB0aGlzJDEuc2luay5lbmQodGhpcyQxLnNjaGVkdWxlci5ub3coKSwgeCk7IH1cbiAgdmFyIGVycm9yID0gZnVuY3Rpb24gKGUpIHsgcmV0dXJuIHRoaXMkMS5zaW5rLmVycm9yKHRoaXMkMS5zY2hlZHVsZXIubm93KCksIGUpOyB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gc3Vic2NyaWJlKGFkZCwgZW5kLCBlcnJvcilcbiAgfSBjYXRjaCAoZSkge1xuICAgIGVycm9yKGUpXG4gIH1cbn07XG5cbkNyZWF0ZVN1YnNjcmliZXIucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlICgpIHtcbiAgaWYgKHR5cGVvZiB0aGlzLl91bnN1YnNjcmliZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzLl91bnN1YnNjcmliZS5jYWxsKHZvaWQgMClcbiAgfVxufTtcblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbnZhciBDcmVhdGUgPSBmdW5jdGlvbiBDcmVhdGUgKHN1YnNjcmliZSkge1xuICB0aGlzLl9zdWJzY3JpYmUgPSBzdWJzY3JpYmVcbn07XG5cbkNyZWF0ZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gcnVuIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIG5ldyBDcmVhdGVTdWJzY3JpYmVyKG5ldyBEZWZlcnJlZFNpbmsoc2luayksIHNjaGVkdWxlciwgdGhpcy5fc3Vic2NyaWJlKVxufTtcblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuXG5mdW5jdGlvbiBjcmVhdGUgKHJ1bikge1xuICByZXR1cm4gbmV3IG1vc3QuU3RyZWFtKG5ldyBfbW9zdF9tdWx0aWNhc3QuTXVsdGljYXN0U291cmNlKG5ldyBDcmVhdGUocnVuKSkpXG59XG5cbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpOyIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cywgcmVxdWlyZSgnQG1vc3QvcHJlbHVkZScpKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnLCAnQG1vc3QvcHJlbHVkZSddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwubW9zdE11bHRpY2FzdCA9IGdsb2JhbC5tb3N0TXVsdGljYXN0IHx8IHt9KSxnbG9iYWwubW9zdFByZWx1ZGUpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzLF9tb3N0X3ByZWx1ZGUpIHsgJ3VzZSBzdHJpY3QnO1xuXG52YXIgTXVsdGljYXN0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uIE11bHRpY2FzdERpc3Bvc2FibGUgKHNvdXJjZSwgc2luaykge1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZVxuICB0aGlzLnNpbmsgPSBzaW5rXG4gIHRoaXMuZGlzcG9zZWQgPSBmYWxzZVxufTtcblxuTXVsdGljYXN0RGlzcG9zYWJsZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UgKCkge1xuICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgIHJldHVyblxuICB9XG4gIHRoaXMuZGlzcG9zZWQgPSB0cnVlXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLnNvdXJjZS5yZW1vdmUodGhpcy5zaW5rKVxuICByZXR1cm4gcmVtYWluaW5nID09PSAwICYmIHRoaXMuc291cmNlLl9kaXNwb3NlKClcbn07XG5cbmZ1bmN0aW9uIHRyeUV2ZW50ICh0LCB4LCBzaW5rKSB7XG4gIHRyeSB7XG4gICAgc2luay5ldmVudCh0LCB4KVxuICB9IGNhdGNoIChlKSB7XG4gICAgc2luay5lcnJvcih0LCBlKVxuICB9XG59XG5cbmZ1bmN0aW9uIHRyeUVuZCAodCwgeCwgc2luaykge1xuICB0cnkge1xuICAgIHNpbmsuZW5kKHQsIHgpXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBzaW5rLmVycm9yKHQsIGUpXG4gIH1cbn1cblxudmFyIGRpc3Bvc2UgPSBmdW5jdGlvbiAoZGlzcG9zYWJsZSkgeyByZXR1cm4gZGlzcG9zYWJsZS5kaXNwb3NlKCk7IH1cblxudmFyIGVtcHR5RGlzcG9zYWJsZSA9IHtcbiAgZGlzcG9zZTogZnVuY3Rpb24gZGlzcG9zZSQxICgpIHt9XG59XG5cbnZhciBNdWx0aWNhc3RTb3VyY2UgPSBmdW5jdGlvbiBNdWx0aWNhc3RTb3VyY2UgKHNvdXJjZSkge1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZVxuICB0aGlzLnNpbmtzID0gW11cbiAgdGhpcy5fZGlzcG9zYWJsZSA9IGVtcHR5RGlzcG9zYWJsZVxufTtcblxuTXVsdGljYXN0U291cmNlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiBydW4gKHNpbmssIHNjaGVkdWxlcikge1xuICB2YXIgbiA9IHRoaXMuYWRkKHNpbmspXG4gIGlmIChuID09PSAxKSB7XG4gICAgdGhpcy5fZGlzcG9zYWJsZSA9IHRoaXMuc291cmNlLnJ1bih0aGlzLCBzY2hlZHVsZXIpXG4gIH1cbiAgcmV0dXJuIG5ldyBNdWx0aWNhc3REaXNwb3NhYmxlKHRoaXMsIHNpbmspXG59O1xuXG5NdWx0aWNhc3RTb3VyY2UucHJvdG90eXBlLl9kaXNwb3NlID0gZnVuY3Rpb24gX2Rpc3Bvc2UgKCkge1xuICB2YXIgZGlzcG9zYWJsZSA9IHRoaXMuX2Rpc3Bvc2FibGVcbiAgdGhpcy5fZGlzcG9zYWJsZSA9IGVtcHR5RGlzcG9zYWJsZVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGRpc3Bvc2FibGUpLnRoZW4oZGlzcG9zZSlcbn07XG5cbk11bHRpY2FzdFNvdXJjZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkIChzaW5rKSB7XG4gIHRoaXMuc2lua3MgPSBfbW9zdF9wcmVsdWRlLmFwcGVuZChzaW5rLCB0aGlzLnNpbmtzKVxuICByZXR1cm4gdGhpcy5zaW5rcy5sZW5ndGhcbn07XG5cbk11bHRpY2FzdFNvdXJjZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlJDEgKHNpbmspIHtcbiAgdmFyIGkgPSBfbW9zdF9wcmVsdWRlLmZpbmRJbmRleChzaW5rLCB0aGlzLnNpbmtzKVxuICAvLyBpc3RhbmJ1bCBpZ25vcmUgbmV4dFxuICBpZiAoaSA+PSAwKSB7XG4gICAgdGhpcy5zaW5rcyA9IF9tb3N0X3ByZWx1ZGUucmVtb3ZlKGksIHRoaXMuc2lua3MpXG4gIH1cblxuICByZXR1cm4gdGhpcy5zaW5rcy5sZW5ndGhcbn07XG5cbk11bHRpY2FzdFNvdXJjZS5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiBldmVudCAodGltZSwgdmFsdWUpIHtcbiAgdmFyIHMgPSB0aGlzLnNpbmtzXG4gIGlmIChzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBzWzBdLmV2ZW50KHRpbWUsIHZhbHVlKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcy5sZW5ndGg7ICsraSkge1xuICAgIHRyeUV2ZW50KHRpbWUsIHZhbHVlLCBzW2ldKVxuICB9XG59O1xuXG5NdWx0aWNhc3RTb3VyY2UucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIGVuZCAodGltZSwgdmFsdWUpIHtcbiAgdmFyIHMgPSB0aGlzLnNpbmtzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcy5sZW5ndGg7ICsraSkge1xuICAgIHRyeUVuZCh0aW1lLCB2YWx1ZSwgc1tpXSlcbiAgfVxufTtcblxuTXVsdGljYXN0U291cmNlLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIGVycm9yICh0aW1lLCBlcnIpIHtcbiAgdmFyIHMgPSB0aGlzLnNpbmtzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcy5sZW5ndGg7ICsraSkge1xuICAgIHNbaV0uZXJyb3IodGltZSwgZXJyKVxuICB9XG59O1xuXG5mdW5jdGlvbiBtdWx0aWNhc3QgKHN0cmVhbSkge1xuICB2YXIgc291cmNlID0gc3RyZWFtLnNvdXJjZVxuICByZXR1cm4gc291cmNlIGluc3RhbmNlb2YgTXVsdGljYXN0U291cmNlXG4gICAgPyBzdHJlYW1cbiAgICA6IG5ldyBzdHJlYW0uY29uc3RydWN0b3IobmV3IE11bHRpY2FzdFNvdXJjZShzb3VyY2UpKVxufVxuXG5leHBvcnRzWydkZWZhdWx0J10gPSBtdWx0aWNhc3Q7XG5leHBvcnRzLk11bHRpY2FzdFNvdXJjZSA9IE11bHRpY2FzdFNvdXJjZTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW11bHRpY2FzdC5qcy5tYXBcbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5tb3N0UHJlbHVkZSA9IGdsb2JhbC5tb3N0UHJlbHVkZSB8fCB7fSkpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbi8vIE5vbi1tdXRhdGluZyBhcnJheSBvcGVyYXRpb25zXG5cbi8vIGNvbnMgOjogYSAtPiBbYV0gLT4gW2FdXG4vLyBhIHdpdGggeCBwcmVwZW5kZWRcbmZ1bmN0aW9uIGNvbnMgKHgsIGEpIHtcbiAgdmFyIGwgPSBhLmxlbmd0aDtcbiAgdmFyIGIgPSBuZXcgQXJyYXkobCArIDEpO1xuICBiWzBdID0geDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyArK2kpIHtcbiAgICBiW2kgKyAxXSA9IGFbaV07XG4gIH1cbiAgcmV0dXJuIGJcbn1cblxuLy8gYXBwZW5kIDo6IGEgLT4gW2FdIC0+IFthXVxuLy8gYSB3aXRoIHggYXBwZW5kZWRcbmZ1bmN0aW9uIGFwcGVuZCAoeCwgYSkge1xuICB2YXIgbCA9IGEubGVuZ3RoO1xuICB2YXIgYiA9IG5ldyBBcnJheShsICsgMSk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgKytpKSB7XG4gICAgYltpXSA9IGFbaV07XG4gIH1cblxuICBiW2xdID0geDtcbiAgcmV0dXJuIGJcbn1cblxuLy8gZHJvcCA6OiBJbnQgLT4gW2FdIC0+IFthXVxuLy8gZHJvcCBmaXJzdCBuIGVsZW1lbnRzXG5mdW5jdGlvbiBkcm9wIChuLCBhKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29tcGxleGl0eVxuICBpZiAobiA8IDApIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCduIG11c3QgYmUgPj0gMCcpXG4gIH1cblxuICB2YXIgbCA9IGEubGVuZ3RoO1xuICBpZiAobiA9PT0gMCB8fCBsID09PSAwKSB7XG4gICAgcmV0dXJuIGFcbiAgfVxuXG4gIGlmIChuID49IGwpIHtcbiAgICByZXR1cm4gW11cbiAgfVxuXG4gIHJldHVybiB1bnNhZmVEcm9wKG4sIGEsIGwgLSBuKVxufVxuXG4vLyB1bnNhZmVEcm9wIDo6IEludCAtPiBbYV0gLT4gSW50IC0+IFthXVxuLy8gSW50ZXJuYWwgaGVscGVyIGZvciBkcm9wXG5mdW5jdGlvbiB1bnNhZmVEcm9wIChuLCBhLCBsKSB7XG4gIHZhciBiID0gbmV3IEFycmF5KGwpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuICAgIGJbaV0gPSBhW24gKyBpXTtcbiAgfVxuICByZXR1cm4gYlxufVxuXG4vLyB0YWlsIDo6IFthXSAtPiBbYV1cbi8vIGRyb3AgaGVhZCBlbGVtZW50XG5mdW5jdGlvbiB0YWlsIChhKSB7XG4gIHJldHVybiBkcm9wKDEsIGEpXG59XG5cbi8vIGNvcHkgOjogW2FdIC0+IFthXVxuLy8gZHVwbGljYXRlIGEgKHNoYWxsb3cgZHVwbGljYXRpb24pXG5mdW5jdGlvbiBjb3B5IChhKSB7XG4gIHZhciBsID0gYS5sZW5ndGg7XG4gIHZhciBiID0gbmV3IEFycmF5KGwpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuICAgIGJbaV0gPSBhW2ldO1xuICB9XG4gIHJldHVybiBiXG59XG5cbi8vIG1hcCA6OiAoYSAtPiBiKSAtPiBbYV0gLT4gW2JdXG4vLyB0cmFuc2Zvcm0gZWFjaCBlbGVtZW50IHdpdGggZlxuZnVuY3Rpb24gbWFwIChmLCBhKSB7XG4gIHZhciBsID0gYS5sZW5ndGg7XG4gIHZhciBiID0gbmV3IEFycmF5KGwpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuICAgIGJbaV0gPSBmKGFbaV0pO1xuICB9XG4gIHJldHVybiBiXG59XG5cbi8vIHJlZHVjZSA6OiAoYSAtPiBiIC0+IGEpIC0+IGEgLT4gW2JdIC0+IGFcbi8vIGFjY3VtdWxhdGUgdmlhIGxlZnQtZm9sZFxuZnVuY3Rpb24gcmVkdWNlIChmLCB6LCBhKSB7XG4gIHZhciByID0gejtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHIgPSBmKHIsIGFbaV0sIGkpO1xuICB9XG4gIHJldHVybiByXG59XG5cbi8vIHJlcGxhY2UgOjogYSAtPiBJbnQgLT4gW2FdXG4vLyByZXBsYWNlIGVsZW1lbnQgYXQgaW5kZXhcbmZ1bmN0aW9uIHJlcGxhY2UgKHgsIGksIGEpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb21wbGV4aXR5XG4gIGlmIChpIDwgMCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2kgbXVzdCBiZSA+PSAwJylcbiAgfVxuXG4gIHZhciBsID0gYS5sZW5ndGg7XG4gIHZhciBiID0gbmV3IEFycmF5KGwpO1xuICBmb3IgKHZhciBqID0gMDsgaiA8IGw7ICsraikge1xuICAgIGJbal0gPSBpID09PSBqID8geCA6IGFbal07XG4gIH1cbiAgcmV0dXJuIGJcbn1cblxuLy8gcmVtb3ZlIDo6IEludCAtPiBbYV0gLT4gW2FdXG4vLyByZW1vdmUgZWxlbWVudCBhdCBpbmRleFxuZnVuY3Rpb24gcmVtb3ZlIChpLCBhKSB7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbXBsZXhpdHlcbiAgaWYgKGkgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaSBtdXN0IGJlID49IDAnKVxuICB9XG5cbiAgdmFyIGwgPSBhLmxlbmd0aDtcbiAgaWYgKGwgPT09IDAgfHwgaSA+PSBsKSB7IC8vIGV4aXQgZWFybHkgaWYgaW5kZXggYmV5b25kIGVuZCBvZiBhcnJheVxuICAgIHJldHVybiBhXG4gIH1cblxuICBpZiAobCA9PT0gMSkgeyAvLyBleGl0IGVhcmx5IGlmIGluZGV4IGluIGJvdW5kcyBhbmQgbGVuZ3RoID09PSAxXG4gICAgcmV0dXJuIFtdXG4gIH1cblxuICByZXR1cm4gdW5zYWZlUmVtb3ZlKGksIGEsIGwgLSAxKVxufVxuXG4vLyB1bnNhZmVSZW1vdmUgOjogSW50IC0+IFthXSAtPiBJbnQgLT4gW2FdXG4vLyBJbnRlcm5hbCBoZWxwZXIgdG8gcmVtb3ZlIGVsZW1lbnQgYXQgaW5kZXhcbmZ1bmN0aW9uIHVuc2FmZVJlbW92ZSAoaSwgYSwgbCkge1xuICB2YXIgYiA9IG5ldyBBcnJheShsKTtcbiAgdmFyIGo7XG4gIGZvciAoaiA9IDA7IGogPCBpOyArK2opIHtcbiAgICBiW2pdID0gYVtqXTtcbiAgfVxuICBmb3IgKGogPSBpOyBqIDwgbDsgKytqKSB7XG4gICAgYltqXSA9IGFbaiArIDFdO1xuICB9XG5cbiAgcmV0dXJuIGJcbn1cblxuLy8gcmVtb3ZlQWxsIDo6IChhIC0+IGJvb2xlYW4pIC0+IFthXSAtPiBbYV1cbi8vIHJlbW92ZSBhbGwgZWxlbWVudHMgbWF0Y2hpbmcgYSBwcmVkaWNhdGVcbmZ1bmN0aW9uIHJlbW92ZUFsbCAoZiwgYSkge1xuICB2YXIgbCA9IGEubGVuZ3RoO1xuICB2YXIgYiA9IG5ldyBBcnJheShsKTtcbiAgdmFyIGogPSAwO1xuICBmb3IgKHZhciB4ID0gKHZvaWQgMCksIGkgPSAwOyBpIDwgbDsgKytpKSB7XG4gICAgeCA9IGFbaV07XG4gICAgaWYgKCFmKHgpKSB7XG4gICAgICBiW2pdID0geDtcbiAgICAgICsrajtcbiAgICB9XG4gIH1cblxuICBiLmxlbmd0aCA9IGo7XG4gIHJldHVybiBiXG59XG5cbi8vIGZpbmRJbmRleCA6OiBhIC0+IFthXSAtPiBJbnRcbi8vIGZpbmQgaW5kZXggb2YgeCBpbiBhLCBmcm9tIHRoZSBsZWZ0XG5mdW5jdGlvbiBmaW5kSW5kZXggKHgsIGEpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmICh4ID09PSBhW2ldKSB7XG4gICAgICByZXR1cm4gaVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTFcbn1cblxuLy8gaXNBcnJheUxpa2UgOjogKiAtPiBib29sZWFuXG4vLyBSZXR1cm4gdHJ1ZSBpZmYgeCBpcyBhcnJheS1saWtlXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoeCkge1xuICByZXR1cm4geCAhPSBudWxsICYmIHR5cGVvZiB4Lmxlbmd0aCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHggIT09ICdmdW5jdGlvbidcbn1cblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbi8vIGlkIDo6IGEgLT4gYVxudmFyIGlkID0gZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH07XG5cbi8vIGNvbXBvc2UgOjogKGIgLT4gYykgLT4gKGEgLT4gYikgLT4gKGEgLT4gYylcbnZhciBjb21wb3NlID0gZnVuY3Rpb24gKGYsIGcpIHsgcmV0dXJuIGZ1bmN0aW9uICh4KSB7IHJldHVybiBmKGcoeCkpOyB9OyB9O1xuXG4vLyBhcHBseSA6OiAoYSAtPiBiKSAtPiBhIC0+IGJcbnZhciBhcHBseSA9IGZ1bmN0aW9uIChmLCB4KSB7IHJldHVybiBmKHgpOyB9O1xuXG4vLyBjdXJyeTIgOjogKChhLCBiKSAtPiBjKSAtPiAoYSAtPiBiIC0+IGMpXG5mdW5jdGlvbiBjdXJyeTIgKGYpIHtcbiAgZnVuY3Rpb24gY3VycmllZCAoYSwgYikge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOiByZXR1cm4gY3VycmllZFxuICAgICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24gKGIpIHsgcmV0dXJuIGYoYSwgYik7IH1cbiAgICAgIGRlZmF1bHQ6IHJldHVybiBmKGEsIGIpXG4gICAgfVxuICB9XG4gIHJldHVybiBjdXJyaWVkXG59XG5cbi8vIGN1cnJ5MyA6OiAoKGEsIGIsIGMpIC0+IGQpIC0+IChhIC0+IGIgLT4gYyAtPiBkKVxuZnVuY3Rpb24gY3VycnkzIChmKSB7XG4gIGZ1bmN0aW9uIGN1cnJpZWQgKGEsIGIsIGMpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb21wbGV4aXR5XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6IHJldHVybiBjdXJyaWVkXG4gICAgICBjYXNlIDE6IHJldHVybiBjdXJyeTIoZnVuY3Rpb24gKGIsIGMpIHsgcmV0dXJuIGYoYSwgYiwgYyk7IH0pXG4gICAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbiAoYykgeyByZXR1cm4gZihhLCBiLCBjKTsgfVxuICAgICAgZGVmYXVsdDpyZXR1cm4gZihhLCBiLCBjKVxuICAgIH1cbiAgfVxuICByZXR1cm4gY3VycmllZFxufVxuXG4vLyBjdXJyeTQgOjogKChhLCBiLCBjLCBkKSAtPiBlKSAtPiAoYSAtPiBiIC0+IGMgLT4gZCAtPiBlKVxuZnVuY3Rpb24gY3Vycnk0IChmKSB7XG4gIGZ1bmN0aW9uIGN1cnJpZWQgKGEsIGIsIGMsIGQpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb21wbGV4aXR5XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6IHJldHVybiBjdXJyaWVkXG4gICAgICBjYXNlIDE6IHJldHVybiBjdXJyeTMoZnVuY3Rpb24gKGIsIGMsIGQpIHsgcmV0dXJuIGYoYSwgYiwgYywgZCk7IH0pXG4gICAgICBjYXNlIDI6IHJldHVybiBjdXJyeTIoZnVuY3Rpb24gKGMsIGQpIHsgcmV0dXJuIGYoYSwgYiwgYywgZCk7IH0pXG4gICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZihhLCBiLCBjLCBkKTsgfVxuICAgICAgZGVmYXVsdDpyZXR1cm4gZihhLCBiLCBjLCBkKVxuICAgIH1cbiAgfVxuICByZXR1cm4gY3VycmllZFxufVxuXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbmV4cG9ydHMuY29ucyA9IGNvbnM7XG5leHBvcnRzLmFwcGVuZCA9IGFwcGVuZDtcbmV4cG9ydHMuZHJvcCA9IGRyb3A7XG5leHBvcnRzLnRhaWwgPSB0YWlsO1xuZXhwb3J0cy5jb3B5ID0gY29weTtcbmV4cG9ydHMubWFwID0gbWFwO1xuZXhwb3J0cy5yZWR1Y2UgPSByZWR1Y2U7XG5leHBvcnRzLnJlcGxhY2UgPSByZXBsYWNlO1xuZXhwb3J0cy5yZW1vdmUgPSByZW1vdmU7XG5leHBvcnRzLnJlbW92ZUFsbCA9IHJlbW92ZUFsbDtcbmV4cG9ydHMuZmluZEluZGV4ID0gZmluZEluZGV4O1xuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlO1xuZXhwb3J0cy5pZCA9IGlkO1xuZXhwb3J0cy5jb21wb3NlID0gY29tcG9zZTtcbmV4cG9ydHMuYXBwbHkgPSBhcHBseTtcbmV4cG9ydHMuY3VycnkyID0gY3VycnkyO1xuZXhwb3J0cy5jdXJyeTMgPSBjdXJyeTM7XG5leHBvcnRzLmN1cnJ5NCA9IGN1cnJ5NDtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcFxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBMaW5rZWRMaXN0O1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbi8qKlxuICogRG91Ymx5IGxpbmtlZCBsaXN0XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTGlua2VkTGlzdCgpIHtcbiAgdGhpcy5oZWFkID0gbnVsbDtcbiAgdGhpcy5sZW5ndGggPSAwO1xufVxuXG4vKipcbiAqIEFkZCBhIG5vZGUgdG8gdGhlIGVuZCBvZiB0aGUgbGlzdFxuICogQHBhcmFtIHt7cHJldjpPYmplY3R8bnVsbCwgbmV4dDpPYmplY3R8bnVsbCwgZGlzcG9zZTpmdW5jdGlvbn19IHggbm9kZSB0byBhZGRcbiAqL1xuTGlua2VkTGlzdC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHgpIHtcbiAgaWYgKHRoaXMuaGVhZCAhPT0gbnVsbCkge1xuICAgIHRoaXMuaGVhZC5wcmV2ID0geDtcbiAgICB4Lm5leHQgPSB0aGlzLmhlYWQ7XG4gIH1cbiAgdGhpcy5oZWFkID0geDtcbiAgKyt0aGlzLmxlbmd0aDtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBwcm92aWRlZCBub2RlIGZyb20gdGhlIGxpc3RcbiAqIEBwYXJhbSB7e3ByZXY6T2JqZWN0fG51bGwsIG5leHQ6T2JqZWN0fG51bGwsIGRpc3Bvc2U6ZnVuY3Rpb259fSB4IG5vZGUgdG8gcmVtb3ZlXG4gKi9cbkxpbmtlZExpc3QucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICh4KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgIGNvbXBsZXhpdHlcbiAgLS10aGlzLmxlbmd0aDtcbiAgaWYgKHggPT09IHRoaXMuaGVhZCkge1xuICAgIHRoaXMuaGVhZCA9IHRoaXMuaGVhZC5uZXh0O1xuICB9XG4gIGlmICh4Lm5leHQgIT09IG51bGwpIHtcbiAgICB4Lm5leHQucHJldiA9IHgucHJldjtcbiAgICB4Lm5leHQgPSBudWxsO1xuICB9XG4gIGlmICh4LnByZXYgIT09IG51bGwpIHtcbiAgICB4LnByZXYubmV4dCA9IHgubmV4dDtcbiAgICB4LnByZXYgPSBudWxsO1xuICB9XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiB0aGVyZSBhcmUgbm8gbm9kZXMgaW4gdGhlIGxpc3RcbiAqL1xuTGlua2VkTGlzdC5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubGVuZ3RoID09PSAwO1xufTtcblxuLyoqXG4gKiBEaXNwb3NlIGFsbCBub2Rlc1xuICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgdGhhdCBmdWxmaWxscyB3aGVuIGFsbCBub2RlcyBoYXZlIGJlZW4gZGlzcG9zZWQsXG4gKiAgb3IgcmVqZWN0cyBpZiBhbiBlcnJvciBvY2N1cnMgd2hpbGUgZGlzcG9zaW5nXG4gKi9cbkxpbmtlZExpc3QucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmlzRW1wdHkoKSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIHZhciBwcm9taXNlcyA9IFtdO1xuICB2YXIgeCA9IHRoaXMuaGVhZDtcbiAgdGhpcy5oZWFkID0gbnVsbDtcbiAgdGhpcy5sZW5ndGggPSAwO1xuXG4gIHdoaWxlICh4ICE9PSBudWxsKSB7XG4gICAgcHJvbWlzZXMucHVzaCh4LmRpc3Bvc2UoKSk7XG4gICAgeCA9IHgubmV4dDtcbiAgfVxuXG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIGlzUHJvbWlzZShwKSB7XG4gIHJldHVybiBwICE9PSBudWxsICYmIHR5cGVvZiBwID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcC50aGVuID09PSAnZnVuY3Rpb24nO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gUXVldWU7XG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuLy8gQmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL3BldGthYW50b25vdi9kZXF1ZVxuXG5mdW5jdGlvbiBRdWV1ZShjYXBQb3cyKSB7XG4gIHRoaXMuX2NhcGFjaXR5ID0gY2FwUG93MiB8fCAzMjtcbiAgdGhpcy5fbGVuZ3RoID0gMDtcbiAgdGhpcy5faGVhZCA9IDA7XG59XG5cblF1ZXVlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHgpIHtcbiAgdmFyIGxlbiA9IHRoaXMuX2xlbmd0aDtcbiAgdGhpcy5fY2hlY2tDYXBhY2l0eShsZW4gKyAxKTtcblxuICB2YXIgaSA9IHRoaXMuX2hlYWQgKyBsZW4gJiB0aGlzLl9jYXBhY2l0eSAtIDE7XG4gIHRoaXNbaV0gPSB4O1xuICB0aGlzLl9sZW5ndGggPSBsZW4gKyAxO1xufTtcblxuUXVldWUucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gIHZhciB4ID0gdGhpc1toZWFkXTtcblxuICB0aGlzW2hlYWRdID0gdm9pZCAwO1xuICB0aGlzLl9oZWFkID0gaGVhZCArIDEgJiB0aGlzLl9jYXBhY2l0eSAtIDE7XG4gIHRoaXMuX2xlbmd0aC0tO1xuICByZXR1cm4geDtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5pc0VtcHR5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fbGVuZ3RoID09PSAwO1xufTtcblxuUXVldWUucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2xlbmd0aDtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5fY2hlY2tDYXBhY2l0eSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIGlmICh0aGlzLl9jYXBhY2l0eSA8IHNpemUpIHtcbiAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSh0aGlzLl9jYXBhY2l0eSA8PCAxKTtcbiAgfVxufTtcblxuUXVldWUucHJvdG90eXBlLl9lbnN1cmVDYXBhY2l0eSA9IGZ1bmN0aW9uIChjYXBhY2l0eSkge1xuICB2YXIgb2xkQ2FwYWNpdHkgPSB0aGlzLl9jYXBhY2l0eTtcbiAgdGhpcy5fY2FwYWNpdHkgPSBjYXBhY2l0eTtcblxuICB2YXIgbGFzdCA9IHRoaXMuX2hlYWQgKyB0aGlzLl9sZW5ndGg7XG5cbiAgaWYgKGxhc3QgPiBvbGRDYXBhY2l0eSkge1xuICAgIGNvcHkodGhpcywgMCwgdGhpcywgb2xkQ2FwYWNpdHksIGxhc3QgJiBvbGRDYXBhY2l0eSAtIDEpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjb3B5KHNyYywgc3JjSW5kZXgsIGRzdCwgZHN0SW5kZXgsIGxlbikge1xuICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbjsgKytqKSB7XG4gICAgZHN0W2ogKyBkc3RJbmRleF0gPSBzcmNbaiArIHNyY0luZGV4XTtcbiAgICBzcmNbaiArIHNyY0luZGV4XSA9IHZvaWQgMDtcbiAgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gU3RyZWFtO1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIFN0cmVhbShzb3VyY2UpIHtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cblN0cmVhbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICByZXR1cm4gdGhpcy5zb3VyY2UucnVuKHNpbmssIHNjaGVkdWxlcik7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2NhbiA9IHNjYW47XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxudmFyIF9ydW5Tb3VyY2UgPSByZXF1aXJlKCcuLi9ydW5Tb3VyY2UnKTtcblxudmFyIF9kaXNwb3NlID0gcmVxdWlyZSgnLi4vZGlzcG9zYWJsZS9kaXNwb3NlJyk7XG5cbnZhciBkaXNwb3NlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2Rpc3Bvc2UpO1xuXG52YXIgX1Byb3BhZ2F0ZVRhc2sgPSByZXF1aXJlKCcuLi9zY2hlZHVsZXIvUHJvcGFnYXRlVGFzaycpO1xuXG52YXIgX1Byb3BhZ2F0ZVRhc2syID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUHJvcGFnYXRlVGFzayk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKipcbiAqIENyZWF0ZSBhIHN0cmVhbSBjb250YWluaW5nIHN1Y2Nlc3NpdmUgcmVkdWNlIHJlc3VsdHMgb2YgYXBwbHlpbmcgZiB0b1xuICogdGhlIHByZXZpb3VzIHJlZHVjZSByZXN1bHQgYW5kIHRoZSBjdXJyZW50IHN0cmVhbSBpdGVtLlxuICogQHBhcmFtIHtmdW5jdGlvbihyZXN1bHQ6KiwgeDoqKToqfSBmIHJlZHVjZXIgZnVuY3Rpb25cbiAqIEBwYXJhbSB7Kn0gaW5pdGlhbCBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtIHN0cmVhbSB0byBzY2FuXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIGNvbnRhaW5pbmcgc3VjY2Vzc2l2ZSByZWR1Y2UgcmVzdWx0c1xuICovXG5mdW5jdGlvbiBzY2FuKGYsIGluaXRpYWwsIHN0cmVhbSkge1xuICByZXR1cm4gbmV3IF9TdHJlYW0yLmRlZmF1bHQobmV3IFNjYW4oZiwgaW5pdGlhbCwgc3RyZWFtLnNvdXJjZSkpO1xufSAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gU2NhbihmLCB6LCBzb3VyY2UpIHtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMudmFsdWUgPSB6O1xufVxuXG5TY2FuLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHZhciBkMSA9IHNjaGVkdWxlci5hc2FwKF9Qcm9wYWdhdGVUYXNrMi5kZWZhdWx0LmV2ZW50KHRoaXMudmFsdWUsIHNpbmspKTtcbiAgdmFyIGQyID0gdGhpcy5zb3VyY2UucnVuKG5ldyBTY2FuU2luayh0aGlzLmYsIHRoaXMudmFsdWUsIHNpbmspLCBzY2hlZHVsZXIpO1xuICByZXR1cm4gZGlzcG9zZS5hbGwoW2QxLCBkMl0pO1xufTtcblxuZnVuY3Rpb24gU2NhblNpbmsoZiwgeiwgc2luaykge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnZhbHVlID0gejtcbiAgdGhpcy5zaW5rID0gc2luaztcbn1cblxuU2NhblNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgdmFyIGYgPSB0aGlzLmY7XG4gIHRoaXMudmFsdWUgPSBmKHRoaXMudmFsdWUsIHgpO1xuICB0aGlzLnNpbmsuZXZlbnQodCwgdGhpcy52YWx1ZSk7XG59O1xuXG5TY2FuU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5TY2FuU2luay5wcm90b3R5cGUuZW5kID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVuZDtcblxuLyoqXG4qIFJlZHVjZSBhIHN0cmVhbSB0byBwcm9kdWNlIGEgc2luZ2xlIHJlc3VsdC4gIE5vdGUgdGhhdCByZWR1Y2luZyBhbiBpbmZpbml0ZVxuKiBzdHJlYW0gd2lsbCByZXR1cm4gYSBQcm9taXNlIHRoYXQgbmV2ZXIgZnVsZmlsbHMsIGJ1dCB0aGF0IG1heSByZWplY3QgaWYgYW4gZXJyb3Jcbiogb2NjdXJzLlxuKiBAcGFyYW0ge2Z1bmN0aW9uKHJlc3VsdDoqLCB4OiopOip9IGYgcmVkdWNlciBmdW5jdGlvblxuKiBAcGFyYW0geyp9IGluaXRpYWwgaW5pdGlhbCB2YWx1ZVxuKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtIHRvIHJlZHVjZVxuKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSBmb3IgdGhlIGZpbGUgcmVzdWx0IG9mIHRoZSByZWR1Y2VcbiovXG5mdW5jdGlvbiByZWR1Y2UoZiwgaW5pdGlhbCwgc3RyZWFtKSB7XG4gIHJldHVybiAoMCwgX3J1blNvdXJjZS53aXRoRGVmYXVsdFNjaGVkdWxlcikobmV3IFJlZHVjZShmLCBpbml0aWFsLCBzdHJlYW0uc291cmNlKSk7XG59XG5cbmZ1bmN0aW9uIFJlZHVjZShmLCB6LCBzb3VyY2UpIHtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMudmFsdWUgPSB6O1xufVxuXG5SZWR1Y2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgUmVkdWNlU2luayh0aGlzLmYsIHRoaXMudmFsdWUsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gUmVkdWNlU2luayhmLCB6LCBzaW5rKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMudmFsdWUgPSB6O1xuICB0aGlzLnNpbmsgPSBzaW5rO1xufVxuXG5SZWR1Y2VTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHZhciBmID0gdGhpcy5mO1xuICB0aGlzLnZhbHVlID0gZih0aGlzLnZhbHVlLCB4KTtcbiAgdGhpcy5zaW5rLmV2ZW50KHQsIHRoaXMudmFsdWUpO1xufTtcblxuUmVkdWNlU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cblJlZHVjZVNpbmsucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0KSB7XG4gIHRoaXMuc2luay5lbmQodCwgdGhpcy52YWx1ZSk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuYXAgPSBhcDtcblxudmFyIF9jb21iaW5lID0gcmVxdWlyZSgnLi9jb21iaW5lJyk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxuLyoqXG4gKiBBc3N1bWUgZnMgaXMgYSBzdHJlYW0gY29udGFpbmluZyBmdW5jdGlvbnMsIGFuZCBhcHBseSB0aGUgbGF0ZXN0IGZ1bmN0aW9uXG4gKiBpbiBmcyB0byB0aGUgbGF0ZXN0IHZhbHVlIGluIHhzLlxuICogZnM6ICAgICAgICAgLS1mLS0tLS0tLS0tZy0tLS0tLS0taC0tLS0tLT5cbiAqIHhzOiAgICAgICAgIC1hLS0tLS0tLWItLS0tLS0tYy0tLS0tLS1kLS0+XG4gKiBhcChmcywgeHMpOiAtLWZhLS0tLS1mYi1nYi0tLWdjLS1oYy0taGQtPlxuICogQHBhcmFtIHtTdHJlYW19IGZzIHN0cmVhbSBvZiBmdW5jdGlvbnMgdG8gYXBwbHkgdG8gdGhlIGxhdGVzdCB4XG4gKiBAcGFyYW0ge1N0cmVhbX0geHMgc3RyZWFtIG9mIHZhbHVlcyB0byB3aGljaCB0byBhcHBseSBhbGwgdGhlIGxhdGVzdCBmXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gY29udGFpbmluZyBhbGwgdGhlIGFwcGxpY2F0aW9ucyBvZiBmcyB0byB4c1xuICovXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gYXAoZnMsIHhzKSB7XG4gIHJldHVybiAoMCwgX2NvbWJpbmUuY29tYmluZSkoX3ByZWx1ZGUuYXBwbHksIGZzLCB4cyk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jb25zID0gY29ucztcbmV4cG9ydHMuY29uY2F0ID0gY29uY2F0O1xuXG52YXIgX2NvcmUgPSByZXF1aXJlKCcuLi9zb3VyY2UvY29yZScpO1xuXG52YXIgX2NvbnRpbnVlV2l0aCA9IHJlcXVpcmUoJy4vY29udGludWVXaXRoJyk7XG5cbi8qKlxuICogQHBhcmFtIHsqfSB4IHZhbHVlIHRvIHByZXBlbmRcbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW1cbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gd2l0aCB4IHByZXBlbmRlZFxuICovXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gY29ucyh4LCBzdHJlYW0pIHtcbiAgcmV0dXJuIGNvbmNhdCgoMCwgX2NvcmUub2YpKHgpLCBzdHJlYW0pO1xufVxuXG4vKipcbiogQHBhcmFtIHtTdHJlYW19IGxlZnRcbiogQHBhcmFtIHtTdHJlYW19IHJpZ2h0XG4qIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gY29udGFpbmluZyBhbGwgZXZlbnRzIGluIGxlZnQgZm9sbG93ZWQgYnkgYWxsXG4qICBldmVudHMgaW4gcmlnaHQuICBUaGlzICp0aW1lc2hpZnRzKiByaWdodCB0byB0aGUgZW5kIG9mIGxlZnQuXG4qL1xuZnVuY3Rpb24gY29uY2F0KGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiAoMCwgX2NvbnRpbnVlV2l0aC5jb250aW51ZVdpdGgpKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcmlnaHQ7XG4gIH0sIGxlZnQpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY29tYmluZSA9IGNvbWJpbmU7XG5leHBvcnRzLmNvbWJpbmVBcnJheSA9IGNvbWJpbmVBcnJheTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF90cmFuc2Zvcm0gPSByZXF1aXJlKCcuL3RyYW5zZm9ybScpO1xuXG52YXIgdHJhbnNmb3JtID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3RyYW5zZm9ybSk7XG5cbnZhciBfY29yZSA9IHJlcXVpcmUoJy4uL3NvdXJjZS9jb3JlJyk7XG5cbnZhciBjb3JlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2NvcmUpO1xuXG52YXIgX1BpcGUgPSByZXF1aXJlKCcuLi9zaW5rL1BpcGUnKTtcblxudmFyIF9QaXBlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1BpcGUpO1xuXG52YXIgX0luZGV4U2luayA9IHJlcXVpcmUoJy4uL3NpbmsvSW5kZXhTaW5rJyk7XG5cbnZhciBfSW5kZXhTaW5rMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0luZGV4U2luayk7XG5cbnZhciBfZGlzcG9zZSA9IHJlcXVpcmUoJy4uL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxudmFyIF9wcmVsdWRlID0gcmVxdWlyZSgnQG1vc3QvcHJlbHVkZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9wcmVsdWRlKTtcblxudmFyIF9pbnZva2UgPSByZXF1aXJlKCcuLi9pbnZva2UnKTtcblxudmFyIF9pbnZva2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfaW52b2tlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgeyBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgbWFwID0gYmFzZS5tYXA7XG52YXIgdGFpbCA9IGJhc2UudGFpbDtcblxuLyoqXG4gKiBDb21iaW5lIGxhdGVzdCBldmVudHMgZnJvbSBhbGwgaW5wdXQgc3RyZWFtc1xuICogQHBhcmFtIHtmdW5jdGlvbiguLi5ldmVudHMpOip9IGYgZnVuY3Rpb24gdG8gY29tYmluZSBtb3N0IHJlY2VudCBldmVudHNcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgZiB0byB0aGUgbW9zdCByZWNlbnRcbiAqICBldmVudCBvZiBlYWNoIGlucHV0IHN0cmVhbSwgd2hlbmV2ZXIgYSBuZXcgZXZlbnQgYXJyaXZlcyBvbiBhbnkgc3RyZWFtLlxuICovXG5mdW5jdGlvbiBjb21iaW5lKGYgLyosIC4uLnN0cmVhbXMgKi8pIHtcbiAgcmV0dXJuIGNvbWJpbmVBcnJheShmLCB0YWlsKGFyZ3VtZW50cykpO1xufVxuXG4vKipcbiogQ29tYmluZSBsYXRlc3QgZXZlbnRzIGZyb20gYWxsIGlucHV0IHN0cmVhbXNcbiogQHBhcmFtIHtmdW5jdGlvbiguLi5ldmVudHMpOip9IGYgZnVuY3Rpb24gdG8gY29tYmluZSBtb3N0IHJlY2VudCBldmVudHNcbiogQHBhcmFtIHtbU3RyZWFtXX0gc3RyZWFtcyBtb3N0IHJlY2VudCBldmVudHNcbiogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgdGhlIHJlc3VsdCBvZiBhcHBseWluZyBmIHRvIHRoZSBtb3N0IHJlY2VudFxuKiAgZXZlbnQgb2YgZWFjaCBpbnB1dCBzdHJlYW0sIHdoZW5ldmVyIGEgbmV3IGV2ZW50IGFycml2ZXMgb24gYW55IHN0cmVhbS5cbiovXG5mdW5jdGlvbiBjb21iaW5lQXJyYXkoZiwgc3RyZWFtcykge1xuICB2YXIgbCA9IHN0cmVhbXMubGVuZ3RoO1xuICByZXR1cm4gbCA9PT0gMCA/IGNvcmUuZW1wdHkoKSA6IGwgPT09IDEgPyB0cmFuc2Zvcm0ubWFwKGYsIHN0cmVhbXNbMF0pIDogbmV3IF9TdHJlYW0yLmRlZmF1bHQoY29tYmluZVNvdXJjZXMoZiwgc3RyZWFtcykpO1xufVxuXG5mdW5jdGlvbiBjb21iaW5lU291cmNlcyhmLCBzdHJlYW1zKSB7XG4gIHJldHVybiBuZXcgQ29tYmluZShmLCBtYXAoZ2V0U291cmNlLCBzdHJlYW1zKSk7XG59XG5cbmZ1bmN0aW9uIGdldFNvdXJjZShzdHJlYW0pIHtcbiAgcmV0dXJuIHN0cmVhbS5zb3VyY2U7XG59XG5cbmZ1bmN0aW9uIENvbWJpbmUoZiwgc291cmNlcykge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnNvdXJjZXMgPSBzb3VyY2VzO1xufVxuXG5Db21iaW5lLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHZhciB0aGlzJDEgPSB0aGlzO1xuXG4gIHZhciBsID0gdGhpcy5zb3VyY2VzLmxlbmd0aDtcbiAgdmFyIGRpc3Bvc2FibGVzID0gbmV3IEFycmF5KGwpO1xuICB2YXIgc2lua3MgPSBuZXcgQXJyYXkobCk7XG5cbiAgdmFyIG1lcmdlU2luayA9IG5ldyBDb21iaW5lU2luayhkaXNwb3NhYmxlcywgc2lua3MsIHNpbmssIHRoaXMuZik7XG5cbiAgZm9yICh2YXIgaW5kZXhTaW5rLCBpID0gMDsgaSA8IGw7ICsraSkge1xuICAgIGluZGV4U2luayA9IHNpbmtzW2ldID0gbmV3IF9JbmRleFNpbmsyLmRlZmF1bHQoaSwgbWVyZ2VTaW5rKTtcbiAgICBkaXNwb3NhYmxlc1tpXSA9IHRoaXMkMS5zb3VyY2VzW2ldLnJ1bihpbmRleFNpbmssIHNjaGVkdWxlcik7XG4gIH1cblxuICByZXR1cm4gZGlzcG9zZS5hbGwoZGlzcG9zYWJsZXMpO1xufTtcblxuZnVuY3Rpb24gQ29tYmluZVNpbmsoZGlzcG9zYWJsZXMsIHNpbmtzLCBzaW5rLCBmKSB7XG4gIHZhciB0aGlzJDEgPSB0aGlzO1xuXG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuZGlzcG9zYWJsZXMgPSBkaXNwb3NhYmxlcztcbiAgdGhpcy5zaW5rcyA9IHNpbmtzO1xuICB0aGlzLmYgPSBmO1xuXG4gIHZhciBsID0gc2lua3MubGVuZ3RoO1xuICB0aGlzLmF3YWl0aW5nID0gbDtcbiAgdGhpcy52YWx1ZXMgPSBuZXcgQXJyYXkobCk7XG4gIHRoaXMuaGFzVmFsdWUgPSBuZXcgQXJyYXkobCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgKytpKSB7XG4gICAgdGhpcyQxLmhhc1ZhbHVlW2ldID0gZmFsc2U7XG4gIH1cblxuICB0aGlzLmFjdGl2ZUNvdW50ID0gc2lua3MubGVuZ3RoO1xufVxuXG5Db21iaW5lU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbkNvbWJpbmVTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCBpbmRleGVkVmFsdWUpIHtcbiAgdmFyIGkgPSBpbmRleGVkVmFsdWUuaW5kZXg7XG4gIHZhciBhd2FpdGluZyA9IHRoaXMuX3VwZGF0ZVJlYWR5KGkpO1xuXG4gIHRoaXMudmFsdWVzW2ldID0gaW5kZXhlZFZhbHVlLnZhbHVlO1xuICBpZiAoYXdhaXRpbmcgPT09IDApIHtcbiAgICB0aGlzLnNpbmsuZXZlbnQodCwgKDAsIF9pbnZva2UyLmRlZmF1bHQpKHRoaXMuZiwgdGhpcy52YWx1ZXMpKTtcbiAgfVxufTtcblxuQ29tYmluZVNpbmsucHJvdG90eXBlLl91cGRhdGVSZWFkeSA9IGZ1bmN0aW9uIChpbmRleCkge1xuICBpZiAodGhpcy5hd2FpdGluZyA+IDApIHtcbiAgICBpZiAoIXRoaXMuaGFzVmFsdWVbaW5kZXhdKSB7XG4gICAgICB0aGlzLmhhc1ZhbHVlW2luZGV4XSA9IHRydWU7XG4gICAgICB0aGlzLmF3YWl0aW5nIC09IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzLmF3YWl0aW5nO1xufTtcblxuQ29tYmluZVNpbmsucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCBpbmRleGVkVmFsdWUpIHtcbiAgZGlzcG9zZS50cnlEaXNwb3NlKHQsIHRoaXMuZGlzcG9zYWJsZXNbaW5kZXhlZFZhbHVlLmluZGV4XSwgdGhpcy5zaW5rKTtcbiAgaWYgKC0tdGhpcy5hY3RpdmVDb3VudCA9PT0gMCkge1xuICAgIHRoaXMuc2luay5lbmQodCwgaW5kZXhlZFZhbHVlLnZhbHVlKTtcbiAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNvbmNhdE1hcCA9IGNvbmNhdE1hcDtcblxudmFyIF9tZXJnZUNvbmN1cnJlbnRseSA9IHJlcXVpcmUoJy4vbWVyZ2VDb25jdXJyZW50bHknKTtcblxuLyoqXG4gKiBNYXAgZWFjaCB2YWx1ZSBpbiBzdHJlYW0gdG8gYSBuZXcgc3RyZWFtLCBhbmQgY29uY2F0ZW5hdGUgdGhlbSBhbGxcbiAqIHN0cmVhbTogICAgICAgICAgICAgIC1hLS0tYi0tLWNYXG4gKiBmKGEpOiAgICAgICAgICAgICAgICAgMS0xLTEtMVhcbiAqIGYoYik6ICAgICAgICAgICAgICAgICAgICAgICAgLTItMi0yLTJYXG4gKiBmKGMpOiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLTMtMy0zLTNYXG4gKiBzdHJlYW0uY29uY2F0TWFwKGYpOiAtMS0xLTEtMS0yLTItMi0yLTMtMy0zLTNYXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHg6Kik6U3RyZWFtfSBmIGZ1bmN0aW9uIHRvIG1hcCBlYWNoIHZhbHVlIHRvIGEgc3RyZWFtXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIGNvbnRhaW5pbmcgYWxsIGV2ZW50cyBmcm9tIGVhY2ggc3RyZWFtIHJldHVybmVkIGJ5IGZcbiAqL1xuZnVuY3Rpb24gY29uY2F0TWFwKGYsIHN0cmVhbSkge1xuICByZXR1cm4gKDAsIF9tZXJnZUNvbmN1cnJlbnRseS5tZXJnZU1hcENvbmN1cnJlbnRseSkoZiwgMSwgc3RyZWFtKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jb250aW51ZVdpdGggPSBjb250aW51ZVdpdGg7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4uL3NpbmsvUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbnZhciBfZGlzcG9zZSA9IHJlcXVpcmUoJy4uL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgeyBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIGNvbnRpbnVlV2l0aChmLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBDb250aW51ZVdpdGgoZiwgc3RyZWFtLnNvdXJjZSkpO1xufSAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gQ29udGludWVXaXRoKGYsIHNvdXJjZSkge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuQ29udGludWVXaXRoLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBuZXcgQ29udGludWVXaXRoU2luayh0aGlzLmYsIHRoaXMuc291cmNlLCBzaW5rLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gQ29udGludWVXaXRoU2luayhmLCBzb3VyY2UsIHNpbmssIHNjaGVkdWxlcikge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLmRpc3Bvc2FibGUgPSBkaXNwb3NlLm9uY2Uoc291cmNlLnJ1bih0aGlzLCBzY2hlZHVsZXIpKTtcbn1cblxuQ29udGludWVXaXRoU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbkNvbnRpbnVlV2l0aFNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnNpbmsuZXZlbnQodCwgeCk7XG59O1xuXG5Db250aW51ZVdpdGhTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAoIXRoaXMuYWN0aXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZGlzcG9zZS50cnlEaXNwb3NlKHQsIHRoaXMuZGlzcG9zYWJsZSwgdGhpcy5zaW5rKTtcbiAgdGhpcy5fc3RhcnROZXh0KHQsIHgsIHRoaXMuc2luayk7XG59O1xuXG5Db250aW51ZVdpdGhTaW5rLnByb3RvdHlwZS5fc3RhcnROZXh0ID0gZnVuY3Rpb24gKHQsIHgsIHNpbmspIHtcbiAgdHJ5IHtcbiAgICB0aGlzLmRpc3Bvc2FibGUgPSB0aGlzLl9jb250aW51ZSh0aGlzLmYsIHgsIHNpbmspO1xuICB9IGNhdGNoIChlKSB7XG4gICAgc2luay5lcnJvcih0LCBlKTtcbiAgfVxufTtcblxuQ29udGludWVXaXRoU2luay5wcm90b3R5cGUuX2NvbnRpbnVlID0gZnVuY3Rpb24gKGYsIHgsIHNpbmspIHtcbiAgcmV0dXJuIGYoeCkuc291cmNlLnJ1bihzaW5rLCB0aGlzLnNjaGVkdWxlcik7XG59O1xuXG5Db250aW51ZVdpdGhTaW5rLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICByZXR1cm4gdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWxheSA9IGRlbGF5O1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4uL1N0cmVhbScpO1xuXG52YXIgX1N0cmVhbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TdHJlYW0pO1xuXG52YXIgX1BpcGUgPSByZXF1aXJlKCcuLi9zaW5rL1BpcGUnKTtcblxudmFyIF9QaXBlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1BpcGUpO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuLi9kaXNwb3NhYmxlL2Rpc3Bvc2UnKTtcblxudmFyIGRpc3Bvc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZGlzcG9zZSk7XG5cbnZhciBfUHJvcGFnYXRlVGFzayA9IHJlcXVpcmUoJy4uL3NjaGVkdWxlci9Qcm9wYWdhdGVUYXNrJyk7XG5cbnZhciBfUHJvcGFnYXRlVGFzazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Qcm9wYWdhdGVUYXNrKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgeyBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5VGltZSBtaWxsaXNlY29uZHMgdG8gZGVsYXkgZWFjaCBpdGVtXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIGNvbnRhaW5pbmcgdGhlIHNhbWUgaXRlbXMsIGJ1dCBkZWxheWVkIGJ5IG1zXG4gKi9cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBkZWxheShkZWxheVRpbWUsIHN0cmVhbSkge1xuICByZXR1cm4gZGVsYXlUaW1lIDw9IDAgPyBzdHJlYW0gOiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgRGVsYXkoZGVsYXlUaW1lLCBzdHJlYW0uc291cmNlKSk7XG59XG5cbmZ1bmN0aW9uIERlbGF5KGR0LCBzb3VyY2UpIHtcbiAgdGhpcy5kdCA9IGR0O1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuRGVsYXkucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdmFyIGRlbGF5U2luayA9IG5ldyBEZWxheVNpbmsodGhpcy5kdCwgc2luaywgc2NoZWR1bGVyKTtcbiAgcmV0dXJuIGRpc3Bvc2UuYWxsKFtkZWxheVNpbmssIHRoaXMuc291cmNlLnJ1bihkZWxheVNpbmssIHNjaGVkdWxlcildKTtcbn07XG5cbmZ1bmN0aW9uIERlbGF5U2luayhkdCwgc2luaywgc2NoZWR1bGVyKSB7XG4gIHRoaXMuZHQgPSBkdDtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG59XG5cbkRlbGF5U2luay5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNjaGVkdWxlci5jYW5jZWxBbGwoZnVuY3Rpb24gKHRhc2spIHtcbiAgICByZXR1cm4gdGFzay5zaW5rID09PSBzZWxmLnNpbms7XG4gIH0pO1xufTtcblxuRGVsYXlTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHRoaXMuc2NoZWR1bGVyLmRlbGF5KHRoaXMuZHQsIF9Qcm9wYWdhdGVUYXNrMi5kZWZhdWx0LmV2ZW50KHgsIHRoaXMuc2luaykpO1xufTtcblxuRGVsYXlTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB0aGlzLnNjaGVkdWxlci5kZWxheSh0aGlzLmR0LCBfUHJvcGFnYXRlVGFzazIuZGVmYXVsdC5lbmQoeCwgdGhpcy5zaW5rKSk7XG59O1xuXG5EZWxheVNpbmsucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZmxhdE1hcEVycm9yID0gdW5kZWZpbmVkO1xuZXhwb3J0cy5yZWNvdmVyV2l0aCA9IHJlY292ZXJXaXRoO1xuZXhwb3J0cy50aHJvd0Vycm9yID0gdGhyb3dFcnJvcjtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9TYWZlU2luayA9IHJlcXVpcmUoJy4uL3NpbmsvU2FmZVNpbmsnKTtcblxudmFyIF9TYWZlU2luazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TYWZlU2luayk7XG5cbnZhciBfZGlzcG9zZSA9IHJlcXVpcmUoJy4uL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxudmFyIF90cnlFdmVudCA9IHJlcXVpcmUoJy4uL3NvdXJjZS90cnlFdmVudCcpO1xuXG52YXIgdHJ5RXZlbnQgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdHJ5RXZlbnQpO1xuXG52YXIgX1Byb3BhZ2F0ZVRhc2sgPSByZXF1aXJlKCcuLi9zY2hlZHVsZXIvUHJvcGFnYXRlVGFzaycpO1xuXG52YXIgX1Byb3BhZ2F0ZVRhc2syID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUHJvcGFnYXRlVGFzayk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKipcbiAqIElmIHN0cmVhbSBlbmNvdW50ZXJzIGFuIGVycm9yLCByZWNvdmVyIGFuZCBjb250aW51ZSB3aXRoIGl0ZW1zIGZyb20gc3RyZWFtXG4gKiByZXR1cm5lZCBieSBmLlxuICogQHBhcmFtIHtmdW5jdGlvbihlcnJvcjoqKTpTdHJlYW19IGYgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIG5ldyBzdHJlYW1cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW1cbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gd2hpY2ggd2lsbCByZWNvdmVyIGZyb20gYW4gZXJyb3IgYnkgY2FsbGluZyBmXG4gKi9cbmZ1bmN0aW9uIHJlY292ZXJXaXRoKGYsIHN0cmVhbSkge1xuICByZXR1cm4gbmV3IF9TdHJlYW0yLmRlZmF1bHQobmV3IFJlY292ZXJXaXRoKGYsIHN0cmVhbS5zb3VyY2UpKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBmbGF0TWFwRXJyb3IgPSBleHBvcnRzLmZsYXRNYXBFcnJvciA9IHJlY292ZXJXaXRoO1xuXG4vKipcbiAqIENyZWF0ZSBhIHN0cmVhbSBjb250YWluaW5nIG9ubHkgYW4gZXJyb3JcbiAqIEBwYXJhbSB7Kn0gZSBlcnJvciB2YWx1ZSwgcHJlZmVyYWJseSBhbiBFcnJvciBvciBFcnJvciBzdWJ0eXBlXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIGNvbnRhaW5pbmcgb25seSBhbiBlcnJvclxuICovXG5mdW5jdGlvbiB0aHJvd0Vycm9yKGUpIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBFcnJvclNvdXJjZShlKSk7XG59XG5cbmZ1bmN0aW9uIEVycm9yU291cmNlKGUpIHtcbiAgdGhpcy52YWx1ZSA9IGU7XG59XG5cbkVycm9yU291cmNlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBzY2hlZHVsZXIuYXNhcChuZXcgX1Byb3BhZ2F0ZVRhc2syLmRlZmF1bHQocnVuRXJyb3IsIHRoaXMudmFsdWUsIHNpbmspKTtcbn07XG5cbmZ1bmN0aW9uIHJ1bkVycm9yKHQsIGUsIHNpbmspIHtcbiAgc2luay5lcnJvcih0LCBlKTtcbn1cblxuZnVuY3Rpb24gUmVjb3ZlcldpdGgoZiwgc291cmNlKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xufVxuXG5SZWNvdmVyV2l0aC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICByZXR1cm4gbmV3IFJlY292ZXJXaXRoU2luayh0aGlzLmYsIHRoaXMuc291cmNlLCBzaW5rLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gUmVjb3ZlcldpdGhTaW5rKGYsIHNvdXJjZSwgc2luaywgc2NoZWR1bGVyKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuc2luayA9IG5ldyBfU2FmZVNpbmsyLmRlZmF1bHQoc2luayk7XG4gIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICB0aGlzLmRpc3Bvc2FibGUgPSBzb3VyY2UucnVuKHRoaXMsIHNjaGVkdWxlcik7XG59XG5cblJlY292ZXJXaXRoU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB0cnlFdmVudC50cnlFdmVudCh0LCB4LCB0aGlzLnNpbmspO1xufTtcblxuUmVjb3ZlcldpdGhTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB0cnlFdmVudC50cnlFbmQodCwgeCwgdGhpcy5zaW5rKTtcbn07XG5cblJlY292ZXJXaXRoU2luay5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAodCwgZSkge1xuICB2YXIgbmV4dFNpbmsgPSB0aGlzLnNpbmsuZGlzYWJsZSgpO1xuXG4gIGRpc3Bvc2UudHJ5RGlzcG9zZSh0LCB0aGlzLmRpc3Bvc2FibGUsIHRoaXMuc2luayk7XG4gIHRoaXMuX3N0YXJ0TmV4dCh0LCBlLCBuZXh0U2luayk7XG59O1xuXG5SZWNvdmVyV2l0aFNpbmsucHJvdG90eXBlLl9zdGFydE5leHQgPSBmdW5jdGlvbiAodCwgeCwgc2luaykge1xuICB0cnkge1xuICAgIHRoaXMuZGlzcG9zYWJsZSA9IHRoaXMuX2NvbnRpbnVlKHRoaXMuZiwgeCwgc2luayk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBzaW5rLmVycm9yKHQsIGUpO1xuICB9XG59O1xuXG5SZWNvdmVyV2l0aFNpbmsucHJvdG90eXBlLl9jb250aW51ZSA9IGZ1bmN0aW9uIChmLCB4LCBzaW5rKSB7XG4gIHZhciBzdHJlYW0gPSBmKHgpO1xuICByZXR1cm4gc3RyZWFtLnNvdXJjZS5ydW4oc2luaywgdGhpcy5zY2hlZHVsZXIpO1xufTtcblxuUmVjb3ZlcldpdGhTaW5rLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5maWx0ZXIgPSBmaWx0ZXI7XG5leHBvcnRzLnNraXBSZXBlYXRzID0gc2tpcFJlcGVhdHM7XG5leHBvcnRzLnNraXBSZXBlYXRzV2l0aCA9IHNraXBSZXBlYXRzV2l0aDtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxudmFyIF9GaWx0ZXIgPSByZXF1aXJlKCcuLi9mdXNpb24vRmlsdGVyJyk7XG5cbnZhciBfRmlsdGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0ZpbHRlcik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKlxuICogUmV0YWluIG9ubHkgaXRlbXMgbWF0Y2hpbmcgYSBwcmVkaWNhdGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqKTpib29sZWFufSBwIGZpbHRlcmluZyBwcmVkaWNhdGUgY2FsbGVkIGZvciBlYWNoIGl0ZW1cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0gc3RyZWFtIHRvIGZpbHRlclxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgb25seSBpdGVtcyBmb3Igd2hpY2ggcHJlZGljYXRlIHJldHVybnMgdHJ1dGh5XG4gKi9cbmZ1bmN0aW9uIGZpbHRlcihwLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KF9GaWx0ZXIyLmRlZmF1bHQuY3JlYXRlKHAsIHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuLyoqXG4gKiBTa2lwIHJlcGVhdGVkIGV2ZW50cywgdXNpbmcgPT09IHRvIGRldGVjdCBkdXBsaWNhdGVzXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtIHN0cmVhbSBmcm9tIHdoaWNoIHRvIG9taXQgcmVwZWF0ZWQgZXZlbnRzXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gd2l0aG91dCByZXBlYXRlZCBldmVudHNcbiAqL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIHNraXBSZXBlYXRzKHN0cmVhbSkge1xuICByZXR1cm4gc2tpcFJlcGVhdHNXaXRoKHNhbWUsIHN0cmVhbSk7XG59XG5cbi8qKlxuICogU2tpcCByZXBlYXRlZCBldmVudHMgdXNpbmcgdGhlIHByb3ZpZGVkIGVxdWFscyBmdW5jdGlvbiB0byBkZXRlY3QgZHVwbGljYXRlc1xuICogQHBhcmFtIHtmdW5jdGlvbihhOiosIGI6Kik6Ym9vbGVhbn0gZXF1YWxzIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIGNvbXBhcmUgaXRlbXNcbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0gc3RyZWFtIGZyb20gd2hpY2ggdG8gb21pdCByZXBlYXRlZCBldmVudHNcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSB3aXRob3V0IHJlcGVhdGVkIGV2ZW50c1xuICovXG5mdW5jdGlvbiBza2lwUmVwZWF0c1dpdGgoZXF1YWxzLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBTa2lwUmVwZWF0cyhlcXVhbHMsIHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gU2tpcFJlcGVhdHMoZXF1YWxzLCBzb3VyY2UpIHtcbiAgdGhpcy5lcXVhbHMgPSBlcXVhbHM7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xufVxuXG5Ta2lwUmVwZWF0cy5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICByZXR1cm4gdGhpcy5zb3VyY2UucnVuKG5ldyBTa2lwUmVwZWF0c1NpbmsodGhpcy5lcXVhbHMsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gU2tpcFJlcGVhdHNTaW5rKGVxdWFscywgc2luaykge1xuICB0aGlzLmVxdWFscyA9IGVxdWFscztcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy52YWx1ZSA9IHZvaWQgMDtcbiAgdGhpcy5pbml0ID0gdHJ1ZTtcbn1cblxuU2tpcFJlcGVhdHNTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuU2tpcFJlcGVhdHNTaW5rLnByb3RvdHlwZS5lcnJvciA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lcnJvcjtcblxuU2tpcFJlcGVhdHNTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICh0aGlzLmluaXQpIHtcbiAgICB0aGlzLmluaXQgPSBmYWxzZTtcbiAgICB0aGlzLnZhbHVlID0geDtcbiAgICB0aGlzLnNpbmsuZXZlbnQodCwgeCk7XG4gIH0gZWxzZSBpZiAoIXRoaXMuZXF1YWxzKHRoaXMudmFsdWUsIHgpKSB7XG4gICAgdGhpcy52YWx1ZSA9IHg7XG4gICAgdGhpcy5zaW5rLmV2ZW50KHQsIHgpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBzYW1lKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT09IGI7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5mbGF0TWFwID0gZmxhdE1hcDtcbmV4cG9ydHMuam9pbiA9IGpvaW47XG5cbnZhciBfbWVyZ2VDb25jdXJyZW50bHkgPSByZXF1aXJlKCcuL21lcmdlQ29uY3VycmVudGx5Jyk7XG5cbi8qKlxuICogTWFwIGVhY2ggdmFsdWUgaW4gdGhlIHN0cmVhbSB0byBhIG5ldyBzdHJlYW0sIGFuZCBtZXJnZSBpdCBpbnRvIHRoZVxuICogcmV0dXJuZWQgb3V0ZXIgc3RyZWFtLiBFdmVudCBhcnJpdmFsIHRpbWVzIGFyZSBwcmVzZXJ2ZWQuXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHg6Kik6U3RyZWFtfSBmIGNoYWluaW5nIGZ1bmN0aW9uLCBtdXN0IHJldHVybiBhIFN0cmVhbVxuICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbVxuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSBjb250YWluaW5nIGFsbCBldmVudHMgZnJvbSBlYWNoIHN0cmVhbSByZXR1cm5lZCBieSBmXG4gKi9cbmZ1bmN0aW9uIGZsYXRNYXAoZiwgc3RyZWFtKSB7XG4gIHJldHVybiAoMCwgX21lcmdlQ29uY3VycmVudGx5Lm1lcmdlTWFwQ29uY3VycmVudGx5KShmLCBJbmZpbml0eSwgc3RyZWFtKTtcbn1cblxuLyoqXG4gKiBNb25hZGljIGpvaW4uIEZsYXR0ZW4gYSBTdHJlYW08U3RyZWFtPFg+PiB0byBTdHJlYW08WD4gYnkgbWVyZ2luZyBpbm5lclxuICogc3RyZWFtcyB0byB0aGUgb3V0ZXIuIEV2ZW50IGFycml2YWwgdGltZXMgYXJlIHByZXNlcnZlZC5cbiAqIEBwYXJhbSB7U3RyZWFtPFN0cmVhbTxYPj59IHN0cmVhbSBzdHJlYW0gb2Ygc3RyZWFtc1xuICogQHJldHVybnMge1N0cmVhbTxYPn0gbmV3IHN0cmVhbSBjb250YWluaW5nIGFsbCBldmVudHMgb2YgYWxsIGlubmVyIHN0cmVhbXNcbiAqL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIGpvaW4oc3RyZWFtKSB7XG4gIHJldHVybiAoMCwgX21lcmdlQ29uY3VycmVudGx5Lm1lcmdlQ29uY3VycmVudGx5KShJbmZpbml0eSwgc3RyZWFtKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnRocm90dGxlID0gdGhyb3R0bGU7XG5leHBvcnRzLmRlYm91bmNlID0gZGVib3VuY2U7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4uL3NpbmsvUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbnZhciBfUHJvcGFnYXRlVGFzayA9IHJlcXVpcmUoJy4uL3NjaGVkdWxlci9Qcm9wYWdhdGVUYXNrJyk7XG5cbnZhciBfUHJvcGFnYXRlVGFzazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Qcm9wYWdhdGVUYXNrKTtcblxudmFyIF9NYXAgPSByZXF1aXJlKCcuLi9mdXNpb24vTWFwJyk7XG5cbnZhciBfTWFwMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX01hcCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKlxuICogTGltaXQgdGhlIHJhdGUgb2YgZXZlbnRzIGJ5IHN1cHByZXNzaW5nIGV2ZW50cyB0aGF0IG9jY3VyIHRvbyBvZnRlblxuICogQHBhcmFtIHtOdW1iZXJ9IHBlcmlvZCB0aW1lIHRvIHN1cHByZXNzIGV2ZW50c1xuICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbVxuICogQHJldHVybnMge1N0cmVhbX1cbiAqL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIHRocm90dGxlKHBlcmlvZCwgc3RyZWFtKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdCh0aHJvdHRsZVNvdXJjZShwZXJpb2QsIHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gdGhyb3R0bGVTb3VyY2UocGVyaW9kLCBzb3VyY2UpIHtcbiAgcmV0dXJuIHNvdXJjZSBpbnN0YW5jZW9mIF9NYXAyLmRlZmF1bHQgPyBjb21tdXRlTWFwVGhyb3R0bGUocGVyaW9kLCBzb3VyY2UpIDogc291cmNlIGluc3RhbmNlb2YgVGhyb3R0bGUgPyBmdXNlVGhyb3R0bGUocGVyaW9kLCBzb3VyY2UpIDogbmV3IFRocm90dGxlKHBlcmlvZCwgc291cmNlKTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZU1hcFRocm90dGxlKHBlcmlvZCwgc291cmNlKSB7XG4gIHJldHVybiBfTWFwMi5kZWZhdWx0LmNyZWF0ZShzb3VyY2UuZiwgdGhyb3R0bGVTb3VyY2UocGVyaW9kLCBzb3VyY2Uuc291cmNlKSk7XG59XG5cbmZ1bmN0aW9uIGZ1c2VUaHJvdHRsZShwZXJpb2QsIHNvdXJjZSkge1xuICByZXR1cm4gbmV3IFRocm90dGxlKE1hdGgubWF4KHBlcmlvZCwgc291cmNlLnBlcmlvZCksIHNvdXJjZS5zb3VyY2UpO1xufVxuXG5mdW5jdGlvbiBUaHJvdHRsZShwZXJpb2QsIHNvdXJjZSkge1xuICB0aGlzLnBlcmlvZCA9IHBlcmlvZDtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cblRocm90dGxlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiB0aGlzLnNvdXJjZS5ydW4obmV3IFRocm90dGxlU2luayh0aGlzLnBlcmlvZCwgc2luayksIHNjaGVkdWxlcik7XG59O1xuXG5mdW5jdGlvbiBUaHJvdHRsZVNpbmsocGVyaW9kLCBzaW5rKSB7XG4gIHRoaXMudGltZSA9IDA7XG4gIHRoaXMucGVyaW9kID0gcGVyaW9kO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xufVxuXG5UaHJvdHRsZVNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgaWYgKHQgPj0gdGhpcy50aW1lKSB7XG4gICAgdGhpcy50aW1lID0gdCArIHRoaXMucGVyaW9kO1xuICAgIHRoaXMuc2luay5ldmVudCh0LCB4KTtcbiAgfVxufTtcblxuVGhyb3R0bGVTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuXG5UaHJvdHRsZVNpbmsucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yO1xuXG4vKipcbiAqIFdhaXQgZm9yIGEgYnVyc3Qgb2YgZXZlbnRzIHRvIHN1YnNpZGUgYW5kIGVtaXQgb25seSB0aGUgbGFzdCBldmVudCBpbiB0aGUgYnVyc3RcbiAqIEBwYXJhbSB7TnVtYmVyfSBwZXJpb2QgZXZlbnRzIG9jY3VyaW5nIG1vcmUgZnJlcXVlbnRseSB0aGFuIHRoaXNcbiAqICB3aWxsIGJlIHN1cHByZXNzZWRcbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0gc3RyZWFtIHRvIGRlYm91bmNlXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgZGVib3VuY2VkIHN0cmVhbVxuICovXG5mdW5jdGlvbiBkZWJvdW5jZShwZXJpb2QsIHN0cmVhbSkge1xuICByZXR1cm4gbmV3IF9TdHJlYW0yLmRlZmF1bHQobmV3IERlYm91bmNlKHBlcmlvZCwgc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5mdW5jdGlvbiBEZWJvdW5jZShkdCwgc291cmNlKSB7XG4gIHRoaXMuZHQgPSBkdDtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cbkRlYm91bmNlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBuZXcgRGVib3VuY2VTaW5rKHRoaXMuZHQsIHRoaXMuc291cmNlLCBzaW5rLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gRGVib3VuY2VTaW5rKGR0LCBzb3VyY2UsIHNpbmssIHNjaGVkdWxlcikge1xuICB0aGlzLmR0ID0gZHQ7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICB0aGlzLnZhbHVlID0gdm9pZCAwO1xuICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgdGhpcy5kaXNwb3NhYmxlID0gc291cmNlLnJ1bih0aGlzLCBzY2hlZHVsZXIpO1xufVxuXG5EZWJvdW5jZVNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgdGhpcy5fY2xlYXJUaW1lcigpO1xuICB0aGlzLnZhbHVlID0geDtcbiAgdGhpcy50aW1lciA9IHRoaXMuc2NoZWR1bGVyLmRlbGF5KHRoaXMuZHQsIF9Qcm9wYWdhdGVUYXNrMi5kZWZhdWx0LmV2ZW50KHgsIHRoaXMuc2luaykpO1xufTtcblxuRGVib3VuY2VTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAodGhpcy5fY2xlYXJUaW1lcigpKSB7XG4gICAgdGhpcy5zaW5rLmV2ZW50KHQsIHRoaXMudmFsdWUpO1xuICAgIHRoaXMudmFsdWUgPSB2b2lkIDA7XG4gIH1cbiAgdGhpcy5zaW5rLmVuZCh0LCB4KTtcbn07XG5cbkRlYm91bmNlU2luay5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAodCwgeCkge1xuICB0aGlzLl9jbGVhclRpbWVyKCk7XG4gIHRoaXMuc2luay5lcnJvcih0LCB4KTtcbn07XG5cbkRlYm91bmNlU2luay5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fY2xlYXJUaW1lcigpO1xuICByZXR1cm4gdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbn07XG5cbkRlYm91bmNlU2luay5wcm90b3R5cGUuX2NsZWFyVGltZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLnRpbWVyID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHRoaXMudGltZXIuZGlzcG9zZSgpO1xuICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgcmV0dXJuIHRydWU7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMubG9vcCA9IGxvb3A7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4uL3NpbmsvUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKlxuICogR2VuZXJhbGl6ZWQgZmVlZGJhY2sgbG9vcC4gQ2FsbCBhIHN0ZXBwZXIgZnVuY3Rpb24gZm9yIGVhY2ggZXZlbnQuIFRoZSBzdGVwcGVyXG4gKiB3aWxsIGJlIGNhbGxlZCB3aXRoIDIgcGFyYW1zOiB0aGUgY3VycmVudCBzZWVkIGFuZCB0aGUgYW4gZXZlbnQgdmFsdWUuICBJdCBtdXN0XG4gKiByZXR1cm4gYSBuZXcgeyBzZWVkLCB2YWx1ZSB9IHBhaXIuIFRoZSBgc2VlZGAgd2lsbCBiZSBmZWQgYmFjayBpbnRvIHRoZSBuZXh0XG4gKiBpbnZvY2F0aW9uIG9mIHN0ZXBwZXIsIGFuZCB0aGUgYHZhbHVlYCB3aWxsIGJlIHByb3BhZ2F0ZWQgYXMgdGhlIGV2ZW50IHZhbHVlLlxuICogQHBhcmFtIHtmdW5jdGlvbihzZWVkOiosIHZhbHVlOiopOntzZWVkOiosIHZhbHVlOip9fSBzdGVwcGVyIGxvb3Agc3RlcCBmdW5jdGlvblxuICogQHBhcmFtIHsqfSBzZWVkIGluaXRpYWwgc2VlZCB2YWx1ZSBwYXNzZWQgdG8gZmlyc3Qgc3RlcHBlciBjYWxsXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtIGV2ZW50IHN0cmVhbVxuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSB3aG9zZSB2YWx1ZXMgYXJlIHRoZSBgdmFsdWVgIGZpZWxkIG9mIHRoZSBvYmplY3RzXG4gKiByZXR1cm5lZCBieSB0aGUgc3RlcHBlclxuICovXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gbG9vcChzdGVwcGVyLCBzZWVkLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBMb29wKHN0ZXBwZXIsIHNlZWQsIHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gTG9vcChzdGVwcGVyLCBzZWVkLCBzb3VyY2UpIHtcbiAgdGhpcy5zdGVwID0gc3RlcHBlcjtcbiAgdGhpcy5zZWVkID0gc2VlZDtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cbkxvb3AucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgTG9vcFNpbmsodGhpcy5zdGVwLCB0aGlzLnNlZWQsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gTG9vcFNpbmsoc3RlcHBlciwgc2VlZCwgc2luaykge1xuICB0aGlzLnN0ZXAgPSBzdGVwcGVyO1xuICB0aGlzLnNlZWQgPSBzZWVkO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xufVxuXG5Mb29wU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbkxvb3BTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHZhciByZXN1bHQgPSB0aGlzLnN0ZXAodGhpcy5zZWVkLCB4KTtcbiAgdGhpcy5zZWVkID0gcmVzdWx0LnNlZWQ7XG4gIHRoaXMuc2luay5ldmVudCh0LCByZXN1bHQudmFsdWUpO1xufTtcblxuTG9vcFNpbmsucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0KSB7XG4gIHRoaXMuc2luay5lbmQodCwgdGhpcy5zZWVkKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuZXhwb3J0cy5tZXJnZUFycmF5ID0gbWVyZ2VBcnJheTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxudmFyIF9JbmRleFNpbmsgPSByZXF1aXJlKCcuLi9zaW5rL0luZGV4U2luaycpO1xuXG52YXIgX0luZGV4U2luazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JbmRleFNpbmspO1xuXG52YXIgX2NvcmUgPSByZXF1aXJlKCcuLi9zb3VyY2UvY29yZScpO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuLi9kaXNwb3NhYmxlL2Rpc3Bvc2UnKTtcblxudmFyIGRpc3Bvc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZGlzcG9zZSk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcHJlbHVkZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIGNvcHkgPSBiYXNlLmNvcHk7XG52YXIgcmVkdWNlID0gYmFzZS5yZWR1Y2U7XG5cbi8qKlxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgZXZlbnRzIGZyb20gYWxsIHN0cmVhbXMgaW4gdGhlIGFyZ3VtZW50XG4gKiBsaXN0IGluIHRpbWUgb3JkZXIuICBJZiB0d28gZXZlbnRzIGFyZSBzaW11bHRhbmVvdXMgdGhleSB3aWxsIGJlIG1lcmdlZCBpblxuICogYXJiaXRyYXJ5IG9yZGVyLlxuICovXG5mdW5jdGlvbiBtZXJnZSgpIC8qIC4uLnN0cmVhbXMqL3tcbiAgcmV0dXJuIG1lcmdlQXJyYXkoY29weShhcmd1bWVudHMpKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5fSBzdHJlYW1zIGFycmF5IG9mIHN0cmVhbSB0byBtZXJnZVxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgZXZlbnRzIGZyb20gYWxsIGlucHV0IG9ic2VydmFibGVzXG4gKiBpbiB0aW1lIG9yZGVyLiAgSWYgdHdvIGV2ZW50cyBhcmUgc2ltdWx0YW5lb3VzIHRoZXkgd2lsbCBiZSBtZXJnZWQgaW5cbiAqIGFyYml0cmFyeSBvcmRlci5cbiAqL1xuZnVuY3Rpb24gbWVyZ2VBcnJheShzdHJlYW1zKSB7XG4gIHZhciBsID0gc3RyZWFtcy5sZW5ndGg7XG4gIHJldHVybiBsID09PSAwID8gKDAsIF9jb3JlLmVtcHR5KSgpIDogbCA9PT0gMSA/IHN0cmVhbXNbMF0gOiBuZXcgX1N0cmVhbTIuZGVmYXVsdChtZXJnZVNvdXJjZXMoc3RyZWFtcykpO1xufVxuXG4vKipcbiAqIFRoaXMgaW1wbGVtZW50cyBmdXNpb24vZmxhdHRlbmluZyBmb3IgbWVyZ2UuICBJdCB3aWxsXG4gKiBmdXNlIGFkamFjZW50IG1lcmdlIG9wZXJhdGlvbnMuICBGb3IgZXhhbXBsZTpcbiAqIC0gYS5tZXJnZShiKS5tZXJnZShjKSBlZmZlY3RpdmVseSBiZWNvbWVzIG1lcmdlKGEsIGIsIGMpXG4gKiAtIG1lcmdlKGEsIG1lcmdlKGIsIGMpKSBlZmZlY3RpdmVseSBiZWNvbWVzIG1lcmdlKGEsIGIsIGMpXG4gKiBJdCBkb2VzIHRoaXMgYnkgY29uY2F0ZW5hdGluZyB0aGUgc291cmNlcyBhcnJheXMgb2ZcbiAqIGFueSBuZXN0ZWQgTWVyZ2Ugc291cmNlcywgaW4gZWZmZWN0IFwiZmxhdHRlbmluZ1wiIG5lc3RlZFxuICogbWVyZ2Ugb3BlcmF0aW9ucyBpbnRvIGEgc2luZ2xlIG1lcmdlLlxuICovXG5mdW5jdGlvbiBtZXJnZVNvdXJjZXMoc3RyZWFtcykge1xuICByZXR1cm4gbmV3IE1lcmdlKHJlZHVjZShhcHBlbmRTb3VyY2VzLCBbXSwgc3RyZWFtcykpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRTb3VyY2VzKHNvdXJjZXMsIHN0cmVhbSkge1xuICB2YXIgc291cmNlID0gc3RyZWFtLnNvdXJjZTtcbiAgcmV0dXJuIHNvdXJjZSBpbnN0YW5jZW9mIE1lcmdlID8gc291cmNlcy5jb25jYXQoc291cmNlLnNvdXJjZXMpIDogc291cmNlcy5jb25jYXQoc291cmNlKTtcbn1cblxuZnVuY3Rpb24gTWVyZ2Uoc291cmNlcykge1xuICB0aGlzLnNvdXJjZXMgPSBzb3VyY2VzO1xufVxuXG5NZXJnZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICB2YXIgdGhpcyQxID0gdGhpcztcblxuICB2YXIgbCA9IHRoaXMuc291cmNlcy5sZW5ndGg7XG4gIHZhciBkaXNwb3NhYmxlcyA9IG5ldyBBcnJheShsKTtcbiAgdmFyIHNpbmtzID0gbmV3IEFycmF5KGwpO1xuXG4gIHZhciBtZXJnZVNpbmsgPSBuZXcgTWVyZ2VTaW5rKGRpc3Bvc2FibGVzLCBzaW5rcywgc2luayk7XG5cbiAgZm9yICh2YXIgaW5kZXhTaW5rLCBpID0gMDsgaSA8IGw7ICsraSkge1xuICAgIGluZGV4U2luayA9IHNpbmtzW2ldID0gbmV3IF9JbmRleFNpbmsyLmRlZmF1bHQoaSwgbWVyZ2VTaW5rKTtcbiAgICBkaXNwb3NhYmxlc1tpXSA9IHRoaXMkMS5zb3VyY2VzW2ldLnJ1bihpbmRleFNpbmssIHNjaGVkdWxlcik7XG4gIH1cblxuICByZXR1cm4gZGlzcG9zZS5hbGwoZGlzcG9zYWJsZXMpO1xufTtcblxuZnVuY3Rpb24gTWVyZ2VTaW5rKGRpc3Bvc2FibGVzLCBzaW5rcywgc2luaykge1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLmRpc3Bvc2FibGVzID0gZGlzcG9zYWJsZXM7XG4gIHRoaXMuYWN0aXZlQ291bnQgPSBzaW5rcy5sZW5ndGg7XG59XG5cbk1lcmdlU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbk1lcmdlU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgaW5kZXhWYWx1ZSkge1xuICB0aGlzLnNpbmsuZXZlbnQodCwgaW5kZXhWYWx1ZS52YWx1ZSk7XG59O1xuXG5NZXJnZVNpbmsucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCBpbmRleGVkVmFsdWUpIHtcbiAgZGlzcG9zZS50cnlEaXNwb3NlKHQsIHRoaXMuZGlzcG9zYWJsZXNbaW5kZXhlZFZhbHVlLmluZGV4XSwgdGhpcy5zaW5rKTtcbiAgaWYgKC0tdGhpcy5hY3RpdmVDb3VudCA9PT0gMCkge1xuICAgIHRoaXMuc2luay5lbmQodCwgaW5kZXhlZFZhbHVlLnZhbHVlKTtcbiAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLm1lcmdlQ29uY3VycmVudGx5ID0gbWVyZ2VDb25jdXJyZW50bHk7XG5leHBvcnRzLm1lcmdlTWFwQ29uY3VycmVudGx5ID0gbWVyZ2VNYXBDb25jdXJyZW50bHk7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfZGlzcG9zZSA9IHJlcXVpcmUoJy4uL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxudmFyIF9MaW5rZWRMaXN0ID0gcmVxdWlyZSgnLi4vTGlua2VkTGlzdCcpO1xuXG52YXIgX0xpbmtlZExpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTGlua2VkTGlzdCk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgeyBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBtZXJnZUNvbmN1cnJlbnRseShjb25jdXJyZW5jeSwgc3RyZWFtKSB7XG4gIHJldHVybiBtZXJnZU1hcENvbmN1cnJlbnRseShfcHJlbHVkZS5pZCwgY29uY3VycmVuY3ksIHN0cmVhbSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlTWFwQ29uY3VycmVudGx5KGYsIGNvbmN1cnJlbmN5LCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBNZXJnZUNvbmN1cnJlbnRseShmLCBjb25jdXJyZW5jeSwgc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5mdW5jdGlvbiBNZXJnZUNvbmN1cnJlbnRseShmLCBjb25jdXJyZW5jeSwgc291cmNlKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuY29uY3VycmVuY3kgPSBjb25jdXJyZW5jeTtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cbk1lcmdlQ29uY3VycmVudGx5LnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBuZXcgT3V0ZXIodGhpcy5mLCB0aGlzLmNvbmN1cnJlbmN5LCB0aGlzLnNvdXJjZSwgc2luaywgc2NoZWR1bGVyKTtcbn07XG5cbmZ1bmN0aW9uIE91dGVyKGYsIGNvbmN1cnJlbmN5LCBzb3VyY2UsIHNpbmssIHNjaGVkdWxlcikge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLmNvbmN1cnJlbmN5ID0gY29uY3VycmVuY3k7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICB0aGlzLnBlbmRpbmcgPSBbXTtcbiAgdGhpcy5jdXJyZW50ID0gbmV3IF9MaW5rZWRMaXN0Mi5kZWZhdWx0KCk7XG4gIHRoaXMuZGlzcG9zYWJsZSA9IGRpc3Bvc2Uub25jZShzb3VyY2UucnVuKHRoaXMsIHNjaGVkdWxlcikpO1xuICB0aGlzLmFjdGl2ZSA9IHRydWU7XG59XG5cbk91dGVyLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHRoaXMuX2FkZElubmVyKHQsIHgpO1xufTtcblxuT3V0ZXIucHJvdG90eXBlLl9hZGRJbm5lciA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICh0aGlzLmN1cnJlbnQubGVuZ3RoIDwgdGhpcy5jb25jdXJyZW5jeSkge1xuICAgIHRoaXMuX3N0YXJ0SW5uZXIodCwgeCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wZW5kaW5nLnB1c2goeCk7XG4gIH1cbn07XG5cbk91dGVyLnByb3RvdHlwZS5fc3RhcnRJbm5lciA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHRyeSB7XG4gICAgdGhpcy5faW5pdElubmVyKHQsIHgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy5lcnJvcih0LCBlKTtcbiAgfVxufTtcblxuT3V0ZXIucHJvdG90eXBlLl9pbml0SW5uZXIgPSBmdW5jdGlvbiAodCwgeCkge1xuICB2YXIgaW5uZXJTaW5rID0gbmV3IElubmVyKHQsIHRoaXMsIHRoaXMuc2luayk7XG4gIGlubmVyU2luay5kaXNwb3NhYmxlID0gbWFwQW5kUnVuKHRoaXMuZiwgeCwgaW5uZXJTaW5rLCB0aGlzLnNjaGVkdWxlcik7XG4gIHRoaXMuY3VycmVudC5hZGQoaW5uZXJTaW5rKTtcbn07XG5cbmZ1bmN0aW9uIG1hcEFuZFJ1bihmLCB4LCBzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIGYoeCkuc291cmNlLnJ1bihzaW5rLCBzY2hlZHVsZXIpO1xufVxuXG5PdXRlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgZGlzcG9zZS50cnlEaXNwb3NlKHQsIHRoaXMuZGlzcG9zYWJsZSwgdGhpcy5zaW5rKTtcbiAgdGhpcy5fY2hlY2tFbmQodCwgeCk7XG59O1xuXG5PdXRlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAodCwgZSkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICB0aGlzLnNpbmsuZXJyb3IodCwgZSk7XG59O1xuXG5PdXRlci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgdGhpcy5wZW5kaW5nLmxlbmd0aCA9IDA7XG4gIHJldHVybiBQcm9taXNlLmFsbChbdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKSwgdGhpcy5jdXJyZW50LmRpc3Bvc2UoKV0pO1xufTtcblxuT3V0ZXIucHJvdG90eXBlLl9lbmRJbm5lciA9IGZ1bmN0aW9uICh0LCB4LCBpbm5lcikge1xuICB0aGlzLmN1cnJlbnQucmVtb3ZlKGlubmVyKTtcbiAgZGlzcG9zZS50cnlEaXNwb3NlKHQsIGlubmVyLCB0aGlzKTtcblxuICBpZiAodGhpcy5wZW5kaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHRoaXMuX2NoZWNrRW5kKHQsIHgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX3N0YXJ0SW5uZXIodCwgdGhpcy5wZW5kaW5nLnNoaWZ0KCkpO1xuICB9XG59O1xuXG5PdXRlci5wcm90b3R5cGUuX2NoZWNrRW5kID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSAmJiB0aGlzLmN1cnJlbnQuaXNFbXB0eSgpKSB7XG4gICAgdGhpcy5zaW5rLmVuZCh0LCB4KTtcbiAgfVxufTtcblxuZnVuY3Rpb24gSW5uZXIodGltZSwgb3V0ZXIsIHNpbmspIHtcbiAgdGhpcy5wcmV2ID0gdGhpcy5uZXh0ID0gbnVsbDtcbiAgdGhpcy50aW1lID0gdGltZTtcbiAgdGhpcy5vdXRlciA9IG91dGVyO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLmRpc3Bvc2FibGUgPSB2b2lkIDA7XG59XG5cbklubmVyLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHRoaXMuc2luay5ldmVudChNYXRoLm1heCh0LCB0aGlzLnRpbWUpLCB4KTtcbn07XG5cbklubmVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB0aGlzLm91dGVyLl9lbmRJbm5lcihNYXRoLm1heCh0LCB0aGlzLnRpbWUpLCB4LCB0aGlzKTtcbn07XG5cbklubmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICh0LCBlKSB7XG4gIHRoaXMub3V0ZXIuZXJyb3IoTWF0aC5tYXgodCwgdGhpcy50aW1lKSwgZSk7XG59O1xuXG5Jbm5lci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMub2JzZXJ2ZSA9IG9ic2VydmU7XG5leHBvcnRzLmRyYWluID0gZHJhaW47XG5cbnZhciBfcnVuU291cmNlID0gcmVxdWlyZSgnLi4vcnVuU291cmNlJyk7XG5cbnZhciBfdHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0nKTtcblxuLyoqXG4gKiBPYnNlcnZlIGFsbCB0aGUgZXZlbnQgdmFsdWVzIGluIHRoZSBzdHJlYW0gaW4gdGltZSBvcmRlci4gVGhlXG4gKiBwcm92aWRlZCBmdW5jdGlvbiBgZmAgd2lsbCBiZSBjYWxsZWQgZm9yIGVhY2ggZXZlbnQgdmFsdWVcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDpUKToqfSBmIGZ1bmN0aW9uIHRvIGNhbGwgd2l0aCBlYWNoIGV2ZW50IHZhbHVlXG4gKiBAcGFyYW0ge1N0cmVhbTxUPn0gc3RyZWFtIHN0cmVhbSB0byBvYnNlcnZlXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgYWZ0ZXIgdGhlIHN0cmVhbSBlbmRzIHdpdGhvdXRcbiAqICBhbiBlcnJvciwgb3IgcmVqZWN0cyBpZiB0aGUgc3RyZWFtIGVuZHMgd2l0aCBhbiBlcnJvci5cbiAqL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIG9ic2VydmUoZiwgc3RyZWFtKSB7XG4gIHJldHVybiBkcmFpbigoMCwgX3RyYW5zZm9ybS50YXApKGYsIHN0cmVhbSkpO1xufVxuXG4vKipcbiAqIFwiUnVuXCIgYSBzdHJlYW0gYnkgY3JlYXRpbmcgZGVtYW5kIGFuZCBjb25zdW1pbmcgYWxsIGV2ZW50c1xuICogQHBhcmFtIHtTdHJlYW08VD59IHN0cmVhbSBzdHJlYW0gdG8gZHJhaW5cbiAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhhdCBmdWxmaWxscyBhZnRlciB0aGUgc3RyZWFtIGVuZHMgd2l0aG91dFxuICogIGFuIGVycm9yLCBvciByZWplY3RzIGlmIHRoZSBzdHJlYW0gZW5kcyB3aXRoIGFuIGVycm9yLlxuICovXG5mdW5jdGlvbiBkcmFpbihzdHJlYW0pIHtcbiAgcmV0dXJuICgwLCBfcnVuU291cmNlLndpdGhEZWZhdWx0U2NoZWR1bGVyKShzdHJlYW0uc291cmNlKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmZyb21Qcm9taXNlID0gZnJvbVByb21pc2U7XG5leHBvcnRzLmF3YWl0UHJvbWlzZXMgPSBhd2FpdFByb21pc2VzO1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4uL1N0cmVhbScpO1xuXG52YXIgX1N0cmVhbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TdHJlYW0pO1xuXG52YXIgX2ZhdGFsRXJyb3IgPSByZXF1aXJlKCcuLi9mYXRhbEVycm9yJyk7XG5cbnZhciBfZmF0YWxFcnJvcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9mYXRhbEVycm9yKTtcblxudmFyIF9jb3JlID0gcmVxdWlyZSgnLi4vc291cmNlL2NvcmUnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBDcmVhdGUgYSBzdHJlYW0gY29udGFpbmluZyBvbmx5IHRoZSBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAqIHZhbHVlIGF0IHRoZSB0aW1lIGl0IGZ1bGZpbGxzLlxuICogQHBhcmFtIHtQcm9taXNlPFQ+fSBwIHByb21pc2VcbiAqIEByZXR1cm4ge1N0cmVhbTxUPn0gc3RyZWFtIGNvbnRhaW5pbmcgcHJvbWlzZSdzIGZ1bGZpbGxtZW50IHZhbHVlLlxuICogIElmIHRoZSBwcm9taXNlIHJlamVjdHMsIHRoZSBzdHJlYW0gd2lsbCBlcnJvclxuICovXG5mdW5jdGlvbiBmcm9tUHJvbWlzZShwKSB7XG4gIHJldHVybiBhd2FpdFByb21pc2VzKCgwLCBfY29yZS5vZikocCkpO1xufVxuXG4vKipcbiAqIFR1cm4gYSBTdHJlYW08UHJvbWlzZTxUPj4gaW50byBTdHJlYW08VD4gYnkgYXdhaXRpbmcgZWFjaCBwcm9taXNlLlxuICogRXZlbnQgb3JkZXIgaXMgcHJlc2VydmVkLlxuICogQHBhcmFtIHtTdHJlYW08UHJvbWlzZTxUPj59IHN0cmVhbVxuICogQHJldHVybiB7U3RyZWFtPFQ+fSBzdHJlYW0gb2YgZnVsZmlsbG1lbnQgdmFsdWVzLiAgVGhlIHN0cmVhbSB3aWxsXG4gKiBlcnJvciBpZiBhbnkgcHJvbWlzZSByZWplY3RzLlxuICovXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gYXdhaXRQcm9taXNlcyhzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBBd2FpdChzdHJlYW0uc291cmNlKSk7XG59XG5cbmZ1bmN0aW9uIEF3YWl0KHNvdXJjZSkge1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuQXdhaXQucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgQXdhaXRTaW5rKHNpbmssIHNjaGVkdWxlciksIHNjaGVkdWxlcik7XG59O1xuXG5mdW5jdGlvbiBBd2FpdFNpbmsoc2luaywgc2NoZWR1bGVyKSB7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICB0aGlzLnF1ZXVlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBQcmUtY3JlYXRlIGNsb3N1cmVzLCB0byBhdm9pZCBjcmVhdGluZyB0aGVtIHBlciBldmVudFxuICB0aGlzLl9ldmVudEJvdW5kID0gZnVuY3Rpb24gKHgpIHtcbiAgICBzZWxmLnNpbmsuZXZlbnQoc2VsZi5zY2hlZHVsZXIubm93KCksIHgpO1xuICB9O1xuXG4gIHRoaXMuX2VuZEJvdW5kID0gZnVuY3Rpb24gKHgpIHtcbiAgICBzZWxmLnNpbmsuZW5kKHNlbGYuc2NoZWR1bGVyLm5vdygpLCB4KTtcbiAgfTtcblxuICB0aGlzLl9lcnJvckJvdW5kID0gZnVuY3Rpb24gKGUpIHtcbiAgICBzZWxmLnNpbmsuZXJyb3Ioc2VsZi5zY2hlZHVsZXIubm93KCksIGUpO1xuICB9O1xufVxuXG5Bd2FpdFNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHByb21pc2UpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gc2VsZi5fZXZlbnQocHJvbWlzZSk7XG4gIH0pLmNhdGNoKHRoaXMuX2Vycm9yQm91bmQpO1xufTtcblxuQXdhaXRTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMucXVldWUgPSB0aGlzLnF1ZXVlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBzZWxmLl9lbmQoeCk7XG4gIH0pLmNhdGNoKHRoaXMuX2Vycm9yQm91bmQpO1xufTtcblxuQXdhaXRTaW5rLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICh0LCBlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gRG9uJ3QgcmVzb2x2ZSBlcnJvciB2YWx1ZXMsIHByb3BhZ2F0ZSBkaXJlY3RseVxuICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gc2VsZi5fZXJyb3JCb3VuZChlKTtcbiAgfSkuY2F0Y2goX2ZhdGFsRXJyb3IyLmRlZmF1bHQpO1xufTtcblxuQXdhaXRTaW5rLnByb3RvdHlwZS5fZXZlbnQgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICByZXR1cm4gcHJvbWlzZS50aGVuKHRoaXMuX2V2ZW50Qm91bmQpO1xufTtcblxuQXdhaXRTaW5rLnByb3RvdHlwZS5fZW5kID0gZnVuY3Rpb24gKHgpIHtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh4KS50aGVuKHRoaXMuX2VuZEJvdW5kKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zYW1wbGUgPSBzYW1wbGU7XG5leHBvcnRzLnNhbXBsZVdpdGggPSBzYW1wbGVXaXRoO1xuZXhwb3J0cy5zYW1wbGVBcnJheSA9IHNhbXBsZUFycmF5O1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4uL1N0cmVhbScpO1xuXG52YXIgX1N0cmVhbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TdHJlYW0pO1xuXG52YXIgX1BpcGUgPSByZXF1aXJlKCcuLi9zaW5rL1BpcGUnKTtcblxudmFyIF9QaXBlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1BpcGUpO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuLi9kaXNwb3NhYmxlL2Rpc3Bvc2UnKTtcblxudmFyIGRpc3Bvc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZGlzcG9zZSk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcHJlbHVkZSk7XG5cbnZhciBfaW52b2tlID0gcmVxdWlyZSgnLi4vaW52b2tlJyk7XG5cbnZhciBfaW52b2tlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2ludm9rZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKipcbiAqIFdoZW4gYW4gZXZlbnQgYXJyaXZlcyBvbiBzYW1wbGVyLCBlbWl0IHRoZSByZXN1bHQgb2YgY2FsbGluZyBmIHdpdGggdGhlIGxhdGVzdFxuICogdmFsdWVzIG9mIGFsbCBzdHJlYW1zIGJlaW5nIHNhbXBsZWRcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oLi4udmFsdWVzKToqfSBmIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIGVhY2ggc2V0IG9mIHNhbXBsZWQgdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmVhbX0gc2FtcGxlciBzdHJlYW1zIHdpbGwgYmUgc2FtcGxlZCB3aGVuZXZlciBhbiBldmVudCBhcnJpdmVzXG4gKiAgb24gc2FtcGxlclxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIG9mIHNhbXBsZWQgYW5kIHRyYW5zZm9ybWVkIHZhbHVlc1xuICovXG5mdW5jdGlvbiBzYW1wbGUoZiwgc2FtcGxlciAvKiwgLi4uc3RyZWFtcyAqLykge1xuICByZXR1cm4gc2FtcGxlQXJyYXkoZiwgc2FtcGxlciwgYmFzZS5kcm9wKDIsIGFyZ3VtZW50cykpO1xufVxuXG4vKipcbiAqIFdoZW4gYW4gZXZlbnQgYXJyaXZlcyBvbiBzYW1wbGVyLCBlbWl0IHRoZSBsYXRlc3QgZXZlbnQgdmFsdWUgZnJvbSBzdHJlYW0uXG4gKiBAcGFyYW0ge1N0cmVhbX0gc2FtcGxlciBzdHJlYW0gb2YgZXZlbnRzIGF0IHdob3NlIGFycml2YWwgdGltZVxuICogIHN0cmVhbSdzIGxhdGVzdCB2YWx1ZSB3aWxsIGJlIHByb3BhZ2F0ZWRcbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0gc3RyZWFtIG9mIHZhbHVlc1xuICogQHJldHVybnMge1N0cmVhbX0gc2FtcGxlZCBzdHJlYW0gb2YgdmFsdWVzXG4gKi9cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBzYW1wbGVXaXRoKHNhbXBsZXIsIHN0cmVhbSkge1xuICByZXR1cm4gbmV3IF9TdHJlYW0yLmRlZmF1bHQobmV3IFNhbXBsZXIoYmFzZS5pZCwgc2FtcGxlci5zb3VyY2UsIFtzdHJlYW0uc291cmNlXSkpO1xufVxuXG5mdW5jdGlvbiBzYW1wbGVBcnJheShmLCBzYW1wbGVyLCBzdHJlYW1zKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgU2FtcGxlcihmLCBzYW1wbGVyLnNvdXJjZSwgYmFzZS5tYXAoZ2V0U291cmNlLCBzdHJlYW1zKSkpO1xufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2Uoc3RyZWFtKSB7XG4gIHJldHVybiBzdHJlYW0uc291cmNlO1xufVxuXG5mdW5jdGlvbiBTYW1wbGVyKGYsIHNhbXBsZXIsIHNvdXJjZXMpIHtcbiAgdGhpcy5mID0gZjtcbiAgdGhpcy5zYW1wbGVyID0gc2FtcGxlcjtcbiAgdGhpcy5zb3VyY2VzID0gc291cmNlcztcbn1cblxuU2FtcGxlci5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICB2YXIgdGhpcyQxID0gdGhpcztcblxuICB2YXIgbCA9IHRoaXMuc291cmNlcy5sZW5ndGg7XG4gIHZhciBkaXNwb3NhYmxlcyA9IG5ldyBBcnJheShsICsgMSk7XG4gIHZhciBzaW5rcyA9IG5ldyBBcnJheShsKTtcblxuICB2YXIgc2FtcGxlU2luayA9IG5ldyBTYW1wbGVTaW5rKHRoaXMuZiwgc2lua3MsIHNpbmspO1xuXG4gIGZvciAodmFyIGhvbGQsIGkgPSAwOyBpIDwgbDsgKytpKSB7XG4gICAgaG9sZCA9IHNpbmtzW2ldID0gbmV3IEhvbGQoc2FtcGxlU2luayk7XG4gICAgZGlzcG9zYWJsZXNbaV0gPSB0aGlzJDEuc291cmNlc1tpXS5ydW4oaG9sZCwgc2NoZWR1bGVyKTtcbiAgfVxuXG4gIGRpc3Bvc2FibGVzW2ldID0gdGhpcy5zYW1wbGVyLnJ1bihzYW1wbGVTaW5rLCBzY2hlZHVsZXIpO1xuXG4gIHJldHVybiBkaXNwb3NlLmFsbChkaXNwb3NhYmxlcyk7XG59O1xuXG5mdW5jdGlvbiBIb2xkKHNpbmspIHtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5oYXNWYWx1ZSA9IGZhbHNlO1xufVxuXG5Ib2xkLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHRoaXMudmFsdWUgPSB4O1xuICB0aGlzLmhhc1ZhbHVlID0gdHJ1ZTtcbiAgdGhpcy5zaW5rLl9ub3RpZnkodGhpcyk7XG59O1xuXG5Ib2xkLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoKSB7fTtcbkhvbGQucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yO1xuXG5mdW5jdGlvbiBTYW1wbGVTaW5rKGYsIHNpbmtzLCBzaW5rKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuc2lua3MgPSBzaW5rcztcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbn1cblxuU2FtcGxlU2luay5wcm90b3R5cGUuX25vdGlmeSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSkge1xuICAgIHRoaXMuYWN0aXZlID0gdGhpcy5zaW5rcy5ldmVyeShoYXNWYWx1ZSk7XG4gIH1cbn07XG5cblNhbXBsZVNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQpIHtcbiAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgdGhpcy5zaW5rLmV2ZW50KHQsICgwLCBfaW52b2tlMi5kZWZhdWx0KSh0aGlzLmYsIGJhc2UubWFwKGdldFZhbHVlLCB0aGlzLnNpbmtzKSkpO1xuICB9XG59O1xuXG5TYW1wbGVTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuU2FtcGxlU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbmZ1bmN0aW9uIGhhc1ZhbHVlKGhvbGQpIHtcbiAgcmV0dXJuIGhvbGQuaGFzVmFsdWU7XG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlKGhvbGQpIHtcbiAgcmV0dXJuIGhvbGQudmFsdWU7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy50YWtlID0gdGFrZTtcbmV4cG9ydHMuc2tpcCA9IHNraXA7XG5leHBvcnRzLnNsaWNlID0gc2xpY2U7XG5leHBvcnRzLnRha2VXaGlsZSA9IHRha2VXaGlsZTtcbmV4cG9ydHMuc2tpcFdoaWxlID0gc2tpcFdoaWxlO1xuZXhwb3J0cy5za2lwQWZ0ZXIgPSBza2lwQWZ0ZXI7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4uL3NpbmsvUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbnZhciBfY29yZSA9IHJlcXVpcmUoJy4uL3NvdXJjZS9jb3JlJyk7XG5cbnZhciBjb3JlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2NvcmUpO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuLi9kaXNwb3NhYmxlL2Rpc3Bvc2UnKTtcblxudmFyIGRpc3Bvc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZGlzcG9zZSk7XG5cbnZhciBfTWFwID0gcmVxdWlyZSgnLi4vZnVzaW9uL01hcCcpO1xuXG52YXIgX01hcDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9NYXApO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBAcGFyYW0ge251bWJlcn0gblxuICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbVxuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSBjb250YWluaW5nIG9ubHkgdXAgdG8gdGhlIGZpcnN0IG4gaXRlbXMgZnJvbSBzdHJlYW1cbiAqL1xuZnVuY3Rpb24gdGFrZShuLCBzdHJlYW0pIHtcbiAgcmV0dXJuIHNsaWNlKDAsIG4sIHN0cmVhbSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtudW1iZXJ9IG5cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW1cbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gd2l0aCB0aGUgZmlyc3QgbiBpdGVtcyByZW1vdmVkXG4gKi9cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBza2lwKG4sIHN0cmVhbSkge1xuICByZXR1cm4gc2xpY2UobiwgSW5maW5pdHksIHN0cmVhbSk7XG59XG5cbi8qKlxuICogU2xpY2UgYSBzdHJlYW0gYnkgaW5kZXguIE5lZ2F0aXZlIHN0YXJ0L2VuZCBpbmRleGVzIGFyZSBub3Qgc3VwcG9ydGVkXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnRcbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmRcbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW1cbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIGl0ZW1zIHdoZXJlIHN0YXJ0IDw9IGluZGV4IDwgZW5kXG4gKi9cbmZ1bmN0aW9uIHNsaWNlKHN0YXJ0LCBlbmQsIHN0cmVhbSkge1xuICByZXR1cm4gZW5kIDw9IHN0YXJ0ID8gY29yZS5lbXB0eSgpIDogbmV3IF9TdHJlYW0yLmRlZmF1bHQoc2xpY2VTb3VyY2Uoc3RhcnQsIGVuZCwgc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5mdW5jdGlvbiBzbGljZVNvdXJjZShzdGFydCwgZW5kLCBzb3VyY2UpIHtcbiAgcmV0dXJuIHNvdXJjZSBpbnN0YW5jZW9mIF9NYXAyLmRlZmF1bHQgPyBjb21tdXRlTWFwU2xpY2Uoc3RhcnQsIGVuZCwgc291cmNlKSA6IHNvdXJjZSBpbnN0YW5jZW9mIFNsaWNlID8gZnVzZVNsaWNlKHN0YXJ0LCBlbmQsIHNvdXJjZSkgOiBuZXcgU2xpY2Uoc3RhcnQsIGVuZCwgc291cmNlKTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZU1hcFNsaWNlKHN0YXJ0LCBlbmQsIHNvdXJjZSkge1xuICByZXR1cm4gX01hcDIuZGVmYXVsdC5jcmVhdGUoc291cmNlLmYsIHNsaWNlU291cmNlKHN0YXJ0LCBlbmQsIHNvdXJjZS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gZnVzZVNsaWNlKHN0YXJ0LCBlbmQsIHNvdXJjZSkge1xuICBzdGFydCArPSBzb3VyY2UubWluO1xuICBlbmQgPSBNYXRoLm1pbihlbmQgKyBzb3VyY2UubWluLCBzb3VyY2UubWF4KTtcbiAgcmV0dXJuIG5ldyBTbGljZShzdGFydCwgZW5kLCBzb3VyY2Uuc291cmNlKTtcbn1cblxuZnVuY3Rpb24gU2xpY2UobWluLCBtYXgsIHNvdXJjZSkge1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgdGhpcy5taW4gPSBtaW47XG4gIHRoaXMubWF4ID0gbWF4O1xufVxuXG5TbGljZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICB2YXIgZGlzcG9zYWJsZSA9IGRpc3Bvc2Uuc2V0dGFibGUoKTtcbiAgdmFyIHNsaWNlU2luayA9IG5ldyBTbGljZVNpbmsodGhpcy5taW4sIHRoaXMubWF4IC0gdGhpcy5taW4sIHNpbmssIGRpc3Bvc2FibGUpO1xuXG4gIGRpc3Bvc2FibGUuc2V0RGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5ydW4oc2xpY2VTaW5rLCBzY2hlZHVsZXIpKTtcbiAgcmV0dXJuIGRpc3Bvc2FibGU7XG59O1xuXG5mdW5jdGlvbiBTbGljZVNpbmsoc2tpcCwgdGFrZSwgc2luaywgZGlzcG9zYWJsZSkge1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLnNraXAgPSBza2lwO1xuICB0aGlzLnRha2UgPSB0YWtlO1xuICB0aGlzLmRpc3Bvc2FibGUgPSBkaXNwb3NhYmxlO1xufVxuXG5TbGljZVNpbmsucHJvdG90eXBlLmVuZCA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lbmQ7XG5TbGljZVNpbmsucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yO1xuXG5TbGljZVNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgLyogZXNsaW50IGNvbXBsZXhpdHk6IFsxLCA0XSAqL1xuICBpZiAodGhpcy5za2lwID4gMCkge1xuICAgIHRoaXMuc2tpcCAtPSAxO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0aGlzLnRha2UgPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLnRha2UgLT0gMTtcbiAgdGhpcy5zaW5rLmV2ZW50KHQsIHgpO1xuICBpZiAodGhpcy50YWtlID09PSAwKSB7XG4gICAgdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICB0aGlzLnNpbmsuZW5kKHQsIHgpO1xuICB9XG59O1xuXG5mdW5jdGlvbiB0YWtlV2hpbGUocCwgc3RyZWFtKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgVGFrZVdoaWxlKHAsIHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gVGFrZVdoaWxlKHAsIHNvdXJjZSkge1xuICB0aGlzLnAgPSBwO1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuVGFrZVdoaWxlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHZhciBkaXNwb3NhYmxlID0gZGlzcG9zZS5zZXR0YWJsZSgpO1xuICB2YXIgdGFrZVdoaWxlU2luayA9IG5ldyBUYWtlV2hpbGVTaW5rKHRoaXMucCwgc2luaywgZGlzcG9zYWJsZSk7XG5cbiAgZGlzcG9zYWJsZS5zZXREaXNwb3NhYmxlKHRoaXMuc291cmNlLnJ1bih0YWtlV2hpbGVTaW5rLCBzY2hlZHVsZXIpKTtcbiAgcmV0dXJuIGRpc3Bvc2FibGU7XG59O1xuXG5mdW5jdGlvbiBUYWtlV2hpbGVTaW5rKHAsIHNpbmssIGRpc3Bvc2FibGUpIHtcbiAgdGhpcy5wID0gcDtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLmRpc3Bvc2FibGUgPSBkaXNwb3NhYmxlO1xufVxuXG5UYWtlV2hpbGVTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuVGFrZVdoaWxlU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cblRha2VXaGlsZVNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBwID0gdGhpcy5wO1xuICB0aGlzLmFjdGl2ZSA9IHAoeCk7XG4gIGlmICh0aGlzLmFjdGl2ZSkge1xuICAgIHRoaXMuc2luay5ldmVudCh0LCB4KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmRpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgIHRoaXMuc2luay5lbmQodCwgeCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNraXBXaGlsZShwLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBTa2lwV2hpbGUocCwgc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5mdW5jdGlvbiBTa2lwV2hpbGUocCwgc291cmNlKSB7XG4gIHRoaXMucCA9IHA7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xufVxuXG5Ta2lwV2hpbGUucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgU2tpcFdoaWxlU2luayh0aGlzLnAsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gU2tpcFdoaWxlU2luayhwLCBzaW5rKSB7XG4gIHRoaXMucCA9IHA7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuc2tpcHBpbmcgPSB0cnVlO1xufVxuXG5Ta2lwV2hpbGVTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuU2tpcFdoaWxlU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cblNraXBXaGlsZVNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgaWYgKHRoaXMuc2tpcHBpbmcpIHtcbiAgICB2YXIgcCA9IHRoaXMucDtcbiAgICB0aGlzLnNraXBwaW5nID0gcCh4KTtcbiAgICBpZiAodGhpcy5za2lwcGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuc2luay5ldmVudCh0LCB4KTtcbn07XG5cbmZ1bmN0aW9uIHNraXBBZnRlcihwLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBTa2lwQWZ0ZXIocCwgc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5mdW5jdGlvbiBTa2lwQWZ0ZXIocCwgc291cmNlKSB7XG4gIHRoaXMucCA9IHA7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xufVxuXG5Ta2lwQWZ0ZXIucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIHJ1bihzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgU2tpcEFmdGVyU2luayh0aGlzLnAsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gU2tpcEFmdGVyU2luayhwLCBzaW5rKSB7XG4gIHRoaXMucCA9IHA7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuc2tpcHBpbmcgPSBmYWxzZTtcbn1cblxuU2tpcEFmdGVyU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiBldmVudCh0LCB4KSB7XG4gIGlmICh0aGlzLnNraXBwaW5nKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHAgPSB0aGlzLnA7XG4gIHRoaXMuc2tpcHBpbmcgPSBwKHgpO1xuICB0aGlzLnNpbmsuZXZlbnQodCwgeCk7XG5cbiAgaWYgKHRoaXMuc2tpcHBpbmcpIHtcbiAgICB0aGlzLnNpbmsuZW5kKHQsIHgpO1xuICB9XG59O1xuXG5Ta2lwQWZ0ZXJTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuU2tpcEFmdGVyU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zd2l0Y2ggPSB1bmRlZmluZWQ7XG5leHBvcnRzLnN3aXRjaExhdGVzdCA9IHN3aXRjaExhdGVzdDtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9kaXNwb3NlID0gcmVxdWlyZSgnLi4vZGlzcG9zYWJsZS9kaXNwb3NlJyk7XG5cbnZhciBkaXNwb3NlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2Rpc3Bvc2UpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBHaXZlbiBhIHN0cmVhbSBvZiBzdHJlYW1zLCByZXR1cm4gYSBuZXcgc3RyZWFtIHRoYXQgYWRvcHRzIHRoZSBiZWhhdmlvclxuICogb2YgdGhlIG1vc3QgcmVjZW50IGlubmVyIHN0cmVhbS5cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0gb2Ygc3RyZWFtcyBvbiB3aGljaCB0byBzd2l0Y2hcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN3aXRjaGluZyBzdHJlYW1cbiAqL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIHN3aXRjaExhdGVzdChzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBTd2l0Y2goc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5leHBvcnRzLnN3aXRjaCA9IHN3aXRjaExhdGVzdDtcblxuXG5mdW5jdGlvbiBTd2l0Y2goc291cmNlKSB7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xufVxuXG5Td2l0Y2gucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdmFyIHN3aXRjaFNpbmsgPSBuZXcgU3dpdGNoU2luayhzaW5rLCBzY2hlZHVsZXIpO1xuICByZXR1cm4gZGlzcG9zZS5hbGwoW3N3aXRjaFNpbmssIHRoaXMuc291cmNlLnJ1bihzd2l0Y2hTaW5rLCBzY2hlZHVsZXIpXSk7XG59O1xuXG5mdW5jdGlvbiBTd2l0Y2hTaW5rKHNpbmssIHNjaGVkdWxlcikge1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgdGhpcy5jdXJyZW50ID0gbnVsbDtcbiAgdGhpcy5lbmRlZCA9IGZhbHNlO1xufVxuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCBzdHJlYW0pIHtcbiAgdGhpcy5fZGlzcG9zZUN1cnJlbnQodCk7IC8vIFRPRE86IGNhcHR1cmUgdGhlIHJlc3VsdCBvZiB0aGlzIGRpc3Bvc2VcbiAgdGhpcy5jdXJyZW50ID0gbmV3IFNlZ21lbnQodCwgSW5maW5pdHksIHRoaXMsIHRoaXMuc2luayk7XG4gIHRoaXMuY3VycmVudC5kaXNwb3NhYmxlID0gc3RyZWFtLnNvdXJjZS5ydW4odGhpcy5jdXJyZW50LCB0aGlzLnNjaGVkdWxlcik7XG59O1xuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgdGhpcy5fY2hlY2tFbmQodCwgeCk7XG59O1xuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICh0LCBlKSB7XG4gIHRoaXMuZW5kZWQgPSB0cnVlO1xuICB0aGlzLnNpbmsuZXJyb3IodCwgZSk7XG59O1xuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fZGlzcG9zZUN1cnJlbnQodGhpcy5zY2hlZHVsZXIubm93KCkpO1xufTtcblxuU3dpdGNoU2luay5wcm90b3R5cGUuX2Rpc3Bvc2VDdXJyZW50ID0gZnVuY3Rpb24gKHQpIHtcbiAgaWYgKHRoaXMuY3VycmVudCAhPT0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnQuX2Rpc3Bvc2UodCk7XG4gIH1cbn07XG5cblN3aXRjaFNpbmsucHJvdG90eXBlLl9kaXNwb3NlSW5uZXIgPSBmdW5jdGlvbiAodCwgaW5uZXIpIHtcbiAgaW5uZXIuX2Rpc3Bvc2UodCk7IC8vIFRPRE86IGNhcHR1cmUgdGhlIHJlc3VsdCBvZiB0aGlzIGRpc3Bvc2VcbiAgaWYgKGlubmVyID09PSB0aGlzLmN1cnJlbnQpIHtcbiAgICB0aGlzLmN1cnJlbnQgPSBudWxsO1xuICB9XG59O1xuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5fY2hlY2tFbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAodGhpcy5lbmRlZCAmJiB0aGlzLmN1cnJlbnQgPT09IG51bGwpIHtcbiAgICB0aGlzLnNpbmsuZW5kKHQsIHgpO1xuICB9XG59O1xuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5fZW5kSW5uZXIgPSBmdW5jdGlvbiAodCwgeCwgaW5uZXIpIHtcbiAgdGhpcy5fZGlzcG9zZUlubmVyKHQsIGlubmVyKTtcbiAgdGhpcy5fY2hlY2tFbmQodCwgeCk7XG59O1xuXG5Td2l0Y2hTaW5rLnByb3RvdHlwZS5fZXJyb3JJbm5lciA9IGZ1bmN0aW9uICh0LCBlLCBpbm5lcikge1xuICB0aGlzLl9kaXNwb3NlSW5uZXIodCwgaW5uZXIpO1xuICB0aGlzLnNpbmsuZXJyb3IodCwgZSk7XG59O1xuXG5mdW5jdGlvbiBTZWdtZW50KG1pbiwgbWF4LCBvdXRlciwgc2luaykge1xuICB0aGlzLm1pbiA9IG1pbjtcbiAgdGhpcy5tYXggPSBtYXg7XG4gIHRoaXMub3V0ZXIgPSBvdXRlcjtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5kaXNwb3NhYmxlID0gZGlzcG9zZS5lbXB0eSgpO1xufVxuXG5TZWdtZW50LnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICh0IDwgdGhpcy5tYXgpIHtcbiAgICB0aGlzLnNpbmsuZXZlbnQoTWF0aC5tYXgodCwgdGhpcy5taW4pLCB4KTtcbiAgfVxufTtcblxuU2VnbWVudC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgdGhpcy5vdXRlci5fZW5kSW5uZXIoTWF0aC5tYXgodCwgdGhpcy5taW4pLCB4LCB0aGlzKTtcbn07XG5cblNlZ21lbnQucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKHQsIGUpIHtcbiAgdGhpcy5vdXRlci5fZXJyb3JJbm5lcihNYXRoLm1heCh0LCB0aGlzLm1pbiksIGUsIHRoaXMpO1xufTtcblxuU2VnbWVudC5wcm90b3R5cGUuX2Rpc3Bvc2UgPSBmdW5jdGlvbiAodCkge1xuICB0aGlzLm1heCA9IHQ7XG4gIGRpc3Bvc2UudHJ5RGlzcG9zZSh0LCB0aGlzLmRpc3Bvc2FibGUsIHRoaXMuc2luayk7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy50aHJ1ID0gdGhydTtcbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNyBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiB0aHJ1KGYsIHN0cmVhbSkge1xuICByZXR1cm4gZihzdHJlYW0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMudGFrZVVudGlsID0gdGFrZVVudGlsO1xuZXhwb3J0cy5za2lwVW50aWwgPSBza2lwVW50aWw7XG5leHBvcnRzLmR1cmluZyA9IGR1cmluZztcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxudmFyIF9kaXNwb3NlID0gcmVxdWlyZSgnLi4vZGlzcG9zYWJsZS9kaXNwb3NlJyk7XG5cbnZhciBkaXNwb3NlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2Rpc3Bvc2UpO1xuXG52YXIgX2ZsYXRNYXAgPSByZXF1aXJlKCcuLi9jb21iaW5hdG9yL2ZsYXRNYXAnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgeyBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiB0YWtlVW50aWwoc2lnbmFsLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBVbnRpbChzaWduYWwuc291cmNlLCBzdHJlYW0uc291cmNlKSk7XG59XG5cbmZ1bmN0aW9uIHNraXBVbnRpbChzaWduYWwsIHN0cmVhbSkge1xuICByZXR1cm4gbmV3IF9TdHJlYW0yLmRlZmF1bHQobmV3IFNpbmNlKHNpZ25hbC5zb3VyY2UsIHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gZHVyaW5nKHRpbWVXaW5kb3csIHN0cmVhbSkge1xuICByZXR1cm4gdGFrZVVudGlsKCgwLCBfZmxhdE1hcC5qb2luKSh0aW1lV2luZG93KSwgc2tpcFVudGlsKHRpbWVXaW5kb3csIHN0cmVhbSkpO1xufVxuXG5mdW5jdGlvbiBVbnRpbChtYXhTaWduYWwsIHNvdXJjZSkge1xuICB0aGlzLm1heFNpZ25hbCA9IG1heFNpZ25hbDtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cblVudGlsLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHZhciBtaW4gPSBuZXcgQm91bmQoLUluZmluaXR5LCBzaW5rKTtcbiAgdmFyIG1heCA9IG5ldyBVcHBlckJvdW5kKHRoaXMubWF4U2lnbmFsLCBzaW5rLCBzY2hlZHVsZXIpO1xuICB2YXIgZGlzcG9zYWJsZSA9IHRoaXMuc291cmNlLnJ1bihuZXcgVGltZVdpbmRvd1NpbmsobWluLCBtYXgsIHNpbmspLCBzY2hlZHVsZXIpO1xuXG4gIHJldHVybiBkaXNwb3NlLmFsbChbbWluLCBtYXgsIGRpc3Bvc2FibGVdKTtcbn07XG5cbmZ1bmN0aW9uIFNpbmNlKG1pblNpZ25hbCwgc291cmNlKSB7XG4gIHRoaXMubWluU2lnbmFsID0gbWluU2lnbmFsO1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuU2luY2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdmFyIG1pbiA9IG5ldyBMb3dlckJvdW5kKHRoaXMubWluU2lnbmFsLCBzaW5rLCBzY2hlZHVsZXIpO1xuICB2YXIgbWF4ID0gbmV3IEJvdW5kKEluZmluaXR5LCBzaW5rKTtcbiAgdmFyIGRpc3Bvc2FibGUgPSB0aGlzLnNvdXJjZS5ydW4obmV3IFRpbWVXaW5kb3dTaW5rKG1pbiwgbWF4LCBzaW5rKSwgc2NoZWR1bGVyKTtcblxuICByZXR1cm4gZGlzcG9zZS5hbGwoW21pbiwgbWF4LCBkaXNwb3NhYmxlXSk7XG59O1xuXG5mdW5jdGlvbiBCb3VuZCh2YWx1ZSwgc2luaykge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMuc2luayA9IHNpbms7XG59XG5cbkJvdW5kLnByb3RvdHlwZS5lcnJvciA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lcnJvcjtcbkJvdW5kLnByb3RvdHlwZS5ldmVudCA9IG5vb3A7XG5Cb3VuZC5wcm90b3R5cGUuZW5kID0gbm9vcDtcbkJvdW5kLnByb3RvdHlwZS5kaXNwb3NlID0gbm9vcDtcblxuZnVuY3Rpb24gVGltZVdpbmRvd1NpbmsobWluLCBtYXgsIHNpbmspIHtcbiAgdGhpcy5taW4gPSBtaW47XG4gIHRoaXMubWF4ID0gbWF4O1xuICB0aGlzLnNpbmsgPSBzaW5rO1xufVxuXG5UaW1lV2luZG93U2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAodCA+PSB0aGlzLm1pbi52YWx1ZSAmJiB0IDwgdGhpcy5tYXgudmFsdWUpIHtcbiAgICB0aGlzLnNpbmsuZXZlbnQodCwgeCk7XG4gIH1cbn07XG5cblRpbWVXaW5kb3dTaW5rLnByb3RvdHlwZS5lcnJvciA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lcnJvcjtcblRpbWVXaW5kb3dTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuXG5mdW5jdGlvbiBMb3dlckJvdW5kKHNpZ25hbCwgc2luaywgc2NoZWR1bGVyKSB7XG4gIHRoaXMudmFsdWUgPSBJbmZpbml0eTtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5kaXNwb3NhYmxlID0gc2lnbmFsLnJ1bih0aGlzLCBzY2hlZHVsZXIpO1xufVxuXG5Mb3dlckJvdW5kLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0IC8qLCB4ICovKSB7XG4gIGlmICh0IDwgdGhpcy52YWx1ZSkge1xuICAgIHRoaXMudmFsdWUgPSB0O1xuICB9XG59O1xuXG5Mb3dlckJvdW5kLnByb3RvdHlwZS5lbmQgPSBub29wO1xuTG93ZXJCb3VuZC5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbkxvd2VyQm91bmQucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmRpc3Bvc2FibGUuZGlzcG9zZSgpO1xufTtcblxuZnVuY3Rpb24gVXBwZXJCb3VuZChzaWduYWwsIHNpbmssIHNjaGVkdWxlcikge1xuICB0aGlzLnZhbHVlID0gSW5maW5pdHk7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuZGlzcG9zYWJsZSA9IHNpZ25hbC5ydW4odGhpcywgc2NoZWR1bGVyKTtcbn1cblxuVXBwZXJCb3VuZC5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAodCA8IHRoaXMudmFsdWUpIHtcbiAgICB0aGlzLnZhbHVlID0gdDtcbiAgICB0aGlzLnNpbmsuZW5kKHQsIHgpO1xuICB9XG59O1xuXG5VcHBlckJvdW5kLnByb3RvdHlwZS5lbmQgPSBub29wO1xuVXBwZXJCb3VuZC5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cblVwcGVyQm91bmQucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmRpc3Bvc2FibGUuZGlzcG9zZSgpO1xufTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy50aW1lc3RhbXAgPSB0aW1lc3RhbXA7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4uL3NpbmsvUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiB0aW1lc3RhbXAoc3RyZWFtKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgVGltZXN0YW1wKHN0cmVhbS5zb3VyY2UpKTtcbn1cblxuZnVuY3Rpb24gVGltZXN0YW1wKHNvdXJjZSkge1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuVGltZXN0YW1wLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiB0aGlzLnNvdXJjZS5ydW4obmV3IFRpbWVzdGFtcFNpbmsoc2luayksIHNjaGVkdWxlcik7XG59O1xuXG5mdW5jdGlvbiBUaW1lc3RhbXBTaW5rKHNpbmspIHtcbiAgdGhpcy5zaW5rID0gc2luaztcbn1cblxuVGltZXN0YW1wU2luay5wcm90b3R5cGUuZW5kID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVuZDtcblRpbWVzdGFtcFNpbmsucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yO1xuXG5UaW1lc3RhbXBTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHRoaXMuc2luay5ldmVudCh0LCB7IHRpbWU6IHQsIHZhbHVlOiB4IH0pO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnRyYW5zZHVjZSA9IHRyYW5zZHVjZTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJlYW0gYnkgcGFzc2luZyBpdHMgZXZlbnRzIHRocm91Z2ggYSB0cmFuc2R1Y2VyLlxuICogQHBhcmFtICB7ZnVuY3Rpb259IHRyYW5zZHVjZXIgdHJhbnNkdWNlciBmdW5jdGlvblxuICogQHBhcmFtICB7U3RyZWFtfSBzdHJlYW0gc3RyZWFtIHdob3NlIGV2ZW50cyB3aWxsIGJlIHBhc3NlZCB0aHJvdWdoIHRoZVxuICogIHRyYW5zZHVjZXJcbiAqIEByZXR1cm4ge1N0cmVhbX0gc3RyZWFtIG9mIGV2ZW50cyB0cmFuc2Zvcm1lZCBieSB0aGUgdHJhbnNkdWNlclxuICovXG5mdW5jdGlvbiB0cmFuc2R1Y2UodHJhbnNkdWNlciwgc3RyZWFtKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgVHJhbnNkdWNlKHRyYW5zZHVjZXIsIHN0cmVhbS5zb3VyY2UpKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIFRyYW5zZHVjZSh0cmFuc2R1Y2VyLCBzb3VyY2UpIHtcbiAgdGhpcy50cmFuc2R1Y2VyID0gdHJhbnNkdWNlcjtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59XG5cblRyYW5zZHVjZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICB2YXIgeGYgPSB0aGlzLnRyYW5zZHVjZXIobmV3IFRyYW5zZm9ybWVyKHNpbmspKTtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgVHJhbnNkdWNlU2luayhnZXRUeEhhbmRsZXIoeGYpLCBzaW5rKSwgc2NoZWR1bGVyKTtcbn07XG5cbmZ1bmN0aW9uIFRyYW5zZHVjZVNpbmsoYWRhcHRlciwgc2luaykge1xuICB0aGlzLnhmID0gYWRhcHRlcjtcbiAgdGhpcy5zaW5rID0gc2luaztcbn1cblxuVHJhbnNkdWNlU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB2YXIgbmV4dCA9IHRoaXMueGYuc3RlcCh0LCB4KTtcblxuICByZXR1cm4gdGhpcy54Zi5pc1JlZHVjZWQobmV4dCkgPyB0aGlzLnNpbmsuZW5kKHQsIHRoaXMueGYuZ2V0UmVzdWx0KG5leHQpKSA6IG5leHQ7XG59O1xuXG5UcmFuc2R1Y2VTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICByZXR1cm4gdGhpcy54Zi5yZXN1bHQoeCk7XG59O1xuXG5UcmFuc2R1Y2VTaW5rLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICh0LCBlKSB7XG4gIHJldHVybiB0aGlzLnNpbmsuZXJyb3IodCwgZSk7XG59O1xuXG5mdW5jdGlvbiBUcmFuc2Zvcm1lcihzaW5rKSB7XG4gIHRoaXMudGltZSA9IC1JbmZpbml0eTtcbiAgdGhpcy5zaW5rID0gc2luaztcbn1cblxuVHJhbnNmb3JtZXIucHJvdG90eXBlWydAQHRyYW5zZHVjZXIvaW5pdCddID0gVHJhbnNmb3JtZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuVHJhbnNmb3JtZXIucHJvdG90eXBlWydAQHRyYW5zZHVjZXIvc3RlcCddID0gVHJhbnNmb3JtZXIucHJvdG90eXBlLnN0ZXAgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAoIWlzTmFOKHQpKSB7XG4gICAgdGhpcy50aW1lID0gTWF0aC5tYXgodCwgdGhpcy50aW1lKTtcbiAgfVxuICByZXR1cm4gdGhpcy5zaW5rLmV2ZW50KHRoaXMudGltZSwgeCk7XG59O1xuXG5UcmFuc2Zvcm1lci5wcm90b3R5cGVbJ0BAdHJhbnNkdWNlci9yZXN1bHQnXSA9IFRyYW5zZm9ybWVyLnByb3RvdHlwZS5yZXN1bHQgPSBmdW5jdGlvbiAoeCkge1xuICByZXR1cm4gdGhpcy5zaW5rLmVuZCh0aGlzLnRpbWUsIHgpO1xufTtcblxuLyoqXG4qIEdpdmVuIGFuIG9iamVjdCBzdXBwb3J0aW5nIHRoZSBuZXcgb3IgbGVnYWN5IHRyYW5zZHVjZXIgcHJvdG9jb2wsXG4qIGNyZWF0ZSBhbiBhZGFwdGVyIGZvciBpdC5cbiogQHBhcmFtIHtvYmplY3R9IHR4IHRyYW5zZm9ybVxuKiBAcmV0dXJucyB7VHhBZGFwdGVyfExlZ2FjeVR4QWRhcHRlcn1cbiovXG5mdW5jdGlvbiBnZXRUeEhhbmRsZXIodHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB0eFsnQEB0cmFuc2R1Y2VyL3N0ZXAnXSA9PT0gJ2Z1bmN0aW9uJyA/IG5ldyBUeEFkYXB0ZXIodHgpIDogbmV3IExlZ2FjeVR4QWRhcHRlcih0eCk7XG59XG5cbi8qKlxuKiBBZGFwdGVyIGZvciBuZXcgb2ZmaWNpYWwgdHJhbnNkdWNlciBwcm90b2NvbFxuKiBAcGFyYW0ge29iamVjdH0gdHggdHJhbnNmb3JtXG4qIEBjb25zdHJ1Y3RvclxuKi9cbmZ1bmN0aW9uIFR4QWRhcHRlcih0eCkge1xuICB0aGlzLnR4ID0gdHg7XG59XG5cblR4QWRhcHRlci5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHJldHVybiB0aGlzLnR4WydAQHRyYW5zZHVjZXIvc3RlcCddKHQsIHgpO1xufTtcblR4QWRhcHRlci5wcm90b3R5cGUucmVzdWx0ID0gZnVuY3Rpb24gKHgpIHtcbiAgcmV0dXJuIHRoaXMudHhbJ0BAdHJhbnNkdWNlci9yZXN1bHQnXSh4KTtcbn07XG5UeEFkYXB0ZXIucHJvdG90eXBlLmlzUmVkdWNlZCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiB4ICE9IG51bGwgJiYgeFsnQEB0cmFuc2R1Y2VyL3JlZHVjZWQnXTtcbn07XG5UeEFkYXB0ZXIucHJvdG90eXBlLmdldFJlc3VsdCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiB4WydAQHRyYW5zZHVjZXIvdmFsdWUnXTtcbn07XG5cbi8qKlxuKiBBZGFwdGVyIGZvciBvbGRlciB0cmFuc2R1Y2VyIHByb3RvY29sXG4qIEBwYXJhbSB7b2JqZWN0fSB0eCB0cmFuc2Zvcm1cbiogQGNvbnN0cnVjdG9yXG4qL1xuZnVuY3Rpb24gTGVnYWN5VHhBZGFwdGVyKHR4KSB7XG4gIHRoaXMudHggPSB0eDtcbn1cblxuTGVnYWN5VHhBZGFwdGVyLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgcmV0dXJuIHRoaXMudHguc3RlcCh0LCB4KTtcbn07XG5MZWdhY3lUeEFkYXB0ZXIucHJvdG90eXBlLnJlc3VsdCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiB0aGlzLnR4LnJlc3VsdCh4KTtcbn07XG5MZWdhY3lUeEFkYXB0ZXIucHJvdG90eXBlLmlzUmVkdWNlZCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiB4ICE9IG51bGwgJiYgeC5fX3RyYW5zZHVjZXJzX3JlZHVjZWRfXztcbn07XG5MZWdhY3lUeEFkYXB0ZXIucHJvdG90eXBlLmdldFJlc3VsdCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiB4LnZhbHVlO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLm1hcCA9IG1hcDtcbmV4cG9ydHMuY29uc3RhbnQgPSBjb25zdGFudDtcbmV4cG9ydHMudGFwID0gdGFwO1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4uL1N0cmVhbScpO1xuXG52YXIgX1N0cmVhbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TdHJlYW0pO1xuXG52YXIgX01hcCA9IHJlcXVpcmUoJy4uL2Z1c2lvbi9NYXAnKTtcblxudmFyIF9NYXAyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTWFwKTtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gZWFjaCB2YWx1ZSBpbiB0aGUgc3RyZWFtIGJ5IGFwcGx5aW5nIGYgdG8gZWFjaFxuICogQHBhcmFtIHtmdW5jdGlvbigqKToqfSBmIG1hcHBpbmcgZnVuY3Rpb25cbiAqIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW0gc3RyZWFtIHRvIG1hcFxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgaXRlbXMgdHJhbnNmb3JtZWQgYnkgZlxuICovXG5mdW5jdGlvbiBtYXAoZiwgc3RyZWFtKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChfTWFwMi5kZWZhdWx0LmNyZWF0ZShmLCBzdHJlYW0uc291cmNlKSk7XG59XG5cbi8qKlxuKiBSZXBsYWNlIGVhY2ggdmFsdWUgaW4gdGhlIHN0cmVhbSB3aXRoIHhcbiogQHBhcmFtIHsqfSB4XG4qIEBwYXJhbSB7U3RyZWFtfSBzdHJlYW1cbiogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgaXRlbXMgcmVwbGFjZWQgd2l0aCB4XG4qL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIGNvbnN0YW50KHgsIHN0cmVhbSkge1xuICByZXR1cm4gbWFwKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4geDtcbiAgfSwgc3RyZWFtKTtcbn1cblxuLyoqXG4qIFBlcmZvcm0gYSBzaWRlIGVmZmVjdCBmb3IgZWFjaCBpdGVtIGluIHRoZSBzdHJlYW1cbiogQHBhcmFtIHtmdW5jdGlvbih4OiopOip9IGYgc2lkZSBlZmZlY3QgdG8gZXhlY3V0ZSBmb3IgZWFjaCBpdGVtLiBUaGVcbiogIHJldHVybiB2YWx1ZSB3aWxsIGJlIGRpc2NhcmRlZC5cbiogQHBhcmFtIHtTdHJlYW19IHN0cmVhbSBzdHJlYW0gdG8gdGFwXG4qIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gY29udGFpbmluZyB0aGUgc2FtZSBpdGVtcyBhcyB0aGlzIHN0cmVhbVxuKi9cbmZ1bmN0aW9uIHRhcChmLCBzdHJlYW0pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBUYXAoZiwgc3RyZWFtLnNvdXJjZSkpO1xufVxuXG5mdW5jdGlvbiBUYXAoZiwgc291cmNlKSB7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xuICB0aGlzLmYgPSBmO1xufVxuXG5UYXAucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgVGFwU2luayh0aGlzLmYsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gVGFwU2luayhmLCBzaW5rKSB7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuZiA9IGY7XG59XG5cblRhcFNpbmsucHJvdG90eXBlLmVuZCA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lbmQ7XG5UYXBTaW5rLnByb3RvdHlwZS5lcnJvciA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lcnJvcjtcblxuVGFwU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB2YXIgZiA9IHRoaXMuZjtcbiAgZih4KTtcbiAgdGhpcy5zaW5rLmV2ZW50KHQsIHgpO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnppcCA9IHppcDtcbmV4cG9ydHMuemlwQXJyYXkgPSB6aXBBcnJheTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF90cmFuc2Zvcm0gPSByZXF1aXJlKCcuL3RyYW5zZm9ybScpO1xuXG52YXIgdHJhbnNmb3JtID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3RyYW5zZm9ybSk7XG5cbnZhciBfY29yZSA9IHJlcXVpcmUoJy4uL3NvdXJjZS9jb3JlJyk7XG5cbnZhciBjb3JlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2NvcmUpO1xuXG52YXIgX1BpcGUgPSByZXF1aXJlKCcuLi9zaW5rL1BpcGUnKTtcblxudmFyIF9QaXBlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1BpcGUpO1xuXG52YXIgX0luZGV4U2luayA9IHJlcXVpcmUoJy4uL3NpbmsvSW5kZXhTaW5rJyk7XG5cbnZhciBfSW5kZXhTaW5rMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0luZGV4U2luayk7XG5cbnZhciBfZGlzcG9zZSA9IHJlcXVpcmUoJy4uL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxudmFyIF9wcmVsdWRlID0gcmVxdWlyZSgnQG1vc3QvcHJlbHVkZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9wcmVsdWRlKTtcblxudmFyIF9pbnZva2UgPSByZXF1aXJlKCcuLi9pbnZva2UnKTtcblxudmFyIF9pbnZva2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfaW52b2tlKTtcblxudmFyIF9RdWV1ZSA9IHJlcXVpcmUoJy4uL1F1ZXVlJyk7XG5cbnZhciBfUXVldWUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUXVldWUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIG1hcCA9IGJhc2UubWFwOyAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIHRhaWwgPSBiYXNlLnRhaWw7XG5cbi8qKlxuICogQ29tYmluZSBzdHJlYW1zIHBhaXJ3aXNlIChvciB0dXBsZS13aXNlKSBieSBpbmRleCBieSBhcHBseWluZyBmIHRvIHZhbHVlc1xuICogYXQgY29ycmVzcG9uZGluZyBpbmRpY2VzLiAgVGhlIHJldHVybmVkIHN0cmVhbSBlbmRzIHdoZW4gYW55IG9mIHRoZSBpbnB1dFxuICogc3RyZWFtcyBlbmRzLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gZiBmdW5jdGlvbiB0byBjb21iaW5lIHZhbHVlc1xuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSB3aXRoIGl0ZW1zIGF0IGNvcnJlc3BvbmRpbmcgaW5kaWNlcyBjb21iaW5lZFxuICogIHVzaW5nIGZcbiAqL1xuZnVuY3Rpb24gemlwKGYgLyosIC4uLnN0cmVhbXMgKi8pIHtcbiAgcmV0dXJuIHppcEFycmF5KGYsIHRhaWwoYXJndW1lbnRzKSk7XG59XG5cbi8qKlxuKiBDb21iaW5lIHN0cmVhbXMgcGFpcndpc2UgKG9yIHR1cGxlLXdpc2UpIGJ5IGluZGV4IGJ5IGFwcGx5aW5nIGYgdG8gdmFsdWVzXG4qIGF0IGNvcnJlc3BvbmRpbmcgaW5kaWNlcy4gIFRoZSByZXR1cm5lZCBzdHJlYW0gZW5kcyB3aGVuIGFueSBvZiB0aGUgaW5wdXRcbiogc3RyZWFtcyBlbmRzLlxuKiBAcGFyYW0ge2Z1bmN0aW9ufSBmIGZ1bmN0aW9uIHRvIGNvbWJpbmUgdmFsdWVzXG4qIEBwYXJhbSB7W1N0cmVhbV19IHN0cmVhbXMgc3RyZWFtcyB0byB6aXAgdXNpbmcgZlxuKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIHdpdGggaXRlbXMgYXQgY29ycmVzcG9uZGluZyBpbmRpY2VzIGNvbWJpbmVkXG4qICB1c2luZyBmXG4qL1xuZnVuY3Rpb24gemlwQXJyYXkoZiwgc3RyZWFtcykge1xuICByZXR1cm4gc3RyZWFtcy5sZW5ndGggPT09IDAgPyBjb3JlLmVtcHR5KCkgOiBzdHJlYW1zLmxlbmd0aCA9PT0gMSA/IHRyYW5zZm9ybS5tYXAoZiwgc3RyZWFtc1swXSkgOiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgWmlwKGYsIG1hcChnZXRTb3VyY2UsIHN0cmVhbXMpKSk7XG59XG5cbmZ1bmN0aW9uIGdldFNvdXJjZShzdHJlYW0pIHtcbiAgcmV0dXJuIHN0cmVhbS5zb3VyY2U7XG59XG5cbmZ1bmN0aW9uIFppcChmLCBzb3VyY2VzKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuc291cmNlcyA9IHNvdXJjZXM7XG59XG5cblppcC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICB2YXIgdGhpcyQxID0gdGhpcztcblxuICB2YXIgbCA9IHRoaXMuc291cmNlcy5sZW5ndGg7XG4gIHZhciBkaXNwb3NhYmxlcyA9IG5ldyBBcnJheShsKTtcbiAgdmFyIHNpbmtzID0gbmV3IEFycmF5KGwpO1xuICB2YXIgYnVmZmVycyA9IG5ldyBBcnJheShsKTtcblxuICB2YXIgemlwU2luayA9IG5ldyBaaXBTaW5rKHRoaXMuZiwgYnVmZmVycywgc2lua3MsIHNpbmspO1xuXG4gIGZvciAodmFyIGluZGV4U2luaywgaSA9IDA7IGkgPCBsOyArK2kpIHtcbiAgICBidWZmZXJzW2ldID0gbmV3IF9RdWV1ZTIuZGVmYXVsdCgpO1xuICAgIGluZGV4U2luayA9IHNpbmtzW2ldID0gbmV3IF9JbmRleFNpbmsyLmRlZmF1bHQoaSwgemlwU2luayk7XG4gICAgZGlzcG9zYWJsZXNbaV0gPSB0aGlzJDEuc291cmNlc1tpXS5ydW4oaW5kZXhTaW5rLCBzY2hlZHVsZXIpO1xuICB9XG5cbiAgcmV0dXJuIGRpc3Bvc2UuYWxsKGRpc3Bvc2FibGVzKTtcbn07XG5cbmZ1bmN0aW9uIFppcFNpbmsoZiwgYnVmZmVycywgc2lua3MsIHNpbmspIHtcbiAgdGhpcy5mID0gZjtcbiAgdGhpcy5zaW5rcyA9IHNpbmtzO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLmJ1ZmZlcnMgPSBidWZmZXJzO1xufVxuXG5aaXBTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCBpbmRleGVkVmFsdWUpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb21wbGV4aXR5XG4gIHZhciBidWZmZXJzID0gdGhpcy5idWZmZXJzO1xuICB2YXIgYnVmZmVyID0gYnVmZmVyc1tpbmRleGVkVmFsdWUuaW5kZXhdO1xuXG4gIGJ1ZmZlci5wdXNoKGluZGV4ZWRWYWx1ZS52YWx1ZSk7XG5cbiAgaWYgKGJ1ZmZlci5sZW5ndGgoKSA9PT0gMSkge1xuICAgIGlmICghcmVhZHkodGhpcy5idWZmZXJzKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGVtaXRaaXBwZWQodGhpcy5mLCB0LCBidWZmZXJzLCB0aGlzLnNpbmspO1xuXG4gICAgaWYgKGVuZGVkKHRoaXMuYnVmZmVycywgdGhpcy5zaW5rcykpIHtcbiAgICAgIHRoaXMuc2luay5lbmQodCwgdm9pZCAwKTtcbiAgICB9XG4gIH1cbn07XG5cblppcFNpbmsucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCBpbmRleGVkVmFsdWUpIHtcbiAgdmFyIGJ1ZmZlciA9IHRoaXMuYnVmZmVyc1tpbmRleGVkVmFsdWUuaW5kZXhdO1xuICBpZiAoYnVmZmVyLmlzRW1wdHkoKSkge1xuICAgIHRoaXMuc2luay5lbmQodCwgaW5kZXhlZFZhbHVlLnZhbHVlKTtcbiAgfVxufTtcblxuWmlwU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbmZ1bmN0aW9uIGVtaXRaaXBwZWQoZiwgdCwgYnVmZmVycywgc2luaykge1xuICBzaW5rLmV2ZW50KHQsICgwLCBfaW52b2tlMi5kZWZhdWx0KShmLCBtYXAoaGVhZCwgYnVmZmVycykpKTtcbn1cblxuZnVuY3Rpb24gaGVhZChidWZmZXIpIHtcbiAgcmV0dXJuIGJ1ZmZlci5zaGlmdCgpO1xufVxuXG5mdW5jdGlvbiBlbmRlZChidWZmZXJzLCBzaW5rcykge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGJ1ZmZlcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGJ1ZmZlcnNbaV0uaXNFbXB0eSgpICYmICFzaW5rc1tpXS5hY3RpdmUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlYWR5KGJ1ZmZlcnMpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBidWZmZXJzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChidWZmZXJzW2ldLmlzRW1wdHkoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IERpc3Bvc2FibGU7XG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgRGlzcG9zYWJsZSB3aGljaCB3aWxsIGRpc3Bvc2UgaXRzIHVuZGVybHlpbmcgcmVzb3VyY2UuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBkaXNwb3NlIGZ1bmN0aW9uXG4gKiBAcGFyYW0geyo/fSBkYXRhIGFueSBkYXRhIHRvIGJlIHBhc3NlZCB0byBkaXNwb3NlciBmdW5jdGlvblxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIERpc3Bvc2FibGUoZGlzcG9zZSwgZGF0YSkge1xuICB0aGlzLl9kaXNwb3NlID0gZGlzcG9zZTtcbiAgdGhpcy5fZGF0YSA9IGRhdGE7XG59XG5cbkRpc3Bvc2FibGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9kaXNwb3NlKHRoaXMuX2RhdGEpO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBTZXR0YWJsZURpc3Bvc2FibGU7XG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gU2V0dGFibGVEaXNwb3NhYmxlKCkge1xuICB0aGlzLmRpc3Bvc2FibGUgPSB2b2lkIDA7XG4gIHRoaXMuZGlzcG9zZWQgPSBmYWxzZTtcbiAgdGhpcy5fcmVzb2x2ZSA9IHZvaWQgMDtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMucmVzdWx0ID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICBzZWxmLl9yZXNvbHZlID0gcmVzb2x2ZTtcbiAgfSk7XG59XG5cblNldHRhYmxlRGlzcG9zYWJsZS5wcm90b3R5cGUuc2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uIChkaXNwb3NhYmxlKSB7XG4gIGlmICh0aGlzLmRpc3Bvc2FibGUgIT09IHZvaWQgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0RGlzcG9zYWJsZSBjYWxsZWQgbW9yZSB0aGFuIG9uY2UnKTtcbiAgfVxuXG4gIHRoaXMuZGlzcG9zYWJsZSA9IGRpc3Bvc2FibGU7XG5cbiAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICB0aGlzLl9yZXNvbHZlKGRpc3Bvc2FibGUuZGlzcG9zZSgpKTtcbiAgfVxufTtcblxuU2V0dGFibGVEaXNwb3NhYmxlLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgIHJldHVybiB0aGlzLnJlc3VsdDtcbiAgfVxuXG4gIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuXG4gIGlmICh0aGlzLmRpc3Bvc2FibGUgIT09IHZvaWQgMCkge1xuICAgIHRoaXMucmVzdWx0ID0gdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnJlc3VsdDtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy50cnlEaXNwb3NlID0gdHJ5RGlzcG9zZTtcbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuZXhwb3J0cy5lbXB0eSA9IGVtcHR5O1xuZXhwb3J0cy5hbGwgPSBhbGw7XG5leHBvcnRzLnByb21pc2VkID0gcHJvbWlzZWQ7XG5leHBvcnRzLnNldHRhYmxlID0gc2V0dGFibGU7XG5leHBvcnRzLm9uY2UgPSBvbmNlO1xuXG52YXIgX0Rpc3Bvc2FibGUgPSByZXF1aXJlKCcuL0Rpc3Bvc2FibGUnKTtcblxudmFyIF9EaXNwb3NhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0Rpc3Bvc2FibGUpO1xuXG52YXIgX1NldHRhYmxlRGlzcG9zYWJsZSA9IHJlcXVpcmUoJy4vU2V0dGFibGVEaXNwb3NhYmxlJyk7XG5cbnZhciBfU2V0dGFibGVEaXNwb3NhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1NldHRhYmxlRGlzcG9zYWJsZSk7XG5cbnZhciBfUHJvbWlzZSA9IHJlcXVpcmUoJy4uL1Byb21pc2UnKTtcblxudmFyIF9wcmVsdWRlID0gcmVxdWlyZSgnQG1vc3QvcHJlbHVkZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9wcmVsdWRlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgeyBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xudmFyIG1hcCA9IGJhc2UubWFwO1xudmFyIGlkZW50aXR5ID0gYmFzZS5pZDtcblxuLyoqXG4gKiBDYWxsIGRpc3Bvc2FibGUuZGlzcG9zZS4gIElmIGl0IHJldHVybnMgYSBwcm9taXNlLCBjYXRjaCBwcm9taXNlXG4gKiBlcnJvciBhbmQgZm9yd2FyZCBpdCB0aHJvdWdoIHRoZSBwcm92aWRlZCBzaW5rLlxuICogQHBhcmFtIHtudW1iZXJ9IHQgdGltZVxuICogQHBhcmFtIHt7ZGlzcG9zZTogZnVuY3Rpb259fSBkaXNwb3NhYmxlXG4gKiBAcGFyYW0ge3tlcnJvcjogZnVuY3Rpb259fSBzaW5rXG4gKiBAcmV0dXJuIHsqfSByZXN1bHQgb2YgZGlzcG9zYWJsZS5kaXNwb3NlXG4gKi9cbmZ1bmN0aW9uIHRyeURpc3Bvc2UodCwgZGlzcG9zYWJsZSwgc2luaykge1xuICB2YXIgcmVzdWx0ID0gZGlzcG9zZVNhZmVseShkaXNwb3NhYmxlKTtcbiAgcmV0dXJuICgwLCBfUHJvbWlzZS5pc1Byb21pc2UpKHJlc3VsdCkgPyByZXN1bHQuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICBzaW5rLmVycm9yKHQsIGUpO1xuICB9KSA6IHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgRGlzcG9zYWJsZSB3aGljaCB3aWxsIGRpc3Bvc2UgaXRzIHVuZGVybHlpbmcgcmVzb3VyY2VcbiAqIGF0IG1vc3Qgb25jZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGRpc3Bvc2UgZnVuY3Rpb25cbiAqIEBwYXJhbSB7Kj99IGRhdGEgYW55IGRhdGEgdG8gYmUgcGFzc2VkIHRvIGRpc3Bvc2VyIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtEaXNwb3NhYmxlfVxuICovXG5mdW5jdGlvbiBjcmVhdGUoZGlzcG9zZSwgZGF0YSkge1xuICByZXR1cm4gb25jZShuZXcgX0Rpc3Bvc2FibGUyLmRlZmF1bHQoZGlzcG9zZSwgZGF0YSkpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5vb3AgZGlzcG9zYWJsZS4gQ2FuIGJlIHVzZWQgdG8gc2F0aXNmeSBhIERpc3Bvc2FibGVcbiAqIHJlcXVpcmVtZW50IHdoZW4gbm8gYWN0dWFsIHJlc291cmNlIG5lZWRzIHRvIGJlIGRpc3Bvc2VkLlxuICogQHJldHVybiB7RGlzcG9zYWJsZXxleHBvcnRzfG1vZHVsZS5leHBvcnRzfVxuICovXG5mdW5jdGlvbiBlbXB0eSgpIHtcbiAgcmV0dXJuIG5ldyBfRGlzcG9zYWJsZTIuZGVmYXVsdChpZGVudGl0eSwgdm9pZCAwKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkaXNwb3NhYmxlIHRoYXQgd2lsbCBkaXNwb3NlIGFsbCBpbnB1dCBkaXNwb3NhYmxlcyBpbiBwYXJhbGxlbC5cbiAqIEBwYXJhbSB7QXJyYXk8RGlzcG9zYWJsZT59IGRpc3Bvc2FibGVzXG4gKiBAcmV0dXJuIHtEaXNwb3NhYmxlfVxuICovXG5mdW5jdGlvbiBhbGwoZGlzcG9zYWJsZXMpIHtcbiAgcmV0dXJuIGNyZWF0ZShkaXNwb3NlQWxsLCBkaXNwb3NhYmxlcyk7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VBbGwoZGlzcG9zYWJsZXMpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKG1hcChkaXNwb3NlU2FmZWx5LCBkaXNwb3NhYmxlcykpO1xufVxuXG5mdW5jdGlvbiBkaXNwb3NlU2FmZWx5KGRpc3Bvc2FibGUpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkaXNwb3NhYmxlIGZyb20gYSBwcm9taXNlIGZvciBhbm90aGVyIGRpc3Bvc2FibGVcbiAqIEBwYXJhbSB7UHJvbWlzZTxEaXNwb3NhYmxlPn0gZGlzcG9zYWJsZVByb21pc2VcbiAqIEByZXR1cm4ge0Rpc3Bvc2FibGV9XG4gKi9cbmZ1bmN0aW9uIHByb21pc2VkKGRpc3Bvc2FibGVQcm9taXNlKSB7XG4gIHJldHVybiBjcmVhdGUoZGlzcG9zZVByb21pc2UsIGRpc3Bvc2FibGVQcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gZGlzcG9zZVByb21pc2UoZGlzcG9zYWJsZVByb21pc2UpIHtcbiAgcmV0dXJuIGRpc3Bvc2FibGVQcm9taXNlLnRoZW4oZGlzcG9zZU9uZSk7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VPbmUoZGlzcG9zYWJsZSkge1xuICByZXR1cm4gZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgZGlzcG9zYWJsZSBwcm94eSB0aGF0IGFsbG93cyBpdHMgdW5kZXJseWluZyBkaXNwb3NhYmxlIHRvXG4gKiBiZSBzZXQgbGF0ZXIuXG4gKiBAcmV0dXJuIHtTZXR0YWJsZURpc3Bvc2FibGV9XG4gKi9cbmZ1bmN0aW9uIHNldHRhYmxlKCkge1xuICByZXR1cm4gbmV3IF9TZXR0YWJsZURpc3Bvc2FibGUyLmRlZmF1bHQoKTtcbn1cblxuLyoqXG4gKiBXcmFwIGFuIGV4aXN0aW5nIGRpc3Bvc2FibGUgKHdoaWNoIG1heSBub3QgYWxyZWFkeSBoYXZlIGJlZW4gb25jZSgpZClcbiAqIHNvIHRoYXQgaXQgd2lsbCBvbmx5IGRpc3Bvc2UgaXRzIHVuZGVybHlpbmcgcmVzb3VyY2UgYXQgbW9zdCBvbmNlLlxuICogQHBhcmFtIHt7IGRpc3Bvc2U6IGZ1bmN0aW9uKCkgfX0gZGlzcG9zYWJsZVxuICogQHJldHVybiB7RGlzcG9zYWJsZX0gd3JhcHBlZCBkaXNwb3NhYmxlXG4gKi9cbmZ1bmN0aW9uIG9uY2UoZGlzcG9zYWJsZSkge1xuICByZXR1cm4gbmV3IF9EaXNwb3NhYmxlMi5kZWZhdWx0KGRpc3Bvc2VNZW1vaXplZCwgbWVtb2l6ZWQoZGlzcG9zYWJsZSkpO1xufVxuXG5mdW5jdGlvbiBkaXNwb3NlTWVtb2l6ZWQobWVtb2l6ZWQpIHtcbiAgaWYgKCFtZW1vaXplZC5kaXNwb3NlZCkge1xuICAgIG1lbW9pemVkLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICBtZW1vaXplZC52YWx1ZSA9IGRpc3Bvc2VTYWZlbHkobWVtb2l6ZWQuZGlzcG9zYWJsZSk7XG4gICAgbWVtb2l6ZWQuZGlzcG9zYWJsZSA9IHZvaWQgMDtcbiAgfVxuXG4gIHJldHVybiBtZW1vaXplZC52YWx1ZTtcbn1cblxuZnVuY3Rpb24gbWVtb2l6ZWQoZGlzcG9zYWJsZSkge1xuICByZXR1cm4geyBkaXNwb3NlZDogZmFsc2UsIGRpc3Bvc2FibGU6IGRpc3Bvc2FibGUsIHZhbHVlOiB2b2lkIDAgfTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGZhdGFsRXJyb3I7XG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gZmF0YWxFcnJvcihlKSB7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIHRocm93IGU7XG4gIH0sIDApO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IEZpbHRlcjtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gRmlsdGVyKHAsIHNvdXJjZSkge1xuICB0aGlzLnAgPSBwO1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBmaWx0ZXJlZCBzb3VyY2UsIGZ1c2luZyBhZGphY2VudCBmaWx0ZXIuZmlsdGVyIGlmIHBvc3NpYmxlXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHg6Kik6Ym9vbGVhbn0gcCBmaWx0ZXJpbmcgcHJlZGljYXRlXG4gKiBAcGFyYW0ge3tydW46ZnVuY3Rpb259fSBzb3VyY2Ugc291cmNlIHRvIGZpbHRlclxuICogQHJldHVybnMge0ZpbHRlcn0gZmlsdGVyZWQgc291cmNlXG4gKi9cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5GaWx0ZXIuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlRmlsdGVyKHAsIHNvdXJjZSkge1xuICBpZiAoc291cmNlIGluc3RhbmNlb2YgRmlsdGVyKSB7XG4gICAgcmV0dXJuIG5ldyBGaWx0ZXIoYW5kKHNvdXJjZS5wLCBwKSwgc291cmNlLnNvdXJjZSk7XG4gIH1cblxuICByZXR1cm4gbmV3IEZpbHRlcihwLCBzb3VyY2UpO1xufTtcblxuRmlsdGVyLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiB0aGlzLnNvdXJjZS5ydW4obmV3IEZpbHRlclNpbmsodGhpcy5wLCBzaW5rKSwgc2NoZWR1bGVyKTtcbn07XG5cbmZ1bmN0aW9uIEZpbHRlclNpbmsocCwgc2luaykge1xuICB0aGlzLnAgPSBwO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xufVxuXG5GaWx0ZXJTaW5rLnByb3RvdHlwZS5lbmQgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZW5kO1xuRmlsdGVyU2luay5wcm90b3R5cGUuZXJyb3IgPSBfUGlwZTIuZGVmYXVsdC5wcm90b3R5cGUuZXJyb3I7XG5cbkZpbHRlclNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgdmFyIHAgPSB0aGlzLnA7XG4gIHAoeCkgJiYgdGhpcy5zaW5rLmV2ZW50KHQsIHgpO1xufTtcblxuZnVuY3Rpb24gYW5kKHAsIHEpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHAoeCkgJiYgcSh4KTtcbiAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBGaWx0ZXJNYXA7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4uL3NpbmsvUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIEZpbHRlck1hcChwLCBmLCBzb3VyY2UpIHtcbiAgdGhpcy5wID0gcDtcbiAgdGhpcy5mID0gZjtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG59IC8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5GaWx0ZXJNYXAucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgRmlsdGVyTWFwU2luayh0aGlzLnAsIHRoaXMuZiwgc2luayksIHNjaGVkdWxlcik7XG59O1xuXG5mdW5jdGlvbiBGaWx0ZXJNYXBTaW5rKHAsIGYsIHNpbmspIHtcbiAgdGhpcy5wID0gcDtcbiAgdGhpcy5mID0gZjtcbiAgdGhpcy5zaW5rID0gc2luaztcbn1cblxuRmlsdGVyTWFwU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB2YXIgZiA9IHRoaXMuZjtcbiAgdmFyIHAgPSB0aGlzLnA7XG4gIHAoeCkgJiYgdGhpcy5zaW5rLmV2ZW50KHQsIGYoeCkpO1xufTtcblxuRmlsdGVyTWFwU2luay5wcm90b3R5cGUuZW5kID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVuZDtcbkZpbHRlck1hcFNpbmsucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IE1hcDtcblxudmFyIF9QaXBlID0gcmVxdWlyZSgnLi4vc2luay9QaXBlJyk7XG5cbnZhciBfUGlwZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9QaXBlKTtcblxudmFyIF9GaWx0ZXIgPSByZXF1aXJlKCcuL0ZpbHRlcicpO1xuXG52YXIgX0ZpbHRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9GaWx0ZXIpO1xuXG52YXIgX0ZpbHRlck1hcCA9IHJlcXVpcmUoJy4vRmlsdGVyTWFwJyk7XG5cbnZhciBfRmlsdGVyTWFwMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0ZpbHRlck1hcCk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcHJlbHVkZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gTWFwKGYsIHNvdXJjZSkge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBtYXBwZWQgc291cmNlLCBmdXNpbmcgYWRqYWNlbnQgbWFwLm1hcCwgZmlsdGVyLm1hcCxcbiAqIGFuZCBmaWx0ZXIubWFwLm1hcCBpZiBwb3NzaWJsZVxuICogQHBhcmFtIHtmdW5jdGlvbigqKToqfSBmIG1hcHBpbmcgZnVuY3Rpb25cbiAqIEBwYXJhbSB7e3J1bjpmdW5jdGlvbn19IHNvdXJjZSBzb3VyY2UgdG8gbWFwXG4gKiBAcmV0dXJucyB7TWFwfEZpbHRlck1hcH0gbWFwcGVkIHNvdXJjZSwgcG9zc2libHkgZnVzZWRcbiAqL1xuTWFwLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZU1hcChmLCBzb3VyY2UpIHtcbiAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIE1hcCkge1xuICAgIHJldHVybiBuZXcgTWFwKGJhc2UuY29tcG9zZShmLCBzb3VyY2UuZiksIHNvdXJjZS5zb3VyY2UpO1xuICB9XG5cbiAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIF9GaWx0ZXIyLmRlZmF1bHQpIHtcbiAgICByZXR1cm4gbmV3IF9GaWx0ZXJNYXAyLmRlZmF1bHQoc291cmNlLnAsIGYsIHNvdXJjZS5zb3VyY2UpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBNYXAoZiwgc291cmNlKTtcbn07XG5cbk1hcC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV4dGVuZC1uYXRpdmVcbiAgcmV0dXJuIHRoaXMuc291cmNlLnJ1bihuZXcgTWFwU2luayh0aGlzLmYsIHNpbmspLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gTWFwU2luayhmLCBzaW5rKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuc2luayA9IHNpbms7XG59XG5cbk1hcFNpbmsucHJvdG90eXBlLmVuZCA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lbmQ7XG5NYXBTaW5rLnByb3RvdHlwZS5lcnJvciA9IF9QaXBlMi5kZWZhdWx0LnByb3RvdHlwZS5lcnJvcjtcblxuTWFwU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICB2YXIgZiA9IHRoaXMuZjtcbiAgdGhpcy5zaW5rLmV2ZW50KHQsIGYoeCkpO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlByb3BhZ2F0ZVRhc2sgPSBleHBvcnRzLmRlZmF1bHRTY2hlZHVsZXIgPSBleHBvcnRzLm11bHRpY2FzdCA9IGV4cG9ydHMudGhyb3dFcnJvciA9IGV4cG9ydHMuZmxhdE1hcEVycm9yID0gZXhwb3J0cy5yZWNvdmVyV2l0aCA9IGV4cG9ydHMuYXdhaXQgPSBleHBvcnRzLmF3YWl0UHJvbWlzZXMgPSBleHBvcnRzLmZyb21Qcm9taXNlID0gZXhwb3J0cy5kZWJvdW5jZSA9IGV4cG9ydHMudGhyb3R0bGUgPSBleHBvcnRzLnRpbWVzdGFtcCA9IGV4cG9ydHMuZGVsYXkgPSBleHBvcnRzLmR1cmluZyA9IGV4cG9ydHMuc2luY2UgPSBleHBvcnRzLnNraXBVbnRpbCA9IGV4cG9ydHMudW50aWwgPSBleHBvcnRzLnRha2VVbnRpbCA9IGV4cG9ydHMuc2tpcEFmdGVyID0gZXhwb3J0cy5za2lwV2hpbGUgPSBleHBvcnRzLnRha2VXaGlsZSA9IGV4cG9ydHMuc2xpY2UgPSBleHBvcnRzLnNraXAgPSBleHBvcnRzLnRha2UgPSBleHBvcnRzLmRpc3RpbmN0QnkgPSBleHBvcnRzLnNraXBSZXBlYXRzV2l0aCA9IGV4cG9ydHMuZGlzdGluY3QgPSBleHBvcnRzLnNraXBSZXBlYXRzID0gZXhwb3J0cy5maWx0ZXIgPSBleHBvcnRzLnN3aXRjaCA9IGV4cG9ydHMuc3dpdGNoTGF0ZXN0ID0gZXhwb3J0cy56aXBBcnJheSA9IGV4cG9ydHMuemlwID0gZXhwb3J0cy5zYW1wbGVXaXRoID0gZXhwb3J0cy5zYW1wbGVBcnJheSA9IGV4cG9ydHMuc2FtcGxlID0gZXhwb3J0cy5jb21iaW5lQXJyYXkgPSBleHBvcnRzLmNvbWJpbmUgPSBleHBvcnRzLm1lcmdlQXJyYXkgPSBleHBvcnRzLm1lcmdlID0gZXhwb3J0cy5tZXJnZUNvbmN1cnJlbnRseSA9IGV4cG9ydHMuY29uY2F0TWFwID0gZXhwb3J0cy5mbGF0TWFwRW5kID0gZXhwb3J0cy5jb250aW51ZVdpdGggPSBleHBvcnRzLmpvaW4gPSBleHBvcnRzLmNoYWluID0gZXhwb3J0cy5mbGF0TWFwID0gZXhwb3J0cy50cmFuc2R1Y2UgPSBleHBvcnRzLmFwID0gZXhwb3J0cy50YXAgPSBleHBvcnRzLmNvbnN0YW50ID0gZXhwb3J0cy5tYXAgPSBleHBvcnRzLnN0YXJ0V2l0aCA9IGV4cG9ydHMuY29uY2F0ID0gZXhwb3J0cy5nZW5lcmF0ZSA9IGV4cG9ydHMuaXRlcmF0ZSA9IGV4cG9ydHMudW5mb2xkID0gZXhwb3J0cy5yZWR1Y2UgPSBleHBvcnRzLnNjYW4gPSBleHBvcnRzLmxvb3AgPSBleHBvcnRzLmRyYWluID0gZXhwb3J0cy5mb3JFYWNoID0gZXhwb3J0cy5vYnNlcnZlID0gZXhwb3J0cy5mcm9tRXZlbnQgPSBleHBvcnRzLnBlcmlvZGljID0gZXhwb3J0cy5mcm9tID0gZXhwb3J0cy5uZXZlciA9IGV4cG9ydHMuZW1wdHkgPSBleHBvcnRzLmp1c3QgPSBleHBvcnRzLm9mID0gZXhwb3J0cy5TdHJlYW0gPSB1bmRlZmluZWQ7XG5cbnZhciBfZnJvbUV2ZW50ID0gcmVxdWlyZSgnLi9zb3VyY2UvZnJvbUV2ZW50Jyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnZnJvbUV2ZW50Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX2Zyb21FdmVudC5mcm9tRXZlbnQ7XG4gIH1cbn0pO1xuXG52YXIgX3VuZm9sZCA9IHJlcXVpcmUoJy4vc291cmNlL3VuZm9sZCcpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ3VuZm9sZCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF91bmZvbGQudW5mb2xkO1xuICB9XG59KTtcblxudmFyIF9pdGVyYXRlID0gcmVxdWlyZSgnLi9zb3VyY2UvaXRlcmF0ZScpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ2l0ZXJhdGUnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfaXRlcmF0ZS5pdGVyYXRlO1xuICB9XG59KTtcblxudmFyIF9nZW5lcmF0ZSA9IHJlcXVpcmUoJy4vc291cmNlL2dlbmVyYXRlJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnZ2VuZXJhdGUnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfZ2VuZXJhdGUuZ2VuZXJhdGU7XG4gIH1cbn0pO1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcHJlbHVkZSk7XG5cbnZhciBfY29yZSA9IHJlcXVpcmUoJy4vc291cmNlL2NvcmUnKTtcblxudmFyIF9mcm9tID0gcmVxdWlyZSgnLi9zb3VyY2UvZnJvbScpO1xuXG52YXIgX3BlcmlvZGljID0gcmVxdWlyZSgnLi9zb3VyY2UvcGVyaW9kaWMnKTtcblxudmFyIF9zeW1ib2xPYnNlcnZhYmxlID0gcmVxdWlyZSgnc3ltYm9sLW9ic2VydmFibGUnKTtcblxudmFyIF9zeW1ib2xPYnNlcnZhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3N5bWJvbE9ic2VydmFibGUpO1xuXG52YXIgX3N1YnNjcmliZSA9IHJlcXVpcmUoJy4vb2JzZXJ2YWJsZS9zdWJzY3JpYmUnKTtcblxudmFyIF90aHJ1ID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL3RocnUnKTtcblxudmFyIF9vYnNlcnZlID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL29ic2VydmUnKTtcblxudmFyIF9sb29wID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL2xvb3AnKTtcblxudmFyIF9hY2N1bXVsYXRlID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL2FjY3VtdWxhdGUnKTtcblxudmFyIF9idWlsZCA9IHJlcXVpcmUoJy4vY29tYmluYXRvci9idWlsZCcpO1xuXG52YXIgX3RyYW5zZm9ybSA9IHJlcXVpcmUoJy4vY29tYmluYXRvci90cmFuc2Zvcm0nKTtcblxudmFyIF9hcHBsaWNhdGl2ZSA9IHJlcXVpcmUoJy4vY29tYmluYXRvci9hcHBsaWNhdGl2ZScpO1xuXG52YXIgX3RyYW5zZHVjZSA9IHJlcXVpcmUoJy4vY29tYmluYXRvci90cmFuc2R1Y2UnKTtcblxudmFyIF9mbGF0TWFwID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL2ZsYXRNYXAnKTtcblxudmFyIF9jb250aW51ZVdpdGggPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvY29udGludWVXaXRoJyk7XG5cbnZhciBfY29uY2F0TWFwID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL2NvbmNhdE1hcCcpO1xuXG52YXIgX21lcmdlQ29uY3VycmVudGx5ID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL21lcmdlQ29uY3VycmVudGx5Jyk7XG5cbnZhciBfbWVyZ2UgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvbWVyZ2UnKTtcblxudmFyIF9jb21iaW5lID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL2NvbWJpbmUnKTtcblxudmFyIF9zYW1wbGUgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3Ivc2FtcGxlJyk7XG5cbnZhciBfemlwID0gcmVxdWlyZSgnLi9jb21iaW5hdG9yL3ppcCcpO1xuXG52YXIgX3N3aXRjaCA9IHJlcXVpcmUoJy4vY29tYmluYXRvci9zd2l0Y2gnKTtcblxudmFyIF9maWx0ZXIgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvZmlsdGVyJyk7XG5cbnZhciBfc2xpY2UgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3Ivc2xpY2UnKTtcblxudmFyIF90aW1lc2xpY2UgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvdGltZXNsaWNlJyk7XG5cbnZhciBfZGVsYXkgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvZGVsYXknKTtcblxudmFyIF90aW1lc3RhbXAgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvdGltZXN0YW1wJyk7XG5cbnZhciBfbGltaXQgPSByZXF1aXJlKCcuL2NvbWJpbmF0b3IvbGltaXQnKTtcblxudmFyIF9wcm9taXNlcyA9IHJlcXVpcmUoJy4vY29tYmluYXRvci9wcm9taXNlcycpO1xuXG52YXIgX2Vycm9ycyA9IHJlcXVpcmUoJy4vY29tYmluYXRvci9lcnJvcnMnKTtcblxudmFyIF9tdWx0aWNhc3QgPSByZXF1aXJlKCdAbW9zdC9tdWx0aWNhc3QnKTtcblxudmFyIF9tdWx0aWNhc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfbXVsdGljYXN0KTtcblxudmFyIF9kZWZhdWx0U2NoZWR1bGVyID0gcmVxdWlyZSgnLi9zY2hlZHVsZXIvZGVmYXVsdFNjaGVkdWxlcicpO1xuXG52YXIgX2RlZmF1bHRTY2hlZHVsZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGVmYXVsdFNjaGVkdWxlcik7XG5cbnZhciBfUHJvcGFnYXRlVGFzayA9IHJlcXVpcmUoJy4vc2NoZWR1bGVyL1Byb3BhZ2F0ZVRhc2snKTtcblxudmFyIF9Qcm9wYWdhdGVUYXNrMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1Byb3BhZ2F0ZVRhc2spO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBDb3JlIHN0cmVhbSB0eXBlXG4gKiBAdHlwZSB7U3RyZWFtfVxuICovXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5TdHJlYW0gPSBfU3RyZWFtMi5kZWZhdWx0O1xuXG4vLyBBZGQgb2YgYW5kIGVtcHR5IHRvIGNvbnN0cnVjdG9yIGZvciBmYW50YXN5LWxhbmQgY29tcGF0XG5cbl9TdHJlYW0yLmRlZmF1bHQub2YgPSBfY29yZS5vZjtcbl9TdHJlYW0yLmRlZmF1bHQuZW1wdHkgPSBfY29yZS5lbXB0eTtcbi8vIEFkZCBmcm9tIHRvIGNvbnN0cnVjdG9yIGZvciBFUyBPYnNlcnZhYmxlIGNvbXBhdFxuX1N0cmVhbTIuZGVmYXVsdC5mcm9tID0gX2Zyb20uZnJvbTtcbmV4cG9ydHMub2YgPSBfY29yZS5vZjtcbmV4cG9ydHMuanVzdCA9IF9jb3JlLm9mO1xuZXhwb3J0cy5lbXB0eSA9IF9jb3JlLmVtcHR5O1xuZXhwb3J0cy5uZXZlciA9IF9jb3JlLm5ldmVyO1xuZXhwb3J0cy5mcm9tID0gX2Zyb20uZnJvbTtcbmV4cG9ydHMucGVyaW9kaWMgPSBfcGVyaW9kaWMucGVyaW9kaWM7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBEcmFmdCBFUyBPYnNlcnZhYmxlIHByb3Bvc2FsIGludGVyb3Bcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS96ZW5wYXJzaW5nL2VzLW9ic2VydmFibGVcblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmliZXIpIHtcbiAgcmV0dXJuICgwLCBfc3Vic2NyaWJlLnN1YnNjcmliZSkoc3Vic2NyaWJlciwgdGhpcyk7XG59O1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZVtfc3ltYm9sT2JzZXJ2YWJsZTIuZGVmYXVsdF0gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEZsdWVudCBhZGFwdGVyXG5cbi8qKlxuICogQWRhcHQgYSBmdW5jdGlvbmFsIHN0cmVhbSB0cmFuc2Zvcm0gdG8gZmx1ZW50IHN0eWxlLlxuICogSXQgYXBwbGllcyBmIHRvIHRoZSB0aGlzIHN0cmVhbSBvYmplY3RcbiAqIEBwYXJhbSAge2Z1bmN0aW9uKHM6IFN0cmVhbSk6IFN0cmVhbX0gZiBmdW5jdGlvbiB0aGF0XG4gKiByZWNlaXZlcyB0aGUgc3RyZWFtIGl0c2VsZiBhbmQgbXVzdCByZXR1cm4gYSBuZXcgc3RyZWFtXG4gKiBAcmV0dXJuIHtTdHJlYW19XG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnRocnUgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gKDAsIF90aHJ1LnRocnUpKGYsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEFkYXB0aW5nIG90aGVyIHNvdXJjZXNcblxuLyoqXG4gKiBDcmVhdGUgYSBzdHJlYW0gb2YgZXZlbnRzIGZyb20gdGhlIHN1cHBsaWVkIEV2ZW50VGFyZ2V0IG9yIEV2ZW50RW1pdHRlclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IGV2ZW50IG5hbWVcbiAqIEBwYXJhbSB7RXZlbnRUYXJnZXR8RXZlbnRFbWl0dGVyfSBzb3VyY2UgRXZlbnRUYXJnZXQgb3IgRXZlbnRFbWl0dGVyLiBUaGUgc291cmNlXG4gKiAgbXVzdCBzdXBwb3J0IGVpdGhlciBhZGRFdmVudExpc3RlbmVyL3JlbW92ZUV2ZW50TGlzdGVuZXIgKHczYyBFdmVudFRhcmdldDpcbiAqICBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1FdmVudHMvZXZlbnRzLmh0bWwjRXZlbnRzLUV2ZW50VGFyZ2V0KSxcbiAqICBvciBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lciAobm9kZSBFdmVudEVtaXR0ZXI6IGh0dHA6Ly9ub2RlanMub3JnL2FwaS9ldmVudHMuaHRtbClcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBvZiBldmVudHMgb2YgdGhlIHNwZWNpZmllZCB0eXBlIGZyb20gdGhlIHNvdXJjZVxuICovXG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9ic2VydmluZ1xuXG5leHBvcnRzLm9ic2VydmUgPSBfb2JzZXJ2ZS5vYnNlcnZlO1xuZXhwb3J0cy5mb3JFYWNoID0gX29ic2VydmUub2JzZXJ2ZTtcbmV4cG9ydHMuZHJhaW4gPSBfb2JzZXJ2ZS5kcmFpbjtcblxuLyoqXG4gKiBQcm9jZXNzIGFsbCB0aGUgZXZlbnRzIGluIHRoZSBzdHJlYW1cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2hlbiB0aGUgc3RyZWFtIGVuZHMsIG9yIHJlamVjdHNcbiAqICBpZiB0aGUgc3RyZWFtIGZhaWxzIHdpdGggYW4gdW5oYW5kbGVkIGVycm9yLlxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLm9ic2VydmUgPSBfU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuICgwLCBfb2JzZXJ2ZS5vYnNlcnZlKShmLCB0aGlzKTtcbn07XG5cbi8qKlxuICogQ29uc3VtZSBhbGwgZXZlbnRzIGluIHRoZSBzdHJlYW0sIHdpdGhvdXQgcHJvdmlkaW5nIGEgZnVuY3Rpb24gdG8gcHJvY2VzcyBlYWNoLlxuICogVGhpcyBjYXVzZXMgYSBzdHJlYW0gdG8gYmVjb21lIGFjdGl2ZSBhbmQgYmVnaW4gZW1pdHRpbmcgZXZlbnRzLCBhbmQgaXMgdXNlZnVsXG4gKiBpbiBjYXNlcyB3aGVyZSBhbGwgcHJvY2Vzc2luZyBoYXMgYmVlbiBzZXR1cCB1cHN0cmVhbSB2aWEgb3RoZXIgY29tYmluYXRvcnMsIGFuZFxuICogdGhlcmUgaXMgbm8gbmVlZCB0byBwcm9jZXNzIHRoZSB0ZXJtaW5hbCBldmVudHMuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdoZW4gdGhlIHN0cmVhbSBlbmRzLCBvciByZWplY3RzXG4gKiAgaWYgdGhlIHN0cmVhbSBmYWlscyB3aXRoIGFuIHVuaGFuZGxlZCBlcnJvci5cbiAqL1xuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuZHJhaW4gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAoMCwgX29ic2VydmUuZHJhaW4pKHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnRzLmxvb3AgPSBfbG9vcC5sb29wO1xuXG4vKipcbiAqIEdlbmVyYWxpemVkIGZlZWRiYWNrIGxvb3AuIENhbGwgYSBzdGVwcGVyIGZ1bmN0aW9uIGZvciBlYWNoIGV2ZW50LiBUaGUgc3RlcHBlclxuICogd2lsbCBiZSBjYWxsZWQgd2l0aCAyIHBhcmFtczogdGhlIGN1cnJlbnQgc2VlZCBhbmQgdGhlIGFuIGV2ZW50IHZhbHVlLiAgSXQgbXVzdFxuICogcmV0dXJuIGEgbmV3IHsgc2VlZCwgdmFsdWUgfSBwYWlyLiBUaGUgYHNlZWRgIHdpbGwgYmUgZmVkIGJhY2sgaW50byB0aGUgbmV4dFxuICogaW52b2NhdGlvbiBvZiBzdGVwcGVyLCBhbmQgdGhlIGB2YWx1ZWAgd2lsbCBiZSBwcm9wYWdhdGVkIGFzIHRoZSBldmVudCB2YWx1ZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc2VlZDoqLCB2YWx1ZToqKTp7c2VlZDoqLCB2YWx1ZToqfX0gc3RlcHBlciBsb29wIHN0ZXAgZnVuY3Rpb25cbiAqIEBwYXJhbSB7Kn0gc2VlZCBpbml0aWFsIHNlZWQgdmFsdWUgcGFzc2VkIHRvIGZpcnN0IHN0ZXBwZXIgY2FsbFxuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSB3aG9zZSB2YWx1ZXMgYXJlIHRoZSBgdmFsdWVgIGZpZWxkIG9mIHRoZSBvYmplY3RzXG4gKiByZXR1cm5lZCBieSB0aGUgc3RlcHBlclxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmxvb3AgPSBmdW5jdGlvbiAoc3RlcHBlciwgc2VlZCkge1xuICByZXR1cm4gKDAsIF9sb29wLmxvb3ApKHN0ZXBwZXIsIHNlZWQsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnRzLnNjYW4gPSBfYWNjdW11bGF0ZS5zY2FuO1xuZXhwb3J0cy5yZWR1Y2UgPSBfYWNjdW11bGF0ZS5yZWR1Y2U7XG5cbi8qKlxuICogQ3JlYXRlIGEgc3RyZWFtIGNvbnRhaW5pbmcgc3VjY2Vzc2l2ZSByZWR1Y2UgcmVzdWx0cyBvZiBhcHBseWluZyBmIHRvXG4gKiB0aGUgcHJldmlvdXMgcmVkdWNlIHJlc3VsdCBhbmQgdGhlIGN1cnJlbnQgc3RyZWFtIGl0ZW0uXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHJlc3VsdDoqLCB4OiopOip9IGYgcmVkdWNlciBmdW5jdGlvblxuICogQHBhcmFtIHsqfSBpbml0aWFsIGluaXRpYWwgdmFsdWVcbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gY29udGFpbmluZyBzdWNjZXNzaXZlIHJlZHVjZSByZXN1bHRzXG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIChmLCBpbml0aWFsKSB7XG4gIHJldHVybiAoMCwgX2FjY3VtdWxhdGUuc2NhbikoZiwgaW5pdGlhbCwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFJlZHVjZSB0aGUgc3RyZWFtIHRvIHByb2R1Y2UgYSBzaW5nbGUgcmVzdWx0LiAgTm90ZSB0aGF0IHJlZHVjaW5nIGFuIGluZmluaXRlXG4gKiBzdHJlYW0gd2lsbCByZXR1cm4gYSBQcm9taXNlIHRoYXQgbmV2ZXIgZnVsZmlsbHMsIGJ1dCB0aGF0IG1heSByZWplY3QgaWYgYW4gZXJyb3JcbiAqIG9jY3Vycy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24ocmVzdWx0OiosIHg6Kik6Kn0gZiByZWR1Y2VyIGZ1bmN0aW9uXG4gKiBAcGFyYW0geyp9IGluaXRpYWwgb3B0aW9uYWwgaW5pdGlhbCB2YWx1ZVxuICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIHRoZSBmaWxlIHJlc3VsdCBvZiB0aGUgcmVkdWNlXG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChmLCBpbml0aWFsKSB7XG4gIHJldHVybiAoMCwgX2FjY3VtdWxhdGUucmVkdWNlKShmLCBpbml0aWFsLCB0aGlzKTtcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBCdWlsZGluZyBhbmQgZXh0ZW5kaW5nXG5cbmV4cG9ydHMuY29uY2F0ID0gX2J1aWxkLmNvbmNhdDtcbmV4cG9ydHMuc3RhcnRXaXRoID0gX2J1aWxkLmNvbnM7XG5cbi8qKlxuICogQHBhcmFtIHtTdHJlYW19IHRhaWxcbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gY29udGFpbmluZyBhbGwgaXRlbXMgaW4gdGhpcyBmb2xsb3dlZCBieVxuICogIGFsbCBpdGVtcyBpbiB0YWlsXG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKHRhaWwpIHtcbiAgcmV0dXJuICgwLCBfYnVpbGQuY29uY2F0KSh0aGlzLCB0YWlsKTtcbn07XG5cbi8qKlxuICogQHBhcmFtIHsqfSB4IHZhbHVlIHRvIHByZXBlbmRcbiAqIEByZXR1cm5zIHtTdHJlYW19IGEgbmV3IHN0cmVhbSB3aXRoIHggcHJlcGVuZGVkXG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnN0YXJ0V2l0aCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiAoMCwgX2J1aWxkLmNvbnMpKHgsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFRyYW5zZm9ybWluZ1xuXG5leHBvcnRzLm1hcCA9IF90cmFuc2Zvcm0ubWFwO1xuZXhwb3J0cy5jb25zdGFudCA9IF90cmFuc2Zvcm0uY29uc3RhbnQ7XG5leHBvcnRzLnRhcCA9IF90cmFuc2Zvcm0udGFwO1xuZXhwb3J0cy5hcCA9IF9hcHBsaWNhdGl2ZS5hcDtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gZWFjaCB2YWx1ZSBpbiB0aGUgc3RyZWFtIGJ5IGFwcGx5aW5nIGYgdG8gZWFjaFxuICogQHBhcmFtIHtmdW5jdGlvbigqKToqfSBmIG1hcHBpbmcgZnVuY3Rpb25cbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIGl0ZW1zIHRyYW5zZm9ybWVkIGJ5IGZcbiAqL1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gKDAsIF90cmFuc2Zvcm0ubWFwKShmLCB0aGlzKTtcbn07XG5cbi8qKlxuICogQXNzdW1lIHRoaXMgc3RyZWFtIGNvbnRhaW5zIGZ1bmN0aW9ucywgYW5kIGFwcGx5IGVhY2ggZnVuY3Rpb24gdG8gZWFjaCBpdGVtXG4gKiBpbiB0aGUgcHJvdmlkZWQgc3RyZWFtLiAgVGhpcyBnZW5lcmF0ZXMsIGluIGVmZmVjdCwgYSBjcm9zcyBwcm9kdWN0LlxuICogQHBhcmFtIHtTdHJlYW19IHhzIHN0cmVhbSBvZiBpdGVtcyB0byB3aGljaFxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgdGhlIGNyb3NzIHByb2R1Y3Qgb2YgaXRlbXNcbiAqL1xuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuYXAgPSBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuICgwLCBfYXBwbGljYXRpdmUuYXApKHRoaXMsIHhzKTtcbn07XG5cbi8qKlxuICogUmVwbGFjZSBlYWNoIHZhbHVlIGluIHRoZSBzdHJlYW0gd2l0aCB4XG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIGl0ZW1zIHJlcGxhY2VkIHdpdGggeFxuICovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5jb25zdGFudCA9IGZ1bmN0aW9uICh4KSB7XG4gIHJldHVybiAoMCwgX3RyYW5zZm9ybS5jb25zdGFudCkoeCwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFBlcmZvcm0gYSBzaWRlIGVmZmVjdCBmb3IgZWFjaCBpdGVtIGluIHRoZSBzdHJlYW1cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqKToqfSBmIHNpZGUgZWZmZWN0IHRvIGV4ZWN1dGUgZm9yIGVhY2ggaXRlbS4gVGhlXG4gKiAgcmV0dXJuIHZhbHVlIHdpbGwgYmUgZGlzY2FyZGVkLlxuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSBjb250YWluaW5nIHRoZSBzYW1lIGl0ZW1zIGFzIHRoaXMgc3RyZWFtXG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnRhcCA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiAoMCwgX3RyYW5zZm9ybS50YXApKGYsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFRyYW5zZHVjZXIgc3VwcG9ydFxuXG5leHBvcnRzLnRyYW5zZHVjZSA9IF90cmFuc2R1Y2UudHJhbnNkdWNlO1xuXG4vKipcbiAqIFRyYW5zZm9ybSB0aGlzIHN0cmVhbSBieSBwYXNzaW5nIGl0cyBldmVudHMgdGhyb3VnaCBhIHRyYW5zZHVjZXIuXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gdHJhbnNkdWNlciB0cmFuc2R1Y2VyIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtTdHJlYW19IHN0cmVhbSBvZiBldmVudHMgdHJhbnNmb3JtZWQgYnkgdGhlIHRyYW5zZHVjZXJcbiAqL1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS50cmFuc2R1Y2UgPSBmdW5jdGlvbiAodHJhbnNkdWNlcikge1xuICByZXR1cm4gKDAsIF90cmFuc2R1Y2UudHJhbnNkdWNlKSh0cmFuc2R1Y2VyLCB0aGlzKTtcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBGbGF0TWFwcGluZ1xuXG4vLyBAZGVwcmVjYXRlZCBmbGF0TWFwLCB1c2UgY2hhaW4gaW5zdGVhZFxuZXhwb3J0cy5mbGF0TWFwID0gX2ZsYXRNYXAuZmxhdE1hcDtcbmV4cG9ydHMuY2hhaW4gPSBfZmxhdE1hcC5mbGF0TWFwO1xuZXhwb3J0cy5qb2luID0gX2ZsYXRNYXAuam9pbjtcblxuLyoqXG4gKiBNYXAgZWFjaCB2YWx1ZSBpbiB0aGUgc3RyZWFtIHRvIGEgbmV3IHN0cmVhbSwgYW5kIG1lcmdlIGl0IGludG8gdGhlXG4gKiByZXR1cm5lZCBvdXRlciBzdHJlYW0uIEV2ZW50IGFycml2YWwgdGltZXMgYXJlIHByZXNlcnZlZC5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqKTpTdHJlYW19IGYgY2hhaW5pbmcgZnVuY3Rpb24sIG11c3QgcmV0dXJuIGEgU3RyZWFtXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIGNvbnRhaW5pbmcgYWxsIGV2ZW50cyBmcm9tIGVhY2ggc3RyZWFtIHJldHVybmVkIGJ5IGZcbiAqL1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5jaGFpbiA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiAoMCwgX2ZsYXRNYXAuZmxhdE1hcCkoZiwgdGhpcyk7XG59O1xuXG4vLyBAZGVwcmVjYXRlZCB1c2UgY2hhaW4gaW5zdGVhZFxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuZmxhdE1hcCA9IF9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmNoYWluO1xuXG4vKipcbiogTW9uYWRpYyBqb2luLiBGbGF0dGVuIGEgU3RyZWFtPFN0cmVhbTxYPj4gdG8gU3RyZWFtPFg+IGJ5IG1lcmdpbmcgaW5uZXJcbiogc3RyZWFtcyB0byB0aGUgb3V0ZXIuIEV2ZW50IGFycml2YWwgdGltZXMgYXJlIHByZXNlcnZlZC5cbiogQHJldHVybnMge1N0cmVhbTxYPn0gbmV3IHN0cmVhbSBjb250YWluaW5nIGFsbCBldmVudHMgb2YgYWxsIGlubmVyIHN0cmVhbXNcbiovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5qb2luID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gKDAsIF9mbGF0TWFwLmpvaW4pKHRoaXMpO1xufTtcblxuLy8gQGRlcHJlY2F0ZWQgZmxhdE1hcEVuZCwgdXNlIGNvbnRpbnVlV2l0aCBpbnN0ZWFkXG5leHBvcnRzLmNvbnRpbnVlV2l0aCA9IF9jb250aW51ZVdpdGguY29udGludWVXaXRoO1xuZXhwb3J0cy5mbGF0TWFwRW5kID0gX2NvbnRpbnVlV2l0aC5jb250aW51ZVdpdGg7XG5cbi8qKlxuICogTWFwIHRoZSBlbmQgZXZlbnQgdG8gYSBuZXcgc3RyZWFtLCBhbmQgYmVnaW4gZW1pdHRpbmcgaXRzIHZhbHVlcy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqKTpTdHJlYW19IGYgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0aGUgZW5kIGV2ZW50IHZhbHVlLFxuICogYW5kICptdXN0KiByZXR1cm4gYSBuZXcgU3RyZWFtIHRvIGNvbnRpbnVlIHdpdGguXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIHRoYXQgZW1pdHMgYWxsIGV2ZW50cyBmcm9tIHRoZSBvcmlnaW5hbCBzdHJlYW0sXG4gKiBmb2xsb3dlZCBieSBhbGwgZXZlbnRzIGZyb20gdGhlIHN0cmVhbSByZXR1cm5lZCBieSBmLlxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmNvbnRpbnVlV2l0aCA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiAoMCwgX2NvbnRpbnVlV2l0aC5jb250aW51ZVdpdGgpKGYsIHRoaXMpO1xufTtcblxuLy8gQGRlcHJlY2F0ZWQgdXNlIGNvbnRpbnVlV2l0aCBpbnN0ZWFkXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5mbGF0TWFwRW5kID0gX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuY29udGludWVXaXRoO1xuXG5leHBvcnRzLmNvbmNhdE1hcCA9IF9jb25jYXRNYXAuY29uY2F0TWFwO1xuXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmNvbmNhdE1hcCA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiAoMCwgX2NvbmNhdE1hcC5jb25jYXRNYXApKGYsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbmN1cnJlbnQgbWVyZ2luZ1xuXG5leHBvcnRzLm1lcmdlQ29uY3VycmVudGx5ID0gX21lcmdlQ29uY3VycmVudGx5Lm1lcmdlQ29uY3VycmVudGx5O1xuXG4vKipcbiAqIEZsYXR0ZW4gYSBTdHJlYW08U3RyZWFtPFg+PiB0byBTdHJlYW08WD4gYnkgbWVyZ2luZyBpbm5lclxuICogc3RyZWFtcyB0byB0aGUgb3V0ZXIsIGxpbWl0aW5nIHRoZSBudW1iZXIgb2YgaW5uZXIgc3RyZWFtcyB0aGF0IG1heVxuICogYmUgYWN0aXZlIGNvbmN1cnJlbnRseS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBjb25jdXJyZW5jeSBhdCBtb3N0IHRoaXMgbWFueSBpbm5lciBzdHJlYW1zIHdpbGwgYmVcbiAqICBhbGxvd2VkIHRvIGJlIGFjdGl2ZSBjb25jdXJyZW50bHkuXG4gKiBAcmV0dXJuIHtTdHJlYW08WD59IG5ldyBzdHJlYW0gY29udGFpbmluZyBhbGwgZXZlbnRzIG9mIGFsbCBpbm5lclxuICogIHN0cmVhbXMsIHdpdGggbGltaXRlZCBjb25jdXJyZW5jeS5cbiAqL1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5tZXJnZUNvbmN1cnJlbnRseSA9IGZ1bmN0aW9uIChjb25jdXJyZW5jeSkge1xuICByZXR1cm4gKDAsIF9tZXJnZUNvbmN1cnJlbnRseS5tZXJnZUNvbmN1cnJlbnRseSkoY29uY3VycmVuY3ksIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE1lcmdpbmdcblxuZXhwb3J0cy5tZXJnZSA9IF9tZXJnZS5tZXJnZTtcbmV4cG9ydHMubWVyZ2VBcnJheSA9IF9tZXJnZS5tZXJnZUFycmF5O1xuXG4vKipcbiAqIE1lcmdlIHRoaXMgc3RyZWFtIGFuZCBhbGwgdGhlIHByb3ZpZGVkIHN0cmVhbXNcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIGl0ZW1zIGZyb20gdGhpcyBzdHJlYW0gYW5kIHMgaW4gdGltZVxuICogb3JkZXIuICBJZiB0d28gZXZlbnRzIGFyZSBzaW11bHRhbmVvdXMgdGhleSB3aWxsIGJlIG1lcmdlZCBpblxuICogYXJiaXRyYXJ5IG9yZGVyLlxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKCkgLyogLi4uc3RyZWFtcyove1xuICByZXR1cm4gKDAsIF9tZXJnZS5tZXJnZUFycmF5KShiYXNlLmNvbnModGhpcywgYXJndW1lbnRzKSk7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQ29tYmluaW5nXG5cbmV4cG9ydHMuY29tYmluZSA9IF9jb21iaW5lLmNvbWJpbmU7XG5leHBvcnRzLmNvbWJpbmVBcnJheSA9IF9jb21iaW5lLmNvbWJpbmVBcnJheTtcblxuLyoqXG4gKiBDb21iaW5lIGxhdGVzdCBldmVudHMgZnJvbSBhbGwgaW5wdXQgc3RyZWFtc1xuICogQHBhcmFtIHtmdW5jdGlvbiguLi5ldmVudHMpOip9IGYgZnVuY3Rpb24gdG8gY29tYmluZSBtb3N0IHJlY2VudCBldmVudHNcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgZiB0byB0aGUgbW9zdCByZWNlbnRcbiAqICBldmVudCBvZiBlYWNoIGlucHV0IHN0cmVhbSwgd2hlbmV2ZXIgYSBuZXcgZXZlbnQgYXJyaXZlcyBvbiBhbnkgc3RyZWFtLlxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbiAoZiAvKiwgLi4uc3RyZWFtcyovKSB7XG4gIHJldHVybiAoMCwgX2NvbWJpbmUuY29tYmluZUFycmF5KShmLCBiYXNlLnJlcGxhY2UodGhpcywgMCwgYXJndW1lbnRzKSk7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU2FtcGxpbmdcblxuZXhwb3J0cy5zYW1wbGUgPSBfc2FtcGxlLnNhbXBsZTtcbmV4cG9ydHMuc2FtcGxlQXJyYXkgPSBfc2FtcGxlLnNhbXBsZUFycmF5O1xuZXhwb3J0cy5zYW1wbGVXaXRoID0gX3NhbXBsZS5zYW1wbGVXaXRoO1xuXG4vKipcbiAqIFdoZW4gYW4gZXZlbnQgYXJyaXZlcyBvbiBzYW1wbGVyLCBlbWl0IHRoZSBsYXRlc3QgZXZlbnQgdmFsdWUgZnJvbSBzdHJlYW0uXG4gKiBAcGFyYW0ge1N0cmVhbX0gc2FtcGxlciBzdHJlYW0gb2YgZXZlbnRzIGF0IHdob3NlIGFycml2YWwgdGltZVxuICogIHNpZ25hbCdzIGxhdGVzdCB2YWx1ZSB3aWxsIGJlIHByb3BhZ2F0ZWRcbiAqIEByZXR1cm5zIHtTdHJlYW19IHNhbXBsZWQgc3RyZWFtIG9mIHZhbHVlc1xuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnNhbXBsZVdpdGggPSBmdW5jdGlvbiAoc2FtcGxlcikge1xuICByZXR1cm4gKDAsIF9zYW1wbGUuc2FtcGxlV2l0aCkoc2FtcGxlciwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFdoZW4gYW4gZXZlbnQgYXJyaXZlcyBvbiB0aGlzIHN0cmVhbSwgZW1pdCB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgZiB3aXRoIHRoZSBsYXRlc3RcbiAqIHZhbHVlcyBvZiBhbGwgc3RyZWFtcyBiZWluZyBzYW1wbGVkXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKC4uLnZhbHVlcyk6Kn0gZiBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIHNldCBvZiBzYW1wbGVkIHZhbHVlc1xuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIG9mIHNhbXBsZWQgYW5kIHRyYW5zZm9ybWVkIHZhbHVlc1xuICovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5zYW1wbGUgPSBmdW5jdGlvbiAoZiAvKiAuLi5zdHJlYW1zICovKSB7XG4gIHJldHVybiAoMCwgX3NhbXBsZS5zYW1wbGVBcnJheSkoZiwgdGhpcywgYmFzZS50YWlsKGFyZ3VtZW50cykpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFppcHBpbmdcblxuZXhwb3J0cy56aXAgPSBfemlwLnppcDtcbmV4cG9ydHMuemlwQXJyYXkgPSBfemlwLnppcEFycmF5O1xuXG4vKipcbiAqIFBhaXItd2lzZSBjb21iaW5lIGl0ZW1zIHdpdGggdGhvc2UgaW4gcy4gR2l2ZW4gMiBzdHJlYW1zOlxuICogWzEsMiwzXSB6aXBXaXRoIGYgWzQsNSw2XSAtPiBbZigxLDQpLGYoMiw1KSxmKDMsNildXG4gKiBOb3RlOiB6aXAgY2F1c2VzIGZhc3Qgc3RyZWFtcyB0byBidWZmZXIgYW5kIHdhaXQgZm9yIHNsb3cgc3RyZWFtcy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oYTpTdHJlYW0sIGI6U3RyZWFtLCAuLi4pOip9IGYgZnVuY3Rpb24gdG8gY29tYmluZSBpdGVtc1xuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSBjb250YWluaW5nIHBhaXJzXG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuemlwID0gZnVuY3Rpb24gKGYgLyosIC4uLnN0cmVhbXMqLykge1xuICByZXR1cm4gKDAsIF96aXAuemlwQXJyYXkpKGYsIGJhc2UucmVwbGFjZSh0aGlzLCAwLCBhcmd1bWVudHMpKTtcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTd2l0Y2hpbmdcblxuLy8gQGRlcHJlY2F0ZWQgc3dpdGNoLCB1c2Ugc3dpdGNoTGF0ZXN0IGluc3RlYWRcbmV4cG9ydHMuc3dpdGNoTGF0ZXN0ID0gX3N3aXRjaC5zd2l0Y2hMYXRlc3Q7XG5leHBvcnRzLnN3aXRjaCA9IF9zd2l0Y2guc3dpdGNoTGF0ZXN0O1xuXG4vKipcbiAqIEdpdmVuIGEgc3RyZWFtIG9mIHN0cmVhbXMsIHJldHVybiBhIG5ldyBzdHJlYW0gdGhhdCBhZG9wdHMgdGhlIGJlaGF2aW9yXG4gKiBvZiB0aGUgbW9zdCByZWNlbnQgaW5uZXIgc3RyZWFtLlxuICogQHJldHVybnMge1N0cmVhbX0gc3dpdGNoaW5nIHN0cmVhbVxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnN3aXRjaExhdGVzdCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICgwLCBfc3dpdGNoLnN3aXRjaExhdGVzdCkodGhpcyk7XG59O1xuXG4vLyBAZGVwcmVjYXRlZCB1c2Ugc3dpdGNoTGF0ZXN0IGluc3RlYWRcbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnN3aXRjaCA9IF9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnN3aXRjaExhdGVzdDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEZpbHRlcmluZ1xuXG4vLyBAZGVwcmVjYXRlZCBkaXN0aW5jdCwgdXNlIHNraXBSZXBlYXRzIGluc3RlYWRcbi8vIEBkZXByZWNhdGVkIGRpc3RpbmN0QnksIHVzZSBza2lwUmVwZWF0c1dpdGggaW5zdGVhZFxuZXhwb3J0cy5maWx0ZXIgPSBfZmlsdGVyLmZpbHRlcjtcbmV4cG9ydHMuc2tpcFJlcGVhdHMgPSBfZmlsdGVyLnNraXBSZXBlYXRzO1xuZXhwb3J0cy5kaXN0aW5jdCA9IF9maWx0ZXIuc2tpcFJlcGVhdHM7XG5leHBvcnRzLnNraXBSZXBlYXRzV2l0aCA9IF9maWx0ZXIuc2tpcFJlcGVhdHNXaXRoO1xuZXhwb3J0cy5kaXN0aW5jdEJ5ID0gX2ZpbHRlci5za2lwUmVwZWF0c1dpdGg7XG5cbi8qKlxuICogUmV0YWluIG9ubHkgaXRlbXMgbWF0Y2hpbmcgYSBwcmVkaWNhdGVcbiAqIHN0cmVhbTogICAgICAgICAgICAgICAgICAgICAgICAgICAtMTIzNDU2NzgtXG4gKiBmaWx0ZXIoeCA9PiB4ICUgMiA9PT0gMCwgc3RyZWFtKTogLS0yLTQtNi04LVxuICogQHBhcmFtIHtmdW5jdGlvbih4OiopOmJvb2xlYW59IHAgZmlsdGVyaW5nIHByZWRpY2F0ZSBjYWxsZWQgZm9yIGVhY2ggaXRlbVxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgb25seSBpdGVtcyBmb3Igd2hpY2ggcHJlZGljYXRlIHJldHVybnMgdHJ1dGh5XG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKHApIHtcbiAgcmV0dXJuICgwLCBfZmlsdGVyLmZpbHRlcikocCwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFNraXAgcmVwZWF0ZWQgZXZlbnRzLCB1c2luZyA9PT0gdG8gY29tcGFyZSBpdGVtc1xuICogc3RyZWFtOiAgICAgICAgICAgLWFiYmNkLVxuICogZGlzdGluY3Qoc3RyZWFtKTogLWFiLWNkLVxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIHdpdGggbm8gcmVwZWF0ZWQgZXZlbnRzXG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnNraXBSZXBlYXRzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gKDAsIF9maWx0ZXIuc2tpcFJlcGVhdHMpKHRoaXMpO1xufTtcblxuLyoqXG4gKiBTa2lwIHJlcGVhdGVkIGV2ZW50cywgdXNpbmcgc3VwcGxpZWQgZXF1YWxzIGZ1bmN0aW9uIHRvIGNvbXBhcmUgaXRlbXNcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oYToqLCBiOiopOmJvb2xlYW59IGVxdWFscyBmdW5jdGlvbiB0byBjb21wYXJlIGl0ZW1zXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gd2l0aCBubyByZXBlYXRlZCBldmVudHNcbiAqL1xuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuc2tpcFJlcGVhdHNXaXRoID0gZnVuY3Rpb24gKGVxdWFscykge1xuICByZXR1cm4gKDAsIF9maWx0ZXIuc2tpcFJlcGVhdHNXaXRoKShlcXVhbHMsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNsaWNpbmdcblxuZXhwb3J0cy50YWtlID0gX3NsaWNlLnRha2U7XG5leHBvcnRzLnNraXAgPSBfc2xpY2Uuc2tpcDtcbmV4cG9ydHMuc2xpY2UgPSBfc2xpY2Uuc2xpY2U7XG5leHBvcnRzLnRha2VXaGlsZSA9IF9zbGljZS50YWtlV2hpbGU7XG5leHBvcnRzLnNraXBXaGlsZSA9IF9zbGljZS5za2lwV2hpbGU7XG5leHBvcnRzLnNraXBBZnRlciA9IF9zbGljZS5za2lwQWZ0ZXI7XG5cbi8qKlxuICogc3RyZWFtOiAgICAgICAgICAtYWJjZC1cbiAqIHRha2UoMiwgc3RyZWFtKTogLWFifFxuICogQHBhcmFtIHtOdW1iZXJ9IG4gdGFrZSB1cCB0byB0aGlzIG1hbnkgZXZlbnRzXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gY29udGFpbmluZyBhdCBtb3N0IHRoZSBmaXJzdCBuIGl0ZW1zIGZyb20gdGhpcyBzdHJlYW1cbiAqL1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS50YWtlID0gZnVuY3Rpb24gKG4pIHtcbiAgcmV0dXJuICgwLCBfc2xpY2UudGFrZSkobiwgdGhpcyk7XG59O1xuXG4vKipcbiAqIHN0cmVhbTogICAgICAgICAgLWFiY2QtPlxuICogc2tpcCgyLCBzdHJlYW0pOiAtLS1jZC0+XG4gKiBAcGFyYW0ge051bWJlcn0gbiBza2lwIHRoaXMgbWFueSBldmVudHNcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBub3QgY29udGFpbmluZyB0aGUgZmlyc3QgbiBldmVudHNcbiAqL1xuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIChuKSB7XG4gIHJldHVybiAoMCwgX3NsaWNlLnNraXApKG4sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBTbGljZSBhIHN0cmVhbSBieSBldmVudCBpbmRleC4gRXF1aXZhbGVudCB0bywgYnV0IG1vcmUgZWZmaWNpZW50IHRoYW5cbiAqIHN0cmVhbS50YWtlKGVuZCkuc2tpcChzdGFydCk7XG4gKiBOT1RFOiBOZWdhdGl2ZSBzdGFydCBhbmQgZW5kIGFyZSBub3Qgc3VwcG9ydGVkXG4gKiBAcGFyYW0ge051bWJlcn0gc3RhcnQgc2tpcCBhbGwgZXZlbnRzIGJlZm9yZSB0aGUgc3RhcnQgaW5kZXhcbiAqIEBwYXJhbSB7TnVtYmVyfSBlbmQgYWxsb3cgYWxsIGV2ZW50cyBmcm9tIHRoZSBzdGFydCBpbmRleCB0byB0aGUgZW5kIGluZGV4XG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gY29udGFpbmluZyBpdGVtcyB3aGVyZSBzdGFydCA8PSBpbmRleCA8IGVuZFxuICovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoMCwgX3NsaWNlLnNsaWNlKShzdGFydCwgZW5kLCB0aGlzKTtcbn07XG5cbi8qKlxuICogc3RyZWFtOiAgICAgICAgICAgICAgICAgICAgICAgIC0xMjM0NTEyMzQtPlxuICogdGFrZVdoaWxlKHggPT4geCA8IDUsIHN0cmVhbSk6IC0xMjM0fFxuICogQHBhcmFtIHtmdW5jdGlvbih4OiopOmJvb2xlYW59IHAgcHJlZGljYXRlXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gY29udGFpbmluZyBpdGVtcyB1cCB0bywgYnV0IG5vdCBpbmNsdWRpbmcsIHRoZVxuICogZmlyc3QgaXRlbSBmb3Igd2hpY2ggcCByZXR1cm5zIGZhbHN5LlxuICovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS50YWtlV2hpbGUgPSBmdW5jdGlvbiAocCkge1xuICByZXR1cm4gKDAsIF9zbGljZS50YWtlV2hpbGUpKHAsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBzdHJlYW06ICAgICAgICAgICAgICAgICAgICAgICAgLTEyMzQ1MTIzNC0+XG4gKiBza2lwV2hpbGUoeCA9PiB4IDwgNSwgc3RyZWFtKTogLS0tLS01MTIzNC0+XG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHg6Kik6Ym9vbGVhbn0gcCBwcmVkaWNhdGVcbiAqIEByZXR1cm5zIHtTdHJlYW19IHN0cmVhbSBjb250YWluaW5nIGl0ZW1zIGZvbGxvd2luZyAqYW5kIGluY2x1ZGluZyogdGhlXG4gKiBmaXJzdCBpdGVtIGZvciB3aGljaCBwIHJldHVybnMgZmFsc3kuXG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnNraXBXaGlsZSA9IGZ1bmN0aW9uIChwKSB7XG4gIHJldHVybiAoMCwgX3NsaWNlLnNraXBXaGlsZSkocCwgdGhpcyk7XG59O1xuXG4vKipcbiAqIHN0cmVhbTogICAgICAgICAgICAgICAgICAgICAgICAgLTEyMzQ1Njc4OS0+XG4gKiBza2lwQWZ0ZXIoeCA9PiB4ID09PSA1LCBzdHJlYW0pOi0xMjM0NXxcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqKTpib29sZWFufSBwIHByZWRpY2F0ZVxuICogQHJldHVybnMge1N0cmVhbX0gc3RyZWFtIGNvbnRhaW5pbmcgaXRlbXMgdXAgdG8sICphbmQgaW5jbHVkaW5nKiwgdGhlXG4gKiBmaXJzdCBpdGVtIGZvciB3aGljaCBwIHJldHVybnMgdHJ1dGh5LlxuICovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5za2lwQWZ0ZXIgPSBmdW5jdGlvbiAocCkge1xuICByZXR1cm4gKDAsIF9zbGljZS5za2lwQWZ0ZXIpKHAsIHRoaXMpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFRpbWUgc2xpY2luZ1xuXG4vLyBAZGVwcmVjYXRlZCB0YWtlVW50aWwsIHVzZSB1bnRpbCBpbnN0ZWFkXG4vLyBAZGVwcmVjYXRlZCBza2lwVW50aWwsIHVzZSBzaW5jZSBpbnN0ZWFkXG5leHBvcnRzLnRha2VVbnRpbCA9IF90aW1lc2xpY2UudGFrZVVudGlsO1xuZXhwb3J0cy51bnRpbCA9IF90aW1lc2xpY2UudGFrZVVudGlsO1xuZXhwb3J0cy5za2lwVW50aWwgPSBfdGltZXNsaWNlLnNraXBVbnRpbDtcbmV4cG9ydHMuc2luY2UgPSBfdGltZXNsaWNlLnNraXBVbnRpbDtcbmV4cG9ydHMuZHVyaW5nID0gX3RpbWVzbGljZS5kdXJpbmc7XG5cbi8qKlxuICogc3RyZWFtOiAgICAgICAgICAgICAgICAgICAgLWEtYi1jLWQtZS1mLWctPlxuICogc2lnbmFsOiAgICAgICAgICAgICAgICAgICAgLS0tLS0tLXhcbiAqIHRha2VVbnRpbChzaWduYWwsIHN0cmVhbSk6IC1hLWItYy18XG4gKiBAcGFyYW0ge1N0cmVhbX0gc2lnbmFsIHJldGFpbiBvbmx5IGV2ZW50cyBpbiBzdHJlYW0gYmVmb3JlIHRoZSBmaXJzdFxuICogZXZlbnQgaW4gc2lnbmFsXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIGNvbnRhaW5pbmcgb25seSBldmVudHMgdGhhdCBvY2N1ciBiZWZvcmVcbiAqIHRoZSBmaXJzdCBldmVudCBpbiBzaWduYWwuXG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUudW50aWwgPSBmdW5jdGlvbiAoc2lnbmFsKSB7XG4gIHJldHVybiAoMCwgX3RpbWVzbGljZS50YWtlVW50aWwpKHNpZ25hbCwgdGhpcyk7XG59O1xuXG4vLyBAZGVwcmVjYXRlZCB1c2UgdW50aWwgaW5zdGVhZFxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUudGFrZVVudGlsID0gX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUudW50aWw7XG5cbi8qKlxuKiBzdHJlYW06ICAgICAgICAgICAgICAgICAgICAtYS1iLWMtZC1lLWYtZy0+XG4qIHNpZ25hbDogICAgICAgICAgICAgICAgICAgIC0tLS0tLS14XG4qIHRha2VVbnRpbChzaWduYWwsIHN0cmVhbSk6IC0tLS0tLS1kLWUtZi1nLT5cbiogQHBhcmFtIHtTdHJlYW19IHNpZ25hbCByZXRhaW4gb25seSBldmVudHMgaW4gc3RyZWFtIGF0IG9yIGFmdGVyIHRoZSBmaXJzdFxuKiBldmVudCBpbiBzaWduYWxcbiogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSBjb250YWluaW5nIG9ubHkgZXZlbnRzIHRoYXQgb2NjdXIgYWZ0ZXJcbiogdGhlIGZpcnN0IGV2ZW50IGluIHNpZ25hbC5cbiovXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5zaW5jZSA9IGZ1bmN0aW9uIChzaWduYWwpIHtcbiAgcmV0dXJuICgwLCBfdGltZXNsaWNlLnNraXBVbnRpbCkoc2lnbmFsLCB0aGlzKTtcbn07XG5cbi8vIEBkZXByZWNhdGVkIHVzZSBzaW5jZSBpbnN0ZWFkXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5za2lwVW50aWwgPSBfU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5zaW5jZTtcblxuLyoqXG4qIHN0cmVhbTogICAgICAgICAgICAgICAgICAgIC1hLWItYy1kLWUtZi1nLT5cbiogdGltZVdpbmRvdzogICAgICAgICAgICAgICAgLS0tLS1zXG4qIHM6ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tLS0tdFxuKiBzdHJlYW0uZHVyaW5nKHRpbWVXaW5kb3cpOiAtLS0tLWMtZC1lLXxcbiogQHBhcmFtIHtTdHJlYW08U3RyZWFtPn0gdGltZVdpbmRvdyBhIHN0cmVhbSB3aG9zZSBmaXJzdCBldmVudCAocykgcmVwcmVzZW50c1xuKiAgdGhlIHdpbmRvdyBzdGFydCB0aW1lLiAgVGhhdCBldmVudCAocykgaXMgaXRzZWxmIGEgc3RyZWFtIHdob3NlIGZpcnN0IGV2ZW50ICh0KVxuKiAgcmVwcmVzZW50cyB0aGUgd2luZG93IGVuZCB0aW1lXG4qIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gY29udGFpbmluZyBvbmx5IGV2ZW50cyB3aXRoaW4gdGhlIHByb3ZpZGVkIHRpbWVzcGFuXG4qL1xuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuZHVyaW5nID0gZnVuY3Rpb24gKHRpbWVXaW5kb3cpIHtcbiAgcmV0dXJuICgwLCBfdGltZXNsaWNlLmR1cmluZykodGltZVdpbmRvdywgdGhpcyk7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRGVsYXlpbmdcblxuZXhwb3J0cy5kZWxheSA9IF9kZWxheS5kZWxheTtcblxuLyoqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlUaW1lIG1pbGxpc2Vjb25kcyB0byBkZWxheSBlYWNoIGl0ZW1cbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gY29udGFpbmluZyB0aGUgc2FtZSBpdGVtcywgYnV0IGRlbGF5ZWQgYnkgbXNcbiAqL1xuXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uIChkZWxheVRpbWUpIHtcbiAgcmV0dXJuICgwLCBfZGVsYXkuZGVsYXkpKGRlbGF5VGltZSwgdGhpcyk7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gR2V0dGluZyBldmVudCB0aW1lc3RhbXBcblxuZXhwb3J0cy50aW1lc3RhbXAgPSBfdGltZXN0YW1wLnRpbWVzdGFtcDtcblxuLyoqXG4gKiBFeHBvc2UgZXZlbnQgdGltZXN0YW1wcyBpbnRvIHRoZSBzdHJlYW0uIFR1cm5zIGEgU3RyZWFtPFg+IGludG9cbiAqIFN0cmVhbTx7dGltZTp0LCB2YWx1ZTpYfT5cbiAqIEByZXR1cm5zIHtTdHJlYW08e3RpbWU6bnVtYmVyLCB2YWx1ZToqfT59XG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUudGltZXN0YW1wID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gKDAsIF90aW1lc3RhbXAudGltZXN0YW1wKSh0aGlzKTtcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSYXRlIGxpbWl0aW5nXG5cbmV4cG9ydHMudGhyb3R0bGUgPSBfbGltaXQudGhyb3R0bGU7XG5leHBvcnRzLmRlYm91bmNlID0gX2xpbWl0LmRlYm91bmNlO1xuXG4vKipcbiAqIExpbWl0IHRoZSByYXRlIG9mIGV2ZW50c1xuICogc3RyZWFtOiAgICAgICAgICAgICAgYWJjZC0tLS1hYmNkLS0tLVxuICogdGhyb3R0bGUoMiwgc3RyZWFtKTogYS1jLS0tLS1hLWMtLS0tLVxuICogQHBhcmFtIHtOdW1iZXJ9IHBlcmlvZCB0aW1lIHRvIHN1cHByZXNzIGV2ZW50c1xuICogQHJldHVybnMge1N0cmVhbX0gbmV3IHN0cmVhbSB0aGF0IHNraXBzIGV2ZW50cyBmb3IgdGhyb3R0bGUgcGVyaW9kXG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUudGhyb3R0bGUgPSBmdW5jdGlvbiAocGVyaW9kKSB7XG4gIHJldHVybiAoMCwgX2xpbWl0LnRocm90dGxlKShwZXJpb2QsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBXYWl0IGZvciBhIGJ1cnN0IG9mIGV2ZW50cyB0byBzdWJzaWRlIGFuZCBlbWl0IG9ubHkgdGhlIGxhc3QgZXZlbnQgaW4gdGhlIGJ1cnN0XG4gKiBzdHJlYW06ICAgICAgICAgICAgICBhYmNkLS0tLWFiY2QtLS0tXG4gKiBkZWJvdW5jZSgyLCBzdHJlYW0pOiAtLS0tLWQtLS0tLS0tZC0tXG4gKiBAcGFyYW0ge051bWJlcn0gcGVyaW9kIGV2ZW50cyBvY2N1cmluZyBtb3JlIGZyZXF1ZW50bHkgdGhhbiB0aGlzXG4gKiAgb24gdGhlIHByb3ZpZGVkIHNjaGVkdWxlciB3aWxsIGJlIHN1cHByZXNzZWRcbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBkZWJvdW5jZWQgc3RyZWFtXG4gKi9cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmRlYm91bmNlID0gZnVuY3Rpb24gKHBlcmlvZCkge1xuICByZXR1cm4gKDAsIF9saW1pdC5kZWJvdW5jZSkocGVyaW9kLCB0aGlzKTtcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBBd2FpdGluZyBQcm9taXNlc1xuXG4vLyBAZGVwcmVjYXRlZCBhd2FpdCwgdXNlIGF3YWl0UHJvbWlzZXMgaW5zdGVhZFxuZXhwb3J0cy5mcm9tUHJvbWlzZSA9IF9wcm9taXNlcy5mcm9tUHJvbWlzZTtcbmV4cG9ydHMuYXdhaXRQcm9taXNlcyA9IF9wcm9taXNlcy5hd2FpdFByb21pc2VzO1xuZXhwb3J0cy5hd2FpdCA9IF9wcm9taXNlcy5hd2FpdFByb21pc2VzO1xuXG4vKipcbiAqIEF3YWl0IHByb21pc2VzLCB0dXJuaW5nIGEgU3RyZWFtPFByb21pc2U8WD4+IGludG8gU3RyZWFtPFg+LiAgUHJlc2VydmVzXG4gKiBldmVudCBvcmRlciwgYnV0IHRpbWVzaGlmdHMgZXZlbnRzIGJhc2VkIG9uIHByb21pc2UgcmVzb2x1dGlvbiB0aW1lLlxuICogQHJldHVybnMge1N0cmVhbTxYPn0gc3RyZWFtIGNvbnRhaW5pbmcgbm9uLXByb21pc2UgdmFsdWVzXG4gKi9cblxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuYXdhaXRQcm9taXNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICgwLCBfcHJvbWlzZXMuYXdhaXRQcm9taXNlcykodGhpcyk7XG59O1xuXG4vLyBAZGVwcmVjYXRlZCB1c2UgYXdhaXRQcm9taXNlcyBpbnN0ZWFkXG5fU3RyZWFtMi5kZWZhdWx0LnByb3RvdHlwZS5hd2FpdCA9IF9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLmF3YWl0UHJvbWlzZXM7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFcnJvciBoYW5kbGluZ1xuXG4vLyBAZGVwcmVjYXRlZCBmbGF0TWFwRXJyb3IsIHVzZSByZWNvdmVyV2l0aCBpbnN0ZWFkXG5leHBvcnRzLnJlY292ZXJXaXRoID0gX2Vycm9ycy5yZWNvdmVyV2l0aDtcbmV4cG9ydHMuZmxhdE1hcEVycm9yID0gX2Vycm9ycy5mbGF0TWFwRXJyb3I7XG5leHBvcnRzLnRocm93RXJyb3IgPSBfZXJyb3JzLnRocm93RXJyb3I7XG5cbi8qKlxuICogSWYgdGhpcyBzdHJlYW0gZW5jb3VudGVycyBhbiBlcnJvciwgcmVjb3ZlciBhbmQgY29udGludWUgd2l0aCBpdGVtcyBmcm9tIHN0cmVhbVxuICogcmV0dXJuZWQgYnkgZi5cbiAqIHN0cmVhbTogICAgICAgICAgICAgICAgICAtYS1iLWMtWC1cbiAqIGYoWCk6ICAgICAgICAgICAgICAgICAgICAgICAgICAgZC1lLWYtZy1cbiAqIGZsYXRNYXBFcnJvcihmLCBzdHJlYW0pOiAtYS1iLWMtZC1lLWYtZy1cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oZXJyb3I6Kik6U3RyZWFtfSBmIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBuZXcgc3RyZWFtXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIHdoaWNoIHdpbGwgcmVjb3ZlciBmcm9tIGFuIGVycm9yIGJ5IGNhbGxpbmcgZlxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLnJlY292ZXJXaXRoID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuICgwLCBfZXJyb3JzLmZsYXRNYXBFcnJvcikoZiwgdGhpcyk7XG59O1xuXG4vLyBAZGVwcmVjYXRlZCB1c2UgcmVjb3ZlcldpdGggaW5zdGVhZFxuX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUuZmxhdE1hcEVycm9yID0gX1N0cmVhbTIuZGVmYXVsdC5wcm90b3R5cGUucmVjb3ZlcldpdGg7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNdWx0aWNhc3RpbmdcblxuZXhwb3J0cy5tdWx0aWNhc3QgPSBfbXVsdGljYXN0Mi5kZWZhdWx0O1xuXG4vKipcbiAqIFRyYW5zZm9ybSB0aGUgc3RyZWFtIGludG8gbXVsdGljYXN0IHN0cmVhbS4gIFRoYXQgbWVhbnMgdGhhdCBtYW55IHN1YnNjcmliZXJzXG4gKiB0byB0aGUgc3RyZWFtIHdpbGwgbm90IGNhdXNlIG11bHRpcGxlIGludm9jYXRpb25zIG9mIHRoZSBpbnRlcm5hbCBtYWNoaW5lcnkuXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBuZXcgc3RyZWFtIHdoaWNoIHdpbGwgbXVsdGljYXN0IGV2ZW50cyB0byBhbGwgb2JzZXJ2ZXJzLlxuICovXG5cbl9TdHJlYW0yLmRlZmF1bHQucHJvdG90eXBlLm11bHRpY2FzdCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICgwLCBfbXVsdGljYXN0Mi5kZWZhdWx0KSh0aGlzKTtcbn07XG5cbi8vIGV4cG9ydCB0aGUgaW5zdGFuY2Ugb2YgdGhlIGRlZmF1bHRTY2hlZHVsZXIgZm9yIHRoaXJkLXBhcnR5IGxpYnJhcmllc1xuZXhwb3J0cy5kZWZhdWx0U2NoZWR1bGVyID0gX2RlZmF1bHRTY2hlZHVsZXIyLmRlZmF1bHQ7XG5cbi8vIGV4cG9ydCBhbiBpbXBsZW1lbnRhdGlvbiBvZiBUYXNrIHVzZWQgaW50ZXJuYWxseSBmb3IgdGhpcmQtcGFydHkgbGlicmFyaWVzXG5cbmV4cG9ydHMuUHJvcGFnYXRlVGFzayA9IF9Qcm9wYWdhdGVUYXNrMi5kZWZhdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gaW52b2tlO1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIGludm9rZShmLCBhcmdzKSB7XG4gIC8qZXNsaW50IGNvbXBsZXhpdHk6IFsyLDddKi9cbiAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgIGNhc2UgMDpcbiAgICAgIHJldHVybiBmKCk7XG4gICAgY2FzZSAxOlxuICAgICAgcmV0dXJuIGYoYXJnc1swXSk7XG4gICAgY2FzZSAyOlxuICAgICAgcmV0dXJuIGYoYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgY2FzZSAzOlxuICAgICAgcmV0dXJuIGYoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSk7XG4gICAgY2FzZSA0OlxuICAgICAgcmV0dXJuIGYoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSk7XG4gICAgY2FzZSA1OlxuICAgICAgcmV0dXJuIGYoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSwgYXJnc1s0XSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmLmFwcGx5KHZvaWQgMCwgYXJncyk7XG4gIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmlzSXRlcmFibGUgPSBpc0l0ZXJhYmxlO1xuZXhwb3J0cy5nZXRJdGVyYXRvciA9IGdldEl0ZXJhdG9yO1xuZXhwb3J0cy5tYWtlSXRlcmFibGUgPSBtYWtlSXRlcmFibGU7XG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuLypnbG9iYWwgU2V0LCBTeW1ib2wqL1xudmFyIGl0ZXJhdG9yU3ltYm9sO1xuLy8gRmlyZWZveCBzaGlwcyBhIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gdXNpbmcgdGhlIG5hbWUgQEBpdGVyYXRvci5cbi8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTkwNzA3NyNjMTRcbmlmICh0eXBlb2YgU2V0ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBuZXcgU2V0KClbJ0BAaXRlcmF0b3InXSA9PT0gJ2Z1bmN0aW9uJykge1xuICBpdGVyYXRvclN5bWJvbCA9ICdAQGl0ZXJhdG9yJztcbn0gZWxzZSB7XG4gIGl0ZXJhdG9yU3ltYm9sID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3IgfHwgJ19lczZzaGltX2l0ZXJhdG9yXyc7XG59XG5cbmZ1bmN0aW9uIGlzSXRlcmFibGUobykge1xuICByZXR1cm4gdHlwZW9mIG9baXRlcmF0b3JTeW1ib2xdID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBnZXRJdGVyYXRvcihvKSB7XG4gIHJldHVybiBvW2l0ZXJhdG9yU3ltYm9sXSgpO1xufVxuXG5mdW5jdGlvbiBtYWtlSXRlcmFibGUoZiwgbykge1xuICBvW2l0ZXJhdG9yU3ltYm9sXSA9IGY7XG4gIHJldHVybiBvO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZnJvbU9ic2VydmFibGUgPSBmcm9tT2JzZXJ2YWJsZTtcbmV4cG9ydHMuT2JzZXJ2YWJsZVNvdXJjZSA9IE9ic2VydmFibGVTb3VyY2U7XG5leHBvcnRzLlN1YnNjcmliZXJTaW5rID0gU3Vic2NyaWJlclNpbms7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfZGlzcG9zZSA9IHJlcXVpcmUoJy4uL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxudmFyIF90cnlFdmVudCA9IHJlcXVpcmUoJy4uL3NvdXJjZS90cnlFdmVudCcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gZnJvbU9ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuICByZXR1cm4gbmV3IF9TdHJlYW0yLmRlZmF1bHQobmV3IE9ic2VydmFibGVTb3VyY2Uob2JzZXJ2YWJsZSkpO1xufSAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gT2JzZXJ2YWJsZVNvdXJjZShvYnNlcnZhYmxlKSB7XG4gIHRoaXMub2JzZXJ2YWJsZSA9IG9ic2VydmFibGU7XG59XG5cbk9ic2VydmFibGVTb3VyY2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdmFyIHN1YiA9IHRoaXMub2JzZXJ2YWJsZS5zdWJzY3JpYmUobmV3IFN1YnNjcmliZXJTaW5rKHNpbmssIHNjaGVkdWxlcikpO1xuICBpZiAodHlwZW9mIHN1YiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBkaXNwb3NlLmNyZWF0ZShzdWIpO1xuICB9IGVsc2UgaWYgKHN1YiAmJiB0eXBlb2Ygc3ViLnVuc3Vic2NyaWJlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGRpc3Bvc2UuY3JlYXRlKHVuc3Vic2NyaWJlLCBzdWIpO1xuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JzZXJ2YWJsZSByZXR1cm5lZCBpbnZhbGlkIHN1YnNjcmlwdGlvbiAnICsgU3RyaW5nKHN1YikpO1xufTtcblxuZnVuY3Rpb24gU3Vic2NyaWJlclNpbmsoc2luaywgc2NoZWR1bGVyKSB7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xufVxuXG5TdWJzY3JpYmVyU2luay5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICh4KSB7XG4gICgwLCBfdHJ5RXZlbnQudHJ5RXZlbnQpKHRoaXMuc2NoZWR1bGVyLm5vdygpLCB4LCB0aGlzLnNpbmspO1xufTtcblxuU3Vic2NyaWJlclNpbmsucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKHgpIHtcbiAgKDAsIF90cnlFdmVudC50cnlFbmQpKHRoaXMuc2NoZWR1bGVyLm5vdygpLCB4LCB0aGlzLnNpbmspO1xufTtcblxuU3Vic2NyaWJlclNpbmsucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgdGhpcy5zaW5rLmVycm9yKHRoaXMuc2NoZWR1bGVyLm5vdygpLCBlKTtcbn07XG5cbmZ1bmN0aW9uIHVuc3Vic2NyaWJlKHN1YnNjcmlwdGlvbikge1xuICByZXR1cm4gc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gZ2V0T2JzZXJ2YWJsZTtcblxudmFyIF9zeW1ib2xPYnNlcnZhYmxlID0gcmVxdWlyZSgnc3ltYm9sLW9ic2VydmFibGUnKTtcblxudmFyIF9zeW1ib2xPYnNlcnZhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3N5bWJvbE9ic2VydmFibGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBnZXRPYnNlcnZhYmxlKG8pIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb21wbGV4aXR5XG4gIHZhciBvYnMgPSBudWxsO1xuICBpZiAobykge1xuICAgIC8vIEFjY2VzcyBmb3JlaWduIG1ldGhvZCBvbmx5IG9uY2VcbiAgICB2YXIgbWV0aG9kID0gb1tfc3ltYm9sT2JzZXJ2YWJsZTIuZGVmYXVsdF07XG4gICAgaWYgKHR5cGVvZiBtZXRob2QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG9icyA9IG1ldGhvZC5jYWxsKG8pO1xuICAgICAgaWYgKCEob2JzICYmIHR5cGVvZiBvYnMuc3Vic2NyaWJlID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIG9ic2VydmFibGUgJyArIG9icyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9icztcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zdWJzY3JpYmUgPSBzdWJzY3JpYmU7XG5leHBvcnRzLlN1YnNjcmliZU9ic2VydmVyID0gU3Vic2NyaWJlT2JzZXJ2ZXI7XG5leHBvcnRzLlN1YnNjcmlwdGlvbiA9IFN1YnNjcmlwdGlvbjtcblxudmFyIF9kZWZhdWx0U2NoZWR1bGVyID0gcmVxdWlyZSgnLi4vc2NoZWR1bGVyL2RlZmF1bHRTY2hlZHVsZXInKTtcblxudmFyIF9kZWZhdWx0U2NoZWR1bGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RlZmF1bHRTY2hlZHVsZXIpO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuLi9kaXNwb3NhYmxlL2Rpc3Bvc2UnKTtcblxudmFyIGRpc3Bvc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZGlzcG9zZSk7XG5cbnZhciBfZmF0YWxFcnJvciA9IHJlcXVpcmUoJy4uL2ZhdGFsRXJyb3InKTtcblxudmFyIF9mYXRhbEVycm9yMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2ZhdGFsRXJyb3IpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gc3Vic2NyaWJlKHN1YnNjcmliZXIsIHN0cmVhbSkge1xuICBpZiAoT2JqZWN0KHN1YnNjcmliZXIpICE9PSBzdWJzY3JpYmVyKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignc3Vic2NyaWJlciBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgdmFyIGRpc3Bvc2FibGUgPSBkaXNwb3NlLnNldHRhYmxlKCk7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBTdWJzY3JpYmVPYnNlcnZlcihfZmF0YWxFcnJvcjIuZGVmYXVsdCwgc3Vic2NyaWJlciwgZGlzcG9zYWJsZSk7XG5cbiAgZGlzcG9zYWJsZS5zZXREaXNwb3NhYmxlKHN0cmVhbS5zb3VyY2UucnVuKG9ic2VydmVyLCBfZGVmYXVsdFNjaGVkdWxlcjIuZGVmYXVsdCkpO1xuXG4gIHJldHVybiBuZXcgU3Vic2NyaXB0aW9uKGRpc3Bvc2FibGUpO1xufSAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gU3Vic2NyaWJlT2JzZXJ2ZXIoZmF0YWxFcnJvciwgc3Vic2NyaWJlciwgZGlzcG9zYWJsZSkge1xuICB0aGlzLmZhdGFsRXJyb3IgPSBmYXRhbEVycm9yO1xuICB0aGlzLnN1YnNjcmliZXIgPSBzdWJzY3JpYmVyO1xuICB0aGlzLmRpc3Bvc2FibGUgPSBkaXNwb3NhYmxlO1xufVxuXG5TdWJzY3JpYmVPYnNlcnZlci5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAoIXRoaXMuZGlzcG9zYWJsZS5kaXNwb3NlZCAmJiB0eXBlb2YgdGhpcy5zdWJzY3JpYmVyLm5leHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLnN1YnNjcmliZXIubmV4dCh4KTtcbiAgfVxufTtcblxuU3Vic2NyaWJlT2JzZXJ2ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICghdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2VkKSB7XG4gICAgdmFyIHMgPSB0aGlzLnN1YnNjcmliZXI7XG4gICAgdmFyIGZhdGFsRXJyb3IgPSB0aGlzLmZhdGFsRXJyb3I7XG4gICAgUHJvbWlzZS5yZXNvbHZlKHRoaXMuZGlzcG9zYWJsZS5kaXNwb3NlKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHR5cGVvZiBzLmNvbXBsZXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHMuY29tcGxldGUoeCk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRocm93RXJyb3IoZSwgcywgZmF0YWxFcnJvcik7XG4gICAgfSk7XG4gIH1cbn07XG5cblN1YnNjcmliZU9ic2VydmVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICh0LCBlKSB7XG4gIHZhciBzID0gdGhpcy5zdWJzY3JpYmVyO1xuICB2YXIgZmF0YWxFcnJvciA9IHRoaXMuZmF0YWxFcnJvcjtcbiAgUHJvbWlzZS5yZXNvbHZlKHRoaXMuZGlzcG9zYWJsZS5kaXNwb3NlKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHRocm93RXJyb3IoZSwgcywgZmF0YWxFcnJvcik7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gU3Vic2NyaXB0aW9uKGRpc3Bvc2FibGUpIHtcbiAgdGhpcy5kaXNwb3NhYmxlID0gZGlzcG9zYWJsZTtcbn1cblxuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbn07XG5cbmZ1bmN0aW9uIHRocm93RXJyb3IoZTEsIHN1YnNjcmliZXIsIHRocm93RXJyb3IpIHtcbiAgaWYgKHR5cGVvZiBzdWJzY3JpYmVyLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHN1YnNjcmliZXIuZXJyb3IoZTEpO1xuICAgIH0gY2F0Y2ggKGUyKSB7XG4gICAgICB0aHJvd0Vycm9yKGUyKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3dFcnJvcihlMSk7XG4gIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLndpdGhEZWZhdWx0U2NoZWR1bGVyID0gd2l0aERlZmF1bHRTY2hlZHVsZXI7XG5leHBvcnRzLndpdGhTY2hlZHVsZXIgPSB3aXRoU2NoZWR1bGVyO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuL2Rpc3Bvc2FibGUvZGlzcG9zZScpO1xuXG52YXIgZGlzcG9zZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9kaXNwb3NlKTtcblxudmFyIF9kZWZhdWx0U2NoZWR1bGVyID0gcmVxdWlyZSgnLi9zY2hlZHVsZXIvZGVmYXVsdFNjaGVkdWxlcicpO1xuXG52YXIgX2RlZmF1bHRTY2hlZHVsZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZGVmYXVsdFNjaGVkdWxlcik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gd2l0aERlZmF1bHRTY2hlZHVsZXIoc291cmNlKSB7XG4gIHJldHVybiB3aXRoU2NoZWR1bGVyKHNvdXJjZSwgX2RlZmF1bHRTY2hlZHVsZXIyLmRlZmF1bHQpO1xufVxuXG5mdW5jdGlvbiB3aXRoU2NoZWR1bGVyKHNvdXJjZSwgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcnVuU291cmNlKHNvdXJjZSwgc2NoZWR1bGVyLCByZXNvbHZlLCByZWplY3QpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuU291cmNlKHNvdXJjZSwgc2NoZWR1bGVyLCByZXNvbHZlLCByZWplY3QpIHtcbiAgdmFyIGRpc3Bvc2FibGUgPSBkaXNwb3NlLnNldHRhYmxlKCk7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBEcmFpbihyZXNvbHZlLCByZWplY3QsIGRpc3Bvc2FibGUpO1xuXG4gIGRpc3Bvc2FibGUuc2V0RGlzcG9zYWJsZShzb3VyY2UucnVuKG9ic2VydmVyLCBzY2hlZHVsZXIpKTtcbn1cblxuZnVuY3Rpb24gRHJhaW4oZW5kLCBlcnJvciwgZGlzcG9zYWJsZSkge1xuICB0aGlzLl9lbmQgPSBlbmQ7XG4gIHRoaXMuX2Vycm9yID0gZXJyb3I7XG4gIHRoaXMuX2Rpc3Bvc2FibGUgPSBkaXNwb3NhYmxlO1xuICB0aGlzLmFjdGl2ZSA9IHRydWU7XG59XG5cbkRyYWluLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7fTtcblxuRHJhaW4ucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICghdGhpcy5hY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgZGlzcG9zZVRoZW4odGhpcy5fZW5kLCB0aGlzLl9lcnJvciwgdGhpcy5fZGlzcG9zYWJsZSwgeCk7XG59O1xuXG5EcmFpbi5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAodCwgZSkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICBkaXNwb3NlVGhlbih0aGlzLl9lcnJvciwgdGhpcy5fZXJyb3IsIHRoaXMuX2Rpc3Bvc2FibGUsIGUpO1xufTtcblxuZnVuY3Rpb24gZGlzcG9zZVRoZW4oZW5kLCBlcnJvciwgZGlzcG9zYWJsZSwgeCkge1xuICBQcm9taXNlLnJlc29sdmUoZGlzcG9zYWJsZS5kaXNwb3NlKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIGVuZCh4KTtcbiAgfSwgZXJyb3IpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IENsb2NrVGltZXI7XG5cbnZhciBfdGFzayA9IHJlcXVpcmUoJy4uL3Rhc2snKTtcblxuLypnbG9iYWwgc2V0VGltZW91dCwgY2xlYXJUaW1lb3V0Ki9cblxuZnVuY3Rpb24gQ2xvY2tUaW1lcigpIHt9IC8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5DbG9ja1RpbWVyLnByb3RvdHlwZS5ub3cgPSBEYXRlLm5vdztcblxuQ2xvY2tUaW1lci5wcm90b3R5cGUuc2V0VGltZXIgPSBmdW5jdGlvbiAoZiwgZHQpIHtcbiAgcmV0dXJuIGR0IDw9IDAgPyBydW5Bc2FwKGYpIDogc2V0VGltZW91dChmLCBkdCk7XG59O1xuXG5DbG9ja1RpbWVyLnByb3RvdHlwZS5jbGVhclRpbWVyID0gZnVuY3Rpb24gKHQpIHtcbiAgcmV0dXJuIHQgaW5zdGFuY2VvZiBBc2FwID8gdC5jYW5jZWwoKSA6IGNsZWFyVGltZW91dCh0KTtcbn07XG5cbmZ1bmN0aW9uIEFzYXAoZikge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLmFjdGl2ZSA9IHRydWU7XG59XG5cbkFzYXAucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuYWN0aXZlICYmIHRoaXMuZigpO1xufTtcblxuQXNhcC5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICB0aHJvdyBlO1xufTtcblxuQXNhcC5wcm90b3R5cGUuY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xufTtcblxuZnVuY3Rpb24gcnVuQXNhcChmKSB7XG4gIHZhciB0YXNrID0gbmV3IEFzYXAoZik7XG4gICgwLCBfdGFzay5kZWZlcikodGFzayk7XG4gIHJldHVybiB0YXNrO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IFByb3BhZ2F0ZVRhc2s7XG5cbnZhciBfZmF0YWxFcnJvciA9IHJlcXVpcmUoJy4uL2ZhdGFsRXJyb3InKTtcblxudmFyIF9mYXRhbEVycm9yMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2ZhdGFsRXJyb3IpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBQcm9wYWdhdGVUYXNrKHJ1biwgdmFsdWUsIHNpbmspIHtcbiAgdGhpcy5fcnVuID0gcnVuO1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cblByb3BhZ2F0ZVRhc2suZXZlbnQgPSBmdW5jdGlvbiAodmFsdWUsIHNpbmspIHtcbiAgcmV0dXJuIG5ldyBQcm9wYWdhdGVUYXNrKGVtaXQsIHZhbHVlLCBzaW5rKTtcbn07XG5cblByb3BhZ2F0ZVRhc2suZW5kID0gZnVuY3Rpb24gKHZhbHVlLCBzaW5rKSB7XG4gIHJldHVybiBuZXcgUHJvcGFnYXRlVGFzayhlbmQsIHZhbHVlLCBzaW5rKTtcbn07XG5cblByb3BhZ2F0ZVRhc2suZXJyb3IgPSBmdW5jdGlvbiAodmFsdWUsIHNpbmspIHtcbiAgcmV0dXJuIG5ldyBQcm9wYWdhdGVUYXNrKGVycm9yLCB2YWx1ZSwgc2luayk7XG59O1xuXG5Qcm9wYWdhdGVUYXNrLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xufTtcblxuUHJvcGFnYXRlVGFzay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHQpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLl9ydW4odCwgdGhpcy52YWx1ZSwgdGhpcy5zaW5rKTtcbn07XG5cblByb3BhZ2F0ZVRhc2sucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKHQsIGUpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSkge1xuICAgIHJldHVybiAoMCwgX2ZhdGFsRXJyb3IyLmRlZmF1bHQpKGUpO1xuICB9XG4gIHRoaXMuc2luay5lcnJvcih0LCBlKTtcbn07XG5cbmZ1bmN0aW9uIGVycm9yKHQsIGUsIHNpbmspIHtcbiAgc2luay5lcnJvcih0LCBlKTtcbn1cblxuZnVuY3Rpb24gZW1pdCh0LCB4LCBzaW5rKSB7XG4gIHNpbmsuZXZlbnQodCwgeCk7XG59XG5cbmZ1bmN0aW9uIGVuZCh0LCB4LCBzaW5rKSB7XG4gIHNpbmsuZW5kKHQsIHgpO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gU2NoZWR1bGVkVGFzaztcbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBTY2hlZHVsZWRUYXNrKGRlbGF5LCBwZXJpb2QsIHRhc2ssIHNjaGVkdWxlcikge1xuICB0aGlzLnRpbWUgPSBkZWxheTtcbiAgdGhpcy5wZXJpb2QgPSBwZXJpb2Q7XG4gIHRoaXMudGFzayA9IHRhc2s7XG4gIHRoaXMuc2NoZWR1bGVyID0gc2NoZWR1bGVyO1xuICB0aGlzLmFjdGl2ZSA9IHRydWU7XG59XG5cblNjaGVkdWxlZFRhc2sucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudGFzay5ydW4odGhpcy50aW1lKTtcbn07XG5cblNjaGVkdWxlZFRhc2sucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgcmV0dXJuIHRoaXMudGFzay5lcnJvcih0aGlzLnRpbWUsIGUpO1xufTtcblxuU2NoZWR1bGVkVGFzay5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zY2hlZHVsZXIuY2FuY2VsKHRoaXMpO1xuICByZXR1cm4gdGhpcy50YXNrLmRpc3Bvc2UoKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gU2NoZWR1bGVyO1xuXG52YXIgX1NjaGVkdWxlZFRhc2sgPSByZXF1aXJlKCcuL1NjaGVkdWxlZFRhc2snKTtcblxudmFyIF9TY2hlZHVsZWRUYXNrMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1NjaGVkdWxlZFRhc2spO1xuXG52YXIgX3Rhc2sgPSByZXF1aXJlKCcuLi90YXNrJyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBTY2hlZHVsZXIodGltZXIsIHRpbWVsaW5lKSB7XG4gIHRoaXMudGltZXIgPSB0aW1lcjtcbiAgdGhpcy50aW1lbGluZSA9IHRpbWVsaW5lO1xuXG4gIHRoaXMuX3RpbWVyID0gbnVsbDtcbiAgdGhpcy5fbmV4dEFycml2YWwgPSBJbmZpbml0eTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3J1blJlYWR5VGFza3NCb3VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9ydW5SZWFkeVRhc2tzKHNlbGYubm93KCkpO1xuICB9O1xufVxuXG5TY2hlZHVsZXIucHJvdG90eXBlLm5vdyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudGltZXIubm93KCk7XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLmFzYXAgPSBmdW5jdGlvbiAodGFzaykge1xuICByZXR1cm4gdGhpcy5zY2hlZHVsZSgwLCAtMSwgdGFzayk7XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKGRlbGF5LCB0YXNrKSB7XG4gIHJldHVybiB0aGlzLnNjaGVkdWxlKGRlbGF5LCAtMSwgdGFzayk7XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLnBlcmlvZGljID0gZnVuY3Rpb24gKHBlcmlvZCwgdGFzaykge1xuICByZXR1cm4gdGhpcy5zY2hlZHVsZSgwLCBwZXJpb2QsIHRhc2spO1xufTtcblxuU2NoZWR1bGVyLnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uIChkZWxheSwgcGVyaW9kLCB0YXNrKSB7XG4gIHZhciBub3cgPSB0aGlzLm5vdygpO1xuICB2YXIgc3QgPSBuZXcgX1NjaGVkdWxlZFRhc2syLmRlZmF1bHQobm93ICsgTWF0aC5tYXgoMCwgZGVsYXkpLCBwZXJpb2QsIHRhc2ssIHRoaXMpO1xuXG4gIHRoaXMudGltZWxpbmUuYWRkKHN0KTtcbiAgdGhpcy5fc2NoZWR1bGVOZXh0UnVuKG5vdyk7XG4gIHJldHVybiBzdDtcbn07XG5cblNjaGVkdWxlci5wcm90b3R5cGUuY2FuY2VsID0gZnVuY3Rpb24gKHRhc2spIHtcbiAgdGFzay5hY3RpdmUgPSBmYWxzZTtcbiAgaWYgKHRoaXMudGltZWxpbmUucmVtb3ZlKHRhc2spKSB7XG4gICAgdGhpcy5fcmVzY2hlZHVsZSgpO1xuICB9XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLmNhbmNlbEFsbCA9IGZ1bmN0aW9uIChmKSB7XG4gIHRoaXMudGltZWxpbmUucmVtb3ZlQWxsKGYpO1xuICB0aGlzLl9yZXNjaGVkdWxlKCk7XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLl9yZXNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy50aW1lbGluZS5pc0VtcHR5KCkpIHtcbiAgICB0aGlzLl91bnNjaGVkdWxlKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fc2NoZWR1bGVOZXh0UnVuKHRoaXMubm93KCkpO1xuICB9XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLl91bnNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnRpbWVyLmNsZWFyVGltZXIodGhpcy5fdGltZXIpO1xuICB0aGlzLl90aW1lciA9IG51bGw7XG59O1xuXG5TY2hlZHVsZXIucHJvdG90eXBlLl9zY2hlZHVsZU5leHRSdW4gPSBmdW5jdGlvbiAobm93KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29tcGxleGl0eVxuICBpZiAodGhpcy50aW1lbGluZS5pc0VtcHR5KCkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbmV4dEFycml2YWwgPSB0aGlzLnRpbWVsaW5lLm5leHRBcnJpdmFsKCk7XG5cbiAgaWYgKHRoaXMuX3RpbWVyID09PSBudWxsKSB7XG4gICAgdGhpcy5fc2NoZWR1bGVOZXh0QXJyaXZhbChuZXh0QXJyaXZhbCwgbm93KTtcbiAgfSBlbHNlIGlmIChuZXh0QXJyaXZhbCA8IHRoaXMuX25leHRBcnJpdmFsKSB7XG4gICAgdGhpcy5fdW5zY2hlZHVsZSgpO1xuICAgIHRoaXMuX3NjaGVkdWxlTmV4dEFycml2YWwobmV4dEFycml2YWwsIG5vdyk7XG4gIH1cbn07XG5cblNjaGVkdWxlci5wcm90b3R5cGUuX3NjaGVkdWxlTmV4dEFycml2YWwgPSBmdW5jdGlvbiAobmV4dEFycml2YWwsIG5vdykge1xuICB0aGlzLl9uZXh0QXJyaXZhbCA9IG5leHRBcnJpdmFsO1xuICB2YXIgZGVsYXkgPSBNYXRoLm1heCgwLCBuZXh0QXJyaXZhbCAtIG5vdyk7XG4gIHRoaXMuX3RpbWVyID0gdGhpcy50aW1lci5zZXRUaW1lcih0aGlzLl9ydW5SZWFkeVRhc2tzQm91bmQsIGRlbGF5KTtcbn07XG5cblNjaGVkdWxlci5wcm90b3R5cGUuX3J1blJlYWR5VGFza3MgPSBmdW5jdGlvbiAobm93KSB7XG4gIHRoaXMuX3RpbWVyID0gbnVsbDtcbiAgdGhpcy50aW1lbGluZS5ydW5UYXNrcyhub3csIF90YXNrLnJ1blRhc2spO1xuICB0aGlzLl9zY2hlZHVsZU5leHRSdW4odGhpcy5ub3coKSk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IFRpbWVsaW5lO1xuXG52YXIgX3ByZWx1ZGUgPSByZXF1aXJlKCdAbW9zdC9wcmVsdWRlJyk7XG5cbnZhciBiYXNlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3ByZWx1ZGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gVGltZWxpbmUoKSB7XG4gIHRoaXMudGFza3MgPSBbXTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cblRpbWVsaW5lLnByb3RvdHlwZS5uZXh0QXJyaXZhbCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuaXNFbXB0eSgpID8gSW5maW5pdHkgOiB0aGlzLnRhc2tzWzBdLnRpbWU7XG59O1xuXG5UaW1lbGluZS5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudGFza3MubGVuZ3RoID09PSAwO1xufTtcblxuVGltZWxpbmUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChzdCkge1xuICBpbnNlcnRCeVRpbWUoc3QsIHRoaXMudGFza3MpO1xufTtcblxuVGltZWxpbmUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChzdCkge1xuICB2YXIgaSA9IGJpbmFyeVNlYXJjaChzdC50aW1lLCB0aGlzLnRhc2tzKTtcblxuICBpZiAoaSA+PSAwICYmIGkgPCB0aGlzLnRhc2tzLmxlbmd0aCkge1xuICAgIHZhciBhdCA9IGJhc2UuZmluZEluZGV4KHN0LCB0aGlzLnRhc2tzW2ldLmV2ZW50cyk7XG4gICAgaWYgKGF0ID49IDApIHtcbiAgICAgIHRoaXMudGFza3NbaV0uZXZlbnRzLnNwbGljZShhdCwgMSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5UaW1lbGluZS5wcm90b3R5cGUucmVtb3ZlQWxsID0gZnVuY3Rpb24gKGYpIHtcbiAgdmFyIHRoaXMkMSA9IHRoaXM7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnRhc2tzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIHJlbW92ZUFsbEZyb20oZiwgdGhpcyQxLnRhc2tzW2ldKTtcbiAgfVxufTtcblxuVGltZWxpbmUucHJvdG90eXBlLnJ1blRhc2tzID0gZnVuY3Rpb24gKHQsIHJ1blRhc2spIHtcbiAgdmFyIHRoaXMkMSA9IHRoaXM7XG5cbiAgdmFyIHRhc2tzID0gdGhpcy50YXNrcztcbiAgdmFyIGwgPSB0YXNrcy5sZW5ndGg7XG4gIHZhciBpID0gMDtcblxuICB3aGlsZSAoaSA8IGwgJiYgdGFza3NbaV0udGltZSA8PSB0KSB7XG4gICAgKytpO1xuICB9XG5cbiAgdGhpcy50YXNrcyA9IHRhc2tzLnNsaWNlKGkpO1xuXG4gIC8vIFJ1biBhbGwgcmVhZHkgdGFza3NcbiAgZm9yICh2YXIgaiA9IDA7IGogPCBpOyArK2opIHtcbiAgICB0aGlzJDEudGFza3MgPSBydW5UYXNrcyhydW5UYXNrLCB0YXNrc1tqXSwgdGhpcyQxLnRhc2tzKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcnVuVGFza3MocnVuVGFzaywgdGltZXNsb3QsIHRhc2tzKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29tcGxleGl0eVxuICB2YXIgZXZlbnRzID0gdGltZXNsb3QuZXZlbnRzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciB0YXNrID0gZXZlbnRzW2ldO1xuXG4gICAgaWYgKHRhc2suYWN0aXZlKSB7XG4gICAgICBydW5UYXNrKHRhc2spO1xuXG4gICAgICAvLyBSZXNjaGVkdWxlIHBlcmlvZGljIHJlcGVhdGluZyB0YXNrc1xuICAgICAgLy8gQ2hlY2sgYWN0aXZlIGFnYWluLCBzaW5jZSBhIHRhc2sgbWF5IGhhdmUgY2FuY2VsZWQgaXRzZWxmXG4gICAgICBpZiAodGFzay5wZXJpb2QgPj0gMCAmJiB0YXNrLmFjdGl2ZSkge1xuICAgICAgICB0YXNrLnRpbWUgPSB0YXNrLnRpbWUgKyB0YXNrLnBlcmlvZDtcbiAgICAgICAgaW5zZXJ0QnlUaW1lKHRhc2ssIHRhc2tzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGFza3M7XG59XG5cbmZ1bmN0aW9uIGluc2VydEJ5VGltZSh0YXNrLCB0aW1lc2xvdHMpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb21wbGV4aXR5XG4gIHZhciBsID0gdGltZXNsb3RzLmxlbmd0aDtcblxuICBpZiAobCA9PT0gMCkge1xuICAgIHRpbWVzbG90cy5wdXNoKG5ld1RpbWVzbG90KHRhc2sudGltZSwgW3Rhc2tdKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGkgPSBiaW5hcnlTZWFyY2godGFzay50aW1lLCB0aW1lc2xvdHMpO1xuXG4gIGlmIChpID49IGwpIHtcbiAgICB0aW1lc2xvdHMucHVzaChuZXdUaW1lc2xvdCh0YXNrLnRpbWUsIFt0YXNrXSkpO1xuICB9IGVsc2UgaWYgKHRhc2sudGltZSA9PT0gdGltZXNsb3RzW2ldLnRpbWUpIHtcbiAgICB0aW1lc2xvdHNbaV0uZXZlbnRzLnB1c2godGFzayk7XG4gIH0gZWxzZSB7XG4gICAgdGltZXNsb3RzLnNwbGljZShpLCAwLCBuZXdUaW1lc2xvdCh0YXNrLnRpbWUsIFt0YXNrXSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUFsbEZyb20oZiwgdGltZXNsb3QpIHtcbiAgdGltZXNsb3QuZXZlbnRzID0gYmFzZS5yZW1vdmVBbGwoZiwgdGltZXNsb3QuZXZlbnRzKTtcbn1cblxuZnVuY3Rpb24gYmluYXJ5U2VhcmNoKHQsIHNvcnRlZEFycmF5KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29tcGxleGl0eVxuICB2YXIgbG8gPSAwO1xuICB2YXIgaGkgPSBzb3J0ZWRBcnJheS5sZW5ndGg7XG4gIHZhciBtaWQsIHk7XG5cbiAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICBtaWQgPSBNYXRoLmZsb29yKChsbyArIGhpKSAvIDIpO1xuICAgIHkgPSBzb3J0ZWRBcnJheVttaWRdO1xuXG4gICAgaWYgKHQgPT09IHkudGltZSkge1xuICAgICAgcmV0dXJuIG1pZDtcbiAgICB9IGVsc2UgaWYgKHQgPCB5LnRpbWUpIHtcbiAgICAgIGhpID0gbWlkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsbyA9IG1pZCArIDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBoaTtcbn1cblxuZnVuY3Rpb24gbmV3VGltZXNsb3QodCwgZXZlbnRzKSB7XG4gIHJldHVybiB7IHRpbWU6IHQsIGV2ZW50czogZXZlbnRzIH07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX1NjaGVkdWxlciA9IHJlcXVpcmUoJy4vU2NoZWR1bGVyJyk7XG5cbnZhciBfU2NoZWR1bGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1NjaGVkdWxlcik7XG5cbnZhciBfQ2xvY2tUaW1lciA9IHJlcXVpcmUoJy4vQ2xvY2tUaW1lcicpO1xuXG52YXIgX0Nsb2NrVGltZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2xvY2tUaW1lcik7XG5cbnZhciBfVGltZWxpbmUgPSByZXF1aXJlKCcuL1RpbWVsaW5lJyk7XG5cbnZhciBfVGltZWxpbmUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfVGltZWxpbmUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgZGVmYXVsdFNjaGVkdWxlciA9IG5ldyBfU2NoZWR1bGVyMi5kZWZhdWx0KG5ldyBfQ2xvY2tUaW1lcjIuZGVmYXVsdCgpLCBuZXcgX1RpbWVsaW5lMi5kZWZhdWx0KCkpOyAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5kZWZhdWx0ID0gZGVmYXVsdFNjaGVkdWxlcjsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBEZWZlcnJlZFNpbms7XG5cbnZhciBfdGFzayA9IHJlcXVpcmUoJy4uL3Rhc2snKTtcblxuZnVuY3Rpb24gRGVmZXJyZWRTaW5rKHNpbmspIHtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5ldmVudHMgPSBbXTtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xufSAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuRGVmZXJyZWRTaW5rLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICghdGhpcy5hY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodGhpcy5ldmVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgKDAsIF90YXNrLmRlZmVyKShuZXcgUHJvcGFnYXRlQWxsVGFzayh0aGlzLnNpbmssIHQsIHRoaXMuZXZlbnRzKSk7XG4gIH1cblxuICB0aGlzLmV2ZW50cy5wdXNoKHsgdGltZTogdCwgdmFsdWU6IHggfSk7XG59O1xuXG5EZWZlcnJlZFNpbmsucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIGlmICghdGhpcy5hY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLl9lbmQobmV3IEVuZFRhc2sodCwgeCwgdGhpcy5zaW5rKSk7XG59O1xuXG5EZWZlcnJlZFNpbmsucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKHQsIGUpIHtcbiAgdGhpcy5fZW5kKG5ldyBFcnJvclRhc2sodCwgZSwgdGhpcy5zaW5rKSk7XG59O1xuXG5EZWZlcnJlZFNpbmsucHJvdG90eXBlLl9lbmQgPSBmdW5jdGlvbiAodGFzaykge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAoMCwgX3Rhc2suZGVmZXIpKHRhc2spO1xufTtcblxuZnVuY3Rpb24gUHJvcGFnYXRlQWxsVGFzayhzaW5rLCB0aW1lLCBldmVudHMpIHtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5ldmVudHMgPSBldmVudHM7XG4gIHRoaXMudGltZSA9IHRpbWU7XG59XG5cblByb3BhZ2F0ZUFsbFRhc2sucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRoaXMkMSA9IHRoaXM7XG5cbiAgdmFyIGV2ZW50cyA9IHRoaXMuZXZlbnRzO1xuICB2YXIgc2luayA9IHRoaXMuc2luaztcbiAgdmFyIGV2ZW50O1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gZXZlbnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGV2ZW50ID0gZXZlbnRzW2ldO1xuICAgIHRoaXMkMS50aW1lID0gZXZlbnQudGltZTtcbiAgICBzaW5rLmV2ZW50KGV2ZW50LnRpbWUsIGV2ZW50LnZhbHVlKTtcbiAgfVxuXG4gIGV2ZW50cy5sZW5ndGggPSAwO1xufTtcblxuUHJvcGFnYXRlQWxsVGFzay5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICB0aGlzLnNpbmsuZXJyb3IodGhpcy50aW1lLCBlKTtcbn07XG5cbmZ1bmN0aW9uIEVuZFRhc2sodCwgeCwgc2luaykge1xuICB0aGlzLnRpbWUgPSB0O1xuICB0aGlzLnZhbHVlID0geDtcbiAgdGhpcy5zaW5rID0gc2luaztcbn1cblxuRW5kVGFzay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNpbmsuZW5kKHRoaXMudGltZSwgdGhpcy52YWx1ZSk7XG59O1xuXG5FbmRUYXNrLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gIHRoaXMuc2luay5lcnJvcih0aGlzLnRpbWUsIGUpO1xufTtcblxuZnVuY3Rpb24gRXJyb3JUYXNrKHQsIGUsIHNpbmspIHtcbiAgdGhpcy50aW1lID0gdDtcbiAgdGhpcy52YWx1ZSA9IGU7XG4gIHRoaXMuc2luayA9IHNpbms7XG59XG5cbkVycm9yVGFzay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNpbmsuZXJyb3IodGhpcy50aW1lLCB0aGlzLnZhbHVlKTtcbn07XG5cbkVycm9yVGFzay5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICB0aHJvdyBlO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBJbmRleFNpbms7XG5cbnZhciBfUGlwZSA9IHJlcXVpcmUoJy4vUGlwZScpO1xuXG52YXIgX1BpcGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUGlwZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIEluZGV4U2luayhpLCBzaW5rKSB7XG4gIHRoaXMuc2luayA9IHNpbms7XG4gIHRoaXMuaW5kZXggPSBpO1xuICB0aGlzLmFjdGl2ZSA9IHRydWU7XG4gIHRoaXMudmFsdWUgPSB2b2lkIDA7XG59IC8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5JbmRleFNpbmsucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgaWYgKCF0aGlzLmFjdGl2ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnZhbHVlID0geDtcbiAgdGhpcy5zaW5rLmV2ZW50KHQsIHRoaXMpO1xufTtcblxuSW5kZXhTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAoIXRoaXMuYWN0aXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gIHRoaXMuc2luay5lbmQodCwgeyBpbmRleDogdGhpcy5pbmRleCwgdmFsdWU6IHggfSk7XG59O1xuXG5JbmRleFNpbmsucHJvdG90eXBlLmVycm9yID0gX1BpcGUyLmRlZmF1bHQucHJvdG90eXBlLmVycm9yOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gUGlwZTtcbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4vKipcbiAqIEEgc2luayBtaXhpbiB0aGF0IHNpbXBseSBmb3J3YXJkcyBldmVudCwgZW5kLCBhbmQgZXJyb3IgdG9cbiAqIGFub3RoZXIgc2luay5cbiAqIEBwYXJhbSBzaW5rXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUGlwZShzaW5rKSB7XG4gIHRoaXMuc2luayA9IHNpbms7XG59XG5cblBpcGUucHJvdG90eXBlLmV2ZW50ID0gZnVuY3Rpb24gKHQsIHgpIHtcbiAgcmV0dXJuIHRoaXMuc2luay5ldmVudCh0LCB4KTtcbn07XG5cblBpcGUucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICh0LCB4KSB7XG4gIHJldHVybiB0aGlzLnNpbmsuZW5kKHQsIHgpO1xufTtcblxuUGlwZS5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAodCwgZSkge1xuICByZXR1cm4gdGhpcy5zaW5rLmVycm9yKHQsIGUpO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IFNhZmVTaW5rO1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIFNhZmVTaW5rKHNpbmspIHtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xufVxuXG5TYWZlU2luay5wcm90b3R5cGUuZXZlbnQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAoIXRoaXMuYWN0aXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuc2luay5ldmVudCh0LCB4KTtcbn07XG5cblNhZmVTaW5rLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAodCwgeCkge1xuICBpZiAoIXRoaXMuYWN0aXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuZGlzYWJsZSgpO1xuICB0aGlzLnNpbmsuZW5kKHQsIHgpO1xufTtcblxuU2FmZVNpbmsucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKHQsIGUpIHtcbiAgdGhpcy5kaXNhYmxlKCk7XG4gIHRoaXMuc2luay5lcnJvcih0LCBlKTtcbn07XG5cblNhZmVTaW5rLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICByZXR1cm4gdGhpcy5zaW5rO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSBFdmVudEVtaXR0ZXJTb3VyY2U7XG5cbnZhciBfRGVmZXJyZWRTaW5rID0gcmVxdWlyZSgnLi4vc2luay9EZWZlcnJlZFNpbmsnKTtcblxudmFyIF9EZWZlcnJlZFNpbmsyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfRGVmZXJyZWRTaW5rKTtcblxudmFyIF9kaXNwb3NlID0gcmVxdWlyZSgnLi4vZGlzcG9zYWJsZS9kaXNwb3NlJyk7XG5cbnZhciBkaXNwb3NlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2Rpc3Bvc2UpO1xuXG52YXIgX3RyeUV2ZW50ID0gcmVxdWlyZSgnLi90cnlFdmVudCcpO1xuXG52YXIgdHJ5RXZlbnQgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdHJ5RXZlbnQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyU291cmNlKGV2ZW50LCBzb3VyY2UpIHtcbiAgdGhpcy5ldmVudCA9IGV2ZW50O1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbkV2ZW50RW1pdHRlclNvdXJjZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICAvLyBOT1RFOiBCZWNhdXNlIEV2ZW50RW1pdHRlciBhbGxvd3MgZXZlbnRzIGluIHRoZSBzYW1lIGNhbGwgc3RhY2sgYXNcbiAgLy8gYSBsaXN0ZW5lciBpcyBhZGRlZCwgdXNlIGEgRGVmZXJyZWRTaW5rIHRvIGJ1ZmZlciBldmVudHNcbiAgLy8gdW50aWwgdGhlIHN0YWNrIGNsZWFycywgdGhlbiBwcm9wYWdhdGUuICBUaGlzIG1haW50YWlucyBtb3N0LmpzJ3NcbiAgLy8gaW52YXJpYW50IHRoYXQgbm8gZXZlbnQgd2lsbCBiZSBkZWxpdmVyZWQgaW4gdGhlIHNhbWUgY2FsbCBzdGFja1xuICAvLyBhcyBhbiBvYnNlcnZlciBiZWdpbnMgb2JzZXJ2aW5nLlxuICB2YXIgZHNpbmsgPSBuZXcgX0RlZmVycmVkU2luazIuZGVmYXVsdChzaW5rKTtcblxuICBmdW5jdGlvbiBhZGRFdmVudFZhcmlhZGljKGEpIHtcbiAgICB2YXIgYXJndW1lbnRzJDEgPSBhcmd1bWVudHM7XG5cbiAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKGwgPiAxKSB7XG4gICAgICB2YXIgYXJyID0gbmV3IEFycmF5KGwpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgYXJyW2ldID0gYXJndW1lbnRzJDFbaV07XG4gICAgICB9XG4gICAgICB0cnlFdmVudC50cnlFdmVudChzY2hlZHVsZXIubm93KCksIGFyciwgZHNpbmspO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cnlFdmVudC50cnlFdmVudChzY2hlZHVsZXIubm93KCksIGEsIGRzaW5rKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLnNvdXJjZS5hZGRMaXN0ZW5lcih0aGlzLmV2ZW50LCBhZGRFdmVudFZhcmlhZGljKTtcblxuICByZXR1cm4gZGlzcG9zZS5jcmVhdGUoZGlzcG9zZUV2ZW50RW1pdHRlciwgeyB0YXJnZXQ6IHRoaXMsIGFkZEV2ZW50OiBhZGRFdmVudFZhcmlhZGljIH0pO1xufTtcblxuZnVuY3Rpb24gZGlzcG9zZUV2ZW50RW1pdHRlcihpbmZvKSB7XG4gIHZhciB0YXJnZXQgPSBpbmZvLnRhcmdldDtcbiAgdGFyZ2V0LnNvdXJjZS5yZW1vdmVMaXN0ZW5lcih0YXJnZXQuZXZlbnQsIGluZm8uYWRkRXZlbnQpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IEV2ZW50VGFyZ2V0U291cmNlO1xuXG52YXIgX2Rpc3Bvc2UgPSByZXF1aXJlKCcuLi9kaXNwb3NhYmxlL2Rpc3Bvc2UnKTtcblxudmFyIGRpc3Bvc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZGlzcG9zZSk7XG5cbnZhciBfdHJ5RXZlbnQgPSByZXF1aXJlKCcuL3RyeUV2ZW50Jyk7XG5cbnZhciB0cnlFdmVudCA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF90cnlFdmVudCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gRXZlbnRUYXJnZXRTb3VyY2UoZXZlbnQsIHNvdXJjZSwgY2FwdHVyZSkge1xuICB0aGlzLmV2ZW50ID0gZXZlbnQ7XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xuICB0aGlzLmNhcHR1cmUgPSBjYXB0dXJlO1xufVxuXG5FdmVudFRhcmdldFNvdXJjZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICBmdW5jdGlvbiBhZGRFdmVudChlKSB7XG4gICAgdHJ5RXZlbnQudHJ5RXZlbnQoc2NoZWR1bGVyLm5vdygpLCBlLCBzaW5rKTtcbiAgfVxuXG4gIHRoaXMuc291cmNlLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudCwgYWRkRXZlbnQsIHRoaXMuY2FwdHVyZSk7XG5cbiAgcmV0dXJuIGRpc3Bvc2UuY3JlYXRlKGRpc3Bvc2VFdmVudFRhcmdldCwgeyB0YXJnZXQ6IHRoaXMsIGFkZEV2ZW50OiBhZGRFdmVudCB9KTtcbn07XG5cbmZ1bmN0aW9uIGRpc3Bvc2VFdmVudFRhcmdldChpbmZvKSB7XG4gIHZhciB0YXJnZXQgPSBpbmZvLnRhcmdldDtcbiAgdGFyZ2V0LnNvdXJjZS5yZW1vdmVFdmVudExpc3RlbmVyKHRhcmdldC5ldmVudCwgaW5mby5hZGRFdmVudCwgdGFyZ2V0LmNhcHR1cmUpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMub2YgPSBvZjtcbmV4cG9ydHMuZW1wdHkgPSBlbXB0eTtcbmV4cG9ydHMubmV2ZXIgPSBuZXZlcjtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9kaXNwb3NlID0gcmVxdWlyZSgnLi4vZGlzcG9zYWJsZS9kaXNwb3NlJyk7XG5cbnZhciBkaXNwb3NlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2Rpc3Bvc2UpO1xuXG52YXIgX1Byb3BhZ2F0ZVRhc2sgPSByZXF1aXJlKCcuLi9zY2hlZHVsZXIvUHJvcGFnYXRlVGFzaycpO1xuXG52YXIgX1Byb3BhZ2F0ZVRhc2syID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUHJvcGFnYXRlVGFzayk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKipcbiAqIFN0cmVhbSBjb250YWluaW5nIG9ubHkgeFxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7U3RyZWFtfVxuICovXG5mdW5jdGlvbiBvZih4KSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgSnVzdCh4KSk7XG59IC8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBKdXN0KHgpIHtcbiAgdGhpcy52YWx1ZSA9IHg7XG59XG5cbkp1c3QucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHNjaGVkdWxlci5hc2FwKG5ldyBfUHJvcGFnYXRlVGFzazIuZGVmYXVsdChydW5KdXN0LCB0aGlzLnZhbHVlLCBzaW5rKSk7XG59O1xuXG5mdW5jdGlvbiBydW5KdXN0KHQsIHgsIHNpbmspIHtcbiAgc2luay5ldmVudCh0LCB4KTtcbiAgc2luay5lbmQodCwgdm9pZCAwKTtcbn1cblxuLyoqXG4gKiBTdHJlYW0gY29udGFpbmluZyBubyBldmVudHMgYW5kIGVuZHMgaW1tZWRpYXRlbHlcbiAqIEByZXR1cm5zIHtTdHJlYW19XG4gKi9cbmZ1bmN0aW9uIGVtcHR5KCkge1xuICByZXR1cm4gRU1QVFk7XG59XG5cbmZ1bmN0aW9uIEVtcHR5U291cmNlKCkge31cblxuRW1wdHlTb3VyY2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdmFyIHRhc2sgPSBfUHJvcGFnYXRlVGFzazIuZGVmYXVsdC5lbmQodm9pZCAwLCBzaW5rKTtcbiAgc2NoZWR1bGVyLmFzYXAodGFzayk7XG5cbiAgcmV0dXJuIGRpc3Bvc2UuY3JlYXRlKGRpc3Bvc2VFbXB0eSwgdGFzayk7XG59O1xuXG5mdW5jdGlvbiBkaXNwb3NlRW1wdHkodGFzaykge1xuICByZXR1cm4gdGFzay5kaXNwb3NlKCk7XG59XG5cbnZhciBFTVBUWSA9IG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBFbXB0eVNvdXJjZSgpKTtcblxuLyoqXG4gKiBTdHJlYW0gY29udGFpbmluZyBubyBldmVudHMgYW5kIG5ldmVyIGVuZHNcbiAqIEByZXR1cm5zIHtTdHJlYW19XG4gKi9cbmZ1bmN0aW9uIG5ldmVyKCkge1xuICByZXR1cm4gTkVWRVI7XG59XG5cbmZ1bmN0aW9uIE5ldmVyU291cmNlKCkge31cblxuTmV2ZXJTb3VyY2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGRpc3Bvc2UuZW1wdHkoKTtcbn07XG5cbnZhciBORVZFUiA9IG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBOZXZlclNvdXJjZSgpKTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmZyb20gPSBmcm9tO1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4uL1N0cmVhbScpO1xuXG52YXIgX1N0cmVhbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TdHJlYW0pO1xuXG52YXIgX2Zyb21BcnJheSA9IHJlcXVpcmUoJy4vZnJvbUFycmF5Jyk7XG5cbnZhciBfaXRlcmFibGUgPSByZXF1aXJlKCcuLi9pdGVyYWJsZScpO1xuXG52YXIgX2Zyb21JdGVyYWJsZSA9IHJlcXVpcmUoJy4vZnJvbUl0ZXJhYmxlJyk7XG5cbnZhciBfZ2V0T2JzZXJ2YWJsZSA9IHJlcXVpcmUoJy4uL29ic2VydmFibGUvZ2V0T2JzZXJ2YWJsZScpO1xuXG52YXIgX2dldE9ic2VydmFibGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZ2V0T2JzZXJ2YWJsZSk7XG5cbnZhciBfZnJvbU9ic2VydmFibGUgPSByZXF1aXJlKCcuLi9vYnNlcnZhYmxlL2Zyb21PYnNlcnZhYmxlJyk7XG5cbnZhciBfcHJlbHVkZSA9IHJlcXVpcmUoJ0Btb3N0L3ByZWx1ZGUnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gZnJvbShhKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29tcGxleGl0eVxuICBpZiAoYSBpbnN0YW5jZW9mIF9TdHJlYW0yLmRlZmF1bHQpIHtcbiAgICByZXR1cm4gYTtcbiAgfVxuXG4gIHZhciBvYnNlcnZhYmxlID0gKDAsIF9nZXRPYnNlcnZhYmxlMi5kZWZhdWx0KShhKTtcbiAgaWYgKG9ic2VydmFibGUgIT0gbnVsbCkge1xuICAgIHJldHVybiAoMCwgX2Zyb21PYnNlcnZhYmxlLmZyb21PYnNlcnZhYmxlKShvYnNlcnZhYmxlKTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KGEpIHx8ICgwLCBfcHJlbHVkZS5pc0FycmF5TGlrZSkoYSkpIHtcbiAgICByZXR1cm4gKDAsIF9mcm9tQXJyYXkuZnJvbUFycmF5KShhKTtcbiAgfVxuXG4gIGlmICgoMCwgX2l0ZXJhYmxlLmlzSXRlcmFibGUpKGEpKSB7XG4gICAgcmV0dXJuICgwLCBfZnJvbUl0ZXJhYmxlLmZyb21JdGVyYWJsZSkoYSk7XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdmcm9tKHgpIG11c3QgYmUgb2JzZXJ2YWJsZSwgaXRlcmFibGUsIG9yIGFycmF5LWxpa2U6ICcgKyBhKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5mcm9tQXJyYXkgPSBmcm9tQXJyYXk7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfUHJvcGFnYXRlVGFzayA9IHJlcXVpcmUoJy4uL3NjaGVkdWxlci9Qcm9wYWdhdGVUYXNrJyk7XG5cbnZhciBfUHJvcGFnYXRlVGFzazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Qcm9wYWdhdGVUYXNrKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIGZyb21BcnJheShhKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgQXJyYXlTb3VyY2UoYSkpO1xufVxuXG5mdW5jdGlvbiBBcnJheVNvdXJjZShhKSB7XG4gIHRoaXMuYXJyYXkgPSBhO1xufVxuXG5BcnJheVNvdXJjZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICByZXR1cm4gc2NoZWR1bGVyLmFzYXAobmV3IF9Qcm9wYWdhdGVUYXNrMi5kZWZhdWx0KHJ1blByb2R1Y2VyLCB0aGlzLmFycmF5LCBzaW5rKSk7XG59O1xuXG5mdW5jdGlvbiBydW5Qcm9kdWNlcih0LCBhcnJheSwgc2luaykge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDsgaSA8IGwgJiYgdGhpcy5hY3RpdmU7ICsraSkge1xuICAgIHNpbmsuZXZlbnQodCwgYXJyYXlbaV0pO1xuICB9XG5cbiAgdGhpcy5hY3RpdmUgJiYgc2luay5lbmQodCk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5mcm9tRXZlbnQgPSBmcm9tRXZlbnQ7XG5cbnZhciBfU3RyZWFtID0gcmVxdWlyZSgnLi4vU3RyZWFtJyk7XG5cbnZhciBfU3RyZWFtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmVhbSk7XG5cbnZhciBfRXZlbnRUYXJnZXRTb3VyY2UgPSByZXF1aXJlKCcuL0V2ZW50VGFyZ2V0U291cmNlJyk7XG5cbnZhciBfRXZlbnRUYXJnZXRTb3VyY2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfRXZlbnRUYXJnZXRTb3VyY2UpO1xuXG52YXIgX0V2ZW50RW1pdHRlclNvdXJjZSA9IHJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyU291cmNlJyk7XG5cbnZhciBfRXZlbnRFbWl0dGVyU291cmNlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0V2ZW50RW1pdHRlclNvdXJjZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbi8qKlxuICogQ3JlYXRlIGEgc3RyZWFtIGZyb20gYW4gRXZlbnRUYXJnZXQsIHN1Y2ggYXMgYSBET00gTm9kZSwgb3IgRXZlbnRFbWl0dGVyLlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IGV2ZW50IHR5cGUgbmFtZSwgZS5nLiAnY2xpY2snXG4gKiBAcGFyYW0ge0V2ZW50VGFyZ2V0fEV2ZW50RW1pdHRlcn0gc291cmNlIEV2ZW50VGFyZ2V0IG9yIEV2ZW50RW1pdHRlclxuICogQHBhcmFtIHsqP30gY2FwdHVyZSBmb3IgRE9NIGV2ZW50cywgd2hldGhlciB0byB1c2VcbiAqICBjYXB0dXJpbmctLXBhc3NlZCBhcyAzcmQgcGFyYW1ldGVyIHRvIGFkZEV2ZW50TGlzdGVuZXIuXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gY29udGFpbmluZyBhbGwgZXZlbnRzIG9mIHRoZSBzcGVjaWZpZWQgdHlwZVxuICogZnJvbSB0aGUgc291cmNlLlxuICovXG5mdW5jdGlvbiBmcm9tRXZlbnQoZXZlbnQsIHNvdXJjZSwgY2FwdHVyZSkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbXBsZXhpdHlcbiAgdmFyIHM7XG5cbiAgaWYgKHR5cGVvZiBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygc291cmNlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgIGNhcHR1cmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBzID0gbmV3IF9FdmVudFRhcmdldFNvdXJjZTIuZGVmYXVsdChldmVudCwgc291cmNlLCBjYXB0dXJlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygc291cmNlLmFkZExpc3RlbmVyID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBzb3VyY2UucmVtb3ZlTGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICBzID0gbmV3IF9FdmVudEVtaXR0ZXJTb3VyY2UyLmRlZmF1bHQoZXZlbnQsIHNvdXJjZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzb3VyY2UgbXVzdCBzdXBwb3J0IGFkZEV2ZW50TGlzdGVuZXIvcmVtb3ZlRXZlbnRMaXN0ZW5lciBvciBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lcicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KHMpO1xufSAvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi8iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmZyb21JdGVyYWJsZSA9IGZyb21JdGVyYWJsZTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9pdGVyYWJsZSA9IHJlcXVpcmUoJy4uL2l0ZXJhYmxlJyk7XG5cbnZhciBfUHJvcGFnYXRlVGFzayA9IHJlcXVpcmUoJy4uL3NjaGVkdWxlci9Qcm9wYWdhdGVUYXNrJyk7XG5cbnZhciBfUHJvcGFnYXRlVGFzazIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Qcm9wYWdhdGVUYXNrKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gZnJvbUl0ZXJhYmxlKGl0ZXJhYmxlKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgSXRlcmFibGVTb3VyY2UoaXRlcmFibGUpKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIEl0ZXJhYmxlU291cmNlKGl0ZXJhYmxlKSB7XG4gIHRoaXMuaXRlcmFibGUgPSBpdGVyYWJsZTtcbn1cblxuSXRlcmFibGVTb3VyY2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIHNjaGVkdWxlci5hc2FwKG5ldyBfUHJvcGFnYXRlVGFzazIuZGVmYXVsdChydW5Qcm9kdWNlciwgKDAsIF9pdGVyYWJsZS5nZXRJdGVyYXRvcikodGhpcy5pdGVyYWJsZSksIHNpbmspKTtcbn07XG5cbmZ1bmN0aW9uIHJ1blByb2R1Y2VyKHQsIGl0ZXJhdG9yLCBzaW5rKSB7XG4gIHZhciByID0gaXRlcmF0b3IubmV4dCgpO1xuXG4gIHdoaWxlICghci5kb25lICYmIHRoaXMuYWN0aXZlKSB7XG4gICAgc2luay5ldmVudCh0LCByLnZhbHVlKTtcbiAgICByID0gaXRlcmF0b3IubmV4dCgpO1xuICB9XG5cbiAgc2luay5lbmQodCwgci52YWx1ZSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuXG52YXIgX1N0cmVhbSA9IHJlcXVpcmUoJy4uL1N0cmVhbScpO1xuXG52YXIgX1N0cmVhbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9TdHJlYW0pO1xuXG52YXIgX3ByZWx1ZGUgPSByZXF1aXJlKCdAbW9zdC9wcmVsdWRlJyk7XG5cbnZhciBiYXNlID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3ByZWx1ZGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBDb21wdXRlIGEgc3RyZWFtIHVzaW5nIGFuICphc3luYyogZ2VuZXJhdG9yLCB3aGljaCB5aWVsZHMgcHJvbWlzZXNcbiAqIHRvIGNvbnRyb2wgZXZlbnQgdGltZXMuXG4gKiBAcGFyYW0gZlxuICogQHJldHVybnMge1N0cmVhbX1cbiAqL1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIGdlbmVyYXRlKGYgLyosIC4uLmFyZ3MgKi8pIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBHZW5lcmF0ZVNvdXJjZShmLCBiYXNlLnRhaWwoYXJndW1lbnRzKSkpO1xufVxuXG5mdW5jdGlvbiBHZW5lcmF0ZVNvdXJjZShmLCBhcmdzKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuYXJncyA9IGFyZ3M7XG59XG5cbkdlbmVyYXRlU291cmNlLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBuZXcgR2VuZXJhdGUodGhpcy5mLmFwcGx5KHZvaWQgMCwgdGhpcy5hcmdzKSwgc2luaywgc2NoZWR1bGVyKTtcbn07XG5cbmZ1bmN0aW9uIEdlbmVyYXRlKGl0ZXJhdG9yLCBzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdGhpcy5pdGVyYXRvciA9IGl0ZXJhdG9yO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgZnVuY3Rpb24gZXJyKGUpIHtcbiAgICBzZWxmLnNpbmsuZXJyb3Ioc2VsZi5zY2hlZHVsZXIubm93KCksIGUpO1xuICB9XG5cbiAgUHJvbWlzZS5yZXNvbHZlKHRoaXMpLnRoZW4obmV4dCkuY2F0Y2goZXJyKTtcbn1cblxuZnVuY3Rpb24gbmV4dChnZW5lcmF0ZSwgeCkge1xuICByZXR1cm4gZ2VuZXJhdGUuYWN0aXZlID8gaGFuZGxlKGdlbmVyYXRlLCBnZW5lcmF0ZS5pdGVyYXRvci5uZXh0KHgpKSA6IHg7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZShnZW5lcmF0ZSwgcmVzdWx0KSB7XG4gIGlmIChyZXN1bHQuZG9uZSkge1xuICAgIHJldHVybiBnZW5lcmF0ZS5zaW5rLmVuZChnZW5lcmF0ZS5zY2hlZHVsZXIubm93KCksIHJlc3VsdC52YWx1ZSk7XG4gIH1cblxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdC52YWx1ZSkudGhlbihmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBlbWl0KGdlbmVyYXRlLCB4KTtcbiAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICByZXR1cm4gZXJyb3IoZ2VuZXJhdGUsIGUpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZW1pdChnZW5lcmF0ZSwgeCkge1xuICBnZW5lcmF0ZS5zaW5rLmV2ZW50KGdlbmVyYXRlLnNjaGVkdWxlci5ub3coKSwgeCk7XG4gIHJldHVybiBuZXh0KGdlbmVyYXRlLCB4KTtcbn1cblxuZnVuY3Rpb24gZXJyb3IoZ2VuZXJhdGUsIGUpIHtcbiAgcmV0dXJuIGhhbmRsZShnZW5lcmF0ZSwgZ2VuZXJhdGUuaXRlcmF0b3IudGhyb3coZSkpO1xufVxuXG5HZW5lcmF0ZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5pdGVyYXRlID0gaXRlcmF0ZTtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBDb21wdXRlIGEgc3RyZWFtIGJ5IGl0ZXJhdGl2ZWx5IGNhbGxpbmcgZiB0byBwcm9kdWNlIHZhbHVlc1xuICogRXZlbnQgdGltZXMgbWF5IGJlIGNvbnRyb2xsZWQgYnkgcmV0dXJuaW5nIGEgUHJvbWlzZSBmcm9tIGZcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqKToqfFByb21pc2U8Kj59IGZcbiAqIEBwYXJhbSB7Kn0geCBpbml0aWFsIHZhbHVlXG4gKiBAcmV0dXJucyB7U3RyZWFtfVxuICovXG5mdW5jdGlvbiBpdGVyYXRlKGYsIHgpIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBJdGVyYXRlU291cmNlKGYsIHgpKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIEl0ZXJhdGVTb3VyY2UoZiwgeCkge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnZhbHVlID0geDtcbn1cblxuSXRlcmF0ZVNvdXJjZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKHNpbmssIHNjaGVkdWxlcikge1xuICByZXR1cm4gbmV3IEl0ZXJhdGUodGhpcy5mLCB0aGlzLnZhbHVlLCBzaW5rLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gSXRlcmF0ZShmLCBpbml0aWFsLCBzaW5rLCBzY2hlZHVsZXIpIHtcbiAgdGhpcy5mID0gZjtcbiAgdGhpcy5zaW5rID0gc2luaztcbiAgdGhpcy5zY2hlZHVsZXIgPSBzY2hlZHVsZXI7XG4gIHRoaXMuYWN0aXZlID0gdHJ1ZTtcblxuICB2YXIgeCA9IGluaXRpYWw7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBmdW5jdGlvbiBlcnIoZSkge1xuICAgIHNlbGYuc2luay5lcnJvcihzZWxmLnNjaGVkdWxlci5ub3coKSwgZSk7XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydChpdGVyYXRlKSB7XG4gICAgcmV0dXJuIHN0ZXBJdGVyYXRlKGl0ZXJhdGUsIHgpO1xuICB9XG5cbiAgUHJvbWlzZS5yZXNvbHZlKHRoaXMpLnRoZW4oc3RhcnQpLmNhdGNoKGVycik7XG59XG5cbkl0ZXJhdGUucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuYWN0aXZlID0gZmFsc2U7XG59O1xuXG5mdW5jdGlvbiBzdGVwSXRlcmF0ZShpdGVyYXRlLCB4KSB7XG4gIGl0ZXJhdGUuc2luay5ldmVudChpdGVyYXRlLnNjaGVkdWxlci5ub3coKSwgeCk7XG5cbiAgaWYgKCFpdGVyYXRlLmFjdGl2ZSkge1xuICAgIHJldHVybiB4O1xuICB9XG5cbiAgdmFyIGYgPSBpdGVyYXRlLmY7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoZih4KSkudGhlbihmdW5jdGlvbiAoeSkge1xuICAgIHJldHVybiBjb250aW51ZUl0ZXJhdGUoaXRlcmF0ZSwgeSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb250aW51ZUl0ZXJhdGUoaXRlcmF0ZSwgeCkge1xuICByZXR1cm4gIWl0ZXJhdGUuYWN0aXZlID8gaXRlcmF0ZS52YWx1ZSA6IHN0ZXBJdGVyYXRlKGl0ZXJhdGUsIHgpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMucGVyaW9kaWMgPSBwZXJpb2RpYztcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxudmFyIF9Qcm9wYWdhdGVUYXNrID0gcmVxdWlyZSgnLi4vc2NoZWR1bGVyL1Byb3BhZ2F0ZVRhc2snKTtcblxudmFyIF9Qcm9wYWdhdGVUYXNrMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1Byb3BhZ2F0ZVRhc2spO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKipcbiAqIENyZWF0ZSBhIHN0cmVhbSB0aGF0IGVtaXRzIHRoZSBjdXJyZW50IHRpbWUgcGVyaW9kaWNhbGx5XG4gKiBAcGFyYW0ge051bWJlcn0gcGVyaW9kIHBlcmlvZGljaXR5IG9mIGV2ZW50cyBpbiBtaWxsaXNcbiAqIEBwYXJhbSB7Kn0gZGVwcmVjYXRlZFZhbHVlIEBkZXByZWNhdGVkIHZhbHVlIHRvIGVtaXQgZWFjaCBwZXJpb2RcbiAqIEByZXR1cm5zIHtTdHJlYW19IG5ldyBzdHJlYW0gdGhhdCBlbWl0cyB0aGUgY3VycmVudCB0aW1lIGV2ZXJ5IHBlcmlvZFxuICovXG4vKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTYgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZnVuY3Rpb24gcGVyaW9kaWMocGVyaW9kLCBkZXByZWNhdGVkVmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBfU3RyZWFtMi5kZWZhdWx0KG5ldyBQZXJpb2RpYyhwZXJpb2QsIGRlcHJlY2F0ZWRWYWx1ZSkpO1xufVxuXG5mdW5jdGlvbiBQZXJpb2RpYyhwZXJpb2QsIHZhbHVlKSB7XG4gIHRoaXMucGVyaW9kID0gcGVyaW9kO1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cblBlcmlvZGljLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoc2luaywgc2NoZWR1bGVyKSB7XG4gIHJldHVybiBzY2hlZHVsZXIucGVyaW9kaWModGhpcy5wZXJpb2QsIF9Qcm9wYWdhdGVUYXNrMi5kZWZhdWx0LmV2ZW50KHRoaXMudmFsdWUsIHNpbmspKTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnRyeUV2ZW50ID0gdHJ5RXZlbnQ7XG5leHBvcnRzLnRyeUVuZCA9IHRyeUVuZDtcbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiB0cnlFdmVudCh0LCB4LCBzaW5rKSB7XG4gIHRyeSB7XG4gICAgc2luay5ldmVudCh0LCB4KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHNpbmsuZXJyb3IodCwgZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5RW5kKHQsIHgsIHNpbmspIHtcbiAgdHJ5IHtcbiAgICBzaW5rLmVuZCh0LCB4KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHNpbmsuZXJyb3IodCwgZSk7XG4gIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnVuZm9sZCA9IHVuZm9sZDtcblxudmFyIF9TdHJlYW0gPSByZXF1aXJlKCcuLi9TdHJlYW0nKTtcblxudmFyIF9TdHJlYW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyZWFtKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLyoqXG4gKiBDb21wdXRlIGEgc3RyZWFtIGJ5IHVuZm9sZGluZyB0dXBsZXMgb2YgZnV0dXJlIHZhbHVlcyBmcm9tIGEgc2VlZCB2YWx1ZVxuICogRXZlbnQgdGltZXMgbWF5IGJlIGNvbnRyb2xsZWQgYnkgcmV0dXJuaW5nIGEgUHJvbWlzZSBmcm9tIGZcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc2VlZDoqKTp7dmFsdWU6Kiwgc2VlZDoqLCBkb25lOmJvb2xlYW59fFByb21pc2U8e3ZhbHVlOiosIHNlZWQ6KiwgZG9uZTpib29sZWFufT59IGYgdW5mb2xkaW5nIGZ1bmN0aW9uIGFjY2VwdHNcbiAqICBhIHNlZWQgYW5kIHJldHVybnMgYSBuZXcgdHVwbGUgd2l0aCBhIHZhbHVlLCBuZXcgc2VlZCwgYW5kIGJvb2xlYW4gZG9uZSBmbGFnLlxuICogIElmIHR1cGxlLmRvbmUgaXMgdHJ1ZSwgdGhlIHN0cmVhbSB3aWxsIGVuZC5cbiAqIEBwYXJhbSB7Kn0gc2VlZCBzZWVkIHZhbHVlXG4gKiBAcmV0dXJucyB7U3RyZWFtfSBzdHJlYW0gY29udGFpbmluZyBhbGwgdmFsdWUgb2YgYWxsIHR1cGxlcyBwcm9kdWNlZCBieSB0aGVcbiAqICB1bmZvbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHVuZm9sZChmLCBzZWVkKSB7XG4gIHJldHVybiBuZXcgX1N0cmVhbTIuZGVmYXVsdChuZXcgVW5mb2xkU291cmNlKGYsIHNlZWQpKTtcbn0gLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE2IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmZ1bmN0aW9uIFVuZm9sZFNvdXJjZShmLCBzZWVkKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMudmFsdWUgPSBzZWVkO1xufVxuXG5VbmZvbGRTb3VyY2UucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIChzaW5rLCBzY2hlZHVsZXIpIHtcbiAgcmV0dXJuIG5ldyBVbmZvbGQodGhpcy5mLCB0aGlzLnZhbHVlLCBzaW5rLCBzY2hlZHVsZXIpO1xufTtcblxuZnVuY3Rpb24gVW5mb2xkKGYsIHgsIHNpbmssIHNjaGVkdWxlcikge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLnNpbmsgPSBzaW5rO1xuICB0aGlzLnNjaGVkdWxlciA9IHNjaGVkdWxlcjtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgZnVuY3Rpb24gZXJyKGUpIHtcbiAgICBzZWxmLnNpbmsuZXJyb3Ioc2VsZi5zY2hlZHVsZXIubm93KCksIGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQodW5mb2xkKSB7XG4gICAgcmV0dXJuIHN0ZXBVbmZvbGQodW5mb2xkLCB4KTtcbiAgfVxuXG4gIFByb21pc2UucmVzb2x2ZSh0aGlzKS50aGVuKHN0YXJ0KS5jYXRjaChlcnIpO1xufVxuXG5VbmZvbGQucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuYWN0aXZlID0gZmFsc2U7XG59O1xuXG5mdW5jdGlvbiBzdGVwVW5mb2xkKHVuZm9sZCwgeCkge1xuICB2YXIgZiA9IHVuZm9sZC5mO1xuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGYoeCkpLnRoZW4oZnVuY3Rpb24gKHR1cGxlKSB7XG4gICAgcmV0dXJuIGNvbnRpbnVlVW5mb2xkKHVuZm9sZCwgdHVwbGUpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY29udGludWVVbmZvbGQodW5mb2xkLCB0dXBsZSkge1xuICBpZiAodHVwbGUuZG9uZSkge1xuICAgIHVuZm9sZC5zaW5rLmVuZCh1bmZvbGQuc2NoZWR1bGVyLm5vdygpLCB0dXBsZS52YWx1ZSk7XG4gICAgcmV0dXJuIHR1cGxlLnZhbHVlO1xuICB9XG5cbiAgdW5mb2xkLnNpbmsuZXZlbnQodW5mb2xkLnNjaGVkdWxlci5ub3coKSwgdHVwbGUudmFsdWUpO1xuXG4gIGlmICghdW5mb2xkLmFjdGl2ZSkge1xuICAgIHJldHVybiB0dXBsZS52YWx1ZTtcbiAgfVxuICByZXR1cm4gc3RlcFVuZm9sZCh1bmZvbGQsIHR1cGxlLnNlZWQpO1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZlciA9IGRlZmVyO1xuZXhwb3J0cy5ydW5UYXNrID0gcnVuVGFzaztcbi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNiBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5mdW5jdGlvbiBkZWZlcih0YXNrKSB7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUodGFzaykudGhlbihydW5UYXNrKTtcbn1cblxuZnVuY3Rpb24gcnVuVGFzayh0YXNrKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHRhc2sucnVuKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdGFzay5lcnJvcihlKTtcbiAgfVxufSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaW5kZXgnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9wb255ZmlsbCA9IHJlcXVpcmUoJy4vcG9ueWZpbGwnKTtcblxudmFyIF9wb255ZmlsbDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9wb255ZmlsbCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIHJvb3Q7IC8qIGdsb2JhbCB3aW5kb3cgKi9cblxuXG5pZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gIHJvb3QgPSBzZWxmO1xufSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICByb290ID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICByb290ID0gZ2xvYmFsO1xufSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICByb290ID0gbW9kdWxlO1xufSBlbHNlIHtcbiAgcm9vdCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG59XG5cbnZhciByZXN1bHQgPSAoMCwgX3BvbnlmaWxsMlsnZGVmYXVsdCddKShyb290KTtcbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IHJlc3VsdDsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzWydkZWZhdWx0J10gPSBzeW1ib2xPYnNlcnZhYmxlUG9ueWZpbGw7XG5mdW5jdGlvbiBzeW1ib2xPYnNlcnZhYmxlUG9ueWZpbGwocm9vdCkge1xuXHR2YXIgcmVzdWx0O1xuXHR2YXIgX1N5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG5cdGlmICh0eXBlb2YgX1N5bWJvbCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdGlmIChfU3ltYm9sLm9ic2VydmFibGUpIHtcblx0XHRcdHJlc3VsdCA9IF9TeW1ib2wub2JzZXJ2YWJsZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0gX1N5bWJvbCgnb2JzZXJ2YWJsZScpO1xuXHRcdFx0X1N5bWJvbC5vYnNlcnZhYmxlID0gcmVzdWx0O1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRyZXN1bHQgPSAnQEBvYnNlcnZhYmxlJztcblx0fVxuXG5cdHJldHVybiByZXN1bHQ7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5pZigncmVxdWVzdEFuaW1hdGlvbkZyYW1lJyBpbiB3aW5kb3cgJiYgJ0dhbWVwYWRFdmVudCcgaW4gd2luZG93KXtcbiAgICB3aW5kb3cucGFkc3RyZWFtID0gW11cbiAgICBjb25zdCBwcGFkID0gW11cbiAgICBmb3IobGV0IGk9MDsgaTw0OyBpKyspe1xuICAgICAgICB3aW5kb3cucGFkc3RyZWFtLnB1c2gobmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCk9PntcbiAgICAgICAgICAgIHBwYWQucHVzaCh7cmVzb2x2ZTpyZXNvbHZlLHJlamVjdDpyZWplY3R9KVxuICAgICAgICB9KSlcbiAgICB9XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRjb25uZWN0ZWRcIiwgKGUpPT57XG4gICAgICAgIGNvbnN0IHBhZCA9IHt9XG4gICAgICAgIHBhZC5pZHggPSBlLmdhbWVwYWQuaW5kZXhcblxuICAgICAgICBjb25zdCBtb3N0Y3JlYXRlID0gcmVxdWlyZSgnQG1vc3QvY3JlYXRlJylcbiAgICAgICAgY29uc3Qgc3RyZWFtdGFwID0ge31cbiAgICAgICAgc3RyZWFtdGFwLmFkZCA9IGZ1bmN0aW9uKCl7fVxuICAgICAgICBzdHJlYW10YXAuZW5kID0gZnVuY3Rpb24oKXt9XG4gICAgICAgIHN0cmVhbXRhcC5lcnIgPSBmdW5jdGlvbigpe31cbiAgICAgICAgcGFkLnRhcCA9IHN0cmVhbXRhcFxuXG4gICAgICAgIHBhZC5zdHJlYW0gPSBtb3N0Y3JlYXRlLmNyZWF0ZSgoYWRkLGVuZCxlcnIpPT57XG4gICAgICAgICAgICBzdHJlYW10YXAuYWRkID0gYWRkXG4gICAgICAgICAgICBzdHJlYW10YXAuZW5kID0gZW5kXG4gICAgICAgICAgICBzdHJlYW10YXAuZXJyID0gZXJyXG5cbiAgICAgICAgICAgIGNvbnN0IF9nbCA9IGdlbmxvb3AocGFkKVxuICAgICAgICAgICAgX2dsLm5leHQoKVxuICAgICAgICAgICAgY29uc3QgZ2wgPSBfZ2wubmV4dC5iaW5kKF9nbClcbiAgICAgICAgICAgIHBhZC5nbCA9IGdsXG5cbiAgICAgICAgICAgIHBhZC5hRkkgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocGFkLmdsKVxuICAgICAgICB9KVxuXG4gICAgICAgIHBwYWRbcGFkLmlkeF0ucmVzb2x2ZShwYWQpXG4gICAgICAgIGNvbnNvbGUuZGlyKGUuZ2FtZXBhZCk7XG5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkZGlzY29ubmVjdGVkXCIsIChlKT0+e1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHYW1lcGFkIGRpc2Nvbm5lY3RlZCBmcm9tIGluZGV4ICVkXCIsZS5nYW1lcGFkLmluZGV4KVxuICAgICAgICAgICAgd2luZG93LnBhZHN0cmVhbVtlLmdhbWVwYWQuaW5kZXhdLnRoZW4ocGFkPT57XG4gICAgICAgICAgICAgICAgcGFkLnRhcC5lbmQoKVxuICAgICAgICAgICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHBhZC5hRkkpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICoqICBjaHJvbWUgYnVnOlxuICAgICAgICAgICAgKiogICAgcmVmbGVzaCBwYWdlIC0+XG4gICAgICAgICAgICAqKiAgICAgIGdhbWVwYWRkaXNjb25uZWN0ZWQgZmlyZXMsXG4gICAgICAgICAgICAqKiAgICAgIGdhbWVwYWRjb25uZWN0ZWQgbm90IGZpcmVzXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgd2luZG93LnBhZHN0cmVhbVtlLmdhbWVwYWQuaW5kZXhdID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCk9PntcbiAgICAgICAgICAgICAgICBwcGFkW2UuZ2FtZXBhZC5pbmRleF0gPSB7cmVzb2x2ZTpyZXNvbHZlLHJlamVjdDpyZWplY3R9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0pXG59ZWxzZXtcbiAgICBjb25zb2xlLmVycm9yKFwiYnJvd3NlciBzZW0gc3Vwb3J0ZSBhcHJvcHJpYWRvXCIpXG59XG5cbmZ1bmN0aW9uKiBnZW5sb29wKHBhZCl7XG4gICAgbGV0IGxzdERyYXcgPSAwXG4gICAgbGV0IGR0XG4gICAgbGV0IHRcblxuICAgIGxldCBzbmFwcGFkO1xuXG4gICAgd2hpbGUodHJ1ZSl7XG4gICAgICAgIHQgPSB5aWVsZFxuICAgICAgICBzbmFwcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbcGFkLmlkeF1cbiAgICAgICAgLy8gd2luZG93czpcbiAgICAgICAgLy9sZXQge2F4ZXM6W2R4LGR5XX0gPSBzbmFwcGFkXG4gICAgICAgIC8vIGxpbnV4OlxuICAgICAgICBsZXQge2F4ZXM6W2R4LHVuZGVmaW5lZCxkeV19ID0gc25hcHBhZFxuXG4gICAgICAgIHBhZC50YXAuYWRkKGB7XCJ0aW1lc3RhbXBcIjoke3R9LFwidlwiOiR7ZHl9LFwiaFwiOiR7ZHh9fWApXG5cbiAgICAgICAgcGFkLmFGSSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShwYWQuZ2wpXG4gICAgfVxufVxuXG4vKlxucGFkc3RyZWFtWzBdLnRoZW4ocGFkPT57XG5cdHBhZC5zdHJlYW0ub2JzZXJ2ZShjb25zb2xlLmxvZylcbn0pXG4qL1xuIl19
