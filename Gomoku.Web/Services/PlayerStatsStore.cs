using System.Text.Json;
using Gomoku.Core;
using Microsoft.JSInterop;

namespace Gomoku.Web.Services;

public sealed class PlayerStatsStore(IJSRuntime js)
{
    private const string StorageKey = "gomokuai.player-stats.v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async ValueTask<PlayerStats> LoadAsync()
    {
        try
        {
            var json = await js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
            if (string.IsNullOrWhiteSpace(json)) return new PlayerStats();

            var stats = JsonSerializer.Deserialize<PlayerStats>(json, JsonOptions) ?? new PlayerStats();
            stats.Normalize();
            return stats;
        }
        catch (JsonException)
        {
            return new PlayerStats();
        }
        catch (JSException)
        {
            return new PlayerStats();
        }
    }

    public async ValueTask<PlayerStats> RecordMatchAsync(MatchOutcome outcome, int moveCount, string boardThemeId)
    {
        var stats = await LoadAsync();
        stats.RecordMatch(outcome, moveCount, boardThemeId);

        try
        {
            var json = JsonSerializer.Serialize(stats, JsonOptions);
            await js.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
        }
        catch (JSException)
        {
            // 저장소가 차단된 환경에서도 게임은 계속 진행할 수 있습니다.
        }

        return stats;
    }
}
