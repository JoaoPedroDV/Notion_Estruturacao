# Notion Backup & Manager - Alaska Digital

Sistema completo de gerenciamento, backup e análise do workspace Alaska Central no Notion usando Node.js.

## 🎯 Objetivo

Ferramentas para gerenciar e fazer backup do workspace Notion da Alaska Digital, incluindo:
- Backup automático de databases e páginas em CSV e Markdown
- Scripts de análise e auditoria do workspace
- Exploração completa da estrutura do Notion
- Exportação de conteúdo para versionamento local
- Análise de dashboards e templates

## 🗂️ Estrutura do Projeto

```
Notion_Backup básico/
├── Alaska Central Scripts/     # Scripts Node.js para gerenciamento
│   ├── src/
│   │   ├── test-connection.js           # Testa conexão com API
│   │   ├── explore-workspace.js         # Explora todo o workspace
│   │   ├── analyze-dashboards.js        # Analisa estrutura de dashboards
│   │   ├── analyze-ideas.js             # Analisa banco de ideias
│   │   ├── analyze-alaska-central-page.js
│   │   ├── analyze-specific-pages.js
│   │   ├── audit-projects-database.js
│   │   ├── find-all-pages.js
│   │   └── list-team.js                 # Lista membros da equipe
│   ├── package.json
│   └── .env                             # Configurações (API key)
│
├── Central de Páginas HQ/      # Backup de páginas principais
│   ├── Alaska Central/
│   ├── ALASKA 2.0 - Mission Control/
│   ├── Templates/
│   ├── 👥 Equipe & Pessoas/
│   └── *.md                             # Páginas exportadas em Markdown
│
├── Clientes — Alaska OS/       # Backup de clientes
│   └── *.md                             # Páginas de clientes em Markdown
│
├── Central de Páginas HQ *.csv # Exports CSV do database
├── Clientes — Alaska OS *.csv  # Exports CSV de clientes
└── README.md                   # Este arquivo
```

## 🚀 Setup e Instalação

### Pré-requisitos
- Node.js instalado (v14 ou superior)
- Conta no Notion com acesso ao workspace Alaska
- Integração Notion API configurada

### Configuração

1. **Instalar dependências**
```bash
cd "Alaska Central Scripts"
npm install
```

2. **Configurar API Key do Notion**
   - Crie uma integração em https://www.notion.so/my-integrations
   - Copie a API Key gerada
   - Crie um arquivo `.env` na pasta "Alaska Central Scripts":
   ```
   NOTION_API_KEY=secret_sua_chave_aqui
   ```

3. **Compartilhar páginas com a integração**
   - No Notion, abra as páginas que deseja acessar
   - Clique em "..." → "Add connections" → Selecione sua integração

## 📋 Scripts Disponíveis

### Conexão e Testes
```bash
npm run test-connection    # Testa conexão e lista usuários/databases
```

### Análise e Exploração
```bash
npm run audit              # Auditoria completa do workspace
npm run list-databases     # Lista todos os databases
npm run list-users         # Lista todos os usuários
npm run analyze-tasks      # Analisa tarefas do workspace
```

### Scripts Personalizados
```bash
node src/explore-workspace.js          # Explora toda estrutura acessível
node src/analyze-dashboards.js         # Analisa templates de dashboards
node src/find-all-pages.js             # Encontra todas as páginas
node src/analyze-alaska-central-page.js # Analisa página principal
```

## 📊 Databases Backupeados

### Central de Páginas HQ
Database principal com documentação, processos e páginas importantes:
- Alaska Central (Wiki principal)
- ALASKA 2.0 - Mission Control
- Sistema de Mercado de Recompensas
- Templates e guias
- Equipe & Pessoas

**Formato de backup**: CSV + Markdown individual por página

### Clientes — Alaska OS
Database de gestão de clientes com informações de contatos, projetos e status.

**Total de clientes**: 60+ registros
**Formato de backup**: CSV + Markdown individual por cliente

## 🔧 Funcionalidades dos Scripts

### test-connection.js
- Valida autenticação da API
- Lista usuários do workspace
- Mostra databases recentes
- Diagnóstico de permissões

### explore-workspace.js
- Busca paginada de todo o conteúdo
- Separa databases de páginas
- Busca específica por "Alaska Central"
- Exporta análise completa em JSON
- Conta registros em cada database

### analyze-dashboards.js
- Analisa estrutura de dashboards específicos
- Lista todos os blocos de conteúdo
- Identifica databases linkados
- Exporta estrutura em JSON

## 📦 Dependências

```json
{
  "@notionhq/client": "^2.2.15",  # Cliente oficial Notion API
  "dotenv": "^16.4.5"              # Gerenciamento de variáveis de ambiente
}
```

## 🔐 Segurança

- ✅ API Keys armazenadas em variáveis de ambiente
- ✅ Arquivo `.env` incluído no `.gitignore`
- ✅ Nunca comitar credenciais
- ⚠️ Backups locais contêm dados sensíveis - não comitar para repositórios públicos
- ⚠️ Manter backup dos arquivos `.env` em local seguro

## 📝 Formato dos Backups

### Arquivos CSV
Exportações tabulares dos databases com todas as propriedades:
- Nome, tipo, departamento, links
- Responsáveis e níveis de acesso
- Status e última atualização
- Tags e descrições

### Arquivos Markdown
Páginas individuais exportadas com:
- Metadados da página
- Conteúdo formatado
- Links e referências
- Estrutura preservada

## 🔄 Workflow Recomendado

1. **Teste a conexão**
   ```bash
   npm run test-connection
   ```

2. **Explore o workspace**
   ```bash
   node src/explore-workspace.js
   ```

3. **Execute backups regulares**
   - Exportar databases atualizados
   - Salvar arquivos CSV e Markdown
   - Versionar alterações importantes

4. **Análise de conteúdo**
   ```bash
   node src/analyze-dashboards.js
   ```

## 🎯 Próximos Passos

- [ ] Automatizar backups agendados
- [ ] Sincronização bidirecional
- [ ] Interface web para visualização
- [ ] Sistema de versionamento de alterações
- [ ] Comparação de versões (diff)
- [ ] Restauração de backups para Notion
- [ ] Relatórios de auditoria automatizados

## 📞 Suporte

Para questões sobre o projeto:
- Contato: João Pedro Mandacari - Alaska Digital
- Workspace: Alaska Central
- Uso: Interno

## 📝 Licença

Uso interno - Alaska Digital
Todos os dados e backups são propriedade da Alaska Digital
