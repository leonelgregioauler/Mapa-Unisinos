<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  BookOpen,
  Building2,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Search,
  Utensils,
} from '@lucide/vue'
import { campusCenter, campusLocations, fallbackUserLocation } from './data/locations'
import { hasGoogleMapsKey, loadGoogleMaps } from './services/googleMaps'

const query = ref('')
const selectedLocation = ref(campusLocations[0])
const userLocation = ref(fallbackUserLocation)
const locationStatus = ref('Usando entrada principal como ponto inicial.')
const mapStatus = ref('Carregando mapa...')
const routeInfo = ref('')
const mapElement = ref(null)
const isRouting = ref(true)

let map
let userMarker
let destinationMarker
let directionsService
let directionsRenderer

// Item de filtro para filtrar locais (query : texto digitado) 
const filteredLocations = computed(() => {
  const term = normalize(query.value)

  if (!term) {
    return campusLocations
  }

  return campusLocations.filter((location) => {
    const searchable = [
      location.name,
      location.type,
      location.building,
      location.description,
      ...location.aliases,
    ]
      .join(' ')
      .toLowerCase()

    return normalize(searchable).includes(term)
  })
})

const groupedSuggestions = computed(() => filteredLocations.value.slice(0, 7))
const hasKey = computed(() => hasGoogleMapsKey())

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Aciona ao selecionar um local
function selectLocation(location) {
  selectedLocation.value = location
  query.value = location.name
}

// Carrega o primeiro resultado do array de locais
function selectFirstResult() {
  if (filteredLocations.value.length > 0) {
    selectLocation(filteredLocations.value[0])
  }
}

function iconFor(location) {
  if (location.id === 'ru') return Utensils
  if (location.id === 'biblioteca') return BookOpen
  if (location.type === 'Predio') return Building2
  return MapPin
}

// solicita usar localização do GPS ou antena de internet
function getUserLocation() {
  if (!navigator.geolocation) {
    locationStatus.value = 'Geolocalizacao indisponivel neste navegador.'
    return
  }

  locationStatus.value = 'Solicitando sua localizacao...'

  // obtém a posição atual do GPS ou da antena de internet utilizada.
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      locationStatus.value = 'Sua localizacao atual foi encontrada.'
    },
    () => {
      locationStatus.value = 'Permissao negada. Mantivemos a entrada principal como origem.'
    },
    {
      enableHighAccuracy: true,
      timeout: 9000,
      maximumAge: 30000,
    },
  )
}

