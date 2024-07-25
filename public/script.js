let socket;
let username;

function showLogin() {
  document.getElementById('register').style.display = 'none';
  document.getElementById('login').style.display = 'block';
}

function showRegister() {
  document.getElementById('register').style.display = 'block';
  document.getElementById('login').style.display = 'none';
}

async function register() {
  const usernameInput = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  const email = document.getElementById('registerEmail').value;

  const response = await fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: usernameInput, password, email })
  });

  if (response.ok) {
    alert('Registration successful! Please log in.');
    showLogin();
  } else {
    alert('Registration failed. Please try again.');
  }
}

async function login() {
  username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (response.ok) {
    alert('Login successful!');
    document.getElementById('login').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
    socket = new WebSocket(`ws://localhost:3000/?token=${data.token}`);

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.sender !== username) {
        displayMessage(message, 'received');
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } else {
    alert('Login failed. Please try again.');
  }
}

function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ text: message, sender: username }));
    displayMessage({ text: message, sender: 'You', timestamp: new Date() }, 'sent');
    messageInput.value = '';
  } else {
    alert('WebSocket connection is not open.');
  }
}

function displayMessage(message, type = 'received') {
  const messagesDiv = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  messageElement.innerText = `${new Date(message.timestamp).toLocaleTimeString()} - ${message.sender}: ${message.text}`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
