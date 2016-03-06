# Server-Monitor

This package provide monitoring websites over http for availability. You can configure website address, path, timeout and keyword check. Monitor script check for response code which have to be 200. Optionally it can check for keyword in page body.

Main function returns JSON with two keys: `errors` and `cleared`. When outage occured, data appeared in `errors` key in this format:

```
errors: {
	'www.domain.tld': {
		message: 'Host www.domain.tld is down! Server doesn\'t response within 15 seconds',
	    count: 1,
	    outageAt: 1457297987597
	}
}
```

If outage continue in next monitoring cycle, `count` is incremented and `lastUpdatedAt` is added.

```
errors: {
	'www.domain.tld': {
		message: 'Host www.domain.tld is down! Server doesn\'t response within 15 seconds',
	    count: 2,
	    outageAt: 1457297987597,
	    lastUpdatedAt: 1457298012441
	}
}
```

When outage is cleared error record moved to `cleared` key and `clearedAt` is added.

```
cleared: {
	'www.domain.tld': {
		message: 'Host www.domain.tld is down! Server doesn\'t response within 15 seconds',
	    count: 5,
	    outageAt: 1457297987597,
	    lastUpdatedAt: 1457298012441,
	    clearedAt: 1457298585791
	}
}
```

In next monitoring cycle `cleared` key will be truncated.

## Example code

config.json

```
[
	{
		"host": "somedomain.tld", // should point to final address, redirects (301, 302) are not supported yet.
		"path": "/",
		"service": "http", // should be always http, no other types are implemented yet.
		"timeout": 15,
		"checkKeyword": "SomeKeyword" // to find in page body
	},
	{
		"host": "www.somedomain.tld",
		"path": "/",
		"service": "http",
		"timeout": 10
	}
]
```

usage in script

```
var momitor = require("server-monitor").monitor;
var config = require("./config");

monitor(config, function(err, data){
	if(err) return console.log(err);
	
	console.log(data);
	// do what you want, send mail or send sms?
});
```