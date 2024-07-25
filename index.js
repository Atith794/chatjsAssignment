const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Message = require('./models/Message');
require('dotenv').config();


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.method === 'POST' && req.url === '/register') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const { username, password, email } = JSON.parse(body);
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword, email });
      await user.save();
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('User registered');
    });
  } else if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const { username, password } = JSON.parse(body);
      const user = await User.findOne({ username });
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token }));
      } else {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Invalid credentials');
      }
    });
  } else if (req.method === 'GET' && req.url.startsWith('/public/')) {
    const filePath = path.join(__dirname, req.url);
    const ext = path.extname(filePath);
    let contentType = 'text/plain';

    switch (ext) {
      case '.html':
        contentType = 'text/html';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'application/javascript';
        break;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const token = query.token;
  if (!token) {
    ws.close();
    return;
  }
  let userId;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    userId = payload.id;
  } catch (e) {
    ws.close();
    return;
  }
  ws.userId = userId;

  ws.on('message', async (message) => {
    const messageData = JSON.parse(message);
    const user = await User.findById(userId);
    const newMessage = new Message({
      sender: user.username,
      text: messageData.text,
      timestamp: new Date(),
    });
    await newMessage.save();
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          sender: newMessage.sender,
          text: newMessage.text,
          timestamp: newMessage.timestamp,
        }));
      }
    });
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});