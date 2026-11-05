using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Models.Dominio;

namespace TortuTAM.Api.Data;

public class DominioDbContext(DbContextOptions<DominioDbContext> options) : DbContext(options)
{
    public DbSet<CatPlaya> Playas => Set<CatPlaya>();

    public DbSet<CatEspecie> Especies => Set<CatEspecie>();

    public DbSet<CatAccion> Acciones => Set<CatAccion>();

    public DbSet<CatUsoNido> UsoNido => Set<CatUsoNido>();

    public DbSet<Ficha> Fichas => Set<Ficha>();

    public DbSet<Marca> Marcas => Set<Marca>();

    public DbSet<FichaFoto> FichaFotos => Set<FichaFoto>();

    public DbSet<CatCategoriaConteo> CategoriasConteo => Set<CatCategoriaConteo>();

    public DbSet<FichaLimpieza> FichasLimpieza => Set<FichaLimpieza>();

    public DbSet<LimpiezaConteo> LimpiezaConteos => Set<LimpiezaConteo>();

    public DbSet<Varamiento> Varamientos => Set<Varamiento>();

    public DbSet<VaramientoEtiqueta> VaramientoEtiquetas => Set<VaramientoEtiqueta>();

    public DbSet<VaramientoHallazgo> VaramientoHallazgos => Set<VaramientoHallazgo>();

    public DbSet<VaramientoFoto> VaramientoFotos => Set<VaramientoFoto>();

    public DbSet<Necropsia> Necropsias => Set<Necropsia>();

    public DbSet<VwExitoEclosion> VwExitoEclosion => Set<VwExitoEclosion>();

    public DbSet<VwEstatusNido> VwEstatusNidos => Set<VwEstatusNido>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<CatPlaya>(entity =>
        {
            entity.ToTable("cat_playas");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id");
            entity.Property(p => p.Codigo).HasColumnName("codigo").HasMaxLength(10).IsRequired();
            entity.Property(p => p.Nombre).HasColumnName("nombre").HasMaxLength(120);
        });

        builder.Entity<CatEspecie>(entity =>
        {
            entity.ToTable("cat_especies");
            entity.HasKey(e => e.Codigo);
            entity.Property(e => e.Codigo).HasColumnName("codigo").HasMaxLength(5);
            entity.Property(e => e.NombreComun).HasColumnName("nombre_comun").HasMaxLength(80);
            entity.Property(e => e.NombreCientifico).HasColumnName("nombre_cientifico").HasMaxLength(120);
        });

        builder.Entity<CatAccion>(entity =>
        {
            entity.ToTable("cat_acciones");
            entity.HasKey(a => a.Codigo);
            entity.Property(a => a.Codigo).HasColumnName("codigo");
            entity.Property(a => a.Descripcion).HasColumnName("descripcion").HasMaxLength(60).IsRequired();
        });

        builder.Entity<CatUsoNido>(entity =>
        {
            entity.ToTable("cat_uso_nido");
            entity.HasKey(u => u.Codigo);
            entity.Property(u => u.Codigo).HasColumnName("codigo");
            entity.Property(u => u.Descripcion).HasColumnName("descripcion").HasMaxLength(60).IsRequired();
        });

