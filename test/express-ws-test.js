'use strict';

var http = require('http');
var assert = require('assert');
var express = require('express');
var expressWs = require('express-ws');
var WebSocket = require('ws');
var enableDestroy = require('server-destroy');

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

describe('express-ws', function() {

  var app, server, port;

  beforeEach(function(done) {
    server = http.createServer();
    enableDestroy(server);

    app = express();
    expressWs(app, server);

    var listener = server.listen(0, function() {
      port = listener.address().port;
      done();
    });
  });

  afterEach(function() {
    server.destroy();
  });

  function openSocket(path, done, cb) {
    assert(path, 'path is required');
    assert(done, 'done callback is required');
    assert(cb, 'cb is required');

    var socket = new WebSocket('ws://localhost:' + port + path);
    socket.on('open', function() {
      cb(socket);
    });
    socket.on('error', function(err) {
      done(err);
    });
    return socket;
  }

  describe('app.ws()', function() {
    it('should give you access to ws socket', function(done) {
      // client will send `ping`, server will send `pong` in response
      app.ws('/test', function(ws, req) {
        ws.on('message', function(msg) {
          expect(msg).to.equal('ping');
          ws.send('pong');
        });
      });

      openSocket('/test', done, function(socket) {
        socket.send('ping');
        socket.on('message', function(msg) {
          expect(msg).to.equal('pong');
          done();
        });
      });
    });

    it('should invoke callback if URL matches', function(done) {
      var callback = sinon.spy();
      app.ws('/test', callback);

      openSocket('/test', done, function(socket) {
        expect(callback).to.have.been.calledOnce;
        done();
      });
    });

    it('should not invoke callback if URL does not match', function(done) {
      var callback = sinon.spy();
      app.ws('/test', callback);

      var connectCallback = sinon.spy();
      var socket = new WebSocket('ws://localhost:' + port + '/invalid-path');

      setTimeout(function() {
        expect(callback).to.not.have.been.called;
        expect(connectCallback).to.not.have.been.called;
        socket.terminate();
        done();
      }, 50);
    });

    it.skip('should work with express router', function() {
      var callback = sinon.spy();
      var router = new express.Router();
      router.ws('/test', callback);
      app.use('/test-route', router);

      openSocket('/test-route/test', done, function(socket) {
        expect(callback).to.have.been.calledOnce;
      });

    });

  });

});
