var express = require('express')
  , http = require('http')
  , cakerush = require('./controllers/cakerush')
;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
//app.use(express.json());
//app.use(express.urlencoded());
//app.use(express.methodOverride());
//app.use(express.cookieParser('devsecret98jh3-98fgjw-a9ehc-98h3gf65x'));
//app.use(express.session());
//app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//attach socket.io
var io = require('socket.io', { serveClient: false, path: 'sockets'}).listen(server);

app.use(cakerush(io));

