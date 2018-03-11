'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');


const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
    .use((req, res) => res.sendFile(INDEX))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({server});

// Array with some colors
const colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
// ... in random order
colors.sort(function(a,b) { return Math.random() > 0.5; } );

/**
 * Global variables
 */
// latest 100 messages
let history = [];
// list of currently connected clients (users)
let clients = [];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

wss.on('connection', (ws, req) => {
    const clientKey = req.headers['sec-websocket-key'];
    console.log('Client connected: ' + clientKey);
    var index = clients.push(ws) - 1;
    var userName = false;
    var userColor = false;

    if (history.length > 0) {
        ws.send(JSON.stringify( { type: 'history', data: history} ));
    }
    ws.on('close', () => console.log('Client disconnected: '  + clientKey ));
    ws.on('message', function incoming(message) {
        console.log("message: " + message);
        if (userName === false) { // first message sent by user is their name
            // remember user name
            userName = htmlEntities(message);
            // get random color and send it back to the user
            userColor = colors.shift();
            ws.send(JSON.stringify({ type:'color', data: userColor }));
            console.log((new Date()) + ' User is known as: ' + userName
                + ' with ' + userColor + ' color.');

        } else { // log and broadcast the message
            console.log((new Date()) + ' Received Message from '
                + userName + ': ' + message);

            // we want to keep history of all sent messages
            var obj = {
                time: (new Date()).getTime(),
                text: htmlEntities(message),
                author: userName,
                color: userColor
            };
            history.push(obj);
            history = history.slice(-100);

            // broadcast message to all connected clients
            var json = JSON.stringify({ type:'message', data: obj });
            for (var i=0; i < clients.length; i++) {
                clients[i].send(json);
            }
        }
    });
});


setInterval(() => {
    wss.clients.forEach((client) => {
        client.send(new Date().toTimeString());
    });
}, 10000);
