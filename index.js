var fs = require("fs");
var http = require("http");
var https = require("https");
var async = require("async");
	
function main(config, callback){
	var tasks = [];
	
	config.forEach(function(mon){
		if(mon.service == "http" || mon.service == "https"){
			tasks.push(function(callback){
				monitorHttp(mon, function(result, data){	
					if(result === false){
						if(data.responseCode !== undefined) var info = "Response code: " + data.responseCode;
						if(data.timeout !== undefined) var info = "Server doesn't response within " + data.timeout + " seconds";
						if(data.checkKeyword !== undefined) var info = "Page body doesn't contain specified keyword: " + data.checkKeyword;
						
						return callback(null, {"status": "error", "host": data.host, "info": info});
					}
					
					callback(null, {"status": "success", "host": data.host});
				});
			});
		}
	});
	
	var data = {"errors": {}, "cleared": {}};
	var errors = {};
	
	// load errors from file
	loadFromFile("./data.json", function(err, result){
		if(err) return callback(err);
		
		if(result){
			data = result;
			data.cleared = {};
		}
		
		// execute monitoring tasks
		executeMonitor(tasks, function(err, data){
			if(err) return callback(err);
			
			// save actual results
			saveToFile("./data.json", data, function(err){
				if(err){
					return callback(err);
				}
				
				callback(null, data);
			});
		});
	});
	
	function executeMonitor(tasks, callback){
		async.parallel(tasks, function(err, results){
			if(err) return callback(err);
			
			// check for actual results
			for(k in results){
				var r = results[k];
		
				if(r.status == "error"){
					var message = "Host " + r.host + " is down! " + r.info;
		
					errors[r.host] = {"message": message, "count": 1, "outageAt": new Date().getTime()};
					
					if(data.errors[r.host] == undefined){
						data.errors[r.host] = errors[r.host];
					}
					else{
						// error exists yet
						// so update count
						data.errors[r.host].count++;
						data.errors[r.host].lastUpdatedAt = new Date().getTime();
					}
				}
			}
		
			// check for previous results
			for(host in data.errors){
				if(errors[host] === undefined){
					// not exists, so move to cleared
					data.cleared[host] = data.errors[host];
					data.cleared[host].clearedAt = new Date().getTime();
					delete data.errors[host];
				}
			}
			
			callback(null, data);
		});
	}
}

function monitorHttp(mon, callback){
	var options = {
		hostname: mon.host,
		port: 80,
		path: mon.path,
		method: 'GET',	
	};
	
	var timeout = false;

    var httpRequestCallback = function(res){
        if(res.statusCode != 200){
            return callback(false, {"responseCode": res.statusCode, "host": mon.host});
        }

        if(mon.checkKeyword === undefined)
        {
            return callback(true, {"host": mon.host});
        }

        var body = "";

        res.on("data", function(data){
            body += data;
        });

        res.on("end", function(){
            if(body.indexOf(mon.checkKeyword) == -1){
                return callback(false, {"checkKeyword": mon.checkKeyword, "host": mon.host});
            }

            callback(true, {"host": mon.host});
        });
    }

	if(mon.service == "http")
    {
        var req = http.request(options, httpRequestCallback);
    }
    else if(mon.service == "https")
    {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        options.port = 443;
        var req = https.request(options, httpRequestCallback);
    }
	
	req.on("error", function(err){
		if(timeout){
			return callback(false, {"timeout": mon.timeout, "host": mon.host});
		}
		
		return callback(false, {"host": mon.host, "error": err});
	});
	
	req.setTimeout(mon.timeout * 1000, function(){
		timeout = true;
		req.abort();
	});
	
	req.end();
}

function saveToFile(file, data, callback){
	var json = JSON.stringify(data);

	fs.writeFile(file, json, function(err){
		if(err) return callback(err);
		
		callback(null);
	});
}

function loadFromFile(file, callback){
	fs.readFile(file, function(err, body){
		if(err){
			if(err.code !== 'ENOENT'){
				return callback(err);
			}
			
			return callback(null, null);
		}
		
		try{
			callback(null, JSON.parse(body));
		}
		catch(err){
			callback(err);
		}
	});
}

exports.monitor = main;