using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Models;

namespace TortuTAM.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("identity_usuarios");
            entity.Property(u => u.NombreCompleto).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Codigo).HasMaxLength(20).IsRequired();
            entity.Property(u => u.Iniciales).HasMaxLength(10).IsRequired();
            entity.HasIndex(u => u.Codigo).IsUnique();
        });

        builder.Entity<IdentityRole<Guid>>(entity => entity.ToTable("identity_roles"));
        builder.Entity<IdentityUserRole<Guid>>(entity => entity.ToTable("identity_usuario_roles"));
        builder.Entity<IdentityUserClaim<Guid>>(entity => entity.ToTable("identity_usuario_claims"));
        builder.Entity<IdentityUserLogin<Guid>>(entity => entity.ToTable("identity_usuario_logins"));
        builder.Entity<IdentityRoleClaim<Guid>>(entity => entity.ToTable("identity_rol_claims"));
        builder.Entity<IdentityUserToken<Guid>>(entity => entity.ToTable("identity_usuario_tokens"));
    }
}
