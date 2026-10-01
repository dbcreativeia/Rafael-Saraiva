export interface Candidato {
  cargo: 'GOVERNADOR' | 'SENADOR' | 'PRESIDENTE';
  numero: string;
  nomeUrna: string;
  nomeCompleto: string;
  partido: string;
  sqCandidato: string;
  fotoUrl: string;
}

// Candidatos aptos que a pessoa pode votar (Inserido na urna = SIM e candidaturas ativas)
export const CANDIDATOS_GOVERNADOR: Candidato[] = [
  {
    cargo: 'GOVERNADOR',
    numero: '10',
    nomeUrna: 'TARCÍSIO',
    nomeCompleto: 'TARCISIO GOMES DE FREITAS',
    partido: 'REPUBLICANOS',
    sqCandidato: '250002541303',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002541303.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'GOVERNADOR',
    numero: '13',
    nomeUrna: 'FERNANDO HADDAD',
    nomeCompleto: 'FERNANDO HADDAD',
    partido: 'PT',
    sqCandidato: '250002549705',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002549705.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'GOVERNADOR',
    numero: '16',
    nomeUrna: 'VERA LÚCIA',
    nomeCompleto: 'VERA LÚCIA PEREIRA DA SILVA SALGADO',
    partido: 'PSTU',
    sqCandidato: '250002536915',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002536915.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'GOVERNADOR',
    numero: '21',
    nomeUrna: 'CARLOS MACHADO',
    nomeCompleto: 'CARLOS ALBERTO MACHADO',
    partido: 'PCB',
    sqCandidato: '250002550913',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002550913.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'GOVERNADOR',
    numero: '29',
    nomeUrna: 'IZADORA DIAS',
    nomeCompleto: 'IZADORA CRISTINA DIAS DA SILVA',
    partido: 'PCO',
    sqCandidato: '250002553062',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002553062.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'GOVERNADOR',
    numero: '80',
    nomeUrna: 'VIVIAN MENDES',
    nomeCompleto: 'VIVIAN MENDES DA SILVA',
    partido: 'UP',
    sqCandidato: '250002544912',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002544912.jpg?w=161&h=225&crop=0&quality=100'
  }
];

export const CANDIDATOS_SENADOR: Candidato[] = [
  {
    cargo: 'SENADOR',
    numero: '111',
    nomeUrna: 'GUILHERME DERRITE',
    nomeCompleto: 'GUILHERME MURARO DERRITE',
    partido: 'PP',
    sqCandidato: '250002541312',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002541312.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '144',
    nomeUrna: 'GUTO SCHIAVETTO',
    nomeCompleto: 'RICARDO AUGUSTO MANGUE SCHIAVETTO',
    partido: 'MISSÃO',
    sqCandidato: '250002554075',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002554075.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '160',
    nomeUrna: 'WELLER GONÇALVES',
    nomeCompleto: 'WELLER PEREIRA GONÇALVES',
    partido: 'PSTU',
    sqCandidato: '250002541365',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002541365.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '161',
    nomeUrna: 'DRA ELIANA FERREIRA',
    nomeCompleto: 'ELIANA LUCIA FERREIRA',
    partido: 'PSTU',
    sqCandidato: '250002541362',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002541362.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '180',
    nomeUrna: 'MARINA SILVA',
    nomeCompleto: 'MARIA OSMARINA MARINA DA SILVA VAZ DE LIMA',
    partido: 'REDE',
    sqCandidato: '250002551501',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002551501.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '200',
    nomeUrna: 'GERALDO RUFINO',
    nomeCompleto: 'GERALDO ARISTIDES RUFINO',
    partido: 'PODE',
    sqCandidato: '250002544673',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002544673.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '211',
    nomeUrna: 'PETTER MAAHS',
    nomeCompleto: 'PETTER MAAHS DA SILVA',
    partido: 'PCB',
    sqCandidato: '250002552153',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002552153.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '222',
    nomeUrna: 'ANDRÉ DO PRADO',
    nomeCompleto: 'ANDRE LUIS DO PRADO',
    partido: 'PL',
    sqCandidato: '250002541308',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002541308.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '232',
    nomeUrna: 'SONINHA FRANCINE',
    nomeCompleto: 'SONIA FRANCINE GASPAR MARMO',
    partido: 'CIDADANIA',
    sqCandidato: '250002552369',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002552369.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '290',
    nomeUrna: 'EDNELSON CESARETTI',
    nomeCompleto: 'EDNELSON CESARETTI',
    partido: 'PCO',
    sqCandidato: '250002552955',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002552955.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '360',
    nomeUrna: 'WILLIAM TEIXEIRA',
    nomeCompleto: 'WILLIAM TEIXEIRA DE OLIVEIRA',
    partido: 'AGIR',
    sqCandidato: '250002553252',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002553252.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '400',
    nomeUrna: 'SIMONE TEBET',
    nomeCompleto: 'SIMONE NASSAR TEBET ROCHA',
    partido: 'PSB',
    sqCandidato: '250002551502',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002551502.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '800',
    nomeUrna: 'MARCIO ALVES',
    nomeCompleto: 'MARCIO ALVES DOS SANTOS',
    partido: 'UP',
    sqCandidato: '250002544514',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002544514.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'SENADOR',
    numero: '808',
    nomeUrna: 'MAÍRA DE SOUZA',
    nomeCompleto: 'MAÍRA DIAS DE SOUZA',
    partido: 'UP',
    sqCandidato: '250002544516',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002544516.jpg?w=161&h=225&crop=0&quality=100'
  }
];

