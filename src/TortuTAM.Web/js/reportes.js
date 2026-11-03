/*
  Generador de reportes de corte (vista #view-panel, issue #71). Consume
  GET /api/reportes/corte via js/api.js, resuelve las playas con
  js/catalogos.js y produce el reporte en texto (copiar/compartir) o en PDF.
  jsPDF y autotable se cargan de forma perezosa desde vendor/ solo al pedir
  el PDF. El calculo vive en el servidor: sin conexion se muestra el error.
*/
(function(){
  var form = document.getElementById('reporteForm');
  if(!form) return;

  var api = window.TortuTAM && window.TortuTAM.api;
  var catalogos = window.TortuTAM && window.TortuTAM.catalogos;

  var TITULO_PDF = 'PROYECTO BINACIONAL PARA LA CONSERVACIÓN DE LA TORTUGA LORA (Lepidochelys kempii)';
  var ESPECIES_BASE = ['Lk', 'Cm', 'Cc'];
  var SEXOS = ['H', 'M', 'ND'];
  var VENDOR_SCRIPTS = ['vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js'];

  var elPlaya = document.getElementById('rep_playa');
  var elFecha = document.getElementById('rep_fecha');
  var elFormato = document.getElementById('rep_formato');
  var elBtnGenerar = document.getElementById('rep_generar');
  var elStatus = document.getElementById('rep_status');
  var elPreview = document.getElementById('rep_preview');
  var elTexto = document.getElementById('rep_texto');
  var elTabla = document.getElementById('rep_tabla');
  var elAcciones = document.getElementById('rep_acciones');
  var elAccionesTexto = document.getElementById('rep_accionesTexto');
  var elAccionesPdf = document.getElementById('rep_accionesPdf');
  var elCopiar = document.getElementById('rep_copiar');
  var elCompartir = document.getElementById('rep_compartir');
  var elDescargar = document.getElementById('rep_descargar');

  var ultimo = null;
  var vendorPromesa = null;

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function mensajeError(err){
    if(err && err.status){
      return err.message || ('el servidor respondio con un error (' + err.status + ').');
    }
    return 'sin conexion o el servidor no respondio.';
  }

  function mostrarEstado(mensaje, tipo){
    if(!elStatus) return;
    elStatus.className = 'status-banner is-visible is-' + tipo;
    elStatus.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    var spinner = tipo === 'loading' ? '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>' : '';
    elStatus.innerHTML = spinner + '<span>' + escapeHtml(mensaje) + '</span>';
  }

  function ocultarEstado(){
    if(!elStatus) return;
    elStatus.className = 'status-banner';
    elStatus.innerHTML = '';
  }

  /* ---------------- Formato de numeros y fechas ---------------- */

  function vacio(v){ return v === null || v === undefined || v === '' || isNaN(Number(v)); }

  function num(v){
    if(vacio(v)){ return '—'; }
    return Number(v).toLocaleString('es-MX');
  }

  function pct(v){
    if(vacio(v)){ return '—'; }
    return Number(v).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  function hoyIso(){
    var d = new Date();
    var m = d.getMonth() + 1;
    var dia = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dia < 10 ? '0' : '') + dia;
  }

  function fechaCorta(iso){
    var partes = String(iso || '').slice(0, 10).split('-');
    if(partes.length !== 3){ return String(iso || '—'); }
    return partes[2] + '/' + partes[1] + '/' + partes[0].slice(2);
  }

  function esCero(v){ return !vacio(v) && Number(v) === 0; }

  /* ---------------- Reporte en texto ---------------- */

  function lineaLimpios(etiqueta, b){
    b = b || {};
    return etiqueta + ': ' + num(b.nidos) + ' nidos limpios, CV ' + num(b.criasVivas)
      + ', TH ' + num(b.totalHuevos) + ', ' + pct(b.porcentaje);
  }

  function resumenVarados(varamientos, campo){
    var porEspecie = {};
    var orden = ESPECIES_BASE.slice();
    (varamientos || []).forEach(function(v){
      var cod = v.especieCodigo || '—';
      var clave = null;
      orden.some(function(o){ if(o.toLowerCase() === String(cod).toLowerCase()){ clave = o; return true; } return false; });
      if(!clave){ clave = cod; orden.push(clave); }
      var e = porEspecie[clave] || (porEspecie[clave] = { total: 0, sexos: {} });
      var n = Number(v[campo]) || 0;
      e.total += n;
      var sexo = v.sexo || 'ND';
      e.sexos[sexo] = (e.sexos[sexo] || 0) + n;
    });

    var total = 0;
    var piezas = [];
    orden.forEach(function(cod){
      var e = porEspecie[cod];
      var cantidad = e ? e.total : 0;
      total += cantidad;
      if(!e && ESPECIES_BASE.indexOf(cod) === -1){ return; }
      var detalle = '';
      if(e && cantidad > 0 && (e.sexos.H || e.sexos.M)){
        var sub = [];
        SEXOS.forEach(function(s){ if(e.sexos[s]){ sub.push(s + ' ' + num(e.sexos[s])); } });
        detalle = ' (' + sub.join(', ') + ')';
      }
      piezas.push(cod + ' ' + num(cantidad) + detalle);
    });
    return { texto: piezas.join(', '), total: total };
  }

  function bloquePlaya(p, fecha){
    var l = [];
    var titulo = p.nombre || '';
    l.push('Playa ' + titulo);
    l.push('Corte al día ' + fechaCorta(fecha));
    l.push('');
    l.push('Corral: ' + num(p.corral));
    l.push('In situ: ' + num(p.inSitu));
    if(!esCero(p.caja)){ l.push('Caja: ' + num(p.caja)); }
    if(!esCero(p.saqueadas)){ l.push('Saqueadas: ' + num(p.saqueadas)); }
    if(!esCero(p.perdidasMarea)){ l.push('Pérdidas por marea: ' + num(p.perdidasMarea)); }
    l.push('Depredadas: ' + num(p.depredadas));
    l.push('');
    l.push('Nidos protegidos: ' + num(p.nidosProtegidos));
    l.push('Nidos registrados: ' + num(p.nidosRegistrados));
    l.push('Huevos protegidos: ' + num(p.huevosProtegidos));
    l.push('');
    l.push('Emergencias de crías');
    l.push(lineaLimpios('Corral', p.limpiosCorral));
    l.push(lineaLimpios('In situ', p.limpiosInSitu));
    l.push('Crías liberadas: ' + num(p.criasLiberadas));
    l.push('Huevos protegidos (nidos limpios): ' + num(p.huevosNidosLimpios));
    l.push('% de sobrevivencia: ' + pct(p.porcentajeSobrevivencia));
    l.push('');
    var muertos = resumenVarados(p.varamientos, 'muertos');
    var vivos = resumenVarados(p.varamientos, 'vivos');
    l.push('Varamientos muertos: ' + muertos.texto + '. Total ' + num(muertos.total));
    l.push('Varamientos vivos: ' + vivos.texto + '. Total ' + num(vivos.total));
    return l.join('\n');
  }

  function construirTexto(datos){
    var fecha = datos.fechaCorte || elFecha.value;
    var bloques = (datos.playas || []).map(function(p){ return bloquePlaya(p, fecha); });
    if(datos.total){
      var t = {};
      Object.keys(datos.total).forEach(function(k){ t[k] = datos.total[k]; });
      t.codigo = '';
      t.nombre = 'TOTAL';
      bloques.push(bloquePlaya(t, fecha));
    }
    return bloques.join('\n\n------------------------------\n\n');
  }

  /* ---------------- Tabla (vista previa y PDF) ---------------- */

  var COLUMNAS = [
    'Playa de anidación', 'Huevos protegidos', 'Corral', 'In situ', 'Caja',
    'Total de nidadas protegidas', 'Saqueadas', 'Pérdidas por marea', 'Depredadas',
    'Total de nidadas registradas', 'Crías liberadas', 'Huevos protegidos (nidos limpios)',
    '% de sobrevivencia'
  ];

  function filaTabla(p, nombre){
    return [
      nombre, num(p.huevosProtegidos), num(p.corral), num(p.inSitu), num(p.caja),
      num(p.nidosProtegidos), num(p.saqueadas), num(p.perdidasMarea), num(p.depredadas),
      num(p.nidosRegistrados), num(p.criasLiberadas), num(p.huevosNidosLimpios),
      pct(p.porcentajeSobrevivencia)
    ];
  }

  function construirFilas(datos){
    var filas = (datos.playas || []).map(function(p){
      return filaTabla(p, p.nombre || p.codigo || '—');
    });
    if(datos.total){ filas.push(filaTabla(datos.total, 'TOTAL')); }
    return filas;
  }

  function renderTabla(datos){
    var html = '<table><thead><tr>';
    COLUMNAS.forEach(function(c){ html += '<th scope="col">' + escapeHtml(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    construirFilas(datos).forEach(function(fila, i, todas){
      var esTotal = datos.total && i === todas.length - 1;
      html += '<tr' + (esTotal ? ' class="reporte-total"' : '') + '>';
      fila.forEach(function(c, j){
        html += j === 0 ? '<th scope="row">' + escapeHtml(c) + '</th>' : '<td>' + escapeHtml(c) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    elTabla.innerHTML = html;
  }

  /* ---------------- PDF ---------------- */

  function cargarScript(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function cargarVendor(){
    if(vendorPromesa){ return vendorPromesa; }
    vendorPromesa = VENDOR_SCRIPTS.reduce(function(prev, src){
      return prev.then(function(){ return cargarScript(src); });
    }, Promise.resolve()).catch(function(err){
      vendorPromesa = null;
      throw err;
    });
    return vendorPromesa;
  }

  function nombreArchivo(datos){
    var fecha = String(datos.fechaCorte || elFecha.value).slice(0, 10);
    var sufijo = '';
    if(!datos.total && datos.playas && datos.playas.length === 1 && datos.playas[0].codigo){
      sufijo = '-' + String(datos.playas[0].codigo).toLowerCase();
    }
    return 'reporte-corte-' + fecha + sufijo + '.pdf';
  }

  function generarPdf(datos){
    var Ctor = window.jspdf && window.jspdf.jsPDF;
    if(!Ctor){ throw new Error('jsPDF no disponible'); }
    var doc = new Ctor({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    var ancho = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(TITULO_PDF, ancho / 2, 40, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Corte al día ' + fechaCorta(datos.fechaCorte || elFecha.value), ancho / 2, 58, { align: 'center' });

    var filas = construirFilas(datos);
    var hayTotal = !!datos.total;
    doc.autoTable({
      head: [COLUMNAS],
      body: filas,
      startY: 74,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [18, 70, 63], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      didParseCell: function(d){
        if(hayTotal && d.section === 'body' && d.row.index === filas.length - 1){
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.fillColor = [234, 223, 194];
        }
      }
    });
    doc.save(nombreArchivo(datos));
  }

  /* ---------------- Acciones ---------------- */

  function copiarFallback(texto){
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try{ ok = document.execCommand('copy'); }catch(e){ ok = false; }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error('copiar'));
  }

  function copiar(){
    if(!ultimo) return;
    var texto = ultimo.texto;
    var promesa = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(texto).catch(function(){ return copiarFallback(texto); })
      : copiarFallback(texto);
    promesa.then(function(){
      mostrarEstado('Reporte copiado al portapapeles.', 'success');
    }).catch(function(){
      mostrarEstado('No se pudo copiar. Selecciona el texto y copialo manualmente.', 'error');
    });
  }

  function compartir(){
    if(!ultimo || !navigator.share) return;
    navigator.share({
      title: 'Reporte de corte ' + fechaCorta(ultimo.datos.fechaCorte || elFecha.value),
      text: ultimo.texto
    }).catch(function(err){
      if(err && err.name === 'AbortError'){ return; }
      mostrarEstado('No se pudo compartir el reporte.', 'error');
    });
  }

  function descargar(){
    if(!ultimo) return;
    elDescargar.disabled = true;
    mostrarEstado('Preparando PDF...', 'loading');
    cargarVendor().then(function(){
      generarPdf(ultimo.datos);
      mostrarEstado('PDF generado.', 'success');
    }).catch(function(){
      mostrarEstado('No se pudo generar el PDF: no se cargaron las librerias (revisa tu conexion).', 'error');
    }).then(function(){
      elDescargar.disabled = false;
    });
  }

  function mostrarResultado(datos, formato){
    var texto = construirTexto(datos);
    ultimo = { datos: datos, texto: texto, formato: formato };
    elPreview.hidden = false;
    elAcciones.hidden = false;
    var esPdf = formato === 'pdf';
    elTexto.hidden = esPdf;
    elTabla.hidden = !esPdf;
    elAccionesTexto.hidden = esPdf;
    elAccionesPdf.hidden = !esPdf;
    if(esPdf){
      renderTabla(datos);
    }else{
      elTexto.textContent = texto;
      elCompartir.hidden = !navigator.share;
    }
  }

  function ocultarResultado(){
    ultimo = null;
    elPreview.hidden = true;
    elAcciones.hidden = true;
  }

  function generar(evt){
    evt.preventDefault();
    if(!api){
      mostrarEstado('No se pudo generar el reporte: API no disponible.', 'error');
      return;
    }
    var fecha = elFecha.value;
    if(!fecha){
      mostrarEstado('Elige la fecha de corte.', 'error');
      elFecha.focus();
      return;
    }
    var formato = elFormato.value;
    elBtnGenerar.disabled = true;
    ocultarResultado();
    mostrarEstado('Generando reporte...', 'loading');
    api.obtenerReporteCorte(fecha, elPlaya.value).then(function(datos){
      datos = datos || {};
      if(!datos.playas || !datos.playas.length){
        mostrarEstado('No hay datos para la fecha y playa elegidas.', 'error');
        return;
      }
      ocultarEstado();
      mostrarResultado(datos, formato);
    }).catch(function(err){
      mostrarEstado('No se pudo generar el reporte: ' + mensajeError(err), 'error');
    }).then(function(){
      elBtnGenerar.disabled = false;
    });
  }

  function cargarPlayas(){
    if(!catalogos){ return; }
    catalogos.getPlayas().then(function(playas){
      var html = '<option value="">Todas las playas (reporte completo)</option>';
      (playas || []).forEach(function(p){
        html += '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.nombre || '') + '</option>';
      });
      elPlaya.innerHTML = html;
    }).catch(function(){
      elPlaya.innerHTML = '<option value="">Todas las playas (reporte completo)</option>';
    });
  }

  elFecha.value = hoyIso();
  elFecha.max = hoyIso();
  cargarPlayas();

  form.addEventListener('submit', generar);
  [elPlaya, elFecha, elFormato].forEach(function(el){
    el.addEventListener('change', ocultarResultado);
  });
  elCopiar.addEventListener('click', copiar);
  elCompartir.addEventListener('click', compartir);
  elDescargar.addEventListener('click', descargar);
})();
