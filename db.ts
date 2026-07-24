import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let pool: mysql.Pool | null = null;

export async function getDbConnection() {
  if (pool) return pool;

  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn("Aviso: Falta configuração do MySQL no .env. Executando em in-memory.");
    return null;
  }

  try {
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT ? parseInt(DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocols (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        state VARCHAR(2) NOT NULL,
        councillorName VARCHAR(255),
        role VARCHAR(255),
        email VARCHAR(255),
        whatsapp VARCHAR(255),
        protocolNumber VARCHAR(255),
        date VARCHAR(255),
        link VARCHAR(255),
        jaProtocolou VARCHAR(50),
        status VARCHAR(50),
        active BOOLEAN DEFAULT false,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS citizens (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255),
        email VARCHAR(255),
        cep VARCHAR(20),
        endereco TEXT,
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(2),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS petitions (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255),
        email VARCHAR(255),
        cep VARCHAR(20),
        endereco TEXT,
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(2),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contra_maus_tratos (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255),
        email VARCHAR(255),
        cep VARCHAR(20),
        endereco TEXT,
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(2),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Conectado ao MySQL com sucesso!");
    return pool;
  } catch (err) {
    console.error("Erro ao conectar ao MySQL:", err);
    pool = null;
    return null;
  }
}
