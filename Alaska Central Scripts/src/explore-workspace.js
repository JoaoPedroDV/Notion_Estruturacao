require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function exploreWorkspace() {
  console.log('\n==================================================');
  console.log('🔍 EXPLORANDO WORKSPACE - BUSCA COMPLETA');
  console.log('==================================================\n');

  try {
    // Buscar TUDO sem filtros
    console.log('📡 Buscando todos os itens acessíveis...\n');

    const allItems = [];
    let hasMore = true;
    let startCursor = undefined;

    // Fazer busca paginada para pegar tudo
    while (hasMore) {
      const response = await notion.search({
        page_size: 100,
        start_cursor: startCursor,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      allItems.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;

      console.log(`   Coletados: ${allItems.length} itens...`);
    }

    console.log(`\n✅ Total de itens encontrados: ${allItems.length}\n`);

    const databases = allItems.filter(item => item.object === 'database');
    const pages = allItems.filter(item => item.object === 'page');

    console.log(`📦 Databases: ${databases.length}`);
    console.log(`📄 Páginas: ${pages.length}\n`);

    console.log('==================================================');
    console.log('📦 TODOS OS DATABASES ACESSÍVEIS');
    console.log('==================================================\n');

    const dbAnalysis = [];

    for (const db of databases) {
      const title = db.title?.[0]?.plain_text || 'Sem título';
      const icon = db.icon?.emoji || db.icon?.external?.url || db.icon?.file?.url || '📄';

      console.log(`${typeof icon === 'string' && icon.length < 5 ? icon : '📄'} ${title}`);
      console.log(`   ID: ${db.id}`);
      console.log(`   URL: ${db.url}`);
      console.log(`   Editado: ${new Date(db.last_edited_time).toLocaleString('pt-BR')}`);

      // Contar registros
      try {
        const query = await notion.databases.query({
          database_id: db.id,
          page_size: 1
        });

        // Pegar total aproximado (limitado a 100 pela API)
        const moreResults = await notion.databases.query({
          database_id: db.id,
          page_size: 100
        });

        console.log(`   Registros: ${moreResults.results.length}+ items`);

        dbAnalysis.push({
          id: db.id,
          title,
          url: db.url,
          records_count: moreResults.results.length,
          last_edited: db.last_edited_time
        });

      } catch (e) {
        console.log(`   Registros: Não acessível`);
      }

      console.log('');
    }

    console.log('==================================================');
    console.log('📄 PÁGINAS PRINCIPAIS (Não-database)');
    console.log('==================================================\n');

    const pageAnalysis = [];

    // Filtrar páginas que não são filhas de databases
    const topLevelPages = pages.filter(page => {
      // Se tem propriedades de database, é um registro, não uma página standalone
      const hasDbProps = page.parent?.type === 'database_id';
      return !hasDbProps;
    });

    console.log(`Total de páginas standalone: ${topLevelPages.length}\n`);

    for (const page of topLevelPages.slice(0, 20)) {
      let title = 'Sem título';

      for (const [key, value] of Object.entries(page.properties || {})) {
        if (value.type === 'title' && value.title?.[0]?.plain_text) {
          title = value.title[0].plain_text;
          break;
        }
      }

      const icon = page.icon?.emoji || '📄';

      console.log(`${icon} ${title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page.url}`);
      console.log(`   Parent: ${page.parent?.type || 'workspace'}`);
      console.log(`   Editado: ${new Date(page.last_edited_time).toLocaleString('pt-BR')}`);

      // Verificar se tem children
      try {
        const children = await notion.blocks.children.list({
          block_id: page.id,
          page_size: 5
        });

        if (children.results.length > 0) {
          console.log(`   Tem ${children.results.length}+ blocos`);

          // Contar databases e páginas filhas
          let dbCount = 0;
          let pageCount = 0;

          for (const block of children.results) {
            if (block.type === 'child_database') dbCount++;
            if (block.type === 'child_page') pageCount++;
          }

          if (dbCount > 0) console.log(`   📊 ${dbCount} database(s) filho(s)`);
          if (pageCount > 0) console.log(`   📄 ${pageCount} página(s) filha(s)`);
        }

        pageAnalysis.push({
          id: page.id,
          title,
          url: page.url,
          has_children: children.results.length > 0,
          last_edited: page.last_edited_time
        });

      } catch (e) {
        console.log(`   (Não foi possível acessar conteúdo)`);
      }

      console.log('');
    }

    // Buscar especificamente por "Alaska Central"
    console.log('==================================================');
    console.log('🔍 BUSCANDO "ALASKA CENTRAL" ESPECIFICAMENTE');
    console.log('==================================================\n');

    const alaskaSearch = allItems.filter(item => {
      const title = item.title?.[0]?.plain_text || '';

      // Verificar em properties também
      if (item.properties) {
        for (const [key, value] of Object.entries(item.properties)) {
          if (value.type === 'title' && value.title?.[0]?.plain_text) {
            const propTitle = value.title[0].plain_text;
            if (propTitle.toLowerCase().includes('alaska') || propTitle.toLowerCase().includes('central')) {
              return true;
            }
          }
        }
      }

      return title.toLowerCase().includes('alaska') || title.toLowerCase().includes('central');
    });

    console.log(`Encontrados ${alaskaSearch.length} itens com "Alaska" ou "Central":\n`);

    alaskaSearch.forEach((item, i) => {
      let title = item.title?.[0]?.plain_text || 'Sem título';

      if (item.properties) {
        for (const [key, value] of Object.entries(item.properties)) {
          if (value.type === 'title' && value.title?.[0]?.plain_text) {
            title = value.title[0].plain_text;
            break;
          }
        }
      }

      console.log(`${i + 1}. ${title}`);
      console.log(`   Tipo: ${item.object}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   URL: ${item.url}\n`);
    });

    // Salvar análise completa
    const analysis = {
      timestamp: new Date().toISOString(),
      total_items: allItems.length,
      databases: dbAnalysis,
      pages: pageAnalysis,
      alaska_related: alaskaSearch.map(item => ({
        id: item.id,
        type: item.object,
        url: item.url,
        title: item.title?.[0]?.plain_text || 'Check properties'
      }))
    };

    const outputPath = 'C:\\Users\\Pedro\\Desktop\\Notion Structures\\complete-workspace-exploration.json';
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');

    console.log('==================================================');
    console.log('✅ EXPLORAÇÃO CONCLUÍDA!');
    console.log('==================================================');
    console.log(`📁 Análise completa salva em: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

exploreWorkspace();
