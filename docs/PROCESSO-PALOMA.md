# Project: Paloma Correa Beauty & Academy

## Purpose
O site deve posicionar a Paloma como Lash Designer e educadora, com uma experiencia bonita, clara e funcional para:

- mostrar resultados reais;
- explicar o mapeamento personalizado;
- apresentar servicos de cilios;
- apresentar o curso Power Lash;
- permitir agendamento online;
- gerar Pix de sinal no final do fluxo;
- registrar a reserva na automacao.

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript
- CSS global em `app/globals.css`
- Route Handlers em `app/api/`
- Pix copia e cola em `lib/pix.ts`
- Google Calendar ICS para disponibilidade
- Apps Script para automacao de agenda/email/planilha

## Commands
- `npm.cmd run dev` - desenvolvimento
- `npm.cmd run build` - build de producao
- `npm.cmd run start -- -H 127.0.0.1 --port 4175` - servir localmente
- `set NODE_OPTIONS=--use-system-ca&& npm.cmd run start -- -H 127.0.0.1 --port 4175` - servir localmente com certificados do Windows

Local URL:

```txt
http://127.0.0.1:4175
```

## Architecture
- `app/page.tsx` - conteudo principal, hero, servicos, curso, galeria, depoimentos e booking
- `app/globals.css` - visual completo, responsivo e animacoes
- `lib/studio-data.ts` - dados da Paloma, servicos, curso, horarios e regras de agenda
- `lib/pix.ts` - geracao do Pix
- `app/api/availability/route.ts` - consulta de horarios livres/ocupados
- `app/api/booking/route.ts` - cria reserva, gera Pix e chama automacao
- `public/Imagens` - imagens finais usadas no site
- `public/NovasImagens` - entrada temporaria de novas imagens
- `public/Catalogo` - catalogos e PDFs publicos

## Code Style
- Nao usar `any` explicito
- Usar `import/export`, sem `require()`
- Arquivos novos em kebab-case
- Assets novos em ASCII, sem espaco e sem acentos
- CSS visual fica em `app/globals.css`
- Evitar grandes refactors fora do pedido
- Preservar mudancas existentes do usuario

## Visual Standard
- Manter a paleta atual: rose, cream, champagne, charcoal e ink
- Direcao visual: beauty premium, editorial, organizada e profissional
- Evitar excesso de:
  - glassmorphism;
  - sombras difusas;
  - cards arredondados;
  - blocos genericos;
  - textos longos.
- Preferir:
  - fotos reais;
  - contraste tipografico;
  - bordas sutis;
  - grid editorial;
  - secoes com funcao clara.

## Copy Rules
- Usar `mapeamento`, nao `desenho`
- Falar com objetividade e autoridade
- Valorizar detalhes tecnicos de forma simples:
  - curvatura;
  - espessura;
  - volume;
  - retencao;
  - manutencao;
  - conforto;
  - biosseguranca.
- Nao destacar o valor do sinal logo no hero
- O Pix de R$ 1 entra apenas no final do agendamento

## Environment Variables
`.env.local` deve ficar privado e fora do Git.

```env
PIX_KEY=palomasantoslv2@gmail.com
PIX_MERCHANT_NAME=PALOMA LASH
PIX_MERCHANT_CITY=SAO PAULO

BOOKING_EMAIL_TO=palomasantoslv2@gmail.com
BOOKING_EMAIL_ENABLED=true

SCHEDULE_WEBHOOK_URL=
BOOKING_SHEETS_WEBHOOK_URL=
GOOGLE_CALENDAR_ICS_URL=
```

Na Vercel, cadastrar as mesmas variaveis em Project Settings > Environment Variables.

## Asset Process
Quando a Paloma/Igor enviar novos arquivos:

1. Conferir o que entrou em `public/NovasImagens` e `public/Catalogo`.
2. Visualizar as imagens antes de usar.
3. Corrigir orientacao apenas quando necessario.
4. Copiar somente as escolhidas para `public/Imagens` com nome limpo.
5. Copiar PDF final para `public/Catalogo` com nome limpo.
6. Atualizar `gallery`, links ou secoes em `app/page.tsx`.
7. Evitar referenciar arquivos com acento, espaco ou nome muito longo.

## Booking Flow
Fluxo ideal do cliente:

1. Escolhe entre `cilios` ou `curso`.
2. Se for cilios, escolhe o tipo de procedimento.
3. Escolhe data e horario disponivel.
4. Preenche nome, telefone e email.
5. Confirma dados.
6. Recebe o Pix de sinal de R$ 1.
7. A automacao registra a reserva e avisa a Paloma.

## Availability Test
Com o servidor rodando:

```powershell
Invoke-RestMethod -Method Get "http://127.0.0.1:4175/api/availability?date=2026-07-01&serviceId=volume-brasileiro"
```

Validar:

- resposta tem `slots`;
- horarios ocupados aparecem como `ocupado`;
- dias fechados retornam `closed: true`;
- quando agenda real funciona, nao deve depender de `fallback: true`.

## Booking Test
Nao criar reserva real sem confirmacao.

Quando o Igor aprovar:

- usar nome `SIMULACAO CODEX`;
- escolher uma data futura;
- confirmar se `pixPayload` foi gerado;
- confirmar se `scheduleSent` ou `emailSent` retornou `true`;
- conferir na agenda da Paloma se o evento apareceu.

## Git Workflow
Antes de commitar:

```powershell
git status --short
npm.cmd run build
```

Commit:

```powershell
git add .
git commit -m "add improved project workflow"
git push
```

Remote:

```txt
https://github.com/devig0rzin/Paloma_Site_Cilios.git
```

## Common Gotchas
- Apps Script pode responder erro em GET se nao tiver `doGet`; nesse caso a disponibilidade usa ICS
- Node local no Windows pode falhar certificado com Google; usar `NODE_OPTIONS=--use-system-ca`
- `.env.local` nunca deve aparecer no `git status`
- Imagem grande demais no hero pode quebrar mobile se nao tiver `object-fit` e altura controlada
- Galeria com fotos de orientacoes diferentes precisa de `object-position` e proporcoes fixas
- Pix e webhooks devem rodar no server, nunca expostos no client

## Final Checklist
- `git status --short` revisado
- `npm.cmd run build` executado
- Site abre em `http://127.0.0.1:4175` quando servidor estiver rodando
- Hero, galeria e booking funcionam no mobile
- Agendamento de cilios e curso aparece corretamente
- Pix aparece somente no final
- Chave Pix e email ficam em env/server
- Arquivos sensiveis nao foram para o Git
- Resposta final informa exatamente o que mudou
