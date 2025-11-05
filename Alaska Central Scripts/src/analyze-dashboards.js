require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function analyzeDashboards() {
  console.log('\n==================================================');
  console.log('📊 ANALISANDO DASHBOARD TEMPLATES');
  console.log('==================================================\n');

  const dashboardIds = [
    '2a0d3217-7790-8186-afb2-cbf3c0f34c51',
    '2a0d3217-7790-81b4-a66b-d2c3578f5d34',
    '2a0d3217-7790-81aa-8f16-dda2011893ab'
  ];

  const analysis = {
    timestamp: new Date().toISOString(),
    dashboards: []
  };

  for (const pageId of dashboardIds) {
    try {
      console.log('--------------------------------------------------');
      const page = await notion.pages.retrieve({ page_id: pageId });

      let title = 'Sem título';
      for (const [key, value] of Object.entries(page.properties)) {
        if (value.type === 'title' && value.title?.[0]?.plain_text) {
          title = value.title[0].plain_text;
        }
      }

      console.log(`📊 ${title}`);
      console.log(`ID: ${pageId}`);
      console.log(`URL: ${page.url}\n`);

      // Buscar blocos (conteúdo) da página
      const blocks = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });

      console.log(`📦 Blocos encontrados: ${blocks.results.length}\n`);

      const dashboardAnalysis = {
        id: pageId,
        title,
        url: page.url,
        blocks: []
      };

      // Analisar cada bloco
      for (const block of blocks.results) {
        console.log(`   ${block.type}:`);

        const blockInfo = {
          id: block.id,
          type: block.type
        };

        switch (block.type) {
          case 'heading_1':
          case 'heading_2':
          case 'heading_3':
            const heading = block[block.type];
            const text = heading.rich_text.map(t => t.plain_text).join('');
            console.log(`      "${text}"`);
            blockInfo.text = text;
            break;

          case 'paragraph':
            const para = block.paragraph.rich_text.map(t => t.plain_text).join('');
            if (para) {
              console.log(`      "${para}"`);
              blockInfo.text = para;
            }
            break;

          case 'bulleted_list_item':
          case 'numbered_list_item':
            const listText = block[block.type].rich_text.map(t => t.plain_text).join('');
            console.log(`      • ${listText}`);
            blockInfo.text = listText;
            break;

          case 'to_do':
            const todoText = block.to_do.rich_text.map(t => t.plain_text).join('');
            const checked = block.to_do.checked ? '✅' : '⬜';
            console.log(`      ${checked} ${todoText}`);
            blockInfo.text = todoText;
            blockInfo.checked = block.to_do.checked;
            break;

          case 'child_database':
            console.log(`      Database ID: ${block.child_database.title}`);
            blockInfo.database_id = block.id;
            break;

          case 'linked_database':
            console.log(`      Linked Database ID: ${block.id}`);
            blockInfo.database_id = block.id;

            // Tentar buscar informações do database linkado
            try {
              const linkedDb = await notion.databases.retrieve({
                database_id: block.id
              });
              const dbTitle = linkedDb.title?.[0]?.plain_text || 'Sem título';
              console.log(`      Nome: ${dbTitle}`);
              blockInfo.database_title = dbTitle;
            } catch (e) {
              console.log(`      (Não foi possível acessar detalhes)`);
            }
            break;

          case 'divider':
            console.log('      ---');
            break;

          case 'callout':
            const calloutText = block.callout.rich_text.map(t => t.plain_text).join('');
            console.log(`      💡 ${calloutText}`);
            blockInfo.text = calloutText;
            break;

          default:
            console.log(`      (tipo: ${block.type})`);
        }

        console.log('');
        dashboardAnalysis.blocks.push(blockInfo);
      }

      analysis.dashboards.push(dashboardAnalysis);

    } catch (error) {
      console.error(`❌ Erro ao analisar dashboard ${pageId}: ${error.message}\n`);
    }
  }

  // Salvar análise
  const outputPath = 'C:\\Users\\Pedro\\Desktop\\Notion Structures\\dashboard-templates-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');

  console.log('==================================================');
  console.log('✅ ANÁLISE CONCLUÍDA!');
  console.log('==================================================');
  console.log(`📁 Arquivo salvo em: ${outputPath}\n`);
}

analyzeDashboards();
