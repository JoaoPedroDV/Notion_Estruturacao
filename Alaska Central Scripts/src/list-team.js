require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function listTeam() {
  console.log('\n==================================================');
  console.log('👥 BUSCANDO EQUIPE - ALASKA CENTRAL');
  console.log('==================================================\n');

  try {
    // Primeiro, buscar o database "Equipe & Pessoas" ou similares
    console.log('🔍 Procurando database da equipe...\n');

    const searchResponse = await notion.search({
      query: 'Equipe',
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    console.log(`📊 Databases encontrados com "Equipe": ${searchResponse.results.length}\n`);

    // Listar todos os databases relacionados a equipe/pessoas
    const teamDatabases = [];

    for (const db of searchResponse.results) {
      const title = db.title?.[0]?.plain_text || 'Sem título';
      const icon = db.icon?.emoji || '📄';
      console.log(`${icon} ${title}`);
      console.log(`   ID: ${db.id}\n`);
      teamDatabases.push({ id: db.id, title });
    }

    // Também buscar por "Pessoas", "Colaboradores", "Contas"
    const keywords = ['Pessoas', 'Colaboradores', 'Contas'];

    for (const keyword of keywords) {
      const response = await notion.search({
        query: keyword,
        filter: {
          property: 'object',
          value: 'database'
        }
      });

      for (const db of response.results) {
        const title = db.title?.[0]?.plain_text || 'Sem título';
        const id = db.id;

        // Evitar duplicatas
        if (!teamDatabases.find(d => d.id === id)) {
          const icon = db.icon?.emoji || '📄';
          console.log(`${icon} ${title}`);
          console.log(`   ID: ${id}\n`);
          teamDatabases.push({ id, title });
        }
      }
    }

    console.log('==================================================');
    console.log(`✅ ${teamDatabases.length} database(s) relacionado(s) à equipe encontrado(s)\n`);

    // Para cada database encontrado, buscar os membros
    for (const db of teamDatabases) {
      console.log('==================================================');
      console.log(`👥 MEMBROS EM: ${db.title}`);
      console.log('==================================================\n');

      try {
        const response = await notion.databases.query({
          database_id: db.id,
          page_size: 100
        });

        console.log(`📋 Total de registros: ${response.results.length}\n`);

        // Analisar a estrutura do primeiro registro para entender as propriedades
        if (response.results.length > 0) {
          const firstPage = response.results[0];
          console.log('🔍 Propriedades disponíveis:');
          Object.keys(firstPage.properties).forEach(key => {
            const prop = firstPage.properties[key];
            console.log(`   - ${key} (${prop.type})`);
          });
          console.log('\n');
        }

        // Listar todos os membros
        response.results.forEach((page, index) => {
          // Tentar extrair o nome (pode estar em diferentes propriedades)
          let name = 'Sem nome';
          let email = 'N/A';
          let cargo = 'N/A';
          let status = 'N/A';

          // Buscar propriedade de título
          for (const [key, value] of Object.entries(page.properties)) {
            if (value.type === 'title' && value.title?.[0]?.plain_text) {
              name = value.title[0].plain_text;
            }
            // Buscar email
            if (value.type === 'email' && value.email) {
              email = value.email;
            }
            // Buscar cargo
            if (key.toLowerCase().includes('cargo') && value.type === 'multi_select') {
              cargo = value.multi_select.map(c => c.name).join(', ');
            }
            if (key.toLowerCase().includes('cargo') && value.type === 'select' && value.select) {
              cargo = value.select.name;
            }
            // Buscar status
            if (key.toLowerCase().includes('status') && value.type === 'status' && value.status) {
              status = value.status.name;
            }
            if (key.toLowerCase().includes('status') && value.type === 'select' && value.select) {
              status = value.select.name;
            }
          }

          console.log(`${index + 1}. ${name}`);
          console.log(`   Email: ${email}`);
          console.log(`   Cargo: ${cargo}`);
          console.log(`   Status: ${status}`);
          console.log(`   ID da página: ${page.id}\n`);
        });

      } catch (error) {
        console.error(`❌ Erro ao buscar membros de "${db.title}": ${error.message}\n`);
      }
    }

    console.log('==================================================');
    console.log('✅ BUSCA CONCLUÍDA!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

listTeam();
