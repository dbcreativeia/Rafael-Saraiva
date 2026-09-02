const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

const search = `    setIsUploading(true);
    setUploadError('');
    setUploadSuccessMessage('');

    try {
      const res = await fetch('/api/imported-leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: parsedCsvLeads,
          campanha: campaignInput.trim()
        })
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Resposta do servidor não é JSON:', text.substring(0, 200));
        throw new Error('Servidor retornou um formato inesperado. O arquivo pode ser muito grande.');
      }

      if (res.ok && data.success) {
        setUploadSuccessMessage(\`Sucesso! \${data.count} leads importados para a campanha "\${campaignInput.trim()}".\`);
        // Atualiza a listagem consolidada imediatamente
        await fetchAllLeads();
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadSuccessMessage('');
          setParsedCsvLeads([]);
          setCsvMappedHeaders([]);
          setCsvFile(null);
          setCsvFileName('');
          setCsvRawRows([]);
          setCsvHeaders([]);
          setCampaignInput('');
        }, 1800);
      } else {
        setUploadError(data.error || 'Erro ao processar importação no servidor.');
      }
    } catch (err) {
      console.error('Erro ao enviar leads importados:', err);
      setUploadError('Erro de conexão ao enviar os leads para o servidor.');
    } finally {
      setIsUploading(false);
    }`;

const replace = `    setIsUploading(true);
    setUploadError('');
    setUploadSuccessMessage('Iniciando importação...');

    try {
      const CHUNK_SIZE = 5000;
      const totalLeads = parsedCsvLeads.length;
      let importedCount = 0;

      for (let i = 0; i < totalLeads; i += CHUNK_SIZE) {
        const chunk = parsedCsvLeads.slice(i, i + CHUNK_SIZE);
        setUploadSuccessMessage(\`Importando lote \${Math.floor(i / CHUNK_SIZE) + 1} de \${Math.ceil(totalLeads / CHUNK_SIZE)}... (\${importedCount} de \${totalLeads})\`);
        
        const res = await fetch('/api/imported-leads/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leads: chunk,
            campanha: campaignInput.trim()
          })
        });

        let data;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error('Servidor retornou um formato inesperado.');
        }

        if (res.ok && data.success) {
          importedCount += data.count;
        } else {
          throw new Error(data.error || 'Erro ao processar importação no servidor.');
        }
      }

      setUploadSuccessMessage(\`Sucesso! \${importedCount} leads importados para a campanha "\${campaignInput.trim()}".\`);
      await fetchAllLeads();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccessMessage('');
        setParsedCsvLeads([]);
        setCsvMappedHeaders([]);
        setCsvFile(null);
        setCsvFileName('');
        setCsvRawRows([]);
        setCsvHeaders([]);
        setCampaignInput('');
      }, 1800);
    } catch (err: any) {
      console.error('Erro ao enviar leads importados:', err);
      setUploadError(err.message || 'Erro de conexão ao enviar os leads para o servidor.');
    } finally {
      setIsUploading(false);
    }`;

if (content.includes("const res = await fetch('/api/imported-leads/bulk'")) {
  // need to do a broader replace or just find and replace using regex
}

