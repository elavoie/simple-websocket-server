var http = require('http')
var ws = require('ws')
var os = require('os')
var debug = require('debug')
var randombytes = require('randombytes')
var express = require('express')
var path = require('path')

var log = debug('simple-websocket-server')
var app = express()
app.use(express.static(path.join(__dirname, '../public')))

function periodic (fn, delay) {
  var timeout = null

  function execute () {
    fn()
    timeout = setTimeout(execute, delay)
  }

  function stop () {
    clearTimeout(timeout)
  }

  return {
    start: execute,
    stop: stop
  }
}

function getIPAddresses () {
  var ifaces = os.networkInterfaces()
  var addresses = []

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0

    ifaces[ifname].forEach(function (iface) {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        addresses.push(iface.address)
      } else {
        // this interface has only one ipv4 adress
        addresses.push(iface.address)
      }
    })
  })
  return addresses
}

function Server (port) {
  port = port || process.env.PORT || 5000

  var self = this
  this.httpServer = http.createServer(app)
  this.httpServer.listen(port)
  getIPAddresses().forEach(function (addr) {
    console.log('Server listening on %s:%d', addr, port)
  })

  this.connectionNb = 0
  this.connections = {}
  this.statuses = {}
  this.monitor = null

  function addClient (ws) {
    ws.id = randombytes(4).hexSlice()
    log('addClient(' + ws.id + ')')
    self.connections[ws.id] = ws
    self.connectionNb++
    return ws.id
  }

  function removeClient (ws) {
    log('removeClient(' + ws.id + ')')
    if (self.connections.hasOwnProperty(ws.id)) {
      delete self.connections[ws.id]
      self.connectionNb++
    }
    if (self.statuses.hasOwnProperty(ws.id)) {
      delete self.statuses[ws.id]
    }
    return ws.id
  }

  function sendSummary () {
    console.log('sendSummary()')
    var summary = {
      connectionNb: self.connectionNb,
      errors: []
    }

    for (var id in self.statuses) {
      var s = self.statuses[id]

      if (s.error) {
        summary.errors.push(s.error)
        s.error = null
      }
    }

    if (self.monitor) {
      console.log('sending to monitor')
      self.monitor.send(JSON.stringify(summary))
    }
  }

  this.server = new ws.Server({server: this.httpServer})
    .on('connection/client', function (ws) {
      console.log('connection/client')
      var id = addClient(ws)
      ws.on('message', function (data) {
        var status = JSON.parse(data)
        self.statuses[id] = status
      })
      ws.on('error', function (err) {
        log('connection/client error:')
        log(err)
        removeClient(ws)
      })
      ws.on('close', function () {
        log('connection/client closed')
        removeClient(ws)
      })
    })
    .on('connection/monitor', function (ws) {
      console.log('connection/monitor')
      self.monitor = ws
      ws.on('close', function () {
        self.monitor = null
      })
      ws.on('error', function () {
        self.monitor = null
      })
    })

  periodic(sendSummary, 3 * 1000).start()
  return this
}

Server.create = function () {
  return new Server()
}

Server.create()
