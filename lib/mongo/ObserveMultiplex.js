// This code was started based on meteor/meteor github repository
// This code is MIT and licensed to Meteor.

import { Meteor } from "meteor/meteor";
import { _ } from "meteor/underscore";
import { LocalCollection } from "meteor/minimongo";
import OptimisticInvocation from "./OptimisticInvocation";

export function ObserveMultiplexer(options) {
  var self = this;

  if (!options || !_.has(options, "ordered"))
    throw Error("must specified ordered");

  Package["facts-base"] &&
    Package["facts-base"].Facts.incrementServerFact(
      "mongo-livedata",
      "observe-multiplexers",
      1
    );

  self._ordered = options.ordered;
  self._onStop = options.onStop || function () {};
  self._queue = new Meteor._AsynchronousQueue();
  self._handles = {};
  this._resolver = null;
  this._readyPromise = new Promise((r) => (this._resolver = r)).then(
    () => (this._isReady = true)
  );
  self._cache = new LocalCollection._CachingChangeObserver({
    ordered: options.ordered,
  });
  // Number of addHandleAndSendInitialAdds tasks scheduled but not yet
  // running. removeHandle uses this to know if it's time to call the onStop
  // callback.
  self._addHandleTasksScheduledButNotPerformed = 0;

  _.each(self.callbackNames(), function (callbackName) {
    self[callbackName] = async function (/* ... */) {
      await self._applyCallback(callbackName, _.toArray(arguments));
    };
  });
}

