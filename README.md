# primedomtech

Comparador estático de software de negócio (CRM, gestão de projetos, e-mail marketing,
contabilidade, comunicação, sites/e-commerce). Modelo: páginas de **alternativas**,
**X vs Y** e **ofertas**, monetizadas por afiliado recorrente de SaaS.

Site 100% estático (HTML/CSS/JS puro, sem build). Mesma arquitetura da techdomina.

## Estrutura

```
primedomtech/
├── index.html              # home (renderiza o catálogo via main.js)
├── deals.html              # gerada — hub de ofertas/trials
├── data/tools.json         # FONTE DA VERDADE — todas as ferramentas
├── scripts/generate.js     # gerador das páginas SEO
├── software/<slug>.html    # gerada — perfil por ferramenta
├── alternatives/<slug>.html# gerada — "Best <Tool> alternatives"
├── vs/<a>-vs-<b>.html        # gerada — comparação cara a cara
├── category/<slug>.html    # gerada — "Best <categoria> software"
├── assets/css|js|img
├── sitemap.xml, robots.txt # gerados
└── 404.html                # gerada
```

## Como editar

1. Edite **`data/tools.json`** (adicionar ferramenta, trocar link de afiliado, mudar oferta).
2. Rode o gerador:

   ```bash
   node scripts/generate.js
   ```

   Isso reescreve as páginas de software/alternativas/vs/categoria, a página de deals,
   o 404, o sitemap.xml e o robots.txt. **Sempre reexecute após editar o JSON.**

## Preview local

```bash
cd primedomtech
python3 -m http.server 8000
# abra http://localhost:8000
```

(Servidor local é necessário: o catálogo carrega `data/tools.json` via fetch, que o
navegador bloqueia em `file://`.)

## Deploy

GitHub Pages (mesmo fluxo da techdomina): subir a pasta num repositório, ativar Pages
na branch `main`/raiz, e o `CNAME` já aponta para `primedomtech.com`. DNS no provedor
do domínio (GoDaddy) apontando para o GitHub Pages.

## Monetização

- Links em `data/tools.json` usam `?ref=primedomtech` como **placeholder**. Trocar pelos
  links de afiliado reais (programas diretos dos SaaS via Impact, PartnerStack, CJ etc.).
- Após trocar qualquer link: rodar `node scripts/generate.js` + commit/push.
