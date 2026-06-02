using Microsoft.EntityFrameworkCore;
using GateVision.Api.Domain;

namespace GateVision.Api.Infrastructure.Db;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Person> Persons => Set<Person>();
    public DbSet<GateEvent> GateEvents => Set<GateEvent>();
    public DbSet<TrainingEvent> TrainingEvents => Set<TrainingEvent>();
    public DbSet<Gate> Gates => Set<Gate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
            e.Property(g => g.GateId).HasMaxLength(50).HasDefaultValue("default");
            e.Property(g => g.Status)
                .HasConversion<string>()
                .HasMaxLength(20);
            e.Property(g => g.Direction)
                .HasConversion<string>()
                .HasMaxLength(10);
            e.HasIndex(g => g.GateId);
        });

        modelBuilder.Entity<TrainingEvent>(e =>
        {
            e.ToTable("training_events");
            e.HasKey(t => t.Id);
            e.Property(t => t.GateId).HasMaxLength(50).HasDefaultValue("default");
            e.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(20);
            e.Property(t => t.Direction)
                .HasConversion<string>()
                .HasMaxLength(10);
            e.HasIndex(t => t.GateId);
        });

        modelBuilder.Entity<Gate>(e =>
        {
            e.ToTable("gates");
            e.HasKey(g => g.Id);
            e.Property(g => g.Id).ValueGeneratedNever();
            e.Property(g => g.Name).HasMaxLength(200);
            e.Property(g => g.PythonUrl).HasMaxLength(500);
            e.Property(g => g.ApiKey).HasMaxLength(200);
            e.Property(g => g.StartCommand).HasMaxLength(500);
        });
    }
}