// abre rota no Google Maps
function openExternalRoute() {
  const origin = `${userLocation.value.lat},${userLocation.value.lng}`
  const destination = `${selectedLocation.value.lat},${selectedLocation.value.lng}`
  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`,
    '_blank',
    'noopener,noreferrer',
  )
}

async function setupGoogleMap() {
  if (!hasGoogleMapsKey()) {
    mapStatus.value = 'Mapa demonstrativo ativo. Configure a API key para usar Google Maps.'
    return
  }

  try {
    // função padrão do Google Maps, para carregar o mapa
    const googleMaps = await loadGoogleMaps()
    await nextTick()

    // dados para posicionar o mapa ao carregar
    map = new googleMaps.Map(mapElement.value, {
      center: campusCenter,
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    })

    // APIs do Directions API, usadas para criar as rotas
    directionsService = new googleMaps.DirectionsService()
    directionsRenderer = new googleMaps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#0f5f4a',
        strokeWeight: 5,
      },
    })

    // marcadores (pontos no mapa)
    userMarker = new googleMaps.Marker({
      map,
      position: userLocation.value,
      title: 'Voce esta aqui',
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    })

    // destino
    destinationMarker = new googleMaps.Marker({
      map,
      position: selectedLocation.value,
      title: selectedLocation.value.name,
    })

    mapStatus.value = 'Google Maps conectado.'
    updateMap()
  } catch (error) {
    mapStatus.value = error.message
  }
}

function updateMap() {
  if (!map || !window.google?.maps) return

  userMarker.setPosition(userLocation.value)
  destinationMarker.setPosition(selectedLocation.value)
  destinationMarker.setTitle(selectedLocation.value.name)

  if (!isRouting.value) {
    directionsRenderer.set('directions', null)
    const bounds = new window.google.maps.LatLngBounds()
    bounds.extend(userLocation.value)
    bounds.extend(selectedLocation.value)
    map.fitBounds(bounds)
    routeInfo.value = 'Destino destacado no mapa.'
    return
  }

  // rota usando API do Directions API do Google
  directionsService.route(
    {
      origin: userLocation.value,
      destination: selectedLocation.value,
      travelMode: window.google.maps.TravelMode.WALKING,
    },
    (result, status) => {
      if (status === 'OK') {
        // Se encontrou a rota, traça a rota - Importante ter a API Key e o serviço ativado no Google Cloud
        directionsRenderer.setDirections(result)
        const leg = result.routes[0]?.legs[0]

        // mostra dados da distância traçada.
        routeInfo.value = leg ? `${leg.distance.text} caminhando, cerca de ${leg.duration.text}.` : ''
      } else {
        const bounds = new window.google.maps.LatLngBounds()
        bounds.extend(userLocation.value)
        bounds.extend(selectedLocation.value)
        map.fitBounds(bounds)
        routeInfo.value = 'Rota indisponivel, mas origem e destino foram marcados.'
      }
    },
  )
}

// Marcadores cadastrados para quando não tem a API Key
function fallbackMarkerStyle(location) {
  const minLat = -29.796
  const maxLat = -29.7934
  const minLng = -51.1543
  const maxLng = -51.1503

  const x = ((location.lng - minLng) / (maxLng - minLng)) * 100
  const y = ((maxLat - location.lat) / (maxLat - minLat)) * 100

  return {
    left: `${Math.min(94, Math.max(5, x))}%`,
    top: `${Math.min(88, Math.max(9, y))}%`,
  }
}

onMounted(() => {
  // Utilização da função onMounted muito falada nas aulas. Quando está tudo carregado, instancia o mapa
  setupGoogleMap()
})

watch([selectedLocation, userLocation, isRouting], updateMap)
</script>

<template>
  <main class="app-shell">
    <section class="control-panel" aria-label="Busca de locais no campus">
      <div class="brand-row">
        <div class="brand-mark">
          <MapPin :size="24" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">Unisinos Sao Leopoldo</p>
          <h1>Mapa do campus</h1>
        </div>
      </div>

      <form class="search-box" @submit.prevent="selectFirstResult">
        <Search :size="20" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          placeholder="Buscar RU, biblioteca, atendimento, predio A..."
          aria-label="Buscar local ou predio"
        />
        <button type="submit" title="Buscar primeiro resultado">
          <Navigation :size="18" aria-hidden="true" />
        </button>
      </form>

      <div class="action-row">
        <button class="primary-action" type="button" @click="getUserLocation">
          <LocateFixed :size="18" aria-hidden="true" />
          Usar minha localizacao
        </button>
        <label class="route-toggle">
          <input v-model="isRouting" type="checkbox" />
          <span>Rota</span>
        </label>
      </div>

      <p class="status-line">{{ locationStatus }}</p>

      <div class="suggestions" aria-label="Locais encontrados">
        <button
          v-for="location in groupedSuggestions"
          :key="location.id"
          class="location-item"
          :class="{ active: selectedLocation.id === location.id }"
          type="button"
          @click="selectLocation(location)"
        >
          <span class="item-icon">
            <component :is="iconFor(location)" :size="19" aria-hidden="true" />
          </span>
          <span>
            <strong>{{ location.name }}</strong>
            <small>{{ location.type }} - {{ location.description }}</small>
          </span>
        </button>
      </div>
    </section>

    <section class="map-panel" aria-label="Mapa e rota">
      <div class="map-toolbar">
        <div>
          <p class="eyebrow">Destino selecionado</p>
          <h2>{{ selectedLocation.name }}</h2>
        </div>
        <button class="icon-action" type="button" title="Abrir rota no Google Maps" @click="openExternalRoute">
          <Route :size="21" aria-hidden="true" />
        </button>
      </div>

      <div class="map-frame">
        <!-- Caso tenha a key, abre o mapa -->
        <div v-if="hasKey" ref="mapElement" class="google-map" aria-label="Google Maps"></div>

        <!-- Caso não tenha a key, usa o mapa demo -->
        <!-- A função fallbackMarkerStyle busca os marcadores cadastrados -->
        <div v-else class="fallback-map" aria-label="Mapa demonstrativo do campus">
          <div class="campus-lane lane-one"></div>
          <div class="campus-lane lane-two"></div>
          <div class="water"></div>
          <button
            v-for="location in campusLocations"
            :key="location.id"
            class="fallback-marker"
            :class="{ selected: selectedLocation.id === location.id }"
            :style="fallbackMarkerStyle(location)"
            type="button"
            :title="location.name"
            @click="selectLocation(location)"
          >
            {{ location.building.slice(0, 2) }}
          </button>
          <span class="user-dot" :style="fallbackMarkerStyle(userLocation)" title="Origem"></span>
        </div>
      </div>

      <div class="details-bar">
        <div>
          <span class="label">Mapa</span>
          <strong>{{ mapStatus }}</strong>
        </div>
        <div>
          <span class="label">Percurso</span>
          <strong>{{ routeInfo || 'Selecione um local para estimar a rota.' }}</strong>
        </div>
      </div>
    </section>
  </main>
</template>
