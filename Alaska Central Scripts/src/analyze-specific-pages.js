require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function analyzePages() {
  console.log('\n==================================================');
  console.log('💡 ANALISANDO PÁGINAS DE IDEIAS E IMPLEMENTAÇÃO');
  console.log('==================================================\n');

  const pages = [
    {
      name: 'Ideias',
      id: '27140b88-1418-810e-994a-c2e2f67a6a0b',
      url: 'https://www.notion.so/27140b881418810e994ac2e2f67a6a0b'
    },
    {
      name: 'Implementação WorkSpace interativo',
      id: '29f40b88-1418-81d3-a85f-f41e2228fb00',
      url: 'https://www.notion.so/Implementa-o-WorkSpace-interativo-29f40b88141881d3a85ff41e2228fb00'
    }
  ];

  const analysis = {
    timestamp: new Date().toISOString(),
    pages: []
  };

  for (const pageInfo of pages) {
    console.log('==================================================');
    console.log(`📄 ${pageInfo.name}`);
    console.log('==================================================');
    console.log(`ID: ${pageInfo.id}`);
    console.log(`URL: ${pageInfo.url}\n`);

    try {
      // Tentar acessar como página
      const page = await notion.pages.retrieve({ page_id: pageInfo.id });

      console.log('✅ Acesso à página bem-sucedido!\n');

      // Buscar blocos (conteúdo)
      const blocks = await notion.blocks.children.list({
        block_id: pageInfo.id,
        page_size: 100
      });

      console.log(`📦 Total de blocos: ${blocks.results.length}\n`);

      const pageAnalysis = {
        name: pageInfo.name,
        id: pageInfo.id,
        url: pageInfo.url,
        blocks: []
      };

      // Função recursiva para analisar blocos com children
      async function analyzeBlock(block, indent = '') {
        const blockInfo = {
          id: block.id,
          type: block.type,
          has_children: block.has_children
        };

        switch (block.type) {
          case 'heading_1':
          case 'heading_2':
          case 'heading_3':
            const heading = block[block.type];
            const text = heading.rich_text.map(t => t.plain_text).join('');
            console.log(`${indent}${block.type === 'heading_1' ? '# ' : block.type === 'heading_2' ? '## ' : '### '}${text}`);
            blockInfo.text = text;
            break;

          case 'paragraph':
            const para = block.paragraph.rich_text.map(t => t.plain_text).join('');
            if (para) {
              console.log(`${indent}${para}`);
              blockInfo.text = para;
            }
            break;

          case 'bulleted_list_item':
            const bulletText = block.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
            console.log(`${indent}• ${bulletText}`);
            blockInfo.text = bulletText;
            break;

          case 'numbered_list_item':
            const numberedText = block.numbered_list_item.rich_text.map(t => t.plain_text).join('');
            console.log(`${indent}${numberedText}`);
            blockInfo.text = numberedText;
            break;

          case 'to_do':
            const todoText = block.to_do.rich_text.map(t => t.plain_text).join('');
            const checked = block.to_do.checked ? '✅' : '⬜';
            console.log(`${indent}${checked} ${todoText}`);
            blockInfo.text = todoText;
            blockInfo.checked = block.to_do.checked;
            break;

          case 'toggle':
            const toggleText = block.toggle.rich_text.map(t => t.plain_text).join('');
            console.log(`${indent}▶ ${toggleText}`);
            blockInfo.text = toggleText;
            break;

          case 'callout':
            const calloutText = block.callout.rich_text.map(t => t.plain_text).join('');
            console.log(`${indent}💡 ${calloutText}`);
            blockInfo.text = calloutText;
            break;

          case 'quote':
            const quoteText = block.quote.rich_text.map(t => t.plain_text).join('');
            console.log(`${indent}> ${quoteText}`);
            blockInfo.text = quoteText;
            break;

          case 'divider':
            console.log(`${indent}---`);
            break;

          case 'child_database':
            console.log(`${indent}📊 Child Database: ${block.child_database.title}`);
            blockInfo.database_id = block.id;
            blockInfo.database_title = block.child_database.title;
            break;

          case 'linked_database':
            console.log(`${indent}🔗 Linked Database ID: ${block.id}`);
            blockInfo.database_id = block.id;

            try {
              const linkedDb = await notion.databases.retrieve({ database_id: block.id });
              const dbTitle = linkedDb.title?.[0]?.plain_text || 'Sem título';
              console.log(`${indent}   Nome: ${dbTitle}`);
              blockInfo.database_title = dbTitle;
            } catch (e) {
              console.log(`${indent}   (Não acessível)`);
            }
            break;

          case 'child_page':
            console.log(`${indent}📄 Sub-página: ${block.child_page?.title || 'Sem título'}`);
            blockInfo.child_page_id = block.id;
            break;

          case 'table':
            console.log(`${indent}📊 Tabela (${block.table.table_width} colunas)`);
            blockInfo.table_width = block.table.table_width;
            break;

          case 'column_list':
            console.log(`${indent}🔲 Lista de Colunas`);
            break;

          case 'column':
            console.log(`${indent}  📐 Coluna`);
            break;

          default:
            console.log(`${indent}[${block.type}]`);
        }

        // Se tem children, buscar recursivamente
        if (block.has_children) {
          try {
            const children = await notion.blocks.children.list({
              block_id: block.id,
              page_size: 100
            });

            blockInfo.children = [];
            for (const child of children.results) {
              const childInfo = await analyzeBlock(child, indent + '  ');
              blockInfo.children.push(childInfo);
            }
          } catch (e) {
            console.log(`${indent}  (Erro ao buscar children: ${e.message})`);
          }
        }

        return blockInfo;
      }

      // Analisar todos os blocos
      for (const block of blocks.results) {
        const blockInfo = await analyzeBlock(block);
        pageAnalysis.blocks.push(blockInfo);
      }

      analysis.pages.push(pageAnalysis);
      console.log('\n');

    } catch (error) {
      if (error.code === 'object_not_found') {
        console.log('❌ Página não encontrada ou sem acesso!\n');
        console.log('A integração precisa ter acesso a esta página.\n');
      } else {
        console.log(`❌ Erro: ${error.message}\n`);
      }

      // Tentar como database
      try {
        console.log('🔄 Tentando acessar como database...\n');
        const db = await notion.databases.retrieve({ database_id: pageInfo.id });

        console.log('✅ É um database!\n');
        const title = db.title?.[0]?.plain_text || 'Sem título';
        console.log(`Nome: ${title}\n`);

        console.log('📋 PROPRIEDADES:');
        for (const [propName, propValue] of Object.entries(db.properties)) {
          console.log(`   - ${propName} (${propValue.type})`);
        }
        console.log('\n');

        // Buscar registros
        const records = await notion.databases.query({
          database_id: pageInfo.id,
          page_size: 10
        });

        console.log(`📄 Registros: ${records.results.length}\n`);

        analysis.pages.push({
          name: pageInfo.name,
          id: pageInfo.id,
          url: pageInfo.url,
          type: 'database',
          title,
          properties: db.properties,
          total_records: records.results.length
        });

      } catch (dbError) {
        console.log(`❌ Também não é database acessível: ${dbError.message}\n`);
      }
    }
  }

  // Salvar análise
  const outputPath = 'C:\\Users\\Pedro\\Desktop\\Notion Structures\\ideas-implementation-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');

  console.log('==================================================');
  console.log('✅ ANÁLISE CONCLUÍDA!');
  console.log('==================================================');
  console.log(`📁 Arquivo salvo em: ${outputPath}\n`);
}

analyzePages();
