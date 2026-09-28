namespace Gomoku.Core;

public sealed class PlayerSettings
{
    public const string DefaultPlayerName = "PLAYER 01";
    public const int MaxPlayerNameLength = 16;

    public string PlayerName { get; set; } = DefaultPlayerName;

    public void Normalize()
    {
        var normalizedName = string.Join(
            " ",
            (PlayerName ?? string.Empty).Split(
                [' ', '\t', '\r', '\n'],
                StringSplitOptions.RemoveEmptyEntries));

        if (string.IsNullOrWhiteSpace(normalizedName))
            normalizedName = DefaultPlayerName;

        PlayerName = normalizedName.Length <= MaxPlayerNameLength
            ? normalizedName
            : normalizedName[..MaxPlayerNameLength];
    }
}
