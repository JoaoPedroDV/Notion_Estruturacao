require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function analyzeAlaskaCentral() {
  console.log('\n==================================================');
  console.log('🏔️ ANALISANDO ALASKA CENTRAL - PÁGINA PRINCIPAL');
  console.log('==================================================\n');

  const pageId = '27140b88-1418-802b-b7ec-eb0f9f0d3ecb';
  const pageUrl = 'https://www.notion.so/Alaska-Central-27140b881418802bb7eceb0f9f0d3ecb';

  console.log(`ID: ${pageId}`);
  console.log(`URL: ${pageUrl}\n`);

  try {
    // Tentar acessar a página
    console.log('🔍 Tentando acessar página...\n');
    const page = await notion.pages.retrieve({ page_id: pageId });

    console.log('✅ ACESSO CONCEDIDO!\n');

    // Extrair título
    let title = 'Sem título';
    for (const [key, value] of Object.entries(page.properties)) {
      if (value.type === 'title' && value.title?.[0]?.plain_text) {
        title = value.title[0].plain_text;
      }
    }

    console.log(`📄 Título: ${title}`);
    console.log(`🔗 URL: ${page.url}`);
    console.log(`📅 Última edição: ${new Date(page.last_edited_time).toLocaleString('pt-BR')}\n`);

    // Buscar blocos (estrutura da página)
    console.log('==================================================');
    console.log('📦 ESTRUTURA DA PÁGINA');
    console.log('==================================================\n');

    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    });

    console.log(`Total de blocos: ${blocks.results.length}\n`);

    const analysis = {
      timestamp: new Date().toISOString(),
      page: {
        id: pageId,
        title,
        url: page.url,
        last_edited: page.last_edited_time
      },
      structure: {
        total_blocks: blocks.results.length,
        databases: [],
        pages: [],
        sections: []
      }
    };

    // Função para analisar blocos recursivamente
    async function analyzeBlock(block, level = 0) {
      const indent = '  '.repeat(level);
      const blockInfo = {
        id: block.id,
        type: block.type,
        level
      };

      switch (block.type) {
        case 'heading_1':
          const h1Text = block.heading_1.rich_text.map(t => t.plain_text).join('');
          console.log(`${indent}# ${h1Text}`);
          blockInfo.text = h1Text;
          analysis.structure.sections.push({ level: 1, title: h1Text, id: block.id });
          break;

        case 'heading_2':
          const h2Text = block.heading_2.rich_text.map(t => t.plain_text).join('');
          console.log(`${indent}## ${h2Text}`);
          blockInfo.text = h2Text;
          analysis.structure.sections.push({ level: 2, title: h2Text, id: block.id });
          break;

        case 'heading_3':
          const h3Text = block.heading_3.rich_text.map(t => t.plain_text).join('');
          console.log(`${indent}### ${h3Text}`);
          blockInfo.text = h3Text;
          analysis.structure.sections.push({ level: 3, title: h3Text, id: block.id });
          break;

        case 'paragraph':
          const paraText = block.paragraph.rich_text.map(t => t.plain_text).join('');
          if (paraText) {
            console.log(`${indent}${paraText.substring(0, 80)}${paraText.length > 80 ? '...' : ''}`);
            blockInfo.text = paraText;
          }
          break;

        case 'child_database':
          console.log(`${indent}📊 Database: ${block.child_database.title || 'Sem título'}`);
          console.log(`${indent}   ID: ${block.id}`);
          blockInfo.database_title = block.child_database.title;

          // Tentar buscar informações do database
          try {
            const db = await notion.databases.retrieve({ database_id: block.id });
            const dbTitle = db.title?.[0]?.plain_text || 'Sem título';
            const propCount = Object.keys(db.properties).length;
            console.log(`${indent}   Propriedades: ${propCount}`);

            blockInfo.database_details = {
              title: dbTitle,
              properties_count: propCount
            };

            analysis.structure.databases.push({
              id: block.id,
              title: dbTitle,
              properties_count: propCount
            });
          } catch (e) {
            console.log(`${indent}   (Não foi possível acessar detalhes)`);
          }
          break;

        case 'child_page':
          const pageTitle = block.child_page?.title || 'Sem título';
          console.log(`${indent}📄 Página: ${pageTitle}`);
          console.log(`${indent}   ID: ${block.id}`);
          blockInfo.page_title = pageTitle;

          analysis.structure.pages.push({
            id: block.id,
            title: pageTitle
          });
          break;

        case 'divider':
          console.log(`${indent}---`);
          break;

        case 'callout':
          const calloutText = block.callout.rich_text.map(t => t.plain_text).join('');
          console.log(`${indent}💡 ${calloutText.substring(0, 80)}${calloutText.length > 80 ? '...' : ''}`);
          blockInfo.text = calloutText;
          break;

        case 'toggle':
          const toggleText = block.toggle.rich_text.map(t => t.plain_text).join('');
          console.log(`${indent}▶ ${toggleText}`);
          blockInfo.text = toggleText;
          break;

        case 'column_list':
          console.log(`${indent}🔲 Colunas`);
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
            const childInfo = await analyzeBlock(child, level + 1);
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
      await analyzeBlock(block);
    }

    console.log('\n==================================================');
    console.log('📊 RESUMO');
    console.log('==================================================\n');

    console.log(`📦 Total de blocos: ${blocks.results.length}`);
    console.log(`📊 Databases encontrados: ${analysis.structure.databases.length}`);
    console.log(`📄 Sub-páginas encontradas: ${analysis.structure.pages.length}`);
    console.log(`📑 Seções: ${analysis.structure.sections.length}\n`);

    if (analysis.structure.databases.length > 0) {
      console.log('📊 DATABASES NA PÁGINA:');
      analysis.structure.databases.forEach((db, i) => {
        console.log(`   ${i + 1}. ${db.title} (${db.properties_count} propriedades)`);
      });
      console.log('');
    }

    if (analysis.structure.pages.length > 0) {
      console.log('📄 SUB-PÁGINAS:');
      analysis.structure.pages.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.title}`);
      });
      console.log('');
    }

    // Salvar análise
    const outputPath = 'C:\\Users\\Pedro\\Desktop\\Notion Structures\\alaska-central-page-analysis.json';
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');

    console.log('==================================================');
    console.log('✅ ANÁLISE CONCLUÍDA!');
    console.log('==================================================');
    console.log(`📁 Arquivo salvo em: ${outputPath}\n`);

  } catch (error) {
    if (error.code === 'object_not_found') {
      console.log('❌ ACESSO NEGADO!\n');
      console.log('A integração ainda não tem acesso a esta página.\n');
      console.log('📋 COMO RESOLVER:');
      console.log('1. Abra a página no Notion');
      console.log('2. Clique nos "..." no canto superior direito');
      console.log('3. Clique em "Add connections"');
      console.log('4. Selecione a integração\n');
    } else {
      console.log(`❌ ERRO: ${error.message}\n`);
      console.error(error);
    }
    process.exit(1);
  }
}

analyzeAlaskaCentral();
