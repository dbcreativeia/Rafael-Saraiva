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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS popup_apoio (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255),
        email VARCHAR(255),
        cep VARCHAR(20),
        endereco TEXT,
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(2),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jogo_users (
        id VARCHAR(255) PRIMARY KEY,
        nomeCompleto VARCHAR(255) NOT NULL,
        usuario VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        whatsapp VARCHAR(255),
        cep VARCHAR(20),
        cidade VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jogo_scores (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cidade VARCHAR(255) NOT NULL,
        usuario VARCHAR(255),
        score INT NOT NULL,
        fase INT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_campaign (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        sobrenome VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255),
        email VARCHAR(255),
        cep VARCHAR(20),
        endereco TEXT,
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(2),
        tipoMaterial VARCHAR(50),
        adesivoPerfurado BOOLEAN DEFAULT false,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ninapassadore_campaign (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        sobrenome VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(255),
        email VARCHAR(255),
        cep VARCHAR(20),
        endereco TEXT,
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(2),
        tipoMaterial VARCHAR(50),
        adesivoPerfurado BOOLEAN DEFAULT false,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS imported_leads (
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
        campanha VARCHAR(255) NOT NULL,
        origem VARCHAR(255) DEFAULT 'Importação CSV',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_campanha (campanha)
      )
    `);

    try {
      await pool.query(`CREATE INDEX idx_campanha ON imported_leads(campanha)`);
    } catch (e) {
      // Index already exists
    }

    try {
      await pool.query(`ALTER TABLE imported_leads ADD COLUMN extraData TEXT`);
    } catch (e) {
      // Column probably already exists, ignore
    }

    try {
      await pool.query(`ALTER TABLE material_campaign ADD COLUMN adesivoPerfurado BOOLEAN DEFAULT false`);
    } catch (e) {
      // Column probably already exists, ignore
    }

    console.log("Conectado ao MySQL com sucesso!");
    return pool;
  } catch (err) {
    console.error("Erro ao conectar ao MySQL:", err);
    pool = null;
    return null;
  }
}
