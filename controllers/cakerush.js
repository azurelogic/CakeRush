module.exports = function (io) {

// module dependencies
  var express = require('express')
      , uuid = require('node-uuid')
      , _ = require('lodash')

  var app = express();

  var rooms = [];
  var generateRoom = function () {
    var room = {};
    room.id = uuid.v4();
    room.playerIds = [];
    return room;
  };

// packs the room list and statistics onto the data message
  function addRoomsToData(data) {
    // filter down to only rooms that can accept a new player
    var availableRooms = _.filter(rooms, function (room) {
      return room.playerIds.length < 4;
    });

    // if no rooms are available, create a new room
    if (availableRooms.length == 0) {
      var newRoom = generateRoom();
      rooms.push(newRoom);
      availableRooms.push(newRoom);
    }

    // convert available rooms to just room id and player count
    // and attach to data message
    data.rooms = _.map(availableRooms, function (room, index) {
      return {
        roomId: room.id,
        roomIndex: index + 1,
        playerCount: room.playerIds.length
      };
    });

    // attach total number of rooms to data message
    data.totalRooms = rooms.length;

    // map-reduce to get total number of players in game
    // and attach to message
    var roomCounts = _.map(rooms, function (room) {
      return room.playerIds.length;
    });
    data.playersInRooms = _.reduce(roomCounts, function (sum, count) {
      return sum + count;
    });
  }

// does the heavy lifting for leaving a room
  function leaveRoom(roomToLeave, socket) {
    // check for null/undefined
    if (roomToLeave) {

      // remove the player from the room data
      roomToLeave.playerIds = _.filter(roomToLeave.playerIds, function (id) {
        return id != socket.id;
      });

      // if the room is now empty, remove it from the room list
      if (roomToLeave.playerIds.length == 0) {
        rooms = _.filter(rooms, function (room) {
          return room.id != roomToLeave.id;
        });
      }
      // otherwise, notify other players in the room of the disconnection
      else {
        var data = {};
        data.playerId = socket.id;
        socket.broadcast.to(roomToLeave.id).emit('playerDisconnected', data);
      }

      // remove the player from the socket.io room
      socket.leave(roomToLeave.id);
    }
  }

// ----- socket.io -----
  io.of('/sockets/cakerush').on('connection', function (socket) {
// sends player their id and a list of rooms
    socket.on('playerConnect', function () {
      var data = {};
      data.playerId = socket.id;

      // add room info to message
      addRoomsToData(data);

      // send message to user
      socket.emit('connectionReply', data);
    });

// sends player an update room list
    socket.on('getRooms', function () {
      var data = {};

      // add room info to message
      addRoomsToData(data);

      // send message to user
      socket.emit('updatedRoomList', data);
    });

    // handle player disconnection:
    socket.on('disconnect', function () {
      // find the room being left
      var roomToLeave = _.find(rooms, function (room) {
        return _.any(room.playerIds, function (id) {
          // capture socket id in closure scope
          return id == socket.id;
        });
      });
      // handle the rest of the disconnection
      leaveRoom(roomToLeave, socket);
    });

// attempts to allow a player to join a game:
// if successful, the player id is added to the room and notified;
// if failed, the player is sent a refusal;
    socket.on('joinRoom', function (data) {
      // find the room being requested
      var room = _.find(rooms, {id: data.roomId});

      // verify that player can join room:
      // room must exist and have less than 4 players
      if (!room || room.playerIds.length >= 4) {
        // send refusal
        socket.emit('connectionRefused');
        return;
      }
      var shouldGenerateFirstCake;
      if (room.playerIds.length === 0){
        shouldGenerateFirstCake = true
      }

      // register player with room
      room.playerIds.push(socket.id);
      socket.join(room.id);

      // send verification that room was joined to the player with room id
      socket.emit('roomJoined', {roomId: room.id, shouldGenerateFirstCake: shouldGenerateFirstCake});
    });

// handle a user leaving a room not by disconnection
    socket.on('leaveRoom', function (data) {
      // find the room being left
      var roomToLeave = _.find(rooms, {id: data.roomId});

      // handle the rest of the disconnection
      leaveRoom(roomToLeave, socket);
    });

// handles rebroadcast of gameplay messages to other players in the room
    socket.on('clientSend', function (data) {
      socket.broadcast.to(data.roomId).emit('clientReceive', data);
    });

// handles rebroadcast of gameplay messages to other players in the room
    socket.on('localPlayerDied', function (data) {
      socket.broadcast.to(data.roomId).emit('remotePlayerDied', data);
    });
  });

  return app;
};