var gamesdb = require('thegamesdb-api')

// All methods return a callback in this form:
var cb = function(err,result)
{
    if (!err)
    {
        console.log(JSON.stringify(result,undefined,2));
    }
}
// Available methods:
//gamesdb.GetGame({id:number}, cb);                  // Get JSON object describing game by thegamesdb id
gamesdb.GetGameList({name:"Halo"},cb)              // Get JSON object listing all games that match 'name'
// gamesdb.GetPlatform({id:number},cb);               // Get JSON object describing platform by id
// gamesdb.GetArt({id:number},cb);                    // Get JSON object describing available art (covers, screenshots, etc.) by id
// gamesdb.GetPlatformGames({platformId:number},cb);  // Get JSON object describing all games on platform by platform Id
// gamesdb.PlatformGames({platformId:number},cb);     // Same?
// gamesdb.Updates({time:number},cb);                 // Get JSON object describing updates to gamesdb since timestamp
// gamesdb.GetPlatformList(undefined,cb);            // Get the list of all platforms on gamesdb.
