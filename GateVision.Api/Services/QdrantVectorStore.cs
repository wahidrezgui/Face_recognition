using Microsoft.Extensions.Options;
using Qdrant.Client;
using Qdrant.Client.Grpc;

namespace GateVision.Api.Services;

public class QdrantOptions
{
    public const string SectionName = "Qdrant";
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 6334;
    public string CollectionName { get; set; } = "face_embeddings";
}

public class QdrantVectorStore : IVectorStore, IAsyncDisposable
{
    private const int VectorSize = 512;

    private readonly QdrantClient _client;
    private readonly string _collectionName;
    private readonly ILogger<QdrantVectorStore> _logger;
    private bool _collectionEnsured;

    public QdrantVectorStore(IOptions<QdrantOptions> options, ILogger<QdrantVectorStore> logger)
    {
        var opts = options.Value;
        _collectionName = opts.CollectionName;
        _logger = logger;
        _client = new QdrantClient(opts.Host, port: opts.Port);
    }

    public async Task EnsureCollectionAsync()
    {
        if (_collectionEnsured) return;

        try
        {
            var exists = await _client.CollectionExistsAsync(_collectionName);
            if (!exists)
            {
                await _client.CreateCollectionAsync(_collectionName,
                    new VectorParams { Size = VectorSize, Distance = Distance.Cosine });
                _logger.LogInformation("Created Qdrant collection '{Collection}' (size={Size}, distance=Cosine)",
                    _collectionName, VectorSize);
            }
            _collectionEnsured = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ensure Qdrant collection '{Collection}'", _collectionName);
            throw;
        }
    }

    public async Task<VectorMatch?> FindMatchAsync(float[] queryVector, float minScore, int limit = 1)
    {
        try
        {
            await EnsureCollectionAsync();

            var results = await _client.SearchAsync(
                collectionName: _collectionName,
                vector: queryVector,
                limit: (ulong)limit,
                scoreThreshold: minScore,
                payloadSelector: new WithPayloadSelector { Enable = true });

            var best = results.FirstOrDefault();
            if (best is null) return null;

            var personIdStr = best.Payload["person_id"]?.StringValue;
            if (string.IsNullOrEmpty(personIdStr)) return null;

            return new VectorMatch(
                PersonId: Guid.Parse(personIdStr),
                Score: best.Score);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Qdrant search failed");
            return null;
        }
    }

    public async Task UpsertAsync(Guid embeddingId, Guid personId, float[] vector,
        string? pose = null, float quality = 0.8f)
    {
        try
        {
            await EnsureCollectionAsync();

            var payload = new Dictionary<string, Value>
            {
                ["person_id"] = personId.ToString(),
                ["quality"] = quality
            };
            if (!string.IsNullOrEmpty(pose))
                payload["pose"] = pose;

            await _client.UpsertAsync(_collectionName, new List<PointStruct>
            {
                new()
                {
                    Id = embeddingId,
                    Vectors = vector,
                    Payload = { payload }
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Qdrant upsert failed for embedding {EmbeddingId} (person {PersonId})",
                embeddingId, personId);
        }
    }

    public async Task DeleteByPersonAsync(Guid personId)
    {
        try
        {
            await EnsureCollectionAsync();

            await _client.DeleteAsync(_collectionName,
                filter: Conditions.MatchKeyword("person_id", personId.ToString()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Qdrant delete by person {PersonId} failed", personId);
        }
    }

    public async Task DeleteByIdAsync(Guid embeddingId)
    {
        try
        {
            await EnsureCollectionAsync();
            await _client.DeleteAsync(_collectionName, [embeddingId]);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Qdrant delete by id {EmbeddingId} failed", embeddingId);
        }
    }

    public async Task<IReadOnlyList<string>> GetPosesByPersonAsync(Guid personId)
    {
        try
        {
            await EnsureCollectionAsync();

            var response = await _client.ScrollAsync(
                _collectionName,
                filter: Conditions.MatchKeyword("person_id", personId.ToString()),
                limit: 1000,
                payloadSelector: new WithPayloadSelector { Enable = true },
                vectorsSelector: new WithVectorsSelector { Enable = false });

            var points = response.Result;
            return points
                .Where(p => p.Payload.ContainsKey("pose"))
                .Select(p => p.Payload["pose"].StringValue)
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Qdrant scroll poses failed for person {PersonId}", personId);
            return [];
        }
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.CompletedTask;
    }
}
