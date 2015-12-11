var mongodb = require('mongodb');
var http = require('http');
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;
var parseString = require('xml2js').parseString;
// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://localhost:27017/my_database_name';
var request;

function xmlToJson(url, callback) {
  var req = http.get(url, function(res) {
    var xml = '';
    
    res.on('data', function(chunk) {
      xml += chunk;
    });

    res.on('error', function(e) {
      callback(e, null);
    }); 

    res.on('timeout', function(e) {
      callback(e, null);
    }); 

    res.on('end', function() {
      parseString(xml, function(err, result) {
        callback(null, result);
      });
    });
  });
}

// Use connect method to connect to the Server
MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', url);
    /*var request = require("request");
    request("http://thegamesdb.net/api/GetGame.php?id=8629", function(error, response, body) {
    console.log(body);
    });*/
    url = "http://thegamesdb.net/api/GetGame.php?name=Grand Theft Auto V";
    jj = xmlToJson(url, function(err, data) {
        if (err) {
            // Handle this however you like
             return console.err(err);
             }
             var gameData = JSON.stringify(data, null, 2);
             var json = JSON.parse(gameData);
             var json2 = JSON.stringify(json);
             var json3 = JSON.parse(json2);
             var json4 = JSON.stringify(json3); 
             //console.log(json3);
             data = json3;
             var newId = json3.Data.Game[0].id;
             var newGameTitle = json3.Data.Game[0].GameTitle;
             var newImageUrl1 = json3.Data.baseImgUrl;
             var newImageUrl2 = json3.Data.Game[0].Images[0].boxart[0]['$'].thumb;
             var newImageUrl = newImageUrl1 + newImageUrl2;
             console.log(newId[0]);
             var id = newId[0].toString();
             var GameTitle = newGameTitle[0].toString();
             //console.log(JSON.stringify(newId));
             //console.log(json3.Data.Game[0].id);



              var collection = db.collection('games');
              //console.log(collection);

            //Create some users
            var newGame =  { "thumb":{ "url":newImageUrl},"id":id, "name":GameTitle } ;
            //console.log(newGame);
            /*var user1 = {name: 'modulus admin', age: 42, roles: ['admin', 'moderator', 'user']};
            var user2 = {name: 'modulus user', age: 22, roles: ['user']};
            var user3 = {name: 'modulus super admin', age: 92, roles: ['super-admin', 'admin', 'moderator', 'user']};*/


            // Insert some users
            collection.insert(newGame, function (err, result) 
            {
              if (err)
               {
                console.log("ERROR!!!:" + err);
              } else
               {
                //console.log('Inserted game into the "games" collection. The game inserted is:', newGame);
                //db.close();
              }
          });


            var jsonfile = require('jsonfile')
            var util = require('util')
            var fs = require('fs');
            var file = './data/games.json';
            var obj = JSON.parse(fs.readFileSync(file,'utf8'));
            console.log('before read');
            console.log(obj);
            console.log('after read');
            obj.push(newGame);
            
            jsonfile.writeFile(file, obj, function (err) {
                console.error(err)
            })

            /*var fs = require('fs');
            function appendObject(obj){
            var configFile = fs.readFileSync('./data/games.json');
            console.log(configFile);
            var config = JSON.parse(configFile);
            config.push(newGame);
            //console.log(config);
            var configJSON = JSON.stringify(config);
            fs.writeFileSync('./data/games.json', configJSON);
            }*/




             /*for(var iter = 0; iter < json3.Data.Game.length; iter++) 
             {
             	console.log(json3.Data.Game[iter].Platform);
                if(json3.Data.Game[iter].Platform == 'PC' )
                {
                    console.log("Hurray");
                    console.log(json3.Data.Game[iter].PlatformId);
                }
             }*/
             //return json3.Data.Game[0].id;
             //console.log(gameData);
        });
    //console.log(jj);
    db.close();
    // do some work here with the database.

    //Close connection
    
  }
});
   