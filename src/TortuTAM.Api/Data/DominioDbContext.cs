using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Models.Dominio;

namespace TortuTAM.Api.Data;

public class DominioDbContext(DbContextOptions<DominioDbContext> options) : DbContext(options)
{
    public DbSet<CatPlaya> Playas => Set<CatPlaya>();

    public DbSet<CatEspecie> Especies => Set<CatEspecie>();

    public DbSet<CatAccion> Acciones => Set<CatAccion>();

    public DbSet<CatUsoNido> UsoNido => Set<CatUsoNido>();

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
    }
}
