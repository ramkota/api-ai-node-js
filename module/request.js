/*!
 * apiai
 * Copyright(c) 2015 http://api.ai/
 * Apache 2.0 Licensed
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var https = require('https');
var http = require('http');
var Tls = require('tls');

exports.Request = module.exports.Request = Request;

util.inherits(Request, EventEmitter);

function Request (application, options) {
    var self = this;

    self.agent = new HttpsProxyAgent({
            proxyHost: options.proxyHost,
            proxyPort: options.proxyPort
        });

    self.clientAccessToken = application.clientAccessToken;

    self.hostname = application.hostname;

    self.endpoint = options.endpoint;
    self.requestSource = application.requestSource;

    var _http = application.secure ? https : http;

    var requestOptions = self._requestOptions();

    var request = _http.request(requestOptions, function(response) {
        var body = '';

        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            if (response.statusCode >= 200 && response.statusCode <= 299) {
                try {
                    self.emit('response', JSON.parse(body));
                } catch (error) {
                    self.emit('error', error);
                }
            } else {
                var error = 'Server response error with status code: ' + response.statusCode + '\n' + body;
                self.emit('error', error);
            }
        });
    });

    request.on('error', function(error) {
        self.emit('error', error);
    });

    self.request = request;
}

Request.prototype._headers = function() {
    var self = this;

    return {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + self.clientAccessToken,
        'api-request-source': self.requestSource
    };
};

Request.prototype._requestOptions = function() {
    var self = this;

    return {
        hostname: self.hostname,
        headers: self._headers(),
        agent: self.agent
    };
};

Request.prototype.write = function(chunk) {
    this.request.write(chunk);
};

Request.prototype.end = function() {
    this.request.end();
};




function HttpsProxyAgent(options) {
    https.Agent.call(this, options);
 
    this.proxyHost = options.proxyHost;
    this.proxyPort = options.proxyPort;
 
    this.createConnection = function (opts, callback) {
        // do a CONNECT request
        var req = http.request({
            host: options.proxyHost,
            port: options.proxyPort,
            method: 'CONNECT',
            path: opts.host + ':' + opts.port,
            headers: {
                host: opts.host
            }
        });
 
        req.on('connect', function (res, socket, head) {
            var cts = Tls.connect({
                host: opts.host,
                socket: socket
            }, function () {
                callback(false, cts);
            });
        });
 
        req.on('error', function (err) {
            callback(err, null);
        });
 
        req.end();
    }
}
 
util.inherits(HttpsProxyAgent, https.Agent);
 
// Almost verbatim copy of http.Agent.addRequest
HttpsProxyAgent.prototype.addRequest = function (req, options) {
    var name = options.host + ':' + options.port;
    if (options.path) name += ':' + options.path;
 
    if (!this.sockets[name]) this.sockets[name] = [];
 
    if (this.sockets[name].length < this.maxSockets) {
        // if we are under maxSockets create a new one.
        this.createSocket(name, options.host, options.port, options.path, req, function (socket) {
            req.onSocket(socket);
        });
    } else {
        // we are over limit so we'll add it to the queue.
        if (!this.requests[name])
            this.requests[name] = [];
        this.requests[name].push(req);
    }
};
 
// Almost verbatim copy of http.Agent.createSocket
HttpsProxyAgent.prototype.createSocket = function (name, host, port, localAddress, req, callback) {
    var self = this;
    var options = util._extend({}, self.options);
    options.port = port;
    options.host = host;
    options.localAddress = localAddress;
 
    options.servername = host;
    if (req) {
        var hostHeader = req.getHeader('host');
        if (hostHeader)
            options.servername = hostHeader.replace(/:.*$/, '');
    }
 
    self.createConnection(options, function (err, s) {
        if (err) {
            err.message += ' while connecting to HTTP(S) proxy server ' + self.proxyHost + ':' + self.proxyPort;
 
            if (req)
                req.emit('error', err);
            else
                throw err;
 
            return;
        }
 
        if (!self.sockets[name]) self.sockets[name] = [];
 
        self.sockets[name].push(s);
 
        var onFree = function () {
            self.emit('free', s, host, port, localAddress);
        };
 
        var onClose = function (err) {
            // this is the only place where sockets get removed from the Agent.
            // if you want to remove a socket from the pool, just close it.
            // all socket errors end in a close event anyway.
            self.removeSocket(s, name, host, port, localAddress);
        };
 
        var onRemove = function () {
            // we need this function for cases like HTTP 'upgrade'
            // (defined by WebSockets) where we need to remove a socket from the pool
            // because it'll be locked up indefinitely
            self.removeSocket(s, name, host, port, localAddress);
            s.removeListener('close', onClose);
            s.removeListener('free', onFree);
            s.removeListener('agentRemove', onRemove);
        };
 
        s.on('free', onFree);
        s.on('close', onClose);
        s.on('agentRemove', onRemove);
 
        callback(s);
    });
};