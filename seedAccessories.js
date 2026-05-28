const db = require('./backend/database');
const prods = [
  { id: 'P008', name: 'Gorra Snapback W', price: 45000, oldPrice: 55000, cat: 'accesorios', img: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80' },
  { id: 'P009', name: 'Bolso Crossbody Urbano', price: 89900, oldPrice: null, cat: 'accesorios', img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&q=80' },
  { id: 'P010', name: 'Cadena Cubana Premium', price: 65000, oldPrice: 80000, cat: 'accesorios', img: 'https://images.unsplash.com/photo-1599643478524-fb66f7f6f5b9?w=300&q=80' }
];

db.serialize(() => {
  const stmtProd = db.prepare('INSERT OR IGNORE INTO products (id, name, price, category, image, oldPrice) VALUES (?, ?, ?, ?, ?, ?)');
  const stmtInv = db.prepare('INSERT OR IGNORE INTO inventory (product_id, size, qty) VALUES (?, ?, ?)');
  prods.forEach(p => {
    stmtProd.run(p.id, p.name, p.price, p.cat, p.img, p.oldPrice);
    stmtInv.run(p.id, 'U', 30);
  });
  stmtProd.finalize();
  stmtInv.finalize();
});
console.log('Added accessories successfully');
