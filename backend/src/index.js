const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Email Agent API is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
