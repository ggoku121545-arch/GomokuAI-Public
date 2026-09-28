using System.Text.Json;
using Gomoku.Core;
using Microsoft.JSInterop;

namespace Gomoku.Web.Services;

public sealed class PlayerSettingsStore(IJSRuntime js)
{
    private const string StorageKey = "gomokuai.player-settings.v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async ValueTask<PlayerSettings> LoadAsync()
    {
        try
        {
            var json = await js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
            if (string.IsNullOrWhiteSpace(json)) return new PlayerSettings();

            var settings = JsonSerializer.Deserialize<PlayerSettings>(json, JsonOptions) ?? new PlayerSettings();
            settings.Normalize();
            return settings;
        }
        catch (JsonException)
        {
            return new PlayerSettings();
        }
        catch (JSException)
        {
            return new PlayerSettings();
        }
    }

    public async ValueTask<bool> SaveAsync(PlayerSettings settings)
    {
        settings.Normalize();

        try
        {
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await js.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
            return true;
        }
        catch (JSException)
        {
            return false;
        }
    }
}
