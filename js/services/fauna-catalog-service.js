(function(){
  function getCache() {
    window.faunaCatalogosCache = window.faunaCatalogosCache || {};
    return window.faunaCatalogosCache;
  }

  function getCatalogoCacheKey(tabla, filtros) {
    var key = tabla;
    if (filtros && typeof filtros === 'object') {
      var parts = Object.keys(filtros).sort().map(function(k){ return k + ':' + filtros[k]; });
      if (parts.length) key += '|' + parts.join('|');
    }
    return key;
  }

  function normalizarTextoCatalogo(valor) {
    return (valor || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  // Último error por tabla, para poder explicarlo en la interfaz.
  var ultimoError = {};

  function aplicarFiltros(query, filtros) {
    if (filtros && typeof filtros === 'object') {
      Object.keys(filtros).forEach(function(campo){
        if (filtros[campo] !== undefined && filtros[campo] !== null && filtros[campo] !== '') {
          query = query.eq(campo, filtros[campo]);
        }
      });
    }
    return query;
  }

  /**
   * Lee un catálogo. Antes cualquier fallo devolvía una lista vacía en
   * silencio y el desplegable quedaba sin opciones sin explicar por qué.
   * Ahora se registra el error y, si el problema son las columnas opcionales
   * (`activo` / `orden`), se reintenta sin ellas antes de darse por vencido.
   */
  async function getCatalogoActivo(client, tabla, filtros) {
    if (!client) return [];
    delete ultimoError[tabla];

    var res = await aplicarFiltros(
      client.from(tabla).select('id, nombre').eq('activo', true).order('orden', { ascending: true }),
      filtros
    );

    if (res.error) {
      var msg = String(res.error.message || '');
      var columnaFaltante = /column .* does not exist|activo|orden/i.test(msg);
      if (columnaFaltante) {
        // La tabla puede no tener `activo` u `orden`: reintentar sin ellas.
        res = await aplicarFiltros(client.from(tabla).select('id, nombre'), filtros);
      }
    }

    if (res.error) {
      ultimoError[tabla] = res.error.message || 'Error desconocido';
      console.warn('[Catálogos fauna] No se pudo leer "' + tabla + '": ' + ultimoError[tabla] +
        '. Revisa que la tabla exista y que su política de lectura incluya al equipo MHR.');
      return [];
    }

    var filas = res.data || [];
    if (!filas.length) {
      console.warn('[Catálogos fauna] La tabla "' + tabla + '" no devolvió registros. ' +
        'Puede estar vacía, con todos sus registros inactivos, o su política de lectura ' +
        'puede estar ocultándolos.');
    }
    return filas;
  }

  async function cargarCatalogoSelect(client, tabla, selectElement, placeholder, filtros) {
    if (!selectElement) return;
    var valorActual = selectElement.value;
    selectElement.innerHTML = '';
    var placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    selectElement.appendChild(placeholderOption);

    var cache = getCache();
    var cacheKey = getCatalogoCacheKey(tabla, filtros);
    // Sólo se cachea un resultado con datos: si vino vacío por un error o por
    // una política de lectura, debe reintentarse en la siguiente ocasión.
    var catalogo = cache[cacheKey];
    if (!catalogo || !catalogo.length) {
      catalogo = await getCatalogoActivo(client, tabla, filtros);
      if (catalogo.length) cache[cacheKey] = catalogo;
      else delete cache[cacheKey];
    }

    var vistos = new Set();
    catalogo.forEach(function(item) {
      var nombre = (item && item.nombre ? item.nombre : '').toString().trim();
      if (!nombre) return;
      var key = normalizarTextoCatalogo(nombre);
      if (vistos.has(key)) return;
      vistos.add(key);
      var option = document.createElement('option');
      option.value = nombre;
      option.textContent = nombre;
      selectElement.appendChild(option);
    });

    // Sin opciones, decir por qué en lugar de dejar el desplegable mudo.
    if (selectElement.options.length <= 1) {
      var aviso = document.createElement('option');
      aviso.value = '';
      aviso.disabled = true;
      aviso.textContent = ultimoError[tabla]
        ? '⚠ No se pudo cargar el catálogo'
        : '⚠ Catálogo sin registros disponibles';
      selectElement.appendChild(aviso);
      selectElement.title = ultimoError[tabla]
        ? ('No se pudo leer "' + tabla + '": ' + ultimoError[tabla])
        : ('La tabla "' + tabla + '" no devolvió registros activos.');
    } else {
      selectElement.removeAttribute('title');
    }

    if (valorActual && Array.prototype.some.call(selectElement.options, function(opt){ return opt.value === valorActual; })) {
      selectElement.value = valorActual;
    }
  }

  async function cargarEspeciesPorClase(client, selectClase, selectEspecie, placeholder) {
    if (!selectEspecie) return;
    var claseNombre = selectClase && selectClase.value ? selectClase.value : '';
    if (!claseNombre) return cargarCatalogoSelect(client, 'catalogo_especie', selectEspecie, placeholder);
    var cache = getCache();
    var clases = cache['catalogo_clase'];
    if (!clases || !clases.length) {
      clases = await getCatalogoActivo(client, 'catalogo_clase');
      if (clases.length) cache['catalogo_clase'] = clases;
    }
    var clase = clases.find(function(item){ return normalizarTextoCatalogo(item.nombre) === normalizarTextoCatalogo(claseNombre); });
    if (!clase || !clase.id) return cargarCatalogoSelect(client, 'catalogo_especie', selectEspecie, placeholder);
    return cargarCatalogoSelect(client, 'catalogo_especie', selectEspecie, placeholder, { clase_id: clase.id });
  }

  window.MHRFaunaCatalogService = {
    ultimoError,
    getCatalogoCacheKey,
    normalizarTextoCatalogo,
    getCatalogoActivo,
    cargarCatalogoSelect,
    cargarEspeciesPorClase
  };
})();
