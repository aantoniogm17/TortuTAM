// Solo para pruebas locales con iniciar-local.bat: ahi el sitio y el API
// corren en puertos distintos (8080 y 5034), asi que las rutas relativas
// /api/... no alcanzan al API. En un despliegue real (mismo origen para
// sitio y API) este archivo no hace falta y api.js usa /api por defecto.
window.TortuTAM_CONFIG = {
  apiBase: 'http://localhost:5034/api'
};
