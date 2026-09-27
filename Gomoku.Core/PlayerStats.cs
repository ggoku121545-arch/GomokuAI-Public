using System.Text.Json.Serialization;

namespace Gomoku.Core;

public enum MatchOutcome { Win, Loss, Draw }

public sealed record MatchRecord(
    MatchOutcome Outcome,
    DateTimeOffset PlayedAtUtc,
    int MoveCount,
    string BoardThemeId);

public sealed class PlayerStats
{
    public const int MaxStoredMatches = 100;

    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public int CurrentWinStreak { get; set; }
    public int BestWinStreak { get; set; }
    public List<MatchRecord> Matches { get; set; } = [];

    [JsonIgnore]
    public int TotalGames => Wins + Losses + Draws;

    [JsonIgnore]
    public int WinRatePercent => TotalGames == 0
        ? 0
        : (int)Math.Round(Wins * 100d / TotalGames, MidpointRounding.AwayFromZero);

    public void RecordMatch(MatchOutcome outcome, int moveCount, string boardThemeId, DateTimeOffset? playedAtUtc = null)
    {
        Normalize();

        switch (outcome)
        {
            case MatchOutcome.Win:
                Wins++;
                CurrentWinStreak++;
                BestWinStreak = Math.Max(BestWinStreak, CurrentWinStreak);
                break;
            case MatchOutcome.Loss:
                Losses++;
                CurrentWinStreak = 0;
                break;
            case MatchOutcome.Draw:
                Draws++;
                CurrentWinStreak = 0;
                break;
        }

        Matches.Insert(0, new MatchRecord(
            outcome,
            playedAtUtc ?? DateTimeOffset.UtcNow,
            Math.Max(0, moveCount),
            string.IsNullOrWhiteSpace(boardThemeId) ? "lined-paper" : boardThemeId));

        if (Matches.Count > MaxStoredMatches)
            Matches.RemoveRange(MaxStoredMatches, Matches.Count - MaxStoredMatches);
    }

    public void Normalize()
    {
        Wins = Math.Max(0, Wins);
        Losses = Math.Max(0, Losses);
        Draws = Math.Max(0, Draws);
        CurrentWinStreak = Math.Clamp(CurrentWinStreak, 0, Wins);
        BestWinStreak = Math.Max(CurrentWinStreak, Math.Max(0, BestWinStreak));
        Matches ??= [];

        if (Matches.Count > MaxStoredMatches)
            Matches.RemoveRange(MaxStoredMatches, Matches.Count - MaxStoredMatches);
    }
}
