#!/usr/bin/env node
var SimpleSocket = require('simple-websocket')
var host = process.argv[2]
console.log('host: ' + host)
var socket = new SimpleSocket('ws://' + host + '/client')
console.log('socket: ' + socket)

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

var updater = null

var closed = false
function shutdown () {
  if (closed) return
  closed = true

  if (updater) updater.stop()
  socket.destroy()
}

function sendStatus () {
  if (socket) {
    socket.send(JSON.stringify({
      error: null
    }))
  }
}

process.on('SIGINT', function () {
  shutdown()
})

socket.on('connect', function () {
  console.log('connect()')
  updater = periodic(sendStatus, 3 * 1000)
})

socket.on('close', shutdown)
socket.on('error', shutdown)
