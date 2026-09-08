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

    public DbSet<VwExitoEclosion> VwExitoEclosion => Set<VwExitoEclosion>();

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
    }
}
