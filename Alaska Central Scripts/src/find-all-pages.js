require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function findAll() {
  console.log('\n==================================================');
  console.log('🔍 BUSCANDO TODAS AS PÁGINAS E DATABASES');
  console.log('==================================================\n');

  try {
    const response = await notion.search({
      page_size: 100,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    console.log(`📊 Total encontrado: ${response.results.length} itens\n`);

    const databases = response.results.filter(r => r.object === 'database');
    const pages = response.results.filter(r => r.object === 'page');

    console.log(`📦 Databases: ${databases.length}`);
    console.log(`📄 Páginas: ${pages.length}\n`);

    console.log('==================================================');
    console.log('📦 TODOS OS DATABASES:');
    console.log('==================================================\n');

    databases.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Sem título';
      const icon = db.icon?.emoji || '📄';
      console.log(`${index + 1}. ${icon} ${title}`);
      console.log(`   ID: ${db.id}`);
      console.log(`   Editado: ${new Date(db.last_edited_time).toLocaleString('pt-BR')}\n`);
    });

    console.log('==================================================');
    console.log('📄 PÁGINAS RELEVANTES:');
    console.log('==================================================\n');

    const relevantPages = pages.filter(page => {
      const props = page.properties || {};
      for (const [key, value] of Object.entries(props)) {
        if (value.type === 'title' && value.title?.[0]?.plain_text) {
          const text = value.title[0].plain_text.toLowerCase();
          if (text.includes('ideia') || text.includes('implementa') || text.includes('workspace') || text.includes('dashboard')) {
            return true;
          }
        }
      }
      return false;
    });

    relevantPages.forEach((page, index) => {
      let title = 'Sem título';
      const props = page.properties || {};

      for (const [key, value] of Object.entries(props)) {
        if (value.type === 'title' && value.title?.[0]?.plain_text) {
          title = value.title[0].plain_text;
          break;
        }
      }

      const icon = page.icon?.emoji || '📄';
      console.log(`${index + 1}. ${icon} ${title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page.url}`);
      console.log(`   Editado: ${new Date(page.last_edited_time).toLocaleString('pt-BR')}\n`);
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

findAll();
