using Gomoku.Core;
using Gomoku.Web.Theming;

namespace Gomoku.Web.Presentation;

public static class MatchDisplay
{
    public static string OutcomeLetter(MatchOutcome outcome) => outcome switch
    {
        MatchOutcome.Win => "W",
        MatchOutcome.Loss => "L",
        _ => "D"
    };

    public static string OutcomeText(MatchOutcome outcome) => outcome switch
    {
        MatchOutcome.Win => "승리",
        MatchOutcome.Loss => "패배",
        _ => "무승부"
    };

    public static string OutcomeClass(MatchOutcome outcome) => outcome switch
    {
        MatchOutcome.Win => "win",
        MatchOutcome.Loss => "loss",
        _ => "draw"
    };

    public static string ThemeName(string themeId) =>
        BoardThemes.All.FirstOrDefault(theme => theme.Id == themeId)?.Name ?? "기본판";

    public static string RelativeTime(DateTimeOffset playedAtUtc)
    {
        var elapsed = DateTimeOffset.UtcNow - playedAtUtc;
        if (elapsed < TimeSpan.Zero || elapsed < TimeSpan.FromMinutes(1)) return "방금 전";
        if (elapsed < TimeSpan.FromHours(1)) return $"{(int)elapsed.TotalMinutes}분 전";
        if (elapsed < TimeSpan.FromDays(1)) return $"{(int)elapsed.TotalHours}시간 전";
        if (elapsed < TimeSpan.FromDays(30)) return $"{(int)elapsed.TotalDays}일 전";
        return playedAtUtc.ToLocalTime().ToString("yyyy.MM.dd");
    }
}
