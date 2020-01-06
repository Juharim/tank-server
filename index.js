var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var uuidv4 = require('uuid/v4');

var rooms = [];
const maxUsersNumber = 6;

io.on('connection', function(socket) {
    console.log('connected');

    // 1. 상대방과 랜덤 매칭 기능
    // 2. 방 참여 기능 구현
    // 3. 방 나가기 기능 구현
    // 4. 방 참여 후 준비 기능 구현
    // 5. 방 참여 후 준비취소 기능 구현
    // 6. 6명이 동시에 참옇라수 있느 방 구현
    // 7. 탱크의 이동정보를 받아서 모든 클라이언트에게 전달하는 기능 구현

    // 방 생성 / 0
    var createRoom = function() {
        var roomId = uuidv4();
        socket.join(roomId, function() {
            var room = { roomId: roomId, users: [{userId: socket.id, ready: false}]};
            rooms.push(room);
            socket.emit('res_createroom', 
            { roomId: rooId, 
                maxUsersNumber: maxUsersNumber });
        });
    }

    // 상대방과 랜덤 매칭 기능(랜덤 방 찾기) / 1, 6
    var getAvailableRandomRoomId = function() {
        if (rooms.length > 0) {
            while (true) {
                var roomOK = false;
                for (var i = 0; i < rooms.length; i++) {
                    if (rooms[i].user.length < maxUsersNumber) {
                        roomOK = true;
                        break;
                    }
                }
                if (!roomOK) return -1;

                var randomRoom = Math.floor(Math.random() * rooms.length);
                for (var i = 0; i < rooms.length; i++) {
                    if (rooms[i].user.length < maxUsersNumber) {
                        if (randomRoom == i) return randomRoom;
                    }
                }
            }
        }
        return -1;
    }

    // 방 참여 기능 / 2
    socket.on('req_joinroom', function(data) {
        var randomRoomIndex = getAvailableRandomRoomId();
        if (randomRoomIndex > -1) {
            socket.join(rooms[randomRoomIndex].roomId, function() {
                var usersNumber = rooms[randomRoomIndex].users.length + 1;
                var otherUserIds = [];

                for (var i = 0; i < rooms[randomRoomIndex].users.length; i++) {
                    otherUserIds.push(rooms[randomRoomIndex].users[i].userId);
                }

                var user = { userId: socket.id, ready: false };
                rooms[randomRoomIndex].users.push(user);

                socket.emit('res_joinroom', 
                { roomId: rooms[randomRoomIndex].roomId, 
                    otherUserIds: otherUserIds, 
                    usersNumber: clientsNumber});

                socket.to(rooms[randomRoomIndex].roomId).emit('res_otherjoinroom', 
                { roomId: rooms[randomRoomIndex].roomId, 
                    otherUserIds: socket.id, 
                    usersNumber: usersNumber});
            });
        } else {
            createRoom();
        }
    });

    // 방 나가기 기능 / 3
    socket.on('req_unjoinroom', function(data) {
        if (!data) return;
        socket.leave(data.roomId, function(result) {
            var room = rooms.find(room => room.roomId === data.roomId);
            if (room) {
                var users = room.users;
                for (var i = 0; i < users.length; i++) {
                    if (users[i].userId === data.userId) {
                        users.splice(i, 1);
                        socket.emit('res_unjoinroom', { roomId: room.roomId });

                        if (users.length == 0) {
                            var roomIndex = rooms.indexOf(room);
                            rooms.splice(roomIndex, 1);
                        } else {
                            socket.to(room.roomId).removeListener('res_otherrunjoinroom', { otherUserId: socket.id});
                        }
                    }
                }
            }
        });
    });

    // 방 참여 후 준비 기능 / 4
    socket.on('req_ready', function(data) {
        if (!data) return;

        var room = rooms.find(room => room.roomId === data.roomId);

        if (room) {
            var users = room.users;
            var user = users.find(user => user.userId === data.userId);
            if (user) {
                user.ready = true;
                socket.emit('res_ready');
                socket.to(room.roomId).emit('res_otherready', { otherUserId: socket.id });
            }

            if (users.length == maxUsersNumber) {
                var userReadyNumber = 0;
                for (var i = 0; i < users.length; i++) {
                    if (users[i].ready == true) {
                        userReadyNumber++;
                    }
                }
                if (users.length == userReadyNumber) {
                    io.in(room.roomId).emit('res_play');
                }
            }
        }
    });

    // 방 참여 후 준비취소 기능 / 5
    socket.on('req_unready', function(data) {
        if (!data) return;

        var room = rooms.find(room => room.roomId === data.roomId);

        if (room) {
            var users = room.users;
            var user = users.find(user => user.userId === data.userId);
            if (user) {
                user.ready = false;
                socket.emit('res_unready');
                socket.to(room.roomId).emit('res_otherunready', { otherUserId: socket.id });
            }
        }
    });

    // 탱크 이동 정보 전달 / 7
    socket.on('req_movetank', function(data) {
        if (!data) return;

        var roomId = data.roomId;
        var userId = data.userId;
        var position = data.position;

        if (roomId) {
            socket.to(roomId).emit('res_othermovetank', 
            { userId: userId, 
                position: position });
        }
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
