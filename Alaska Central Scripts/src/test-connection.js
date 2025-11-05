require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function testConnection() {
  console.log('\n==================================================');
  console.log('🔌 TESTANDO CONEXÃO COM NOTION ALASKA CENTRAL');
  console.log('==================================================\n');

  try {
    // Testar acesso básico
    console.log('📡 Testando autenticação...');
    const users = await notion.users.list({});
    console.log(`✅ Autenticação bem-sucedida!`);
    console.log(`👥 Usuários encontrados: ${users.results.length}\n`);

    // Listar usuários
    console.log('👥 MEMBROS DA EQUIPE:');
    console.log('--------------------------------------------------');
    users.results.forEach((user, index) => {
      const name = user.name || 'Sem nome';
      const type = user.type;
      const email = user.person?.email || 'N/A';
      console.log(`${index + 1}. ${name}`);
      console.log(`   Tipo: ${type}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${user.id}\n`);
    });

    // Buscar databases
    console.log('--------------------------------------------------');
    console.log('📊 Buscando databases...\n');

    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    console.log(`✅ ${response.results.length} databases encontrados!\n`);

    console.log('📊 DATABASES PRINCIPAIS:');
    console.log('--------------------------------------------------');
    response.results.slice(0, 10).forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Sem título';
      const icon = db.icon?.emoji || '📄';
      console.log(`${index + 1}. ${icon} ${title}`);
      console.log(`   ID: ${db.id}`);
      console.log(`   Última edição: ${new Date(db.last_edited_time).toLocaleString('pt-BR')}\n`);
    });

    console.log('==================================================');
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
    console.log('==================================================\n');

    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('1. npm run list-databases - Listar todos os databases');
    console.log('2. npm run list-users - Listar todos os usuários');
    console.log('3. npm run audit - Fazer auditoria completa\n');

  } catch (error) {
    console.error('❌ ERRO na conexão:');
    console.error(`Mensagem: ${error.message}`);
    console.error(`Código: ${error.code}\n`);

    if (error.code === 'unauthorized') {
      console.error('🔐 Problema de autenticação!');
      console.error('Verifique se:');
      console.error('1. A API key está correta');
      console.error('2. A integração tem permissões necessárias');
      console.error('3. A integração está conectada ao workspace\n');
    }

    process.exit(1);
  }
}

testConnection();
