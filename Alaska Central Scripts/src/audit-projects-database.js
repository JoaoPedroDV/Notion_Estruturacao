require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function auditProjects() {
  console.log('\n==================================================');
  console.log('🔍 AUDITORIA: CENTRAL DE PROJETOS ALASKA');
  console.log('==================================================\n');

  try {
    // Buscar database "Central de projetos Alaska"
    const search = await notion.search({
      query: 'Central de projetos Alaska',
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    if (search.results.length === 0) {
      console.log('❌ Database "Central de projetos Alaska" não encontrado!\n');
      return;
    }

    const projectsDb = search.results[0];
    const dbId = projectsDb.id;
    const dbTitle = projectsDb.title?.[0]?.plain_text || 'Sem título';

    console.log(`✅ Database encontrado: ${dbTitle}`);
    console.log(`ID: ${dbId}\n`);

    console.log('==================================================');
    console.log('📋 ANÁLISE DE PROPRIEDADES');
    console.log('==================================================\n');

    const properties = projectsDb.properties;
    const analysis = {
      timestamp: new Date().toISOString(),
      database: {
        id: dbId,
        title: dbTitle,
        url: projectsDb.url
      },
      properties: {},
      issues: [],
      recommendations: []
    };

    // Identificar campos relacionados a pessoas/responsáveis
    const peopleFields = [];
    const relationFields = [];

    for (const [propName, propValue] of Object.entries(properties)) {
      analysis.properties[propName] = {
        type: propValue.type,
        id: propValue.id
      };

      console.log(`📌 ${propName} (${propValue.type})`);

      // Identificar campos de pessoas
      if (propValue.type === 'people') {
        peopleFields.push(propName);
        console.log(`   ⚠️ Campo de PESSOAS detectado`);
      }

      // Identificar relações
      if (propValue.type === 'relation') {
        relationFields.push(propName);
        console.log(`   🔗 Relação com: ${propValue.relation.database_id}`);
        analysis.properties[propName].related_database = propValue.relation.database_id;
      }

      // Capturar opções de select/multi_select
      if (propValue.type === 'select' && propValue.select?.options) {
        analysis.properties[propName].options = propValue.select.options.map(o => o.name);
        console.log(`   Opções: ${propValue.select.options.map(o => o.name).slice(0, 5).join(', ')}${propValue.select.options.length > 5 ? '...' : ''}`);
      }

      if (propValue.type === 'multi_select' && propValue.multi_select?.options) {
        analysis.properties[propName].options = propValue.multi_select.options.map(o => o.name);
        console.log(`   Opções: ${propValue.multi_select.options.map(o => o.name).slice(0, 5).join(', ')}${propValue.multi_select.options.length > 5 ? '...' : ''}`);
      }

      console.log('');
    }

    console.log('==================================================');
    console.log('🔍 PROBLEMAS DETECTADOS');
    console.log('==================================================\n');

    // Problema 1: Múltiplos campos de pessoas
    if (peopleFields.length > 1) {
      console.log(`⚠️ DUPLICAÇÃO: ${peopleFields.length} campos de PESSOAS encontrados:`);
      peopleFields.forEach(field => console.log(`   - ${field}`));
      console.log('');

      analysis.issues.push({
        type: 'duplicate_people_fields',
        severity: 'high',
        fields: peopleFields,
        description: 'Múltiplos campos para atribuir pessoas podem causar confusão'
      });

      analysis.recommendations.push({
        issue: 'duplicate_people_fields',
        recommendation: 'Consolidar em um único campo "Equipe do Projeto" (multi-people) e adicionar um campo select para "Papel" (Responsável, Designer, Dev, etc.)'
      });
    }

    console.log('\n📊 CAMPOS DE PESSOAS:');
    console.log(`   Total: ${peopleFields.length}`);
    peopleFields.forEach(field => console.log(`   - ${field}`));
    console.log('');

    console.log('🔗 CAMPOS DE RELAÇÃO:');
    console.log(`   Total: ${relationFields.length}`);
    relationFields.forEach(field => console.log(`   - ${field}`));
    console.log('');

    // Buscar alguns projetos de exemplo para análise
    console.log('==================================================');
    console.log('📄 ANÁLISE DE PROJETOS (Amostra)');
    console.log('==================================================\n');

    const projects = await notion.databases.query({
      database_id: dbId,
      page_size: 10
    });

    console.log(`Total de projetos no database: ${projects.results.length}\n`);

    // Analisar uso dos campos de pessoas
    const fieldUsage = {};
    peopleFields.forEach(field => {
      fieldUsage[field] = { filled: 0, empty: 0, total_people: 0 };
    });

    projects.results.forEach((project, index) => {
      let title = 'Sem título';

      for (const [key, value] of Object.entries(project.properties)) {
        if (value.type === 'title' && value.title?.[0]?.plain_text) {
          title = value.title[0].plain_text;
        }
      }

      console.log(`${index + 1}. ${title}`);

      // Analisar campos de pessoas
      peopleFields.forEach(field => {
        const prop = project.properties[field];
        if (prop && prop.type === 'people') {
          const peopleCount = prop.people?.length || 0;

          if (peopleCount > 0) {
            fieldUsage[field].filled++;
            fieldUsage[field].total_people += peopleCount;

            const names = prop.people.map(p => p.name || 'Sem nome').join(', ');
            console.log(`   ${field}: ${names}`);
          } else {
            fieldUsage[field].empty++;
            console.log(`   ${field}: (vazio)`);
          }
        }
      });

      console.log('');
    });

    console.log('==================================================');
    console.log('📊 ESTATÍSTICAS DE USO');
    console.log('==================================================\n');

    for (const [field, stats] of Object.entries(fieldUsage)) {
      const total = stats.filled + stats.empty;
      const fillRate = total > 0 ? ((stats.filled / total) * 100).toFixed(1) : 0;
      const avgPeople = stats.filled > 0 ? (stats.total_people / stats.filled).toFixed(1) : 0;

      console.log(`📌 ${field}:`);
      console.log(`   Preenchidos: ${stats.filled}/${total} (${fillRate}%)`);
      console.log(`   Média de pessoas: ${avgPeople}`);
      console.log('');

      analysis.properties[field].usage_stats = {
        filled: stats.filled,
        empty: stats.empty,
        fill_rate: parseFloat(fillRate),
        avg_people: parseFloat(avgPeople)
      };
    }

    // Recomendações finais
    console.log('==================================================');
    console.log('💡 RECOMENDAÇÕES');
    console.log('==================================================\n');

    console.log('1. CONSOLIDAÇÃO DE CAMPOS DE PESSOAS:');
    console.log('   ✅ Manter: "Equipe do Projeto" (people, multi-select)');
    console.log('   ✅ Adicionar: "Papel no Projeto" (select ou relation)');
    console.log('   ❌ Remover/Depreciar: Campos duplicados\n');

    console.log('2. ESTRUTURA RECOMENDADA:');
    console.log('   - Equipe do Projeto (people): Todos os envolvidos');
    console.log('   - Responsável Principal (formula ou rollup): Derivado do papel');
    console.log('   - Papéis (relation): Link para database de "Papéis em Projetos"\n');

    console.log('3. FILTROS AUTOMÁTICOS NOS DASHBOARDS:');
    console.log('   - Dashboard individual: Filtrar onde pessoa está em "Equipe do Projeto"');
    console.log('   - Por papel: Adicionar filtro adicional de papel\n');

    // Salvar análise
    const outputPath = 'C:\\Users\\Pedro\\Desktop\\Notion Structures\\projects-database-audit.json';
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');

    console.log('==================================================');
    console.log('✅ AUDITORIA CONCLUÍDA!');
    console.log('==================================================');
    console.log(`📁 Relatório salvo em: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

auditProjects();
