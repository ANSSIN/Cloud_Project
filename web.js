var Bourne, Engine, _, app, async, e, express, games, port;
var http = require('http');
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var parseString = require('xml2js').parseString;
// Connection URL. This is where your mongodb server is running.
var AWS = require('aws-sdk');
AWS.config.apiVersions = {
  sqs: '2012-11-05',
  // other service API versions
};
AWS.config.update({accessKeyId: '', secretAccessKey: ''});
var sns = new AWS.SNS({region:'us-east-1'});
_ = require('underscore');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/test';
var globalUser = "";
var globalUserEmail = "";
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
var host = process.env.PORT ? '0.0.0.0' : '127.0.0.1';
var port = process.env.PORT || 8080;

var cors_proxy = require('cors-anywhere');
cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function() {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
});
Engine = require('./lib/engine');
e = new Engine;
app = express();
app.set('views', __dirname + "/views");
app.use(express.static(__dirname + '/views'));
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
  globalUserEmail = user.emails[0].value;
  var alreadyExists = false;
  var newTopicName = user.emails[0].value;
  var topicName = newTopicName.replace("@", "-");
  topicName = topicName.replace(".","-");

  console.log(topicName);
  MongoClient.connect(url, function(err, db) {
    db.collection('Users').updateOne({
      "userId" : user.id},
      {"userId" : user.id,
      "userName" : user.displayName,
      "userFirstName" : user.name.givenName,
      "userEmail" : user.emails[0].value,
      },
      { upsert : true } , function(err, result) {
      if(err) throw err;
      console.log("Updated");
    });
    var params = {
      /* required */
    };
    sns.listTopics(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
          console.log("Topics " + data.Topics[0].TopicArn);
          for(i = 0 ; i < data.Topics.length ; i++)
          {
            console.log(data.Topics[i].TopicArn.split(":")[5]);
            if(data.Topics[i].TopicArn.split(":")[5] == topicName) {
              alreadyExists = true;
            }
          }
          if(!alreadyExists){
            params = {
              Name: topicName /* required */
            };
            sns.createTopic(params, function(err, data) {
              if (err) console.log(err); // an error occurred
              else
              {
                console.log("Topic created " + data.TopicArn);
                var subscribeparams = {
                  Protocol: 'email', /* required */
                  TopicArn: data.TopicArn, /* required */
                  Endpoint: globalUserEmail
                };
                sns.subscribe(subscribeparams, function(err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
                  else     console.log("Sent subscribe request " + data.SubscriptionArn );           // successful response
                });
              }          // successful response
            });

          }
        }            // successful response
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
        //Code for content based filtering goes here. Merge it with collaborative filtering.

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
    var suggestionGameUrl = "http://www.giantbomb.com/api/search/?query=" + req.body.name+ "&resources=game&api_key=&field_list=name,api_detail_url&limit=5"
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
    console.log("Before sugestions");
    yy = xmlToJson(suggestionGameUrl, function(err, data) {
      if (err) {
        // Handle this however you like
        return console.err(err);
      }
      console.log(suggestionGameUrl);
      console.log("Inside giantbomb");
      console.log(data);
      var gameData = JSON.stringify(data, null, 2);
      console.log(gameData);

      var json = JSON.parse(gameData);
      var json2 = JSON.stringify(json);
      var json3 = JSON.parse(json2);
      var newId = json3.response.results[0].game[0].name[0];
      console.log(newId);
      var getSuggestedGamesUrl = json3.response.results[0].game[0].api_detail_url[0] + "?api_key=&field_list=similar_games&limit=5";
      zz = xmlToJson(getSuggestedGamesUrl, function(err, data) {
        if (err) {
          // Handle this however you like
          return console.err(err);
        }
        console.log(getSuggestedGamesUrl);
        console.log("Inside inception of Giantbomb");
        var gameData = JSON.stringify(data, null, 2);
        console.log(gameData);
        var json = JSON.parse(gameData);
        var json2 = JSON.stringify(json);
        var json3 = JSON.parse(json2);
        if(json3.response.results[0].similar_games[0])
        {
        var newId = json3.response.results[0].similar_games[0].game[0].name[0];
        console.log(newId);
        console.log(globalUserEmail);
        db.collection('Users').updateOne({
          "userEmail" : globalUserEmail},
          {
            $push : { "recommendedGames" : newId }
          },
          function(err, result) {
          if(err) throw err;
          console.log("Updated recommended Games");
          });
        }

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
