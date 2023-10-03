const express = require('express');
const mysql = require('mysql');
const app = express();


const db = mysql.createConnection({
  host: '127.0.0.1', 
  user: 'root', 
  database: 'DELIVERAR'
});


db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySql:', err);
  } else {
    console.log('Successfully connected to MySql');
  }
});

app.use(express.json());




app.put('/users/:id', (req, res) => {
  const userId = req.params.id; 
  const { name, lastname, email, password, dni, birth_date, gender, status } = req.body;

  const updateUserQuery = `
    UPDATE users 
    SET name = ?, lastname = ?, email = ?, password = ?, dni = ?, birth_date = ?, gender = ?, status = ? 
    WHERE id = ?
  `;

  const values = [name, lastname, email, password, dni, birth_date, gender, status, userId];

  db.query(updateUserQuery, values, (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Error updating user' });
    } else {
      console.log('User updated successfully');
      res.status(200).json({ message: 'User updated successfully' });
    }
  });
});


app.get('/', (req, res) => {
    res.send('Server is listening');
  });


app.listen(3000, () => {
  console.log('server is listening on port', 3000);
});
