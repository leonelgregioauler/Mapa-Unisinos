# Mapa Unisinos Sao Leopoldo
 
Aplicativo multiplataforma desenvolvido com Vue para localizar alunos e visitantes dentro do campus Sao Leopoldo da Unisinos.

## Funcionalidades

- Busca por locais conhecidos do campus, como RU, biblioteca, atendimento e predios.
- Uso da localizacao atual do usuario, quando autorizada pelo navegador.
- Exibicao do destino no mapa.
- Rota entre a posicao atual e o local pesquisado usando Google Maps.
- Mapa demonstrativo interno quando a chave da API ainda nao foi configurada.
- Interface responsiva para web e mobile.

## Como executar

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

3. No arquivo `.env`, informe sua chave:

```bash
VITE_GOOGLE_MAPS_API_KEY=sua_chave_do_google_maps
```

4. Rode o projeto:

```bash
npm run dev
```

## APIs necessarias no Google Cloud

Ative no projeto da sua chave:

- Maps JavaScript API
- Directions API

## Observacao

As coordenadas dos locais foram cadastradas para fins academicos e podem ser ajustadas em `src/data/locations.js`.
