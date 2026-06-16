namespace GateVision.Api.Shared.Kernel;

public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public int? StatusCode { get; }

    protected Result(bool isSuccess, string? error, int? statusCode = null)
    {
        IsSuccess = isSuccess;
        Error = error;
        StatusCode = statusCode;
    }

    public static Result Ok() => new(true, null);
    public static Result Fail(string error, int statusCode = 400) => new(false, error, statusCode);
}

public class Result<T> : Result
{
    public T? Value { get; }

    private Result(T value) : base(true, null) => Value = value;
    private Result(string error, int statusCode) : base(false, error, statusCode) { }

    public static Result<T> Ok(T value) => new(value);
    public new static Result<T> Fail(string error, int statusCode = 400) => new(error, statusCode);
}
