var Twitter = require('twitter');
var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    port = process.argv[2] || 8888,
    io;

var sockets = [];

var client = new Twitter({
  consumer_key: 'N3KBUu9BTDYaK8qjDlE5kSFBw',
  consumer_secret: 'Kiu23PX0ipCY8XMIr04eD63fUSqydGa5Dm65zizURLnx1IOm5U',
  access_token_key: '904794882-4uTX34uVmRrszMubRYm3gFIAWHOqJhLgqxsdwNHk',
  access_token_secret: 'AgqeENKSkFQRnpKO0re3iTn4NdNJ1HBTAGECaWNk11vc1'
});

client.stream('statuses/filter', {track: '#htn #samplestory'}, function(stream) {
  stream.on('data', function(tweet) {
    if (_t.hasOwnProperty(tweet.in_reply_to_status_id_str)) {
      tweet.text = clean(tweet.text);
      console.log(tweet.text);
      if (tweet.text.valid) {
        console.log('valid');
        tweet.text = tweet.text.string;
        tweet.children = [];
        _t[tweet.id_str] = tweet;
        _t[tweet.in_reply_to_status_id_str].children.push(tweet.id_str);

        var t = { parent: { id: tweet.in_reply_to_status_id_str }, name: tweet.text, id: tweet.id_str };

console.log(t);

        io.emit('data', t);
      }
    }
  });

  stream.on('error', function(error) {
    throw error;
  });
  console.log('waiting...');
});


var _t = {};
var root;

client.get('statuses/user_timeline', {screen_name: 'CarolHackLondon'}, function(error, tweets) {
  for (var i=0;i<tweets.length;i++) {
    if (tweets[i].text.indexOf('#htn #samplestory') > -1) {
      tweets[i].text = clean('@' + tweets[i].text).string;
      if (!root) { root = tweets[i]; }
      tweets[i].children = [];
      _t[tweets[i].id_str.toString()] = tweets[i];
      console.log(Object.getOwnPropertyNames(_t).length);
    }
  }
});

function clean(s) {
  var state = 0;
  for (var i=0;i<s.length;i++) {
    if (state === 0) {
      if (s[i] === '@' && i === 0) {
        state = 1;
      }
    } else if (state === 1) {
      if (s[i] === '#') {
        state = 2;
      }
    } else if (state === 2) {
      if (s[i] === '#') {
        state = 3;
      }
    } else if (state === 3) {
      if (s[i] === ' ') {
        state = 4; break;
      }
    }
  }
  return {'string': s.substr(i).trim(), 'valid': state === 4};
}

var server = http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  var contentTypesByExtension = {
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript"
  };

  if (uri === '/data.json') {
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(treeify(root)));
    response.end();
  } else {
    path.exists(filename, function(exists) {
      if(!exists) {
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
        return;
      }

      if (fs.statSync(filename).isDirectory()) filename += '/index.html';

      fs.readFile(filename, "binary", function(err, file) {
        if(err) {        
          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write(err + "\n");
          response.end();
          return;
        }

        var headers = {};
        var contentType = contentTypesByExtension[path.extname(filename)];
        if (contentType) headers["Content-Type"] = contentType;
        response.writeHead(200, headers);
        response.write(file, "binary");
        response.end();
      });
    });
  }
});
server.listen(parseInt(port, 10));

io = require('socket.io')(server);

io.on('connection', function(socket){
  sockets.push(socket);
  socket.on('disconnect', function(){
    var index = sockets.indexOf(socket);
    if (index > -1) {
      sockets.splice(index, 1);
    }
  });
});

function treeify(node) {
  var obj = {name: node.text, children: node.children};
  var arr = [];
  for (var i=0;i<node.children.length;i++) {
    arr.push(treeify(_t[obj.children[i]]));
  }
  obj.children = arr;
  obj.id = node.id_str;
  return obj;
}

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");

setInterval(function() { console.log(root.children); }, 10000);