Object.assign(ObserveMultiplexer.prototype, {
  addHandleAndSendInitialAdds: async function (handle) {
    var self = this;

    ++self._addHandleTasksScheduledButNotPerformed;

    Package["facts-base"] &&
      Package["facts-base"].Facts.incrementServerFact(
        "mongo-livedata",
        "observe-handles",
        1
      );

    await self._queue.runTask(async function () {
      self._handles[handle._id] = handle;
      // Send out whatever adds we have so far (whether or not we the
      // multiplexer is ready).
      await self._sendAdds(handle);
      --self._addHandleTasksScheduledButNotPerformed;
    });

    // *outside* the task, since otherwise we'd deadlock
    await this._readyPromise;
  },

  // Remove an observe handle. If it was the last observe handle, call the
  // onStop callback; you cannot add any more observe handles after this.
  //
  // This is not synchronized with polls and handle additions: this means that
  // you can safely call it from within an observe callback, but it also means
  // that we have to be careful when we iterate over _handles.
  removeHandle: async function (id) {
    var self = this;

    // This should not be possible: you can only call removeHandle by having
    // access to the ObserveHandle, which isn't returned to user code until the
    // multiplex is ready.
    if (!self._ready())
      throw new Error("Can't remove handles until the multiplex is ready");

    delete self._handles[id];

    Package["facts-base"] &&
      Package["facts-base"].Facts.incrementServerFact(
        "mongo-livedata",
        "observe-handles",
        -1
      );

    if (
      _.isEmpty(self._handles) &&
      self._addHandleTasksScheduledButNotPerformed === 0
    ) {
      await self._stop();
    }
  },
  _stop: async function (options) {
    var self = this;
    options = options || {};

    // It shouldn't be possible for us to stop when all our handles still
    // haven't been returned from observeChanges!
    if (!self._ready() && !options.fromQueryError)
      throw Error("surprising _stop: not ready");

    // Call stop callback (which kills the underlying process which sends us
    // callbacks and removes us from the connection's dictionary).
    await self._onStop();
    Package["facts-base"] &&
      Package["facts-base"].Facts.incrementServerFact(
        "mongo-livedata",
        "observe-multiplexers",
        -1
      );

    // Cause future addHandleAndSendInitialAdds calls to throw (but the onStop
    // callback should make our connection forget about us).
    self._handles = null;
  },

  // Allows all addHandleAndSendInitialAdds calls to return, once all preceding
  // adds have been processed. Does not block.
  ready: function () {
    var self = this;
    self._queue.queueTask(function () {
      if (self._ready())
        throw Error("can't make ObserveMultiplex ready twice!");

      if (!self._resolver) {
        throw new Error("Missing resolver");
      }

      self._resolver();
    });
  },

  // If trying to execute the query results in an error, call this. This is
  // intended for permanent errors, not transient network errors that could be
  // fixed. It should only be called before ready(), because if you called ready
  // that meant that you managed to run the query once. It will stop this
  // ObserveMultiplex and cause addHandleAndSendInitialAdds calls (and thus
  // observeChanges calls) to throw the error.
  queryError: async function (err) {
    var self = this;
    await self._queue.runTask(async function () {
      if (self._ready())
        throw Error("can't claim query has an error after it worked!");

      await self._stop({ fromQueryError: true });
      throw err;
    });
  },

  // Calls "cb" once the effects of all "ready", "addHandleAndSendInitialAdds"
  // and observe callbacks which came before this call have been propagated to
  // all handles. "ready" must have already been called on this multiplexer.
  onFlush: function (cb) {
    var self = this;
    self._queue.queueTask(async function () {
      if (!self._ready())
        throw Error("only call onFlush on a multiplexer that will be ready");
      await cb();
    });
  },
  callbackNames: function () {
    var self = this;
    if (self._ordered)
      return ["addedBefore", "changed", "movedBefore", "removed"];
    else return ["added", "changed", "removed"];
  },
  _ready: function () {
    return !!this._isReady;
  },
  _applyCallback: async function (callbackName, args) {
    var self = this;

    const isOptimistic = !!OptimisticInvocation.get();
    // TODO Add a debug message here
    const runType = isOptimistic ? "runTask" : "queueTask";
    await self._queue[runType](async function () {
      // If we stopped in the meantime, do nothing.
      if (!self._handles) return;

      // First, apply the change to the cache.
      // XXX We could make applyChange callbacks promise not to hang on to any
      // state from their arguments (assuming that their supplied callbacks
      // don't) and skip this clone. Currently 'changed' hangs on to state
      // though.
      await self._cache.applyChange[callbackName].apply(
        null,
        EJSON.clone(args)
      );

      // If we haven't finished the initial adds, then we should only be getting
      // adds.
      if (
        !self._ready() &&
        callbackName !== "added" &&
        callbackName !== "addedBefore"
      ) {
        throw new Error("Got " + callbackName + " during initial adds");
      }

      // Now multiplex the callbacks out to all observe handles. It's OK if
      // these calls yield; since we're inside a task, no other use of our queue
      // can continue until these are done. (But we do have to be careful to not
      // use a handle that got removed, because removeHandle does not use the
      // queue; thus, we iterate over an array of keys that we control.)
      for (const handleId of Object.keys(self._handles)) {
        var handle = self._handles && self._handles[handleId];
        if (!handle) return;
        var callback = handle["_" + callbackName];
        // clone arguments so that callbacks can mutate their arguments

        // We silence out removed exceptions
        if (callback === "removed") {
          try {
            await callback.apply(null, EJSON.clone(args));
          } catch (e) {
            // Supressing `removed non-existent exceptions`
            if (!isRemovedNonExistent(e)) {
              throw e;
            }
          }
        } else {
          callback && (await callback.apply(null, EJSON.clone(args)));
        }
      }
    });
  },

  // Sends initial adds to a handle. It should only be called from within a task
  // (the task that is processing the addHandleAndSendInitialAdds call). It
  // synchronously invokes the handle's added or addedBefore; there's no need to
  // flush the queue afterwards to ensure that the callbacks get out.
  _sendAdds: async function (handle) {
    var self = this;
    if (!self._queue._runningOrRunScheduled)
      throw Error("_sendAdds may only be called from within a task!");

    var add = self._ordered ? handle._addedBefore : handle._added;
    if (!add) return;
    // note: docs may be an _IdMap or an OrderedDict
    await self._cache.docs.forEachAsync(async function (doc, id) {
      if (!_.has(self._handles, handle._id))
        throw Error("handle got removed before sending initial adds!");
      var fields = EJSON.clone(doc);
      delete fields._id;
      if (self._ordered) await add(id, fields, null);
      // we're going in order, so add at end
      else await add(id, fields);
    });
  },
});

var nextObserveHandleId = 1;
export function ObserveHandle(multiplexer, callbacks) {
  var self = this;
  // The end user is only supposed to call stop().  The other fields are
  // accessible to the multiplexer, though.
  self._multiplexer = multiplexer;
  _.each(multiplexer.callbackNames(), function (name) {
    if (callbacks[name]) {
      self["_" + name] = callbacks[name];
    } else if (name === "addedBefore" && callbacks.added) {
      // Special case: if you specify "added" and "movedBefore", you get an
      // ordered observe where for some reason you don't get ordering data on
      // the adds.  I dunno, we wrote tests for it, there must have been a
      // reason.
      self._addedBefore = async function (id, fields, before) {
        await callbacks.added(id, fields);
      };
    }
  });
  self._stopped = false;
  self._id = nextObserveHandleId++;
}

ObserveHandle.prototype.stop = async function () {
  var self = this;
  if (self._stopped) return;
  self._stopped = true;
  await self._multiplexer.removeHandle(self._id);
};
