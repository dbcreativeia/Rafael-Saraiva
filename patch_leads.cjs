const fs = require('fs');

let content = fs.readFileSync('leadsConsolidation.ts', 'utf-8');

const regexQueries = /const \[popupApoio\] = await db\.query.*?const \[jogoUsers\] = await db\.query.*?;\n/s;
content = content.replace(regexQueries, '');

const regexProcess = /\(popupApoio as any\[\]\)\.forEach.*?\} catch \(err\) \{\n\s*console\.error\("Error fetching imported_leads chunk:", err\);\n\s*break;\n\s*\}\n\s*\}/s;

const newProcessCode = `
      const fetchInChunks = async (tableName, columns, mapRow) => {
        let offset = 0;
        const limit = 50000;
        while (true) {
          try {
            const [rows] = await db.query(\`SELECT \${columns} FROM \${tableName} LIMIT \${limit} OFFSET \${offset}\`);
            const chunk = rows;
            if (chunk.length === 0) break;
            for (const item of chunk) {
              mapRow(item);
            }
            offset += limit;
            await new Promise(r => setTimeout(r, 10));
          } catch (err) {
            console.error(\`Error fetching \${tableName} chunk:\`, err);
            break;
          }
        }
      };

      await fetchInChunks('popup_apoio', '*', item => addOrMerge(item, {
        id: \`apoio_\${item.id}\`,
        sourceKey: 'APOIO',
        sourceName: 'Apoio Capital / SP',
        sourceCategory: 'Apoio Capital',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, bairro: item.bairro, cep: item.cep }
      }));

      await fetchInChunks('material_campaign', '*', item => addOrMerge(item, {
        id: \`mat_\${item.id}\`,
        sourceKey: 'MATERIAL',
        sourceName: \`Material Campanha (\${item.tipoMaterial === 'impresso' ? 'Impresso' : 'Digital'})\`,
        sourceCategory: 'Material Oficial',
        date: item.createdAt,
        details: { tipoMaterial: item.tipoMaterial, adesivoPerfurado: !!item.adesivoPerfurado, cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      await fetchInChunks('ninapassadore_campaign', '*', item => addOrMerge(item, {
        id: \`nina_\${item.id}\`,
        sourceKey: 'NINA',
        sourceName: \`Material Dobrada Nina (\${item.tipoMaterial === 'impresso' ? 'Impresso' : 'Digital'})\`,
        sourceCategory: 'Material Dobrada',
        date: item.createdAt,
        details: { tipoMaterial: item.tipoMaterial, adesivoPerfurado: !!item.adesivoPerfurado, cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      await fetchInChunks('citizens', '*', item => addOrMerge(item, {
        id: \`cit_\${item.id}\`,
        sourceKey: 'CITIZENS',
        sourceName: 'Minuta Código Animal (PL)',
        sourceCategory: 'Projeto de Lei',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      await fetchInChunks('petitions', '*', item => addOrMerge(item, {
        id: \`pet_\${item.id}\`,
        sourceKey: 'PETITIONS',
        sourceName: 'Abaixo-Assinado Código Animal',
        sourceCategory: 'Abaixo-Assinado',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      await fetchInChunks('contra_maus_tratos', '*', item => addOrMerge(item, {
        id: \`cmt_\${item.id}\`,
        sourceKey: 'CONTRA_MAUS_TRATOS',
        sourceName: 'Assinatura Contra Maus-Tratos',
        sourceCategory: 'Maus-Tratos',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      await fetchInChunks('jogo_users', '*', item => addOrMerge(item, {
        id: \`jogo_\${item.id}\`,
        sourceKey: 'JOGO',
        sourceName: 'Jogador Missão Resgate',
        sourceCategory: 'Jogo Resgate',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, usuario: item.usuario }
      }));

      await fetchInChunks('imported_leads', 'id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, createdAt, extraData', item => {
        let parsedExtra = {};
        if (item.extraData) {
          if (typeof item.extraData === 'string') {
            try { parsedExtra = JSON.parse(item.extraData); } catch {}
          } else if (typeof item.extraData === 'object') {
            parsedExtra = item.extraData;
          }
        }
        item.extraData = parsedExtra;
        addOrMerge(item, {
          id: \`imp_\${item.id}\`,
          sourceKey: 'IMPORTED',
          sourceName: \`Base Externa: \${item.campanha || 'Importação CSV'}\`,
          sourceCategory: item.campanha || 'Base Externa',
          date: item.createdAt,
          details: {
            cidade: item.cidade,
            estado: item.estado,
            endereco: item.endereco,
            numero: item.numero,
            bairro: item.bairro,
            cep: item.cep,
            extraData: parsedExtra
          }
        });
      });
`;

content = content.replace(regexProcess, newProcessCode);

fs.writeFileSync('leadsConsolidation.ts', content);
console.log('Patched refreshFromDatabase in leadsConsolidation.ts');
