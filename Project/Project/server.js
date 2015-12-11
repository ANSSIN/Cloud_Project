var express    = require('express');        // call express
var app        = express();         // define our app using express
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
var http = require('http');
var server = http.createServer(app);
var port = process.env.PORT || 8080;        // set our port
var database = require('./app/config/database');
var db = mongoose.connect(database.url);	

server.listen(port);
console.log('Magic happens on port ' + port);



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
 
require('./app/routes/routes.js')(app);
