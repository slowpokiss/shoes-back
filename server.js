  const express = require('express');
  const { Client } = require('pg');
  const cors = require('cors');
  require('dotenv').config();

  const app = express();
  const port = process.env.PORT || 3000;
  app.use(cors());

  // hardСode
  const moreCount = 6;
  const topSaleIds = [66, 65, 73];
  const topSaleMapped = topSaleIds.map((_, index) => `$${index + 1}`).join(', ');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    //ssl: { rejectUnauthorized: false }
  });

  client.connect()
    .then(() => console.log('successfully connected!'))
    .catch((err) => console.error('error connection', err.stack));


  app.get('/api/categories', async (req, res) => {
    try {
      const result = await client.query('SELECT * FROM public.categories');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('No such data in database', err);
    }
  });

  app.get('/api/top-sales', async (req, res) => {
    try {
      const result = await client.query(`SELECT * FROM products WHERE id IN ${topSaleMapped})`)
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('No such data in database', err);
    }
  })

  app.get('/api/products', async (req, res) => {
    try {
      const { categoryId = 0, offset = 0, q = '' } = req.query;

      const safeCategoryId = Number(categoryId) || 13;
      const safeOffset = Number(offset) || 0;
      const safeLimit = 6;

      let queryText = `SELECT * FROM products WHERE category_id = ${safeCategoryId}`;

      if (q && q.trim()) {
        const searchTerm = `%${q.trim().toLowerCase()}%`;
        queryText += ` AND (LOWER(title) LIKE '${searchTerm}' OR LOWER(color) = '${q.trim().toLowerCase()}')`;
      }

      queryText += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      const { rows } = await client.query(queryText);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('No such data in database');
    }
  });


  app.get('/api/products/:id', async (req, res) => {
    const id = Number(req.params.id);

    try {
      const result = await client.query(`SELECT * FROM public.products WHERE id = ${id}`);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('No such data in database', err);
    }
  });


  app.post('/api/order', async (req, res) => {
    const { owner: { phone, address }, items } = req.body;

    if (typeof phone !== 'string') {
      return res.status(400).json({ message: 'bad request: phone' });
    }
    if (typeof address !== 'string') {
      return res.status(400).json({ message: 'bad request: address' });
    }
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'bad request: items' });
    }

    if (!items.every(({ id, price, count }) => 
      typeof id === 'number' && id > 0 && 
      typeof price === 'number' && price > 0 && 
      typeof count === 'number' && count > 0)) {
      return res.status(400).json({ message: 'bad request: invalid items' });
    }

    try {
      const userResult = await client.query('INSERT INTO users (phone, address) VALUES ($1, $2) RETURNING id', [phone, address]);
      const userId = userResult.rows[0].id;

      const orderResult = await client.query('INSERT INTO orders (user_id) VALUES ($1) RETURNING id', [userId]);
      const orderId = orderResult.rows[0].id;

      for (const { id, price, count } of items) {
        const totalPrice = price * count;
        await client.query('INSERT INTO order_items (order_id, product_id, price, count, total_price) VALUES ($1, $2, $3, $4, $5)', 
          [orderId, id, price, count, totalPrice]);
      }

      return res.status(204).send();

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server Error' });
    }
  });


  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });