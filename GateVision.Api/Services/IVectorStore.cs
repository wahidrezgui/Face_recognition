namespace GateVision.Api.Services;

/// <summary>Result of a vector similarity search.</summary>
public record VectorMatch(Guid PersonId, float Score);

/// <summary>Clean abstraction for vector ANN search.
/// Stores only: embedding vectors, ANN index, and person_id reference.
/// No metadata, no JOINs — pure vector similarity.</summary>
public interface IVectorStore
{
    /// <summary>Find the nearest neighbor above a similarity threshold.</summary>
    Task<VectorMatch?> FindMatchAsync(float[] queryVector, float minScore, int limit = 1);

    /// <summary>Upsert a single embedding point with a person_id reference in payload.</summary>
    Task UpsertAsync(Guid embeddingId, Guid personId, float[] vector, string? pose = null, float quality = 0.8f);

    /// <summary>Delete all embedding points belonging to a person.</summary>
    Task DeleteByPersonAsync(Guid personId);

    /// <summary>Delete a single embedding point by its ID.</summary>
    Task DeleteByIdAsync(Guid embeddingId);

    /// <summary>Ensure the target collection exists (idempotent).</summary>
    Task EnsureCollectionAsync();

    /// <summary>Return the distinct pose labels stored for a person (e.g. "frontal", "left").</summary>
    Task<IReadOnlyList<string>> GetPosesByPersonAsync(Guid personId);
}
