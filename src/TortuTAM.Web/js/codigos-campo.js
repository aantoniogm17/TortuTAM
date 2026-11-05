/*
  Codigos fijos de las fichas de Varamiento (NOAA) y Necropsia (2021).
  Son los mismos valores que valida la API con listas fijas y CHECK en BD;
  las etiquetas siguen el texto de las fichas fisicas. Cada lista es un
  arreglo de pares [codigo, etiqueta] para conservar el orden de la ficha.
  Expone window.TortuTAM.codigosCampo.
*/
(function(){
  var UBICACIONES_CUERPO = [
    ['boca', 'Boca'],
    ['cabeza', 'Cabeza'],
    ['cuello', 'Cuello'],
    ['caparazon', 'Caparazón'],
    ['plastron', 'Plastrón'],
    ['aleta_del', 'Aleta delantera'],
    ['aleta_tras', 'Aleta trasera'],
    ['cola', 'Cola']
  ];

  var SI_NO_CBD = [['si', 'Sí'], ['no', 'No'], ['cbd', 'No se puede determinar']];

  var codigos = {
    /* ---------- Varamiento ---------- */
    condicion: [
      ['vivo', 'Vivo'],
      ['ligera', 'Ligeramente descompuesto'],
      ['moderada', 'Moderadamente descompuesto'],
      ['severa', 'Severamente descompuesto'],
      ['desecado', 'Caparazón desecado'],
      ['esqueleto', 'Esqueleto']
    ],
    condicionFisica: [
      ['completa', 'Completa'],
      ['sin_cabeza', 'Cabeza faltante'],
      ['sin_aletas', 'Falta una o más aletas (100%)'],
      ['sin_caparazon', 'Falta 50% o más del caparazón'],
      ['nd', 'No determinado']
    ],
    cicatricesUbicaciones: [
      ['di', 'Delantero izquierdo'],
      ['dd', 'Delantero derecho'],
      ['ti', 'Trasero izquierdo'],
      ['td', 'Trasero derecho']
    ],
    lccTipo: [['R', 'Real'], ['A', 'Aproximada']],
    colaExtendida: [['si', 'Sí'], ['no', 'No'], ['nd', 'No determinado']],
    fibropapilomaRango: [['lt5', '< 5'], ['5a10', '5-10'], ['gt10', '> 10']],
    lesionesPielArea: [['pequenas', 'Áreas pequeñas'], ['grandes', 'Áreas grandes']],
    sanguijuelasCantidad: [['pocas', 'Pocas'], ['muchas', 'Muchas']],
    ubicacionesCuerpo: UBICACIONES_CUERPO,
    tipoEtiqueta: [['aleta', 'Etiqueta de aleta'], ['pit', 'PIT']],

    materiales: [
      { codigo: 'anzuelo', etiqueta: 'Anzuelo de pesca', pregunta: '¿Se encontró anzuelo de pesca en la tortuga?', donde: '¿Dónde se encontraba el anzuelo?' },
      { codigo: 'sedal', etiqueta: 'Sedal de pesca', pregunta: '¿Se encontró sedal de pesca en la tortuga?', donde: '¿Dónde se encontraba el sedal?' },
      { codigo: 'cuerda', etiqueta: 'Enredada en cuerda', pregunta: '¿Se encontró la tortuga enredada en cuerda?', donde: '¿Dónde se encontraba la cuerda?' },
      { codigo: 'red', etiqueta: 'Enredada en red de pesca', pregunta: '¿Se encontró la tortuga enredada en red de pesca?', donde: '¿Dónde se encontraba la red?' },
      { codigo: 'petroleo', etiqueta: 'Chapapote o petróleo', pregunta: '¿Se encontró chapapote o petróleo en la tortuga?', donde: '¿Dónde se encontraba el petróleo?' },
      { codigo: 'otro', etiqueta: 'Otro material', pregunta: '¿Se encontró algún otro material hecho por humano en la tortuga?', donde: '¿Dónde se encontraba el material?' }
    ],
    heridas: [
      { codigo: 'propela', etiqueta: 'Propela', pregunta: '¿Se encontró heridas evidentes de propela?', donde: '¿Dónde se encontraban las heridas?' },
      { codigo: 'aplastamiento', etiqueta: 'Aplastamiento contundente', pregunta: '¿Se encontró heridas de aplastamiento contundente?', donde: '¿Dónde se encontraban las heridas?' },
      { codigo: 'enredamiento', etiqueta: 'Tipo enredamiento', pregunta: '¿Se encontró heridas de tipo enredamiento?', donde: '¿Dónde se encontraban las heridas?' },
      { codigo: 'tiburon', etiqueta: 'Mordida de tiburón', pregunta: '¿Se encontró heridas de mordida de tiburón?', donde: '¿Dónde se encontraban las heridas?' },
      { codigo: 'otro', etiqueta: 'Otro tipo de heridas', pregunta: '¿Se encontró otro tipo de heridas?', donde: '¿Dónde se encontraban las heridas?' }
    ],

    /* ---------- Necropsia ---------- */
    grasaCorporal: [
      ['abundante', 'Abundante/sin atrofia'],
      ['parcial', 'Atrofia parcial'],
      ['severa', 'Atrofia severa (agotada)'],
      ['cbd', 'No se puede determinar']
    ],
    celoma: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['exudado', 'Exudado/fibrina'],
      ['coagulos', 'Coágulos de sangre'],
      ['parasitos', 'Parásitos enquistados'],
      ['palidos', 'Órganos pálidos'],
      ['otro', 'Otro'],
      ['cbd', 'No se puede determinar']
    ],
    siNoCbd: SI_NO_CBD,
    corazon: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['trauma', 'Trauma'],
      ['vasos_engrosados', 'Vasos engrosados'],
      ['otro', 'Otro'],
      ['cbd', 'No se puede determinar']
    ],
    higado: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['atrofia', 'Atrofia (encogido, negro)'],
      ['trauma', 'Trauma'],
      ['otro', 'Otro'],
      ['cbd', 'No se puede determinar']
    ],
    tractoGi: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['anormal', 'Anormal'],
      ['pescado', 'Pescado ingerido'],
      ['camaron', 'Camarón ingerido'],
      ['cbd', 'No se puede determinar']
    ],
    giAnormalidades: [
      ['1', '1 - Úlceras/exudado'],
      ['2', '2 - Trauma/perforación'],
      ['3', '3 - Obstrucción/bloqueo'],
      ['4', '4 - Intususcepción'],
      ['5', '5 - Plegamiento'],
      ['6', '6 - Huevos de platija'],
      ['7', '7 - Otro']
    ],
    giEstado: [['vacio', 'Vacío'], ['contenido', 'Contenido']],
    urogenital: [['sin_hallazgos', 'Sin hallazgos'], ['anormal', 'Anormal'], ['cbd', 'No se puede determinar']],
    sexo: [['M', 'Macho'], ['H', 'Hembra'], ['ND', 'No determinado']],
    testiculos: [['cilindrico', 'Cilíndrico'], ['elipsoidal', 'Elipsoidal'], ['plano', 'Plano']],
    epididimo: [
      ['no_expandido', 'No expandido de pared'],
      ['cresta', 'Cresta distinta'],
      ['colgante', 'Colgante'],
      ['espirales', 'Espirales blancos obvios']
    ],
    ovarios: [
      ['menor_4mm', 'Todos los folículos < 4 mm'],
      ['desarrollo', 'Desarrollo de folículos (amarillos, 4-24 mm)']
    ],
    oviducto: [
      ['recto', 'Blanco, recto (< 3 mm diámetro)'],
      ['parcial', 'Parcialmente convulso (3-15 mm diámetro)'],
      ['muy_convulso', 'Muy convulso (> 15 mm diámetro)'],
      ['huevos', 'Contiene huevos (> 24 mm diámetro)']
    ],
    traquea: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['poca_espuma', 'Poca espuma'],
      ['abundante_espuma', 'Abundante espuma'],
      ['arena', 'Arena/sedimentos'],
      ['trauma', 'Trauma'],
      ['exudado', 'Exudado'],
      ['cbd', 'No se puede determinar']
    ],
    pulmones: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['mojado', 'Mojado/espumoso'],
      ['arena', 'Arena/sedimentos'],
      ['trauma', 'Trauma'],
      ['otro', 'Otro'],
      ['cbd', 'No se puede determinar']
    ],
    cerebro: [
      ['sin_hallazgos', 'Sin hallazgos'],
      ['trauma', 'Trauma'],
      ['hemorragia', 'Hemorragia'],
      ['exudado', 'Exudado'],
      ['huevos_platija', 'Huevos de platija'],
      ['otro', 'Otro'],
      ['cbd', 'No se puede determinar']
    ]
  };

  function etiqueta(lista, codigo){
    if(codigo === null || codigo === undefined || codigo === ''){ return '—'; }
    var opciones = codigos[lista] || [];
    for(var i = 0; i < opciones.length; i++){
      var op = opciones[i];
      if(Array.isArray(op) && String(op[0]) === String(codigo)){ return op[1]; }
      if(!Array.isArray(op) && op.codigo === codigo){ return op.etiqueta; }
    }
    return String(codigo);
  }

  function etiquetas(lista, valores){
    return (valores || []).map(function(v){ return etiqueta(lista, v); });
  }

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.codigosCampo = codigos;
  window.TortuTAM.codigosCampo.etiqueta = etiqueta;
  window.TortuTAM.codigosCampo.etiquetas = etiquetas;
})();
