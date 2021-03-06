// Copyright 2012 Mark Cavage <mcavage@gmail.com> All rights reserved.

var test = require('tap').test;
var uuid = require('node-uuid');

var Logger = require('bunyan');
var restify = require('../lib');



///--- Globals

var LOG = new Logger({
  level: (process.env.LOG_LEVEL || 'info'),
  name: process.argv[1],
  stream: process.stderr,
  src: true,
  serializers: Logger.stdSerializers
});
var PORT = process.env.UNIT_TEST_PORT || 12345;
var client;
var server;



///--- Helpers

function sendJson(req, res, next) {
  res.send({
    hello: req.params.hello || req.params.name || null
  });
  return next();
}


function sendText(req, res, next) {
  res.send('hello ' + (req.params.hello || req.params.name || ''));

  return next();
}



///--- Tests

test('setup', function (t) {
  server = restify.createServer({
    log: LOG
  });
  t.ok(server);

  server.on('clientError', function (err) {

  });

  server.use(restify.acceptParser(['json', 'text/plain']));
  server.use(restify.dateParser());
  server.use(restify.authorizationParser());
  server.use(restify.queryParser());
  server.use(restify.bodyParser());

  server.get('/json/:name', sendJson);
  server.head('/json/:name', sendJson);
  server.put('/json/:name', sendJson);
  server.post('/json/:name', sendJson);

  server.del('/str/:name', sendText);
  server.get('/str/:name', sendText);
  server.head('/str/:name', sendText);
  server.put('/str/:name', sendText);
  server.post('/str/:name', sendText);

  server.listen(PORT, '127.0.0.1', function () {
    t.end();
  });
});


test('create json client', function (t) {
  client = restify.createClient({
    url: 'http://127.0.0.1:' + PORT,
    type: 'json',
    log: LOG,
    retry: false
  });
  t.ok(client);
  t.ok(client instanceof restify.JsonClient);
  t.end();
});


test('GET json', function (t) {
  client.get('/json/mcavage', function (err, req, res, obj) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equivalent(obj, {hello: 'mcavage'});
    t.end();
  });
});


test('GH-115 GET path with spaces', function (t) {
  client.get('/json/foo bar', function (err, req, res, obj) {
    t.ok(err);
    console.log(err);
    t.end();
  });
});


test('Check error (404)', function (t) {
  client.get('/' + uuid(), function (err, req, res, obj) {
    t.ok(err);
    t.ok(err.message);
    t.equal(err.statusCode, 404);
    t.ok(req);
    t.ok(res);
    t.ok(obj);
    t.equal(obj.code, 'ResourceNotFound');
    t.ok(obj.message);
    t.end();
  });
});


test('HEAD json', function (t) {
  client.head('/json/mcavage', function (err, req, res) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.end();
  });
});


test('POST json', function (t) {
  client.post('/json/mcavage', { hello: 'foo' }, function (err, req, res, obj) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equivalent(obj, {hello: 'foo'});
    t.end();
  });
});


test('PUT json', function (t) {
  client.post('/json/mcavage', { hello: 'foo' }, function (err, req, res, obj) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equivalent(obj, {hello: 'foo'});
    t.end();
  });
});


test('create string client', function (t) {
  client = restify.createClient({
    url: 'http://127.0.0.1:' + PORT,
    type: 'string'
  });
  t.ok(client);
  t.ok(client instanceof restify.StringClient);
  t.end();
});


test('GET text', function (t) {
  client.get('/str/mcavage', function (err, req, res, data) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equal(res.body, data);
    t.equal(data, 'hello mcavage');
    t.end();
  });
});


test('HEAD text', function (t) {
  client.head('/str/mcavage', function (err, req, res) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.end();
  });
});


test('Check error (404)', function (t) {
  client.get('/' + uuid(), function (err, req, res, message) {
    t.ok(err);
    t.ok(err.message);
    t.equal(err.statusCode, 404);
    t.ok(req);
    t.ok(res);
    t.ok(message);
    t.end();
  });
});


test('POST text', function (t) {
  client.post('/str/mcavage', 'hello=foo', function (err, req, res, data) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equal(res.body, data);
    t.equal(data, 'hello foo');
    t.end();
  });
});


test('POST text (object)', function (t) {
  client.post('/str/mcavage', {hello: 'foo'}, function (err, req, res, data) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equal(res.body, data);
    t.equal(data, 'hello foo');
    t.end();
  });
});


test('PUT text', function (t) {
  client.put('/str/mcavage', 'hello=foo', function (err, req, res, data) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.equal(res.body, data);
    t.equal(data, 'hello foo');
    t.end();
  });
});


test('DELETE text', function (t) {
  client.del('/str/mcavage', function (err, req, res) {
    t.ifError(err);
    t.ok(req);
    t.ok(res);
    t.end();
  });
});


test('create raw client', function (t) {
  client = restify.createClient({
    url: 'http://127.0.0.1:' + PORT,
    type: 'http',
    accept: 'text/plain'
  });
  t.ok(client);
  t.ok(client instanceof restify.HttpClient);
  t.end();
});


test('GET raw', function (t) {
  client.get('/str/mcavage', function (connectErr, req) {
    t.ifError(connectErr);
    t.ok(req);

    req.on('result', function (err, res) {
      t.ifError(err);
      res.body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        res.body += chunk;
      });

      res.on('end', function () {
        t.equal(res.body, 'hello mcavage');
        t.end();
      });
    });
  });
});


test('POST raw', function (t) {
  var opts = {
    path: '/str/mcavage',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  };
  client.post(opts, function (connectErr, req) {
    t.ifError(connectErr);

    req.write('hello=snoopy');
    req.end();

    req.on('result', function (err, res) {
      t.ifError(err);
      res.body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        res.body += chunk;
      });

      res.on('end', function () {
        t.equal(res.body, 'hello snoopy');
        t.end();
      });
    });
  });
});


test('GH-20 connectTimeout', function (t) {
  client = restify.createClient({
    url: 'http://169.254.1.10',
    type: 'http',
    accept: 'text/plain',
    connectTimeout: 100,
    retry: false
  });

  client.get('/foo', function (err, req) {
    t.ok(err);
    t.notOk(req);
    t.end();
  });
});


test('teardown', function (t) {
  server.close(function () {
    t.end();
  });
});
