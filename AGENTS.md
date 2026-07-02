# Project: Paloma Correa Beauty & Academy

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript
- CSS global em `app/globals.css`
- Route Handlers em `app/api/`
- Pix copia e cola via `lib/pix.ts`
- Google Calendar ICS + Apps Script para agenda/automacao
- Server-first quando possivel

## Commands
- `npm.cmd run dev` - servidor local de desenvolvimento
- `npm.cmd run build` - build de producao
- `npm.cmd run start -- -H 127.0.0.1 --port 4175` - servidor local na porta usada pelo projeto
- `set NODE_OPTIONS=--use-system-ca&& npm.cmd run start -- -H 127.0.0.1 --port 4175` - usar no Windows quando o Google Calendar falhar por certificado

## Architecture
- App Router: rotas em `app/`
- Pagina principal em `app/page.tsx`
- Estilos visuais e responsivos em `app/globals.css`
- Dados de servicos, curso, horarios e contato em `lib/studio-data.ts`
- Geracao do Pix em `lib/pix.ts`
- Disponibilidade/calendario em `app/api/availability/route.ts`
- Reserva, Pix e webhook/email em `app/api/booking/route.ts`
- Assets publicos organizados em `public/Imagens`, `public/video` e `public/Catalogo`

## Code Style
- Nao usar `any` explicito; preferir `unknown` com type guard quando necessario
- Usar ES modules (`import/export`), sem `require()`
- Manter nomes de arquivos novos em kebab-case e sem acentos
- Componentes React em PascalCase quando forem extraidos
- Evitar CSS inline; centralizar visual em `app/globals.css`
- Manter textos do codigo em ASCII quando o arquivo ja estiver nesse padrao
- Refatorar somente o necessario para o pedido atual

## Design Rules
- Manter a paleta existente: rose, cream, champagne, charcoal e ink
- Estilo premium, editorial e profissional, sem cara de template
- Evitar glassmorphism em excesso, sombras difusas e cards demais
- Usar bordas definidas, radius contido e hierarquia clara
- Fotos reais devem ser o principal sinal visual
- Mobile precisa ser revisado antes de entregar: nav, hero, galeria e agendamento

## Content Rules
- Usar `mapeamento`, nao `desenho`, para personalizacao dos cilios
- Textos curtos, concretos e profissionais
- Valorizar: curvatura, espessura, volume, retencao, manutencao, conforto e biosseguranca
- Nao revelar o sinal de R$ 1 logo no inicio; deixar para o final do fluxo de reserva
- Separar claramente servicos de cilios e curso Power Lash

## Environment Variables
- `NEXT_PUBLIC_*` apenas para valores seguros no client
- Segredos, webhooks e URLs privadas ficam apenas em `.env.local` e Route Handlers
- Nunca commitar `.env.local`, `.env`, `.next`, `node_modules`, logs ou screenshots
- Copiar `.env.example` para `.env.local` ao clonar

Required local variables:

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

## Asset Workflow
- Entrada de arquivos novos:
  - `public/NovasImagens`
  - `public/Catalogo`
- Antes de usar imagem nova, conferir orientacao e proporcao
- Copiar os arquivos escolhidos para `public/Imagens` com nome simples em ASCII
- Copiar PDFs finais para `public/Catalogo` com nome simples em ASCII
- Atualizar referencias em `app/page.tsx`
- Evitar subir duplicatas brutas quando ja existir arquivo tratado com nome limpo

## Workflow
- Antes de editar: `git status --short`
- Ler os arquivos que serao alterados antes de aplicar patch
- Apos uma serie de mudancas: `npm.cmd run build`
- Testar disponibilidade sem criar reserva real:

```powershell
Invoke-RestMethod -Method Get "http://127.0.0.1:4175/api/availability?date=2026-07-01&serviceId=volume-brasileiro"
```

- Nao criar reserva real sem confirmacao do Igor, porque pode registrar na agenda/automacao
- Quando autorizado, usar nome evidente como `SIMULACAO CODEX`

## Git Workflow
- Verificar status antes de commitar: `git status --short`
- Rodar build antes de push: `npm.cmd run build`
- Commits em ingles, imperativo: `add booking calendar fallback`
- Remote: `https://github.com/devig0rzin/Paloma_Site_Cilios.git`

## Common Gotchas
- Apps Script pode nao ter `doGet`; disponibilidade deve cair para o ICS do Google Calendar
- Google Calendar local no Windows pode exigir `NODE_OPTIONS=--use-system-ca`
- O Pix de sinal deve aparecer no final das etapas, nao como chamada inicial
- Domingo e segunda podem ser dias fechados conforme dados em `lib/studio-data.ts`
- Imagens externas precisam de dominio autorizado em `next.config.ts`; preferir imagens locais em `public/`
- `revalidatePath()` e `revalidateTag()` so funcionam em Server Actions/Route Handlers

## Final Checklist
- Build passou ou o motivo da falha foi explicado
- `.env.local` nao apareceu no Git
- Agenda retorna horarios corretamente
- Agendamento alterna entre cilios e curso
- Pix usa a chave correta via env
- Mobile foi conferido para hero, galeria e booking
- Resposta final informa o que mudou e a URL local se o servidor estiver rodando
