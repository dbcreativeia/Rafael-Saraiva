const extractFullName = (item) => item.nomeCompleto || item.name || (item.sobrenome ? `${item.nome} ${item.sobrenome}`.trim() : item.nome) || 'Anônimo';
const extractPhone = (item) => item.whatsapp || item.telefone || item.celular || '';
const extractEmail = (item) => item.email || '';