export const CANDIDATOS_PRESIDENTE: Candidato[] = [
  {
    cargo: 'PRESIDENTE',
    numero: '13',
    nomeUrna: 'LULA',
    nomeCompleto: 'LUIZ INÁCIO LULA DA SILVA',
    partido: 'PT',
    sqCandidato: '280002542548',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002542548.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '14',
    nomeUrna: 'RENAN SANTOS',
    nomeCompleto: 'RENAN ANTONIO FERREIRA DOS SANTOS',
    partido: 'MISSÃO',
    sqCandidato: '280002540694',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002540694.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '16',
    nomeUrna: 'HERTZ DIAS',
    nomeCompleto: 'HERTZ DA CONCEICAO DIAS',
    partido: 'PSTU',
    sqCandidato: '280002541457',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002541457.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '21',
    nomeUrna: 'EDMILSON COSTA',
    nomeCompleto: 'EDMILSON SILVA COSTA',
    partido: 'PCB',
    sqCandidato: '280002551975',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002551975.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '22',
    nomeUrna: 'FLAVIO BOLSONARO',
    nomeCompleto: 'FLAVIO NANTES BOLSONARO',
    partido: 'PL',
    sqCandidato: '280002551544',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002551544.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '27',
    nomeUrna: 'CLARIANA BARAO',
    nomeCompleto: 'CLARIANA ZACARKIM BARAO',
    partido: 'DC',
    sqCandidato: '280002552484',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002552484.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '28',
    nomeUrna: 'LEONARDO AVALANCHE',
    nomeCompleto: 'LEONARDO ALVES DE ARAUJO',
    partido: 'PRTB',
    sqCandidato: '280002554479',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002554479.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '29',
    nomeUrna: 'RUI COSTA PIMENTA',
    nomeCompleto: 'RUI COSTA PIMENTA',
    partido: 'PCO',
    sqCandidato: '280002552487',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002552487.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '30',
    nomeUrna: 'ZEMA',
    nomeCompleto: 'ROMEU ZEMA NETO',
    partido: 'NOVO',
    sqCandidato: '280002539826',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002539826.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '35',
    nomeUrna: 'VETERINÁRIO WILSON GRASSI',
    nomeCompleto: 'WILSON GRASSI JUNIOR',
    partido: 'DEMOCRATA',
    sqCandidato: '280002548139',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002548139.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '55',
    nomeUrna: 'RONALDO CAIADO',
    nomeCompleto: 'RONALDO RAMOS CAIADO',
    partido: 'PSD',
    sqCandidato: '280002551932',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002551932.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '70',
    nomeUrna: 'ESCRITOR AUGUSTO CURY',
    nomeCompleto: 'AUGUSTO JORGE CURY',
    partido: 'AVANTE',
    sqCandidato: '280002551547',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002551547.jpg?w=161&h=225&crop=0&quality=100'
  },
  {
    cargo: 'PRESIDENTE',
    numero: '80',
    nomeUrna: 'SAMARA',
    nomeCompleto: 'SAMARA MARTINS DA SILVA FEITOSA',
    partido: 'UP',
    sqCandidato: '280002538811',
    fotoUrl: 'https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/280002538811.jpg?w=161&h=225&crop=0&quality=100'
  }
];