        builder.Entity<Ficha>(entity =>
        {
            // trg_fichas_actualizado_en (migración 0007) es un trigger AFTER UPDATE;
            // sin declararlo aquí, EF intenta usar la cláusula OUTPUT en el UPDATE y
            // SQL Server la rechaza por la presencia del trigger.
            entity.ToTable("fichas", tb => tb.HasTrigger("trg_fichas_actualizado_en"));
            entity.HasKey(f => f.Id);
            entity.Property(f => f.Id).HasColumnName("id");
            entity.Property(f => f.NumeroFicha).HasColumnName("numero_ficha").HasMaxLength(20).IsRequired();
            entity.HasIndex(f => f.NumeroFicha).IsUnique();
            entity.Property(f => f.PlayaId).HasColumnName("playa_id");
            entity.Property(f => f.Estaca).HasColumnName("estaca").HasMaxLength(20);
            entity.Property(f => f.Zona).HasColumnName("zona").HasMaxLength(40);
            entity.Property(f => f.Fecha).HasColumnName("fecha").HasColumnType("date");
            entity.Property(f => f.EspecieCodigo).HasColumnName("especie_codigo").HasMaxLength(5);
            entity.Property(f => f.Sexo).HasColumnName("sexo").HasMaxLength(2);
            entity.Property(f => f.AccionCodigo).HasColumnName("accion_codigo");
            entity.Property(f => f.HoraA).HasColumnName("hora_a").HasColumnType("time");
            entity.Property(f => f.HoraBColecta).HasColumnName("hora_b_colecta").HasColumnType("time");
            entity.Property(f => f.HoraCSiembra).HasColumnName("hora_c_siembra").HasColumnType("time");
            entity.Property(f => f.UsoNidoCodigo).HasColumnName("uso_nido_codigo");
            entity.Property(f => f.Corral).HasColumnName("corral").HasMaxLength(20);
            entity.Property(f => f.NumeroNido).HasColumnName("numero_nido").HasMaxLength(20);
            entity.Property(f => f.HuevosColectados).HasColumnName("huevos_colectados");
            entity.Property(f => f.HuevosRotos).HasColumnName("huevos_rotos");
            entity.Property(f => f.PosicionCodigo).HasColumnName("posicion_codigo");
            entity.Property(f => f.Latitud).HasColumnName("latitud").HasColumnType("decimal(9,6)");
            entity.Property(f => f.Longitud).HasColumnName("longitud").HasColumnType("decimal(9,6)");
            entity.Property(f => f.Formulo).HasColumnName("formulo").HasMaxLength(10);
            entity.Property(f => f.Observaciones).HasColumnName("observaciones");
            entity.Property(f => f.TumoresPresentes).HasColumnName("tumores_presentes");
            entity.Property(f => f.BioMuescaPuntaLargaCm).HasColumnName("bio_muesca_punta_larga_cm").HasColumnType("decimal(5,1)");
            entity.Property(f => f.BioPuntaMuescaCm).HasColumnName("bio_punta_muesca_cm").HasColumnType("decimal(5,1)");
            entity.Property(f => f.BioMuescaMuescaCm).HasColumnName("bio_muesca_muesca_cm").HasColumnType("decimal(5,1)");
            entity.Property(f => f.BioAnchoCm).HasColumnName("bio_ancho_cm").HasColumnType("decimal(5,1)");
            entity.Property(f => f.TemperaturaC).HasColumnName("temperatura_c").HasColumnType("decimal(4,1)");
            entity.Property(f => f.IdempotencyKey).HasColumnName("idempotency_key").HasMaxLength(100);
            entity.HasIndex(f => f.IdempotencyKey).IsUnique().HasFilter("[idempotency_key] IS NOT NULL");
            entity.Property(f => f.CreadoEn).HasColumnName("creado_en").ValueGeneratedOnAdd();
            entity.Property(f => f.ActualizadoEn).HasColumnName("actualizado_en").ValueGeneratedOnAddOrUpdate();

            entity.HasMany(f => f.Marcas)
                .WithOne(m => m.Ficha)
                .HasForeignKey(m => m.FichaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Marca>(entity =>
        {
            entity.ToTable("marcas");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).HasColumnName("id");
            entity.Property(m => m.FichaId).HasColumnName("ficha_id");
            entity.Property(m => m.Aleta).HasColumnName("aleta").HasMaxLength(10).IsRequired();
            entity.Property(m => m.Pit).HasColumnName("pit").HasMaxLength(30);
            entity.Property(m => m.NumeroMarca).HasColumnName("marca").HasMaxLength(30);
            entity.Property(m => m.Leyenda).HasColumnName("leyenda").HasMaxLength(80);
            entity.Property(m => m.NuevaORecap).HasColumnName("nueva_o_recap").HasMaxLength(1);
            entity.Property(m => m.CicatrizMarca).HasColumnName("cicatriz_marca");
            entity.Property(m => m.Verifico).HasColumnName("verifico");
            entity.HasIndex(m => new { m.FichaId, m.Aleta }).IsUnique();
        });

        builder.Entity<FichaFoto>(entity =>
        {
            entity.ToTable("ficha_fotos");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.FichaId).HasColumnName("ficha_id");
            entity.Property(x => x.RutaRelativa).HasColumnName("ruta_relativa").HasMaxLength(260).IsRequired();
            entity.Property(x => x.CreadoEn).HasColumnName("creado_en").ValueGeneratedOnAdd();

            entity.HasOne<Ficha>()
                .WithMany()
                .HasForeignKey(x => x.FichaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CatCategoriaConteo>(entity =>
        {
            entity.ToTable("cat_categorias_conteo");
            entity.HasKey(c => c.Codigo);
            entity.Property(c => c.Codigo).HasColumnName("codigo").HasMaxLength(30);
            entity.Property(c => c.Descripcion).HasColumnName("descripcion").HasMaxLength(80).IsRequired();
            entity.Property(c => c.SoloTotal).HasColumnName("solo_total");
            entity.Property(c => c.CuentaCriaViva).HasColumnName("cuenta_cria_viva");
            entity.Property(c => c.ExcluirDeHuevosTotales).HasColumnName("excluir_de_huevos_totales");
        });

        builder.Entity<FichaLimpieza>(entity =>
        {
            // trg_fichas_limpieza_actualizado_en (migración 0010): mismo motivo que
            // trg_fichas_actualizado_en arriba, se declara para que EF no use OUTPUT en el UPDATE.
            entity.ToTable("fichas_limpieza", tb => tb.HasTrigger("trg_fichas_limpieza_actualizado_en"));
            entity.HasKey(f => f.Id);
            entity.Property(f => f.Id).HasColumnName("id");
            entity.Property(f => f.NumeroFicha).HasColumnName("numero_ficha").HasMaxLength(20).IsRequired();
            entity.HasIndex(f => f.NumeroFicha).IsUnique();
            entity.Property(f => f.FichaAnidacionId).HasColumnName("ficha_anidacion_id");
            entity.Property(f => f.PlayaId).HasColumnName("playa_id");
            entity.Property(f => f.Corral).HasColumnName("corral").HasMaxLength(20);
            entity.Property(f => f.Nido).HasColumnName("nido").HasMaxLength(20);
            entity.Property(f => f.FechaPrimeraEmergencia).HasColumnName("fecha_primera_emergencia").HasColumnType("date");
            entity.Property(f => f.FechaLimpieza).HasColumnName("fecha_limpieza").HasColumnType("date").IsRequired();
            entity.Property(f => f.EspecieCodigo).HasColumnName("especie_codigo").HasMaxLength(5);
            entity.Property(f => f.UsoNidoCodigo).HasColumnName("uso_nido_codigo");
            entity.Property(f => f.Formulo).HasColumnName("formulo").HasMaxLength(10);
            entity.Property(f => f.Latitud).HasColumnName("latitud").HasColumnType("decimal(9,6)");
            entity.Property(f => f.Longitud).HasColumnName("longitud").HasColumnType("decimal(9,6)");
            entity.Property(f => f.Hormigas).HasColumnName("hormigas").HasMaxLength(1);
            entity.Property(f => f.Raices).HasColumnName("raices").HasMaxLength(1);
            entity.Property(f => f.Larvas).HasColumnName("larvas").HasMaxLength(1);
            entity.Property(f => f.Piedras).HasColumnName("piedras").HasMaxLength(1);
            entity.Property(f => f.Huellas).HasColumnName("huellas").HasMaxLength(1);
            entity.Property(f => f.Otros).HasColumnName("otros").HasMaxLength(1);
            entity.Property(f => f.OtrosDetalle).HasColumnName("otros_detalle");
            entity.Property(f => f.CreadoEn).HasColumnName("creado_en").ValueGeneratedOnAdd();
            entity.Property(f => f.ActualizadoEn).HasColumnName("actualizado_en").ValueGeneratedOnAddOrUpdate();

            entity.HasMany(f => f.Conteos)
                .WithOne(c => c.FichaLimpieza)
                .HasForeignKey(c => c.FichaLimpiezaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<LimpiezaConteo>(entity =>
        {
            entity.ToTable("limpieza_conteos");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id");
            entity.Property(c => c.FichaLimpiezaId).HasColumnName("ficha_limpieza_id");
            entity.Property(c => c.CategoriaCodigo).HasColumnName("categoria_codigo").HasMaxLength(30).IsRequired();
            entity.Property(c => c.Normales).HasColumnName("normales");
            entity.Property(c => c.Albina).HasColumnName("albina");
            entity.Property(c => c.Deforme).HasColumnName("deforme");
            entity.Property(c => c.AlbinasDeformes).HasColumnName("albinas_deformes");
            entity.Property(c => c.Total).HasColumnName("total");
            entity.HasIndex(c => new { c.FichaLimpiezaId, c.CategoriaCodigo }).IsUnique();
        });

        builder.Entity<Varamiento>(entity =>
        {
            // trg_varamientos_actualizado_en (migración 0027): mismo motivo que
            // trg_fichas_actualizado_en arriba, se declara para que EF no use OUTPUT en el UPDATE.
            entity.ToTable("varamientos", tb => tb.HasTrigger("trg_varamientos_actualizado_en"));
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Id).HasColumnName("id");
            entity.Property(v => v.ObservadorNombre).HasColumnName("observador_nombre").HasMaxLength(120).IsRequired();
            entity.Property(v => v.PlayaId).HasColumnName("playa_id");
            entity.Property(v => v.Latitud).HasColumnName("latitud").HasColumnType("decimal(9,6)");
            entity.Property(v => v.Longitud).HasColumnName("longitud").HasColumnType("decimal(9,6)");
            entity.Property(v => v.DescripcionUbicacion).HasColumnName("descripcion_ubicacion").HasMaxLength(500);
            entity.Property(v => v.FechaVaramiento).HasColumnName("fecha_varamiento").HasColumnType("date").IsRequired();
            entity.Property(v => v.NumeroTortugaDia).HasColumnName("numero_tortuga_dia");
            entity.Property(v => v.EspecieCodigo).HasColumnName("especie_codigo").HasMaxLength(5).IsRequired();
            entity.Property(v => v.CondicionCodigo).HasColumnName("condicion_codigo").HasMaxLength(20).IsRequired();
            entity.Property(v => v.CondicionFisica).HasColumnName("condicion_fisica").HasMaxLength(100);
            entity.Property(v => v.FotoDorsal).HasColumnName("foto_dorsal");
            entity.Property(v => v.FotoVentral).HasColumnName("foto_ventral");
            entity.Property(v => v.FotoHeridas).HasColumnName("foto_heridas");
            entity.Property(v => v.FotoMaterial).HasColumnName("foto_material");
            entity.Property(v => v.BocaRevisada).HasColumnName("boca_revisada");
            entity.Property(v => v.NecropsiaCompletada).HasColumnName("necropsia_completada");
            entity.Property(v => v.EtiquetasAletaEncontradas).HasColumnName("etiquetas_aleta_encontradas");
            entity.Property(v => v.CicatricesEtiqueta).HasColumnName("cicatrices_etiqueta");
            entity.Property(v => v.CicatricesUbicaciones).HasColumnName("cicatrices_ubicaciones").HasMaxLength(20);
            entity.Property(v => v.PitEscaneado).HasColumnName("pit_escaneado");
            entity.Property(v => v.EtiquetaViva).HasColumnName("etiqueta_viva");
            entity.Property(v => v.EtiquetaVivaDetalle).HasColumnName("etiqueta_viva_detalle").HasMaxLength(200);
            entity.Property(v => v.EquipoRastreo).HasColumnName("equipo_rastreo");
            entity.Property(v => v.LccCm).HasColumnName("lcc_cm").HasColumnType("decimal(5,1)");
            entity.Property(v => v.LccTipo).HasColumnName("lcc_tipo").HasMaxLength(1);
            entity.Property(v => v.ColaExtendida).HasColumnName("cola_extendida").HasMaxLength(2);
            entity.Property(v => v.ColaMedida1Cm).HasColumnName("cola_medida_1_cm").HasColumnType("decimal(5,1)");
            entity.Property(v => v.ColaMedida2Cm).HasColumnName("cola_medida_2_cm").HasColumnType("decimal(5,1)");
            entity.Property(v => v.MaterialEncontrado).HasColumnName("material_encontrado");
            entity.Property(v => v.MaterialFotos).HasColumnName("material_fotos");
            entity.Property(v => v.CuerdaAlgoUnido).HasColumnName("cuerda_algo_unido");
            entity.Property(v => v.HeridasEncontradas).HasColumnName("heridas_encontradas");
            entity.Property(v => v.HeridasFotos).HasColumnName("heridas_fotos");
            entity.Property(v => v.HeridaEnredamientoAsociada).HasColumnName("herida_enredamiento_asociada");
            entity.Property(v => v.EnfermedadObservada).HasColumnName("enfermedad_observada");
            entity.Property(v => v.EnfermedadFotos).HasColumnName("enfermedad_fotos");
            entity.Property(v => v.Demacrada).HasColumnName("demacrada");
            entity.Property(v => v.Epibiontes).HasColumnName("epibiontes");
            entity.Property(v => v.Fibropapiloma).HasColumnName("fibropapiloma");
            entity.Property(v => v.FibropapilomaRango).HasColumnName("fibropapiloma_rango").HasMaxLength(5);
            entity.Property(v => v.LesionesPiel).HasColumnName("lesiones_piel");
            entity.Property(v => v.LesionesPielArea).HasColumnName("lesiones_piel_area").HasMaxLength(10);
            entity.Property(v => v.Sanguijuelas).HasColumnName("sanguijuelas");
            entity.Property(v => v.SanguijuelasCantidad).HasColumnName("sanguijuelas_cantidad").HasMaxLength(10);
            entity.Property(v => v.Comentarios).HasColumnName("comentarios");
            entity.Property(v => v.IdempotencyKey).HasColumnName("idempotency_key").HasMaxLength(100);
            entity.HasIndex(v => v.IdempotencyKey).IsUnique().HasFilter("[idempotency_key] IS NOT NULL");
            entity.HasIndex(v => new { v.FechaVaramiento, v.PlayaId, v.NumeroTortugaDia }).IsUnique();
            entity.Property(v => v.CreadoEn).HasColumnName("creado_en").ValueGeneratedOnAdd();
            entity.Property(v => v.ActualizadoEn).HasColumnName("actualizado_en").ValueGeneratedOnAddOrUpdate();

            entity.HasMany(v => v.Etiquetas)
                .WithOne(e => e.Varamiento)
                .HasForeignKey(e => e.VaramientoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(v => v.Hallazgos)
                .WithOne(h => h.Varamiento)
                .HasForeignKey(h => h.VaramientoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.Necropsia)
                .WithOne(n => n.Varamiento)
                .HasForeignKey<Necropsia>(n => n.VaramientoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<VaramientoEtiqueta>(entity =>
        {
            entity.ToTable("varamiento_etiquetas");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.VaramientoId).HasColumnName("varamiento_id");
            entity.Property(e => e.Tipo).HasColumnName("tipo").HasMaxLength(10).IsRequired();
            entity.Property(e => e.Numero).HasColumnName("numero").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Ubicacion).HasColumnName("ubicacion").HasMaxLength(100);
        });

        builder.Entity<VaramientoHallazgo>(entity =>
        {
            entity.ToTable("varamiento_hallazgos");
            entity.HasKey(h => h.Id);
            entity.Property(h => h.Id).HasColumnName("id");
            entity.Property(h => h.VaramientoId).HasColumnName("varamiento_id");
            entity.Property(h => h.Categoria).HasColumnName("categoria").HasMaxLength(10).IsRequired();
            entity.Property(h => h.TipoCodigo).HasColumnName("tipo_codigo").HasMaxLength(20).IsRequired();
            entity.Property(h => h.Ubicaciones).HasColumnName("ubicaciones").HasMaxLength(100);
            entity.Property(h => h.Detalle).HasColumnName("detalle").HasMaxLength(500);
            entity.HasIndex(h => new { h.VaramientoId, h.Categoria, h.TipoCodigo }).IsUnique();
        });

        builder.Entity<VaramientoFoto>(entity =>
        {
            entity.ToTable("varamiento_fotos");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.VaramientoId).HasColumnName("varamiento_id");
            entity.Property(x => x.RutaRelativa).HasColumnName("ruta_relativa").HasMaxLength(260).IsRequired();
            entity.Property(x => x.CreadoEn).HasColumnName("creado_en").ValueGeneratedOnAdd();

            entity.HasOne<Varamiento>()
                .WithMany()
                .HasForeignKey(x => x.VaramientoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Necropsia>(entity =>
        {
            // trg_necropsias_actualizado_en (migración 0030): mismo motivo que
            // trg_fichas_actualizado_en arriba, se declara para que EF no use OUTPUT en el UPDATE.
            entity.ToTable("necropsias", tb => tb.HasTrigger("trg_necropsias_actualizado_en"));
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).HasColumnName("id");
            entity.Property(n => n.VaramientoId).HasColumnName("varamiento_id");
            entity.HasIndex(n => n.VaramientoId).IsUnique();
            entity.Property(n => n.FechaNecropsia).HasColumnName("fecha_necropsia").HasColumnType("date");
            entity.Property(n => n.Realizo).HasColumnName("realizo").HasMaxLength(120);
            entity.Property(n => n.GrasaCorporal).HasColumnName("grasa_corporal").HasMaxLength(10);
            entity.Property(n => n.Celoma).HasColumnName("celoma").HasMaxLength(100);
            entity.Property(n => n.CelomaComentarios).HasColumnName("celoma_comentarios").HasMaxLength(1000);
            entity.Property(n => n.TumoresFp).HasColumnName("tumores_fp").HasMaxLength(3);
            entity.Property(n => n.TumoresFpUbicaciones).HasColumnName("tumores_fp_ubicaciones").HasMaxLength(500);
            entity.Property(n => n.Corazon).HasColumnName("corazon").HasMaxLength(100);
            entity.Property(n => n.SangreCamaras).HasColumnName("sangre_camaras").HasMaxLength(3);
            entity.Property(n => n.CorazonComentarios).HasColumnName("corazon_comentarios").HasMaxLength(1000);
            entity.Property(n => n.Higado).HasColumnName("higado").HasMaxLength(100);
            entity.Property(n => n.HigadoComentarios).HasColumnName("higado_comentarios").HasMaxLength(1000);
            entity.Property(n => n.TractoGi).HasColumnName("tracto_gi").HasMaxLength(100);
            entity.Property(n => n.BocaExaminada).HasColumnName("boca_examinada");
            entity.Property(n => n.GiAnormalidades).HasColumnName("gi_anormalidades").HasMaxLength(20);
            entity.Property(n => n.GiDescripcion).HasColumnName("gi_descripcion").HasMaxLength(1000);
            entity.Property(n => n.MaterialAntropogenicoDetalle).HasColumnName("material_antropogenico_detalle").HasMaxLength(1000);
            entity.Property(n => n.MaterialIngerido).HasColumnName("material_ingerido").HasMaxLength(3);
            entity.Property(n => n.MaterialIngeridoDescripcion).HasColumnName("material_ingerido_descripcion").HasMaxLength(1000);
            entity.Property(n => n.MaterialFotoEscala).HasColumnName("material_foto_escala");
            entity.Property(n => n.GiBocaEsofagoEstado).HasColumnName("gi_boca_esofago_estado").HasMaxLength(10);
            entity.Property(n => n.GiBocaEsofagoDescripcion).HasColumnName("gi_boca_esofago_descripcion").HasMaxLength(500);
            entity.Property(n => n.GiEstomagoEstado).HasColumnName("gi_estomago_estado").HasMaxLength(10);
            entity.Property(n => n.GiEstomagoDescripcion).HasColumnName("gi_estomago_descripcion").HasMaxLength(500);
            entity.Property(n => n.GiIntestino1Estado).HasColumnName("gi_intestino_1_estado").HasMaxLength(10);
            entity.Property(n => n.GiIntestino1Descripcion).HasColumnName("gi_intestino_1_descripcion").HasMaxLength(500);
            entity.Property(n => n.GiIntestino2Estado).HasColumnName("gi_intestino_2_estado").HasMaxLength(10);
            entity.Property(n => n.GiIntestino2Descripcion).HasColumnName("gi_intestino_2_descripcion").HasMaxLength(500);
            entity.Property(n => n.Urogenital).HasColumnName("urogenital").HasMaxLength(15);
            entity.Property(n => n.Sexo).HasColumnName("sexo").HasMaxLength(2);
            entity.Property(n => n.Testiculos).HasColumnName("testiculos").HasMaxLength(15);
            entity.Property(n => n.Epididimo).HasColumnName("epididimo").HasMaxLength(15);
            entity.Property(n => n.Ovarios).HasColumnName("ovarios").HasMaxLength(15);
            entity.Property(n => n.Oviducto).HasColumnName("oviducto").HasMaxLength(15);
            entity.Property(n => n.UrogenitalComentarios).HasColumnName("urogenital_comentarios").HasMaxLength(1000);
            entity.Property(n => n.Traquea).HasColumnName("traquea").HasMaxLength(120);
            entity.Property(n => n.Pulmones).HasColumnName("pulmones").HasMaxLength(100);
            entity.Property(n => n.RespiratorioComentarios).HasColumnName("respiratorio_comentarios").HasMaxLength(1000);
            entity.Property(n => n.Cerebro).HasColumnName("cerebro").HasMaxLength(120);
            entity.Property(n => n.CerebroComentarios).HasColumnName("cerebro_comentarios").HasMaxLength(1000);
            entity.Property(n => n.ResumenHallazgos).HasColumnName("resumen_hallazgos");
            entity.Property(n => n.CreadoEn).HasColumnName("creado_en").ValueGeneratedOnAdd();
            entity.Property(n => n.ActualizadoEn).HasColumnName("actualizado_en").ValueGeneratedOnAddOrUpdate();
        });

        builder.Entity<VwExitoEclosion>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("vw_exito_eclosion");
            entity.Property(v => v.FichaLimpiezaId).HasColumnName("ficha_limpieza_id");
            entity.Property(v => v.NumeroFicha).HasColumnName("numero_ficha");
            entity.Property(v => v.Corral).HasColumnName("corral");
            entity.Property(v => v.Nido).HasColumnName("nido");
            entity.Property(v => v.FechaLimpieza).HasColumnName("fecha_limpieza");
            entity.Property(v => v.CriasVivasTotales).HasColumnName("crias_vivas_totales");
            entity.Property(v => v.HuevosTotales).HasColumnName("huevos_totales");
            entity.Property(v => v.PorcentajeEclosion).HasColumnName("porcentaje_eclosion");
        });

        builder.Entity<VwEstatusNido>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("vw_estatus_nidos");
            entity.Property(v => v.FichaId).HasColumnName("ficha_id");
            entity.Property(v => v.NumeroFicha).HasColumnName("numero_ficha");
            entity.Property(v => v.Corral).HasColumnName("corral");
            entity.Property(v => v.NumeroNido).HasColumnName("numero_nido");
            entity.Property(v => v.Fecha).HasColumnName("fecha");
            entity.Property(v => v.Latitud).HasColumnName("latitud");
            entity.Property(v => v.Longitud).HasColumnName("longitud");
            entity.Property(v => v.HuevosColectados).HasColumnName("huevos_colectados");
            entity.Property(v => v.FichaLimpiezaId).HasColumnName("ficha_limpieza_id");
            entity.Property(v => v.CriasVivasTotales).HasColumnName("crias_vivas_totales");
            entity.Property(v => v.HuevosTotales).HasColumnName("huevos_totales");
            entity.Property(v => v.PorcentajeEclosion).HasColumnName("porcentaje_eclosion");
            entity.Property(v => v.Estatus).HasColumnName("estatus").HasMaxLength(30);
        });
    }
}
