# Node.js SDK for Api.ai, with proxy support

This is a fork that provides proxy support for api-ai-node-js.

This plugin allows integrating agents from the [Api.ai](http://api.ai) natural language processing service with your Node.js application.

* [Installation](#installation)
* [Usage](#usage)

# Installation

* Install [Node.js](https://nodejs.org/)
* Install Api.ai SDK with `npm`:
```shell
npm install apiai-proxy
```

# Usage
* Create `main.js` file with the following code:
```javascript
var apiai = require('apiai');

var app = apiai("<your client access token>");

var options = {    
    proxyHost: 'proxy-server.com',
    proxyPort: 433
};

var request = app.textRequest('<Your text query>', options);

request.on('response', function(response) {
    console.log(response);
});

request.on('error', function(error) {
    console.log(error);
});

request.end()
```
* Run following command.
```shell
node main.js
```
* Your can find more examples in [`examples`](examples) directory.
