var http = require("http");
var fs = require("fs");
var path = require("path");
const APP_PORT = process.env.PORT || 3000;
const app = http.createServer(requestHandler);
const io = require("socket.io")(app, {
  path: "/socket.io",
});

app.listen(APP_PORT);
console.log(`🖥 HTTP Server running at ${APP_PORT}`);

// handles all http requests to the server
function requestHandler(request, response) {
  console.log(`🖥 Received request for ${request.url}`);
  // append /client to serve pages from that folder
  var filePath = "./client" + request.url;
  if (filePath == "./client/") {
    // serve index page on request /
    filePath = "./client/index.html";
  }
  var extname = String(path.extname(filePath)).toLowerCase();
  console.log(`🖥 Serving ${filePath}`);
  var mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };
  var contentType = mimeTypes[extname] || "application/octet-stream";
  fs.readFile(filePath, function (error, content) {
    if (error) {
      if (error.code == "ENOENT") {
        fs.readFile("./client/404.html", function (error, content) {
          response.writeHead(404, { "Content-Type": contentType });
          response.end(content, "utf-8");
        });
      } else {
        response.writeHead(500);
        response.end("Sorry, there was an error: " + error.code + " ..\n");
      }
    } else {
      response.writeHead(200, { "Content-Type": contentType });
      response.end(content, "utf-8");
    }
  });
}

io.attach(app, {
  // includes local domain to avoid CORS error locally
  // configure it accordingly for production
  cors: {
    origin: "http://localhost",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
  },
  allowEIO3: true,
});

io.on("connection", (socket) => {
  console.log("👾 New socket connected! >>", socket.id);
});
var users = {};

io.on("connection", (socket) => {
  console.log("👾 New socket connected! >>", socket.id);

  // handles new connection
  socket.on("new-connection", (data) => {
    // captures event when new clients join
    console.log(`new-connection event received`, data);
    // adds user to list
    users[socket.id] = data.username;
    console.log("users :>> ", users);
    // emit welcome message event
    socket.emit("welcome-message", {
      user: "server",
      message: `Welcome ${data.username} - FROM chinmoy `,
    });
  });

  // handles message posted by client
  socket.on("new-message", (data) => {
    console.log(`👾 new-message from ${data.user}`);
    // broadcast message to all sockets except the one that triggered the event
    socket.broadcast.emit("broadcast-message", {
      user: users[data.user],
      message: data.message,
    });
  });
  socket.on("disconnect", function (socket) {
    console.log("user disconnected", socket.id);
    delete users[socket.id];
  });
});
