let loaderPromise 

// verifica existência da api key no arquivo .env
export function hasGoogleMapsKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return Boolean(key && key !== 'sua_chave_aqui')
}

// carrega o mapa
export function loadGoogleMaps() {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (!hasGoogleMapsKey()) {
    return Promise.reject(new Error('Google Maps API key nao configurada.'))
  }

  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const callbackName = `initUnisinosMap${Date.now()}`
      const script = document.createElement('script')
      const key = encodeURIComponent(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)

      window[callbackName] = () => {
        resolve(window.google.maps)
        delete window[callbackName]
      }

      // carrega o mapa
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${callbackName}`
      script.async = true
      script.defer = true
      script.onerror = () => reject(new Error('Nao foi possivel carregar o Google Maps.'))
      document.head.appendChild(script)
    })
  }

  return loaderPromise
}
