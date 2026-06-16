using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Features.Identity.Domain;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Shared.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Person> Persons => Set<Person>();
    public DbSet<GateEvent> GateEvents => Set<GateEvent>();
    public DbSet<TrainingEvent> TrainingEvents => Set<TrainingEvent>();
    public DbSet<ValidatedEvent> ValidatedEvents => Set<ValidatedEvent>();
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

        modelBuilder.Entity<ValidatedEvent>(e =>
        {
            e.ToTable("validated_events");
            e.HasKey(v => v.Id);
            e.Property(v => v.GateId).HasMaxLength(50).HasDefaultValue("default");
            e.Property(v => v.Direction)
                .HasConversion<string>()
                .HasMaxLength(10);
            e.Property(v => v.ValidatedBy)
                .HasConversion<string>()
                .HasMaxLength(20);
            e.HasIndex(v => v.CapturedAt);
            e.HasIndex(v => v.PersonId);
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
            e.Property(g => g.CameraSource).HasMaxLength(1000).HasDefaultValue("0");
            e.Property(g => g.Direction).HasMaxLength(10).HasDefaultValue("entry");
            e.Property(g => g.ProcessingFps).HasDefaultValue(3);
            e.Property(g => g.ModelProfile).HasMaxLength(20).HasDefaultValue("auto");
            e.Property(g => g.DetectorInputWidth).IsRequired(false);
            e.Property(g => g.DetectorInputHeight).IsRequired(false);
            e.Property(g => g.MotionThreshold).HasDefaultValue(0.02);
            e.Property(g => g.MotionPixelThreshold).HasDefaultValue(25);
            e.Property(g => g.DetectMaxWidth).HasDefaultValue(0);
            e.Property(g => g.HikvisionUrl).HasMaxLength(500).HasDefaultValue("");
            e.Property(g => g.HikvisionUser).HasMaxLength(100).HasDefaultValue("admin");
            e.Property(g => g.HikvisionPassword).HasMaxLength(200).IsRequired(false);
            e.Property(g => g.HikvisionEventTtlMs).HasDefaultValue(5000);
            e.Property(g => g.HikvisionEventTypes).HasMaxLength(500).HasDefaultValue("VMD,fielddetection,linedetection");
            e.Property(g => g.HikvisionDetectionTarget).HasMaxLength(100).HasDefaultValue("");
            e.Property(g => g.MinMatchScore).HasDefaultValue(0.35);
            e.Property(g => g.IdentifyConfidenceThreshold).HasDefaultValue(0.80);
            e.Property(g => g.AutoValidateConfidence).HasDefaultValue(0.85);
            e.Property(g => g.MinFaceConfidence).HasDefaultValue(0.50);
        });
    }
}
