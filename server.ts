import { getCrmSummary, getCrmPaginated, recordLeadAction, syncCampaignToCrm, deleteLeadById, exportCrmStream, exportCrmXlsx, getLeadsGeoBreakdown } from "./crmService.ts";
import { sanitizeGeo, sanitizeCity, sanitizeState } from "./geoSanitizer.ts";
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { getDbConnection } from "./db.js";
import {
  leadsConsolidator,
  normalizePhone,
  normalizeEmail,
  normalizeCpf,
  normalizeKey,
  isValidFullNameForMatching
} from "./leadsConsolidation.js";
import { GoogleGenAI } from "@google/genai";

const PIXEL_ID = "909578061696893";

async function startServer() {
  const app = express();
  app.use(compression());
  const PORT = 3000;

  // Middleware para parsear JSON no body
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Desabilitar cache para todas as rotas da API
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // In-memory data store for cities and protocols (fallback)
  const protocolsData: any[] = [];
  const citizensData: any[] = [];
  const petitionsData: any[] = [];
  const contraMausTratosData: any[] = [];
  const jogoScoresData: any[] = [];
  const popupApoioData: any[] = [];

  // Persistent disk storage for imported leads to guarantee persistence
  const IMPORTED_LEADS_FILE = path.join(process.cwd(), 'imported_leads_store.json');
  let importedLeadsData: any[] = [];
  try {
    if (fs.existsSync(IMPORTED_LEADS_FILE)) {
      const content = fs.readFileSync(IMPORTED_LEADS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        importedLeadsData = parsed;
      }
    }
  } catch (e) {
    console.error("Error reading imported_leads_store.json:", e);
  }

  function saveImportedLeadsToDisk() {
    try {
      fs.writeFileSync(IMPORTED_LEADS_FILE, JSON.stringify(importedLeadsData, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error saving imported_leads_store.json:", e);
    }
  }

  // Persistent disk storage for electoral results JSON
  const ELECTORAL_RESULTS_FILE = path.join(process.cwd(), 'electoral_results_store.json');
  let electoralResultsData: any = null;
  let electoralResultsLastUpdated: string | null = null;
  try {
    if (fs.existsSync(ELECTORAL_RESULTS_FILE)) {
      const content = fs.readFileSync(ELECTORAL_RESULTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        electoralResultsData = parsed.data || parsed;
        electoralResultsLastUpdated = parsed.importedAt || new Date().toISOString();
      }
    }
  } catch (e) {
    console.error("Error reading electoral_results_store.json:", e);
  }

  function saveElectoralResultsToDisk(payload: any) {
    try {
      const record = {
        data: payload,
        importedAt: new Date().toISOString()
      };
      fs.writeFileSync(ELECTORAL_RESULTS_FILE, JSON.stringify(record), 'utf-8');
      electoralResultsData = payload;
      electoralResultsLastUpdated = record.importedAt;
      return true;
    } catch (e) {
      console.error("Error saving electoral_results_store.json:", e);
      return false;
    }
  }

  // Persistent partitioned disk storage for Causa Animal SP 2026 v2 dataset
  const CAUSA_ANIMAL_DIR = path.join(process.cwd(), 'data', 'causa_animal_v2');
  if (!fs.existsSync(CAUSA_ANIMAL_DIR)) {
    try {
      fs.mkdirSync(CAUSA_ANIMAL_DIR, { recursive: true });
    } catch (e) {
      console.error("Error creating CAUSA_ANIMAL_DIR:", e);
    }
  }

  let causaAnimalMeta: any = null;
  let causaAnimalReceipt: any = null;
  let causaAnimalBases: Record<string, any[]> = {
    municipios: [],
    zonas: [],
    locais: [],
    bairros: [],
    secoes: []
  };
  let causaAnimalFull: any = null;

  try {
    const metaPath = path.join(CAUSA_ANIMAL_DIR, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      causaAnimalMeta = JSON.parse(metaContent);
      causaAnimalReceipt = causaAnimalMeta.receipt || null;
      for (const b of ['municipios', 'zonas', 'locais', 'bairros', 'secoes']) {
        const bp = path.join(CAUSA_ANIMAL_DIR, `${b}.json`);
        if (fs.existsSync(bp)) {
          causaAnimalBases[b] = JSON.parse(fs.readFileSync(bp, 'utf-8'));
        }
      }
    }
  } catch (e) {
    console.error("Error loading causa_animal_v2 dataset from disk at boot:", e);
  }

  function saveCausaAnimalToDisk(dataset: any, receipt: any) {
    try {
      if (!fs.existsSync(CAUSA_ANIMAL_DIR)) {
        fs.mkdirSync(CAUSA_ANIMAL_DIR, { recursive: true });
      }

      const meta = {
        versao: dataset.versao,
        dataset_id: dataset.dataset_id,
        somente_amostra_de_estrutura: dataset.somente_amostra_de_estrutura,
        metadados: dataset.metadados || {},
        candidatos: dataset.candidatos || [],
        ordem_candidatos_por_cargo: dataset.ordem_candidatos_por_cargo || {},
        indices_por_universo: dataset.indices_por_universo || {},
        receipt: receipt,
        importedAt: new Date().toISOString()
      };

      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

      const bases = dataset.bases || {};
      const mun = bases.municipios?.registros || [];
      const zon = bases.zonas?.registros || [];
      const bai = bases.bairros?.registros || [];
      const loc = bases.locais?.registros || [];
      const sec = bases.secoes?.registros || [];

      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'municipios.json'), JSON.stringify(mun), 'utf-8');
      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'zonas.json'), JSON.stringify(zon), 'utf-8');
      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'bairros.json'), JSON.stringify(bai), 'utf-8');
      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'locais.json'), JSON.stringify(loc), 'utf-8');
      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'secoes.json'), JSON.stringify(sec), 'utf-8');
      fs.writeFileSync(path.join(CAUSA_ANIMAL_DIR, 'full.json'), JSON.stringify(dataset), 'utf-8');

      causaAnimalMeta = meta;
      causaAnimalReceipt = receipt;
      causaAnimalBases = {
        municipios: mun,
        zonas: zon,
        locais: loc,
        bairros: bai,
        secoes: sec
      };
      causaAnimalFull = dataset;

      return true;
    } catch (e) {
      console.error("Error saving causa_animal_v2 dataset to disk:", e);
      return false;
    }
  }

  let db: any = null;
  // Initialize DB in the background without blocking server startup
  getDbConnection().then(connection => {
    db = connection;
  });

  
  const materialData: any[] = [];
  const ninapassadoreData: any[] = [];

  // Rotas de Resultados Eleitorais 2026 (Persistência compartilhada)
  app.get('/api/eleicoes/resultados', (req, res) => {
    return res.json({
      success: true,
      hasData: !!electoralResultsData,
      data: electoralResultsData,
      importedAt: electoralResultsLastUpdated,
      isPersistent: true
    });
  });

  app.get('/api/eleicoes/leads-breakdown', async (req, res) => {
    try {
      const campaign = req.query.campaign ? String(req.query.campaign) : undefined;
      const breakdown = await getLeadsGeoBreakdown(campaign);
      return res.json(breakdown);
    } catch (err: any) {
      console.error("Erro ao buscar cruzamento de leads:", err);
      return res.status(500).json({ error: "Erro ao buscar leads para cruzamento: " + err.message });
    }
  });

  app.post('/api/eleicoes/import', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object' || !payload.bases) {
        return res.status(400).json({ error: "Formato de arquivo inválido. Estrutura 'bases' não encontrada." });
      }

      const saved = saveElectoralResultsToDisk(payload);
      const counts = {
        municipios: Array.isArray(payload.bases?.municipios?.registros) ? payload.bases.municipios.registros.length : 0,
        zonas: Array.isArray(payload.bases?.zonas?.registros) ? payload.bases.zonas.registros.length : 0,
        bairros: Array.isArray(payload.bases?.bairros?.registros) ? payload.bases.bairros.registros.length : 0,
        locais: Array.isArray(payload.bases?.locais?.registros) ? payload.bases.locais.registros.length : 0,
      };

      return res.json({
        success: true,
        isPersistent: saved,
        counts,
        importedAt: electoralResultsLastUpdated,
        message: saved 
          ? "Base eleitoral persistida no servidor com sucesso e sincronizada para todos os visitantes." 
          : "Salvo em memória do servidor."
      });
    } catch (err: any) {
      console.error("Erro ao importar base eleitoral:", err);
      return res.status(500).json({ error: "Falha ao processar arquivo no servidor: " + err.message });
    }
  });

  app.delete('/api/eleicoes/clear', (req, res) => {
    try {
      electoralResultsData = null;
      electoralResultsLastUpdated = null;
      if (fs.existsSync(ELECTORAL_RESULTS_FILE)) {
        fs.unlinkSync(ELECTORAL_RESULTS_FILE);
      }
      return res.json({ success: true, message: "Dados eleitorais removidos do servidor com sucesso." });
    } catch (e: any) {
      return res.status(500).json({ error: "Erro ao limpar dados eleitorais: " + e.message });
    }
  });

  // ==========================================
  // Rotas Causa Animal SP 2026 (versão 2)
  // Dataset: causa_animal_SP_2026_v2
  // ==========================================

  app.get('/api/causa-animal/status', (req, res) => {
    return res.json({
      success: true,
      hasData: !!causaAnimalMeta,
      isPersistent: true,
      dataset_id: 'causa_animal_SP_2026_v2',
      versao: 2,
      importedAt: causaAnimalMeta?.importedAt || null,
      receipt: causaAnimalReceipt || causaAnimalMeta?.receipt || null,
      counts: {
        municipios: causaAnimalBases.municipios?.length || 0,
        zonas: causaAnimalBases.zonas?.length || 0,
        locais: causaAnimalBases.locais?.length || 0,
        bairros: causaAnimalBases.bairros?.length || 0,
        secoes: causaAnimalBases.secoes?.length || 0,
        candidatos: causaAnimalMeta?.candidatos?.length || 0
      }
    });
  });

  app.get('/api/causa-animal/meta', (req, res) => {
    if (!causaAnimalMeta) {
      return res.status(404).json({ error: "Base causa_animal_SP_2026_v2 ainda não importada no servidor." });
    }
    return res.json(causaAnimalMeta);
  });

  app.get('/api/causa-animal/bases/:baseName', (req, res) => {
    const baseName = req.params.baseName;
    if (!causaAnimalBases[baseName]) {
      return res.status(404).json({ error: `Coleção territorial '${baseName}' não encontrada.` });
    }
    return res.json({
      success: true,
      base: baseName,
      total: causaAnimalBases[baseName].length,
      registros: causaAnimalBases[baseName]
    });
  });

  app.get('/api/causa-animal/secoes', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(500, Math.max(10, parseInt(req.query.pageSize as string, 10) || 50));
    const zona = req.query.zona ? String(req.query.zona).trim() : '';
    const local_id = req.query.local_id ? String(req.query.local_id).trim() : '';
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';

    let list = causaAnimalBases.secoes || [];
    if (zona) {
      const padded = zona.padStart(4, '0');
      list = list.filter(s => String(s.zona).padStart(4, '0') === padded);
    }
    if (local_id) {
      list = list.filter(s => s.local_id === local_id);
    }
    if (search) {
      list = list.filter(s =>
        (s.secao && String(s.secao).includes(search)) ||
        (s.local_id && String(s.local_id).toLowerCase().includes(search)) ||
        (s.zona && String(s.zona).includes(search))
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginated = list.slice(start, start + pageSize);

    return res.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages,
      registros: paginated
    });
  });

  app.get('/api/causa-animal/full', (req, res) => {
    if (causaAnimalFull) {
      return res.json(causaAnimalFull);
    }
    const fullPath = path.join(CAUSA_ANIMAL_DIR, 'full.json');
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
    if (causaAnimalMeta) {
      return res.json({
        versao: causaAnimalMeta.versao,
        dataset_id: causaAnimalMeta.dataset_id,
        somente_amostra_de_estrutura: false,
        metadados: causaAnimalMeta.metadados,
        candidatos: causaAnimalMeta.candidatos,
        ordem_candidatos_por_cargo: causaAnimalMeta.ordem_candidatos_por_cargo,
        indices_por_universo: causaAnimalMeta.indices_por_universo,
        bases: {
          municipios: { registros: causaAnimalBases.municipios || [] },
          zonas: { registros: causaAnimalBases.zonas || [] },
          bairros: { registros: causaAnimalBases.bairros || [] },
          locais: { registros: causaAnimalBases.locais || [] },
          secoes: { registros: causaAnimalBases.secoes || [] }
        }
      });
    }
    return res.status(404).json({ error: "Base causa_animal_SP_2026_v2 não encontrada no servidor." });
  });

  app.post('/api/causa-animal/import', (req, res) => {
    try {
      const payload = req.body.dataset || req.body;
      const receipt = req.body.receipt || null;

      if (!payload || typeof payload !== 'object' || !payload.bases) {
        return res.status(400).json({ error: "Formato de arquivo inválido. Estrutura 'bases' não encontrada." });
      }

      if (payload.somente_amostra_de_estrutura === true) {
        return res.status(400).json({
          error: "Arquivo de amostra rejeitado: 'somente_amostra_de_estrutura' é true. Importe o arquivo completo da base oficial."
        });
      }

      if (payload.dataset_id !== 'causa_animal_SP_2026_v2') {
        return res.status(400).json({
          error: `Identificador incompatível: esperado 'causa_animal_SP_2026_v2', recebido '${payload.dataset_id}'.`
        });
      }

      const saved = saveCausaAnimalToDisk(payload, receipt);
      return res.json({
        success: true,
        isPersistent: saved,
        dataset_id: 'causa_animal_SP_2026_v2',
        versao: 2,
        counts: {
          municipios: payload.bases?.municipios?.registros?.length || 0,
          zonas: payload.bases?.zonas?.registros?.length || 0,
          locais: payload.bases?.locais?.registros?.length || 0,
          bairros: payload.bases?.bairros?.registros?.length || 0,
          secoes: payload.bases?.secoes?.registros?.length || 0
        },
        message: "Base causa_animal_SP_2026_v2 persistida com sucesso no servidor e disponibilizada para todos os visitantes."
      });
    } catch (err: any) {
      console.error("Erro ao importar base causa_animal_v2 no servidor:", err);
      return res.status(500).json({ error: "Falha ao processar arquivo no servidor: " + err.message });
    }
  });

  app.delete('/api/causa-animal/clear', (req, res) => {
    try {
      causaAnimalMeta = null;
      causaAnimalReceipt = null;
      causaAnimalFull = null;
      causaAnimalBases = { municipios: [], zonas: [], locais: [], bairros: [], secoes: [] };

      if (fs.existsSync(CAUSA_ANIMAL_DIR)) {
        const files = fs.readdirSync(CAUSA_ANIMAL_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(CAUSA_ANIMAL_DIR, file));
        }
      }
      return res.json({ success: true, message: "Base causa_animal_SP_2026_v2 removida do servidor com sucesso." });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao limpar base causa animal: " + err.message });
    }
  });

  // IA Eleitoral: Varrer dados e responder perguntas analíticas
  app.post('/api/causa-animal/ai-query', async (req, res) => {
    try {
      const { question, contextData, conversationHistory } = req.body;
      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: "Pergunta não fornecida." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
      }

      const ai = new GoogleGenAI({});

      // Funções auxiliares para extração robusta e normalizada dos dados geográficos do TSE
      function extractLocalDetails(loc: any) {
        if (!loc || typeof loc !== 'object') return null;

        const nomeEscola = loc.escola_local_de_votacao || loc.nome || loc.local || loc.escola || loc.escola_local || 'Local de Votação';
        const endereco = loc.endereco || loc.endereco_do_local || loc.rua || loc.logradouro || 'Endereço cadastrado na Capital';

        let bairro = loc.bairro_do_local || loc.bairro || loc.bairro_cadastrado_do_local || loc.nome_do_bairro;
        if (!bairro || String(bairro) === 'undefined' || String(bairro) === 'Capital') {
          bairro = 'Capital de São Paulo';
        }

        let zona = 'Zona Eleitoral da Capital';
        if (loc.nome_da_zona && String(loc.nome_da_zona) !== 'undefined') {
          zona = String(loc.nome_da_zona);
        } else if (loc.nome_da_zona_regiao && String(loc.nome_da_zona_regiao) !== 'undefined') {
          zona = String(loc.nome_da_zona_regiao);
        } else if (loc.zona_eleitoral && String(loc.zona_eleitoral) !== 'undefined') {
          zona = `Zona ${loc.zona_eleitoral}`;
        } else if (loc.zona && String(loc.zona) !== 'undefined') {
          zona = `Zona ${loc.zona}`;
        }

        const codigo = loc.codigo_do_local || loc.codigo_tse || loc.numero_local || loc.local_id || loc.codigo || '-';
        const secoes = loc.secoes_cadastradas ?? loc.secoes ?? loc.total_secoes ?? loc.locais_de_votacao ?? '-';
        const eleitores = loc.eleitores_aptos ?? loc.eleitorado_apto ?? loc.total_eleitores ?? 0;

        let rafaelVotos = loc.rafael_votos ?? loc.votos_rafael;
        if (rafaelVotos === undefined && loc.cargos) {
          const est = loc.cargos.deputado_estadual || loc.cargos.estadual;
          if (est) {
            if (typeof est.total_rafael === 'number') rafaelVotos = est.total_rafael;
            else if (Array.isArray(est.votos_candidatos) && est.votos_candidatos.length > 0) rafaelVotos = est.votos_candidatos[0];
          }
        }

        let ninaVotos = loc.nina_votos ?? loc.votos_nina;
        if (ninaVotos === undefined && loc.cargos) {
          const fed = loc.cargos.deputado_federal || loc.cargos.federal;
          if (fed) {
            if (typeof fed.total_nina === 'number') ninaVotos = fed.total_nina;
            else if (Array.isArray(fed.votos_candidatos) && fed.votos_candidatos.length > 5) ninaVotos = fed.votos_candidatos[5];
          }
        }

        return {
          nomeEscola,
          endereco,
          bairro,
          zona,
          codigo,
          secoes,
          eleitores,
          rafaelVotos: (rafaelVotos !== undefined && rafaelVotos !== null) ? Number(rafaelVotos) : null,
          ninaVotos: (ninaVotos !== undefined && ninaVotos !== null) ? Number(ninaVotos) : null
        };
      }

      function extractBairroDetails(b: any) {
        if (!b || typeof b !== 'object') return null;
        const nomeBairro = b.bairro_do_local || b.bairro || b.bairro_cadastrado_do_local || 'Bairro na Capital';
        const locais = b.locais_de_votacao ?? b.locais ?? '-';
        const secoes = b.secoes_cadastradas ?? b.secoes ?? '-';
        let rafaelVotos = b.rafael_votos ?? b.votos_rafael;
        if (rafaelVotos === undefined && b.cargos) {
          const est = b.cargos.deputado_estadual || b.cargos.estadual;
          if (est && Array.isArray(est.votos_candidatos)) rafaelVotos = est.votos_candidatos[0];
        }
        return { nomeBairro, locais, secoes, rafaelVotos: rafaelVotos !== undefined ? Number(rafaelVotos) : null };
      }

      function extractZonaDetails(z: any) {
        if (!z || typeof z !== 'object') return null;
        let nomeZona = 'Zona Eleitoral';
        if (z.nome_da_zona && String(z.nome_da_zona) !== 'undefined') nomeZona = String(z.nome_da_zona);
        else if (z.nome_da_zona_regiao && String(z.nome_da_zona_regiao) !== 'undefined') nomeZona = String(z.nome_da_zona_regiao);
        else if (z.zona_eleitoral && String(z.zona_eleitoral) !== 'undefined') nomeZona = `Zona ${z.zona_eleitoral}`;
        else if (z.zona && String(z.zona) !== 'undefined') nomeZona = `Zona ${z.zona}`;

        const locais = z.locais_de_votacao ?? z.locais ?? '-';
        const secoes = z.secoes_cadastradas ?? z.secoes ?? '-';
        let rafaelVotos = z.rafael_votos ?? z.votos_rafael;
        if (rafaelVotos === undefined && z.cargos) {
          const est = z.cargos.deputado_estadual || z.cargos.estadual;
          if (est && Array.isArray(est.votos_candidatos)) rafaelVotos = est.votos_candidatos[0];
        }
        return { nomeZona, locais, secoes, rafaelVotos: rafaelVotos !== undefined ? Number(rafaelVotos) : null };
      }

      // Normalizacao e busca inteligente com tolerancia a erros de digitacao (Levenshtein)
      const normalizeTextServer = (s: any) =>
        String(s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^\w\s]/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const queryNormalized = normalizeTextServer(question);

      function levenshteinServer(a: string, b: string): number {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
          }
        }
        return matrix[b.length][a.length];
      }

      function scoreLocationMatchServer(loc: any, query: string): number {
        if (!query) return 100;
        const normQuery = normalizeTextServer(query);
        if (!normQuery) return 100;

        const schoolName = normalizeTextServer(loc.escola_local_de_votacao || loc.nome || loc.local || loc.escola || loc.nome_local || loc.denominacao || '');
        const end = normalizeTextServer(loc.endereco || loc.endereco_do_local || loc.logradouro || loc.rua || '');
        const bairro = normalizeTextServer(loc.bairro_do_local || loc.bairro || loc.bairro_cadastrado_do_local || '');
        const zona = normalizeTextServer(loc.nome_da_zona || loc.zona_eleitoral || loc.zona || '');
        const codigo = normalizeTextServer(loc.codigo_do_local || loc.codigo_tse || loc.codigo || '');

        const combinedText = `${schoolName} ${end} ${bairro} ${zona} ${codigo}`.trim();
        if (!combinedText) return 0;

        let score = 0;
        if (schoolName && schoolName.includes(normQuery)) {
          score += 3000 + normQuery.length * 10;
        } else if (combinedText.includes(normQuery)) {
          score += 800 + normQuery.length * 5;
        }

        const queryTokens = normQuery.split(/\s+/).filter(Boolean);
        const questionFillers = new Set([
          'qual', 'quais', 'onde', 'votos', 'votacao', 'tem', 'para', 'com', 'que', 'quem',
          'sob', 'sobre', 'me', 'fale', 'diz', 'mostrar', 'sao', 'paulo', 'sp', 'como',
          'quantos', 'quanto', 'ficam', 'fica', 'teve', 'pontuou', 'obteve', 'resultados',
          'resultado', 'informacao', 'informacoes', 'dados'
        ]);
        let activeTokens = queryTokens.filter(t => !questionFillers.has(t));
        if (activeTokens.length === 0) activeTokens = queryTokens;

        const queryNumbers = activeTokens.filter(t => /^\d+$/.test(t));
        const textTokens = activeTokens.filter(t => !/^\d+$/.test(t));

        // Matching street numbers (e.g., "293" in address "Rua Maria Cândida, 293")
        if (queryNumbers.length > 0) {
          let numMatches = 0;
          for (const num of queryNumbers) {
            const numRegex = new RegExp(`(?:^|\\D)${num}(?:\\D|$)`);
            if (numRegex.test(combinedText)) {
              numMatches++;
              score += 500;
            }
          }
          if (numMatches === 0 && textTokens.length === 0) {
            return 0;
          }
        }

        // Generic descriptor & title words
        const genericWords = new Set([
          'escola', 'escolas', 'esc', 'colegio', 'colegios', 'coleg', 'col',
          'ee', 'emef', 'emei', 'cei', 'ceu', 'etec', 'fatec', 'senai', 'senac', 'ciep',
          'unidade', 'local', 'votacao', 'predio', 'bloco', 'educacional', 'instituto', 'centro',
          'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', 'com', 'por', 'para',
          'rua', 'r', 'avenida', 'av', 'praca', 'prc', 'pza', 'pc', 'alameda', 'al',
          'rodovia', 'rod', 'estrada', 'est', 'bairro', 'zona', 'secao', 'distrito', 'municipio', 'cidade',
          'padre', 'pe', 'p', 'prof', 'professor', 'professora', 'profa',
          'dr', 'dra', 'doutor', 'doutora', 'santo', 'santa', 'sto', 'sta', 'st', 'sao',
          'dom', 'dona', 'presidente', 'pres', 'marechal', 'general', 'brigadeiro', 'almirante',
          'coronel', 'major', 'capitao', 'tenente', 'sargento', 'vereador', 'deputado', 'governador',
          'prefeito', 'ministro', 'pastor', 'bispo', 'irma', 'irmao', 'maestro', 'maestra', 'governo'
        ]);

        const properTokens = textTokens.filter(t => !genericWords.has(t));
        const descriptorTokens = textTokens.filter(t => genericWords.has(t));

        const serverSynonyms: Record<string, string[]> = {
          'padre': ['pe', 'p'],
          'pe': ['padre', 'p'],
          'p': ['padre', 'pe'],
          'professora': ['profa', 'prof', 'p'],
          'professor': ['prof', 'professora', 'p'],
          'prof': ['professor', 'professora', 'profa'],
          'profa': ['professora', 'prof'],
          'doutor': ['dr'],
          'doutora': ['dra'],
          'dr': ['doutor'],
          'dra': ['doutora'],
          'santo': ['sto', 'st'],
          'santa': ['sta', 'st'],
          'sto': ['santo', 'st'],
          'sta': ['santa', 'st'],
          'st': ['santo', 'santa', 'sto', 'sta'],
          'sao': ['st', 'sto'],
          'colegio': ['col', 'escola', 'colegio'],
          'col': ['colegio'],
          'escola': ['ee', 'emef', 'emei', 'cei', 'ceu', 'colegio', 'escola', 'esc'],
          'ee': ['escola', 'estadual', 'estaduais'],
          'emef': ['escola', 'municipal'],
          'emei': ['escola', 'infantil'],
          'cei': ['escola', 'creche', 'infantil'],
          'rua': ['r'],
          'r': ['rua'],
          'avenida': ['av'],
          'av': ['avenida']
        };

        function checkTokInStr(qTok: string, targetStr: string): number {
          if (!targetStr) return 0;
          const tokens = targetStr.split(/\s+/).filter(Boolean);
          let maxS = 0;
          for (const tTok of tokens) {
            let s = 0;
            if (tTok === qTok) s = 100;
            else if (serverSynonyms[qTok]?.includes(tTok) || serverSynonyms[tTok]?.includes(qTok)) s = 90;
            else if (qTok.length >= 3 && tTok.startsWith(qTok)) s = 85;
            else if (qTok.length >= 4 && tTok.includes(qTok)) s = 70;
            else if (qTok.length >= 4 && /^[a-z]+$/.test(qTok) && /^[a-z]+$/.test(tTok)) {
              const maxDist = qTok.length >= 7 ? 2 : 1;
              if (Math.abs(tTok.length - qTok.length) <= maxDist) {
                const dist = levenshteinServer(qTok, tTok);
                if (dist <= maxDist) s = 80 - dist * 15;
              }
            }
            if (s > maxS) maxS = s;
          }
          return maxS;
        }

        if (properTokens.length > 0) {
          let matchedProper = 0;
          for (const pTok of properTokens) {
            const inSchool = checkTokInStr(pTok, schoolName);
            const inEnd = checkTokInStr(pTok, `${end} ${bairro}`);
            const inTert = checkTokInStr(pTok, `${zona} ${codigo}`);

            if (inSchool > 0) {
              matchedProper++;
              score += inSchool + 1500;
            } else if (inEnd > 0) {
              matchedProper++;
              score += inEnd + 300;
            } else if (inTert > 0) {
              matchedProper++;
              score += inTert + 100;
            }
          }
          if (matchedProper === 0) return 0;
          if (matchedProper === properTokens.length) score += 400;
        }

        if (descriptorTokens.length > 0) {
          let matchedDesc = 0;
          for (const dTok of descriptorTokens) {
            const inSchool = checkTokInStr(dTok, schoolName);
            const inEnd = checkTokInStr(dTok, `${end} ${bairro}`);
            const inTert = checkTokInStr(dTok, `${zona} ${codigo}`);

            if (inSchool > 0) {
              matchedDesc++;
              score += inSchool + 400;
            } else if (inEnd > 0) {
              matchedDesc++;
              score += inEnd + 80;
            } else if (inTert > 0) {
              matchedDesc++;
              score += inTert + 20;
            }
          }
          if (properTokens.length === 0 && matchedDesc === 0) return 0;
        }

        return Math.max(0, score);
      }

      let matchedLocais: any[] = Array.isArray(contextData?.matchedLocais) ? contextData.matchedLocais : [];
      let matchedBairros: any[] = Array.isArray(contextData?.matchedBairros) ? contextData.matchedBairros : [];
      let matchedZonas: any[] = Array.isArray(contextData?.matchedZonas) ? contextData.matchedZonas : [];

      if (matchedLocais.length === 0 && causaAnimalBases.locais && Array.isArray(causaAnimalBases.locais) && causaAnimalBases.locais.length > 0) {
        const scoredLocais = causaAnimalBases.locais
          .map((loc: any) => ({ loc, score: scoreLocationMatchServer(loc, question) }))
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score);

        matchedLocais = scoredLocais.slice(0, 15).map(s => s.loc);
      }

      if (matchedBairros.length === 0 && causaAnimalBases.bairros && Array.isArray(causaAnimalBases.bairros) && causaAnimalBases.bairros.length > 0) {
        const scoredBairros = causaAnimalBases.bairros
          .map((bai: any) => {
            const bName = normalizeTextServer(bai.bairro_do_local || bai.bairro || bai.bairro_cadastrado_do_local || '');
            let score = 0;
            if (bName && queryNormalized.includes(bName)) score = 500;
            else {
              const queryTokens = queryNormalized.split(/\s+/).filter(t => t.length >= 3);
              for (const tok of queryTokens) {
                if (bName.includes(tok)) score += 100;
                else if (tok.length >= 4 && bName.length >= 4) {
                  const dist = levenshteinServer(tok, bName);
                  if (dist <= (tok.length >= 7 ? 2 : 1)) score += 80;
                }
              }
            }
            return { bai, score };
          })
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score);

        matchedBairros = scoredBairros.slice(0, 10).map(s => s.bai);
      }

      if (matchedZonas.length === 0 && causaAnimalBases.zonas && Array.isArray(causaAnimalBases.zonas) && causaAnimalBases.zonas.length > 0) {
        const scoredZonas = causaAnimalBases.zonas
          .map((zon: any) => {
            const zName = normalizeTextServer(`${zon.nome_da_zona || zon.nome_da_zona_regiao || zon.zona_eleitoral || zon.zona || ''}`);
            let score = 0;
            if (zName && queryNormalized.includes(zName)) score = 500;
            else {
              const queryTokens = queryNormalized.split(/\s+/).filter(t => t.length >= 2);
              for (const tok of queryTokens) {
                if (zName.includes(tok)) score += 100;
              }
            }
            return { zon, score };
          })
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score);

        matchedZonas = scoredZonas.slice(0, 10).map(s => s.zon);
      }

      // Contexto factual e infraestrutura de dados disponível
      let contextText = `=== DADOS OFICIAIS CONSOLIDADOS E BASE GEOGRÁFICA (ELEIÇÕES SP - TSE) ===\n`;
      contextText += `MAPEAMENTO GEOGRÁFICO INTEGRAL EM NÍVEL DE RUA, ESCOLA E ZONA ELEITORAL:\n`;
      contextText += `- Total de Municípios no Estado: 645\n`;
      contextText += `- Total de Colégios Eleitorais / Escolas de Votação Cadastrados na Capital: 2.057 com nome oficial da escola, endereço completo com rua e número, bairro, CEP, zona eleitoral, seções e votos.\n`;
      contextText += `- Total de Bairros Mapeados na Capital: 899\n`;
      contextText += `- Total de Zonas Eleitorais na Capital: 58\n`;
      contextText += `- Total de Seções Eleitorais na Capital: 26.683\n`;
      contextText += `- CRM e Mobilização Territorial: Base de apoiadores com georreferenciamento de rua, bairro, CEP e cidade.\n\n`;

      if (matchedLocais.length > 0) {
        contextText += `=== COLÉGIOS ELEITORAIS E ESCOLAS LOCALIZADOS PARA A CONSULTA DO USUÁRIO (${matchedLocais.length} escolas/locais) ===\n`;
        matchedLocais.forEach((rawLoc: any, idx: number) => {
          const loc = extractLocalDetails(rawLoc);
          if (!loc) return;
          contextText += `${idx + 1}. **${loc.nomeEscola}**${loc.codigo !== '-' ? ` (Código TSE: ${loc.codigo})` : ''}\n`;
          contextText += `   - Endereço / Rua: ${loc.endereco}\n`;
          contextText += `   - Bairro: ${loc.bairro}\n`;
          contextText += `   - Zona Eleitoral: ${loc.zona}\n`;
          contextText += `   - Seções Cadastradas: ${loc.secoes}\n`;
          if (loc.eleitores > 0) {
            contextText += `   - Eleitores Aptos: ${loc.eleitores.toLocaleString('pt-BR')}\n`;
          }
          if (loc.rafaelVotos !== null && !isNaN(loc.rafaelVotos)) {
            contextText += `   - Votos de Rafael Saraiva (44077): ${loc.rafaelVotos.toLocaleString('pt-BR')} votos\n`;
          }
          if (loc.ninaVotos !== null && !isNaN(loc.ninaVotos)) {
            contextText += `   - Votos de Nina Passadore (4407): ${loc.ninaVotos.toLocaleString('pt-BR')} votos\n`;
          }
        });
        contextText += `\n`;
      }

      if (matchedBairros.length > 0) {
        contextText += `=== BAIRROS LOCALIZADOS PARA A CONSULTA (${matchedBairros.length} bairros) ===\n`;
        matchedBairros.forEach((rawB: any, idx: number) => {
          const b = extractBairroDetails(rawB);
          if (!b) return;
          contextText += `${idx + 1}. **${b.nomeBairro}** | Colégios Eleitorais: ${b.locais} | Seções: ${b.secoes}`;
          if (b.rafaelVotos !== null && !isNaN(b.rafaelVotos)) contextText += ` | Votos Rafael (44077): ${b.rafaelVotos.toLocaleString('pt-BR')}`;
          contextText += `\n`;
        });
        contextText += `\n`;
      }

      if (matchedZonas.length > 0) {
        contextText += `=== ZONAS ELEITORAIS LOCALIZADAS PARA A CONSULTA (${matchedZonas.length} zonas) ===\n`;
        matchedZonas.forEach((rawZ: any, idx: number) => {
          const z = extractZonaDetails(rawZ);
          if (!z) return;
          contextText += `${idx + 1}. **${z.nomeZona}** | Escolas/Locais: ${z.locais} | Seções: ${z.secoes}`;
          if (z.rafaelVotos !== null && !isNaN(z.rafaelVotos)) contextText += ` | Votos Rafael (44077): ${z.rafaelVotos.toLocaleString('pt-BR')}`;
          contextText += `\n`;
        });
        contextText += `\n`;
      }

      contextText += `PRINCIPAIS CANDIDATOS DA BANDEIRA ANIMAL E MONITORADOS:\n`;
      contextText += `- Rafael Saraiva (UNIÃO - 44077): 105.174 votos válidos no Estado de SP (pontuou em 630 dos 645 municípios); 32.407 votos na Capital em 16.878 seções eleitorais e 2.057 locais de votação; 72.767 votos no Interior/Litoral/Grande SP. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Delegado Bruno Lima (PODE - 2011 - Federal): 217.814 votos no Estado nos 630 municípios de Rafael (1º lugar em Atuação Animal no Estado); 49.609 votos na Capital nas 16.878 urnas de Rafael. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Felipe Becari (PODE - 2007 - Federal): 162.852 votos no Estado nos municípios de Rafael; 42.053 votos na Capital nas urnas de Rafael. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Bruno Ganem (PODE - 2010 - Federal): 64.181 votos no Estado nos municípios de Rafael (forte no Interior: RMC/Indaiatuba/Campinas); 11.325 votos na Capital. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Richard Selvagem (MDB - 1526 - Federal): 50.936 votos no Estado nos municípios de Rafael; 8.768 votos na Capital. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Nina Passadore (UNIÃO - 4407 - Federal - Mesma dobrada de partido de Rafael): 26.288 votos no Estado nos municípios de Rafael; 6.564 votos na Capital. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Dra. Ana Veterinária (PSD - 5505 - Federal): 8.330 votos no Estado nos municípios de Rafael. Critério: Atuação/campanha animal documentada.\n`;
      contextText += `- Dr. Edson da Paiol (PODE - 20007 - Estadual): Grande adversário eleitoral na capital e interior. Votos equivalentes com Felipe Becari em 20 municípios e em 5.635 seções da Capital.\n`;
      contextText += `- Professora Luciene Cavalcante (PSOL - 5089 - Federal): 253.457 votos no Estado nos municípios de Rafael; 53.542 votos na Capital nas urnas de Rafael. Critério: Adesão pública à Pauta Animalista 2026 (não confunda com atuação animal documentada; é deputada de bancada com grande votação partidária geral).\n`;
      contextText += `- Alencar Santana (PT - 1358 - Federal): 160.150 votos no Estado nos municípios de Rafael. Critério: Adesão pública à Pauta Animalista 2026.\n`;
      contextText += `- Edinho Silva (PT - 1316 - Federal): 115.261 votos no Estado nos municípios de Rafael. Critério: Adesão pública à Pauta Animalista 2026.\n`;
      contextText += `- Nilto Tatto (PT - 1353 - Federal): 114.029 votos no Estado nos municípios de Rafael; 32.089 votos na Capital. Critério: Adesão pública à Pauta Animalista 2026.\n`;
      contextText += `- Rodrigo Gambale (PODE - 2077 - Federal): 106.652 votos no Estado nos municípios de Rafael. Critério: Adesão pública à Pauta Animalista 2026.\n`;
      contextText += `- Nabil Bonduki (PT - 1373 - Federal): 46.065 votos no Estado nos municípios de Rafael; 22.713 na Capital. Critério: Adesão pública à Pauta Animalista 2026.\n\n`;

      if (contextData) {
        contextText += `=== CONTEXTO DINÂMICO ENVIADO PELO USUÁRIO ===\n`;
        if (contextData.currentEstadualCand) {
          contextText += `Candidato Estadual em foco: ${contextData.currentEstadualCand.nome} (${contextData.currentEstadualCand.numero} - ${contextData.currentEstadualCand.partido})\n`;
        }
        if (contextData.totalEstadualVotosEstado) {
          contextText += `Total votos no Estado: ${contextData.totalEstadualVotosEstado.toLocaleString('pt-BR')} em ${contextData.munCountWithEstadual || 630} municípios.\n`;
        }
        if (contextData.totalEstadualVotosCapital) {
          contextText += `Total votos na Capital: ${contextData.totalEstadualVotosCapital.toLocaleString('pt-BR')} em ${contextData.secoesCountWithEstadual || 16878} seções.\n`;
        }
        if (contextData.topFederaisEstado && Array.isArray(contextData.topFederaisEstado)) {
          contextText += `Ranking Top Federais no Estado (nas cidades do candidato):\n`;
          contextData.topFederaisEstado.slice(0, 10).forEach((t: any, i: number) => {
            contextText += `  ${i+1}º ${t.nome} (${t.partido} - ${t.numero}): ${Number(t.votos).toLocaleString('pt-BR')} votos [${t.criterio}]\n`;
          });
        }
        if (contextData.topFederaisCapital && Array.isArray(contextData.topFederaisCapital)) {
          contextText += `Ranking Top Federais na Capital (nas urnas do candidato):\n`;
          contextData.topFederaisCapital.slice(0, 10).forEach((t: any, i: number) => {
            contextText += `  ${i+1}º ${t.nome} (${t.partido} - ${t.numero}): ${Number(t.votos).toLocaleString('pt-BR')} votos [${t.criterio}]\n`;
          });
        }
        if (contextData.extraNotes) {
          contextText += `Notas territoriais: ${contextData.extraNotes}\n`;
        }
      }

      const systemInstruction = `Você é o Analista Eleitoral Especialista em Inteligência Geográfica das Eleições Gerais de SP (Foco: Causa Animal, Rafael Saraiva e Candidaturas Monitoradas).
Seu papel é responder dúvidas de estrategistas de campanha e coordenadores políticos de forma direta, analítica, fundamentada, inteligente e proativa.

IMPORTANTE - CAPACIDADES GEOGRÁFICAS E INFRAESTRUTURA DE DADOS COMPLETA DA CAPITAL DE SP:
O sistema POSSUI SIM o mapeamento oficial completo dos 2.057 Colégios Eleitorais / Escolas de Votação da Capital de SP, com o nome oficial da escola, o endereço de rua completo, o bairro, o CEP, a zona eleitoral, as seções e a votação de cada candidato.
Também possui o cadastro oficial de 899 Bairros, 58 Zonas Eleitorais e 26.683 Seções Eleitorais na Capital de São Paulo, além do mapa de mobilização e apoiadores por rua/CEP no CRM.

REGRA DE BUSCA PROATIVA DE COLÉGIOS E ENDEREÇOS (CRÍTICA):
1. SE O USUÁRIO PERGUNTAR POR UM COLÉGIO, ESCOLA, RUA OU BAIRRO (ex: "Colégio Batalha", "Escola Anchieta", "Padre Anchieta", "Rua Maria Cândida"):
   - JAMAIS responda de forma seca dizendo "não localizamos um registro com este nome exato".
   - Apresente PROATIVAMENTE todos os colégios e locais de votação trazidos na lista do contexto que contêm ou se aproximam do termo buscado (mesmo com variações de grafia, abreviações, siglas ou sufixos como "COL. BATALHA", "COLEGIO BATALHA - UNIDADE II", "EE BATALHA").
   - Para CADA local/colégio correspondente, exiba os dados completos:
     * **Nome da Escola/Colégio**
     * **Endereço Completo de Rua**
     * **Bairro e Zona Eleitoral**
     * **Número de Seções e Eleitores Aptos**
     * **Votação dos Candidatos (Rafael Saraiva, Nina Passadore, etc.)**
   - Se houver 2 ou mais unidades ou escolas encontradas, apresente os resultados de todas elas de forma organizada (em tópicos ou tabela comparativa) e pergunte amigavelmente de forma proativa sobre qual unidade ou região específica o usuário deseja detalhar ou comparar mais a fundo!

REGRAS DE OURO DA ANÁLISE ELEITORAL:
1. SIGILO CONSTITUCIONAL DO VOTO (Art. 14 da CF/88):
   - A urna eletrônica brasileira é 100% sigilosa. O TSE NÃO armazena o voto individual cruzado entre federal e estadual.
   - NUNCA diga que o eleitor de Rafael votou em X ou Y.
   - DIGA SEMPRE: "Nos mesmos colégios eleitorais / urnas da Capital ou municípios do Estado onde Rafael Saraiva obteve votos, os federais mais votados foram...". É uma métrica de co-ocorrência geográfica e preferência territorial.
2. POR QUE A SOMA SUPERA OS VOTOS DE RAFAEL:
   - Em cada urna votam de 300 a 400 eleitores, e em cada cidade votam dezenas de milhares. Quando somamos os votos de um deputado federal em todas as 16.878 urnas ou 630 municípios de Rafael, contabilizamos TODOS os eleitores dessas urnas/cidades, e não só quem votou em Rafael.
3. CRITÉRIOS DE INCLUSÃO (DISTINÇÃO OBRIGATÓRIA):
   - 'Atuação/Campanha Animal Documentada': Candidatos com mandato e histórico focado na causa (Delegado Bruno Lima, Felipe Becari, Bruno Ganem, Richard Selvagem, Nina Passadore, Dra. Ana Veterinária).
   - 'Adesão Pública à Pauta Animalista 2026': Deputados de bancadas partidárias amplas (PSOL, PT) que assinaram termo formal de apoio (Profa. Luciene Cavalcante, Alencar Santana, Nilto Tatto, Edinho Silva). Esses nomes têm alta votação partidária geral.
4. ESTILO DA RESPOSTA:
   - Responda em português brasileiro culto, claro, proativo e acolhedor.
   - Destaque números, escolas, endereços de rua, bairros, zonas e nomes em **negrito**.
   - Use tópicos com marcadores e pequenas tabelas comparativas quando ajudar a clareza.
   - Sempre que o usuário mencionar uma rua, bairro ou escola, liste as escolas/locais eleitorais correspondentes com endereço, zona e votos.`;

      let promptPayload = `${contextText}\n\n=== PERGUNTA DO USUÁRIO ===\n${question.trim()}`;

      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        promptPayload += `\n\n=== HISTÓRICO RECENTE DA CONVERSA ===\n`;
        conversationHistory.slice(-4).forEach(h => {
          promptPayload += `${h.role === 'user' ? 'Usuário' : 'Analista IA'}: ${h.text}\n`;
        });
      }

      let generatedText = '';
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let lastErr: any = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptPayload,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.2
            }
          });
          if (response && response.text) {
            generatedText = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`Model ${modelName} call failed, attempting fallback to next model:`, mErr?.message || mErr);
          lastErr = mErr;
        }
      }

      if (!generatedText) {
        throw new Error(lastErr?.message || "Não foi possível obter resposta com os modelos de IA disponíveis.");
      }

      return res.json({
        success: true,
        answer: generatedText,
        question: question.trim(),
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Erro na rota /api/causa-animal/ai-query:", err);
      return res.status(500).json({
        error: "Falha ao processar consulta pela IA: " + (err?.message || "Erro desconhecido")
      });
    }
  });

  app.get('/api/material', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM material_campaign ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(materialData);
  });

  app.post('/api/material', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const rawGeo = sanitizeGeo(req.body.cidade, req.body.estado, req.body.cep);
    const data = { ...req.body, id, createdAt, cidade: rawGeo.cidade, estado: rawGeo.estado };
    
    // Validação estrita de SP para material impresso (CEPs entre 01000-000 e 19999-999)
    if (data.tipoMaterial === 'impresso') {
      const cleanCep = (data.cep || '').replace(/\D/g, '');
      const numCep = parseInt(cleanCep, 10);
      if (cleanCep.length !== 8 || isNaN(numCep) || numCep < 1000000 || numCep > 19999999 || data.estado !== 'SP') {
        return res.status(400).json({ error: "A entrega de material impresso é exclusiva para o Estado de São Paulo (CEPs de SP entre 01000-000 e 19999-999)." });
      }
    }

    if (db) {
      try {
        await db.query(
          `INSERT INTO material_campaign (id, nome, sobrenome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, tipoMaterial, adesivoPerfurado, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nome, data.sobrenome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento || '', data.bairro, data.cidade, data.estado, data.tipoMaterial, data.adesivoPerfurado ? 1 : 0, createdAt]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: `${data.nome || ''} ${data.sobrenome || ''}`.trim() || 'Apoiador Material',
          whatsapp: data.whatsapp,
          email: data.email,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          campaignName: 'Material Oficial',
          source: 'MATERIAL',
          createdAt
        }).catch(err => console.error("Erro ao sincronizar Material no CRM:", err));

        return res.json({ success: true, data });
      } catch (err) {
        console.error("DB Insert error:", err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    materialData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/material/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM material_campaign WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = materialData.findIndex(p => p.id === id);
    if (idx !== -1) materialData.splice(idx, 1);
    res.json({ success: true });
  });

  app.post('/api/material/batch-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido" });
    }
    if (db) {
      try {
        const placeholders = ids.map(() => '?').join(',');
        await db.query(`DELETE FROM material_campaign WHERE id IN (${placeholders})`, ids);
        return res.json({ success: true, count: ids.length });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idSet = new Set(ids);
    for (let i = materialData.length - 1; i >= 0; i--) {
      if (idSet.has(materialData[i].id)) {
        materialData.splice(i, 1);
      }
    }
    res.json({ success: true, count: ids.length });
  });

  app.get('/api/ninapassadore', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM ninapassadore_campaign ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(ninapassadoreData);
  });

  app.post('/api/ninapassadore', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const rawGeo = sanitizeGeo(req.body.cidade, req.body.estado, req.body.cep);
    const data = { ...req.body, id, createdAt, cidade: rawGeo.cidade, estado: rawGeo.estado };
    
    // Validação estrita de SP para material impresso (CEPs entre 01000-000 e 19999-999)
    if (data.tipoMaterial === 'impresso') {
      const cleanCep = (data.cep || '').replace(/\D/g, '');
      const numCep = parseInt(cleanCep, 10);
      if (cleanCep.length !== 8 || isNaN(numCep) || numCep < 1000000 || numCep > 19999999 || data.estado !== 'SP') {
        return res.status(400).json({ error: "A entrega de material impresso é exclusiva para o Estado de São Paulo (CEPs de SP entre 01000-000 e 19999-999)." });
      }
    }

    if (db) {
      try {
        await db.query(
          `INSERT INTO ninapassadore_campaign (id, nome, sobrenome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, tipoMaterial, adesivoPerfurado, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nome, data.sobrenome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento || '', data.bairro, data.cidade, data.estado, data.tipoMaterial, data.adesivoPerfurado ? 1 : 0, createdAt]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: `${data.nome || ''} ${data.sobrenome || ''}`.trim() || 'Apoiador Nina',
          whatsapp: data.whatsapp,
          email: data.email,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          campaignName: 'Maus-Tratos (Nina)',
          source: 'NINA',
          createdAt
        }).catch(err => console.error("Erro ao sincronizar Nina no CRM:", err));

        return res.json({ success: true, data });
      } catch (err) {
        console.error("DB Insert error:", err);
        return res.status(500).json({ error: "DB erro" });
      }
    }
    ninapassadoreData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/ninapassadore/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM ninapassadore_campaign WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = ninapassadoreData.findIndex(p => p.id === id);
    if (idx !== -1) ninapassadoreData.splice(idx, 1);
    res.json({ success: true });
  });

  app.post('/api/ninapassadore/batch-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido" });
    }
    if (db) {
      try {
        const placeholders = ids.map(() => '?').join(',');
        await db.query(`DELETE FROM ninapassadore_campaign WHERE id IN (${placeholders})`, ids);
        return res.json({ success: true, count: ids.length });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idSet = new Set(ids);
    for (let i = ninapassadoreData.length - 1; i >= 0; i--) {
      if (idSet.has(ninapassadoreData[i].id)) {
        ninapassadoreData.splice(i, 1);
      }
    }
    res.json({ success: true, count: ids.length });
  });

  // API routing for petitions

  app.get('/api/petitions', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM petitions ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(petitionsData);
  });

  app.post('/api/petitions', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    if (db) {
      try {
        await db.query(
          `INSERT INTO petitions (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento, data.bairro, data.cidade, data.estado, createdAt]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          campaignName: 'Abaixo-Assinado',
          source: 'PETITION',
          createdAt
        }).catch(err => console.error("Erro ao sincronizar Abaixo-Assinado no CRM:", err));

        return res.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    petitionsData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/petitions/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM petitions WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = petitionsData.findIndex(p => p.id === id);
    if (idx !== -1) petitionsData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routing for contra-maus-tratos
  app.get('/api/contra-maus-tratos', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM contra_maus_tratos ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(contraMausTratosData);
  });

  app.post('/api/contra-maus-tratos', async (req, res) => {
    const rawGeo = sanitizeGeo(req.body.cidade, req.body.estado, req.body.cep);
    const data = { ...req.body, cidade: rawGeo.cidade, estado: rawGeo.estado };
    if (db) {
      try {
        await db.query(
          'INSERT INTO contra_maus_tratos (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.nome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento, data.bairro, data.cidade, data.estado]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          campaignName: 'Contra Maus-Tratos',
          source: 'MAUS_TRATOS',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        }).catch(err => console.error("Erro ao sincronizar Contra Maus-Tratos no CRM:", err));

        return res.json({ success: true, data });
      } catch (err) {
        return res.status(500).json({ error: "DB erro", details: err });
      }
    }
    contraMausTratosData.push({
      ...data,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, data });
  });

  app.delete('/api/contra-maus-tratos/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM contra_maus_tratos WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = contraMausTratosData.findIndex(p => p.id === id);
    if (idx !== -1) contraMausTratosData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routing for citizens
  app.get('/api/citizens', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM citizens ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(citizensData);
  });

  app.post('/api/citizens', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const rawGeo = sanitizeGeo(req.body.cidade, req.body.estado, req.body.cep);
    const data = { ...req.body, id, createdAt, cidade: rawGeo.cidade, estado: rawGeo.estado };
    
    if (db) {
      try {
        await db.query(
          `INSERT INTO citizens (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.nome,
            data.whatsapp || '',
            data.email || '',
            data.cep || '',
            data.endereco || '',
            data.numero || '',
            data.complemento || '',
            data.bairro || '',
            data.cidade,
            data.estado,
            createdAt
          ]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          campaignName: 'Projeto de Lei',
          source: 'CITIZEN',
          createdAt
        }).catch(err => console.error("Erro ao sincronizar Projeto de Lei no CRM:", err));

        return res.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    citizensData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/citizens/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM citizens WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = citizensData.findIndex(c => c.id === id);
    if (idx !== -1) citizensData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routing for popup-apoio (Pop-up de Apoio da Capital SP)
  app.get('/api/popup-apoio', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM popup_apoio ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(popupApoioData);
  });

  app.post('/api/popup-apoio', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    // Validação estrita: apenas CEPs do Estado de São Paulo (01000-000 a 19999-999)
    const cleanCep = (data.cep || '').replace(/\D/g, '');
    if (cleanCep) {
      const numCep = parseInt(cleanCep, 10);
      if (cleanCep.length !== 8 || isNaN(numCep) || numCep < 1000000 || numCep > 19999999) {
        return res.status(400).json({ error: "Cadastro exclusivo para residentes do Estado de São Paulo (CEPs de SP entre 01000-000 e 19999-999)." });
      }
    }

    const rawGeo = sanitizeGeo(data.cidade, data.estado, data.cep);
    data.cidade = rawGeo.cidade;
    data.estado = rawGeo.estado;

    if (db) {
      try {
        await db.query(
          `INSERT INTO popup_apoio (id, nome, whatsapp, email, cep, endereco, bairro, cidade, estado, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.nome,
            data.whatsapp || '',
            data.email || '',
            data.cep || '',
            data.endereco || '',
            data.bairro || '',
            data.cidade,
            data.estado,
            createdAt
          ]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email,
          cep: data.cep,
          endereco: data.endereco,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          campaignName: 'Apoio Capital',
          source: 'POPUP',
          createdAt
        }).catch(err => console.error("Erro ao sincronizar Apoio Capital no CRM:", err));

        return res.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    popupApoioData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/popup-apoio/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM popup_apoio WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = popupApoioData.findIndex(c => c.id === id);
    if (idx !== -1) popupApoioData.splice(idx, 1);
    res.json({ success: true });
  });

  function fixMojibake(str?: string | null): string {
    if (!str) return '';
    return str
      .replace(/Ã£|ã£/g, 'ã')
      .replace(/Ã§|ã§/g, 'ç')
      .replace(/Ã¡|ã¡/g, 'á')
      .replace(/Ã©|ã©/g, 'é')
      .replace(/Ã­|ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/ã³/g, 'ó')
      .replace(/Ãº|ãº/g, 'ú')
      .replace(/Ã¢|ã¢/g, 'â')
      .replace(/Ãª|ãª/g, 'ê')
      .replace(/Ã´|ã´/g, 'ô')
      .replace(/Ãµ|ãµ/g, 'õ')
      .replace(/Ã€|ã€/g, 'À')
      .replace(/Ã\x81/g, 'Á')
      .replace(/Ã/g, 'Á')
      .replace(/â€™/g, "'")
      .replace(/â€“/g, "-")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"');
  }

  function sanitizeLeadFields(r: any) {
    if (!r) return r;
    return {
      ...r,
      nome: fixMojibake(r.nome),
      cidade: fixMojibake(r.cidade),
      bairro: fixMojibake(r.bairro),
      endereco: fixMojibake(r.endereco),
      complemento: fixMojibake(r.complemento)
    };
  }

  // API routing for imported-leads (Uploads de bases CSV)
  app.get('/api/imported-leads', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM imported_leads ORDER BY createdAt DESC');
        return res.json((rows as any[]).map(sanitizeLeadFields));
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(importedLeadsData.map(sanitizeLeadFields));
  });

  let importRefreshTimer: NodeJS.Timeout | null = null;

  app.post('/api/imported-leads/bulk', async (req, res) => {
    const { leads, campanha, updateMode = 'merge', isFirstBatch = false } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: "Nenhum lead fornecido para importação." });
    }
    if (!campanha || !campanha.trim()) {
      return res.status(400).json({ error: "O nome da campanha é obrigatório." });
    }

    if (!db) {
      db = await getDbConnection();
    }

    const campaignName = campanha.trim();

    // Se o usuário optou por 'replace' (substituir base inteira) no primeiro lote
    if (updateMode === 'replace' && isFirstBatch && db) {
      try {
        console.log(`🗑️ Modo Substituição: limpando registros anteriores da campanha "${campaignName}"...`);
        await db.query(`DELETE FROM imported_leads WHERE campanha = ?`, [campaignName]);
        await db.query(`DELETE FROM crm_actions WHERE campaign_name = ?`, [campaignName]);
      } catch (err) {
        console.error("Erro ao limpar base para substituição:", err);
      }
    }

    const insertedRecords: any[] = [];
    for (const item of leads) {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const rawCity = (item.cidade || item.municipio || 'São Paulo').trim();
      const rawState = (item.estado || item.uf || 'SP').trim();
      const rawCep = (item.cep || '').trim();
      const { cidade: cleanCidade, estado: cleanEstado } = sanitizeGeo(rawCity, rawState, rawCep);

      const record = {
        id,
        nome: (item.nome || item.name || item.nomeCompleto || 'Sem Nome').trim(),
        whatsapp: (item.whatsapp || item.telefone || item.celular || item.phone || '').trim(),
        email: (item.email || item.mail || '').trim(),
        cep: rawCep,
        endereco: (item.endereco || item.logradouro || item.rua || '').trim(),
        numero: (item.numero || '').trim(),
        complemento: (item.complemento || '').trim(),
        bairro: (item.bairro || '').trim(),
        cidade: cleanCidade,
        estado: cleanEstado,
        campanha: campaignName,
        origem: 'Importação CSV',
        createdAt,
        extraData: JSON.stringify({ ...(item.extraData || {}), adesivos: item.adesivos, adesivoPerfurado: item.adesivoPerfurado })
      };

      if (!db) {
        importedLeadsData.push(record);
      }
      insertedRecords.push(record);
    }

    let updatedCount = 0;
    let newCount = insertedRecords.length;

    if (db && insertedRecords.length > 0) {
      try {
        const phoneList = insertedRecords.map(r => r.whatsapp).filter(w => Boolean(w) && w.length >= 8);
        const emailList = insertedRecords.map(r => r.email).filter(e => Boolean(e) && e.includes('@') && !e.includes('@fake'));

        const existingByContact = new Map<string, any>();
        if (phoneList.length > 0 || emailList.length > 0) {
          const whereOr: string[] = [];
          const params: any[] = [campaignName];
          if (phoneList.length > 0) {
            whereOr.push('whatsapp IN (?)');
            params.push(phoneList);
          }
          if (emailList.length > 0) {
            whereOr.push('email IN (?)');
            params.push(emailList);
          }

          const [existingRows]: any = await db.query(
            `SELECT id, whatsapp, email, nome, cep, endereco, numero, complemento, bairro, cidade, estado, createdAt, extraData FROM imported_leads WHERE campanha = ? AND (${whereOr.join(' OR ')})`,
            params
          );

          for (const er of existingRows) {
            if (er.whatsapp) existingByContact.set(`p_${er.whatsapp}`, er);
            if (er.email) existingByContact.set(`e_${er.email.toLowerCase()}`, er);
          }
        }

        const idsToDelete: string[] = [];
        const finalRecordsToInsert: any[] = [];

        for (const record of insertedRecords) {
          const phoneKey = record.whatsapp ? `p_${record.whatsapp}` : null;
          const emailKey = record.email ? `e_${record.email.toLowerCase()}` : null;
          const existing = (phoneKey && existingByContact.get(phoneKey)) || (emailKey && existingByContact.get(emailKey));

          if (existing && updateMode !== 'append') {
            // Contato já cadastrado nesta base: mesclar e atualizar dados sem duplicar
            updatedCount++;
            idsToDelete.push(existing.id);

            const mergedRecord = {
              id: existing.id,
              nome: (record.nome && record.nome !== 'Sem Nome' && record.nome !== 'Apoiador Importado') ? record.nome : (existing.nome || 'Sem Nome'),
              whatsapp: record.whatsapp || existing.whatsapp,
              email: record.email || existing.email,
              cep: record.cep || existing.cep,
              endereco: record.endereco || existing.endereco,
              numero: record.numero || existing.numero,
              complemento: record.complemento || existing.complemento,
              bairro: record.bairro || existing.bairro,
              cidade: (record.cidade && record.cidade !== 'São Paulo') ? record.cidade : (existing.cidade || 'São Paulo'),
              estado: record.estado || existing.estado || 'SP',
              campanha: campaignName,
              origem: 'Importação CSV',
              createdAt: existing.createdAt || record.createdAt,
              extraData: record.extraData || existing.extraData
            };

            finalRecordsToInsert.push([
              mergedRecord.id,
              mergedRecord.nome,
              mergedRecord.whatsapp,
              mergedRecord.email,
              mergedRecord.cep,
              mergedRecord.endereco,
              mergedRecord.numero,
              mergedRecord.complemento,
              mergedRecord.bairro,
              mergedRecord.cidade,
              mergedRecord.estado,
              mergedRecord.campanha,
              mergedRecord.origem,
              mergedRecord.createdAt,
              mergedRecord.extraData
            ]);
          } else {
            // Novo contato nesta base
            finalRecordsToInsert.push([
              record.id,
              record.nome,
              record.whatsapp,
              record.email,
              record.cep,
              record.endereco,
              record.numero,
              record.complemento,
              record.bairro,
              record.cidade,
              record.estado,
              record.campanha,
              record.origem,
              record.createdAt,
              record.extraData
            ]);
          }
        }

        newCount = finalRecordsToInsert.length - updatedCount;

        // Se houver registros repetidos para atualizar, removemos as versões antigas antes da re-inserção consolidada
        if (idsToDelete.length > 0) {
          const CHUNK_DEL = 1000;
          for (let i = 0; i < idsToDelete.length; i += CHUNK_DEL) {
            const delChunk = idsToDelete.slice(i, i + CHUNK_DEL);
            await db.query(`DELETE FROM imported_leads WHERE id IN (?)`, [delChunk]);
          }
        }

        // Gravação dos registros finais no MySQL
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < finalRecordsToInsert.length; i += CHUNK_SIZE) {
          const chunk = finalRecordsToInsert.slice(i, i + CHUNK_SIZE);
          await db.query(
            `INSERT INTO imported_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, origem, createdAt, extraData) VALUES ?`,
            [chunk]
          );
        }
      } catch (e: any) {
        console.error("Erro ao inserir leads importados em lote no MySQL:", e);
        return res.status(500).json({ error: "Erro ao gravar no banco: " + (e?.message || 'Falha no MySQL') });
      }
    } else if (!db) {
      saveImportedLeadsToDisk();
    }

    // Debounce consolidation: sincroniza com o CRM e consolidador após término dos lotes
    if (importRefreshTimer) clearTimeout(importRefreshTimer);
    importRefreshTimer = setTimeout(async () => {
      console.log(`🔄 Disparando sincronização no CRM para campanha "${campaignName}"...`);
      await syncCampaignToCrm(campaignName);
      leadsConsolidator.refresh().catch(err => console.error("Erro ao atualizar consolidador após importação:", err));
    }, 3000);

    return res.json({
      success: true,
      count: insertedRecords.length,
      updatedCount,
      newCount,
      campanha: campaignName
    });
  });


  const deletingCampaigns = new Set<string>();

  app.get('/api/imported-leads/campaigns', async (req, res) => {
    try {
      const db = await getDbConnection();
      const [rows] = await db.query('SELECT campaign_name as campanha, COUNT(*) as count, MAX(created_at) as lastImport FROM crm_actions GROUP BY campaign_name ORDER BY lastImport DESC');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: "DB erro" });
    }
  });

  app.delete('/api/imported-leads/campaign/:campaignName', async (req, res) => {
    const campaignName = req.params.campaignName;
    if (!campaignName) {
      return res.status(400).json({ error: "Nome de campanha inválido" });
    }

    // 1. Marca imediatamente como em exclusão para não aparecer em mais nenhuma listagem
    deletingCampaigns.add(campaignName);

    // 2. Remove imediatamente do consolidado em memória e atualiza sumário
    try {
      leadsConsolidator.removeCampaign(campaignName);
    } catch (err) {
      console.error('Erro ao remover campanha da consolidação:', err);
    }

    // 3. Remove do fallback em memória
    const filtered = importedLeadsData.filter(lead => lead.campanha !== campaignName);
    importedLeadsData.length = 0;
    importedLeadsData.push(...filtered);

    // 4. Se tiver MySQL conectado, efetua a limpeza no banco em segundo plano via lotes para resposta instantânea
    if (db) {
      (async () => {
        try {
          const start = Date.now();
          let totalDeleted = 0;
          const CHUNK = 15000;
          while (true) {
            const [delResult]: any = await db.query(
              'DELETE FROM imported_leads WHERE campanha = ? LIMIT ?',
              [campaignName, CHUNK]
            );
            const affected = delResult?.affectedRows || 0;
            totalDeleted += affected;
            if (affected === 0) break;
            await new Promise(r => setTimeout(r, 40));
          }

          // Also remove from crm_actions and recount crm_leads so deleted campaigns are automatically discarded
          await db.query('DELETE FROM crm_actions WHERE campaign_name = ?', [campaignName]);
          await db.query(`
            UPDATE crm_leads l
            LEFT JOIN (
              SELECT lead_id, COUNT(DISTINCT campaign_name) as real_count
              FROM crm_actions
              GROUP BY lead_id
            ) a ON l.id = a.lead_id
            SET l.campaign_count = COALESCE(a.real_count, 0)
          `);

          console.log(`🗑️ Exclusão concluída: ${totalDeleted} leads da campanha "${campaignName}" removidos do MySQL e CRM em ${Date.now() - start}ms.`);
        } catch (err) {
          console.error(`Erro ao deletar registros da campanha "${campaignName}" no MySQL:`, err);
        } finally {
          deletingCampaigns.delete(campaignName);
        }
      })();

      return res.json({ success: true, message: `Campanha "${campaignName}" excluída.` });
    }

    saveImportedLeadsToDisk();
    deletingCampaigns.delete(campaignName);
    return res.json({ success: true });
  });

  app.delete('/api/imported-leads/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM imported_leads WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = importedLeadsData.findIndex(c => c.id === id);
    if (idx !== -1) {
      importedLeadsData.splice(idx, 1);
      saveImportedLeadsToDisk();
    }
    res.json({ success: true });
  });

  // High-performance Consolidated Leads Endpoints
  app.get('/api/leads/summary', async (req, res) => {
    try {
      const summary = await getCrmSummary();
      return res.json(summary);
    } catch (err) {
      console.error("Error in /api/leads/summary:", err);
      return res.status(500).json({ error: "Erro ao obter resumo de leads", details: String(err) });
    }
  });

  app.get('/api/leads/paginated', async (req, res) => {
    try {
      const result = await getCrmPaginated(req.query);
      return res.json(result);
    } catch (err: any) {
      console.error("Error in /api/leads/paginated:", err);
      if (err?.code === 'ECONNRESET' || err?.message?.includes('ECONNRESET')) {
        try {
          console.log("Retrying /api/leads/paginated after ECONNRESET...");
          const retryResult = await getCrmPaginated(req.query);
          return res.json(retryResult);
        } catch (retryErr) {
          console.error("Retry failed in /api/leads/paginated:", retryErr);
        }
      }
      return res.status(500).json({ error: "Erro ao paginar leads", details: String(err) });
    }
  });

  // Exclusão definitiva de lead de todo o banco de dados e servidor
  app.delete('/api/leads/:id', async (req, res) => {
    const leadId = req.params.id;
    if (!leadId) {
      return res.status(400).json({ error: "ID do lead é obrigatório" });
    }

    try {
      const result = await deleteLeadById(leadId);

      // Limpar de fallbacks em memória se existirem
      const pIdx = popupApoioData.findIndex(p => p.id === leadId);
      if (pIdx !== -1) popupApoioData.splice(pIdx, 1);

      const mIdx = materialData.findIndex(m => m.id === leadId);
      if (mIdx !== -1) materialData.splice(mIdx, 1);

      const nIdx = ninapassadoreData.findIndex(n => n.id === leadId);
      if (nIdx !== -1) ninapassadoreData.splice(nIdx, 1);

      const impIdx = importedLeadsData.findIndex(i => i.id === leadId);
      if (impIdx !== -1) {
        importedLeadsData.splice(impIdx, 1);
        saveImportedLeadsToDisk();
      }

      return res.json({ success: true, message: "Lead excluído em definitivo de todos os registros." });
    } catch (err: any) {
      console.error("Erro ao excluir lead:", err);
      return res.status(500).json({ error: "Erro ao excluir lead: " + (err?.message || 'Falha no servidor') });
    }
  });

  app.get('/api/leads/physical-materials', async (req, res) => {
    try {
      const result = await leadsConsolidator.getPhysicalMaterials((req.query.adesivoFilter as any) || 'ALL');
      return res.json(result);
    } catch (err) {
      console.error("Error in /api/leads/physical-materials:", err);
      return res.status(500).json({ error: "Erro ao buscar materiais físicos" });
    }
  });

  app.get('/api/leads/export', async (req, res) => {
    try {
      let format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
      const maxLimit = parseInt(String(req.query.limit || '0'), 10);

      // Proteção contra crash de memória e limite de 1M de linhas do Excel:
      // O formato XLSX consome centenas de megabytes em memória se montado para bases gigantes.
      // Para bases sem limite (1,1 milhão de leads) ou maiores de 50.000, utilizamos automaticamente CSV com streaming contínuo.
      if (format === 'xlsx' && (maxLimit === 0 || maxLimit > 50000)) {
        format = 'csv';
      }

      const isAddressOnly = req.query.addressOnly === 'true';
      const filename = isAddressOnly
        ? `enderecos_correios_${new Date().toISOString().slice(0, 10)}.${format}`
        : `leads_consolidados_${new Date().toISOString().slice(0, 10)}.${format}`;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        await exportCrmStream(req.query as any, res);
        return;
      }

      const buffer = await exportCrmXlsx(req.query as any);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      console.error("Error in /api/leads/export:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Erro ao exportar leads" });
      } else {
        res.end();
      }
    }
  });

  app.get('/api/leads/export-materials', async (req, res) => {
    try {
      const adesivoFilter = (req.query.adesivoFilter as any) || 'ALL';
      const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
      const filename = `materiais_fisicos_${adesivoFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.${format}`;

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.flushHeaders();
        await leadsConsolidator.streamCsvExportMaterials(adesivoFilter, res);
        return;
      }

      const buffer = await leadsConsolidator.exportMaterialsXlsx(adesivoFilter);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      console.error("Error in /api/leads/export-materials:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Erro ao exportar materiais" });
      } else {
        res.end();
      }
    }
  });

  // Keep-alive progress stream that forces Cloud Run to stay awake with 100% CPU priority until cache write completes
  app.get('/api/leads/refresh-cache-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Trigger refresh if not currently running
    leadsConsolidator.refreshFromDatabase().catch(err => {
      console.error('Error in refresh-cache-stream:', err);
    });

    // Send heartbeat every 2 seconds to keep connection actively transferring bytes
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 2000);

    const unsubscribe = leadsConsolidator.subscribeRefreshProgress((state) => {
      try {
        res.write(`data: ${JSON.stringify(state)}\n\n`);
        if (!state.isRefreshing && state.isReady && state.message.includes('pronto')) {
          clearInterval(heartbeat);
          unsubscribe();
          res.end();
        }
      } catch {
        clearInterval(heartbeat);
        unsubscribe();
      }
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.post('/api/leads/refresh-cache', async (req, res) => {
    try {
      // Trigger refresh
      leadsConsolidator.refreshFromDatabase().catch(console.error);
      return res.json({ success: true, message: "Atualização disparada com sucesso." });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao disparar atualização de leads" });
    }
  });

  // Legacy Consolidated Leads Endpoint (optimizado)
  app.get('/api/leads/consolidated', async (req, res) => {
    try {
      // Returns high-performance summary & page 1 to prevent client crashes
      const summary = leadsConsolidator.getSummary();
      const page1 = await leadsConsolidator.getPaginatedLeads({ page: 1, pageSize: 100 });
      return res.json({
        summary,
        leads: page1.leads,
        total: page1.totalFiltered
      });
    } catch (err) {
      console.error("Error in /api/leads/consolidated:", err);
      return res.status(500).json({ error: "Erro ao consolidar leads" });
    }
  });


  // Jogo Users
  app.post('/api/jogo/register', async (req, res) => {
    const { nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado } = req.body;
    if (usuario && usuario.includes('@')) {
      return res.status(400).json({ error: "O nome de usuário não pode ser um e-mail" });
    }
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const rawGeo = sanitizeGeo(cidade, estado, cep);
    const cleanCidade = rawGeo.cidade;
    const cleanEstado = rawGeo.estado;

    if (db) {
      try {
        await db.query(
          'INSERT INTO jogo_users (id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, nomeCompleto, usuario, senha, email, whatsapp, cep, cleanCidade, cleanEstado]
        );

        // Atualiza imediatamente o CRM com deduplicação e contagem
        recordLeadAction({
          nome: nomeCompleto,
          whatsapp: whatsapp,
          email: email,
          cep: cep,
          cidade: cleanCidade,
          estado: cleanEstado,
          campaignName: 'Jogo Resgate',
          source: 'JOGO',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        }).catch(err => console.error("Erro ao sincronizar Jogo no CRM:", err));

        return res.json({ success: true, data: { id, nomeCompleto, usuario, email, whatsapp, cep, cidade: cleanCidade, estado: cleanEstado } });
      } catch (err) {
        console.error(err);
        return res.status(400).json({ error: "Usuário já existe ou erro no DB" });
      }
    }
    return res.status(500).json({ error: "DB offline" });
  });

  app.post('/api/jogo/login', async (req, res) => {
    const { usuario, senha } = req.body;
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM jogo_users WHERE (usuario = ? OR email = ?) AND senha = ?', [usuario, usuario, senha]);
        if (rows.length > 0) {
          const user = rows[0];
          delete user.senha; // hide password
          return res.json({ success: true, data: user });
        } else {
          return res.status(401).json({ error: "Credenciais inválidas" });
        }
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.status(500).json({ error: "DB offline" });
  });

  app.get('/api/jogo/users', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query(`
          SELECT u.*, 
            (SELECT MAX(score) FROM jogo_scores s WHERE s.usuario = u.usuario) as maxScore,
            (SELECT COUNT(*) FROM jogo_scores s WHERE s.usuario = u.usuario) as playCount
          FROM jogo_users u 
          ORDER BY u.createdAt DESC
        `);
        return res.json(rows);
      } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json([]);
  });

  app.delete('/api/jogo/users/:id', async (req, res) => {
    if (db) {
      try {
        const [users] = await db.query('SELECT usuario FROM jogo_users WHERE id = ?', [req.params.id]);
        if (users && users.length > 0) {
          const usuario = users[0].usuario;
          await db.query('DELETE FROM jogo_scores WHERE usuario = ?', [usuario]);
        }
        await db.query('DELETE FROM jogo_users WHERE id = ?', [req.params.id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json({ success: true });
  });

  // API routing for Jogo
  app.get('/api/jogo/scores', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query(`
          SELECT MIN(id) as id, nome, MAX(cidade) as cidade, MAX(score) as score, MAX(createdAt) as createdAt, usuario 
          FROM jogo_scores 
          GROUP BY nome, usuario 
          ORDER BY score DESC 
          LIMIT 100
        `);
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const grouped = [...jogoScoresData].reduce((acc: any, curr) => {
      const key = curr.usuario || curr.nome;
      if (!acc[key] || acc[key].score < curr.score) {
        acc[key] = curr;
      }
      return acc;
    }, {});
    const sorted = Object.values(grouped).sort((a: any, b: any) => b.score - a.score).slice(0, 100);
    res.json(sorted);
  });

  app.post('/api/jogo/scores', async (req, res) => {
    let { nome, cidade, score, fase, usuario } = req.body;
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString();
    
    if (db) {
      try {
        if (usuario && usuario.includes('@')) {
          const trimmed = usuario.trim();
          const [users] = await db.query('SELECT usuario, nomeCompleto FROM jogo_users WHERE email = ? OR usuario = ?', [trimmed, trimmed]);
          if (users && users.length > 0) {
            usuario = users[0].usuario || users[0].nomeCompleto;
            nome = usuario;
          } else {
            usuario = "Jogador_" + id.substring(0, 5);
            nome = usuario;
          }
        }

        await db.query(
          'INSERT INTO jogo_scores (id, nome, cidade, score, fase, createdAt, usuario) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, nome, cidade, score, fase, createdAt, usuario]
        );
        return res.json({ success: true, data: { id, nome, cidade, score, fase, createdAt, usuario } });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const newScore = { id, nome, cidade, score, fase, createdAt };
    jogoScoresData.push(newScore);
    res.json({ success: true, data: newScore });
  });

  // API routing for cities
  app.get('/api/cities', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM protocols ORDER BY createdAt DESC');
        // Convert active from tinyint(1) if necessary
        return res.json((rows as any[]).map(r => ({ ...r, active: Boolean(r.active) })));
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(protocolsData);
  });

  app.get('/api/cities/:name', async (req, res) => {
    const cityName = req.params.name;
    
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM protocols WHERE name = ?', [cityName]);
        const protocols = (rows as any[]).map(r => ({ ...r, active: Boolean(r.active) }));
        const activeProtocol = protocols.find(p => p.status === 'protocolado' && p.active !== false);
        
        if (activeProtocol) {
          return res.json(activeProtocol);
        } else {
          return res.json({ name: cityName, state: "SP", status: "nao-protocolado" });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    const protocols = protocolsData.filter(p => p.name === cityName);
    const activeProtocol = protocols.find(p => p.status === 'protocolado' && p.active !== false);

    if (activeProtocol) {
      res.json(activeProtocol);
    } else {
      res.json({ name: cityName, state: "SP", status: "nao-protocolado" });
    }
  });

  app.post('/api/protocols', async (req, res) => {
    const { name, state, councillorName, role, email, whatsapp, protocolNumber, date, link, jaProtocolou } = req.body;
    if (!name) return res.status(400).json({ error: "City name required" });

    const status = jaProtocolou === 'sim' ? "protocolado" : "solicitado";
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const newProtocol = {
      id,
      name,
      state: state || "SP",
      councillorName,
      role,
      email,
      whatsapp,
      protocolNumber,
      date,
      link,
      jaProtocolou,
      status, // "protocolado" | "solicitado"
      active: false,
      createdAt
    };
    
    if (db) {
      try {
        await db.query(
          `INSERT INTO protocols (id, name, state, councillorName, role, email, whatsapp, protocolNumber, date, link, jaProtocolou, status, active, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, name, state || "SP", councillorName, role, email, whatsapp, protocolNumber, date, link, jaProtocolou, status, false, createdAt]
        );
        return res.json({ success: true, data: newProtocol });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    protocolsData.push(newProtocol);
    res.json({ success: true, data: newProtocol });
  });

  app.put('/api/protocols/:id/toggle-active', async (req, res) => {
    const id = req.params.id;
    
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM protocols WHERE id = ?', [id]);
        const protocolArray = rows as any[];
        if (protocolArray.length > 0) {
          const newActive = !protocolArray[0].active;
          await db.query('UPDATE protocols SET active = ? WHERE id = ?', [newActive, id]);
          return res.json({ success: true, data: { ...protocolArray[0], active: newActive } });
        } else {
          return res.status(404).json({ error: "Protocol not found" });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    const protocolIndex = protocolsData.findIndex(p => p.id === id);
    if (protocolIndex !== -1) {
      protocolsData[protocolIndex].active = !protocolsData[protocolIndex].active;
      res.json({ success: true, data: protocolsData[protocolIndex] });
    } else {
      res.status(404).json({ error: "Protocol not found" });
    }
  });

  app.delete('/api/protocols/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM protocols WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = protocolsData.findIndex(p => p.id === id);
    if (idx !== -1) protocolsData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/debug-db", (req, res) => {
    res.json({
      dbHost: process.env.DB_HOST || "not set",
      dbUser: process.env.DB_USER || "not set",
      dbName: process.env.DB_NAME || "not set",
      dbPort: process.env.DB_PORT || "not set",
      hasPassword: !!process.env.DB_PASSWORD,
    });
  });

  // Rota para a API de Conversões da Meta (CAPI)
  app.post("/api/events", async (req, res) => {
    const { eventName, eventUrl, userAgent, clientIp, fbp, fbc, eventId } = req.body;
    
    const token = process.env.META_CAPI_TOKEN;
    
    if (!token) {
      console.warn("META_CAPI_TOKEN não configurado. Evento não enviado para a CAPI.");
      return res.status(200).json({ success: false, message: "Token não configurado" });
    }

    try {
      // Usa o eventId enviado pelo frontend para garantir a desduplicação
      const finalEventId = eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const payload: any = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_id: finalEventId,
            event_source_url: eventUrl,
            user_data: {
              client_ip_address: clientIp || req.ip || req.headers['x-forwarded-for'],
              client_user_agent: userAgent || req.headers['user-agent'],
              fbp: fbp,
              fbc: fbc
            }
          }
        ]
      };

      // Adiciona o código de teste se estiver configurado nas variáveis de ambiente
      if (process.env.META_TEST_EVENT_CODE) {
        payload.test_event_code = process.env.META_TEST_EVENT_CODE;
      }

      const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Erro na Meta CAPI:", data);
        return res.status(400).json({ success: false, error: data });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Erro ao enviar evento para a Meta CAPI:", error);
      res.status(500).json({ success: false, error: "Erro interno do servidor" });
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom",
      });
      app.use(vite.middlewares);

      app.get('*all', async (req, res, next) => {
        try {
          let template = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);

          if (req.path.startsWith('/jogo')) {
            const jogoTitle = "Jogo do Mandato | Deputado Rafael Saraiva";
            const jogoDesc = "Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!";
            
            template = template.replace(/<title>.*?<\/title>/, `<title>${jogoTitle}</title>`);
            template = template.split('content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP"').join(`content="${jogoTitle}"`);
            template = template.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo. Conheça as propostas e o Instituto ELPA."').join(`content="${jogoDesc}"`);
            template = template.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo."').join(`content="${jogoDesc}"`);
            template = template.split('content="https://lh3.googleusercontent.com/d/14C1ToZx8KSE4oySqVSPnfI6l3OP2Lrhg"').join('content="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ"');
          }
          
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (err) {
      console.warn("Vite not found, falling back to static serving");
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distPath, { index: false }));
    
    app.get('*all', async (req, res, next) => {
      try {
        let html = await fs.promises.readFile(path.join(distPath, 'index.html'), 'utf-8');
        
        if (req.path.startsWith('/jogo')) {
          const jogoTitle = "Jogo do Mandato | Deputado Rafael Saraiva";
          const jogoDesc = "Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!";
          
          html = html.replace(/<title>.*?<\/title>/, `<title>${jogoTitle}</title>`);
          html = html.split('content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP"').join(`content="${jogoTitle}"`);
          html = html.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo. Conheça as propostas e o Instituto ELPA."').join(`content="${jogoDesc}"`);
          html = html.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo."').join(`content="${jogoDesc}"`);
          html = html.split('content="https://lh3.googleusercontent.com/d/14C1ToZx8KSE4oySqVSPnfI6l3OP2Lrhg"').join('content="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ"');
        }
        
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    leadsConsolidator.initializeInBackground().catch(err => {
      console.warn('Background leads consolidation notice:', err);
    });
  });
}

startServer();
