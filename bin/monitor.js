#!/usr/bin/env node
var SimpleSocket = require('simple-websocket')
var host = process.argv[2]
console.log('host: ' + host)
var socket = new SimpleSocket('ws://' + host + '/monitor')
console.log('socket: ' + socket)

var closed = false
function shutdown () {
  if (closed) return
  closed = true
  socket.destroy()
}

process.on('SIGINT', function () {
  shutdown()
})

socket.on('connect', function () {
  console.log('connected to ' + host)
})

socket.on('close', shutdown)
socket.on('error', shutdown)
socket.on('data', function (data) {
  console.log(JSON.parse(data))
})
