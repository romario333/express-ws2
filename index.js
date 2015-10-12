'use strict';

var assert = require('assert');
var WebSocketServer = require('ws').Server;
var ServerResponse = require('http').ServerResponse;

module.exports = function(opts) {
  assert(opts.server, '`server` is required');
  assert(opts.app, '`app` is required');

  var wss = new WebSocketServer({server: opts.server});
  wss.on('connection', function(ws) {
    ws.upgradeReq._ws = ws;
    // express app is just a request listener, let's pass it upgrade request (which is just HTTP GET with `Upgrade` header)
    var res = new ServerResponse(ws.upgradeReq);
    res.writeHead = function (statusCode) {
      if (statusCode > 200) ws.close();
    };
    opts.app(ws.upgradeReq, res)
  });

  // web socket upgrade is HTTP GET, delegate to `app.get` or `router.get`
  function delegateToGet() {
    var args = Array.prototype.slice.call(arguments);
    args = args.map(function(arg) {
      if (typeof arg === 'function') {
        return function(req, res) {
          arg(req._ws, req);
        };
      }
      return arg;
    });

    this.get.apply(this, args);
  }

  opts.app.ws = delegateToGet;
  if (opts.router) {
    opts.router.__proto__.ws = delegateToGet;
  }
};
