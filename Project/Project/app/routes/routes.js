var ads = require('./../models/ads');


module.exports = function (app) {

    app.post('/api/insertAds',function(req,res) {
        console.log(req.body);
    ads.create(req.body,function(err,data){
        console.log("reached inside");
        if (err){
            res.send(err);
            }
        res.json(data);
    });
        //res.send(200);
    });
    
        //For all others serve the html page
    app.get('/',function(req,res,next){    
        res.sendFile("index.html",{ root: path.join(__dirname, '/../../public') });
    });
}
    