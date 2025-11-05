require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function analyzeIdeas() {
  console.log('\n==================================================');
  console.log('💡 ANALISANDO DATABASES DE IDEIAS E IMPLEMENTAÇÃO');
  console.log('==================================================\n');

  try {
    // Buscar database "Ideias"
    console.log('🔍 Buscando database "Ideias"...\n');

    const ideasSearch = await notion.search({
      query: 'Ideias',
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    // Buscar "Implementação"
    console.log('🔍 Buscando database "Implementação"...\n');

    const implementationSearch = await notion.search({
      query: 'Implementação',
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    // Buscar "Central de projetos"
    console.log('🔍 Buscando database "Central de projetos"...\n');

    const projectsSearch = await notion.search({
      query: 'Central de projetos',
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    const allDatabases = [
      ...ideasSearch.results,
      ...implementationSearch.results,
      ...projectsSearch.results
    ];

    // Remover duplicatas
    const uniqueDatabases = allDatabases.filter((db, index, self) =>
      index === self.findIndex((d) => d.id === db.id)
    );

    console.log(`✅ ${uniqueDatabases.length} database(s) relevante(s) encontrado(s)\n`);

    const analysis = {
      timestamp: new Date().toISOString(),
      databases: []
    };

    for (const db of uniqueDatabases) {
      const title = db.title?.[0]?.plain_text || 'Sem título';
      const icon = db.icon?.emoji || '📄';

      console.log('==================================================');
      console.log(`${icon} ${title}`);
      console.log('==================================================');
      console.log(`ID: ${db.id}`);
      console.log(`URL: ${db.url}\n`);

      // Analisar propriedades do database
      console.log('📋 PROPRIEDADES:');
      const properties = db.properties || {};

      const dbAnalysis = {
        id: db.id,
        title,
        icon,
        url: db.url,
        properties: {},
        structure: []
      };

      for (const [propName, propValue] of Object.entries(properties)) {
        console.log(`   - ${propName} (${propValue.type})`);

        dbAnalysis.properties[propName] = {
          type: propValue.type,
          id: propValue.id
        };

        // Se for relation, capturar o database relacionado
        if (propValue.type === 'relation' && propValue.relation) {
          dbAnalysis.properties[propName].relation_database = propValue.relation.database_id;
          console.log(`     → Relacionado com: ${propValue.relation.database_id}`);
        }

        // Se for select/multi_select, capturar as opções
        if (propValue.type === 'select' && propValue.select?.options) {
          dbAnalysis.properties[propName].options = propValue.select.options.map(o => o.name);
          console.log(`     → Opções: ${propValue.select.options.map(o => o.name).join(', ')}`);
        }

        if (propValue.type === 'multi_select' && propValue.multi_select?.options) {
          dbAnalysis.properties[propName].options = propValue.multi_select.options.map(o => o.name);
          console.log(`     → Opções: ${propValue.multi_select.options.map(o => o.name).join(', ')}`);
        }
      }

      console.log('\n');

      // Buscar páginas/registros deste database
      try {
        console.log('📄 REGISTROS:');
        const pages = await notion.databases.query({
          database_id: db.id,
          page_size: 100
        });

        console.log(`   Total: ${pages.results.length} registros\n`);

        // Analisar primeiros 5 registros
        if (pages.results.length > 0) {
          console.log('🔍 PRIMEIROS REGISTROS:\n');

          for (let i = 0; i < Math.min(5, pages.results.length); i++) {
            const page = pages.results[i];

            // Extrair título
            let pageTitle = 'Sem título';
            for (const [key, value] of Object.entries(page.properties)) {
              if (value.type === 'title' && value.title?.[0]?.plain_text) {
                pageTitle = value.title[0].plain_text;
                break;
              }
            }

            console.log(`   ${i + 1}. ${pageTitle}`);
            console.log(`      ID: ${page.id}`);

            // Mostrar algumas propriedades relevantes
            for (const [key, value] of Object.entries(page.properties)) {
              // Responsável
              if (key.toLowerCase().includes('responsável') || key.toLowerCase().includes('responsavel')) {
                if (value.type === 'people' && value.people.length > 0) {
                  const names = value.people.map(p => p.name).join(', ');
                  console.log(`      Responsável: ${names}`);
                }
              }

              // Equipe
              if (key.toLowerCase().includes('equipe')) {
                if (value.type === 'people' && value.people.length > 0) {
                  const names = value.people.map(p => p.name).join(', ');
                  console.log(`      Equipe: ${names}`);
                }
                if (value.type === 'multi_select' && value.multi_select.length > 0) {
                  const names = value.multi_select.map(s => s.name).join(', ');
                  console.log(`      Equipe: ${names}`);
                }
              }

              // Status
              if (key.toLowerCase().includes('status')) {
                if (value.type === 'status' && value.status) {
                  console.log(`      Status: ${value.status.name}`);
                }
                if (value.type === 'select' && value.select) {
                  console.log(`      Status: ${value.select.name}`);
                }
              }
            }
            console.log('');
          }

          dbAnalysis.total_records = pages.results.length;
          dbAnalysis.sample_records = pages.results.slice(0, 5).map(page => {
            let title = 'Sem título';
            const props = {};

            for (const [key, value] of Object.entries(page.properties)) {
              if (value.type === 'title' && value.title?.[0]?.plain_text) {
                title = value.title[0].plain_text;
              }

              // Capturar valores relevantes
              if (value.type === 'people' && value.people.length > 0) {
                props[key] = value.people.map(p => p.name);
              }
              if (value.type === 'select' && value.select) {
                props[key] = value.select.name;
              }
              if (value.type === 'multi_select' && value.multi_select.length > 0) {
                props[key] = value.multi_select.map(s => s.name);
              }
              if (value.type === 'status' && value.status) {
                props[key] = value.status.name;
              }
            }

            return { id: page.id, title, properties: props };
          });
        }

      } catch (error) {
        console.log(`   ⚠️ Erro ao buscar registros: ${error.message}\n`);
      }

      analysis.databases.push(dbAnalysis);
      console.log('\n');
    }

    // Salvar análise em arquivo
    const outputPath = 'C:\\Users\\Pedro\\Desktop\\Notion Structures\\analysis-ideas-implementation.json';
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');

    console.log('==================================================');
    console.log('✅ ANÁLISE CONCLUÍDA!');
    console.log('==================================================');
    console.log(`📁 Arquivo salvo em: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzeIdeas();
