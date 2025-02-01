const { Client } = require("pg");
const fs = require("fs");

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "shoes_db",
  password: "mihaadmin",
  port: 5432,
});

async function importData() {
  await client.connect();
  const categories = JSON.parse(fs.readFileSync("./data/categories.json", "utf8"));
  const products = JSON.parse(fs.readFileSync("./data/products.json", "utf8"));

  for (const el of categories) {
    await client.query(
      "INSERT INTO categories (id, title) VALUES ($1, $2)",
      [el.id, el.title]
    );
  }

  for (const product of products) {
    await client.query(
      "INSERT INTO products (id, category_id, title, sku, manufacturer, color, material, reason, season, heel_size, price, old_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [
        product.id,
        product.category,
        product.title,
        product.sku,
        product.manufacturer,
        product.color,
        product.material,
        product.reason,
        product.season,
        product.heelSize,
        product.price,
        product.oldPrice || null,
      ]
    );

    for (const size of product.sizes) {
      await client.query(
        "INSERT INTO product_sizes (product_id, size, available) VALUES ($1, $2, $3)",
        [product.id, size.size, size.available]
      );
    }
  }

  await client.end();
}

importData().catch(console.error);