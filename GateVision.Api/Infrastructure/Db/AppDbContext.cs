using Microsoft.EntityFrameworkCore;
using GateVision.Api.Domain;

namespace GateVision.Api.Infrastructure.Db;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Person> Persons => Set<Person>();
    public DbSet<GateEvent> GateEvents => Set<GateEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("vector");

        modelBuilder.Entity<Person>(e =>
        {
            e.ToTable("persons");
            e.HasKey(p => p.Id);
            e.Property(p => p.FullName).HasMaxLength(200);
            e.Property(p => p.Department).HasMaxLength(100);
            e.Property(p => p.EnrollmentStatus)
                .HasConversion<string>()
                .HasMaxLength(20);
            e.Property(p => p.WelcomeMessage).HasMaxLength(500);
        });

        modelBuilder.Entity<GateEvent>(e =>
        {
            e.ToTable("gate_events");
            e.HasKey(g => g.Id);
            e.Property(g => g.PersonName).HasMaxLength(200);
            e.Property(g => g.Status)
                .HasConversion<string>()
                .HasMaxLength(20);
            e.Property(g => g.Direction)
                .HasConversion<string>()
                .HasMaxLength(10);
            e.Property(g => g.FaceImageBase64).HasColumnName("FaceImageBase64");
            e.Property(g => g.FaceImagePath).HasColumnName("FaceImagePath");
            e.Property(g => g.WelcomeMessage).HasMaxLength(500);
            e.Property(g => g.Department).HasMaxLength(100);
        });
    }
}
