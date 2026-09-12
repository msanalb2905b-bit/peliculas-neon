const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MiMario0098";
const SESSION_SECRET = process.env.SESSION_SECRET || "CAMBIA_ESTA_CLAVE";

if (!process.env.DATABASE_URL) {
  console.warn("AVISO: DATABASE_URL no está definida. Configúrala en Render.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movies (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      poster TEXT NOT NULL,
      video TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

function makeToken() {
  return crypto.createHmac("sha256", SESSION_SECRET)
    .update(crypto.randomBytes(32).toString("hex"))
    .digest("hex");
}
function adminOnly(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token || !sessions.has(token)) return res.status(401).json({ error: "No autorizado" });
  next();
}

app.post("/api/login", (req, res) => {
  if (req.body?.password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Contraseña incorrecta" });
  const token = makeToken();
  sessions.set(token, Date.now());
  res.json({ token });
});

app.post("/api/logout", adminOnly, (req, res) => {
  const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
  sessions.delete(token);
  res.json({ ok: true });
});

app.get("/api/movies", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,title,description,poster,video,created_at FROM movies ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar el catálogo." });
  }
});

function validateMovie(body) {
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const poster = String(body?.poster || "").trim();
  const video = String(body?.video || "").trim();
  if (!title || !poster || !video)
    return { error: "Título, portada y enlace de vídeo son obligatorios." };
  try { new URL(poster); } catch { return { error: "El enlace de la portada no es válido." }; }
  try { new URL(video); } catch { return { error: "El enlace del vídeo no es válido." }; }
  return { title, description, poster, video };
}

app.post("/api/movies", adminOnly, async (req, res) => {
  const v = validateMovie(req.body);
  if (v.error) return res.status(400).json(v);
  try {
    const { rows } = await pool.query(
      "INSERT INTO movies(title,description,poster,video) VALUES($1,$2,$3,$4) RETURNING *",
      [v.title,v.description,v.poster,v.video]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar la película." });
  }
});

app.put("/api/movies/:id", adminOnly, async (req, res) => {
  const v = validateMovie(req.body);
  if (v.error) return res.status(400).json(v);
  try {
    const { rows } = await pool.query(
      "UPDATE movies SET title=$1,description=$2,poster=$3,video=$4 WHERE id=$5 RETURNING *",
      [v.title,v.description,v.poster,v.video,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Película no encontrada." });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar la película." });
  }
});

app.delete("/api/movies/:id", adminOnly, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM movies WHERE id=$1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Película no encontrada." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar la película." });
  }
});

app.get("*splat", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));

initDb()
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log(`Servidor escuchando en ${PORT}`)))
  .catch(err => {
    console.error("No se pudo inicializar la base de datos:", err);
    process.exit(1);
  });
