var Bourne, Engine, _, app, async, e, express, games, port;
var http = require('http');
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var parseString = require('xml2js').parseString;
// Connection URL. This is where your mongodb server is running.

_ = require('underscore');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/test';
var globalUser = "";
var Reloader = require('reload-json'),
reload = new Reloader();

var fs = require('fs');
games = require('./data/games.json');
var bodyParser = require('body-parser');
async = require('async');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var FACEBOOK_APP_ID = '';
var FACEBOOK_APP_SECRET = '';
Bourne = require('bourne');
express = require('express');

Engine = require('./lib/engine');
e = new Engine;
app = express();
app.set('views', __dirname + "/views");

app.set('view engine', 'jade');

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


passport.use(new FacebookStrategy({
  clientID: '',
  clientSecret: '',
  callbackURL: 'http://localhost:3000/auth/facebook/callback',
  profileFields: ['id', 'name', 'displayName' , 'emails'],
  auth_type: "reauthenticate"

}, function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
    //Assuming user exists
    done(null, profile);
  });
}));
passport.serializeUser(function(user, done) {
  globalUser = user.name.givenName;
  MongoClient.connect(url, function(err, db) {
    db.collection('Users').updateOne({
      "userId" : user.id},
      {"userId" : user.id,
      "userName" : user.displayName,
      "userFirstName" : user.name.givenName,
      "userEmail" : user.emails[0].value
      },
      { upsert : true } , function(err, result) {
      if(err) throw err;
      console.log("Updated");
    });
  });
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


app.route('/refresh').post(function(arg, res, next) {
  var query;
  query = arg.query;
  return async.series([
    (function(_this) {
      return function(done) {
        return e.similars.update(query.user, done);
      };
    })(this), (function(_this) {
      return function(done) {
        return e.suggestions.update(query.user, done);
      };
    })(this)
  ], (function(_this) {
    return function(err) {
      if (err != null) {
        return next(err);
      }
      //return res.redirect("/?user=" + query.user);
      return res.redirect("/home");
    };
  })(this));
});

app.route('/like').post(function(arg, res, next) {
  var query;
  query = arg.query;
  if (query.unset === 'yes') {
    return e.likes.remove(query.user, query.game, (function(_this) {
      return function(err) {
        if (err != null) {
          return next(err);
        }
        //return res.redirect("/?user=" + query.user);
        return res.redirect("/home");
      };
    })(this));
  } else {
    return e.dislikes.remove(query.user, query.game, (function(_this) {
      return function(err) {
        if (err != null) {
          return next(err);
        }
        return e.likes.add(query.user, query.game, function(err) {
          if (err != null) {
            return next(err);
          }
          //return res.redirect("/?user=" + query.user);
          return res.redirect("/home");
        });
      };
    })(this));
  }
});

app.route('/dislike').post(function(arg, res, next) {
  var query;
  query = arg.query;
  if (query.unset === 'yes') {
    return e.dislikes.remove(query.user, query.game, (function(_this) {
      return function(err) {
        if (err != null) {
          return next(err);
        }
        //return res.redirect("/?user=" + query.user);
        return res.redirect("/home");
      };
    })(this));
  } else {
    return e.likes.remove(query.user, query.game, (function(_this) {
      return function(err) {
        if (err != null) {
          return next(err);
        }
        return e.dislikes.add(query.user, query.game, function(err) {
          if (err != null) {
            return next(err);
          }
          //return res.redirect("/?user=" + query.user);
          return res.redirect("/home");
        });
      };
    })(this));
  }
});

app.get('/', function(req, res, next) {
  res.sendfile('./AuthApp/index.html');
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email', authType: 'reauthenticate'}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/home',
  failureRedirect: '/error'
}));

app.get('/success', function(req, res, next) {
  res.send('Successfully logged in.');
});

app.get('/error', function(req, res, next) {
  res.send("Error logging in.");
});

app.route('/home').get(function(arg, res, next) {
  var user = globalUser;
  //  games = require('./data/games.json');

  reload.load('./data/games.json', function (err, data) {
    // do stuffconsole.log(games);
    games = data;
    console.log("Query " + user);
    return async.auto({
      likes: (function(_this) {
        return function(done) {
          return e.likes.itemsByUser(user, done);
        };
      })(this),
      dislikes: (function(_this) {
        return function(done) {
          return e.dislikes.itemsByUser(user, done);
        };
      })(this),
      suggestions: (function(_this) {
        return function(done) {
          return e.suggestions.forUser(user, function(err, suggestions) {
            if (err != null) {
              return done(err);
            }
            return done(null, _.map(_.sortBy(suggestions, function(suggestion) {
              return -suggestion.weight;
            }), function(suggestion) {
              return _.findWhere(games, {
                id: suggestion.item
              });
            }));
          });
        };
      })(this)
    }, (function(_this) {
      return function(err, arg1) {
        var dislikes, likes, suggestions;
        likes = arg1.likes, dislikes = arg1.dislikes, suggestions = arg1.suggestions;
        if (err != null) {
          return next(err);
        }
        return res.render('index', {
          games: games,
          user: user,
          likes: likes,
          dislikes: dislikes,
          suggestions: suggestions.slice(0, 4)
        });
      };
    })(this));
  });
});
app.get('/logout', function(req, res) {
  req.logout();
  console.log(req.session);
  console.log("Logged out");
  console.log(req.user);
  globalUser = "";
  res.redirect('/');
});

app.get('/postad', function(req, res) {
  res.sendfile('./views/newad.html');
});

app.post('/api/insertAds',function(req,res) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    }
    else {
    console.log('Connection established to', url);
    var gameurl = "http://thegamesdb.net/api/GetGame.php?name=" + req.body.name;
    console.log(gameurl);
    jj = xmlToJson(gameurl, function(err, data) {
      if (err) {
        // Handle this however you like
        return console.err(err);
      }
      var gameData = JSON.stringify(data, null, 2);
      var json = JSON.parse(gameData);
      var json2 = JSON.stringify(json);
      var json3 = JSON.parse(json2);
      var json4 = JSON.stringify(json3);
      var newId = json3.Data.Game[0].id;
      var newGameTitle = json3.Data.Game[0].GameTitle;
      var newImageUrl1 = json3.Data.baseImgUrl;
      var newImageUrl2 = json3.Data.Game[0].Images[0].boxart[0]['$'].thumb;
      var newImageUrl = newImageUrl1 + newImageUrl2;
      var description = json3.Data.Game[0].Overview;
      var genres = json3.Data.Game[0].Genres;
      var rating = json3.Data.Game[0].Rating;
      var id = newId[0].toString();
      var GameTitle = newGameTitle[0].toString();
      var newGame =  { "thumb": { "url":newImageUrl },"id":id, "name":GameTitle , "description" : description  , "count" : 1 , "genre" : genres[0].genre[0], "rating" : rating } ;
      var jsonfile = require('jsonfile')
      var util = require('util')
      var file = './data/games.json';
      var obj = JSON.parse(fs.readFileSync(file,'utf8'));
      var count = 0;
      var exists = false;
      for (var i = 0; i < obj.length; i++){
        // look for the entry with a matching `code` value
        if (obj[i].id == newId){
          console.log("Matched");
          console.log(obj[i].count);
          obj[i].count += 1 ;
          console.log(obj[i].count);
          count = obj[i].count;
          exists = true;
        }
      }
      if(!exists)
      {
      obj.push(newGame);
      }
      db.collection('ads').insertOne( { "thumb": { "url":newImageUrl }, "game_name" : req.body.name, "game_owner" : globalUser, "game_platform" : req.body.platform, "game_price" : req.body.price, "game_location" : req.body.location }, function(err, result) {
            if(err) throw err;
            console.log("Updated");
      });
      db.collection('games').updateOne(
        {"id" : id },
        {
          "thumb": { "url":newImageUrl },"id":id, "name":GameTitle , "description" : description  , "count" : count , "genre" : genres[0].genre[0], "rating" : rating
        },
        { upsert : true } , function(err, result) {
        if(err) throw err;
        console.log("Updated");
      });
      jsonfile.writeFile(file, obj, function (err) {
        console.error(err);
        res.redirect('/home');
      });

    });

    }
  });
});

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


app.listen((port = 3000), function(err) {
  if (err != null) {
    throw err;
  }
  return console.log("Listening on " + port);
});

// ---
// generated by coffee-script 1.9.2
